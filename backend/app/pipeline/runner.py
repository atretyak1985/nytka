import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import (
    BriefStatus,
    KnowledgeStatus,
    Meeting,
    MeetingBrief,
    MeetingStatus,
    Project,
    Task,
    TaskScreenshot,
    TranscriptSegment,
)
from app.db.session import SessionLocal
from app.llm.brief import generate_brief_for_meeting
from app.llm.extraction import extract_tasks_for_meeting
from app.pipeline.audio import extract_audio
from app.pipeline.screenshots import generate_for_task, probe_video_duration
from app.pipeline.transcribe import transcribe_meeting

logger = logging.getLogger(__name__)

ACTIVE_STATUSES = {
    MeetingStatus.QUEUED,
    MeetingStatus.PROCESSING,
    MeetingStatus.TRANSCRIBING,
    MeetingStatus.EXTRACTING,
    MeetingStatus.SUMMARIZING,
}


def sweep_interrupted(db: Session) -> None:
    """Mark meetings stranded in active statuses as errored.

    BackgroundTasks die with the process, so anything still "in flight"
    after a restart can never finish — surface it so the user can retry.
    """
    for meeting in db.scalars(select(Meeting).where(Meeting.status.in_(ACTIVE_STATUSES))):
        logger.warning("sweeping interrupted meeting %s (was %s)", meeting.id, meeting.status)
        meeting.status = MeetingStatus.ERROR
        meeting.error_message = "Processing was interrupted by a server restart — press Retry."
    db.commit()


def sweep_interrupted_knowledge(db: Session) -> None:
    """Mark distillation jobs stranded in `processing` (across a restart) as errored."""
    for project in db.scalars(
        select(Project).where(Project.knowledge_status == KnowledgeStatus.PROCESSING)
    ):
        logger.warning("sweeping interrupted knowledge init for project %s", project.id)
        project.knowledge_status = KnowledgeStatus.ERROR
        project.knowledge_error = "Init was interrupted by a server restart — press Init again."
    db.commit()


def wav_path_for(meeting: Meeting) -> Path:
    media = Path(meeting.media_path)
    return media.with_suffix(".16k.wav")


def run_pipeline(meeting_id: int) -> None:
    """Entry point for BackgroundTasks: owns its DB session."""
    with SessionLocal() as db:
        run_pipeline_with_session(db, meeting_id)


def run_pipeline_with_session(db: Session, meeting_id: int) -> None:
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        logger.error("pipeline: meeting %s not found", meeting_id)
        return
    try:
        meeting.processing_started_at = datetime.now(timezone.utc).replace(tzinfo=None)
        meeting.processing_finished_at = None
        meeting.progress = 0.0
        _set_status(db, meeting, MeetingStatus.PROCESSING)
        wav = wav_path_for(meeting)
        if not wav.exists():
            extract_audio(Path(meeting.media_path), wav)

        has_segments = db.scalar(
            select(TranscriptSegment.id).where(TranscriptSegment.meeting_id == meeting.id).limit(1)
        )
        if not has_segments:
            _set_status(db, meeting, MeetingStatus.TRANSCRIBING)
            transcribe_meeting(db, meeting, wav)

        has_tasks = db.scalar(select(Task.id).where(Task.meeting_id == meeting.id).limit(1))
        if not has_tasks:
            meeting.progress = 0.0
            _set_status(db, meeting, MeetingStatus.EXTRACTING)
            count = extract_tasks_for_meeting(db, meeting)
            logger.info("meeting %s: extracted %s tasks", meeting.id, count)

        # Same resume semantics as segments/tasks: a READY brief survives a retry.
        brief = db.scalar(select(MeetingBrief).where(MeetingBrief.meeting_id == meeting.id))
        if brief is None or brief.status != BriefStatus.READY:
            meeting.progress = 0.0
            _set_status(db, meeting, MeetingStatus.SUMMARIZING)
            generate_brief_for_meeting(db, meeting)

        _generate_screenshots(db, meeting)

        meeting.progress = None
        meeting.processing_finished_at = datetime.now(timezone.utc).replace(tzinfo=None)
        _set_status(db, meeting, MeetingStatus.DONE)
    except Exception as exc:  # noqa: BLE001 - single failure boundary for the background job
        logger.exception("pipeline failed for meeting %s", meeting_id)
        db.rollback()
        msg = str(exc)[:2000]
        api_key = meeting.project.llm_api_key if meeting.project else None
        if api_key:
            msg = msg.replace(api_key, "[REDACTED]")
        meeting.status = MeetingStatus.ERROR
        meeting.error_message = msg
        meeting.processing_finished_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.commit()


def regenerate_brief(meeting_id: int) -> None:
    """Entry point for BackgroundTasks (brief regenerate): owns its DB session.

    Unlike the pipeline step this always regenerates, even over a READY brief —
    that is the whole point of the endpoint. Failures land on the brief row
    (generate_brief_for_meeting never raises).
    """
    with SessionLocal() as db:
        meeting = db.get(Meeting, meeting_id)
        if meeting is None:
            logger.error("regenerate_brief: meeting %s not found", meeting_id)
            return
        generate_brief_for_meeting(db, meeting)


def _set_status(db: Session, meeting: Meeting, status: MeetingStatus) -> None:
    meeting.status = status
    db.commit()


def _generate_screenshots(db: Session, meeting: Meeting) -> None:
    """Best-effort frame capture for this meeting's timestamped tasks.

    Never raises: a broken/audio-only video must not error a finished meeting.
    Idempotent per task (skips tasks that already have screenshots) so a
    retry/reextract does not duplicate frames.
    """
    try:
        source = Path(meeting.media_path)
        if not source.exists():
            return
        duration = meeting.duration_sec or probe_video_duration(source)
        if duration is None:
            return  # audio-only upload or unreadable video — nothing to capture
        tasks = db.scalars(
            select(Task).where(Task.meeting_id == meeting.id, Task.source_timestamp.is_not(None))
        )
        for task in tasks:
            # Query (not the relationship) so a cached collection can never go stale.
            has_frames = db.scalar(
                select(TaskScreenshot.id).where(TaskScreenshot.task_id == task.id).limit(1)
            )
            if has_frames:
                continue
            for row in generate_for_task(task, source, duration):
                db.add(row)
        db.commit()
    except Exception:  # noqa: BLE001 - screenshots are decoration, never fail the pipeline
        logger.exception("screenshot generation failed for meeting %s", meeting.id)
        db.rollback()

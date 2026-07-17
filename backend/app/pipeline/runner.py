import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Meeting, MeetingStatus, Task, TranscriptSegment
from app.db.session import SessionLocal
from app.llm.extraction import extract_tasks_for_meeting
from app.pipeline.audio import extract_audio
from app.pipeline.transcribe import transcribe_meeting

logger = logging.getLogger(__name__)

ACTIVE_STATUSES = {
    MeetingStatus.QUEUED,
    MeetingStatus.PROCESSING,
    MeetingStatus.TRANSCRIBING,
    MeetingStatus.EXTRACTING,
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


def _set_status(db: Session, meeting: Meeting, status: MeetingStatus) -> None:
    meeting.status = status
    db.commit()

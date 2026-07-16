import logging
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Meeting, MeetingStatus, Task, TranscriptSegment
from app.db.session import SessionLocal
from app.llm.extraction import extract_tasks_for_meeting
from app.pipeline.audio import extract_audio
from app.pipeline.transcribe import transcribe_meeting

logger = logging.getLogger(__name__)


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
            _set_status(db, meeting, MeetingStatus.EXTRACTING)
            count = extract_tasks_for_meeting(db, meeting)
            logger.info("meeting %s: extracted %s tasks", meeting.id, count)

        _set_status(db, meeting, MeetingStatus.DONE)
    except Exception as exc:  # noqa: BLE001 - single failure boundary for the background job
        logger.exception("pipeline failed for meeting %s", meeting_id)
        meeting.status = MeetingStatus.ERROR
        meeting.error_message = str(exc)[:2000]
        db.commit()


def _set_status(db: Session, meeting: Meeting, status: MeetingStatus) -> None:
    meeting.status = status
    db.commit()

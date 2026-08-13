import mimetypes
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.schemas import MeetingBriefOut, MeetingDetailOut, MeetingOut
from app.core.config import settings
from app.db.models import (
    BriefStatus,
    Meeting,
    MeetingBrief,
    MeetingStatus,
    Project,
    Task,
    TranscriptSegment,
)
from app.db.seed import ensure_default_project
from app.db.session import get_db
from app.llm.brief import render_brief_markdown
from app.pipeline.runner import regenerate_brief, run_pipeline, wav_path_for
from app.pipeline.screenshots import delete_screenshot_files

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".mp3", ".wav", ".m4a", ".ogg"}


@router.post("", response_model=MeetingOut, status_code=201)
async def upload_meeting(
    file: UploadFile,
    background: BackgroundTasks,
    title: str | None = Form(default=None),
    project_id: int | None = Form(default=None),
    db: Session = Depends(get_db),
) -> Meeting:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(422, f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}")

    if project_id is not None:
        project = db.get(Project, project_id)
        if project is None:
            raise HTTPException(404, "Project not found")
    else:
        project = ensure_default_project(db)
    safe_name = re.sub(r"[^\w.\-]", "_", file.filename or f"upload{ext}")
    media_path = settings.media_dir / f"{uuid.uuid4().hex}_{safe_name}"
    media_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        size = 0
        with media_path.open("wb") as out:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > settings.max_upload_mb * 1024 * 1024:
                    raise HTTPException(413, f"File exceeds {settings.max_upload_mb} MB limit")
                out.write(chunk)

        meeting = Meeting(
            project_id=project.id,
            title=title or Path(safe_name).stem,
            source_filename=file.filename or safe_name,
            media_path=str(media_path),
        )
        db.add(meeting)
        db.commit()
    except Exception:
        media_path.unlink(missing_ok=True)
        raise
    db.refresh(meeting)
    background.add_task(run_pipeline, meeting.id)
    return meeting


@router.get("", response_model=list[MeetingOut])
def list_meetings(project_id: int | None = None, db: Session = Depends(get_db)) -> list[Meeting]:
    query = select(Meeting).order_by(Meeting.created_at.desc())
    if project_id is not None:
        query = query.where(Meeting.project_id == project_id)
    return list(db.scalars(query))


@router.get("/{meeting_id}", response_model=MeetingDetailOut)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)) -> Meeting:
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        raise HTTPException(404, "Meeting not found")
    return meeting


@router.post("/{meeting_id}/retry", response_model=MeetingOut)
def retry_meeting(meeting_id: int, background: BackgroundTasks, db: Session = Depends(get_db)) -> Meeting:
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        raise HTTPException(404, "Meeting not found")
    if meeting.status != MeetingStatus.ERROR:
        raise HTTPException(409, f"Can only retry meetings in 'error' state (current: {meeting.status})")
    meeting.status = MeetingStatus.QUEUED
    meeting.error_message = None
    db.commit()
    db.refresh(meeting)
    background.add_task(run_pipeline, meeting.id)
    return meeting


ACTIVE_STATUSES = {
    MeetingStatus.QUEUED,
    MeetingStatus.PROCESSING,
    MeetingStatus.TRANSCRIBING,
    MeetingStatus.EXTRACTING,
    MeetingStatus.SUMMARIZING,
}


def _get_brief_or_404(db: Session, meeting_id: int) -> tuple[Meeting, MeetingBrief]:
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        raise HTTPException(404, "Meeting not found")
    brief = db.scalar(select(MeetingBrief).where(MeetingBrief.meeting_id == meeting.id))
    if brief is None:
        raise HTTPException(404, "Meeting has no brief yet")
    return meeting, brief


@router.get("/{meeting_id}/brief", response_model=MeetingBriefOut)
def get_meeting_brief(meeting_id: int, db: Session = Depends(get_db)) -> MeetingBrief:
    _meeting, brief = _get_brief_or_404(db, meeting_id)
    return brief


@router.post("/{meeting_id}/brief/regenerate", response_model=MeetingBriefOut)
def regenerate_meeting_brief(
    meeting_id: int, background: BackgroundTasks, db: Session = Depends(get_db)
) -> MeetingBrief:
    """Re-run brief generation only. Transcript segments and tasks are untouched."""
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        raise HTTPException(404, "Meeting not found")
    has_segments = db.scalar(
        select(TranscriptSegment.id).where(TranscriptSegment.meeting_id == meeting.id).limit(1)
    )
    if not has_segments:
        raise HTTPException(409, "Meeting has no transcript to summarize yet")
    brief = db.scalar(select(MeetingBrief).where(MeetingBrief.meeting_id == meeting.id))
    if brief is None:
        brief = MeetingBrief(meeting_id=meeting.id)
        db.add(brief)
    brief.status = BriefStatus.PROCESSING
    brief.error = None
    db.commit()
    db.refresh(brief)
    background.add_task(regenerate_brief, meeting.id)
    return brief


@router.get("/{meeting_id}/brief/markdown", response_class=PlainTextResponse)
def get_meeting_brief_markdown(meeting_id: int, db: Session = Depends(get_db)) -> PlainTextResponse:
    meeting, brief = _get_brief_or_404(db, meeting_id)
    return PlainTextResponse(render_brief_markdown(meeting, brief), media_type="text/markdown")


@router.post("/{meeting_id}/reextract", response_model=MeetingOut)
def reextract_meeting(meeting_id: int, background: BackgroundTasks, db: Session = Depends(get_db)) -> Meeting:
    """Re-run task extraction on an already-processed meeting.

    Drops this meeting's existing tasks and requeues the pipeline; transcription is
    skipped (segments already exist), so only extraction re-runs — useful after tuning
    the prompt or project AI context.
    """
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        raise HTTPException(404, "Meeting not found")
    if meeting.status in ACTIVE_STATUSES:
        raise HTTPException(409, f"Meeting is still processing (status: {meeting.status})")

    for task in db.scalars(select(Task).where(Task.meeting_id == meeting.id)):
        delete_screenshot_files(task)
        db.delete(task)
    meeting.status = MeetingStatus.QUEUED
    meeting.error_message = None
    meeting.progress = 0.0
    db.commit()
    db.refresh(meeting)
    background.add_task(run_pipeline, meeting.id)
    return meeting


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)) -> None:
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        raise HTTPException(404, "Meeting not found")

    # Remove the meeting's tasks (their meeting_id FK would otherwise dangle);
    # segments cascade via the relationship. Then drop the row and the media files.
    for task in db.scalars(select(Task).where(Task.meeting_id == meeting.id)):
        delete_screenshot_files(task)
        db.delete(task)
    media_files = [Path(meeting.media_path), wav_path_for(meeting)]
    db.delete(meeting)
    db.commit()
    for path in media_files:
        path.unlink(missing_ok=True)


@router.get("/{meeting_id}/media")
def get_meeting_media(meeting_id: int, db: Session = Depends(get_db)) -> FileResponse:
    """Stream the original uploaded recording for inline playback.

    FileResponse honours HTTP Range requests, so the browser can seek without
    downloading the whole file.
    """
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        raise HTTPException(404, "Meeting not found")
    path = Path(meeting.media_path)
    if not path.exists():
        raise HTTPException(404, "Media file not found")
    media_type = mimetypes.guess_type(meeting.source_filename)[0] or "application/octet-stream"
    return FileResponse(path, media_type=media_type, content_disposition_type="inline")

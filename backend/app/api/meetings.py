import re
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.schemas import MeetingDetailOut, MeetingOut
from app.core.config import settings
from app.db.models import Meeting, MeetingStatus
from app.db.seed import ensure_default_project
from app.db.session import get_db
from app.pipeline.runner import run_pipeline

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".mkv", ".webm", ".mp3", ".wav", ".m4a", ".ogg"}


@router.post("", response_model=MeetingOut, status_code=201)
async def upload_meeting(
    file: UploadFile,
    background: BackgroundTasks,
    title: str | None = Form(default=None),
    db: Session = Depends(get_db),
) -> Meeting:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(422, f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}")

    project = ensure_default_project(db)
    safe_name = re.sub(r"[^\w.\-]", "_", file.filename or f"upload{ext}")
    media_path = settings.media_dir / f"{uuid.uuid4().hex}_{safe_name}"
    media_path.parent.mkdir(parents=True, exist_ok=True)

    size = 0
    with media_path.open("wb") as out:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > settings.max_upload_mb * 1024 * 1024:
                media_path.unlink(missing_ok=True)
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
    db.refresh(meeting)
    background.add_task(run_pipeline, meeting.id)
    return meeting


@router.get("", response_model=list[MeetingOut])
def list_meetings(db: Session = Depends(get_db)) -> list[Meeting]:
    return list(db.scalars(select(Meeting).order_by(Meeting.created_at.desc())))


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

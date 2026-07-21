import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.schemas import KnowledgeFileOut, KnowledgeStateOut
from app.core.config import settings
from app.db.models import KnowledgeFile, KnowledgeStatus, Project
from app.db.session import get_db
from app.llm.distill import run_distill

router = APIRouter(prefix="/api/projects/{project_id}/knowledge", tags=["knowledge"])

# extension -> stored `kind`
ALLOWED_EXTENSIONS = {".pdf": "pdf", ".md": "text", ".txt": "text"}


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _get_project(db: Session, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    return project


def _state(project: Project) -> KnowledgeStateOut:
    return KnowledgeStateOut(
        knowledge_status=project.knowledge_status,
        knowledge_brief=project.knowledge_brief,
        knowledge_error=project.knowledge_error,
        knowledge_generated_at=project.knowledge_generated_at,
        knowledge_stale=project.knowledge_stale,
        files=[KnowledgeFileOut.model_validate(f) for f in project.knowledge_files],
    )


@router.get("", response_model=KnowledgeStateOut)
def get_knowledge(project_id: int, db: Session = Depends(get_db)) -> KnowledgeStateOut:
    return _state(_get_project(db, project_id))


@router.post("", response_model=KnowledgeFileOut, status_code=201)
async def upload_knowledge_file(
    project_id: int,
    file: UploadFile,
    db: Session = Depends(get_db),
) -> KnowledgeFile:
    project = _get_project(db, project_id)
    ext = Path(file.filename or "").suffix.lower()
    kind = ALLOWED_EXTENSIONS.get(ext)
    if kind is None:
        raise HTTPException(422, f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}")

    safe_name = re.sub(r"[^\w.\-]", "_", file.filename or f"upload{ext}")
    path = settings.knowledge_dir / f"{uuid.uuid4().hex}_{safe_name}"
    path.parent.mkdir(parents=True, exist_ok=True)

    try:
        size = 0
        with path.open("wb") as out:
            while chunk := await file.read(1024 * 1024):
                size += len(chunk)
                if size > settings.max_upload_mb * 1024 * 1024:
                    raise HTTPException(413, f"File exceeds {settings.max_upload_mb} MB limit")
                out.write(chunk)

        kf = KnowledgeFile(
            project_id=project.id,
            filename=file.filename or safe_name,
            path=str(path),
            kind=kind,
            size_bytes=size,
        )
        db.add(kf)
        project.knowledge_sources_changed_at = _now()  # brief now stale
        db.commit()
    except Exception:
        path.unlink(missing_ok=True)
        raise
    db.refresh(kf)
    return kf


@router.delete("/{file_id}", status_code=204)
def delete_knowledge_file(project_id: int, file_id: int, db: Session = Depends(get_db)) -> None:
    project = _get_project(db, project_id)
    kf = db.get(KnowledgeFile, file_id)
    if kf is None or kf.project_id != project.id:
        raise HTTPException(404, "Knowledge file not found")
    Path(kf.path).unlink(missing_ok=True)
    db.delete(kf)
    project.knowledge_sources_changed_at = _now()  # brief now stale
    db.commit()


@router.post("/init", response_model=KnowledgeStateOut)
def init_knowledge(
    project_id: int, background: BackgroundTasks, db: Session = Depends(get_db)
) -> KnowledgeStateOut:
    project = _get_project(db, project_id)
    if project.knowledge_status == KnowledgeStatus.PROCESSING:
        raise HTTPException(409, "Init is already running for this project")
    if not project.ai_context.strip() and not project.knowledge_files:
        raise HTTPException(
            400, "Add a project description or at least one file before running Init"
        )
    project.knowledge_status = KnowledgeStatus.PROCESSING
    project.knowledge_error = None
    db.commit()
    db.refresh(project)
    background.add_task(run_distill, project.id)
    return _state(project)

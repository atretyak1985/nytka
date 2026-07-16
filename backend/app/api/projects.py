from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.schemas import LlmTestOut, ProjectOut, ProjectPatchIn
from app.db.models import Project
from app.db.session import get_db
from app.llm.client import get_client, model_and_kwargs

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.id)))


@router.patch("/{project_id}", response_model=ProjectOut)
def patch_project(project_id: int, payload: ProjectPatchIn, db: Session = Depends(get_db)) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/llm-test", response_model=LlmTestOut)
def llm_test(project_id: int, db: Session = Depends(get_db)) -> LlmTestOut:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    model, kwargs = model_and_kwargs(project)
    try:
        client = get_client()
        client.chat.completions.create(
            model=model,
            response_model=None,
            messages=[{"role": "user", "content": "Reply with OK"}],
            max_tokens=5,
            **kwargs,
        )
        return LlmTestOut(ok=True)
    except Exception as exc:  # noqa: BLE001 - report any connectivity error to UI
        return LlmTestOut(ok=False, error=str(exc)[:500])

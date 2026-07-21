from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.schemas import JiraPreviewOut, TaskCreateIn, TaskOut, TaskPatchIn, TaskScreenshotOut
from app.db.models import Project, Task, TaskScreenshot, TaskStatus
from app.db.session import get_db
from app.jira.service import build_preview, jira_enabled_for, push_task
from app.pipeline.screenshots import delete_screenshot_files

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

NON_NULLABLE_FIELDS = {"title", "description", "priority", "labels"}

ALLOWED_TRANSITIONS: dict[TaskStatus, set[TaskStatus]] = {
    TaskStatus.DRAFT: {TaskStatus.APPROVED, TaskStatus.REJECTED},
    TaskStatus.APPROVED: {TaskStatus.DONE, TaskStatus.DRAFT},
    TaskStatus.REJECTED: {TaskStatus.DRAFT},
    TaskStatus.DONE: set(),
}


@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskCreateIn, db: Session = Depends(get_db)) -> Task:
    if db.get(Project, payload.project_id) is None:
        raise HTTPException(404, "Project not found")
    task = Task(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("", response_model=list[TaskOut])
def list_tasks(
    project_id: int | None = None,
    status: TaskStatus | None = None,
    meeting_id: int | None = None,
    db: Session = Depends(get_db),
) -> list[Task]:
    query = select(Task).order_by(Task.created_at.desc())
    if project_id is not None:
        query = query.where(Task.project_id == project_id)
    if status is not None:
        query = query.where(Task.status == status)
    if meeting_id is not None:
        query = query.where(Task.meeting_id == meeting_id)
    return list(db.scalars(query))


@router.patch("/{task_id}", response_model=TaskOut)
def patch_task(task_id: int, payload: TaskPatchIn, db: Session = Depends(get_db)) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    updates = payload.model_dump(exclude_unset=True)
    push_to_jira = updates.pop("push_to_jira", True)
    new_status = updates.pop("status", None)
    approving = new_status == TaskStatus.APPROVED and task.status == TaskStatus.DRAFT
    if new_status is not None and new_status != task.status:
        if new_status not in ALLOWED_TRANSITIONS[task.status]:
            raise HTTPException(409, f"Illegal transition {task.status} -> {new_status}")
        task.status = new_status
    for field, value in updates.items():
        if value is None and field in NON_NULLABLE_FIELDS:
            raise HTTPException(422, f"Field '{field}' cannot be null")
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    if approving and push_to_jira and task.jira_issue_key is None and jira_enabled_for(db.get(Project, task.project_id)):
        push_task(db, task)  # never raises; outcome lands in jira_* columns
        db.refresh(task)
    return task


@router.get("/{task_id}/jira-preview", response_model=JiraPreviewOut)
def jira_preview(task_id: int, db: Session = Depends(get_db)) -> JiraPreviewOut:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    preview = build_preview(db, task)
    return JiraPreviewOut(**{k: v for k, v in preview.items() if k != "assignee_account_id"})


@router.post("/{task_id}/jira-push", response_model=TaskOut)
def jira_push(task_id: int, db: Session = Depends(get_db)) -> Task:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    if task.jira_issue_key is not None:
        raise HTTPException(409, f"Already synced as {task.jira_issue_key}")
    push_task(db, task)
    db.refresh(task)
    return task


def _get_screenshot(db: Session, task_id: int, screenshot_id: int) -> TaskScreenshot:
    shot = db.get(TaskScreenshot, screenshot_id)
    if shot is None or shot.task_id != task_id:
        raise HTTPException(404, "Screenshot not found")
    return shot


@router.get("/{task_id}/screenshots", response_model=list[TaskScreenshotOut])
def list_screenshots(task_id: int, db: Session = Depends(get_db)) -> list[TaskScreenshot]:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    return task.screenshots  # ordered by position via the relationship


@router.get("/{task_id}/screenshots/{screenshot_id}/image")
def get_screenshot_image(task_id: int, screenshot_id: int, db: Session = Depends(get_db)) -> FileResponse:
    shot = _get_screenshot(db, task_id, screenshot_id)
    path = Path(shot.path)
    if not path.exists():
        raise HTTPException(404, "Screenshot file not found")
    return FileResponse(path, media_type="image/jpeg", content_disposition_type="inline")


@router.delete("/{task_id}/screenshots/{screenshot_id}", status_code=204)
def delete_screenshot(task_id: int, screenshot_id: int, db: Session = Depends(get_db)) -> None:
    """User curation from the approve dialog: drop one frame permanently."""
    shot = _get_screenshot(db, task_id, screenshot_id)
    Path(shot.path).unlink(missing_ok=True)
    db.delete(shot)
    db.commit()


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)) -> None:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    delete_screenshot_files(task)
    db.delete(task)
    db.commit()

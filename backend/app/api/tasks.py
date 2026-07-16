from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.schemas import TaskCreateIn, TaskOut, TaskPatchIn
from app.db.models import Project, Task, TaskStatus
from app.db.session import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

NON_NULLABLE_FIELDS = {"title", "description", "priority"}

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
    new_status = updates.pop("status", None)
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
    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, db: Session = Depends(get_db)) -> None:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(404, "Task not found")
    db.delete(task)
    db.commit()

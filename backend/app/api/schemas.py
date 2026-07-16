from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.db.models import MeetingStatus, TaskPriority, TaskStatus


class SegmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    t_start: float
    t_end: float
    text: str
    speaker: str | None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    meeting_id: int | None
    title: str
    description: str
    assignee: str | None
    priority: TaskPriority
    status: TaskStatus
    source_timestamp: float | None
    created_at: datetime
    updated_at: datetime


class MeetingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    title: str
    source_filename: str
    status: MeetingStatus
    error_message: str | None
    duration_sec: float | None
    language: str | None
    created_at: datetime


class MeetingDetailOut(MeetingOut):
    segments: list[SegmentOut]
    tasks: list[TaskOut]


class TaskCreateIn(BaseModel):
    project_id: int
    title: str
    description: str = ""
    assignee: str | None = None
    priority: TaskPriority = TaskPriority.MEDIUM


class TaskPatchIn(BaseModel):
    title: str | None = None
    description: str | None = None
    assignee: str | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    llm_provider: str
    llm_model: str
    llm_base_url: str | None
    # llm_api_key intentionally excluded from responses


class ProjectPatchIn(BaseModel):
    name: str | None = None
    llm_provider: str | None = None
    llm_model: str | None = None
    llm_base_url: str | None = None
    llm_api_key: str | None = None


class LlmTestOut(BaseModel):
    ok: bool
    error: str | None = None

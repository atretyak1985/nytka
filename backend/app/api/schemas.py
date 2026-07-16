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

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import JSON, Enum, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MeetingStatus(enum.StrEnum):
    QUEUED = "queued"
    PROCESSING = "processing"
    TRANSCRIBING = "transcribing"
    EXTRACTING = "extracting"
    DONE = "done"
    ERROR = "error"


class TaskStatus(enum.StrEnum):
    DRAFT = "draft"
    APPROVED = "approved"
    DONE = "done"
    REJECTED = "rejected"


class TaskPriority(enum.StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    color: Mapped[str] = mapped_column(String(20), default="#7a0d38")
    description: Mapped[str] = mapped_column(Text, default="")
    ai_context: Mapped[str] = mapped_column(Text, default="")  # AI extraction context/instructions
    task_prefix: Mapped[str] = mapped_column(String(20), default="")  # e.g. "CRM"
    task_format: Mapped[str] = mapped_column(Text, default="")  # task description template
    glossary: Mapped[list[str]] = mapped_column(JSON, default=list)
    team: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)  # items: {"name", "role"}
    jira_enabled: Mapped[bool] = mapped_column(default=False)
    jira_key: Mapped[str] = mapped_column(String(50), default="")
    jira_base_url: Mapped[str] = mapped_column(String(500), default="")  # e.g. https://acme.atlassian.net
    jira_email: Mapped[str] = mapped_column(String(300), default="")
    jira_api_token: Mapped[str] = mapped_column(String(500), default="")  # stored plaintext locally; never returned by the API
    llm_provider: Mapped[str] = mapped_column(String(50), default="lmstudio")
    llm_model: Mapped[str] = mapped_column(String(200), default="local-model")
    # IPv4 loopback on purpose: `localhost` resolves to `::1` first on macOS while
    # LM Studio listens on IPv4 only (same bug class as frontend/src/lib/api.ts).
    llm_base_url: Mapped[str | None] = mapped_column(String(500), default="http://127.0.0.1:1234/v1")
    llm_api_key: Mapped[str | None] = mapped_column(String(500), default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    @property
    def jira_token_set(self) -> bool:
        return bool(self.jira_api_token)

    @property
    def jira_token_hint(self) -> str:
        return self.jira_api_token[-4:] if self.jira_api_token else ""

    meetings: Mapped[list[Meeting]] = relationship(back_populates="project")


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    title: Mapped[str] = mapped_column(String(300))
    source_filename: Mapped[str] = mapped_column(String(300))
    media_path: Mapped[str] = mapped_column(String(1000))
    status: Mapped[MeetingStatus] = mapped_column(
        Enum(MeetingStatus, values_callable=lambda e: [m.value for m in e]),
        default=MeetingStatus.QUEUED,
    )
    error_message: Mapped[str | None] = mapped_column(Text, default=None)
    duration_sec: Mapped[float | None] = mapped_column(Float, default=None)
    language: Mapped[str | None] = mapped_column(String(10), default=None)
    progress: Mapped[float | None] = mapped_column(Float, default=None)
    processing_started_at: Mapped[datetime | None] = mapped_column(default=None)
    processing_finished_at: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    project: Mapped[Project] = relationship(back_populates="meetings")
    segments: Mapped[list[TranscriptSegment]] = relationship(
        back_populates="meeting", order_by="TranscriptSegment.t_start", cascade="all, delete-orphan"
    )
    tasks: Mapped[list[Task]] = relationship(back_populates="meeting")


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(ForeignKey("meetings.id"), index=True)
    t_start: Mapped[float] = mapped_column(Float)
    t_end: Mapped[float] = mapped_column(Float)
    text: Mapped[str] = mapped_column(Text)
    speaker: Mapped[str | None] = mapped_column(String(100), default=None)  # diarization: phase 2

    meeting: Mapped[Meeting] = relationship(back_populates="segments")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), index=True)
    meeting_id: Mapped[int | None] = mapped_column(ForeignKey("meetings.id"), index=True, default=None)
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[str] = mapped_column(Text, default="")
    assignee: Mapped[str | None] = mapped_column(String(200), default=None)
    priority: Mapped[TaskPriority] = mapped_column(
        Enum(TaskPriority, values_callable=lambda e: [m.value for m in e]),
        default=TaskPriority.MEDIUM,
    )
    status: Mapped[TaskStatus] = mapped_column(
        Enum(TaskStatus, values_callable=lambda e: [m.value for m in e]),
        default=TaskStatus.DRAFT,
    )
    source_timestamp: Mapped[float | None] = mapped_column(Float, default=None)
    jira_issue_key: Mapped[str | None] = mapped_column(String(50), default=None)  # e.g. CRM-42
    jira_synced_at: Mapped[datetime | None] = mapped_column(default=None)
    jira_sync_error: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    meeting: Mapped[Meeting | None] = relationship(back_populates="tasks")


class AppSetting(Base):
    """Global, app-wide settings (single row, id=1). Currently the base extraction prompt."""

    __tablename__ = "app_settings"

    id: Mapped[int] = mapped_column(primary_key=True)
    extraction_prompt: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

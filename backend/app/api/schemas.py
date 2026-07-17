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
    jira_issue_key: str | None
    jira_synced_at: datetime | None
    jira_sync_error: str | None


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
    progress: float | None
    processing_started_at: datetime | None
    processing_finished_at: datetime | None
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
    push_to_jira: bool = True  # only consulted on the draft -> approved transition


class TeamMember(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    role: str


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    color: str
    description: str
    ai_context: str
    task_prefix: str
    task_format: str
    glossary: list[str]
    team: list[TeamMember]
    jira_enabled: bool
    jira_key: str
    llm_provider: str
    llm_model: str
    llm_base_url: str | None
    created_at: datetime
    updated_at: datetime
    # llm_api_key intentionally excluded from responses


class ProjectCreateIn(BaseModel):
    name: str
    description: str = ""
    color: str = "#7a0d38"


class ProjectPatchIn(BaseModel):
    name: str | None = None
    color: str | None = None
    description: str | None = None
    ai_context: str | None = None
    task_prefix: str | None = None
    task_format: str | None = None
    glossary: list[str] | None = None
    team: list[TeamMember] | None = None
    jira_enabled: bool | None = None
    jira_key: str | None = None
    llm_provider: str | None = None
    llm_model: str | None = None
    llm_base_url: str | None = None
    llm_api_key: str | None = None


class LlmTestOut(BaseModel):
    ok: bool
    error: str | None = None


class AppSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    extraction_prompt: str
    jira_base_url: str
    jira_email: str
    jira_token_set: bool
    jira_token_hint: str  # last 4 chars of the stored token, "" when unset


class AppSettingsPatchIn(BaseModel):
    extraction_prompt: str | None = None
    jira_base_url: str | None = None
    jira_email: str | None = None
    jira_api_token: str | None = None  # None = keep existing; "" = clear


class JiraTestOut(BaseModel):
    ok: bool
    account_name: str | None = None
    error: str | None = None


class JiraPreviewOut(BaseModel):
    ok: bool
    project_key: str | None = None
    issue_type: str | None = None
    summary: str | None = None
    description: str | None = None
    priority: str | None = None
    assignee_query: str | None = None
    assignee_found: bool = False
    assignee_display_name: str | None = None
    error: str | None = None


class LlmConnectOut(BaseModel):
    ok: bool
    models: list[str] = []
    model: str | None = None
    error: str | None = None

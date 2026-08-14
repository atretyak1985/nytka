from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.db.models import BriefStatus, KnowledgeStatus, MeetingStatus, TaskPriority, TaskStatus


class SegmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    t_start: float
    t_end: float
    text: str
    speaker: str | None
    # Mapped team name when the user confirmed one, else the raw diarization label —
    # computed server-side (models.display_speaker) so the frontend never remaps.
    speaker_display: str | None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    meeting_id: int | None
    title: str
    description: str
    area: str
    labels: list[str]
    assignee: str | None
    priority: TaskPriority
    status: TaskStatus
    source_timestamp: float | None
    created_at: datetime
    updated_at: datetime
    jira_issue_key: str | None
    jira_synced_at: datetime | None
    jira_sync_error: str | None
    # Dedup: a suggestion while the task is a draft, the merge target once status=merged.
    duplicate_of_task_id: int | None
    duplicate_reason: str | None


class TaskScreenshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    task_id: int
    t_sec: float
    position: int
    created_at: datetime
    # path intentionally excluded — server filesystem detail (like llm_api_key in ProjectOut)


class BriefPointOut(BaseModel):
    text: str
    source_timestamp: float | None = None


class MeetingBriefOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    meeting_id: int
    summary: str
    decisions: list[BriefPointOut]
    risks: list[BriefPointOut]
    open_questions: list[BriefPointOut]
    next_steps: list[BriefPointOut]
    status: BriefStatus
    error: str | None
    generated_at: datetime | None


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
    brief: MeetingBriefOut | None
    # {"SPEAKER_00": "Andriy Tretiak"} — user-confirmed mapping of diarization labels.
    speaker_labels: dict[str, str]
    # Sorted unique diarization labels present in the transcript (Meeting.detected_speakers).
    detected_speakers: list[str]


class MeetingPatchIn(BaseModel):
    # Merged into the stored mapping: an empty value removes that label's mapping.
    speaker_labels: dict[str, str] | None = None


class TaskCreateIn(BaseModel):
    project_id: int
    title: str
    description: str = ""
    assignee: str | None = None
    priority: TaskPriority = TaskPriority.MEDIUM


class TaskPatchIn(BaseModel):
    title: str | None = None
    description: str | None = None
    area: str | None = None
    labels: list[str] | None = None
    assignee: str | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    push_to_jira: bool = True  # only consulted on the draft -> approved transition


class TaskMergeIn(BaseModel):
    target_task_id: int


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
    task_language: str
    task_areas: list[str]
    glossary: list[str]
    team: list[TeamMember]
    jira_enabled: bool
    jira_static_labels: list[str]
    jira_demo_label: bool
    jira_sprint_field: str
    jira_sprint_id: int | None
    jira_key: str
    jira_base_url: str
    jira_email: str
    jira_token_set: bool
    jira_token_hint: str
    llm_provider: str
    llm_model: str
    llm_base_url: str | None
    knowledge_status: KnowledgeStatus
    knowledge_brief: str
    knowledge_error: str | None
    knowledge_generated_at: datetime | None
    knowledge_stale: bool
    created_at: datetime
    updated_at: datetime
    # llm_api_key intentionally excluded from responses
    # jira_api_token intentionally excluded from responses


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
    task_language: str | None = None
    task_areas: list[str] | None = None
    glossary: list[str] | None = None
    team: list[TeamMember] | None = None
    jira_enabled: bool | None = None
    jira_static_labels: list[str] | None = None
    jira_demo_label: bool | None = None
    jira_sprint_field: str | None = None
    jira_sprint_id: int | None = None
    jira_key: str | None = None
    jira_base_url: str | None = None
    jira_email: str | None = None
    jira_api_token: str | None = None
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


class AppSettingsPatchIn(BaseModel):
    extraction_prompt: str | None = None


class JiraTestOut(BaseModel):
    ok: bool
    account_name: str | None = None
    error: str | None = None


class JiraUserOut(BaseModel):
    account_id: str
    display_name: str


class JiraUsersOut(BaseModel):
    ok: bool
    users: list[JiraUserOut] = []
    error: str | None = None


class JiraPreviewOut(BaseModel):
    ok: bool
    project_key: str | None = None
    issue_type: str | None = None
    summary: str | None = None
    description: str | None = None
    priority: str | None = None
    labels: list[str] = []
    sprint_id: int | None = None
    area: str | None = None
    assignee_query: str | None = None
    assignee_found: bool = False
    assignee_display_name: str | None = None
    error: str | None = None


class LlmConnectOut(BaseModel):
    ok: bool
    models: list[str] = []
    model: str | None = None
    error: str | None = None


class SearchHitOut(BaseModel):
    """One project-memory search hit (see app/db/fts.py)."""
    kind: str  # "segment" | "task" | "brief"
    meeting_id: int | None
    meeting_title: str | None
    task_id: int | None  # ref_id when kind == "task", else None
    t_start: float | None
    # Highlight markers are \x01/\x02 control characters, not HTML: the transcript may
    # itself contain markup, so the client splits on them instead of rendering raw HTML.
    snippet: str


class SearchOut(BaseModel):
    query: str
    hits: list[SearchHitOut]


class AskIn(BaseModel):
    question: str


class AskCitationOut(BaseModel):
    meeting_id: int
    meeting_title: str
    t_start: float | None
    quote: str


class AskOut(BaseModel):
    answer: str
    no_data: bool
    citations: list[AskCitationOut]


class KnowledgeFileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    filename: str
    kind: str
    size_bytes: int
    created_at: datetime


class KnowledgeStateOut(BaseModel):
    """Knowledge-base status for a project, returned alongside its files."""
    model_config = ConfigDict(from_attributes=True)
    knowledge_status: KnowledgeStatus
    knowledge_brief: str
    knowledge_error: str | None
    knowledge_generated_at: datetime | None
    knowledge_stale: bool
    files: list[KnowledgeFileOut]

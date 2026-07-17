"""Task -> Jira issue mapping and push. build_preview() is the single source of
truth for the field mapping; the preview endpoint and push_task() both use it,
so the UI preview can never diverge from what gets created."""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.models import Project, Task, TaskPriority
from app.db.seed import ensure_app_settings
from app.jira import client as jira_client

PRIORITY_MAP = {TaskPriority.LOW: "Low", TaskPriority.MEDIUM: "Medium", TaskPriority.HIGH: "High"}
ISSUE_TYPE = "Task"


def get_credentials(db: Session) -> tuple[str, str, str] | None:
    row = ensure_app_settings(db)
    if row.jira_base_url and row.jira_email and row.jira_api_token:
        return row.jira_base_url, row.jira_email, row.jira_api_token
    return None


def jira_enabled_for(project: Project | None) -> bool:
    return bool(project and project.jira_enabled and project.jira_key)


def build_preview(db: Session, task: Task) -> dict:
    """Exact fields the issue will be created with, plus assignee resolution."""
    project = db.get(Project, task.project_id)
    if not jira_enabled_for(project):
        return {"ok": False, "error": "Jira is not enabled for this project (toggle + project key required)."}
    creds = get_credentials(db)
    if creds is None:
        return {"ok": False, "error": "Jira credentials are not configured — set them in Settings."}

    description = task.description or ""
    if task.meeting is not None:
        description = f"{description}\n\nSource: meeting «{task.meeting.title}» (Nytka)".strip()

    assignee_display_name: str | None = None
    assignee_account_id: str | None = None
    assignee_found = False
    if task.assignee:
        user = jira_client.find_user(*creds, task.assignee)
        if user is not None:
            assignee_found = True
            assignee_account_id = user["account_id"]
            assignee_display_name = user["display_name"]

    return {
        "ok": True,
        "project_key": project.jira_key,
        "issue_type": ISSUE_TYPE,
        "summary": task.title,
        "description": description,
        "priority": PRIORITY_MAP[task.priority],
        "assignee_query": task.assignee,
        "assignee_found": assignee_found,
        "assignee_display_name": assignee_display_name,
        "assignee_account_id": assignee_account_id,
        "error": None,
    }


def push_task(db: Session, task: Task) -> None:
    """Create the Jira issue for a task. Never raises — the outcome lands in the
    task's jira_* columns so a Jira failure can't block an approve."""
    preview = build_preview(db, task)
    if not preview["ok"]:
        task.jira_sync_error = preview["error"]
        db.commit()
        return
    creds = get_credentials(db)
    fields: dict = {
        "project": {"key": preview["project_key"]},
        "summary": preview["summary"],
        "description": jira_client.text_to_adf(preview["description"]),
        "issuetype": {"name": preview["issue_type"]},
        "priority": {"name": preview["priority"]},
    }
    if preview["assignee_account_id"]:
        fields["assignee"] = {"accountId": preview["assignee_account_id"]}
    try:
        key = jira_client.create_issue(*creds, fields)
    except jira_client.JiraError as e:
        task.jira_sync_error = str(e)
        db.commit()
        return
    task.jira_issue_key = key
    task.jira_synced_at = datetime.now(timezone.utc).replace(tzinfo=None)
    task.jira_sync_error = None
    db.commit()

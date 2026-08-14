"""Task -> Jira issue mapping and push. build_preview() is the single source of
truth for the field mapping; the preview endpoint and push_task() both use it,
so the UI preview can never diverge from what gets created."""
from __future__ import annotations

import re
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.db.models import Project, Task, TaskPriority, TaskStatus
from app.jira import client as jira_client
from app.llm.chunking import format_timestamp

PRIORITY_MAP = {TaskPriority.LOW: "Low", TaskPriority.MEDIUM: "Medium", TaskPriority.HIGH: "High"}
ISSUE_TYPE = "Task"


def get_credentials(project: Project) -> tuple[str, str, str] | None:
    if project.jira_base_url and project.jira_email and project.jira_api_token:
        return project.jira_base_url, project.jira_email, project.jira_api_token
    return None


def jira_enabled_for(project: Project | None) -> bool:
    return bool(project and project.jira_enabled and project.jira_key)


def _area_to_labels(area: str) -> list[str]:
    """"[Area][Sub-area]" -> ["area", "sub-area"] (Jira labels: lowercase, no spaces)."""
    parts = [p.strip() for p in area.strip().strip("[]").split("][")]
    return [p.lower().replace(" ", "-") for p in parts if p]


_TITLE_DATE = re.compile(r"(\d{4})-(\d{2})-(\d{2})")


def _meeting_date(meeting) -> date:
    """Date the meeting was RECORDED: recordings are named like
    "2026-07-15_20-04-14", so prefer a date embedded in the title over
    created_at (the upload date, which can be days later)."""
    match = _TITLE_DATE.search(meeting.title)
    if match:
        try:
            return date(int(match[1]), int(match[2]), int(match[3]))
        except ValueError:
            pass
    return meeting.created_at.date()


def _labels_for(project: Project, task: Task) -> list[str]:
    labels = list(project.jira_static_labels)
    if project.jira_demo_label and task.meeting is not None:
        labels.append(f"demo-{_meeting_date(task.meeting):%Y-%m-%d}")
    if task.area:
        labels.extend(_area_to_labels(task.area))
    # Per-task extra labels; normalise (Jira labels cannot contain spaces) so a
    # hand-typed "User management" can't make the whole labels field get dropped.
    labels.extend(label.strip().lower().replace(" ", "-") for label in task.labels)
    # de-dup, drop blanks, stable order
    return list(dict.fromkeys(label for label in labels if label))


def _summary_for(task: Task) -> str:
    return f"{task.area} {task.title}".strip() if task.area else task.title


def _description_for(task: Task) -> str:
    description = task.description or ""
    if task.meeting is not None:
        source = f"Source: meeting «{task.meeting.title}» (Nytka)"
        if task.source_timestamp is not None:
            source += f", video {format_timestamp(task.source_timestamp)}"
        description = f"{description}\n\n{source}".strip()
    return description


def build_preview(db: Session, task: Task) -> dict:
    """Exact fields the issue will be created with, plus assignee resolution."""
    project = db.get(Project, task.project_id)
    if not jira_enabled_for(project):
        return {"ok": False, "error": "Jira is not enabled for this project (toggle + project key required)."}
    creds = get_credentials(project)
    if creds is None:
        return {"ok": False, "error": "Jira credentials are not configured — set them in this project's Settings."}

    assignee_display_name: str | None = None
    assignee_account_id: str | None = None
    assignee_found = False
    if task.assignee:
        user = jira_client.find_user(*creds, task.assignee)
        if user is not None:
            assignee_found = True
            assignee_account_id = user["account_id"]
            assignee_display_name = user["display_name"]

    sprint_id = project.jira_sprint_id if project.jira_sprint_field and project.jira_sprint_id else None

    return {
        "ok": True,
        "project_key": project.jira_key,
        "issue_type": ISSUE_TYPE,
        "summary": _summary_for(task),
        "description": _description_for(task),
        "priority": PRIORITY_MAP[task.priority],
        "labels": _labels_for(project, task),
        "sprint_id": sprint_id,
        "area": task.area or None,
        "assignee_query": task.assignee,
        "assignee_found": assignee_found,
        "assignee_display_name": assignee_display_name,
        "assignee_account_id": assignee_account_id,
        "error": None,
    }


def merge_comment_text(task: Task) -> str:
    """Pure builder (testable without DB/network): what lands in the Jira comment."""
    lines = [
        "Duplicate discussed again in Nytka — merged into this ticket.",
        f"Task: {task.title}",
    ]
    if task.description:
        lines.append(task.description)
    if task.meeting is not None:
        source = f"Source: meeting «{task.meeting.title}»"
        if task.source_timestamp is not None:
            source += f", video {format_timestamp(task.source_timestamp)}"
        lines.append(source)
    return "\n\n".join(lines)


def merge_into(db: Session, task: Task, target: Task) -> str | None:
    """Fold a draft into an existing task. Returns an error string (task untouched)
    or None on success (task is now MERGED and points at the target).

    Comment-first: when the target lives in Jira and credentials are present, the
    comment MUST land before the status flips — a failed comment leaves the draft
    intact so the user can retry. Unlike push_task (where a Jira failure must not
    block an approve), merge is an explicit action whose whole point is the
    Jira-side trace, so it fails loudly instead of degrading.
    """
    project = db.get(Project, task.project_id)
    if target.jira_issue_key and jira_enabled_for(project):
        creds = get_credentials(project)
        if creds is None:
            return "Jira credentials are not configured — set them in this project's Settings."
        try:
            jira_client.add_comment(*creds, target.jira_issue_key, merge_comment_text(task))
        except jira_client.JiraError as e:
            return str(e)
    # Target without a Jira key (or Jira disabled) is a purely local merge: status and
    # link, no network. Valid — the comment is only owed when there is a ticket to own it.
    task.status = TaskStatus.MERGED
    task.duplicate_of_task_id = target.id
    db.commit()
    return None


def push_task(db: Session, task: Task) -> None:
    """Create the Jira issue for a task. Never raises — the outcome lands in the
    task's jira_* columns so a Jira failure can't block an approve."""
    preview = build_preview(db, task)
    if not preview["ok"]:
        task.jira_sync_error = preview["error"]
        db.commit()
        return
    project = db.get(Project, task.project_id)
    creds = get_credentials(project)
    fields: dict = {
        "project": {"key": preview["project_key"]},
        "summary": preview["summary"],
        "description": jira_client.text_to_adf(preview["description"]),
        "issuetype": {"name": preview["issue_type"]},
        "priority": {"name": preview["priority"]},
    }
    if preview["assignee_account_id"]:
        fields["assignee"] = {"accountId": preview["assignee_account_id"]}
    if preview["labels"]:
        fields["labels"] = preview["labels"]
    if preview["sprint_id"] is not None:
        fields[project.jira_sprint_field] = preview["sprint_id"]
    try:
        key, dropped = jira_client.create_issue(*creds, fields)
    except jira_client.JiraError as e:
        task.jira_sync_error = str(e)
        db.commit()
        return
    task.jira_issue_key = key
    task.jira_synced_at = datetime.now(timezone.utc).replace(tzinfo=None)

    # Best-effort attachment upload: the issue exists now, so a failure here must
    # degrade to a warning, never undo the sync. Missing-on-disk files (deleted
    # between preview and push, disk cleanup) are silently skipped.
    attach_error: str | None = None
    shot_paths = [Path(s.path) for s in task.screenshots if Path(s.path).exists()]
    if shot_paths:
        try:
            jira_client.add_attachments(*creds, key, shot_paths)
        except jira_client.JiraError as e:
            attach_error = f"attachments failed: {e}"

    # Issue created, but something partially failed — tell the user which conventions
    # did not stick (e.g. sprint field/labels not on the create screen) and/or that
    # the screenshots did not make it.
    warnings: list[str] = []
    if dropped:
        warnings.append(f"Jira dropped these fields on retry: {', '.join(dropped)}")
    if attach_error:
        warnings.append(attach_error)
    task.jira_sync_error = f"Created, but {'; '.join(warnings)}" if warnings else None
    db.commit()

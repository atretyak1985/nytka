"""API + service tests for the Jira integration. Jira HTTP is stubbed at the
app.jira.client function level via monkeypatch."""
from pathlib import Path

import pytest

from app.core.config import settings
from app.db.models import Project, Task, TaskScreenshot, TaskStatus
from app.jira import client as jira_client
from app.jira import service as jira_service


@pytest.fixture()
def jira_ready(db_session):
    """Default project with Jira on + creds saved on the project row. Returns the project."""
    project = db_session.query(Project).first()
    project.jira_enabled = True
    project.jira_key = "CRM"
    project.jira_base_url = "https://acme.atlassian.net"
    project.jira_email = "a@b.c"
    project.jira_api_token = "tok"
    db_session.commit()
    return project


def make_task(db_session, project, **kw):
    task = Task(project_id=project.id, title=kw.pop("title", "Fix login"), **kw)
    db_session.add(task)
    db_session.commit()
    return task


def test_preview_maps_fields(db_session, jira_ready, monkeypatch):
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: {"account_id": "acc-1", "display_name": "Ivan P"})
    task = make_task(db_session, jira_ready, description="Broken on prod", assignee="Ivan", priority="high")
    preview = jira_service.build_preview(db_session, task)
    assert preview["ok"] is True
    assert preview["project_key"] == "CRM"
    assert preview["issue_type"] == "Task"
    assert preview["summary"] == "Fix login"
    assert "Broken on prod" in preview["description"]
    assert preview["priority"] == "High"
    assert preview["assignee_found"] is True
    assert preview["assignee_display_name"] == "Ivan P"


def test_preview_assignee_not_found(db_session, jira_ready, monkeypatch):
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    task = make_task(db_session, jira_ready, assignee="Ghost")
    preview = jira_service.build_preview(db_session, task)
    assert preview["ok"] is True
    assert preview["assignee_found"] is False
    assert preview["assignee_query"] == "Ghost"


def test_preview_without_creds(db_session):
    """Jira toggled on but no credentials set → preview reports credentials error."""
    project = db_session.query(Project).first()
    project.jira_enabled = True
    project.jira_key = "CRM"
    # credentials remain empty (default "")
    db_session.commit()
    task = make_task(db_session, project)
    preview = jira_service.build_preview(db_session, task)
    assert preview["ok"] is False
    assert "credentials" in preview["error"].lower()


def test_push_success_records_key(db_session, jira_ready, monkeypatch):
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    monkeypatch.setattr(jira_client, "create_issue", lambda *a, **k: ("CRM-7", []))
    task = make_task(db_session, jira_ready)
    jira_service.push_task(db_session, task)
    assert task.jira_issue_key == "CRM-7"
    assert task.jira_synced_at is not None
    assert task.jira_sync_error is None


def test_push_failure_records_error_not_raises(db_session, jira_ready, monkeypatch):
    def boom(*a, **k):
        raise jira_client.JiraError("Jira API 500: oops")

    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    monkeypatch.setattr(jira_client, "create_issue", boom)
    task = make_task(db_session, jira_ready)
    jira_service.push_task(db_session, task)  # must not raise
    assert task.jira_issue_key is None
    assert "500" in task.jira_sync_error


# ---------------------------------------------------------------------------
# Per-project token masking / PATCH behaviour
# ---------------------------------------------------------------------------

def test_project_out_masks_token(client, db_session):
    """PATCH a token → response exposes jira_token_set/hint but NOT the raw token."""
    project = db_session.query(Project).first()
    body = client.patch(
        f"/api/projects/{project.id}",
        json={"jira_api_token": "secret-tok-1234"},
    ).json()
    assert body["jira_token_set"] is True
    assert body["jira_token_hint"] == "1234"
    assert "jira_api_token" not in body


def test_project_patch_omitting_token_keeps_existing(client, db_session):
    """PATCH a different field without the token key → token is unchanged."""
    project = db_session.query(Project).first()
    client.patch(f"/api/projects/{project.id}", json={"jira_api_token": "secret-tok-1234"})
    # Now patch only email — no token key in payload
    body = client.patch(f"/api/projects/{project.id}", json={"jira_email": "new@b.c"}).json()
    assert body["jira_token_set"] is True
    assert body["jira_email"] == "new@b.c"


def test_project_jira_test_ok(client, db_session, monkeypatch):
    """Project with full creds → jira-test returns ok + account_name."""
    project = db_session.query(Project).first()
    project.jira_base_url = "https://acme.atlassian.net"
    project.jira_email = "a@b.c"
    project.jira_api_token = "tok"
    db_session.commit()
    monkeypatch.setattr(jira_client, "test_connection", lambda *a: {"ok": True, "account_name": "Andrii T"})
    body = client.post(f"/api/projects/{project.id}/jira-test").json()
    assert body == {"ok": True, "account_name": "Andrii T", "error": None}


def test_project_jira_test_without_creds(client, db_session):
    """Project with no creds → jira-test returns ok=False, 'not configured' in error."""
    project = db_session.query(Project).first()
    # Ensure creds are empty
    project.jira_base_url = ""
    project.jira_email = ""
    project.jira_api_token = ""
    db_session.commit()
    body = client.post(f"/api/projects/{project.id}/jira-test").json()
    assert body["ok"] is False
    assert "not configured" in body["error"]


# ---------------------------------------------------------------------------
# Endpoint-level tests (preview, approve, push, retry)
# ---------------------------------------------------------------------------

def seed_creds_and_project(db_session):
    """Set Jira creds and enable Jira on the default project via ORM."""
    project = db_session.query(Project).first()
    project.jira_enabled = True
    project.jira_key = "CRM"
    project.jira_base_url = "https://acme.atlassian.net"
    project.jira_email = "a@b.c"
    project.jira_api_token = "tok"
    db_session.commit()
    return project


def test_preview_endpoint(client, db_session, monkeypatch):
    project = seed_creds_and_project(db_session)
    task = make_task(db_session, project, assignee="Ivan", priority="high")
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: {"account_id": "acc-1", "display_name": "Ivan P"})
    body = client.get(f"/api/tasks/{task.id}/jira-preview").json()
    assert body["ok"] is True and body["project_key"] == "CRM" and body["priority"] == "High"


def test_approve_auto_pushes(client, db_session, monkeypatch):
    project = seed_creds_and_project(db_session)
    task = make_task(db_session, project)
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    monkeypatch.setattr(jira_client, "create_issue", lambda *a, **k: ("CRM-9", []))
    body = client.patch(f"/api/tasks/{task.id}", json={"status": "approved"}).json()
    assert body["status"] == "approved"
    assert body["jira_issue_key"] == "CRM-9"


def test_approve_with_push_disabled_skips_jira(client, db_session, monkeypatch):
    project = seed_creds_and_project(db_session)
    task = make_task(db_session, project)

    def fail(*a, **k):
        raise AssertionError("create_issue must not be called")

    monkeypatch.setattr(jira_client, "create_issue", fail)
    body = client.patch(f"/api/tasks/{task.id}", json={"status": "approved", "push_to_jira": False}).json()
    assert body["status"] == "approved" and body["jira_issue_key"] is None


def test_approve_jira_failure_does_not_block(client, db_session, monkeypatch):
    project = seed_creds_and_project(db_session)
    task = make_task(db_session, project)

    def boom(*a, **k):
        raise jira_client.JiraError("Jira API 503: down")

    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    monkeypatch.setattr(jira_client, "create_issue", boom)
    resp = client.patch(f"/api/tasks/{task.id}", json={"status": "approved"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "approved" and "503" in body["jira_sync_error"]


def test_approve_jira_disabled_project_untouched(client, db_session, monkeypatch):
    project = db_session.query(Project).first()  # jira_enabled stays False
    task = make_task(db_session, project)
    body = client.patch(f"/api/tasks/{task.id}", json={"status": "approved"}).json()
    assert body["status"] == "approved" and body["jira_issue_key"] is None and body["jira_sync_error"] is None


def test_manual_retry_push(client, db_session, monkeypatch):
    project = seed_creds_and_project(db_session)
    task = make_task(db_session, project, status=TaskStatus.APPROVED)
    task.jira_sync_error = "Jira API 503: down"
    db_session.commit()
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    monkeypatch.setattr(jira_client, "create_issue", lambda *a, **k: ("CRM-10", []))
    body = client.post(f"/api/tasks/{task.id}/jira-push").json()
    assert body["jira_issue_key"] == "CRM-10" and body["jira_sync_error"] is None


def test_retry_push_conflicts_when_already_synced(client, db_session):
    project = seed_creds_and_project(db_session)
    task = make_task(db_session, project, status=TaskStatus.APPROVED)
    task.jira_issue_key = "CRM-1"
    db_session.commit()
    assert client.post(f"/api/tasks/{task.id}/jira-push").status_code == 409


def test_push_survives_network_error(db_session, jira_ready, monkeypatch):
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    monkeypatch.setattr(
        jira_client,
        "create_issue",
        lambda *a, **k: (_ for _ in ()).throw(jira_client.JiraError("ConnectError: down")),
    )
    task = make_task(db_session, jira_ready)
    jira_service.push_task(db_session, task)  # must not raise
    assert task.jira_issue_key is None and "ConnectError" in task.jira_sync_error


# ---------------------------------------------------------------------------
# Screenshot attachments on push
# ---------------------------------------------------------------------------

def add_screenshots(db_session, task, count=2) -> list[Path]:
    """N TaskScreenshot rows for the task, each backed by a stub JPEG on disk."""
    paths: list[Path] = []
    for position in range(count):
        path = settings.screenshots_dir / str(task.id) / f"frame_{position}.jpg"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(b"\xff\xd8jpegstub")
        db_session.add(
            TaskScreenshot(task_id=task.id, path=str(path), t_sec=float(position * 10), position=position)
        )
        paths.append(path)
    db_session.commit()
    return paths


def test_push_uploads_screenshots_as_attachments(db_session, jira_ready, monkeypatch):
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    monkeypatch.setattr(jira_client, "create_issue", lambda *a, **k: ("CRM-7", []))
    calls = []
    monkeypatch.setattr(jira_client, "add_attachments", lambda *a, **k: calls.append(a) or [])
    task = make_task(db_session, jira_ready)
    paths = add_screenshots(db_session, task, count=2)
    jira_service.push_task(db_session, task)
    assert len(calls) == 1
    base_url, email, token, issue_key, sent_paths = calls[0]
    assert issue_key == "CRM-7"
    assert sent_paths == paths
    assert task.jira_issue_key == "CRM-7"
    assert task.jira_sync_error is None


def test_push_attachment_failure_keeps_issue_key_and_warns(db_session, jira_ready, monkeypatch):
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    monkeypatch.setattr(jira_client, "create_issue", lambda *a, **k: ("CRM-8", []))

    def boom(*a, **k):
        raise jira_client.JiraError("Jira attachments 413: too large")

    monkeypatch.setattr(jira_client, "add_attachments", boom)
    task = make_task(db_session, jira_ready)
    add_screenshots(db_session, task, count=1)
    jira_service.push_task(db_session, task)  # must not raise
    assert task.jira_issue_key == "CRM-8"
    assert task.jira_synced_at is not None
    assert task.jira_sync_error.startswith("Created, but attachments failed:")
    assert task.jira_sync_error == "Created, but attachments failed: Jira attachments 413: too large"


def test_push_dropped_fields_and_attachment_failure_both_warn(db_session, jira_ready, monkeypatch):
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    monkeypatch.setattr(jira_client, "create_issue", lambda *a, **k: ("CRM-9", ["priority"]))

    def boom(*a, **k):
        raise jira_client.JiraError("Jira attachments 403: no Attach permission")

    monkeypatch.setattr(jira_client, "add_attachments", boom)
    task = make_task(db_session, jira_ready)
    add_screenshots(db_session, task, count=1)
    jira_service.push_task(db_session, task)
    assert task.jira_issue_key == "CRM-9"
    assert task.jira_sync_error == (
        "Created, but Jira dropped these fields on retry: priority; "
        "attachments failed: Jira attachments 403: no Attach permission"
    )


def test_push_skips_screenshots_missing_on_disk(db_session, jira_ready, monkeypatch):
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    monkeypatch.setattr(jira_client, "create_issue", lambda *a, **k: ("CRM-10", []))
    calls = []
    monkeypatch.setattr(jira_client, "add_attachments", lambda *a, **k: calls.append(a) or [])
    task = make_task(db_session, jira_ready)
    paths = add_screenshots(db_session, task, count=2)
    paths[1].unlink()  # vanished between preview and push
    jira_service.push_task(db_session, task)
    assert len(calls) == 1
    assert calls[0][4] == [paths[0]]
    assert task.jira_sync_error is None


def test_push_without_screenshots_never_calls_add_attachments(db_session, jira_ready, monkeypatch):
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    monkeypatch.setattr(jira_client, "create_issue", lambda *a, **k: ("CRM-11", []))

    def fail(*a, **k):
        raise AssertionError("add_attachments must not be called for a task without screenshots")

    monkeypatch.setattr(jira_client, "add_attachments", fail)
    task = make_task(db_session, jira_ready)
    jira_service.push_task(db_session, task)
    assert task.jira_issue_key == "CRM-11"
    assert task.jira_sync_error is None


def test_jira_users_ok(client, jira_ready, monkeypatch):
    monkeypatch.setattr(
        jira_client,
        "list_assignable_users",
        lambda *a: [{"account_id": "acc-1", "display_name": "Ivan P"}],
    )
    body = client.get(f"/api/projects/{jira_ready.id}/jira-users").json()
    assert body == {"ok": True, "users": [{"account_id": "acc-1", "display_name": "Ivan P"}], "error": None}


def test_jira_users_without_creds(client, db_session):
    project = db_session.query(Project).first()
    project.jira_base_url = ""
    project.jira_email = ""
    project.jira_api_token = ""
    db_session.commit()
    body = client.get(f"/api/projects/{project.id}/jira-users").json()
    assert body["ok"] is False
    assert "not configured" in body["error"]


def test_jira_users_jira_error_reports_message(client, jira_ready, monkeypatch):
    monkeypatch.setattr(jira_client, "list_assignable_users", lambda *a: None)
    body = client.get(f"/api/projects/{jira_ready.id}/jira-users").json()
    assert body["ok"] is False
    assert "Could not fetch users" in body["error"]


def test_jira_users_unknown_project_404(client):
    assert client.get("/api/projects/99999/jira-users").status_code == 404

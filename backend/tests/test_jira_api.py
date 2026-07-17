"""API + service tests for the Jira integration. Jira HTTP is stubbed at the
app.jira.client function level via monkeypatch."""
import pytest

from app.db.models import AppSetting, Project, Task, TaskStatus
from app.jira import client as jira_client
from app.jira import service as jira_service


@pytest.fixture()
def jira_ready(db_session):
    """Default project with Jira on + creds saved. Returns the project."""
    settings = AppSetting(
        id=1, extraction_prompt="p",
        jira_base_url="https://acme.atlassian.net", jira_email="a@b.c", jira_api_token="tok",
    )
    db_session.add(settings)
    project = db_session.query(Project).first()
    project.jira_enabled = True
    project.jira_key = "CRM"
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
    project = db_session.query(Project).first()
    project.jira_enabled = True
    project.jira_key = "CRM"
    db_session.commit()
    task = make_task(db_session, project)
    preview = jira_service.build_preview(db_session, task)
    assert preview["ok"] is False
    assert "credentials" in preview["error"].lower()


def test_push_success_records_key(db_session, jira_ready, monkeypatch):
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    monkeypatch.setattr(jira_client, "create_issue", lambda *a, **k: "CRM-7")
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


def test_settings_returns_masked_token(client):
    client.patch("/api/settings", json={
        "jira_base_url": "https://acme.atlassian.net", "jira_email": "a@b.c", "jira_api_token": "secret-tok-1234",
    })
    body = client.get("/api/settings").json()
    assert body["jira_base_url"] == "https://acme.atlassian.net"
    assert body["jira_email"] == "a@b.c"
    assert body["jira_token_set"] is True
    assert body["jira_token_hint"] == "1234"
    assert "jira_api_token" not in body


def test_settings_patch_none_token_keeps_existing(client):
    client.patch("/api/settings", json={"jira_api_token": "secret-tok-1234"})
    client.patch("/api/settings", json={"jira_email": "new@b.c"})  # no token in payload
    body = client.get("/api/settings").json()
    assert body["jira_token_set"] is True
    assert body["jira_email"] == "new@b.c"


def test_jira_test_endpoint_ok(client, monkeypatch):
    client.patch("/api/settings", json={
        "jira_base_url": "https://acme.atlassian.net", "jira_email": "a@b.c", "jira_api_token": "tok",
    })
    monkeypatch.setattr(jira_client, "test_connection", lambda *a: {"ok": True, "account_name": "Andrii T"})
    body = client.post("/api/settings/jira-test").json()
    assert body == {"ok": True, "account_name": "Andrii T", "error": None}


def test_jira_test_endpoint_without_creds(client):
    body = client.post("/api/settings/jira-test").json()
    assert body["ok"] is False and "not configured" in body["error"]


def seed_creds_and_project(client, db_session):
    client.patch("/api/settings", json={
        "jira_base_url": "https://acme.atlassian.net", "jira_email": "a@b.c", "jira_api_token": "tok",
    })
    project = db_session.query(Project).first()
    project.jira_enabled = True
    project.jira_key = "CRM"
    db_session.commit()
    return project


def test_preview_endpoint(client, db_session, monkeypatch):
    project = seed_creds_and_project(client, db_session)
    task = make_task(db_session, project, assignee="Ivan", priority="high")
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: {"account_id": "acc-1", "display_name": "Ivan P"})
    body = client.get(f"/api/tasks/{task.id}/jira-preview").json()
    assert body["ok"] is True and body["project_key"] == "CRM" and body["priority"] == "High"


def test_approve_auto_pushes(client, db_session, monkeypatch):
    project = seed_creds_and_project(client, db_session)
    task = make_task(db_session, project)
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    monkeypatch.setattr(jira_client, "create_issue", lambda *a, **k: "CRM-9")
    body = client.patch(f"/api/tasks/{task.id}", json={"status": "approved"}).json()
    assert body["status"] == "approved"
    assert body["jira_issue_key"] == "CRM-9"


def test_approve_with_push_disabled_skips_jira(client, db_session, monkeypatch):
    project = seed_creds_and_project(client, db_session)
    task = make_task(db_session, project)

    def fail(*a, **k):
        raise AssertionError("create_issue must not be called")

    monkeypatch.setattr(jira_client, "create_issue", fail)
    body = client.patch(f"/api/tasks/{task.id}", json={"status": "approved", "push_to_jira": False}).json()
    assert body["status"] == "approved" and body["jira_issue_key"] is None


def test_approve_jira_failure_does_not_block(client, db_session, monkeypatch):
    project = seed_creds_and_project(client, db_session)
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
    project = seed_creds_and_project(client, db_session)
    task = make_task(db_session, project, status=TaskStatus.APPROVED)
    task.jira_sync_error = "Jira API 503: down"
    db_session.commit()
    monkeypatch.setattr(jira_client, "find_user", lambda *a, **k: None)
    monkeypatch.setattr(jira_client, "create_issue", lambda *a, **k: "CRM-10")
    body = client.post(f"/api/tasks/{task.id}/jira-push").json()
    assert body["jira_issue_key"] == "CRM-10" and body["jira_sync_error"] is None


def test_retry_push_conflicts_when_already_synced(client, db_session):
    project = seed_creds_and_project(client, db_session)
    task = make_task(db_session, project, status=TaskStatus.APPROVED)
    task.jira_issue_key = "CRM-1"
    db_session.commit()
    assert client.post(f"/api/tasks/{task.id}/jira-push").status_code == 409

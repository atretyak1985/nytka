"""POST /api/tasks/{id}/merge — folding a duplicate draft into an existing task.

SC-11: the target gets a Jira comment, no second issue is ever created, and the
draft ends in the terminal `merged` state pointing at the target.
"""
import pytest

from app.db.models import Meeting, Project, Task, TaskStatus
from app.jira import client as jira_client
from app.jira import service as jira_service


@pytest.fixture()
def jira_ready(db_session):
    """Default project with Jira on + creds saved on the project row."""
    project = db_session.query(Project).first()
    project.jira_enabled = True
    project.jira_key = "CRM"
    project.jira_base_url = "https://acme.atlassian.net"
    project.jira_email = "a@b.c"
    project.jira_api_token = "tok"
    db_session.commit()
    return project


@pytest.fixture()
def no_issue_creation(monkeypatch):
    """Any create_issue call during a merge is a bug (SC-11), not a stub to configure."""
    def fail(*args, **kwargs):
        raise AssertionError("merge must never create a Jira issue")

    monkeypatch.setattr(jira_client, "create_issue", fail)


def make_task(db_session, project_id=1, **kw) -> Task:
    task = Task(project_id=project_id, title=kw.pop("title", "Fix login"), **kw)
    db_session.add(task)
    db_session.commit()
    return task


def test_merge_comments_on_the_target_ticket_and_creates_nothing(
    client, db_session, jira_ready, no_issue_creation, monkeypatch
):
    comments = []
    monkeypatch.setattr(
        jira_client, "add_comment",
        lambda base, email, tok, key, text: comments.append((key, text)),
    )
    meeting = Meeting(project_id=1, title="Sprint 2", source_filename="m.mp4", media_path="/x")
    db_session.add(meeting)
    db_session.commit()
    target = make_task(db_session, title="Fix login", status=TaskStatus.APPROVED, jira_issue_key="CRM-42")
    draft = make_task(
        db_session, title="Fix login again", description="same bug",
        meeting_id=meeting.id, source_timestamp=90.0,
    )

    resp = client.post(f"/api/tasks/{draft.id}/merge", json={"target_task_id": target.id})

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "merged"
    assert body["duplicate_of_task_id"] == target.id
    assert len(comments) == 1
    key, text = comments[0]
    assert key == "CRM-42"
    assert "Fix login again" in text and "same bug" in text
    assert "Sprint 2" in text and "01:30" in text  # provenance: which meeting, which second
    db_session.refresh(target)
    assert target.status == TaskStatus.APPROVED  # the target is not touched


def test_merge_into_a_target_without_a_ticket_is_local_only(
    client, db_session, jira_ready, no_issue_creation, monkeypatch
):
    def fail(*args, **kwargs):
        raise AssertionError("no ticket on the target — nothing to comment on")

    monkeypatch.setattr(jira_client, "add_comment", fail)
    target = make_task(db_session, title="Fix login", status=TaskStatus.APPROVED)
    draft = make_task(db_session, title="Fix login again")

    resp = client.post(f"/api/tasks/{draft.id}/merge", json={"target_task_id": target.id})

    assert resp.status_code == 200
    assert resp.json()["status"] == "merged"
    assert resp.json()["duplicate_of_task_id"] == target.id


def test_failed_comment_returns_502_and_leaves_the_draft_intact(
    client, db_session, jira_ready, no_issue_creation, monkeypatch
):
    def boom(*args, **kwargs):
        raise jira_client.JiraError("Jira comment 403: forbidden")

    monkeypatch.setattr(jira_client, "add_comment", boom)
    target = make_task(db_session, status=TaskStatus.APPROVED, jira_issue_key="CRM-42")
    draft = make_task(db_session, title="Fix login again")

    resp = client.post(f"/api/tasks/{draft.id}/merge", json={"target_task_id": target.id})

    assert resp.status_code == 502
    assert "403" in resp.json()["detail"]
    db_session.refresh(draft)
    assert draft.status == TaskStatus.DRAFT  # retry or approve is still open to the user
    assert draft.duplicate_of_task_id is None


def test_merge_unknown_task_and_target_404(client, db_session):
    target = make_task(db_session)
    assert client.post("/api/tasks/9999/merge", json={"target_task_id": target.id}).status_code == 404
    assert client.post(f"/api/tasks/{target.id}/merge", json={"target_task_id": 9999}).status_code == 404


def test_merge_rejects_non_draft_source(client, db_session):
    target = make_task(db_session, status=TaskStatus.APPROVED)
    approved = make_task(db_session, title="Other", status=TaskStatus.APPROVED)
    resp = client.post(f"/api/tasks/{approved.id}/merge", json={"target_task_id": target.id})
    assert resp.status_code == 409 and "draft" in resp.json()["detail"]


def test_merge_rejects_self_foreign_project_and_dead_targets(client, db_session):
    draft = make_task(db_session)
    assert client.post(
        f"/api/tasks/{draft.id}/merge", json={"target_task_id": draft.id}
    ).status_code == 409

    other = Project(name="Other", llm_provider="lmstudio", llm_model="m")
    db_session.add(other)
    db_session.commit()
    foreign = make_task(db_session, project_id=other.id)
    assert client.post(
        f"/api/tasks/{draft.id}/merge", json={"target_task_id": foreign.id}
    ).status_code == 409

    for dead in (TaskStatus.REJECTED, TaskStatus.MERGED):
        target = make_task(db_session, title=f"dead {dead}", status=dead)
        resp = client.post(f"/api/tasks/{draft.id}/merge", json={"target_task_id": target.id})
        assert resp.status_code == 409 and dead.value in resp.json()["detail"]


def test_merged_is_terminal_for_patch_and_jira_push(client, db_session):
    draft = make_task(db_session)
    merged = make_task(db_session, title="Already merged", status=TaskStatus.MERGED)

    # No transition leads INTO merged: the merge endpoint is the only door.
    assert client.patch(f"/api/tasks/{draft.id}", json={"status": "merged"}).status_code == 409
    # And none leads out of it.
    assert client.patch(f"/api/tasks/{merged.id}", json={"status": "draft"}).status_code == 409
    resp = client.post(f"/api/tasks/{merged.id}/jira-push")
    assert resp.status_code == 409 and "merged" in resp.json()["detail"]


def test_merge_comment_text_is_a_pure_builder(db_session):
    """No DB, no network: what the user will see in the ticket is testable on its own."""
    meeting = Meeting(project_id=1, title="Sprint 2", source_filename="m.mp4", media_path="/x")
    db_session.add(meeting)
    db_session.commit()
    task = make_task(
        db_session, title="Fix login again", description="same bug",
        meeting_id=meeting.id, source_timestamp=125.0,
    )
    db_session.refresh(task)

    text = jira_service.merge_comment_text(task)

    assert text.startswith("Duplicate discussed again in Nytka")
    assert "Task: Fix login again" in text
    assert "Source: meeting «Sprint 2», video 02:05" in text

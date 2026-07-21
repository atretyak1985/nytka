import io
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app.core.config import settings
from app.db.models import KnowledgeStatus, Project


def upload(client, project_id=1, filename="notes.txt", content=b"hello world"):
    return client.post(
        f"/api/projects/{project_id}/knowledge",
        files={"file": (filename, io.BytesIO(content), "text/plain")},
    )


def test_upload_creates_file_and_appears_in_state(client):
    resp = upload(client, filename="glossary.md", content=b"# terms")
    assert resp.status_code == 201
    body = resp.json()
    assert body["filename"] == "glossary.md"
    assert body["kind"] == "text"
    assert body["size_bytes"] == len(b"# terms")

    state = client.get("/api/projects/1/knowledge").json()
    assert state["knowledge_status"] == "empty"
    assert len(state["files"]) == 1
    assert state["files"][0]["id"] == body["id"]


def test_upload_rejects_bad_extension(client):
    resp = upload(client, filename="report.docx")
    assert resp.status_code == 422


def test_upload_to_missing_project_404(client):
    assert upload(client, project_id=999).status_code == 404


def test_delete_file_removes_row_and_disk(client):
    before = set(settings.knowledge_dir.glob("*")) if settings.knowledge_dir.exists() else set()
    file_id = upload(client).json()["id"]
    added = (set(settings.knowledge_dir.glob("*")) - before)
    assert added

    assert client.delete(f"/api/projects/1/knowledge/{file_id}").status_code == 204
    state = client.get("/api/projects/1/knowledge").json()
    assert state["files"] == []
    remaining = set(settings.knowledge_dir.glob("*")) if settings.knowledge_dir.exists() else set()
    assert added.isdisjoint(remaining)


def test_delete_missing_file_404(client):
    assert client.delete("/api/projects/1/knowledge/12345").status_code == 404


def test_init_requires_a_source(client):
    resp = client.post("/api/projects/1/knowledge/init")
    assert resp.status_code == 400


def test_init_enqueues_and_sets_processing(client, db_session):
    upload(client, content=b"some project description text")
    with patch("app.api.knowledge.run_distill") as mock_run:
        resp = client.post("/api/projects/1/knowledge/init")
    assert resp.status_code == 200
    assert resp.json()["knowledge_status"] == "processing"
    mock_run.assert_called_once_with(1)


def test_init_conflict_when_already_processing(client, db_session):
    project = db_session.get(Project, 1)
    project.knowledge_status = KnowledgeStatus.PROCESSING
    db_session.commit()
    assert client.post("/api/projects/1/knowledge/init").status_code == 409


def test_upload_marks_brief_stale(client, db_session):
    project = db_session.get(Project, 1)
    project.knowledge_status = KnowledgeStatus.READY
    project.knowledge_brief = "old brief"
    project.knowledge_generated_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=1)
    db_session.commit()

    assert client.get("/api/projects/1/knowledge").json()["knowledge_stale"] is False
    upload(client, content=b"new source material")
    assert client.get("/api/projects/1/knowledge").json()["knowledge_stale"] is True

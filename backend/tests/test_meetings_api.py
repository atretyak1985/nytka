import io
from unittest.mock import patch


def upload(client, filename="standup.mp4"):
    return client.post(
        "/api/meetings",
        files={"file": (filename, io.BytesIO(b"fake-video-bytes"), "video/mp4")},
        data={"title": "Daily standup"},
    )


def test_upload_creates_queued_meeting(client):
    with patch("app.api.meetings.run_pipeline") as mock_run:
        resp = upload(client)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "queued"
    assert body["title"] == "Daily standup"
    mock_run.assert_called_once_with(body["id"])


def test_upload_rejects_bad_extension(client):
    resp = upload(client, filename="notes.txt")
    assert resp.status_code == 422


def test_list_and_detail(client):
    with patch("app.api.meetings.run_pipeline"):
        meeting_id = upload(client).json()["id"]
    assert any(m["id"] == meeting_id for m in client.get("/api/meetings").json())
    detail = client.get(f"/api/meetings/{meeting_id}").json()
    assert detail["segments"] == [] and detail["tasks"] == []


def test_detail_404(client):
    assert client.get("/api/meetings/999").status_code == 404


def test_retry_only_from_error(client):
    with patch("app.api.meetings.run_pipeline"):
        meeting_id = upload(client).json()["id"]
    # queued meeting cannot be retried
    assert client.post(f"/api/meetings/{meeting_id}/retry").status_code == 409


def test_delete_meeting_removes_row_and_file(client):
    from app.core.config import settings

    before = set(settings.media_dir.glob("*")) if settings.media_dir.exists() else set()
    with patch("app.api.meetings.run_pipeline"):
        meeting_id = upload(client).json()["id"]
    added = (set(settings.media_dir.glob("*")) - before)
    assert added  # this upload wrote a media file to disk

    assert client.delete(f"/api/meetings/{meeting_id}").status_code == 204
    assert client.get(f"/api/meetings/{meeting_id}").status_code == 404
    remaining = set(settings.media_dir.glob("*")) if settings.media_dir.exists() else set()
    assert added.isdisjoint(remaining)  # this meeting's media file was removed


def test_delete_meeting_404(client):
    assert client.delete("/api/meetings/999").status_code == 404


def test_get_meeting_media_streams_file(client):
    with patch("app.api.meetings.run_pipeline"):
        meeting_id = upload(client).json()["id"]
    resp = client.get(f"/api/meetings/{meeting_id}/media")
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("video/")
    assert resp.content == b"fake-video-bytes"


def test_get_meeting_media_404(client):
    assert client.get("/api/meetings/999/media").status_code == 404


def test_upload_rejects_oversized_file(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "max_upload_mb", 0)
    before = set(settings.media_dir.glob("*")) if settings.media_dir.exists() else set()
    resp = upload(client)
    assert resp.status_code == 413
    after = set(settings.media_dir.glob("*")) if settings.media_dir.exists() else set()
    assert after == before  # partial file cleaned up

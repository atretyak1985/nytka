"""API tests for the per-task screenshot endpoints (list / image / delete)."""
from pathlib import Path

from app.core.config import settings
from app.db.models import Project, Task, TaskScreenshot

JPEG_STUB = b"\xff\xd8\xff\xe0jpegstub"


def make_task_with_screenshots(db_session, count=2, **task_kw):
    """Task + N TaskScreenshot rows backed by real stub JPEGs on disk.

    Rows are inserted in REVERSE position order so the list endpoint's
    ordering (relationship order_by position) is genuinely exercised.
    """
    project = db_session.query(Project).first()
    task = Task(project_id=project.id, title=task_kw.pop("title", "Fix login"), **task_kw)
    db_session.add(task)
    db_session.commit()
    for position in reversed(range(count)):
        path = settings.screenshots_dir / str(task.id) / f"frame_{position}.jpg"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(JPEG_STUB)
        db_session.add(
            TaskScreenshot(task_id=task.id, path=str(path), t_sec=float(position * 10), position=position)
        )
    db_session.commit()
    return task


def test_list_returns_rows_ordered_by_position_without_path(client, db_session):
    task = make_task_with_screenshots(db_session, count=3)
    resp = client.get(f"/api/tasks/{task.id}/screenshots")
    assert resp.status_code == 200
    body = resp.json()
    assert [s["position"] for s in body] == [0, 1, 2]
    assert all(s["task_id"] == task.id for s in body)
    assert all("path" not in s for s in body)


def test_list_empty_for_task_without_screenshots(client, db_session):
    task = make_task_with_screenshots(db_session, count=0)
    assert client.get(f"/api/tasks/{task.id}/screenshots").json() == []


def test_list_missing_task_404(client):
    assert client.get("/api/tasks/999/screenshots").status_code == 404


def test_get_image_streams_stub_jpeg(client, db_session):
    task = make_task_with_screenshots(db_session, count=1)
    shot_id = client.get(f"/api/tasks/{task.id}/screenshots").json()[0]["id"]
    resp = client.get(f"/api/tasks/{task.id}/screenshots/{shot_id}/image")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/jpeg"
    assert resp.content == JPEG_STUB


def test_get_image_404_when_file_gone_from_disk(client, db_session):
    task = make_task_with_screenshots(db_session, count=1)
    shot = task.screenshots[0]
    Path(shot.path).unlink()
    assert client.get(f"/api/tasks/{task.id}/screenshots/{shot.id}/image").status_code == 404


def test_image_and_delete_404_for_other_tasks_screenshot(client, db_session):
    task_a = make_task_with_screenshots(db_session, count=1)
    task_b = make_task_with_screenshots(db_session, count=1, title="Other")
    shot_a_id = task_a.screenshots[0].id
    assert client.get(f"/api/tasks/{task_b.id}/screenshots/{shot_a_id}/image").status_code == 404
    assert client.delete(f"/api/tasks/{task_b.id}/screenshots/{shot_a_id}").status_code == 404
    # and the row survived the failed cross-task delete
    assert Path(task_a.screenshots[0].path).exists()


def test_delete_removes_row_and_file_then_404(client, db_session):
    task = make_task_with_screenshots(db_session, count=2)
    shot = task.screenshots[0]
    shot_id, shot_path = shot.id, Path(shot.path)
    assert client.delete(f"/api/tasks/{task.id}/screenshots/{shot_id}").status_code == 204
    assert not shot_path.exists()
    db_session.expire_all()  # fixtures share one session; drop the cached relationship
    remaining = client.get(f"/api/tasks/{task.id}/screenshots").json()
    assert len(remaining) == 1
    assert shot_id not in [s["id"] for s in remaining]
    assert client.delete(f"/api/tasks/{task.id}/screenshots/{shot_id}").status_code == 404

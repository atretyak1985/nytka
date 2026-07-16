def make_task(client, **overrides):
    payload = {"title": "Design login form", "project_id": 1} | overrides
    return client.post("/api/tasks", json=payload)


def test_create_manual_task_is_draft(client):
    resp = make_task(client)
    assert resp.status_code == 201
    assert resp.json()["status"] == "draft"
    assert resp.json()["meeting_id"] is None


def test_list_filter_by_status(client):
    make_task(client)
    task_id = make_task(client, title="Second").json()["id"]
    client.patch(f"/api/tasks/{task_id}", json={"status": "approved"})
    drafts = client.get("/api/tasks?status=draft").json()
    assert all(t["status"] == "draft" for t in drafts) and len(drafts) == 1


def test_patch_edits_fields(client):
    task_id = make_task(client).json()["id"]
    resp = client.patch(f"/api/tasks/{task_id}", json={"title": "New title", "assignee": "Ivan", "priority": "high"})
    body = resp.json()
    assert (body["title"], body["assignee"], body["priority"]) == ("New title", "Ivan", "high")


def test_illegal_transition_409(client):
    task_id = make_task(client).json()["id"]
    resp = client.patch(f"/api/tasks/{task_id}", json={"status": "done"})  # draft -> done forbidden
    assert resp.status_code == 409


def test_patch_null_title_422(client):
    task_id = make_task(client).json()["id"]
    resp = client.patch(f"/api/tasks/{task_id}", json={"title": None})
    assert resp.status_code == 422


def test_create_task_unknown_project_404(client):
    resp = make_task(client, project_id=999)
    assert resp.status_code == 404


def test_delete(client):
    task_id = make_task(client).json()["id"]
    assert client.delete(f"/api/tasks/{task_id}").status_code == 204
    assert client.get("/api/tasks").json() == []

from unittest.mock import MagicMock, patch


def test_list_projects_has_default(client):
    projects = client.get("/api/projects").json()
    project = projects[0]
    assert project["name"] == "My Project"
    assert "llm_api_key" not in project  # never leak secrets
    # design fields come back with sane defaults
    assert project["color"] == "#7a0d38"
    assert project["description"] == ""
    assert project["ai_context"] == ""
    assert project["task_prefix"] == ""
    assert project["task_format"] == ""
    assert project["glossary"] == []
    assert project["team"] == []
    assert project["jira_enabled"] is False
    assert project["jira_key"] == ""
    assert project["created_at"] is not None
    assert project["updated_at"] is not None


def test_create_project(client):
    resp = client.post("/api/projects", json={"name": "CRM Redesign", "description": "Client CRM revamp", "color": "#123456"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "CRM Redesign"
    assert body["description"] == "Client CRM revamp"
    assert body["color"] == "#123456"
    assert body["glossary"] == [] and body["team"] == []
    assert body["llm_provider"] == "lmstudio"  # untouched fields keep model defaults
    assert "llm_api_key" not in body
    assert any(p["id"] == body["id"] for p in client.get("/api/projects").json())


def test_create_project_requires_name(client):
    assert client.post("/api/projects", json={"description": "no name"}).status_code == 422


def test_patch_llm_config(client):
    project_id = client.get("/api/projects").json()[0]["id"]
    resp = client.patch(f"/api/projects/{project_id}", json={"llm_provider": "ollama", "llm_base_url": "http://localhost:11434/v1", "llm_model": "llama3"})
    assert resp.json()["llm_provider"] == "ollama"


def test_patch_design_fields(client):
    project_id = client.get("/api/projects").json()[0]["id"]
    payload = {
        "color": "#00aa55",
        "ai_context": "Meetings are about the CRM module",
        "task_prefix": "CRM",
        "task_format": "As a user, I want ...",
        "glossary": ["MRR", "churn"],
        "team": [{"name": "Alice", "role": "PM"}, {"name": "Bob", "role": "QA"}],
        "jira_enabled": True,
        "jira_key": "CRM",
    }
    body = client.patch(f"/api/projects/{project_id}", json=payload).json()
    assert body["color"] == "#00aa55"
    assert body["ai_context"] == "Meetings are about the CRM module"
    assert body["task_prefix"] == "CRM"
    assert body["task_format"] == "As a user, I want ..."
    assert body["glossary"] == ["MRR", "churn"]
    assert body["team"] == [{"name": "Alice", "role": "PM"}, {"name": "Bob", "role": "QA"}]
    assert body["jira_enabled"] is True
    assert body["jira_key"] == "CRM"
    # persisted, not just echoed
    again = client.get("/api/projects").json()[0]
    assert again["team"] == payload["team"] and again["glossary"] == payload["glossary"]


def test_patch_rejects_null_for_non_nullable_design_fields(client):
    project_id = client.get("/api/projects").json()[0]["id"]
    assert client.patch(f"/api/projects/{project_id}", json={"color": None}).status_code == 422
    assert client.patch(f"/api/projects/{project_id}", json={"glossary": None}).status_code == 422


def test_llm_test_ok(client):
    project_id = client.get("/api/projects").json()[0]["id"]
    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = MagicMock()
    with patch("app.api.projects.get_client", return_value=fake_client):
        resp = client.post(f"/api/projects/{project_id}/llm-test")
    assert resp.json() == {"ok": True, "error": None}


def test_llm_test_failure_reported(client):
    project_id = client.get("/api/projects").json()[0]["id"]
    fake_client = MagicMock()
    fake_client.chat.completions.create.side_effect = RuntimeError("connection refused")
    with patch("app.api.projects.get_client", return_value=fake_client):
        resp = client.post(f"/api/projects/{project_id}/llm-test")
    assert resp.json()["ok"] is False and "connection refused" in resp.json()["error"]

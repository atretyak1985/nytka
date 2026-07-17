from unittest.mock import MagicMock, patch

import httpx


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


def _models_response(model_ids: list[str]) -> MagicMock:
    """Fake httpx.Response for LM Studio's GET /v1/models."""
    response = MagicMock()
    response.raise_for_status.return_value = None
    response.json.return_value = {"object": "list", "data": [{"id": m, "object": "model"} for m in model_ids]}
    return response


def test_llm_connect_detects_models(client):
    project_id = client.get("/api/projects").json()[0]["id"]
    fake = _models_response(["qwen2.5-7b-instruct", "llama-3.1-8b"])
    with patch("app.api.projects.httpx.get", return_value=fake) as mock_get:
        body = client.post(f"/api/projects/{project_id}/llm-connect").json()
    assert body == {
        "ok": True,
        "models": ["qwen2.5-7b-instruct", "llama-3.1-8b"],
        "model": "qwen2.5-7b-instruct",
        "error": None,
    }
    # default project base URL is the IPv4 loopback LM Studio endpoint
    mock_get.assert_called_once_with("http://127.0.0.1:1234/v1/models", timeout=4.0, headers=None)


def test_llm_connect_appends_v1_to_bare_base_url(client):
    project_id = client.get("/api/projects").json()[0]["id"]
    client.patch(f"/api/projects/{project_id}", json={"llm_base_url": "http://127.0.0.1:1234"})
    with patch("app.api.projects.httpx.get", return_value=_models_response(["m"])) as mock_get:
        client.post(f"/api/projects/{project_id}/llm-connect")
    assert mock_get.call_args.args[0] == "http://127.0.0.1:1234/v1/models"


def test_llm_connect_reachable_but_no_model_loaded(client):
    project_id = client.get("/api/projects").json()[0]["id"]
    with patch("app.api.projects.httpx.get", return_value=_models_response([])):
        body = client.post(f"/api/projects/{project_id}/llm-connect").json()
    assert body["ok"] is True and body["models"] == [] and body["model"] is None


def test_llm_connect_failure_reported(client):
    project_id = client.get("/api/projects").json()[0]["id"]
    with patch("app.api.projects.httpx.get", side_effect=httpx.ConnectError("All connection attempts failed")):
        body = client.post(f"/api/projects/{project_id}/llm-connect").json()
    assert body["ok"] is False and "connection attempts" in body["error"] and body["models"] == []


def test_llm_connect_rejects_cloud_provider(client):
    project_id = client.get("/api/projects").json()[0]["id"]
    client.patch(f"/api/projects/{project_id}", json={"llm_provider": "anthropic"})
    with patch("app.api.projects.httpx.get") as mock_get:
        body = client.post(f"/api/projects/{project_id}/llm-connect").json()
    assert body["ok"] is False and "local providers" in body["error"]
    mock_get.assert_not_called()


def test_llm_connect_redacts_api_key(client):
    project_id = client.get("/api/projects").json()[0]["id"]
    client.patch(f"/api/projects/{project_id}", json={"llm_api_key": "sk-secret-123"})
    with patch("app.api.projects.httpx.get", side_effect=RuntimeError("boom sk-secret-123")):
        body = client.post(f"/api/projects/{project_id}/llm-connect").json()
    assert body["ok"] is False
    assert "sk-secret-123" not in body["error"] and "[REDACTED]" in body["error"]


def test_llm_connect_missing_project_404(client):
    assert client.post("/api/projects/99999/llm-connect").status_code == 404

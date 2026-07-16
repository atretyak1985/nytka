from unittest.mock import MagicMock, patch


def test_list_projects_has_default(client):
    projects = client.get("/api/projects").json()
    assert projects[0]["name"] == "My Project"
    assert "llm_api_key" not in projects[0]  # never leak secrets


def test_patch_llm_config(client):
    project_id = client.get("/api/projects").json()[0]["id"]
    resp = client.patch(f"/api/projects/{project_id}", json={"llm_provider": "ollama", "llm_base_url": "http://localhost:11434/v1", "llm_model": "llama3"})
    assert resp.json()["llm_provider"] == "ollama"


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

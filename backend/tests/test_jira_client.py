"""Unit tests for the Jira HTTP client. All HTTP is stubbed via httpx.MockTransport."""
import httpx
import pytest

from app.jira import client as jira_client


def make_transport(handler):
    return httpx.MockTransport(handler)


def patch_client(monkeypatch, handler):
    """Route all client calls through a MockTransport."""
    original = jira_client._client

    def fake_client(base_url, email, token):
        c = original(base_url, email, token)
        return httpx.Client(
            base_url=c.base_url, auth=(email, token), timeout=5.0, transport=make_transport(handler)
        )

    monkeypatch.setattr(jira_client, "_client", fake_client)


def test_text_to_adf_paragraphs():
    adf = jira_client.text_to_adf("first\n\nsecond")
    assert adf["type"] == "doc" and adf["version"] == 1
    texts = [p["content"][0]["text"] for p in adf["content"]]
    assert texts == ["first", "second"]


def test_text_to_adf_empty_text_yields_one_empty_paragraph():
    adf = jira_client.text_to_adf("")
    assert len(adf["content"]) == 1
    assert adf["content"][0]["content"] == []


def test_connection_ok(monkeypatch):
    def handler(request):
        assert request.url.path == "/rest/api/3/myself"
        return httpx.Response(200, json={"displayName": "Andrii T"})

    patch_client(monkeypatch, handler)
    result = jira_client.test_connection("https://acme.atlassian.net", "a@b.c", "tok")
    assert result == {"ok": True, "account_name": "Andrii T"}


def test_connection_bad_auth(monkeypatch):
    patch_client(monkeypatch, lambda request: httpx.Response(401, json={}))
    result = jira_client.test_connection("https://acme.atlassian.net", "a@b.c", "bad")
    assert result["ok"] is False and "Authentication" in result["error"]


def test_connection_network_error(monkeypatch):
    def handler(request):
        raise httpx.ConnectError("boom")

    patch_client(monkeypatch, handler)
    result = jira_client.test_connection("https://acme.atlassian.net", "a@b.c", "tok")
    assert result["ok"] is False and result["error"]


def test_find_user_first_match(monkeypatch):
    def handler(request):
        assert request.url.path == "/rest/api/3/user/search"
        return httpx.Response(200, json=[{"accountId": "acc-1", "displayName": "Ivan P"}])

    patch_client(monkeypatch, handler)
    user = jira_client.find_user("https://acme.atlassian.net", "a@b.c", "tok", "Ivan")
    assert user == {"account_id": "acc-1", "display_name": "Ivan P"}


def test_find_user_no_match(monkeypatch):
    patch_client(monkeypatch, lambda request: httpx.Response(200, json=[]))
    assert jira_client.find_user("https://acme.atlassian.net", "a@b.c", "tok", "Nobody") is None


def test_create_issue_returns_key(monkeypatch):
    def handler(request):
        assert request.url.path == "/rest/api/3/issue"
        return httpx.Response(201, json={"key": "CRM-42"})

    patch_client(monkeypatch, handler)
    key = jira_client.create_issue(
        "https://acme.atlassian.net", "a@b.c", "tok",
        {"project": {"key": "CRM"}, "summary": "S", "issuetype": {"name": "Task"}},
    )
    assert key == "CRM-42"


def test_create_issue_retries_minimal_payload_on_400(monkeypatch):
    calls = []

    def handler(request):
        calls.append(request.read())
        if len(calls) == 1:
            return httpx.Response(400, json={"errors": {"priority": "Field 'priority' cannot be set"}})
        return httpx.Response(201, json={"key": "CRM-43"})

    patch_client(monkeypatch, handler)
    key = jira_client.create_issue(
        "https://acme.atlassian.net", "a@b.c", "tok",
        {
            "project": {"key": "CRM"}, "summary": "S", "issuetype": {"name": "Task"},
            "description": jira_client.text_to_adf("d"), "priority": {"name": "High"},
            "assignee": {"accountId": "acc-1"},
        },
    )
    assert key == "CRM-43"
    assert len(calls) == 2
    assert b"priority" not in calls[1]


def test_create_issue_raises_jira_error_on_failure(monkeypatch):
    patch_client(monkeypatch, lambda request: httpx.Response(500, text="oops"))
    with pytest.raises(jira_client.JiraError):
        jira_client.create_issue(
            "https://acme.atlassian.net", "a@b.c", "tok",
            {"project": {"key": "CRM"}, "summary": "S", "issuetype": {"name": "Task"}},
        )

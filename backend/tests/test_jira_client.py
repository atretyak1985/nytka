"""Unit tests for the Jira HTTP client. All HTTP is stubbed via httpx.MockTransport."""
import json

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


def test_find_user_malformed_payload_missing_account_id(monkeypatch):
    patch_client(monkeypatch, lambda request: httpx.Response(200, json=[{"displayName": "No Id"}]))
    assert jira_client.find_user("https://acme.atlassian.net", "a@b.c", "tok", "X") is None


def test_find_user_non_list_payload(monkeypatch):
    patch_client(monkeypatch, lambda request: httpx.Response(200, json={"unexpected": "shape"}))
    assert jira_client.find_user("https://acme.atlassian.net", "a@b.c", "tok", "X") is None


def test_create_issue_returns_key(monkeypatch):
    def handler(request):
        assert request.url.path == "/rest/api/3/issue"
        return httpx.Response(201, json={"key": "CRM-42"})

    patch_client(monkeypatch, handler)
    key, dropped = jira_client.create_issue(
        "https://acme.atlassian.net", "a@b.c", "tok",
        {"project": {"key": "CRM"}, "summary": "S", "issuetype": {"name": "Task"}},
    )
    assert key == "CRM-42"
    assert dropped == []


def test_create_issue_retries_minimal_payload_on_400(monkeypatch):
    calls = []

    def handler(request):
        calls.append(request.read())
        if len(calls) == 1:
            return httpx.Response(400, json={"errors": {"priority": "Field 'priority' cannot be set"}})
        return httpx.Response(201, json={"key": "CRM-43"})

    patch_client(monkeypatch, handler)
    key, dropped = jira_client.create_issue(
        "https://acme.atlassian.net", "a@b.c", "tok",
        {
            "project": {"key": "CRM"}, "summary": "S", "issuetype": {"name": "Task"},
            "description": jira_client.text_to_adf("d"), "priority": {"name": "High"},
            "assignee": {"accountId": "acc-1"},
        },
    )
    assert key == "CRM-43"
    assert dropped == ["assignee", "priority"]
    assert len(calls) == 2
    assert b"priority" not in calls[1]


def test_create_issue_raises_jira_error_on_failure(monkeypatch):
    patch_client(monkeypatch, lambda request: httpx.Response(500, text="oops"))
    with pytest.raises(jira_client.JiraError):
        jira_client.create_issue(
            "https://acme.atlassian.net", "a@b.c", "tok",
            {"project": {"key": "CRM"}, "summary": "S", "issuetype": {"name": "Task"}},
        )


def test_text_to_adf_drops_trailing_empty_paragraphs():
    adf = jira_client.text_to_adf("only\n\n\n")
    texts = [p["content"][0]["text"] for p in adf["content"]]
    assert texts == ["only"]


def test_create_issue_400_already_minimal_does_not_retry(monkeypatch):
    calls = []

    def handler(request):
        calls.append(request.read())
        return httpx.Response(400, json={"errors": {"project": "bad"}})

    patch_client(monkeypatch, handler)
    with pytest.raises(jira_client.JiraError):
        jira_client.create_issue(
            "https://acme.atlassian.net", "a@b.c", "tok",
            {"project": {"key": "CRM"}, "summary": "S", "issuetype": {"name": "Task"}},
        )
    assert len(calls) == 1  # no retry when already minimal


def test_create_issue_translates_network_error_to_jira_error(monkeypatch):
    def handler(request):
        raise httpx.ConnectError("boom")

    patch_client(monkeypatch, handler)
    with pytest.raises(jira_client.JiraError):
        jira_client.create_issue(
            "https://acme.atlassian.net", "a@b.c", "tok",
            {"project": {"key": "CRM"}, "summary": "S", "issuetype": {"name": "Task"}},
        )


# ---------------------------------------------------------------------------
# add_attachments
# ---------------------------------------------------------------------------

def test_add_attachments_posts_multipart_with_no_check_header(monkeypatch, tmp_path):
    (tmp_path / "frame_0.jpg").write_bytes(b"\xff\xd8one")
    (tmp_path / "frame_1.jpg").write_bytes(b"\xff\xd8two")
    captured = {}

    def handler(request):
        captured["path"] = request.url.path
        captured["token_header"] = request.headers.get("X-Atlassian-Token")
        captured["body"] = request.read()
        return httpx.Response(200, json=[{"filename": "frame_0.jpg"}, {"filename": "frame_1.jpg"}])

    patch_client(monkeypatch, handler)
    names = jira_client.add_attachments(
        "https://acme.atlassian.net", "a@b.c", "tok", "CRM-42",
        [tmp_path / "frame_0.jpg", tmp_path / "frame_1.jpg"],
    )
    assert names == ["frame_0.jpg", "frame_1.jpg"]
    assert captured["path"] == "/rest/api/3/issue/CRM-42/attachments"
    assert captured["token_header"] == "no-check"
    assert b"frame_0.jpg" in captured["body"] and b"frame_1.jpg" in captured["body"]


def test_add_attachments_non_200_raises_jira_error(monkeypatch, tmp_path):
    (tmp_path / "f.jpg").write_bytes(b"\xff\xd8x")
    patch_client(monkeypatch, lambda request: httpx.Response(413, text="Request entity too large"))
    with pytest.raises(jira_client.JiraError):
        jira_client.add_attachments(
            "https://acme.atlassian.net", "a@b.c", "tok", "CRM-42", [tmp_path / "f.jpg"]
        )


def test_add_attachments_transport_error_raises_jira_error(monkeypatch, tmp_path):
    (tmp_path / "f.jpg").write_bytes(b"\xff\xd8x")

    def handler(request):
        raise httpx.ConnectError("boom")

    patch_client(monkeypatch, handler)
    with pytest.raises(jira_client.JiraError):
        jira_client.add_attachments(
            "https://acme.atlassian.net", "a@b.c", "tok", "CRM-42", [tmp_path / "f.jpg"]
        )


def test_add_attachments_empty_list_returns_empty_without_http(monkeypatch):
    def handler(request):
        raise AssertionError("no HTTP call expected for an empty paths list")

    patch_client(monkeypatch, handler)
    assert jira_client.add_attachments("https://acme.atlassian.net", "a@b.c", "tok", "CRM-42", []) == []


def test_list_assignable_users_filters_apps_and_maps_fields(monkeypatch):
    def handler(request):
        assert request.url.path == "/rest/api/3/user/assignable/search"
        assert request.url.params["project"] == "CRM"
        return httpx.Response(200, json=[
            {"accountId": "acc-1", "displayName": "Ivan P", "accountType": "atlassian"},
            {"accountId": "acc-bot", "displayName": "Automation", "accountType": "app"},
            {"displayName": "No Id"},
            {"accountId": "acc-2", "displayName": "Olena K"},
        ])

    patch_client(monkeypatch, handler)
    users = jira_client.list_assignable_users("https://acme.atlassian.net", "a@b.c", "tok", "CRM")
    assert users == [
        {"account_id": "acc-1", "display_name": "Ivan P"},
        {"account_id": "acc-2", "display_name": "Olena K"},
    ]


def test_list_assignable_users_error_returns_none(monkeypatch):
    def handler(request):
        raise httpx.ConnectError("boom")

    patch_client(monkeypatch, handler)
    assert jira_client.list_assignable_users("https://acme.atlassian.net", "a@b.c", "tok", "CRM") is None


def test_list_assignable_users_non_list_payload_returns_none(monkeypatch):
    patch_client(monkeypatch, lambda request: httpx.Response(200, json={"unexpected": "shape"}))
    assert jira_client.list_assignable_users("https://acme.atlassian.net", "a@b.c", "tok", "CRM") is None


def test_add_comment_posts_adf_body(monkeypatch):
    seen = {}

    def handler(request):
        seen["path"] = request.url.path
        seen["body"] = json.loads(request.read())
        return httpx.Response(201, json={"id": "10001"})

    patch_client(monkeypatch, handler)
    jira_client.add_comment("https://acme.atlassian.net", "a@b.c", "tok", "CRM-42", "line\n\nother")

    assert seen["path"] == "/rest/api/3/issue/CRM-42/comment"
    assert seen["body"]["body"]["type"] == "doc"
    assert [p["content"][0]["text"] for p in seen["body"]["body"]["content"]] == ["line", "other"]


def test_add_comment_raises_jira_error_on_non_201(monkeypatch):
    patch_client(monkeypatch, lambda request: httpx.Response(404, text="No such issue"))
    with pytest.raises(jira_client.JiraError, match="404"):
        jira_client.add_comment("https://acme.atlassian.net", "a@b.c", "tok", "CRM-9", "x")


def test_add_comment_translates_network_error_to_jira_error(monkeypatch):
    def handler(request):
        raise httpx.ConnectError("boom")

    patch_client(monkeypatch, handler)
    with pytest.raises(jira_client.JiraError, match="ConnectError"):
        jira_client.add_comment("https://acme.atlassian.net", "a@b.c", "tok", "CRM-9", "x")

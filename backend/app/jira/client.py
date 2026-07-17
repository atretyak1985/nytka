"""Thin sync client for Jira Cloud REST API v3 (basic auth: email + API token).

No FastAPI imports here — plain functions over httpx so both the settings
probe and the push service share one HTTP layer.
"""
from __future__ import annotations

import httpx

TIMEOUT = 10.0
MINIMAL_FIELDS = {"project", "summary", "description", "issuetype"}


class JiraError(Exception):
    """Jira returned a non-success response after retries."""


def _client(base_url: str, email: str, token: str) -> httpx.Client:
    return httpx.Client(
        base_url=base_url.rstrip("/"),
        auth=(email, token),
        timeout=TIMEOUT,
        headers={"Accept": "application/json"},
    )


def text_to_adf(text: str) -> dict:
    """Plain text -> Atlassian Document Format; blank lines split paragraphs."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()] or [""]
    return {
        "type": "doc",
        "version": 1,
        "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": p}] if p else []}
            for p in paragraphs
        ],
    }


def test_connection(base_url: str, email: str, token: str) -> dict:
    """Probe GET /myself. Returns {ok, account_name?} or {ok: False, error}."""
    try:
        with _client(base_url, email, token) as c:
            resp = c.get("/rest/api/3/myself")
            if resp.status_code in (401, 403):
                return {"ok": False, "error": "Authentication failed — check email and API token"}
            resp.raise_for_status()
            return {"ok": True, "account_name": resp.json().get("displayName", "")}
    except httpx.HTTPError as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}


def find_user(base_url: str, email: str, token: str, query: str) -> dict | None:
    """Best-effort account lookup for the assignee. None on no match or any error."""
    try:
        with _client(base_url, email, token) as c:
            resp = c.get("/rest/api/3/user/search", params={"query": query})
            resp.raise_for_status()
            users = resp.json()
    except httpx.HTTPError:
        return None
    if not users:
        return None
    return {"account_id": users[0]["accountId"], "display_name": users[0].get("displayName", query)}


def create_issue(base_url: str, email: str, token: str, fields: dict) -> str:
    """POST /issue; on 400 (e.g. priority/assignee not on the create screen)
    retry once with the minimal field set. Returns the new issue key."""
    with _client(base_url, email, token) as c:
        resp = c.post("/rest/api/3/issue", json={"fields": fields})
        if resp.status_code == 400 and set(fields) - MINIMAL_FIELDS:
            minimal = {k: v for k, v in fields.items() if k in MINIMAL_FIELDS}
            resp = c.post("/rest/api/3/issue", json={"fields": minimal})
        if resp.status_code not in (200, 201):
            raise JiraError(f"Jira API {resp.status_code}: {resp.text[:500]}")
        return resp.json()["key"]

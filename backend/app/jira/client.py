"""Thin sync client for Jira Cloud REST API v3 (basic auth: email + API token).

No FastAPI imports here — plain functions over httpx so both the settings
probe and the push service share one HTTP layer.
"""
from __future__ import annotations

from pathlib import Path

import httpx

TIMEOUT = 10.0
ATTACH_TIMEOUT = 30.0  # multipart uploads need more than the 10s API timeout
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
    """Best-effort account lookup for the assignee. None on no match or any error
    (including a malformed 200 payload) — never raises, so it can't break an approve."""
    try:
        with _client(base_url, email, token) as c:
            resp = c.get("/rest/api/3/user/search", params={"query": query})
            resp.raise_for_status()
            users = resp.json()
        if not isinstance(users, list) or not users:
            return None
        first = users[0]
        return {"account_id": first["accountId"], "display_name": first.get("displayName", query)}
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return None


def list_assignable_users(base_url: str, email: str, token: str, project_key: str) -> list[dict] | None:
    """Users who can be assigned issues in the project, for the assignee picker.
    None on any error (transport, auth, malformed payload) — the caller reports it;
    app/bot accounts (accountType != "atlassian") are filtered out."""
    try:
        with _client(base_url, email, token) as c:
            resp = c.get(
                "/rest/api/3/user/assignable/search",
                params={"project": project_key, "maxResults": 100},
            )
            resp.raise_for_status()
            users = resp.json()
        if not isinstance(users, list):
            return None
        return [
            {"account_id": u["accountId"], "display_name": u.get("displayName", "")}
            for u in users
            if isinstance(u, dict) and "accountId" in u and u.get("accountType", "atlassian") == "atlassian"
        ]
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return None


def create_issue(base_url: str, email: str, token: str, fields: dict) -> tuple[str, list[str]]:
    """POST /issue; on 400 (e.g. priority/assignee/labels/sprint not on the create screen)
    retry once with the minimal field set. Returns (issue key, dropped field names) — dropped
    is non-empty when the minimal retry was used, so the caller can warn which conventions did
    not stick. Transport failures are translated to JiraError so callers handle one type."""
    try:
        with _client(base_url, email, token) as c:
            resp = c.post("/rest/api/3/issue", json={"fields": fields})
            dropped: list[str] = []
            if resp.status_code == 400 and set(fields) - MINIMAL_FIELDS:
                dropped = sorted(set(fields) - MINIMAL_FIELDS)
                minimal = {k: v for k, v in fields.items() if k in MINIMAL_FIELDS}
                resp = c.post("/rest/api/3/issue", json={"fields": minimal})
            if resp.status_code not in (200, 201):
                raise JiraError(f"Jira API {resp.status_code}: {resp.text[:500]}")
            return resp.json()["key"], dropped
    except httpx.HTTPError as e:
        raise JiraError(f"{type(e).__name__}: {e}") from e


def add_attachments(base_url: str, email: str, token: str, issue_key: str,
                    paths: list[Path]) -> list[str]:
    """Upload files to an issue. Returns the attachment filenames Jira confirmed.

    One multipart request for all files (the endpoint accepts multiple 'file'
    parts). X-Atlassian-Token: no-check is REQUIRED — Jira rejects the upload
    with 403 XSRF otherwise. Raises JiraError on any transport/API failure;
    the caller decides how to degrade."""
    files = [("file", (p.name, p.read_bytes(), "image/jpeg")) for p in paths]
    if not files:
        return []
    try:
        with _client(base_url, email, token) as c:
            resp = c.post(
                f"/rest/api/3/issue/{issue_key}/attachments",
                files=files,
                headers={"X-Atlassian-Token": "no-check"},
                timeout=ATTACH_TIMEOUT,
            )
            if resp.status_code != 200:
                raise JiraError(f"Jira attachments {resp.status_code}: {resp.text[:500]}")
            body = resp.json()
            return [a.get("filename", "") for a in body] if isinstance(body, list) else []
    except httpx.HTTPError as e:
        raise JiraError(f"{type(e).__name__}: {e}") from e

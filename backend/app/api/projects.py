from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.schemas import (
    JiraTestOut,
    JiraUserOut,
    JiraUsersOut,
    LlmConnectOut,
    LlmTestOut,
    ProjectCreateIn,
    ProjectOut,
    ProjectPatchIn,
)
from app.db.models import Project
from app.db.session import get_db
from app.jira import client as jira_client
from app.jira.service import get_credentials
from app.llm.client import get_client, model_and_kwargs, normalize_base_url

router = APIRouter(prefix="/api/projects", tags=["projects"])

LOCAL_PROVIDERS = ("lmstudio", "ollama")
LLM_CONNECT_TIMEOUT_S = 4.0

NON_NULLABLE_FIELDS = {
    "name",
    "color",
    "description",
    "ai_context",
    "task_prefix",
    "task_format",
    "task_language",
    "task_areas",
    "glossary",
    "team",
    "jira_enabled",
    "jira_key",
    "jira_static_labels",
    "jira_demo_label",
    "jira_sprint_field",
    "llm_provider",
    "llm_model",
}


@router.get("", response_model=list[ProjectOut])
def list_projects(db: Session = Depends(get_db)) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.id)))


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreateIn, db: Session = Depends(get_db)) -> Project:
    project = Project(name=payload.name, description=payload.description, color=payload.color)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
def patch_project(project_id: int, payload: ProjectPatchIn, db: Session = Depends(get_db)) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    updates = payload.model_dump(exclude_unset=True)
    # Normalize Jira credential fields (strip whitespace / trailing slashes)
    if "jira_base_url" in updates and updates["jira_base_url"] is not None:
        updates["jira_base_url"] = updates["jira_base_url"].strip().rstrip("/")
    if "jira_email" in updates and updates["jira_email"] is not None:
        updates["jira_email"] = updates["jira_email"].strip()
    if "jira_api_token" in updates and updates["jira_api_token"] is not None:
        updates["jira_api_token"] = updates["jira_api_token"].strip()
    for field, value in updates.items():
        if value is None and field in NON_NULLABLE_FIELDS:
            raise HTTPException(422, f"Field '{field}' cannot be null")
        setattr(project, field, value)
    # ai_context is a knowledge-base source; editing it makes the distilled brief stale.
    if "ai_context" in updates:
        project.knowledge_sources_changed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    db.refresh(project)
    return project


def _redact(message: str, api_key: str | None) -> str:
    """Strip the project's API key from error text before returning it to the UI."""
    return message.replace(api_key, "[REDACTED]") if api_key else message


def _models_url(base_url: str) -> str:
    """Build the OpenAI-compatible ``/v1/models`` URL from a stored base URL.

    Accepts both ``http://host:1234`` and ``http://host:1234/v1`` forms.
    """
    return f"{normalize_base_url(base_url)}/models"


@router.post("/{project_id}/llm-test", response_model=LlmTestOut)
def llm_test(project_id: int, db: Session = Depends(get_db)) -> LlmTestOut:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    model, kwargs = model_and_kwargs(project)
    try:
        client = get_client(project.llm_provider)
        client.chat.completions.create(
            model=model,
            response_model=None,
            messages=[{"role": "user", "content": "Reply with OK"}],
            max_tokens=5,
            **kwargs,
        )
        return LlmTestOut(ok=True)
    except Exception as exc:  # noqa: BLE001 - report any connectivity error to UI
        return LlmTestOut(ok=False, error=_redact(str(exc)[:500], project.llm_api_key))


@router.post("/{project_id}/llm-connect", response_model=LlmConnectOut)
def llm_connect(project_id: int, db: Session = Depends(get_db)) -> LlmConnectOut:
    """Probe the project's local LLM server and report the models it has loaded.

    Unlike ``llm-test`` (a full chat round-trip through the LLM), this pings the
    OpenAI-compatible ``GET /v1/models`` endpoint with a short timeout so the UI
    can show an immediate reachability status and auto-fill the detected model.
    """
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    if project.llm_provider not in LOCAL_PROVIDERS:
        return LlmConnectOut(
            ok=False,
            error=(
                f"Connection check supports local providers only ({', '.join(LOCAL_PROVIDERS)}); "
                f"this project uses '{project.llm_provider}'."
            ),
        )
    if not project.llm_base_url:
        return LlmConnectOut(ok=False, error="No LLM base URL configured for this project")
    headers = {"Authorization": f"Bearer {project.llm_api_key}"} if project.llm_api_key else None
    try:
        response = httpx.get(
            _models_url(project.llm_base_url), timeout=LLM_CONNECT_TIMEOUT_S, headers=headers
        )
        response.raise_for_status()
        payload = response.json()
        data = payload.get("data", []) if isinstance(payload, dict) else []
        models = [str(item["id"]) for item in data if isinstance(item, dict) and "id" in item]
        return LlmConnectOut(ok=True, models=models, model=models[0] if models else None)
    except Exception as exc:  # noqa: BLE001 - report any connectivity error to UI
        return LlmConnectOut(ok=False, error=_redact(str(exc)[:500], project.llm_api_key))


@router.post("/{project_id}/jira-test", response_model=JiraTestOut)
def jira_test(project_id: int, db: Session = Depends(get_db)) -> JiraTestOut:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    creds = get_credentials(project)
    if creds is None:
        return JiraTestOut(ok=False, error="Jira is not configured for this project — base URL, email and API token are required.")
    result = jira_client.test_connection(*creds)
    return JiraTestOut(**result) if result["ok"] else JiraTestOut(ok=False, error=result["error"])


@router.get("/{project_id}/jira-users", response_model=JiraUsersOut)
def jira_users(project_id: int, db: Session = Depends(get_db)) -> JiraUsersOut:
    """Assignable users of the project's Jira project, for the assignee picker."""
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(404, "Project not found")
    creds = get_credentials(project)
    if creds is None or not project.jira_key:
        return JiraUsersOut(ok=False, error="Jira is not configured for this project.")
    users = jira_client.list_assignable_users(*creds, project.jira_key)
    if users is None:
        return JiraUsersOut(ok=False, error="Could not fetch users from Jira — check the connection in Settings.")
    return JiraUsersOut(ok=True, users=[JiraUserOut(**u) for u in users])

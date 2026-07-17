from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.schemas import AppSettingsOut, AppSettingsPatchIn, JiraTestOut
from app.db.models import AppSetting
from app.db.seed import ensure_app_settings
from app.db.session import get_db
from app.jira import client as jira_client
from app.jira.service import get_credentials
from app.llm.prompts import DEFAULT_SYSTEM_PROMPT

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _to_out(row: AppSetting) -> AppSettingsOut:
    return AppSettingsOut(
        extraction_prompt=row.extraction_prompt,
        jira_base_url=row.jira_base_url,
        jira_email=row.jira_email,
        jira_token_set=bool(row.jira_api_token),
        jira_token_hint=row.jira_api_token[-4:] if row.jira_api_token else "",
    )


@router.get("", response_model=AppSettingsOut)
def get_settings(db: Session = Depends(get_db)) -> AppSettingsOut:
    return _to_out(ensure_app_settings(db))


@router.patch("", response_model=AppSettingsOut)
def patch_settings(payload: AppSettingsPatchIn, db: Session = Depends(get_db)) -> AppSettingsOut:
    row = ensure_app_settings(db)
    if payload.extraction_prompt is not None:
        # Blank resets to the built-in default so the prompt can never be emptied.
        row.extraction_prompt = payload.extraction_prompt.strip() or DEFAULT_SYSTEM_PROMPT
    if payload.jira_base_url is not None:
        row.jira_base_url = payload.jira_base_url.strip().rstrip("/")
    if payload.jira_email is not None:
        row.jira_email = payload.jira_email.strip()
    if payload.jira_api_token is not None:
        row.jira_api_token = payload.jira_api_token.strip()
    db.commit()
    db.refresh(row)
    return _to_out(row)


@router.post("/jira-test", response_model=JiraTestOut)
def jira_test(db: Session = Depends(get_db)) -> JiraTestOut:
    creds = get_credentials(db)
    if creds is None:
        return JiraTestOut(ok=False, error="Jira is not configured — base URL, email and API token are required.")
    result = jira_client.test_connection(*creds)
    return JiraTestOut(**result) if result["ok"] else JiraTestOut(ok=False, error=result["error"])

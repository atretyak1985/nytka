from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.schemas import AppSettingsOut, AppSettingsPatchIn
from app.db.models import AppSetting
from app.db.seed import ensure_app_settings
from app.db.session import get_db
from app.llm.prompts import DEFAULT_SYSTEM_PROMPT

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=AppSettingsOut)
def get_settings(db: Session = Depends(get_db)) -> AppSetting:
    return ensure_app_settings(db)


@router.patch("", response_model=AppSettingsOut)
def patch_settings(payload: AppSettingsPatchIn, db: Session = Depends(get_db)) -> AppSetting:
    row = ensure_app_settings(db)
    if payload.extraction_prompt is not None:
        # Blank resets to the built-in default so the prompt can never be emptied.
        row.extraction_prompt = payload.extraction_prompt.strip() or DEFAULT_SYSTEM_PROMPT
    db.commit()
    db.refresh(row)
    return row

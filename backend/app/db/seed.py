from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import AppSetting, Project
from app.llm.prompts import DEFAULT_SYSTEM_PROMPT


def ensure_default_project(db: Session) -> Project:
    project = db.scalar(select(Project).order_by(Project.id).limit(1))
    if project is None:
        project = Project(name="My Project")
        db.add(project)
        db.commit()
        db.refresh(project)
    return project


def ensure_app_settings(db: Session) -> AppSetting:
    """Single-row global settings; seeds the base extraction prompt from code default."""
    settings_row = db.get(AppSetting, 1)
    if settings_row is None:
        settings_row = AppSetting(id=1, extraction_prompt=DEFAULT_SYSTEM_PROMPT)
        db.add(settings_row)
        db.commit()
        db.refresh(settings_row)
    elif not settings_row.extraction_prompt.strip():
        settings_row.extraction_prompt = DEFAULT_SYSTEM_PROMPT
        db.commit()
    return settings_row

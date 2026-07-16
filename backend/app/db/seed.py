from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Project


def ensure_default_project(db: Session) -> Project:
    project = db.scalar(select(Project).order_by(Project.id).limit(1))
    if project is None:
        project = Project(name="My Project")
        db.add(project)
        db.commit()
        db.refresh(project)
    return project

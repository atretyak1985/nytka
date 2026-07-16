from sqlalchemy.orm import Session

from app.db.models import Meeting


def extract_tasks_for_meeting(db: Session, meeting: Meeting) -> int:
    """LLM task extraction. Real implementation in step 05; 0 tasks until then."""
    return 0

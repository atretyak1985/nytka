import logging
import re

from sqlalchemy.orm import Session

from app.db.models import Meeting, Task, TaskPriority
from app.llm.chunking import build_chunks
from app.llm.client import get_client, model_and_kwargs
from app.llm.prompts import SYSTEM_PROMPT, user_prompt
from app.llm.schemas import ActionItem, ExtractionResult

logger = logging.getLogger(__name__)


def extract_tasks_for_meeting(db: Session, meeting: Meeting) -> int:
    chunks = build_chunks(meeting.segments)
    if not chunks:
        return 0

    model, kwargs = model_and_kwargs(meeting.project)
    client = get_client()
    items: list[ActionItem] = []
    for i, chunk in enumerate(chunks):
        try:
            result: ExtractionResult = client.chat.completions.create(
                model=model,
                response_model=ExtractionResult,
                max_retries=2,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt(chunk, i, len(chunks))},
                ],
                **kwargs,
            )
        except Exception:
            logger.exception("LLM extraction failed on chunk %d/%d for meeting %s", i + 1, len(chunks), meeting.id)
            raise
        items.extend(result.tasks)

    seen: set[str] = set()
    created = 0
    for item in items:
        key = re.sub(r"\s+", " ", item.title.strip().lower())
        if not key or key in seen:
            continue
        seen.add(key)
        db.add(Task(
            project_id=meeting.project_id,
            meeting_id=meeting.id,
            title=item.title.strip()[:500],
            description=item.description.strip(),
            assignee=item.assignee,
            priority=_safe_priority(item.priority),
            source_timestamp=item.source_timestamp,
        ))
        created += 1
    db.commit()
    logger.info("meeting %s: %s tasks from %s chunks (prompt v1)", meeting.id, created, len(chunks))
    return created


def _safe_priority(value: str) -> TaskPriority:
    try:
        return TaskPriority(value.lower().strip())
    except ValueError:
        return TaskPriority.MEDIUM

import logging
import re
from difflib import SequenceMatcher

from sqlalchemy.orm import Session

from app.db.models import AppSetting, Meeting, Task, TaskPriority
from app.llm.chunking import build_chunks
from app.llm.client import get_client, model_and_kwargs
from app.llm.prompts import DEFAULT_SYSTEM_PROMPT, project_context_block, user_prompt
from app.llm.schemas import ActionItem, ExtractionResult

logger = logging.getLogger(__name__)


def extract_tasks_for_meeting(db: Session, meeting: Meeting) -> int:
    chunks = build_chunks(meeting.segments)
    if not chunks:
        return 0

    model, kwargs = model_and_kwargs(meeting.project)
    client = get_client(meeting.project.llm_provider)

    # Base prompt: editable global setting, falling back to the built-in default.
    settings_row = db.get(AppSetting, 1)
    base_prompt = (settings_row.extraction_prompt.strip() if settings_row else "") or DEFAULT_SYSTEM_PROMPT

    # Per-project guidance from the Settings tab, layered on top. The distilled knowledge
    # brief (from Init) is injected as domain background; fall back to the raw ai_context
    # for projects that never ran Init (backward compatible).
    project = meeting.project
    knowledge = project.knowledge_brief.strip() or project.ai_context
    context_block = project_context_block(
        knowledge, project.glossary, project.team, project.task_format, project.task_areas,
        project.task_language,
    )
    # Single merged system message: local-model chat templates (LM Studio/Ollama)
    # reject any system message that isn't the first message in the conversation.
    system_content = f"{base_prompt}\n\n{context_block}" if context_block else base_prompt
    system_messages = [{"role": "system", "content": system_content}]

    items: list[ActionItem] = []
    for i, chunk in enumerate(chunks):
        try:
            result: ExtractionResult = client.chat.completions.create(
                model=model,
                response_model=ExtractionResult,
                max_retries=2,
                messages=[
                    *system_messages,
                    {"role": "user", "content": user_prompt(chunk, i, len(chunks))},
                ],
                **kwargs,
            )
        except Exception:
            logger.exception("LLM extraction failed on chunk %d/%d for meeting %s", i + 1, len(chunks), meeting.id)
            raise
        items.extend(result.tasks)
        meeting.progress = (i + 1) / len(chunks)
        db.commit()

    # Only trust an area the model copied verbatim from the project's taxonomy.
    valid_areas = {a.strip() for a in project.task_areas if a.strip()}
    seen: set[str] = set()
    created = 0
    for item in items:
        key = re.sub(r"\s+", " ", item.title.strip().lower())
        if not key or key in seen:
            continue
        seen.add(key)
        area = (item.area or "").strip()
        db.add(Task(
            project_id=meeting.project_id,
            meeting_id=meeting.id,
            title=item.title.strip()[:500],
            description=item.description.strip(),
            area=area if area in valid_areas else "",
            # Normalise a mention ("Віктор", "Nazar") to the exact team name so the
            # dialog dropdown and Jira account resolution line up; raw when no match.
            assignee=_match_team_member(item.assignee, project.team) or item.assignee,
            priority=_safe_priority(item.priority),
            source_timestamp=item.source_timestamp,
        ))
        created += 1
    db.commit()
    logger.info("meeting %s: %s tasks from %s chunks (prompt v1)", meeting.id, created, len(chunks))
    return created


# Ukrainian Cyrillic -> Latin (national transliteration standard, lowercased),
# so «Віктор» and "Victor" compare in one alphabet.
_CYR_TO_LAT = {
    "а": "a", "б": "b", "в": "v", "г": "h", "ґ": "g", "д": "d", "е": "e", "є": "ie",
    "ж": "zh", "з": "z", "и": "y", "і": "i", "ї": "i", "й": "i", "к": "k", "л": "l",
    "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "kh", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "shch", "ь": "",
    "ю": "iu", "я": "ia", "ё": "e", "э": "e", "ы": "y", "ъ": "",
}


def _translit(text: str) -> str:
    return "".join(_CYR_TO_LAT.get(ch, ch) for ch in text.lower())


def _match_team_member(raw: str | None, team: list[dict]) -> str | None:
    """Map an extracted assignee mention (first name only, inflected, or Cyrillic)
    to the exact configured team-member name. None when no single confident match —
    ambiguity must not silently pick a person."""
    if not raw or not raw.strip():
        return None
    names = [m.get("name", "").strip() for m in team if m.get("name", "").strip()]
    mention = _translit(raw.strip())
    mention_tokens = mention.split()
    matches: list[str] = []
    for full in names:
        full_translit = _translit(full)
        if mention == full_translit:
            return full
        target_tokens = full_translit.split()
        # Fuzzy per-token: covers spelling drift between transliterations ("viktor"/"victor").
        if all(
            any(SequenceMatcher(None, mt, tt).ratio() >= 0.8 for tt in target_tokens)
            for mt in mention_tokens
        ):
            matches.append(full)
    return matches[0] if len(matches) == 1 else None


def _safe_priority(value: str) -> TaskPriority:
    try:
        return TaskPriority(value.lower().strip())
    except ValueError:
        return TaskPriority.MEDIUM

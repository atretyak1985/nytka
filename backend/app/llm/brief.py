"""Meeting brief generation (structured minutes).

Map-reduces a meeting's transcript into a MeetingBrief row: executive summary,
decisions, risks, open questions, next steps — every point deep-linkable into the
video via source_timestamp. Runs after task extraction as its own pipeline step
(see app/pipeline/runner.py) and never fails the meeting: a brief error lands on
the brief row, not on the meeting.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import BriefStatus, Meeting, MeetingBrief
from app.llm.chunking import build_chunks, format_timestamp
from app.llm.client import get_client, model_and_kwargs
from app.llm.prompts import (
    BRIEF_SYSTEM_PROMPT,
    brief_map_prompt,
    brief_reduce_prompt,
    project_context_block,
)
from app.llm.schemas import BriefResult

logger = logging.getLogger(__name__)


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _ensure_brief_row(db: Session, meeting: Meeting) -> MeetingBrief:
    """Find or create this meeting's brief row (meeting_id is unique)."""
    brief = db.scalar(select(MeetingBrief).where(MeetingBrief.meeting_id == meeting.id))
    if brief is None:
        brief = MeetingBrief(meeting_id=meeting.id)
        db.add(brief)
    return brief


def generate_brief_for_meeting(db: Session, meeting: Meeting) -> MeetingBrief:
    """Map-reduce the transcript into structured minutes.

    Mirrors extract_tasks_for_meeting: one merged system message (local chat
    templates reject a non-leading system role), Instructor response_model,
    progress committed per chunk. Idempotent on the row (one brief per meeting)
    and never raises — the meeting must stay usable when only the brief fails.
    """
    brief = _ensure_brief_row(db, meeting)
    brief.status = BriefStatus.PROCESSING
    brief.error = None
    db.commit()

    try:
        chunks = build_chunks(meeting.segments)
        if not chunks:
            brief.status = BriefStatus.READY
            brief.summary = ""
            brief.decisions = []
            brief.risks = []
            brief.open_questions = []
            brief.next_steps = []
            brief.generated_at = now_utc()
            db.commit()
            return brief

        model, kwargs = model_and_kwargs(meeting.project)
        client = get_client(meeting.project.llm_provider)

        project = meeting.project
        knowledge = project.knowledge_brief.strip() or project.ai_context
        context_block = project_context_block(
            knowledge, project.glossary, project.team, project.task_format, project.task_areas,
            project.task_language,
        )
        # Single merged system message: local-model chat templates (LM Studio/Ollama)
        # reject any system message that isn't the first message in the conversation.
        system_content = f"{BRIEF_SYSTEM_PROMPT}\n\n{context_block}" if context_block else BRIEF_SYSTEM_PROMPT
        system_messages = [{"role": "system", "content": system_content}]

        partials: list[BriefResult] = []
        total_steps = len(chunks) + 1  # the reduce is the last step
        for i, chunk in enumerate(chunks):
            partial: BriefResult = client.chat.completions.create(
                model=model,
                response_model=BriefResult,
                max_retries=2,
                messages=[
                    *system_messages,
                    {"role": "user", "content": brief_map_prompt(chunk, i, len(chunks))},
                ],
                **kwargs,
            )
            partials.append(partial)
            meeting.progress = (i + 1) / total_steps
            db.commit()

        if len(partials) == 1:
            result = partials[0]
        else:
            result = client.chat.completions.create(
                model=model,
                response_model=BriefResult,
                max_retries=2,
                messages=[
                    *system_messages,
                    {"role": "user", "content": brief_reduce_prompt(
                        [p.model_dump_json() for p in partials]
                    )},
                ],
                **kwargs,
            )
        meeting.progress = 1.0

        brief.summary = result.summary.strip()
        brief.decisions = [p.model_dump() for p in result.decisions]
        brief.risks = [p.model_dump() for p in result.risks]
        brief.open_questions = [p.model_dump() for p in result.open_questions]
        brief.next_steps = [p.model_dump() for p in result.next_steps]
        brief.status = BriefStatus.READY
        brief.generated_at = now_utc()
        db.commit()
        logger.info(
            "meeting %s: brief ready (%d decisions, %d risks, %d open questions, %d next steps)",
            meeting.id, len(brief.decisions), len(brief.risks),
            len(brief.open_questions), len(brief.next_steps),
        )
    except Exception as exc:  # noqa: BLE001 - the brief must never fail a meeting with extracted tasks
        logger.exception("brief generation failed for meeting %s", meeting.id)
        db.rollback()
        msg = str(exc)[:2000]
        api_key = meeting.project.llm_api_key if meeting.project else None
        if api_key:
            msg = msg.replace(api_key, "[REDACTED]")
        brief.status = BriefStatus.ERROR
        brief.error = msg
        db.commit()
    return brief


# Section order and headings for the Markdown export (also reused by the UI copy button).
_MD_SECTIONS: tuple[tuple[str, str], ...] = (
    ("decisions", "Decisions"),
    ("risks", "Risks"),
    ("open_questions", "Open questions"),
    ("next_steps", "Next steps"),
)


def render_brief_markdown(meeting: Meeting, brief: MeetingBrief) -> str:
    """Render a brief as Markdown. Pure — no DB, no I/O — so it is unit-testable
    and reusable (project memory export in a later phase). Empty sections are skipped."""
    lines: list[str] = [f"# {meeting.title} — Meeting brief", ""]
    if brief.summary.strip():
        lines += [brief.summary.strip(), ""]
    for attr, heading in _MD_SECTIONS:
        points: list[dict] = getattr(brief, attr) or []
        rendered = [_render_point(p) for p in points]
        rendered = [r for r in rendered if r]
        if not rendered:
            continue
        lines += [f"## {heading}", *rendered, ""]
    return "\n".join(lines).strip() + "\n"


def _render_point(point: dict) -> str:
    text = str(point.get("text") or "").strip()
    if not text:
        return ""
    ts = point.get("source_timestamp")
    prefix = f"[{format_timestamp(float(ts))}] " if ts is not None else ""
    return f"- {prefix}{text}"

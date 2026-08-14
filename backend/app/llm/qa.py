"""Project-memory Q&A: answer a free-form question from this project's meetings.

Retrieval-augmented, local-only: the FTS index (app/db/fts.py) supplies the excerpts,
the project's own LLM writes the answer, and every citation is re-checked against the
excerpts that were actually shown. Nothing leaves the machine and nothing is answered
from the model's own knowledge — an unsupported answer is downgraded to "no data".
"""
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.fts import search_project
from app.db.models import Meeting, Project
from app.llm.chunking import format_timestamp
from app.llm.client import get_client, model_and_kwargs
from app.llm.prompts import QA_SYSTEM_PROMPT, qa_user_prompt
from app.llm.schemas import AskResult

logger = logging.getLogger(__name__)

# Kinds worth quoting: transcript lines carry the words that were actually said,
# briefs carry the distilled decisions. Tasks are excluded on purpose — they are
# derived text and would let the model "cite" its own earlier output.
QA_KINDS: tuple[str, ...] = ("segment", "brief")
QA_LIMIT = 12

NO_DATA_ANSWER = "No relevant meetings found for this question."


def answer_question(db: Session, project: Project, question: str) -> dict:
    """RAG over the FTS index: retrieve -> LLM -> validate citations.

    Raises on LLM failure (the API route converts to 502 with the key redacted);
    an empty retrieval never reaches the LLM at all.
    """
    hits = search_project(db, project.id, question, kinds=QA_KINDS, limit=QA_LIMIT)
    if not hits:
        # SC-9: honest absence. No LLM round-trip — there is nothing to ground on.
        return {"answer": NO_DATA_ANSWER, "no_data": True, "citations": []}

    meeting_ids = {h["meeting_id"] for h in hits if h["meeting_id"] is not None}
    titles = {
        m.id: m.title
        for m in db.scalars(select(Meeting).where(Meeting.id.in_(meeting_ids)))
    }
    excerpts = [_excerpt(hit, titles) for hit in hits]

    model, kwargs = model_and_kwargs(project)
    client = get_client(project.llm_provider)
    # Single merged system message: local-model chat templates (LM Studio/Ollama)
    # reject any system message that isn't the first message in the conversation.
    result: AskResult = client.chat.completions.create(
        model=model,
        response_model=AskResult,
        max_retries=2,
        messages=[
            {"role": "system", "content": QA_SYSTEM_PROMPT},
            {"role": "user", "content": qa_user_prompt(question, excerpts)},
        ],
        **kwargs,
    )

    citations = [
        {
            "meeting_id": c.meeting_id,
            "meeting_title": titles[c.meeting_id],
            "t_start": c.t_start,
            "quote": c.quote.strip(),
        }
        for c in result.citations
        if c.meeting_id in meeting_ids and c.quote.strip()
    ]
    dropped = len(result.citations) - len(citations)
    if dropped:
        logger.warning(
            "project %s: dropped %d citation(s) pointing outside the retrieved context",
            project.id, dropped,
        )

    no_data = result.no_data
    if not no_data and not citations:
        # The model asserted an answer it could not tie to a single retrieved excerpt.
        # Keep its text (it may still be a useful "I don't know") but never present it
        # as grounded — that is exactly the hallucination this feature must not ship.
        no_data = True
    return {"answer": result.answer.strip(), "no_data": no_data, "citations": citations}


def _excerpt(hit: dict, titles: dict[int, str]) -> str:
    """One excerpt block. The header is the ONLY place a meeting_id/t_start comes from —
    the model is told to copy them verbatim, and citations are checked against it."""
    title = titles.get(hit["meeting_id"], "untitled")
    stamp = "" if hit["t_start"] is None else f" @ {format_timestamp(float(hit['t_start']))}"
    kind = "brief" if hit["kind"] == "brief" else "transcript"
    return f"[meeting {hit['meeting_id']} «{title}»{stamp} · {kind}] {hit['text']}"

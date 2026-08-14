"""Cross-meeting duplicate flagging for freshly extracted drafts.

Extraction already de-dups within one meeting (app/llm/extraction.py, the `seen`
set); this pass covers the gap between meetings: work discussed again three weeks
later used to produce a second ticket. Candidates come from the FTS index
(app/db/fts.py), the project's own LLM makes the call, and the result is only ever
a FLAG — merging is an explicit user action (see app/jira/service.py:merge_into).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.fts import search_project
from app.db.models import Meeting, Task, TaskStatus
from app.llm.client import get_client, model_and_kwargs
from app.llm.prompts import DEDUP_CANDIDATE_CHARS, DEDUP_SYSTEM_PROMPT, dedup_user_prompt
from app.llm.schemas import DuplicateVerdict

logger = logging.getLogger(__name__)

# Wide net from FTS, narrow list to the model: bm25 ranks lexical overlap, which is a
# weak proxy for "same work", so over-fetch and let the LLM read a short shortlist.
FTS_LIMIT = 25
MAX_CANDIDATES = 5
MAX_REASON_CHARS = 1000


def flag_duplicates_for_meeting(db: Session, meeting: Meeting) -> int:
    """Best-effort duplicate flagging for this meeting's fresh drafts.

    Mirrors the _generate_screenshots contract (app/pipeline/runner.py): own
    try/except per task and around the whole pass, db.rollback() on failure,
    never raises — dedup must not error a finished meeting. Returns the number
    of flagged tasks.
    """
    flagged = 0
    try:
        drafts = list(db.scalars(
            select(Task).where(
                Task.meeting_id == meeting.id,
                Task.status == TaskStatus.DRAFT,
                Task.dedup_checked_at.is_(None),
            ).order_by(Task.id)
        ))
        if not drafts:
            return 0
        model, kwargs = model_and_kwargs(meeting.project)
        client = get_client(meeting.project.llm_provider)
        for task in drafts:
            try:
                if _check_one(db, task, client, model, kwargs):
                    flagged += 1
            except Exception:  # noqa: BLE001 - one bad task must not stop the pass
                logger.exception("dedup failed for task %s (meeting %s)", task.id, meeting.id)
                # dedup_checked_at deliberately NOT set: a Retry gets another shot.
                db.rollback()
    except Exception:  # noqa: BLE001 - dedup is decoration, never fail the pipeline
        logger.exception("duplicate flagging failed for meeting %s", meeting.id)
        db.rollback()
        return flagged
    logger.info("meeting %s: %s of %s drafts flagged as duplicates", meeting.id, flagged, len(drafts))
    return flagged


def _check_one(db: Session, task: Task, client, model: str, kwargs: dict) -> bool:
    """One draft: retrieve candidates, ask the model, persist the verdict.

    Commits per task so partial progress survives a later failure. Returns True
    when the task was flagged.
    """
    candidates = _candidate_tasks(db, task)
    if not candidates:
        # Nothing to compare against — a checked task, not an unchecked one.
        task.dedup_checked_at = _now()
        db.commit()
        return False

    verdict: DuplicateVerdict = client.chat.completions.create(
        model=model,
        response_model=DuplicateVerdict,
        max_retries=2,
        messages=[
            {"role": "system", "content": DEDUP_SYSTEM_PROMPT},
            {"role": "user", "content": dedup_user_prompt(
                _task_text(task), [_candidate_text(c) for c in candidates]
            )},
        ],
        **kwargs,
    )

    index = verdict.duplicate_of
    matched = index is not None and 1 <= index <= len(candidates)
    if index is not None and not matched:
        # Out of range = the model pointed at a candidate it was never shown. Treat as
        # "not a duplicate" (the safe direction) rather than guessing what it meant.
        logger.warning(
            "dedup: task %s got out-of-range candidate %s (had %s)", task.id, index, len(candidates)
        )
    if matched:
        task.duplicate_of_task_id = candidates[index - 1].id
        task.duplicate_reason = verdict.reason.strip()[:MAX_REASON_CHARS]
    task.dedup_checked_at = _now()
    db.commit()
    return matched


def _candidate_tasks(db: Session, task: Task, limit: int = MAX_CANDIDATES) -> list[Task]:
    """Top-N project tasks ranked by FTS match against the draft's title+description.

    Excludes: tasks of the same meeting (extraction already de-dups within one
    meeting) — and the draft itself, which is in the index too. That exclusion is
    pushed into the query on purpose: filtering the hit list afterwards would let
    the self-hit satisfy the AND pass and starve the OR fallback. Rejected and
    merged targets are dropped after ranking (dead ends — merging into one hides work).
    """
    hits = search_project(
        db, task.project_id, f"{task.title} {task.description}",
        kinds=("task",), exclude_meeting_id=task.meeting_id, limit=FTS_LIMIT,
    )
    ids = [h["ref_id"] for h in hits if h["ref_id"] != task.id]
    if not ids:
        return []
    rows = db.scalars(select(Task).where(Task.id.in_(ids))).all()
    by_id = {t.id: t for t in rows if t.status not in (TaskStatus.REJECTED, TaskStatus.MERGED)}
    return [by_id[i] for i in ids if i in by_id][:limit]  # keep bm25 order


def _task_text(task: Task) -> str:
    return f"{task.title}\n{task.description}".strip()


def _candidate_text(task: Task) -> str:
    """`[CRM-42 · approved] title — description` — the Jira key is shown on purpose:
    a duplicate of an already-filed ticket is exactly the case worth catching."""
    marks = " · ".join(p for p in (task.jira_issue_key, str(task.status)) if p)
    head = f"[{marks}] {task.title}"
    body = task.description.strip()[:DEDUP_CANDIDATE_CHARS]
    return f"{head} — {body}" if body else head


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

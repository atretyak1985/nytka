"""SQLite FTS5 search index over transcripts, tasks and meeting briefs.

One virtual table for all three kinds; `kind` + `ref_id` identify the source row.
Segments and tasks are kept in sync by SQL triggers (no app-code touchpoints);
briefs are (re)indexed from app code because their JSON point-lists cannot be
flattened in a trigger. The canonical DDL lives here; the Alembic migration
carries a frozen copy (migrations must never import app code).
"""
from __future__ import annotations

import re

from sqlalchemy import text
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.orm import Session

# NOTE: tokenizer per README decision #5 — works for Ukrainian + English,
# gives snippet() out of the box.
FTS_DDL: tuple[str, ...] = (
    """CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
        text,
        kind UNINDEXED,
        project_id UNINDEXED,
        meeting_id UNINDEXED,
        ref_id UNINDEXED,
        t_start UNINDEXED,
        tokenize = 'unicode61 remove_diacritics 2'
    )""",
    # --- transcript_segments: full sync via triggers ---
    """CREATE TRIGGER IF NOT EXISTS fts_seg_ai AFTER INSERT ON transcript_segments BEGIN
        INSERT INTO search_index(text, kind, project_id, meeting_id, ref_id, t_start)
        SELECT new.text, 'segment', m.project_id, new.meeting_id, new.id, new.t_start
        FROM meetings m WHERE m.id = new.meeting_id;
    END""",
    """CREATE TRIGGER IF NOT EXISTS fts_seg_ad AFTER DELETE ON transcript_segments BEGIN
        DELETE FROM search_index WHERE kind = 'segment' AND ref_id = old.id;
    END""",
    """CREATE TRIGGER IF NOT EXISTS fts_seg_au AFTER UPDATE OF text ON transcript_segments BEGIN
        DELETE FROM search_index WHERE kind = 'segment' AND ref_id = old.id;
        INSERT INTO search_index(text, kind, project_id, meeting_id, ref_id, t_start)
        SELECT new.text, 'segment', m.project_id, new.meeting_id, new.id, new.t_start
        FROM meetings m WHERE m.id = new.meeting_id;
    END""",
    # --- tasks: title + description as one text ---
    # COALESCE, not a bare `||`: SQLite concatenation with a NULL operand yields NULL,
    # which would index an empty row for a task whose description was never set.
    """CREATE TRIGGER IF NOT EXISTS fts_task_ai AFTER INSERT ON tasks BEGIN
        INSERT INTO search_index(text, kind, project_id, meeting_id, ref_id, t_start)
        VALUES (COALESCE(new.title, '') || ' ' || COALESCE(new.description, ''), 'task',
                new.project_id, new.meeting_id, new.id, new.source_timestamp);
    END""",
    """CREATE TRIGGER IF NOT EXISTS fts_task_ad AFTER DELETE ON tasks BEGIN
        DELETE FROM search_index WHERE kind = 'task' AND ref_id = old.id;
    END""",
    """CREATE TRIGGER IF NOT EXISTS fts_task_au AFTER UPDATE OF title, description ON tasks BEGIN
        DELETE FROM search_index WHERE kind = 'task' AND ref_id = old.id;
        INSERT INTO search_index(text, kind, project_id, meeting_id, ref_id, t_start)
        VALUES (COALESCE(new.title, '') || ' ' || COALESCE(new.description, ''), 'task',
                new.project_id, new.meeting_id, new.id, new.source_timestamp);
    END""",
    # --- meeting_briefs: only the DELETE side is a trigger (insert/update from app code) ---
    """CREATE TRIGGER IF NOT EXISTS fts_brief_ad AFTER DELETE ON meeting_briefs BEGIN
        DELETE FROM search_index WHERE kind = 'brief' AND ref_id = old.id;
    END""",
)

# Trigger names in creation order — the migration's downgrade drops exactly these.
FTS_TRIGGERS: tuple[str, ...] = (
    "fts_seg_ai",
    "fts_seg_ad",
    "fts_seg_au",
    "fts_task_ai",
    "fts_task_ad",
    "fts_task_au",
    "fts_brief_ad",
)

# Highlight markers: non-printable control characters, deliberately NOT `<mark>`.
# A transcript can contain HTML and the client must never render raw markup coming
# out of the database — it splits on these two bytes instead (see MemoryTab.tsx).
SNIPPET_OPEN = "\x01"
SNIPPET_CLOSE = "\x02"

MAX_QUERY_TOKENS = 12

_SEARCH_SQL = """
SELECT kind, project_id, meeting_id, ref_id, t_start, text,
       snippet(search_index, 0, char(1), char(2), ' … ', 14) AS snippet,
       bm25(search_index) AS score
FROM search_index
WHERE search_index MATCH :q AND project_id = :pid{kind_filter}
ORDER BY score
LIMIT :limit
"""


def create_fts(bind: Engine | Connection) -> None:
    """Apply the FTS schema. Called from tests (metadata.create_all cannot create
    virtual tables/triggers); the migration executes its own frozen copy."""
    if isinstance(bind, Engine):
        with bind.begin() as conn:
            for stmt in FTS_DDL:
                conn.exec_driver_sql(stmt)
        return
    for stmt in FTS_DDL:
        bind.exec_driver_sql(stmt)


def brief_index_text(brief) -> str:
    """Flatten a MeetingBrief into one searchable string: summary + every point text."""
    parts = [brief.summary or ""]
    for points in (brief.decisions, brief.risks, brief.open_questions, brief.next_steps):
        parts.extend(p.get("text", "") for p in (points or []))
    return " ".join(p for p in parts if p).strip()


def index_brief(db: Session, brief) -> None:
    """Idempotent upsert of one brief into the index (delete + insert)."""
    db.execute(
        text("DELETE FROM search_index WHERE kind = 'brief' AND ref_id = :rid"), {"rid": brief.id}
    )
    body = brief_index_text(brief)
    if body:
        db.execute(
            text("""INSERT INTO search_index(text, kind, project_id, meeting_id, ref_id, t_start)
                    SELECT :body, 'brief', m.project_id, :mid, :rid, NULL
                    FROM meetings m WHERE m.id = :mid"""),
            {"body": body, "mid": brief.meeting_id, "rid": brief.id},
        )


def fts_query(raw: str, *, any_token: bool = False) -> str:
    """User text -> safe FTS5 MATCH expression: word tokens only, quoted, prefix-matched.
    Neutralises FTS operators (AND/OR/NEAR/"/*) by construction."""
    tokens = re.findall(r"\w+", raw.lower(), flags=re.UNICODE)[:MAX_QUERY_TOKENS]
    joiner = " OR " if any_token else " "
    return joiner.join(f'"{t}"*' for t in tokens)


def search_project(
    db: Session,
    project_id: int,
    raw: str,
    *,
    kinds: tuple[str, ...] | None = None,
    limit: int = 30,
) -> list[dict]:
    """Ranked FTS hits scoped to one project.

    AND semantics first; when that returns nothing, a second pass with OR semantics
    (recall for question-shaped queries). Each hit is
    {kind, meeting_id, ref_id, t_start, text, snippet, score}.
    """
    params: dict[str, object] = {"pid": project_id, "limit": limit}
    kind_filter = ""
    if kinds:
        names = [f"k{i}" for i in range(len(kinds))]
        kind_filter = " AND kind IN (" + ", ".join(f":{n}" for n in names) + ")"
        params.update(dict(zip(names, kinds)))
    sql = text(_SEARCH_SQL.format(kind_filter=kind_filter))

    for any_token in (False, True):
        match = fts_query(raw, any_token=any_token)
        if not match:
            return []  # nothing but punctuation — not an error, just no hits
        rows = db.execute(sql, {**params, "q": match}).mappings().all()
        if rows:
            return [dict(r) for r in rows]
        if not any_token and " " not in match:
            break  # single token: the OR pass is the same query
    return []

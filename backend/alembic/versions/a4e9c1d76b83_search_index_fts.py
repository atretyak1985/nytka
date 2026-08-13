"""search_index_fts

Revision ID: a4e9c1d76b83
Revises: f7d1b8c93e24
Create Date: 2026-08-13 20:30:00.000000

Creates the FTS5 project-memory index (`search_index`) plus the seven triggers that
keep transcript segments and tasks in sync, then backfills everything that already
exists in the database (triggers only fire from their creation onwards).

The DDL below is a FROZEN COPY of app/db/fts.py::FTS_DDL. Migrations must never
import application code — when the canonical DDL changes, a NEW migration carries
the change; this one stays as shipped.
"""
import json
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a4e9c1d76b83'
down_revision: Union[str, Sequence[str], None] = 'f7d1b8c93e24'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


FTS_DDL_FROZEN: tuple[str, ...] = (
    """CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
        text,
        kind UNINDEXED,
        project_id UNINDEXED,
        meeting_id UNINDEXED,
        ref_id UNINDEXED,
        t_start UNINDEXED,
        tokenize = 'unicode61 remove_diacritics 2'
    )""",
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
    """CREATE TRIGGER IF NOT EXISTS fts_brief_ad AFTER DELETE ON meeting_briefs BEGIN
        DELETE FROM search_index WHERE kind = 'brief' AND ref_id = old.id;
    END""",
)

TRIGGERS_FROZEN: tuple[str, ...] = (
    'fts_seg_ai', 'fts_seg_ad', 'fts_seg_au',
    'fts_task_ai', 'fts_task_ad', 'fts_task_au',
    'fts_brief_ad',
)


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    for stmt in FTS_DDL_FROZEN:
        conn.exec_driver_sql(stmt)

    conn.exec_driver_sql(
        """INSERT INTO search_index(text, kind, project_id, meeting_id, ref_id, t_start)
           SELECT s.text, 'segment', m.project_id, s.meeting_id, s.id, s.t_start
           FROM transcript_segments s JOIN meetings m ON m.id = s.meeting_id"""
    )
    conn.exec_driver_sql(
        """INSERT INTO search_index(text, kind, project_id, meeting_id, ref_id, t_start)
           SELECT COALESCE(t.title, '') || ' ' || COALESCE(t.description, ''), 'task',
                  t.project_id, t.meeting_id, t.id, t.source_timestamp
           FROM tasks t"""
    )
    # briefs: the JSON point lists are flattened in Python (json1 inside triggers or
    # plain SQL is too brittle for a nested "[{text: ...}]" shape).
    rows = conn.exec_driver_sql(
        """SELECT b.id, b.meeting_id, m.project_id, b.summary,
                  b.decisions, b.risks, b.open_questions, b.next_steps
           FROM meeting_briefs b JOIN meetings m ON m.id = b.meeting_id
           WHERE b.status = 'ready'"""
    ).fetchall()
    for r in rows:
        parts = [r.summary or ""]
        for col in (r.decisions, r.risks, r.open_questions, r.next_steps):
            points = json.loads(col) if isinstance(col, str) and col else (col or [])
            parts.extend(p.get("text", "") for p in points)
        body = " ".join(p for p in parts if p).strip()
        if body:
            conn.exec_driver_sql(
                "INSERT INTO search_index(text, kind, project_id, meeting_id, ref_id, t_start) "
                "VALUES (?, 'brief', ?, ?, ?, NULL)",
                (body, r.project_id, r.meeting_id, r.id),
            )


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    for trigger in TRIGGERS_FROZEN:
        conn.exec_driver_sql(f"DROP TRIGGER IF EXISTS {trigger}")
    conn.exec_driver_sql("DROP TABLE IF EXISTS search_index")

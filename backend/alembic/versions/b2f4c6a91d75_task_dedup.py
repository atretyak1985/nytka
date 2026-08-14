"""task dedup

Revision ID: b2f4c6a91d75
Revises: a4e9c1d76b83
Create Date: 2026-08-14 10:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2f4c6a91d75'
down_revision: Union[str, Sequence[str], None] = 'a4e9c1d76b83'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Frozen copy of the `tasks` triggers from app/db/fts.py (migrations must never
# import app code). The downgrade drops columns via a batch table rebuild, which
# takes every trigger attached to `tasks` down with the old table — they are
# re-created here so the search index does not silently stop tracking tasks.
TASK_TRIGGERS: tuple[str, ...] = (
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
)

TASK_TRIGGER_NAMES: tuple[str, ...] = ("fts_task_ai", "fts_task_ad", "fts_task_au")


def upgrade() -> None:
    """Upgrade schema."""
    # Plain ADD COLUMN (not batch): SQLite does this in place, so the FTS triggers
    # on `tasks` survive. All three columns are nullable — no server_default needed.
    op.add_column('tasks', sa.Column('duplicate_of_task_id', sa.Integer(), nullable=True))
    op.add_column('tasks', sa.Column('duplicate_reason', sa.Text(), nullable=True))
    op.add_column('tasks', sa.Column('dedup_checked_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    # The rebuild takes the triggers with it; drop them first so the copy-out
    # INSERT cannot fire fts_task_ai and double every task in the index.
    for name in TASK_TRIGGER_NAMES:
        conn.exec_driver_sql(f"DROP TRIGGER IF EXISTS {name}")
    with op.batch_alter_table('tasks') as batch:
        batch.drop_column('dedup_checked_at')
        batch.drop_column('duplicate_reason')
        batch.drop_column('duplicate_of_task_id')
    has_index = conn.exec_driver_sql(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'search_index'"
    ).first()
    if has_index:
        for stmt in TASK_TRIGGERS:
            conn.exec_driver_sql(stmt)

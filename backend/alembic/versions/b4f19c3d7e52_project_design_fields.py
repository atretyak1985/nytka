"""project design fields

Revision ID: b4f19c3d7e52
Revises: 20ee1c2aaaa1
Create Date: 2026-07-17 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b4f19c3d7e52'
down_revision: Union[str, Sequence[str], None] = '20ee1c2aaaa1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # batch mode: SQLite cannot ALTER TABLE ADD COLUMN with a non-constant
    # default (updated_at CURRENT_TIMESTAMP); batch recreates the table and
    # backfills existing rows from the server defaults.
    with op.batch_alter_table('projects') as batch_op:
        batch_op.add_column(sa.Column('color', sa.String(length=20), server_default=sa.text("'#7a0d38'"), nullable=False))
        batch_op.add_column(sa.Column('description', sa.Text(), server_default=sa.text("''"), nullable=False))
        batch_op.add_column(sa.Column('ai_context', sa.Text(), server_default=sa.text("''"), nullable=False))
        batch_op.add_column(sa.Column('task_prefix', sa.String(length=20), server_default=sa.text("''"), nullable=False))
        batch_op.add_column(sa.Column('task_format', sa.Text(), server_default=sa.text("''"), nullable=False))
        batch_op.add_column(sa.Column('glossary', sa.JSON(), server_default=sa.text("'[]'"), nullable=False))
        batch_op.add_column(sa.Column('team', sa.JSON(), server_default=sa.text("'[]'"), nullable=False))
        batch_op.add_column(sa.Column('jira_enabled', sa.Boolean(), server_default=sa.text('0'), nullable=False))
        batch_op.add_column(sa.Column('jira_key', sa.String(length=50), server_default=sa.text("''"), nullable=False))
        batch_op.add_column(sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('projects') as batch_op:
        batch_op.drop_column('updated_at')
        batch_op.drop_column('jira_key')
        batch_op.drop_column('jira_enabled')
        batch_op.drop_column('team')
        batch_op.drop_column('glossary')
        batch_op.drop_column('task_format')
        batch_op.drop_column('task_prefix')
        batch_op.drop_column('ai_context')
        batch_op.drop_column('description')
        batch_op.drop_column('color')

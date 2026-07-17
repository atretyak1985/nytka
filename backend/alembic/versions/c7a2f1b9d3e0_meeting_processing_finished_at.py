"""meeting processing_finished_at

Revision ID: c7a2f1b9d3e0
Revises: b4f19c3d7e52
Create Date: 2026-07-17 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7a2f1b9d3e0'
down_revision: Union[str, Sequence[str], None] = 'b4f19c3d7e52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Self-healing if an earlier batch run was interrupted (see b4f19c3d7e52).
    op.execute("DROP TABLE IF EXISTS _alembic_tmp_meetings")
    with op.batch_alter_table('meetings') as batch_op:
        batch_op.add_column(sa.Column('processing_finished_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('meetings') as batch_op:
        batch_op.drop_column('processing_finished_at')

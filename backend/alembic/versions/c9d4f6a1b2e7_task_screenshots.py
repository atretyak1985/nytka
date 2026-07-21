"""task screenshots table

Revision ID: c9d4f6a1b2e7
Revises: b7e2d5a9c410
Create Date: 2026-07-21 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9d4f6a1b2e7'
down_revision: Union[str, Sequence[str], None] = 'b7e2d5a9c410'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'task_screenshots',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('task_id', sa.Integer(), sa.ForeignKey('tasks.id'), nullable=False, index=True),
        sa.Column('path', sa.String(length=1000), nullable=False),
        sa.Column('t_sec', sa.Float(), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('task_screenshots')

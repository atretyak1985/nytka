"""project task_language

Revision ID: d8f2a6c41b9e
Revises: c9d4f6a1b2e7
Create Date: 2026-07-21 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8f2a6c41b9e'
down_revision: Union[str, Sequence[str], None] = 'c9d4f6a1b2e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('projects') as batch:
        batch.add_column(sa.Column('task_language', sa.String(length=20), server_default='auto', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('projects') as batch:
        batch.drop_column('task_language')

"""task labels

Revision ID: e6b3d9f52a18
Revises: d8f2a6c41b9e
Create Date: 2026-07-21 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6b3d9f52a18'
down_revision: Union[str, Sequence[str], None] = 'd8f2a6c41b9e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('tasks') as batch:
        batch.add_column(sa.Column('labels', sa.JSON(), server_default='[]', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('tasks') as batch:
        batch.drop_column('labels')

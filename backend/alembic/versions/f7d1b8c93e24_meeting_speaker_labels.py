"""meeting speaker labels

Revision ID: f7d1b8c93e24
Revises: f7d2b8c93a14
Create Date: 2026-08-13 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7d1b8c93e24'
down_revision: Union[str, Sequence[str], None] = 'f7d2b8c93a14'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('meetings') as batch:
        batch.add_column(sa.Column('speaker_labels', sa.JSON(), server_default='{}', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('meetings') as batch:
        batch.drop_column('speaker_labels')

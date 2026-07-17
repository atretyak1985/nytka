"""app settings (global base prompt)

Revision ID: d3b8e4f21a6c
Revises: c7a2f1b9d3e0
Create Date: 2026-07-17 17:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd3b8e4f21a6c'
down_revision: Union[str, Sequence[str], None] = 'c7a2f1b9d3e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'app_settings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('extraction_prompt', sa.Text(), server_default='', nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('app_settings')

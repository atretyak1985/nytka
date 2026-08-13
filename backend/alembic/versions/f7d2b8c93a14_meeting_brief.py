"""meeting brief table

Revision ID: f7d2b8c93a14
Revises: e6b3d9f52a18
Create Date: 2026-08-13 18:30:00.000000

Statuses (meeting `summarizing`, brief lifecycle) are stored as VARCHAR
(values_callable enums, see initial schema), so no type ALTER is needed.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7d2b8c93a14'
down_revision: Union[str, Sequence[str], None] = 'e6b3d9f52a18'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'meeting_briefs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('meeting_id', sa.Integer(), sa.ForeignKey('meetings.id'), nullable=False, index=True, unique=True),
        sa.Column('summary', sa.Text(), nullable=False, server_default=''),
        sa.Column('decisions', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('risks', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('open_questions', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('next_steps', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('status', sa.Enum('empty', 'processing', 'ready', 'error', name='briefstatus'), nullable=False, server_default='empty'),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('generated_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('meeting_briefs')

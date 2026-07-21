"""project knowledge base (files + distilled brief)

Revision ID: a1f4c7e29b83
Revises: f3a1c8e92b47
Create Date: 2026-07-18 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1f4c7e29b83'
down_revision: Union[str, Sequence[str], None] = 'f3a1c8e92b47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'knowledge_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=300), nullable=False),
        sa.Column('path', sa.String(length=1000), nullable=False),
        sa.Column('kind', sa.String(length=10), nullable=False),
        sa.Column('size_bytes', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_knowledge_files_project_id', 'knowledge_files', ['project_id'])

    with op.batch_alter_table('projects') as batch:
        batch.add_column(sa.Column('knowledge_brief', sa.Text(), server_default='', nullable=False))
        batch.add_column(sa.Column('knowledge_status', sa.String(length=20), server_default='empty', nullable=False))
        batch.add_column(sa.Column('knowledge_error', sa.Text(), nullable=True))
        batch.add_column(sa.Column('knowledge_generated_at', sa.DateTime(), nullable=True))
        batch.add_column(sa.Column('knowledge_sources_changed_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('projects') as batch:
        batch.drop_column('knowledge_sources_changed_at')
        batch.drop_column('knowledge_generated_at')
        batch.drop_column('knowledge_error')
        batch.drop_column('knowledge_status')
        batch.drop_column('knowledge_brief')

    op.drop_index('ix_knowledge_files_project_id', table_name='knowledge_files')
    op.drop_table('knowledge_files')

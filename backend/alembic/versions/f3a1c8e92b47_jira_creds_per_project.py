"""jira credentials moved from app_settings to projects (per-project)

Revision ID: f3a1c8e92b47
Revises: e5c9a7d84b21
Create Date: 2026-07-18 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f3a1c8e92b47'
down_revision: Union[str, Sequence[str], None] = 'e5c9a7d84b21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add Jira credential columns to projects
    op.add_column('projects', sa.Column('jira_base_url', sa.String(length=500), server_default='', nullable=False))
    op.add_column('projects', sa.Column('jira_email', sa.String(length=300), server_default='', nullable=False))
    op.add_column('projects', sa.Column('jira_api_token', sa.String(length=500), server_default='', nullable=False))

    # Drop Jira credential columns from app_settings
    # SQLite supports DROP COLUMN since 3.35 (2021); wrap in batch to be safe.
    with op.batch_alter_table('app_settings') as batch:
        batch.drop_column('jira_api_token')
        batch.drop_column('jira_email')
        batch.drop_column('jira_base_url')


def downgrade() -> None:
    # Re-add Jira credential columns to app_settings
    op.add_column('app_settings', sa.Column('jira_base_url', sa.String(length=500), server_default='', nullable=False))
    op.add_column('app_settings', sa.Column('jira_email', sa.String(length=300), server_default='', nullable=False))
    op.add_column('app_settings', sa.Column('jira_api_token', sa.String(length=500), server_default='', nullable=False))

    # Drop Jira credential columns from projects
    with op.batch_alter_table('projects') as batch:
        batch.drop_column('jira_api_token')
        batch.drop_column('jira_email')
        batch.drop_column('jira_base_url')

"""jira integration: creds on app_settings, sync state on tasks

Revision ID: e5c9a7d84b21
Revises: d3b8e4f21a6c
Create Date: 2026-07-17 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e5c9a7d84b21'
down_revision: Union[str, Sequence[str], None] = 'd3b8e4f21a6c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('app_settings', sa.Column('jira_base_url', sa.String(length=500), server_default='', nullable=False))
    op.add_column('app_settings', sa.Column('jira_email', sa.String(length=300), server_default='', nullable=False))
    op.add_column('app_settings', sa.Column('jira_api_token', sa.String(length=500), server_default='', nullable=False))
    op.add_column('tasks', sa.Column('jira_issue_key', sa.String(length=50), nullable=True))
    op.add_column('tasks', sa.Column('jira_synced_at', sa.DateTime(), nullable=True))
    op.add_column('tasks', sa.Column('jira_sync_error', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('tasks', 'jira_sync_error')
    op.drop_column('tasks', 'jira_synced_at')
    op.drop_column('tasks', 'jira_issue_key')
    op.drop_column('app_settings', 'jira_api_token')
    op.drop_column('app_settings', 'jira_email')
    op.drop_column('app_settings', 'jira_base_url')

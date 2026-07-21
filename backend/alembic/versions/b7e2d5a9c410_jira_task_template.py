"""jira task template (areas, labels, sprint, task.area)

Revision ID: b7e2d5a9c410
Revises: a1f4c7e29b83
Create Date: 2026-07-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7e2d5a9c410'
down_revision: Union[str, Sequence[str], None] = 'a1f4c7e29b83'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('projects') as batch:
        batch.add_column(sa.Column('task_areas', sa.JSON(), server_default='[]', nullable=False))
        batch.add_column(sa.Column('jira_static_labels', sa.JSON(), server_default='[]', nullable=False))
        batch.add_column(sa.Column('jira_demo_label', sa.Boolean(), server_default=sa.false(), nullable=False))
        batch.add_column(sa.Column('jira_sprint_field', sa.String(length=50), server_default='', nullable=False))
        batch.add_column(sa.Column('jira_sprint_id', sa.Integer(), nullable=True))

    with op.batch_alter_table('tasks') as batch:
        batch.add_column(sa.Column('area', sa.String(length=200), server_default='', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('tasks') as batch:
        batch.drop_column('area')

    with op.batch_alter_table('projects') as batch:
        batch.drop_column('jira_sprint_id')
        batch.drop_column('jira_sprint_field')
        batch.drop_column('jira_demo_label')
        batch.drop_column('jira_static_labels')
        batch.drop_column('task_areas')

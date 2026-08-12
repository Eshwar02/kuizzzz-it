"""quiz_assignments

Revision ID: 639a968d3a43
Revises: 2d402f1ce2a3
Create Date: 2026-08-12 18:51:54.818143

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '639a968d3a43'
down_revision: Union[str, None] = '2d402f1ce2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


quiz_visibility_enum = postgresql.ENUM('OPEN', 'ASSIGNED', name='quiz_visibility')


def upgrade() -> None:
    quiz_visibility_enum.create(op.get_bind(), checkfirst=True)
    op.create_table('quiz_assignments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('quiz_id', sa.Integer(), nullable=False),
    sa.Column('classroom_id', sa.Integer(), nullable=False),
    sa.Column('whole_class', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['classroom_id'], ['classrooms.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['quiz_id'], ['quizzes.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('quiz_id', 'classroom_id', name='uq_quiz_classroom')
    )
    op.create_table('quiz_assignment_students',
    sa.Column('assignment_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['assignment_id'], ['quiz_assignments.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('assignment_id', 'user_id')
    )
    op.add_column('quizzes', sa.Column('visibility', quiz_visibility_enum, server_default='OPEN', nullable=False))


def downgrade() -> None:
    op.drop_column('quizzes', 'visibility')
    op.drop_table('quiz_assignment_students')
    op.drop_table('quiz_assignments')
    op.execute('DROP TYPE IF EXISTS quiz_visibility')

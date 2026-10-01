"""Private feedback inbox and durable rate-limit buckets.

Revision ID: 20261001_03
Revises: 20260929_02
"""
from alembic import op
import sqlalchemy as sa
revision = '20261001_03'
down_revision = '20260929_02'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('feedback',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('request_key', sa.String(64), nullable=False, unique=True),
        sa.Column('payload_hash', sa.String(64), nullable=False),
        sa.Column('user_id', sa.String(64)), sa.Column('reply_email', sa.String(320)),
        sa.Column('category', sa.String(16), nullable=False),
        sa.Column('subject', sa.String(160), nullable=False), sa.Column('message', sa.Text(), nullable=False),
        sa.Column('page_reference', sa.String(300), nullable=False),
        sa.Column('status', sa.String(16), nullable=False), sa.Column('internal_note', sa.Text(), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('new','in_progress','resolved','spam')", name='ck_feedback_status'),
        sa.CheckConstraint("category IN ('bug','content','suggestion','general')", name='ck_feedback_category'))
    for name in ('category', 'status', 'created_at'):
        op.create_index(f'ix_feedback_{name}', 'feedback', [name])
    op.create_table('feedback_quotas',
        sa.Column('key', sa.String(64), primary_key=True), sa.Column('count', sa.Integer(), nullable=False),
        sa.Column('expires_at', sa.Integer(), nullable=False))
    op.create_index('ix_feedback_quotas_expires_at', 'feedback_quotas', ['expires_at'])
    if op.get_bind().dialect.name == 'postgresql':
        for table in ('feedback', 'feedback_quotas'):
            op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')
            # Supabase roles may have default grants; deny direct API access explicitly if present.
            for role in ('anon', 'authenticated'):
                op.execute(f"DO $$ BEGIN IF EXISTS (SELECT FROM pg_roles WHERE rolname = '{role}') THEN REVOKE ALL ON TABLE {table} FROM {role}; END IF; END; $$")


def downgrade():
    op.drop_table('feedback_quotas')
    op.drop_table('feedback')

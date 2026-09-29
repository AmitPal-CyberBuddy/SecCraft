"""Keep Supabase's public API roles away from SecCraft account tables.

Revision ID: 20260929_02
Revises: 20260929_01
Create Date: 2026-09-29
"""
from alembic import op

revision = "20260929_02"
down_revision = "20260929_01"
branch_labels = None
depends_on = None


_TABLES = (
    "user_profiles",
    "platform_admins",
    "platform_settings",
    "progress_records",
    "assessment_attempts",
    "xp_events",
    "achievement_awards",
    "admin_audit_events",
)


def upgrade() -> None:
    # No anon/authenticated policies are installed: account data is reachable only through the
    # FastAPI backend. Its restricted application DB role owns these tables. Ordinary PostgreSQL
    # and SQLite do not expose Supabase PostgREST roles, so the DDL is PostgreSQL-only.
    if op.get_bind().dialect.name == "postgresql":
        for table_name in _TABLES:
            op.execute(f'ALTER TABLE "{table_name}" ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        for table_name in reversed(_TABLES):
            op.execute(f'ALTER TABLE "{table_name}" DISABLE ROW LEVEL SECURITY')

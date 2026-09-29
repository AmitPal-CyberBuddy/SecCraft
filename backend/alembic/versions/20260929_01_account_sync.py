"""Account states, generic synchronization records, and owner-only settings/audit.

Revision ID: 20260929_01
Revises:
Create Date: 2026-09-29
"""
from alembic import op
import sqlalchemy as sa

revision = "20260929_01"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_profiles",
        sa.Column("user_id", sa.String(length=64), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("display_name", sa.String(length=64), nullable=True),
        sa.Column("account_status", sa.String(length=16), server_default="pending", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by_user_id", sa.String(length=64), nullable=True),
        sa.Column("status_reason", sa.Text(), nullable=True),
        sa.CheckConstraint("account_status IN ('pending','active','rejected','suspended')", name="ck_user_profiles_status"),
    )
    op.create_index("ix_user_profiles_email", "user_profiles", ["email"])
    op.create_index("ix_user_profiles_account_status", "user_profiles", ["account_status"])

    op.create_table(
        "platform_admins",
        sa.Column("user_id", sa.String(length=64), primary_key=True),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("added_by_user_id", sa.String(length=64), nullable=True),
    )

    op.create_table(
        "platform_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("signup_enabled", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("approved_user_limit", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_by_user_id", sa.String(length=64), nullable=True),
        sa.CheckConstraint("id = 1", name="ck_platform_settings_singleton"),
        sa.CheckConstraint("approved_user_limit IS NULL OR approved_user_limit >= 0", name="ck_platform_settings_user_limit"),
    )
    settings = sa.table(
        "platform_settings",
        sa.column("id", sa.Integer()),
        sa.column("signup_enabled", sa.Boolean()),
        sa.column("approved_user_limit", sa.Integer()),
    )
    # Fail closed: owner must explicitly open enrollment and set a capacity before approving accounts.
    op.bulk_insert(settings, [{"id": 1, "signup_enabled": False, "approved_user_limit": None}])

    op.create_table(
        "progress_records",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("user_profiles.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("path_id", sa.String(length=128), nullable=False),
        sa.Column("module_id", sa.String(length=128), nullable=False),
        sa.Column("activity_type", sa.String(length=24), nullable=False),
        sa.Column("activity_id", sa.String(length=160), nullable=False),
        sa.Column("content_version", sa.String(length=64), server_default="current", nullable=False),
        sa.Column("state", sa.String(length=16), server_default="started", nullable=False),
        sa.Column("source", sa.String(length=24), server_default="self_reported", nullable=False),
        sa.Column("verified", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("user_id", "path_id", "module_id", "activity_type", "activity_id", "content_version", name="uq_progress_record_activity"),
        sa.CheckConstraint("state IN ('started','completed')", name="ck_progress_records_state"),
        sa.CheckConstraint("source IN ('local_import','self_reported','server')", name="ck_progress_records_source"),
        sa.CheckConstraint("activity_type IN ('lesson','lab','quiz','challenge','assessment','other')", name="ck_progress_records_activity_type"),
    )
    op.create_index("ix_progress_records_user_id", "progress_records", ["user_id"])

    op.create_table(
        "assessment_attempts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("user_profiles.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("path_id", sa.String(length=128), nullable=False),
        sa.Column("assessment_id", sa.String(length=160), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("grading_status", sa.String(length=16), server_default="unverified", nullable=False),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("max_score", sa.Integer(), nullable=True),
        sa.Column("passed", sa.Boolean(), nullable=True),
        sa.Column("answer_digest", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("user_id", "idempotency_key", name="uq_attempt_user_idempotency"),
        sa.CheckConstraint("grading_status IN ('unverified','verified')", name="ck_attempts_grading_status"),
    )
    op.create_index("ix_assessment_attempts_user_id", "assessment_attempts", ["user_id"])

    op.create_table(
        "xp_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("user_profiles.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("source_id", sa.String(length=160), nullable=False),
        sa.Column("points", sa.Integer(), nullable=False),
        sa.Column("verified", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("user_id", "idempotency_key", name="uq_xp_user_idempotency"),
        sa.CheckConstraint("points >= 0", name="ck_xp_points_nonnegative"),
    )
    op.create_index("ix_xp_events_user_id", "xp_events", ["user_id"])

    op.create_table(
        "achievement_awards",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("user_profiles.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("achievement_id", sa.String(length=128), nullable=False),
        sa.Column("verified", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("awarded_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.UniqueConstraint("user_id", "achievement_id", name="uq_achievement_user_award"),
    )
    op.create_index("ix_achievement_awards_user_id", "achievement_awards", ["user_id"])

    op.create_table(
        "admin_audit_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("actor_user_id", sa.String(length=64), nullable=False),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column("target_user_id", sa.String(length=64), nullable=True),
        sa.Column("details", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
    )
    op.create_index("ix_admin_audit_events_actor_user_id", "admin_audit_events", ["actor_user_id"])
    op.create_index("ix_admin_audit_events_target_user_id", "admin_audit_events", ["target_user_id"])


def downgrade() -> None:
    op.drop_index("ix_admin_audit_events_target_user_id", table_name="admin_audit_events")
    op.drop_index("ix_admin_audit_events_actor_user_id", table_name="admin_audit_events")
    op.drop_table("admin_audit_events")
    op.drop_index("ix_achievement_awards_user_id", table_name="achievement_awards")
    op.drop_table("achievement_awards")
    op.drop_index("ix_xp_events_user_id", table_name="xp_events")
    op.drop_table("xp_events")
    op.drop_index("ix_assessment_attempts_user_id", table_name="assessment_attempts")
    op.drop_table("assessment_attempts")
    op.drop_index("ix_progress_records_user_id", table_name="progress_records")
    op.drop_table("progress_records")
    op.drop_table("platform_settings")
    op.drop_table("platform_admins")
    op.drop_index("ix_user_profiles_account_status", table_name="user_profiles")
    op.drop_index("ix_user_profiles_email", table_name="user_profiles")
    op.drop_table("user_profiles")

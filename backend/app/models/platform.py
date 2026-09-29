from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.sql import func

from app.core.database import Base


ACCOUNT_STATUSES = ("pending", "active", "rejected", "suspended")
ACTIVITY_TYPES = ("lesson", "lab", "quiz", "challenge", "assessment", "other")


class UserProfile(Base):
    """Application account state; identity and passwords remain owned by Supabase Auth."""

    __tablename__ = "user_profiles"
    __table_args__ = (
        CheckConstraint("account_status IN ('pending','active','rejected','suspended')", name="ck_user_profiles_status"),
    )

    user_id = Column(String(64), primary_key=True)  # Supabase Auth UUID (server-derived)
    email = Column(String(320), nullable=True, index=True)
    display_name = Column(String(64), nullable=True)
    account_status = Column(String(16), nullable=False, default="pending", index=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by_user_id = Column(String(64), nullable=True)
    status_reason = Column(Text, nullable=True)


class PlatformAdmin(Base):
    """Owner-managed allowlist. This is not a self-selected profile role."""

    __tablename__ = "platform_admins"

    user_id = Column(String(64), primary_key=True)  # Supabase Auth UUID
    added_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    added_by_user_id = Column(String(64), nullable=True)


class PlatformSettings(Base):
    __tablename__ = "platform_settings"
    __table_args__ = (
        CheckConstraint("id = 1", name="ck_platform_settings_singleton"),
        CheckConstraint("approved_user_limit IS NULL OR approved_user_limit >= 0", name="ck_platform_settings_user_limit"),
    )

    id = Column(Integer, primary_key=True, default=1)
    signup_enabled = Column(Boolean, nullable=False, default=False, server_default="false")
    # NULL intentionally means unconfigured; approvals fail closed until the owner sets a capacity.
    approved_user_limit = Column(Integer, nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    updated_by_user_id = Column(String(64), nullable=True)


class ProgressRecord(Base):
    """Generic server-synchronized progress. Client imports are always unverified."""

    __tablename__ = "progress_records"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "path_id", "module_id", "activity_type", "activity_id", "content_version",
            name="uq_progress_record_activity",
        ),
        CheckConstraint("state IN ('started','completed')", name="ck_progress_records_state"),
        CheckConstraint("source IN ('local_import','self_reported','server')", name="ck_progress_records_source"),
        CheckConstraint("activity_type IN ('lesson','lab','quiz','challenge','assessment','other')", name="ck_progress_records_activity_type"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(String(64), ForeignKey("user_profiles.user_id", ondelete="CASCADE"), nullable=False, index=True)
    path_id = Column(String(128), nullable=False)
    module_id = Column(String(128), nullable=False)
    activity_type = Column(String(24), nullable=False)
    activity_id = Column(String(160), nullable=False)
    content_version = Column(String(64), nullable=False, default="current")
    state = Column(String(16), nullable=False, default="started")
    source = Column(String(24), nullable=False, default="self_reported")
    verified = Column(Boolean, nullable=False, default=False, server_default="false")
    started_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class AssessmentAttempt(Base):
    """Attempt metadata is not evidence of correctness unless a server grader marks it verified."""

    __tablename__ = "assessment_attempts"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_attempt_user_idempotency"),
        CheckConstraint("grading_status IN ('unverified','verified')", name="ck_attempts_grading_status"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(String(64), ForeignKey("user_profiles.user_id", ondelete="CASCADE"), nullable=False, index=True)
    path_id = Column(String(128), nullable=False)
    assessment_id = Column(String(160), nullable=False)
    idempotency_key = Column(String(128), nullable=False)
    grading_status = Column(String(16), nullable=False, default="unverified")
    score = Column(Integer, nullable=True)
    max_score = Column(Integer, nullable=True)
    passed = Column(Boolean, nullable=True)
    answer_digest = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class XpEvent(Base):
    """Append-only XP ledger; public clients cannot choose points or mark an event verified."""

    __tablename__ = "xp_events"
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_xp_user_idempotency"),
        CheckConstraint("points >= 0", name="ck_xp_points_nonnegative"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(String(64), ForeignKey("user_profiles.user_id", ondelete="CASCADE"), nullable=False, index=True)
    idempotency_key = Column(String(160), nullable=False)
    source_type = Column(String(32), nullable=False)
    source_id = Column(String(160), nullable=False)
    points = Column(Integer, nullable=False)
    verified = Column(Boolean, nullable=False, default=False, server_default="false")
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class AchievementAward(Base):
    __tablename__ = "achievement_awards"
    __table_args__ = (UniqueConstraint("user_id", "achievement_id", name="uq_achievement_user_award"),)

    id = Column(Integer, primary_key=True)
    user_id = Column(String(64), ForeignKey("user_profiles.user_id", ondelete="CASCADE"), nullable=False, index=True)
    achievement_id = Column(String(128), nullable=False)
    verified = Column(Boolean, nullable=False, default=False, server_default="false")
    awarded_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class AdminAuditEvent(Base):
    __tablename__ = "admin_audit_events"

    id = Column(Integer, primary_key=True)
    actor_user_id = Column(String(64), nullable=False, index=True)
    action = Column(String(64), nullable=False)
    target_user_id = Column(String(64), nullable=True, index=True)
    details = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

"""Immutable, release-scoped runtime content records.

The importer is the only writer. FastAPI reads the single current release and never exposes
private payload rows or raw object keys to unauthorised callers.
"""
from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint, func, text

from app.core.database import Base


class ContentRelease(Base):
    __tablename__ = "content_releases"
    __table_args__ = (
        CheckConstraint("status IN ('staged','current','retired')", name="ck_content_release_status"),
        Index("uq_content_single_current", "status", unique=True, postgresql_where=text("status = 'current'"), sqlite_where=text("status = 'current'")),
        {"schema": "content"},
    )
    id = Column(String(100), primary_key=True)
    schema_version = Column(Integer, nullable=False)
    source_revision = Column(String(64), nullable=False)
    status = Column(String(16), nullable=False, default="staged")
    manifest_sha256 = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    activated_at = Column(DateTime(timezone=True), nullable=True)
    retired_at = Column(DateTime(timezone=True), nullable=True)


class ContentRecord(Base):
    __tablename__ = "content_records"
    __table_args__ = (
        UniqueConstraint("release_id", "stable_id", "content_type", name="uq_content_record_release_identity"),
        CheckConstraint("delivery_class IN ('public','protected-learner','server-only','instructor-only')", name="ck_content_record_delivery"),
        {"schema": "content"},
    )
    id = Column(Integer, primary_key=True, autoincrement=True)
    release_id = Column(String(100), ForeignKey("content.content_releases.id", ondelete="CASCADE"), nullable=False, index=True)
    stable_id = Column(String(300), nullable=False)
    content_type = Column(String(80), nullable=False)
    career_path_id = Column(String(128), nullable=True)
    learning_path_id = Column(String(128), nullable=True)
    module_id = Column(String(128), nullable=True)
    display_slug = Column(String(160), nullable=True)
    delivery_class = Column(String(24), nullable=False)
    source_path = Column(String(600), nullable=False)
    target_locator = Column(String(800), nullable=False)
    learner_payload = Column(JSON, nullable=True)
    body = Column(Text, nullable=True)


class ContentPrivateMaterial(Base):
    __tablename__ = "content_private_material"
    __table_args__ = (UniqueConstraint("release_id", "stable_id", "material_type", name="uq_private_material_release_identity"), {"schema": "content"})
    id = Column(Integer, primary_key=True, autoincrement=True)
    release_id = Column(String(100), ForeignKey("content.content_releases.id", ondelete="CASCADE"), nullable=False, index=True)
    stable_id = Column(String(300), nullable=False)
    material_type = Column(String(32), nullable=False)  # key | solution | instructor | raw-mixed
    payload = Column(JSON, nullable=True)
    body = Column(Text, nullable=True)
    reveal_policy = Column(String(32), nullable=False, default="never")


class ContentArtifact(Base):
    __tablename__ = "content_artifacts"
    __table_args__ = (
        UniqueConstraint("release_id", "stable_id", name="uq_content_artifact_release_identity"),
        CheckConstraint("access_class IN ('public','protected-learner','server-only','instructor-only')", name="ck_content_artifact_access"),
        {"schema": "content"},
    )
    id = Column(Integer, primary_key=True, autoincrement=True)
    release_id = Column(String(100), ForeignKey("content.content_releases.id", ondelete="CASCADE"), nullable=False, index=True)
    stable_id = Column(String(300), nullable=False)
    source_path = Column(String(600), nullable=False)
    object_key = Column(String(800), nullable=False)
    filename = Column(String(300), nullable=False)
    media_type = Column(String(160), nullable=False)
    size = Column(Integer, nullable=False)
    sha256 = Column(String(64), nullable=False)
    access_class = Column(String(24), nullable=False)
    public_sample = Column(Boolean, nullable=False, default=False)


class ContentPublicSample(Base):
    __tablename__ = "content_public_samples"
    __table_args__ = (UniqueConstraint("release_id", "stable_id", "sample_type", name="uq_public_sample_release_identity"), {"schema": "content"})
    id = Column(Integer, primary_key=True, autoincrement=True)
    release_id = Column(String(100), ForeignKey("content.content_releases.id", ondelete="CASCADE"), nullable=False, index=True)
    stable_id = Column(String(300), nullable=False)
    sample_type = Column(String(24), nullable=False)  # lesson | artifact
    approved_sha256 = Column(String(64), nullable=True)

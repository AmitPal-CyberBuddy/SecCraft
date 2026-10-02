"""Immutable content releases and private artifact metadata.

Revision ID: 20261002_04
Revises: 20261001_03
"""
from alembic import op
import sqlalchemy as sa

revision = "20261002_04"
down_revision = "20261001_03"
branch_labels = None
depends_on = None

TABLES = ("content_releases", "content_records", "content_private_material", "content_artifacts", "content_public_samples")


def upgrade() -> None:
    postgres = op.get_bind().dialect.name == "postgresql"
    schema = "content" if postgres else None
    if postgres:
        op.execute("CREATE SCHEMA IF NOT EXISTS content")
    release_fk = f"{schema + '.' if schema else ''}content_releases.id"
    op.create_table("content_releases",
        sa.Column("id", sa.String(100), primary_key=True), sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("source_revision", sa.String(64), nullable=False), sa.Column("status", sa.String(16), nullable=False),
        sa.Column("manifest_sha256", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("activated_at", sa.DateTime(timezone=True)), sa.Column("retired_at", sa.DateTime(timezone=True)),
        sa.CheckConstraint("status IN ('staged','current','retired')", name="ck_content_release_status"), schema=schema)
    op.create_index("uq_content_single_current", "content_releases", ["status"], unique=True,
        postgresql_where=sa.text("status = 'current'"), sqlite_where=sa.text("status = 'current'"), schema=schema)
    op.create_table("content_records",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("release_id", sa.String(100), sa.ForeignKey(release_fk, ondelete="CASCADE"), nullable=False),
        sa.Column("stable_id", sa.String(300), nullable=False), sa.Column("content_type", sa.String(80), nullable=False),
        sa.Column("career_path_id", sa.String(128)), sa.Column("learning_path_id", sa.String(128)), sa.Column("module_id", sa.String(128)),
        sa.Column("display_slug", sa.String(160)), sa.Column("delivery_class", sa.String(24), nullable=False),
        sa.Column("source_path", sa.String(600), nullable=False), sa.Column("target_locator", sa.String(800), nullable=False),
        sa.Column("learner_payload", sa.JSON()), sa.Column("body", sa.Text()),
        sa.UniqueConstraint("release_id", "stable_id", "content_type", name="uq_content_record_release_identity"),
        sa.CheckConstraint("delivery_class IN ('public','protected-learner','server-only','instructor-only')", name="ck_content_record_delivery"), schema=schema)
    op.create_index("ix_content_records_release_id", "content_records", ["release_id"], schema=schema)
    op.create_table("content_private_material",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("release_id", sa.String(100), sa.ForeignKey(release_fk, ondelete="CASCADE"), nullable=False),
        sa.Column("stable_id", sa.String(300), nullable=False), sa.Column("material_type", sa.String(32), nullable=False),
        sa.Column("payload", sa.JSON()), sa.Column("body", sa.Text()), sa.Column("reveal_policy", sa.String(32), nullable=False),
        sa.UniqueConstraint("release_id", "stable_id", "material_type", name="uq_private_material_release_identity"), schema=schema)
    op.create_index("ix_content_private_material_release_id", "content_private_material", ["release_id"], schema=schema)
    op.create_table("content_artifacts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("release_id", sa.String(100), sa.ForeignKey(release_fk, ondelete="CASCADE"), nullable=False),
        sa.Column("stable_id", sa.String(300), nullable=False), sa.Column("source_path", sa.String(600), nullable=False),
        sa.Column("object_key", sa.String(800), nullable=False), sa.Column("filename", sa.String(300), nullable=False),
        sa.Column("media_type", sa.String(160), nullable=False), sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False), sa.Column("access_class", sa.String(24), nullable=False),
        sa.Column("public_sample", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("release_id", "stable_id", name="uq_content_artifact_release_identity"),
        sa.CheckConstraint("access_class IN ('public','protected-learner','server-only','instructor-only')", name="ck_content_artifact_access"), schema=schema)
    op.create_index("ix_content_artifacts_release_id", "content_artifacts", ["release_id"], schema=schema)
    op.create_table("content_public_samples",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("release_id", sa.String(100), sa.ForeignKey(release_fk, ondelete="CASCADE"), nullable=False),
        sa.Column("stable_id", sa.String(300), nullable=False), sa.Column("sample_type", sa.String(24), nullable=False),
        sa.Column("approved_sha256", sa.String(64)),
        sa.UniqueConstraint("release_id", "stable_id", "sample_type", name="uq_public_sample_release_identity"), schema=schema)
    op.create_index("ix_content_public_samples_release_id", "content_public_samples", ["release_id"], schema=schema)
    if postgres:
        for table in TABLES:
            op.execute(f'ALTER TABLE content."{table}" ENABLE ROW LEVEL SECURITY')
            op.execute(f'REVOKE ALL ON TABLE content."{table}" FROM PUBLIC')
            for role in ("anon", "authenticated"):
                op.execute(f"DO $$ BEGIN IF EXISTS (SELECT FROM pg_roles WHERE rolname = '{role}') THEN REVOKE ALL ON TABLE content.\"{table}\" FROM {role}; END IF; END; $$")


def downgrade() -> None:
    postgres = op.get_bind().dialect.name == "postgresql"
    schema = "content" if postgres else None
    for table in reversed(TABLES):
        op.drop_table(table, schema=schema)
    if postgres:
        op.execute("DROP SCHEMA IF EXISTS content")

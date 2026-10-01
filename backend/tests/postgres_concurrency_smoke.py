"""Disposable-schema PostgreSQL integration check for approval-cap serialization.

Run only against a PostgreSQL test database whose user may create schemas:
  PLATFORM_TEST_POSTGRES_URL='postgresql+psycopg://...' python tests/postgres_concurrency_smoke.py
The script creates and drops one uniquely named schema; it never clears existing tables.
"""
from __future__ import annotations

import os
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Barrier

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))


def run() -> None:
    raw_url = os.environ.get("PLATFORM_TEST_POSTGRES_URL", "").strip()
    if not raw_url:
        raise RuntimeError("Set PLATFORM_TEST_POSTGRES_URL to a disposable PostgreSQL test database.")

    base_url = make_url(raw_url)
    if base_url.get_backend_name() != "postgresql":
        raise RuntimeError("PLATFORM_TEST_POSTGRES_URL must use PostgreSQL.")

    schema = f"seccraft_audit_{uuid.uuid4().hex}"
    admin_engine = create_engine(base_url, pool_pre_ping=True)
    app_engine = None
    try:
        with admin_engine.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))

        scoped_url = base_url.update_query_dict({"options": f"-csearch_path={schema}"})
        rendered_scoped_url = scoped_url.render_as_string(hide_password=False)
        os.environ.update(
            {
                "PLATFORM_ENV": "integration-test",
                "PLATFORM_DATABASE_URL": rendered_scoped_url,
                "PLATFORM_AUTO_CREATE_TABLES": "false",
                "PLATFORM_ENABLE_API_DOCS": "false",
                "PLATFORM_ALLOWED_ORIGINS": "http://localhost:3000",
                "SUPABASE_URL": "https://auth-test.invalid",
                "SUPABASE_ANON_KEY": "public-test-anon-key",
                "SUPABASE_JWT_ISSUER": "https://auth-test.invalid/auth/v1",
                "SUPABASE_JWT_SECRET": "test-only-secret-not-for-use",
                "SUPABASE_REQUIRE_VERIFIED_EMAIL": "false",
                "FEEDBACK_HMAC_SECRET": "disposable-feedback-test-key-32-bytes-minimum",
            }
        )
        if "app.core.config" in sys.modules:
            import importlib

            importlib.reload(sys.modules["app.core.config"])
        if "app.core.database" in sys.modules:
            db_module = sys.modules["app.core.database"]
            db_module.engine.dispose()
            db_module.engine = create_engine(rendered_scoped_url, pool_pre_ping=True)
            db_module.SessionLocal.configure(bind=db_module.engine)

        from alembic import command
        from alembic.config import Config

        migration_config = Config(str(BACKEND_DIR / "alembic.ini"))
        migration_config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
        command.upgrade(migration_config, "head")

        protected_tables = {
            "user_profiles",
            "platform_admins",
            "platform_settings",
            "progress_records",
            "assessment_attempts",
            "xp_events",
            "achievement_awards",
            "admin_audit_events",
            "feedback",
            "feedback_quotas",
        }
        with admin_engine.connect() as connection:
            rls_rows = connection.execute(
                text(
                    "SELECT c.relname, c.relrowsecurity "
                    "FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace "
                    "WHERE n.nspname = :schema AND c.relkind = 'r'"
                ),
                {"schema": schema},
            ).all()
        rls_enabled = {name for name, enabled in rls_rows if enabled}
        if not protected_tables.issubset(rls_enabled):
            raise AssertionError(f"PostgreSQL RLS is not enabled on all account tables: {protected_tables - rls_enabled}")

        import jwt
        from fastapi.testclient import TestClient

        from app.core import config
        from app.core.database import SessionLocal, engine
        from app.main import app
        from app.models.platform import PlatformAdmin, PlatformSettings, UserProfile

        app_engine = engine
        owner, learner_a, learner_b = (str(uuid.uuid4()) for _ in range(3))
        with SessionLocal() as db:
            db.add_all(
                [
                    PlatformAdmin(user_id=owner),
                    UserProfile(user_id=owner, email="owner@example.test", account_status="active"),
                    UserProfile(user_id=learner_a, email="a@example.test", account_status="pending"),
                    UserProfile(user_id=learner_b, email="b@example.test", account_status="pending"),
                ]
            )
            db.merge(PlatformSettings(id=1, signup_enabled=False, approved_user_limit=1))
            db.commit()

        now = int(time.time())
        owner_token = jwt.encode(
            {
                "sub": owner,
                "email": "owner@example.test",
                "aud": config.SUPABASE_JWT_AUDIENCE,
                "iss": config.SUPABASE_JWT_ISSUER,
                "iat": now,
                "exp": now + 600,
            },
            config.SUPABASE_JWT_SECRET,
            algorithm="HS256",
        )
        headers = {"Authorization": f"Bearer {owner_token}"}
        barrier = Barrier(2)

        def approve(user_id: str) -> int:
            with TestClient(app, raise_server_exceptions=False) as client:
                barrier.wait(timeout=15)
                response = client.patch(
                    f"/api/v1/admin/users/{user_id}/status",
                    headers=headers,
                    json={"account_status": "active"},
                )
                return response.status_code

        with ThreadPoolExecutor(max_workers=2) as workers:
            statuses = sorted(workers.map(approve, (learner_a, learner_b)))
        if statuses != [200, 409]:
            raise AssertionError(f"Expected exactly one approval and one capacity rejection; received {statuses}.")

        with SessionLocal() as db:
            active_learners = (
                db.query(UserProfile)
                .filter(UserProfile.user_id.in_([learner_a, learner_b]), UserProfile.account_status == "active")
                .count()
            )
        if active_learners != 1:
            raise AssertionError(f"Approved-user limit was exceeded or no user was approved: {active_learners}.")
        from app.models.feedback import Feedback, FeedbackQuota
        def submit_feedback(_):
            with TestClient(app, raise_server_exceptions=False) as client:
                return client.post('/api/v1/feedback', json={
                    'request_id': str(uuid.uuid4()), 'category': 'bug',
                    'subject': 'Disposable concurrency test', 'message': 'This is a test in an isolated schema.',
                }).status_code
        with ThreadPoolExecutor(max_workers=8) as workers:
            feedback_statuses = list(workers.map(submit_feedback, range(12)))
        if feedback_statuses.count(201) != config.FEEDBACK_GUEST_HOUR or any(status not in (201, 429) for status in feedback_statuses):
            raise AssertionError(f'PostgreSQL feedback quota failed: {feedback_statuses}')
        with SessionLocal() as db:
            assert db.query(Feedback).count() == config.FEEDBACK_GUEST_HOUR
            assert {row.count for row in db.query(FeedbackQuota)} == {config.FEEDBACK_GUEST_HOUR}
        print('PostgreSQL feedback concurrent quota and transaction rollback checks passed.')
        print("PostgreSQL concurrent approval test passed: one approval, one capacity rejection, active learner count = 1.")
    finally:
        if app_engine is not None:
            app_engine.dispose()
        with admin_engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        admin_engine.dispose()


if __name__ == "__main__":
    run()

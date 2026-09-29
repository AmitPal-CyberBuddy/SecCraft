"""Contract/security tests for public content, Supabase identity, owner approval, and sync isolation."""
from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
TEST_DB = Path(tempfile.gettempdir()) / f"seccraft-api-v1-{os.getpid()}.sqlite"
os.environ["PLATFORM_ENV"] = "test"
os.environ["PLATFORM_DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["PLATFORM_AUTO_CREATE_TABLES"] = "true"
os.environ["PLATFORM_ENABLE_API_DOCS"] = "false"
os.environ["PLATFORM_ALLOWED_ORIGINS"] = "http://localhost:3000,http://localhost:5173"
os.environ["SUPABASE_URL"] = "https://auth-test.invalid"
os.environ["SUPABASE_ANON_KEY"] = "public-test-anon-key"
os.environ["SUPABASE_JWT_ISSUER"] = "https://auth-test.invalid/auth/v1"
os.environ["SUPABASE_JWT_SECRET"] = "test-only-secret-not-for-use"
os.environ["SUPABASE_REQUIRE_VERIFIED_EMAIL"] = "false"

import jwt  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy.exc import OperationalError  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.api.v1 import accounts  # noqa: E402
from app.core import config  # noqa: E402
from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.core.rate_limit import SlidingWindowLimiter, signup_limiter  # noqa: E402
from app.main import app  # noqa: E402
from app.models.platform import (  # noqa: E402
    AchievementAward,
    AdminAuditEvent,
    PlatformAdmin,
    PlatformSettings,
    ProgressRecord,
    UserProfile,
    XpEvent,
)
from app.services.rewards import award_achievement, award_verified_xp  # noqa: E402


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client
    engine.dispose()
    TEST_DB.unlink(missing_ok=True)


@pytest.fixture(autouse=True)
def clean_database():
    if engine.dialect.name != "sqlite":
        pytest.skip("These contract tests require the isolated SQLite test database")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    signup_limiter._events.clear()
    yield


def token(user_id: str, email: str = "learner@example.test") -> str:
    now = int(time.time())
    return jwt.encode(
        {
            "sub": user_id,
            "email": email,
            "aud": config.SUPABASE_JWT_AUDIENCE,
            "iss": config.SUPABASE_JWT_ISSUER,
            "iat": now,
            "exp": now + 1800,
        },
        config.SUPABASE_JWT_SECRET,
        algorithm="HS256",
    )


def auth_headers(user_id: str, email: str | None = None) -> dict[str, str]:
    return {"Authorization": f"Bearer {token(user_id, email or f'{user_id}@example.test')}"}


def seed_settings(*, signup_enabled: bool = False, approved_user_limit: int | None = None) -> None:
    with SessionLocal() as db:
        db.add(PlatformSettings(id=1, signup_enabled=signup_enabled, approved_user_limit=approved_user_limit))
        db.commit()


def seed_profile(user_id: str, status: str = "pending", email: str | None = None) -> None:
    with SessionLocal() as db:
        profile = db.get(UserProfile, user_id)
        if profile is None:
            profile = UserProfile(user_id=user_id, email=email or f"{user_id}@example.test", account_status=status)
            db.add(profile)
        else:
            profile.account_status = status
            if email:
                profile.email = email
        db.commit()


def seed_admin(user_id: str) -> None:
    with SessionLocal() as db:
        db.add(PlatformAdmin(user_id=user_id))
        db.add(UserProfile(user_id=user_id, email=f"{user_id}@example.test", account_status="active"))
        db.commit()


def test_api_contract_public_content_and_disabled_legacy_routes(client: TestClient) -> None:
    expected = {"/api/health", "/api/modules", "/api/learning-paths", "/api/platform", "/api/pcaps"}
    mounted = {route.path for route in app.routes}
    assert expected.issubset(mounted)
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/modules").status_code == 200
    assert client.get("/api/learning-paths").status_code == 200
    assert client.get("/api/platform").json()["name"] == "SecCraft"
    assert client.get("/api/pcaps").status_code == 200
    for route in ("/api/progress", "/api/auth/login", "/api/labs/validate", "/api/pcaps/upload", "/api/analytics/overview"):
        assert client.get(route).status_code == 404 if route != "/api/pcaps/upload" else client.post(route).status_code == 404
    assert client.get("/modules").status_code == 404


def test_docs_and_cors_are_restricted(client: TestClient) -> None:
    assert app.docs_url is None
    assert client.get("/api/docs").status_code == 404
    good = client.options(
        "/api/v1/progress",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert good.status_code == 200
    assert good.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert "*" not in good.headers.get("access-control-allow-methods", "")
    bad = client.options(
        "/api/v1/progress",
        headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "GET"},
    )
    assert bad.headers.get("access-control-allow-origin") is None


def test_production_configuration_fails_closed_for_sqlite_and_insecure_origins() -> None:
    base_env = os.environ.copy()
    base_env.update({
        "PLATFORM_ENV": "production",
        "PLATFORM_DATABASE_URL": "postgresql+psycopg://seccraft:placeholder@db.example.test/seccraft",
        "PLATFORM_ALLOWED_ORIGINS": "https://learn.example.test",
        "SUPABASE_URL": "https://auth.example.test",
        "SUPABASE_ANON_KEY": "public-test-anon-key",
        "SUPABASE_JWT_ISSUER": "https://auth.example.test/auth/v1",
        "SUPABASE_JWKS_URL": "https://auth.example.test/auth/v1/.well-known/jwks.json",
        "SUPABASE_EMAIL_REDIRECT_URL": "https://learn.example.test/account?sent=1",
    })
    base_env["PYTHONPATH"] = str(BACKEND_DIR)

    sqlite_env = {**base_env, "PLATFORM_DATABASE_URL": "sqlite:////tmp/seccraft-production-must-not-use-sqlite.db"}
    sqlite = subprocess.run([sys.executable, "-c", "import app.core.config"], cwd=BACKEND_DIR, env=sqlite_env, capture_output=True, text=True)
    assert sqlite.returncode != 0
    assert "requires PLATFORM_DATABASE_URL" in sqlite.stderr

    staging = subprocess.run(
        [sys.executable, "-c", "import app.core.config"],
        cwd=BACKEND_DIR,
        env={**base_env, "PLATFORM_ENV": "staging", "PLATFORM_DATABASE_URL": "sqlite:////tmp/seccraft-staging-must-not-use-sqlite.db"},
        capture_output=True,
        text=True,
    )
    assert staging.returncode != 0
    assert "requires PLATFORM_DATABASE_URL" in staging.stderr

    insecure_origin_env = {**base_env, "PLATFORM_ALLOWED_ORIGINS": "http://learn.example.test"}
    insecure_origin = subprocess.run([sys.executable, "-c", "import app.core.config"], cwd=BACKEND_DIR, env=insecure_origin_env, capture_output=True, text=True)
    assert insecure_origin.returncode != 0
    assert "Production browser origins must use HTTPS" in insecure_origin.stderr

    empty_origins = subprocess.run(
        [sys.executable, "-c", "import app.core.config"],
        cwd=BACKEND_DIR,
        env={**base_env, "PLATFORM_ALLOWED_ORIGINS": " , "},
        capture_output=True,
        text=True,
    )
    assert empty_origins.returncode != 0
    assert "at least one explicit browser origin" in empty_origins.stderr

    invalid_bool = subprocess.run(
        [sys.executable, "-c", "import app.core.config"],
        cwd=BACKEND_DIR,
        env={**base_env, "SUPABASE_REQUIRE_VERIFIED_EMAIL": "treu"},
        capture_output=True,
        text=True,
    )
    assert invalid_bool.returncode != 0
    assert "must be an explicit true/false value" in invalid_bool.stderr

    valid = subprocess.run([sys.executable, "-c", "import app.core.config"], cwd=BACKEND_DIR, env=base_env, capture_output=True, text=True)
    assert valid.returncode == 0, valid.stderr


def test_account_bootstrap_is_pending_and_token_validation_fails_closed(client: TestClient) -> None:
    user_id = str(uuid.uuid4())
    response = client.get("/api/v1/account", headers=auth_headers(user_id, "new@example.test"))
    assert response.status_code == 200
    account = response.json()
    assert account["account_status"] == "pending"
    assert account["is_admin"] is False
    assert account["email"] == "new@example.test"
    assert "role" not in account

    invalid = client.get("/api/v1/account", headers={"Authorization": "Bearer forged.token.value"})
    assert invalid.status_code == 401
    assert client.get("/api/v1/account").status_code == 401


def test_signup_toggle_is_enforced_by_the_api_before_provider_call(client: TestClient) -> None:
    response = client.post("/api/v1/auth/signup", json={"email": "new@example.test", "password": "long-password-123"})
    assert response.status_code == 403
    assert "closed" in response.json()["detail"].lower()


def test_signup_proxy_rate_limit_and_non_enumerating_provider_errors(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    seed_settings(signup_enabled=True)
    original_limit = config.SIGNUP_LIMIT_PER_MINUTE
    config.SIGNUP_LIMIT_PER_MINUTE = 1

    class FakeResponse:
        status_code = 200
        def json(self):
            return {"user": {"id": "pending-user"}, "session": None}

    class FakeAsyncClient:
        async def __aenter__(self):
            return self
        async def __aexit__(self, *_args):
            return None
        async def post(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr(accounts.httpx, "AsyncClient", lambda **_kwargs: FakeAsyncClient())
    payload = {"email": " NEW@example.test ", "password": "long-password-123"}
    first = client.post("/api/v1/auth/signup", json=payload)
    second = client.post("/api/v1/auth/signup", json=payload)
    config.SIGNUP_LIMIT_PER_MINUTE = original_limit
    assert first.status_code == 200
    assert second.status_code == 429
    assert second.json()["detail"]


def test_signup_rate_limiter_prunes_expired_client_buckets(monkeypatch: pytest.MonkeyPatch) -> None:
    import app.core.rate_limit as limiter_module

    clock = [100.0]
    monkeypatch.setattr(limiter_module, "monotonic", lambda: clock[0])
    limiter = SlidingWindowLimiter()
    for index in range(100):
        assert limiter.allow(f"client-{index}", limit=1, window_seconds=60)
    assert len(limiter._events) == 100

    clock[0] = 160.0
    assert limiter.allow("fresh-client", limit=1, window_seconds=60)
    assert list(limiter._events) == ["fresh-client"]


def test_pending_users_cannot_sync_and_admin_allowlist_is_not_user_selectable(client: TestClient) -> None:
    user_id = str(uuid.uuid4())
    payload = {"records": [{"path_id": "wireless-pentesting", "module_id": "m1", "activity_type": "lesson", "activity_id": "l1", "state": "completed"}]}
    response = client.post("/api/v1/progress/import/preview", headers=auth_headers(user_id), json=payload)
    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "account_pending"

    forged_role = client.patch(
        "/api/v1/admin/settings",
        headers=auth_headers(user_id),
        json={"role": "admin", "signup_enabled": True},
    )
    assert forged_role.status_code == 403
    seed_profile(user_id, status="active")
    forged_role = client.patch(
        "/api/v1/admin/settings",
        headers=auth_headers(user_id),
        json={"role": "admin", "signup_enabled": True},
    )
    assert forged_role.status_code == 403


@pytest.mark.parametrize("status", ["pending", "rejected", "suspended"])
def test_nonactive_account_states_are_denied_every_synced_route(client: TestClient, status: str) -> None:
    user_id = str(uuid.uuid4())
    seed_profile(user_id, status=status)
    headers = auth_headers(user_id)
    record = {"path_id": "wireless-pentesting", "module_id": "m1", "activity_type": "lesson", "activity_id": "l1", "state": "completed"}
    attempt = {
        "path_id": "wireless-pentesting",
        "assessment_id": "assessment-01",
        "idempotency_key": f"blocked-{status}-0001",
        "responses": {"q1": "a"},
    }
    for method, path, body in (
        ("get", "/api/v1/progress", None),
        ("get", "/api/v1/attempts", None),
        ("post", "/api/v1/progress/import/preview", {"records": [record]}),
        ("post", "/api/v1/progress/import", {"records": [record]}),
        ("post", "/api/v1/attempts", attempt),
    ):
        response = getattr(client, method)(path, headers=headers, json=body) if body is not None else getattr(client, method)(path, headers=headers)
        assert response.status_code == 403, (status, method, path, response.text)
        assert response.json()["detail"]["code"] == f"account_{status}"


def test_admin_apis_are_owner_only_for_regular_active_accounts(client: TestClient) -> None:
    regular, target = str(uuid.uuid4()), str(uuid.uuid4())
    seed_profile(regular, status="active")
    seed_profile(target, status="pending")
    headers = auth_headers(regular)
    routes = (
        ("get", "/api/v1/admin/settings", None),
        ("get", "/api/v1/admin/users", None),
        ("get", "/api/v1/admin/audit", None),
        ("patch", "/api/v1/admin/settings", {"signup_enabled": True}),
        ("patch", f"/api/v1/admin/users/{target}/status", {"account_status": "active"}),
    )
    for method, path, body in routes:
        response = getattr(client, method)(path, headers=headers, json=body) if body is not None else getattr(client, method)(path, headers=headers)
        assert response.status_code == 403, (method, path, response.text)


def test_admin_approval_capacity_suspension_and_audit(client: TestClient) -> None:
    owner = str(uuid.uuid4())
    first_user = str(uuid.uuid4())
    second_user = str(uuid.uuid4())
    seed_admin(owner)
    seed_settings(signup_enabled=False, approved_user_limit=1)
    seed_profile(first_user)
    seed_profile(second_user)

    settings = client.get("/api/v1/admin/settings", headers=auth_headers(owner))
    assert settings.status_code == 200
    assert settings.json()["approved_user_limit"] == 1

    approved = client.patch(
        f"/api/v1/admin/users/{first_user}/status",
        headers=auth_headers(owner),
        json={"account_status": "active"},
    )
    assert approved.status_code == 200
    full = client.patch(
        f"/api/v1/admin/users/{second_user}/status",
        headers=auth_headers(owner),
        json={"account_status": "active"},
    )
    assert full.status_code == 409

    suspended = client.patch(
        f"/api/v1/admin/users/{first_user}/status",
        headers=auth_headers(owner),
        json={"account_status": "suspended", "reason": "Access paused"},
    )
    assert suspended.status_code == 200
    second_approved = client.patch(
        f"/api/v1/admin/users/{second_user}/status",
        headers=auth_headers(owner),
        json={"account_status": "active"},
    )
    assert second_approved.status_code == 200
    audit = client.get("/api/v1/admin/audit", headers=auth_headers(owner)).json()["events"]
    assert any(event["action"] == "account.status_changed" for event in audit)

    regular = str(uuid.uuid4())
    seed_profile(regular, status="active")
    assert client.get("/api/v1/admin/users", headers=auth_headers(regular)).status_code == 403


def test_owner_allowlist_is_separate_from_learner_approval_and_capacity(client: TestClient) -> None:
    owner = str(uuid.uuid4())
    seed_admin(owner)
    seed_settings(approved_user_limit=0)
    settings = client.get("/api/v1/admin/settings", headers=auth_headers(owner))
    assert settings.status_code == 200
    assert settings.json()["active_approved_users"] == 0
    pending = client.get("/api/v1/admin/users?status=pending", headers=auth_headers(owner))
    assert pending.status_code == 200
    assert all(user["user_id"] != owner for user in pending.json()["users"])
    change_owner = client.patch(
        f"/api/v1/admin/users/{owner}/status",
        headers=auth_headers(owner),
        json={"account_status": "suspended"},
    )
    assert change_owner.status_code == 409


def test_approval_fails_closed_until_capacity_is_configured(client: TestClient) -> None:
    owner, learner = str(uuid.uuid4()), str(uuid.uuid4())
    seed_admin(owner)
    seed_settings(approved_user_limit=None)
    seed_profile(learner)
    response = client.patch(
        f"/api/v1/admin/users/{learner}/status",
        headers=auth_headers(owner),
        json={"account_status": "active"},
    )
    assert response.status_code == 409
    assert "limit" in response.json()["detail"].lower()


def test_progress_import_is_merged_as_unverified_and_scoped_to_token_user(client: TestClient) -> None:
    first_user, second_user = str(uuid.uuid4()), str(uuid.uuid4())
    seed_profile(first_user, status="active")
    seed_profile(second_user, status="active")
    record = {"path_id": "path-generic", "module_id": "module-one", "activity_type": "lesson", "activity_id": "lesson-one", "state": "completed"}
    payload = {"records": [record, record]}

    preview = client.post("/api/v1/progress/import/preview", headers=auth_headers(first_user), json=payload)
    assert preview.status_code == 200
    assert preview.json()["incoming_records"] == 2
    assert preview.json()["unique_records"] == 1
    assert preview.json()["would_insert"] == 1
    assert preview.json()["imported_records_are_verified"] is False

    merged = client.post("/api/v1/progress/import", headers=auth_headers(first_user), json=payload)
    assert merged.status_code == 200
    assert merged.json()["inserted"] == 1
    assert merged.json()["xp_awarded"] == 0
    again = client.post("/api/v1/progress/import", headers=auth_headers(first_user), json=payload)
    assert again.status_code == 200
    assert again.json()["unchanged"] == 1

    # Supplying another UUID in the URL cannot select another account's records.
    first_progress = client.get(f"/api/v1/progress?user_id={second_user}", headers=auth_headers(first_user)).json()
    second_progress = client.get(f"/api/v1/progress?user_id={first_user}", headers=auth_headers(second_user)).json()
    assert len(first_progress["records"]) == 1
    assert first_progress["records"][0]["verified"] is False
    assert first_progress["records"][0]["source"] == "local_import"
    assert second_progress["records"] == []
    assert first_progress["xp"]["total"] == 0

    forged_owner = {"records": [{**record, "user_id": second_user}]}
    assert client.post("/api/v1/progress/import", headers=auth_headers(first_user), json=forged_owner).status_code == 422
    forged_reward = {"records": [{**record, "points": 999, "verified": True}]}
    assert client.post("/api/v1/progress/import", headers=auth_headers(first_user), json=forged_reward).status_code == 422


def test_import_never_overwrites_verified_server_progress(client: TestClient) -> None:
    user_id = str(uuid.uuid4())
    seed_profile(user_id, status="active")
    with SessionLocal() as db:
        db.add(ProgressRecord(
            user_id=user_id, path_id="path", module_id="module", activity_type="lesson",
            activity_id="lesson", content_version="current", state="completed", source="server", verified=True,
        ))
        db.commit()
    payload = {"records": [{"path_id": "path", "module_id": "module", "activity_type": "lesson", "activity_id": "lesson", "content_version": "current", "state": "started"}]}
    merged = client.post("/api/v1/progress/import", headers=auth_headers(user_id), json=payload)
    assert merged.status_code == 200
    assert merged.json()["verified_server_records_preserved"] == 1
    record = client.get("/api/v1/progress", headers=auth_headers(user_id)).json()["records"][0]
    assert record["verified"] is True
    assert record["state"] == "completed"


def test_verified_reward_primitives_are_idempotent_and_not_publicly_writable(client: TestClient) -> None:
    user_id = str(uuid.uuid4())
    seed_profile(user_id, status="active")
    with SessionLocal() as db:
        first, created = award_verified_xp(db, user_id=user_id, idempotency_key="quiz:q1:attempt-1", source_type="assessment", source_id="q1", points=20)
        db.commit()
        second, created_again = award_verified_xp(db, user_id=user_id, idempotency_key="quiz:q1:attempt-1", source_type="assessment", source_id="q1", points=999)
        db.commit()
        assert first.id == second.id
        assert created is True
        assert created_again is False
        award, awarded = award_achievement(db, user_id=user_id, achievement_id="first_verified_assessment")
        db.commit()
        same_award, awarded_again = award_achievement(db, user_id=user_id, achievement_id="first_verified_assessment")
        db.commit()
        assert award.id == same_award.id
        assert awarded is True and awarded_again is False
        assert db.query(XpEvent).filter_by(user_id=user_id).count() == 1
        assert db.query(AchievementAward).filter_by(user_id=user_id).count() == 1
        db.add(XpEvent(
            user_id=user_id,
            idempotency_key="unverified-manual-event",
            source_type="import",
            source_id="untrusted-browser",
            points=999,
            verified=False,
        ))
        db.commit()

    result = client.get("/api/v1/progress", headers=auth_headers(user_id)).json()
    assert result["xp"] == {"total": 20, "verified": True, "source": "server ledger"}
    assert result["achievements"][0]["verified"] is True
    assert client.post("/api/v1/xp", headers=auth_headers(user_id), json={"points": 999}).status_code == 404


def test_attempts_are_owned_unverified_and_cannot_award_rewards(client: TestClient) -> None:
    first_user, second_user = str(uuid.uuid4()), str(uuid.uuid4())
    seed_profile(first_user, status="active")
    seed_profile(second_user, status="active")
    payload = {
        "path_id": "generic-path",
        "assessment_id": "assessment-01",
        "idempotency_key": "browser-attempt-0001",
        "responses": {"q1": "option-a", "q2": "option-c"},
    }
    first = client.post("/api/v1/attempts", headers=auth_headers(first_user), json=payload)
    assert first.status_code == 200
    body = first.json()
    assert body["grading_status"] == "unverified"
    assert body["verified"] is False
    assert body["xp_awarded"] == 0
    assert "answer_digest" not in body

    duplicate = client.post("/api/v1/attempts", headers=auth_headers(first_user), json=payload)
    assert duplicate.status_code == 200
    assert duplicate.json()["recorded"] is False
    mismatched_answers = client.post("/api/v1/attempts", headers=auth_headers(first_user), json={**payload, "responses": {"q1": "different"}})
    assert mismatched_answers.status_code == 409
    reused_key = client.post("/api/v1/attempts", headers=auth_headers(first_user), json={**payload, "assessment_id": "different-assessment"})
    assert reused_key.status_code == 409
    assert client.get(f"/api/v1/attempts?user_id={second_user}", headers=auth_headers(first_user)).json()["count"] == 1
    assert client.get(f"/api/v1/attempts?user_id={first_user}", headers=auth_headers(second_user)).json()["attempts"] == []
    assert client.get("/api/v1/progress", headers=auth_headers(first_user)).json()["xp"]["total"] == 0

    forged_score = client.post("/api/v1/attempts", headers=auth_headers(first_user), json={**payload, "idempotency_key": "browser-attempt-0002", "score": 100, "passed": True})
    assert forged_score.status_code == 422


def test_transient_database_failures_are_not_misreported_as_conflicts(monkeypatch: pytest.MonkeyPatch) -> None:
    user_id = str(uuid.uuid4())
    seed_profile(user_id, status="active")

    def fail_commit(_session: Session) -> None:
        raise OperationalError("COMMIT", {}, RuntimeError("simulated database outage"))

    monkeypatch.setattr(Session, "commit", fail_commit)
    payload = {
        "path_id": "generic-path",
        "assessment_id": "assessment-01",
        "idempotency_key": "database-failure-0001",
        "responses": {"q1": "option-a"},
    }
    progress = {"records": [{"path_id": "generic-path", "module_id": "m1", "activity_type": "lesson", "activity_id": "l1", "state": "completed"}]}
    with TestClient(app, raise_server_exceptions=False) as failing_client:
        attempt_response = failing_client.post("/api/v1/attempts", headers=auth_headers(user_id), json=payload)
        merge_response = failing_client.post("/api/v1/progress/import", headers=auth_headers(user_id), json=progress)
    assert attempt_response.status_code == 500
    assert merge_response.status_code == 500


def test_email_verification_is_checked_server_side(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    import app.api.v1.dependencies as identity_dependencies

    user_id = str(uuid.uuid4())
    monkeypatch.setattr(config, "REQUIRE_VERIFIED_EMAIL", True)

    class FakeResponse:
        status_code = 200
        def __init__(self, confirmed: bool):
            self.confirmed = confirmed
        def json(self):
            return {"id": user_id, "email": "verified@example.test", "email_confirmed_at": "2026-09-29T00:00:00Z" if self.confirmed else None}

    class FakeAsyncClient:
        def __init__(self, confirmed: bool):
            self.confirmed = confirmed
        async def __aenter__(self):
            return self
        async def __aexit__(self, *_args):
            return None
        async def get(self, *_args, **_kwargs):
            return FakeResponse(self.confirmed)

    monkeypatch.setattr(identity_dependencies.httpx, "AsyncClient", lambda **_kwargs: FakeAsyncClient(False))
    unverified = client.get("/api/v1/account", headers=auth_headers(user_id))
    assert unverified.status_code == 403
    assert unverified.json()["detail"]["code"] == "email_not_verified"

    monkeypatch.setattr(identity_dependencies.httpx, "AsyncClient", lambda **_kwargs: FakeAsyncClient(True))
    verified = client.get("/api/v1/account", headers=auth_headers(user_id))
    assert verified.status_code == 200
    assert verified.json()["account_status"] == "pending"


def test_postgres_smoke_url_preserves_password_and_config_reads_runtime_env(monkeypatch: pytest.MonkeyPatch) -> None:
    from sqlalchemy.engine import make_url

    base_url = make_url("postgresql+psycopg://postgres.projectref:s3cr3t-pass@pooler.example.test:5432/postgres")
    scoped_url = base_url.update_query_dict({"options": "-csearch_path=seccraft_audit_test"})
    # SQLAlchemy 2.x str(URL) masks passwords with '***'; the smoke test must use render_as_string(hide_password=False).
    assert make_url(str(scoped_url)).password == "***"
    rendered = scoped_url.render_as_string(hide_password=False)
    reparsed = make_url(rendered)
    assert reparsed.username == "postgres.projectref"
    assert reparsed.password == "s3cr3t-pass"
    assert reparsed.query.get("options") == "-csearch_path=seccraft_audit_test"

    monkeypatch.setenv("PLATFORM_DATABASE_URL", rendered)
    assert config.get_database_url() == rendered


def test_postgres_concurrent_approval_capacity_when_test_database_is_configured() -> None:
    test_database_url = os.environ.get("PLATFORM_TEST_POSTGRES_URL")
    if not test_database_url:
        pytest.skip("No disposable PostgreSQL test URL is configured; SQLite cannot verify SELECT FOR UPDATE behavior.")
    env = {**os.environ, "PLATFORM_TEST_POSTGRES_URL": test_database_url}
    result = subprocess.run(
        [sys.executable, str(BACKEND_DIR / "tests" / "postgres_concurrency_smoke.py")],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        timeout=180,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "concurrent approval test passed" in result.stdout


def test_path_parameters_and_pcap_filters_are_bounded(client: TestClient) -> None:
    assert client.get("/api/content/../../etc/passwd/hosts").status_code in {404, 422}
    assert client.get("/api/pcaps/..%2F..%2Fetc%2Fpasswd/analyze").status_code in {404, 422}
    assert client.get("/api/pcaps/example/frames?limit=0").status_code == 422
    assert client.get("/api/pcaps/example/frames?offset=-1").status_code == 422
    assert client.get("/api/pcaps/example/analyze?filter=" + ("x" * 513)).status_code == 422

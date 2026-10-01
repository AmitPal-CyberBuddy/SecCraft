"""Tests for the authenticated content delivery and public catalogue boundary."""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
TEST_DB = Path(tempfile.gettempdir()) / f"seccraft-content-gating-{os.getpid()}.sqlite"
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
from sqlalchemy.orm import Session  # noqa: E402

from app.core import config  # noqa: E402
from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.platform import PlatformAdmin, PlatformSettings, UserProfile  # noqa: E402


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as test_client:
        yield test_client
    engine.dispose()
    TEST_DB.unlink(missing_ok=True)


import time

def make_token(user_id: str, email: str = "test@example.com") -> str:
    now = int(time.time())
    claims = {
        "sub": user_id,
        "email": email,
        "iss": config.SUPABASE_JWT_ISSUER,
        "aud": config.SUPABASE_JWT_AUDIENCE,
        "iat": now,
        "exp": now + 3600,
    }
    return jwt.encode(claims, config.SUPABASE_JWT_SECRET, algorithm="HS256")


def set_user_status(user_id: str, status: str, *, is_admin: bool = False, email: str = "test@example.com") -> None:
    with SessionLocal() as db:
        user = db.get(UserProfile, user_id)
        if not user:
            user = UserProfile(user_id=user_id, email=email, account_status=status)
            db.add(user)
        else:
            user.account_status = status
            user.email = email
        if is_admin:
            if not db.get(PlatformAdmin, user_id):
                db.add(PlatformAdmin(user_id=user_id))
        else:
            admin = db.get(PlatformAdmin, user_id)
            if admin:
                db.delete(admin)
        db.commit()


def test_public_catalog_endpoints(client: TestClient) -> None:
    # 1. Public catalog endpoint
    res = client.get("/api/v1/content/catalog")
    assert res.status_code == 200
    data = res.json()
    assert "paths" in data and len(data["paths"]) >= 2
    assert "modules" in data and len(data["modules"]) >= 27
    assert "skills" in data

    # Verify no raw markdown bodies in public catalog
    for m in data["modules"]:
        assert "description" in m
        assert "lessons_count" in m
        for l in m.get("lessons", []):
            assert "content" not in l, "Raw markdown content must not leak in public catalog"

    # 2. Public path overview
    res_path = client.get("/api/v1/content/paths/android-pentesting")
    assert res_path.status_code == 200
    path_data = res_path.json()
    assert path_data["id"] == "android-pentesting"
    assert "modules_detail" in path_data
    assert len(path_data["modules_detail"]) >= 12

    # 404 for invalid path
    assert client.get("/api/v1/content/paths/nonexistent-path").status_code == 404
    assert client.get("/api/v1/content/paths/..%2F..%2Fetc").status_code in {404, 422}

    # 3. Public module overview
    res_mod = client.get("/api/v1/content/modules/android-01-platform/overview")
    assert res_mod.status_code == 200
    mod_data = res_mod.json()
    assert mod_data["id"] == "android-01-platform"
    assert "lessons" in mod_data
    assert len(mod_data["lessons"]) == 4
    for l in mod_data["lessons"]:
        assert "content" not in l, "Raw markdown content must not leak in module overview"

    # 404 for invalid module
    assert client.get("/api/v1/content/modules/nonexistent-mod/overview").status_code == 404


def test_authenticated_lesson_gating(client: TestClient) -> None:
    target_mod = "android-01-platform"
    target_lesson = "01-architecture-sandbox-and-trust-boundaries"

    # 1. Unauthenticated request fails closed with 401
    anon_res = client.get(f"/api/v1/content/lessons/{target_mod}/{target_lesson}")
    assert anon_res.status_code == 401, "Anonymous request must be rejected"

    # 2. Pending user fails closed with 403 (account_pending)
    pending_id = "user-pending-123"
    set_user_status(pending_id, "pending")
    pending_token = make_token(pending_id)
    pending_res = client.get(
        f"/api/v1/content/lessons/{target_mod}/{target_lesson}",
        headers={"Authorization": f"Bearer {pending_token}"},
    )
    assert pending_res.status_code == 403
    assert pending_res.json()["detail"]["code"] == "account_pending"

    # 3. Rejected user fails closed with 403 (account_rejected)
    rejected_id = "user-rejected-123"
    set_user_status(rejected_id, "rejected")
    rejected_token = make_token(rejected_id)
    rejected_res = client.get(
        f"/api/v1/content/lessons/{target_mod}/{target_lesson}",
        headers={"Authorization": f"Bearer {rejected_token}"},
    )
    assert rejected_res.status_code == 403
    assert rejected_res.json()["detail"]["code"] == "account_rejected"

    # 4. Active user succeeds with 200 and receives markdown content
    active_id = "user-active-123"
    set_user_status(active_id, "active")
    active_token = make_token(active_id)
    active_res = client.get(
        f"/api/v1/content/lessons/{target_mod}/{target_lesson}",
        headers={"Authorization": f"Bearer {active_token}"},
    )
    assert active_res.status_code == 200
    lesson_data = active_res.json()
    assert lesson_data["module_id"] == target_mod
    assert lesson_data["lesson_id"] == target_lesson
    assert "Linux UID" in lesson_data["content"]
    assert len(lesson_data["content"]) > 1000

    # 5. Platform Admin succeeds with 200
    admin_id = "user-admin-123"
    set_user_status(admin_id, "pending", is_admin=True)  # Admin overrides pending status
    admin_token = make_token(admin_id)
    admin_res = client.get(
        f"/api/v1/content/lessons/{target_mod}/{target_lesson}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_res.status_code == 200

    # 6. Traversal attempts rejected
    assert client.get(
        "/api/v1/content/lessons/..%2F..%2Fetc/passwd",
        headers={"Authorization": f"Bearer {active_token}"},
    ).status_code in {404, 422}


def test_authenticated_quizzes_and_labs(client: TestClient) -> None:
    active_id = "user-active-123"
    set_user_status(active_id, "active")
    active_token = make_token(active_id)

    # 1. Quizzes require auth
    anon_quiz = client.get("/api/v1/content/quizzes/android-01-platform")
    assert anon_quiz.status_code == 401

    auth_quiz = client.get(
        "/api/v1/content/quizzes/android-01-platform",
        headers={"Authorization": f"Bearer {active_token}"},
    )
    assert auth_quiz.status_code == 200
    quiz_data = auth_quiz.json()
    assert quiz_data["module_id"] == "android-01-platform"
    assert len(quiz_data["questions"]) == 6

    # 2. Labs require auth
    anon_lab = client.get("/api/v1/content/labs/lab-05-recon")
    assert anon_lab.status_code == 401

    auth_lab = client.get(
        "/api/v1/content/labs/lab-05-recon",
        headers={"Authorization": f"Bearer {active_token}"},
    )
    assert auth_lab.status_code == 200
    lab_data = auth_lab.json()
    assert lab_data["id"] == "lab-05-recon"

    # 3. Artifact download requires active auth
    anon_art = client.get("/api/v1/content/artifacts/wireless/WF-AUTH-03.zip")
    assert anon_art.status_code == 401

    auth_art = client.get(
        "/api/v1/content/artifacts/wireless/WF-AUTH-03.zip",
        headers={"Authorization": f"Bearer {active_token}"},
    )
    assert auth_art.status_code == 200
    assert auth_art.headers.get("content-type") == "application/octet-stream"
    assert len(auth_art.content) > 1000

    # Android artifact download
    android_art = client.get(
        "/api/v1/content/artifacts/android/android-pentest-toolkit.zip",
        headers={"Authorization": f"Bearer {active_token}"},
    )
    assert android_art.status_code == 200
    assert len(android_art.content) > 500

    android_ref = client.get(
        "/api/v1/content/artifacts/android/REFERENCE_GUIDE.md",
        headers={"Authorization": f"Bearer {active_token}"},
    )
    assert android_ref.status_code == 200
    assert b"MASVS" in android_ref.content

    # 4. Artifact traversal / invalid category rejected
    assert client.get(
        "/api/v1/content/artifacts/wireless/..%2Fsecret.txt",
        headers={"Authorization": f"Bearer {active_token}"},
    ).status_code in {404, 422}
    assert client.get(
        "/api/v1/content/artifacts/invalidcat/WF-AUTH-03.zip",
        headers={"Authorization": f"Bearer {active_token}"},
    ).status_code == 404


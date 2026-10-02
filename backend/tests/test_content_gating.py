"""Tests for the authenticated content delivery and public catalogue boundary."""
from __future__ import annotations

import json
import os
import re
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


def test_exact_public_samples_and_no_pack_expansion(client: TestClient) -> None:
    for module_id, lesson_id in (
        ("01-intro-wireless", "02-scope-and-assessment-decisions"),
        ("android-01-platform", "01-architecture-sandbox-and-trust-boundaries"),
    ):
        response = client.get(f"/api/v1/content/samples/lessons/{module_id}/{lesson_id}")
        assert response.status_code == 200
        assert response.json()["access"] == "public-sample"
        assert len(response.json()["content"]) > 1000
    assert client.get("/api/v1/content/samples/lessons/android-01-platform/02-components-binder-and-permissions").status_code == 404

    approved = ("README.md", "authorized-inventory.csv", "scope.md", "worksheet.md")
    for filename in approved:
        assert client.get(f"/api/v1/content/samples/wireless/{filename}").status_code == 200
    for forbidden in ("WF-FND-01.zip", "self-review.md", "baseline.pcapng", "baseline-frames.json", "SHA256SUMS"):
        assert client.get(f"/api/v1/content/samples/wireless/{forbidden}").status_code == 404


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


def _lesson_sentinels() -> dict[str, str]:
    """One distinctive body line per lesson file, as a key into the lesson it came from.

    Each sentinel is a 50-character run of plain letters, digits, spaces and commas (so JSON escaping can
    never hide it). Phrases that also appear in the public catalogue JSON are dropped: those are public
    by design and would make the check report false positives.
    """
    content_dir = config.CONTENT_DIR
    public_text = "".join((content_dir / name).read_text(encoding="utf-8") for name in ("modules.json", "learning-paths.json", "skills.json"))
    sentinels: dict[str, str] = {}
    for lesson_file in sorted((content_dir / "lessons").glob("*/*.md")):
        for line in lesson_file.read_text(encoding="utf-8").splitlines():
            if line.lstrip().startswith(("#", "|", "-", "*", ">", "`")):
                continue
            match = re.search(r"[A-Za-z0-9 ,]{50,}", line)
            if match and match.group(0)[:50] not in public_text:
                sentinels[match.group(0)[:50]] = f"{lesson_file.parent.name}/{lesson_file.stem}"
                break
    return sentinels


def test_anonymous_requests_never_receive_lesson_text(client: TestClient) -> None:
    """No route may hand lesson text to a caller without an approved account.

    An anonymous lesson route once sat in the legacy /api router and bypassed the authenticated one.
    This requests every GET route in the OpenAPI schema with no credentials, using every real module,
    lesson and path id, so a route added later is covered automatically.
    """
    sentinels = _lesson_sentinels()
    assert len(sentinels) >= 90, "the check needs a distinctive line from (nearly) every lesson to mean anything"

    # Control: the detector does find lesson text when an approved learner asks for it.
    target_mod, target_lesson = "android-01-platform", "01-architecture-sandbox-and-trust-boundaries"
    set_user_status("user-active-sentinel", "active")
    control = client.get(
        f"/api/v1/content/lessons/{target_mod}/{target_lesson}",
        headers={"Authorization": f"Bearer {make_token('user-active-sentinel')}"},
    )
    assert control.status_code == 200
    assert any(key in control.text for key, lesson in sentinels.items() if lesson == f"{target_mod}/{target_lesson}"), "detector must see lesson text it is meant to find"

    content_dir = config.CONTENT_DIR
    modules = json.loads((content_dir / "modules.json").read_text(encoding="utf-8"))
    paths = json.loads((content_dir / "learning-paths.json").read_text(encoding="utf-8"))
    lesson_pairs = [(m["id"], lesson["id"]) for m in modules for lesson in m.get("lessons", [])]

    anonymous = TestClient(client.app, raise_server_exceptions=False)  # no Authorization header, ever
    leaks: list[str] = []
    requested = 0
    for template, operations in client.app.openapi()["paths"].items():
        if "get" not in operations:
            continue
        params = set(re.findall(r"\{(\w+)\}", template))
        if {"module_id", "lesson_id"} <= params:
            combos = [{"module_id": m, "lesson_id": lesson} for m, lesson in lesson_pairs]
        elif "module_id" in params:
            combos = [{"module_id": m["id"]} for m in modules]
        elif "path_id" in params:
            combos = [{"path_id": p["id"]} for p in paths]
        else:
            combos = [{}]
        for combo in combos:
            url = re.sub(r"\{(\w+)\}", lambda found: combo.get(found.group(1), "x"), template)
            response = anonymous.get(url)
            requested += 1
            hits = [lesson for key, lesson in sentinels.items() if key in response.text]
            # The two explicit public-sample lesson responses are tested against an exact allow-list above.
            if template.startswith("/api/v1/content/samples/lessons/"):
                continue
            if response.status_code < 400 and hits:
                leaks.append(f"{url} -> {response.status_code} returned lesson text of {hits[0]}")
    assert requested > len(lesson_pairs), "the whole route surface must have been exercised"
    assert not leaks, "anonymous lesson text leak(s):\n" + "\n".join(leaks[:10])

    # The retired legacy route stays gone rather than merely unmatched.
    assert anonymous.get(f"/api/content/{target_mod}/{target_lesson}").status_code == 404


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
    assert quiz_data["grading_class"] == "practice"
    assert len(quiz_data["questions"]) == 6
    assert all(not ({"correct", "answer", "explanation", "solution", "rationale"} & set(question)) for question in quiz_data["questions"])

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

    # Imported object IDs still require active authorization before release/object lookup.
    assert client.get("/api/v1/content/artifacts/by-id/frontend-public-pcaps-recon-recon-lab-pcapng").status_code == 401
    pending_id = "artifact-pending-123"
    set_user_status(pending_id, "pending")
    pending_artifact = client.get(
        "/api/v1/content/artifacts/by-id/frontend-public-pcaps-recon-recon-lab-pcapng",
        headers={"Authorization": f"Bearer {make_token(pending_id)}"},
    )
    assert pending_artifact.status_code == 403

    # 4. Artifact traversal / invalid category rejected
    assert client.get(
        "/api/v1/content/artifacts/wireless/..%2Fsecret.txt",
        headers={"Authorization": f"Bearer {active_token}"},
    ).status_code in {404, 422}
    assert client.get(
        "/api/v1/content/artifacts/invalidcat/WF-AUTH-03.zip",
        headers={"Authorization": f"Bearer {active_token}"},
    ).status_code == 404


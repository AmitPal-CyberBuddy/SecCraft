"""End-to-end current-release authorization using isolated SQLite and filesystem object storage."""
from pathlib import Path
import os
import sys

from fastapi.testclient import TestClient

# Reuse the configured test app/database and identity helpers.
from test_content_gating import client, make_token, set_user_status  # noqa: F401
from app.core.database import SessionLocal

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/content"))
from import_content import activate, stage  # noqa: E402


def test_z_imported_current_release_and_storage_authorization(client: TestClient, tmp_path: Path, monkeypatch) -> None:
    storage = tmp_path / "private-storage"
    manifest = ROOT / "content/migration/CONTENT_MIGRATION_MANIFEST.json"
    with SessionLocal() as db:
        result = stage(db, manifest, storage, "api-runtime-test")
        assert result["publicSamples"] == 6
        activate(db, "api-runtime-test")
    monkeypatch.setenv("CONTENT_STORAGE_ROOT", str(storage))

    lesson = "/api/v1/content/lessons/android-01-platform/02-components-binder-and-permissions"
    artifact = "/api/v1/content/artifacts/by-id/frontend-public-pcaps-recon-recon-lab-pcapng"
    assert client.get(lesson).status_code == 401
    assert client.get(artifact).status_code == 401

    set_user_status("runtime-pending", "pending")
    pending_headers = {"Authorization": f"Bearer {make_token('runtime-pending')}"}
    assert client.get(lesson, headers=pending_headers).status_code == 403
    assert client.get(artifact, headers=pending_headers).status_code == 403

    set_user_status("runtime-active", "active")
    active_headers = {"Authorization": f"Bearer {make_token('runtime-active')}"}
    lesson_response = client.get(lesson, headers=active_headers)
    assert lesson_response.status_code == 200
    assert lesson_response.json()["release_id"] == "api-runtime-test"
    assert len(lesson_response.json()["content"]) > 1000
    artifact_response = client.get(artifact, headers=active_headers)
    assert artifact_response.status_code == 200
    assert len(artifact_response.content) > 100

    # Server-only archives cannot be fetched through the learner artifact endpoint, even by active users.
    server_only = "/api/v1/content/artifacts/by-id/frontend-public-wireless-foundations-wf-fnd-01-zip"
    assert client.get(server_only, headers=active_headers).status_code == 404

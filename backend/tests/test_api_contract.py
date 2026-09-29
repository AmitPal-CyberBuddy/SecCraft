"""Smoke tests for the optional local API contract used by the frontend."""
from __future__ import annotations

import hashlib
import os
import sys
import tempfile
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
TEST_DB = Path(tempfile.gettempdir()) / f"seccraft-api-contract-{os.getpid()}.sqlite"
os.environ["PLATFORM_DATABASE_URL"] = f"sqlite:///{TEST_DB}"
os.environ["PLATFORM_JWT_SECRET"] = ""
os.environ["WIFIFORGE_JWT_SECRET"] = ""

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402
from app.core.database import engine  # noqa: E402


class ApiContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.client_context = TestClient(app)
        cls.client = cls.client_context.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.client_context.__exit__(None, None, None)
        engine.dispose()
        TEST_DB.unlink(missing_ok=True)

    def test_all_frontend_api_surfaces_are_mounted_under_api_prefix(self) -> None:
        expected = {
            "/api/health",
            "/api/modules",
            "/api/learning-paths",
            "/api/platform",
            "/api/labs",
            "/api/pcaps",
            "/api/progress",
        }
        mounted = {route.path for route in app.routes}
        self.assertTrue(expected.issubset(mounted), sorted(expected - mounted))
        self.assertEqual(self.client.get("/api/health").status_code, 200)
        for legacy_unprefixed in ("/modules", "/learning-paths", "/platform", "/labs", "/pcaps"):
            with self.subTest(route=legacy_unprefixed):
                self.assertEqual(self.client.get(legacy_unprefixed).status_code, 404)

    def test_content_and_path_endpoints_return_real_repository_data(self) -> None:
        paths_response = self.client.get("/api/learning-paths")
        modules_response = self.client.get("/api/modules")
        platform_response = self.client.get("/api/platform")
        self.assertEqual(paths_response.status_code, 200)
        self.assertEqual(modules_response.status_code, 200)
        self.assertEqual(platform_response.status_code, 200)
        paths = paths_response.json()
        modules = modules_response.json()
        self.assertTrue(paths)
        self.assertTrue(modules)
        self.assertEqual(platform_response.json()["name"], "SecCraft")

        path_id = paths[0]["id"]
        self.assertEqual(self.client.get(f"/api/learning-paths/{path_id}").status_code, 200)
        self.assertEqual(self.client.get(f"/api/modules?path={path_id}").status_code, 200)
        module = next((item for item in modules if item.get("lessons")), None)
        self.assertIsNotNone(module)
        lesson = module["lessons"][0]
        lesson_response = self.client.get(f"/api/content/{module['id']}/{lesson['id']}")
        self.assertEqual(lesson_response.status_code, 200)
        self.assertTrue(lesson_response.text.strip())

    def test_lab_and_capture_catalogues_are_usable(self) -> None:
        labs_response = self.client.get("/api/labs")
        pcaps_response = self.client.get("/api/pcaps")
        self.assertEqual(labs_response.status_code, 200)
        self.assertEqual(pcaps_response.status_code, 200)
        self.assertTrue(labs_response.json())
        pcaps = pcaps_response.json()["pcaps"]
        self.assertTrue(pcaps)
        for capture in pcaps:
            with self.subTest(capture=capture["id"]):
                response = self.client.get(f"/api/pcaps/{capture['id']}/analyze")
                self.assertEqual(response.status_code, 200)
                analysis = response.json()
                self.assertEqual(analysis.get("pcap_id"), capture["id"])
                self.assertGreater(analysis.get("summary", {}).get("total_frames", 0), 0)

    def test_capture_upload_and_lab_validation_use_real_data(self) -> None:
        capture_path = BACKEND_DIR.parent / "frontend/public/pcaps/wifi-fundamentals/beacon-only.pcapng"
        capture = capture_path.read_bytes()
        uploaded = self.client.post(
            "/api/pcaps/upload",
            files={"file": ("beacon-only.pcapng", capture, "application/octet-stream")},
        )
        self.assertEqual(uploaded.status_code, 200)
        self.assertEqual(uploaded.json()["sha256"], hashlib.sha256(capture).hexdigest())
        self.assertTrue(uploaded.json()["parsed"])
        self.assertEqual(uploaded.json()["header"], "pcapng")

        invalid = self.client.post(
            "/api/pcaps/upload",
            files={"file": ("notes.txt", b"not a capture", "text/plain")},
        )
        self.assertEqual(invalid.status_code, 400)

        validated = self.client.post("/api/labs/validate", json={
            "lab_id": "beacon-only",
            "answers": {
                "bssid": "00:11:22:33:44:55",
                "channel": "6",
                "ssid": "LAB-WIFI",
                "security": "WPA2/WPA3",
            },
        })
        self.assertEqual(validated.status_code, 200)
        self.assertTrue(validated.json()["correct"])
        self.assertEqual(validated.json()["score"], 100)

    def test_progress_writes_are_idempotent_and_resettable(self) -> None:
        payload = {"module_id": "02-wifi-fundamentals", "lesson_id": "01-identity-topology-and-beacons"}
        first = self.client.post("/api/progress/lesson", json=payload)
        second = self.client.post("/api/progress/lesson", json=payload)
        self.assertEqual(first.status_code, 200)
        self.assertEqual(first.json()["status"], "completed")
        self.assertEqual(second.json()["status"], "already_completed")
        self.assertEqual(len(self.client.get("/api/progress").json()["lessons"]), 1)
        self.assertEqual(self.client.delete("/api/progress").json()["status"], "reset")
        self.assertEqual(self.client.get("/api/progress").json()["lessons"], [])

    def test_optional_auth_fails_closed_when_not_configured(self) -> None:
        response = self.client.post("/api/auth/login", json={"username": "anyone", "password": "anything"})
        self.assertEqual(response.status_code, 503)

    def test_unknown_resources_fail_explicitly(self) -> None:
        self.assertEqual(self.client.get("/api/learning-paths/not-a-real-path").status_code, 404)
        self.assertEqual(self.client.get("/api/modules/not-a-real-module").status_code, 404)
        self.assertEqual(self.client.get("/api/pcaps/not-a-real-capture/analyze").status_code, 404)


if __name__ == "__main__":
    unittest.main()

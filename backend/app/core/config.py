"""Runtime configuration — environment driven, safe defaults.

The API is optional (the hosted build is static). When it is run, everything that affects security
comes from the environment rather than from literals in the source:

* ``WIFIFORGE_ALLOWED_ORIGINS`` — comma-separated browser origins allowed to call the API. The
  default is the two local dev origins; there is no wildcard, no ``*`` and no pattern matching.
* ``WIFIFORGE_JWT_SECRET`` — HS256 signing key. If it is unset, the auth endpoints stay disabled
  instead of shipping a hard-coded secret.
* ``WIFIFORGE_DEMO_USERS`` — set to ``1`` to load the documented classroom demo accounts
  (password hashes only, PBKDF2-SHA256). Off by default: an unset API serves no accounts at all.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
REPO_ROOT = BASE_DIR.parent
CONTENT_DIR = REPO_ROOT / "frontend" / "src" / "content"
# Fallback to content/ if it exists at the repo root
REPO_CONTENT_DIR = REPO_ROOT / "content"

# Offline decoded datasets shipped with the frontend (real captures, generated + verified offline).
OFFLINE_DATA_DIR = REPO_ROOT / "frontend" / "public" / "lab-data"
PCAP_DIR = REPO_ROOT / "frontend" / "public" / "pcaps"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/wififorge.db")


def _origins_from_env() -> list[str]:
    raw = os.getenv("WIFIFORGE_ALLOWED_ORIGINS", "")
    if raw.strip():
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


ALLOWED_ORIGINS = _origins_from_env()

# Auth is opt-in: without an explicit secret the API refuses to issue tokens.
JWT_SECRET = os.getenv("WIFIFORGE_JWT_SECRET", "")
JWT_ALG = "HS256"
JWT_TTL_SECONDS = int(os.getenv("WIFIFORGE_JWT_TTL_SECONDS", "3600"))
DEMO_USERS_ENABLED = os.getenv("WIFIFORGE_DEMO_USERS", "0") == "1"

# CORS: only the methods and headers the API actually uses.
ALLOWED_METHODS = ["GET", "POST", "OPTIONS"]
ALLOWED_HEADERS = ["Authorization", "Content-Type", "Accept"]

# Upload guard rails (bytes).
MAX_UPLOAD_BYTES = int(os.getenv("WIFIFORGE_MAX_UPLOAD_BYTES", str(50 * 1024 * 1024)))

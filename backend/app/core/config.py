"""Runtime configuration — environment driven, safe defaults.

The API is optional (the hosted build is static). When it is run, everything that affects security
comes from the environment rather than from literals in the source:

Platform-level (new, preferred):
* ``PLATFORM_ALLOWED_ORIGINS`` — comma-separated browser origins allowed to call the API.
* ``PLATFORM_JWT_SECRET`` — HS256 signing key.
* ``PLATFORM_DEMO_USERS`` — set to ``1`` to load demo accounts.
* ``PLATFORM_MAX_UPLOAD_BYTES`` — upload limit.
* ``PLATFORM_JWT_TTL_SECONDS`` — JWT TTL.

Legacy (backward compat, still supported):
* ``WIFIFORGE_ALLOWED_ORIGINS`` — fallback if PLATFORM_ not set
* ``WIFIFORGE_JWT_SECRET``
* ``WIFIFORGE_DEMO_USERS``
* ``WIFIFORGE_MAX_UPLOAD_BYTES``
* ``WIFIFORGE_JWT_TTL_SECONDS``
* ``DATABASE_URL`` — legacy name still works, but ``PLATFORM_DATABASE_URL`` preferred

Defaults are local dev origins; no wildcard, no ``*``.
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

# Database — platform preferred, legacy fallback
DATABASE_URL = os.getenv(
    "PLATFORM_DATABASE_URL",
    os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/wififorge.db"),
)
# Also support PLATFORM_DB alias
if not os.getenv("PLATFORM_DATABASE_URL") and os.getenv("PLATFORM_DB"):
    DATABASE_URL = os.getenv("PLATFORM_DB", DATABASE_URL)


def _env_first(*keys: str, default: str = "") -> str:
    for k in keys:
        v = os.getenv(k)
        if v is not None and v.strip() != "":
            return v.strip()
    return default


def _origins_from_env() -> list[str]:
    raw = _env_first("PLATFORM_ALLOWED_ORIGINS", "WIFIFORGE_ALLOWED_ORIGINS")
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
# Prefer PLATFORM_*, fallback WIFIFORGE_*
JWT_SECRET = _env_first("PLATFORM_JWT_SECRET", "WIFIFORGE_JWT_SECRET")
JWT_ALG = "HS256"
JWT_TTL_SECONDS = int(_env_first("PLATFORM_JWT_TTL_SECONDS", "WIFIFORGE_JWT_TTL_SECONDS", default="3600"))
DEMO_USERS_ENABLED = _env_first("PLATFORM_DEMO_USERS", "WIFIFORGE_DEMO_USERS", default="0") == "1"

# CORS: only the methods and headers the API actually uses.
ALLOWED_METHODS = ["GET", "POST", "OPTIONS"]
ALLOWED_HEADERS = ["Authorization", "Content-Type", "Accept"]

# Upload guard rails (bytes).
MAX_UPLOAD_BYTES = int(_env_first("PLATFORM_MAX_UPLOAD_BYTES", "WIFIFORGE_MAX_UPLOAD_BYTES", default=str(50 * 1024 * 1024)))

# Platform metadata for health endpoint
PLATFORM_NAME = _env_first("PLATFORM_NAME", default="SecCraft")
PLATFORM_LEGACY_NAME = _env_first("PLATFORM_LEGACY_NAME", "WIFIFORGE_LEGACY_NAME", default="WiFiForge")
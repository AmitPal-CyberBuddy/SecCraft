"""Runtime configuration with fail-closed account and database defaults."""

import os
from pathlib import Path
from urllib.parse import urlsplit

BASE_DIR = Path(__file__).resolve().parent.parent.parent
REPO_ROOT = BASE_DIR.parent
CONTENT_DIR = REPO_ROOT / "frontend" / "src" / "content"
REPO_CONTENT_DIR = REPO_ROOT / "content"
OFFLINE_DATA_DIR = REPO_ROOT / "frontend" / "public" / "lab-data"
PCAP_DIR = REPO_ROOT / "frontend" / "public" / "pcaps"


def _env_first(*keys: str, default: str = "") -> str:
    for key in keys:
        value = os.getenv(key)
        if value is not None and value.strip():
            return value.strip()
    return default


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    value = raw.strip().lower()
    if value in {"1", "true", "yes", "on"}:
        return True
    if value in {"0", "false", "no", "off"}:
        return False
    raise ValueError(f"{name} must be an explicit true/false value.")


# PostgreSQL is required for a deployed service. SQLite remains available for local tests/development.
DATABASE_URL = _env_first(
    "PLATFORM_DATABASE_URL",
    "DATABASE_URL",
    "PLATFORM_DB",
    default=f"sqlite:///{BASE_DIR}/seccraft.db",
)
IS_SQLITE = DATABASE_URL.startswith("sqlite:")
AUTO_CREATE_TABLES = _env_bool("PLATFORM_AUTO_CREATE_TABLES", IS_SQLITE)
APP_ENV = _env_first("PLATFORM_ENV", "APP_ENV", default="development").lower()
IS_PRODUCTION = APP_ENV not in {"dev", "development", "local", "test", "testing", "integration-test", "ci"}
ENABLE_API_DOCS = _env_bool("PLATFORM_ENABLE_API_DOCS", False)

if IS_PRODUCTION and not DATABASE_URL.startswith("postgresql+psycopg://"):
    raise ValueError(f"PLATFORM_ENV={APP_ENV} requires PLATFORM_DATABASE_URL using the PostgreSQL psycopg driver; SQLite is for local development/tests only.")


def _origins_from_env() -> list[str]:
    raw = _env_first("PLATFORM_ALLOWED_ORIGINS", "WIFIFORGE_ALLOWED_ORIGINS")
    if IS_PRODUCTION and not raw:
        raise ValueError("PLATFORM_ALLOWED_ORIGINS must be explicitly configured in production.")
    origins = [value.strip().rstrip("/") for value in raw.split(",") if value.strip()] if raw else [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    if IS_PRODUCTION and not origins:
        raise ValueError("PLATFORM_ALLOWED_ORIGINS must contain at least one explicit browser origin in production.")
    if "*" in origins:
        raise ValueError("Wildcard CORS origins are not allowed")
    for origin in origins:
        parsed = urlsplit(origin)
        try:
            parsed.port  # Validate that any explicit port is numeric and in range.
        except ValueError as exc:
            raise ValueError(f"Invalid browser origin in PLATFORM_ALLOWED_ORIGINS: {origin}") from exc
        if parsed.scheme not in {"http", "https"} or not parsed.netloc or not parsed.hostname or parsed.path or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError(f"Invalid browser origin in PLATFORM_ALLOWED_ORIGINS: {origin}")
        loopback = (parsed.hostname or "").lower() in {"localhost", "127.0.0.1", "::1"}
        if IS_PRODUCTION and parsed.scheme != "https" and not (parsed.scheme == "http" and loopback):
            raise ValueError(f"Production browser origins must use HTTPS (HTTP is allowed only for loopback): {origin}")
    return origins


ALLOWED_ORIGINS = _origins_from_env()
ALLOWED_METHODS = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
ALLOWED_HEADERS = ["Authorization", "Content-Type", "Accept", "Idempotency-Key"]

# Supabase Auth. The browser anon key is public; keep service-role/database/JWT signing keys server-side.
SUPABASE_URL = _env_first("SUPABASE_URL").rstrip("/")
SUPABASE_ANON_KEY = _env_first("SUPABASE_ANON_KEY")
SUPABASE_JWT_ISSUER = _env_first(
    "SUPABASE_JWT_ISSUER",
    default=f"{SUPABASE_URL}/auth/v1" if SUPABASE_URL else "",
)
SUPABASE_JWKS_URL = _env_first(
    "SUPABASE_JWKS_URL",
    default=f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else "",
)
# Optional only for Supabase projects still using the legacy HS256 signing secret.
SUPABASE_JWT_SECRET = _env_first("SUPABASE_JWT_SECRET")
SUPABASE_JWT_AUDIENCE = _env_first("SUPABASE_JWT_AUDIENCE", default="authenticated")
REQUIRE_VERIFIED_EMAIL = _env_bool("SUPABASE_REQUIRE_VERIFIED_EMAIL", True)
SUPABASE_EMAIL_REDIRECT_URL = _env_first("SUPABASE_EMAIL_REDIRECT_URL")


def _validate_production_service_urls() -> None:
    if not IS_PRODUCTION:
        return
    for name, value, origin_only in (
        ("SUPABASE_URL", SUPABASE_URL, True),
        ("SUPABASE_JWT_ISSUER", SUPABASE_JWT_ISSUER, False),
        ("SUPABASE_JWKS_URL", SUPABASE_JWKS_URL, False),
        ("SUPABASE_EMAIL_REDIRECT_URL", SUPABASE_EMAIL_REDIRECT_URL, False),
    ):
        if not value:
            continue
        try:
            parsed = urlsplit(value)
        except ValueError as exc:
            raise ValueError(f"{name} must be a valid HTTPS URL in production.") from exc
        loopback = (parsed.hostname or "").lower() in {"localhost", "127.0.0.1", "::1"}
        if parsed.scheme != "https" and not (parsed.scheme == "http" and loopback):
            raise ValueError(f"{name} must use HTTPS in production (HTTP is allowed only for loopback development).")
        if not parsed.netloc or parsed.username or parsed.password or parsed.fragment or (origin_only and (parsed.path not in {"", "/"} or parsed.query)):
            raise ValueError(f"{name} has an invalid URL shape.")


_validate_production_service_urls()

PLATFORM_NAME = _env_first("PLATFORM_NAME", default="SecCraft")
PLATFORM_LEGACY_NAME = _env_first("PLATFORM_LEGACY_NAME", "WIFIFORGE_LEGACY_NAME", default="WiFiForge")

SIGNUP_LIMIT_PER_MINUTE = int(_env_first("PLATFORM_SIGNUP_LIMIT_PER_MINUTE", default="5"))

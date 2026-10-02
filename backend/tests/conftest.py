"""Fail-closed defaults applied before test-module collection imports the application."""
import os

os.environ.setdefault("PLATFORM_ENV", "test")
os.environ.setdefault("PLATFORM_DATABASE_URL", "sqlite:////tmp/seccraft-pytest-default.sqlite")
os.environ.setdefault("PLATFORM_AUTO_CREATE_TABLES", "true")
os.environ.setdefault("PLATFORM_ENABLE_API_DOCS", "false")
os.environ.setdefault("PLATFORM_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
os.environ.setdefault("SUPABASE_URL", "https://auth-test.invalid")
os.environ.setdefault("SUPABASE_ANON_KEY", "public-test-anon-key")
os.environ.setdefault("SUPABASE_JWT_ISSUER", "https://auth-test.invalid/auth/v1")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-only-secret-not-for-use")
os.environ.setdefault("SUPABASE_REQUIRE_VERIFIED_EMAIL", "false")

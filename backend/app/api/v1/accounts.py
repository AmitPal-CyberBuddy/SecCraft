from typing import Any
from urllib.parse import urlsplit

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.orm import Session

from app.core import config
from app.core.database import get_db
from app.core.rate_limit import signup_limiter
from app.api.v1.dependencies import auth_is_configured, current_identity, current_profile, get_or_create_settings
from app.models.platform import UserProfile

router = APIRouter()


class SignupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        clean = value.strip().lower()
        if clean.count("@") != 1 or clean.startswith("@") or clean.endswith("@") or any(ch.isspace() for ch in clean):
            raise ValueError("Enter a valid email address")
        return clean


def _redirect_is_allowed(url: str) -> bool:
    parsed = urlsplit(url)
    origin = f"{parsed.scheme}://{parsed.netloc}".rstrip("/")
    return parsed.scheme == "https" and origin in config.ALLOWED_ORIGINS or parsed.scheme == "http" and origin in config.ALLOWED_ORIGINS and parsed.hostname in {"localhost", "127.0.0.1"}


@router.get("/public-config")
def public_config(db: Session = Depends(get_db)) -> dict[str, Any]:
    settings = get_or_create_settings(db)
    return {
        "auth_configured": auth_is_configured(),
        "signup_enabled": bool(settings and settings.signup_enabled),
        "email_verification_required": config.REQUIRE_VERIFIED_EMAIL,
        "guest_learning_available": True,
    }


@router.post("/auth/signup")
async def signup(payload: SignupRequest, request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Proxy a public Supabase Auth signup only after the owner-controlled server setting is checked.

    Passwords are forwarded over TLS to Supabase Auth and are never stored or logged by SecCraft.
    """
    settings = get_or_create_settings(db)
    if settings is None or not settings.signup_enabled:
        raise HTTPException(status_code=403, detail="New account requests are currently closed.")
    if not auth_is_configured():
        raise HTTPException(status_code=503, detail="Account services are not configured.")

    client_key = request.client.host if request.client else "unknown"
    if not signup_limiter.allow(f"signup:{client_key}", config.SIGNUP_LIMIT_PER_MINUTE, 60):
        raise HTTPException(status_code=429, detail="Too many account requests. Please wait and try again.")

    params: dict[str, str] = {}
    redirect_url = config.SUPABASE_EMAIL_REDIRECT_URL
    if redirect_url:
        if not _redirect_is_allowed(redirect_url):
            raise HTTPException(status_code=503, detail="The configured email redirect is not in the allowed application origins.")
        params["redirect_to"] = redirect_url

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(12.0)) as client:
            response = await client.post(
                f"{config.SUPABASE_URL}/auth/v1/signup",
                params=params,
                headers={"apikey": config.SUPABASE_ANON_KEY, "content-type": "application/json"},
                json={"email": payload.email, "password": payload.password},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail="The identity provider is temporarily unavailable.") from exc

    if response.status_code == 429:
        raise HTTPException(status_code=429, detail="Too many account requests. Please wait and try again.")
    if response.status_code >= 500:
        raise HTTPException(status_code=503, detail="The identity provider is temporarily unavailable.")
    if response.status_code not in (200, 201):
        # Do not forward provider details that could disclose whether an email is already registered.
        raise HTTPException(status_code=400, detail="Account request could not be completed. Check the details or try again later.")
    try:
        result = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=503, detail="The identity provider returned an invalid response.") from exc
    if not isinstance(result, dict):
        raise HTTPException(status_code=503, detail="The identity provider returned an invalid response.")
    return result


@router.get("/account")
def account_status(
    identity=Depends(current_identity),
    profile: UserProfile = Depends(current_profile),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    from app.api.v1.dependencies import is_platform_admin

    return {
        "user_id": identity.user_id,
        "email": profile.email,
        "account_status": profile.account_status,
        "is_admin": is_platform_admin(db, identity.user_id),
        "created_at": profile.created_at,
        "reviewed_at": profile.reviewed_at,
    }

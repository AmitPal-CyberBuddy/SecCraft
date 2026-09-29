from dataclasses import dataclass
from functools import lru_cache
from typing import Optional

import httpx
import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core import config
from app.core.database import get_db
from app.models.platform import PlatformAdmin, PlatformSettings, UserProfile

bearer = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Identity:
    user_id: str
    email: Optional[str]
    access_token: str


def auth_is_configured() -> bool:
    verifier_configured = bool(config.SUPABASE_JWT_SECRET or config.SUPABASE_JWKS_URL)
    email_check_configured = not config.REQUIRE_VERIFIED_EMAIL or bool(config.SUPABASE_ANON_KEY)
    return bool(config.SUPABASE_URL and config.SUPABASE_ANON_KEY and verifier_configured and email_check_configured)


@lru_cache(maxsize=4)
def _jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_keys=True, lifespan=300, timeout=5)


def _decode_token(token: str) -> dict:
    if not auth_is_configured():
        raise HTTPException(status_code=503, detail="Account services are not configured.")
    issuer = config.SUPABASE_JWT_ISSUER
    options = {"require": ["exp", "sub", "iat"]}
    try:
        if config.SUPABASE_JWT_SECRET:
            return jwt.decode(
                token,
                config.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience=config.SUPABASE_JWT_AUDIENCE,
                issuer=issuer,
                options=options,
            )
        signing_key = _jwks_client(config.SUPABASE_JWKS_URL).get_signing_key_from_jwt(token)
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg")
        if algorithm not in {"ES256", "RS256"}:
            raise jwt.InvalidAlgorithmError("Unsupported Supabase signing algorithm")
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=[algorithm],
            audience=config.SUPABASE_JWT_AUDIENCE,
            issuer=issuer,
            options=options,
        )
    except HTTPException:
        raise
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired access token.") from exc
    except Exception as exc:
        # JWKS fetch/rotation failures should not silently accept a token or look like an invalid user.
        raise HTTPException(status_code=503, detail="Identity verification is temporarily unavailable.") from exc


async def current_identity(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
) -> Identity:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Bearer access token required.", headers={"WWW-Authenticate": "Bearer"})
    claims = _decode_token(credentials.credentials)
    user_id = claims.get("sub")
    if not isinstance(user_id, str) or not user_id.strip() or len(user_id) > 64:
        raise HTTPException(status_code=401, detail="Invalid access token subject.")

    email = claims.get("email") if isinstance(claims.get("email"), str) else None
    if config.REQUIRE_VERIFIED_EMAIL:
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(6.0)) as client:
                response = await client.get(
                    f"{config.SUPABASE_URL}/auth/v1/user",
                    headers={
                        "apikey": config.SUPABASE_ANON_KEY,
                        "Authorization": f"Bearer {credentials.credentials}",
                    },
                )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail="Email verification status is temporarily unavailable.") from exc
        if response.status_code in (401, 403):
            raise HTTPException(status_code=401, detail="Invalid or expired access token.")
        if response.status_code != 200:
            raise HTTPException(status_code=503, detail="Email verification status is temporarily unavailable.")
        try:
            auth_user = response.json()
        except ValueError as exc:
            raise HTTPException(status_code=503, detail="Identity provider returned an invalid response.") from exc
        if not isinstance(auth_user, dict):
            raise HTTPException(status_code=503, detail="Identity provider returned an invalid response.")
        if auth_user.get("id") != user_id:
            raise HTTPException(status_code=401, detail="Access token identity did not match the provider.")
        confirmed_at = auth_user.get("email_confirmed_at") or auth_user.get("confirmed_at")
        if not confirmed_at:
            raise HTTPException(status_code=403, detail={"code": "email_not_verified", "message": "Verify your email before continuing."})
        email = auth_user.get("email") if isinstance(auth_user.get("email"), str) else email

    return Identity(user_id=user_id, email=email, access_token=credentials.credentials)


def get_or_create_settings(db: Session, *, create: bool = True) -> Optional[PlatformSettings]:
    settings = db.get(PlatformSettings, 1)
    if settings is not None or not create:
        return settings
    settings = PlatformSettings(id=1, signup_enabled=False, approved_user_limit=None)
    db.add(settings)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
    return db.get(PlatformSettings, 1)


def is_platform_admin(db: Session, user_id: str) -> bool:
    return db.query(PlatformAdmin.user_id).filter(PlatformAdmin.user_id == user_id).first() is not None


def current_profile(
    identity: Identity = Depends(current_identity),
    db: Session = Depends(get_db),
) -> UserProfile:
    profile = db.get(UserProfile, identity.user_id)
    if profile is None:
        profile = UserProfile(user_id=identity.user_id, email=identity.email, account_status="pending")
        db.add(profile)
        try:
            db.commit()
            db.refresh(profile)
        except IntegrityError:
            db.rollback()
            profile = db.get(UserProfile, identity.user_id)
            if profile is None:
                raise HTTPException(status_code=503, detail="Account profile could not be initialized.")
    elif identity.email and profile.email != identity.email:
        profile.email = identity.email
        db.commit()
    return profile


def active_profile(
    profile: UserProfile = Depends(current_profile),
    identity: Identity = Depends(current_identity),
    db: Session = Depends(get_db),
) -> UserProfile:
    if is_platform_admin(db, identity.user_id):
        return profile
    if profile.account_status != "active":
        messages = {
            "pending": "Your account is pending owner approval.",
            "rejected": "This account request was not approved.",
            "suspended": "This account is suspended.",
        }
        raise HTTPException(
            status_code=403,
            detail={"code": f"account_{profile.account_status}", "message": messages.get(profile.account_status, "Account is not active.")},
        )
    return profile


def admin_identity(
    identity: Identity = Depends(current_identity),
    db: Session = Depends(get_db),
) -> Identity:
    # Bootstrap owner access comes only from this server-controlled allowlist.
    if not is_platform_admin(db, identity.user_id):
        raise HTTPException(status_code=403, detail="Owner access required.")
    return identity

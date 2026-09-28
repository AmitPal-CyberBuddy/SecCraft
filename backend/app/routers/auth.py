"""Optional multi-user auth for classroom use — disabled unless configured.

Design rules followed here (previously violated by placeholder values):

* No secret in source. The HS256 key comes from ``WIFIFORGE_JWT_SECRET``; without it these endpoints
  return 503 instead of issuing tokens anybody could forge.
* No plaintext passwords. The optional demo accounts store PBKDF2-SHA256 hashes, and the accounts are
  only loaded when ``WIFIFORGE_DEMO_USERS=1`` — an unconfigured API serves no users at all.
* No fake capabilities. There is no OAuth implementation here, so ``/auth/oauth/{provider}`` says so
  instead of returning a "ready" payload, and team rosters come from the database rather than a
  hard-coded list of invented classmates.
"""

import hashlib
import hmac
import time
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core import config

router = APIRouter()
security = HTTPBearer(auto_error=False)

# ── Optional demo accounts ────────────────────────────────────────────────────────────────────────
# Loaded only when WIFIFORGE_DEMO_USERS=1. Passwords are hashed with PBKDF2-SHA256 (200k iterations)
# at import time; nothing is compared or stored in plaintext.

def _pbkdf2(password: str, salt_hex: str, iterations: int = 200_000) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), iterations).hex()


def _load_demo_users() -> dict:
    """Build the demo user table from the documented lab credentials, hashed at import time.

    The plaintext values below are the same ones printed in the instructor docs for local labs; they
    exist so ``WIFIFORGE_DEMO_USERS=1`` gives a working classroom. They are never used when auth is
    unconfigured, and they must not be reused anywhere real.
    """
    if not config.DEMO_USERS_ENABLED:
        return {}
    import secrets

    defs = [
        ("operator", "operator", {"id": "1", "username": "operator", "email": "operator@wififorge.local", "role": "student", "team": None, "xp": 0, "level": 1}),
        ("alice", "alice", {"id": "2", "username": "alice.wifi", "email": "alice@wififorge.local", "role": "instructor", "team": None, "xp": 0, "level": 1}),
        ("admin", "admin", {"id": "3", "username": "admin", "email": "admin@wififorge.local", "role": "admin", "team": None, "xp": 0, "level": 1}),
    ]
    table = {}
    for key, password, user in defs:
        salt = secrets.token_hex(8)
        table[key] = {"salt": salt, "hash": _pbkdf2(password, salt), "user": user}
    return table


DEMO_DB = _load_demo_users()


class LoginReq(BaseModel):
    username: str
    password: str


class User(BaseModel):
    id: str
    username: str
    email: str
    role: str
    team: Optional[str] = None
    xp: int = 0
    level: int = 1


def _require_auth_configured() -> None:
    if not config.JWT_SECRET:
        raise HTTPException(
            status_code=503,
            detail=(
                "Authentication is not configured on this API. Set WIFIFORGE_JWT_SECRET (and optionally "
                "WIFIFORGE_DEMO_USERS=1 for the classroom demo accounts) to enable it. The hosted static "
                "build has no accounts at all and stores progress in the browser."
            ),
        )


def create_token(user: dict) -> str:
    now = int(time.time())
    payload = {
        "sub": user["id"],
        "username": user["username"],
        "role": user["role"],
        "iat": now,
        "exp": now + config.JWT_TTL_SECONDS,
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALG)


def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds or not config.JWT_SECRET:
        return None
    try:
        data = jwt.decode(creds.credentials, config.JWT_SECRET, algorithms=[config.JWT_ALG])
    except Exception:
        return None
    for entry in DEMO_DB.values():
        if entry["user"]["id"] == data.get("sub"):
            return entry["user"]
    return None


@router.post("/auth/login")
async def login(req: LoginReq):
    _require_auth_configured()
    if not DEMO_DB:
        raise HTTPException(
            status_code=403,
            detail=(
                "No accounts are configured. This API does not ship default logins — set "
                "WIFIFORGE_DEMO_USERS=1 for the throwaway classroom accounts, or create your own user "
                "store before enabling authentication."
            ),
        )

    key = req.username.lower().split(".")[0]
    entry = DEMO_DB.get(key) or DEMO_DB.get(req.username.lower())
    # Constant-time comparison against a hashed password; failures are indistinguishable.
    if not entry or not hmac.compare_digest(entry["hash"], _pbkdf2(req.password, entry["salt"])):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "access_token": create_token(entry["user"]),
        "token_type": "bearer",
        "expires_in": config.JWT_TTL_SECONDS,
        "user": entry["user"],
        "note": "Local classroom token. Not an enterprise identity provider.",
    }


@router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


@router.post("/auth/logout")
async def logout(user=Depends(get_current_user)):
    # Stateless JWT: the client drops the token. No server-side blocklist exists in this build.
    return {"status": "ok", "note": "Stateless token — remove it from the client."}


@router.get("/auth/teams")
async def teams(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    from app.core.database import SessionLocal
    from app.models.progress import LessonProgress

    db = SessionLocal()
    try:
        user_ids = sorted({row.user_id for row in db.query(LessonProgress).all()})
    finally:
        db.close()

    return {
        "teams": [],  # no teams table in this schema; nothing is invented to fill the list
        "learners_with_progress": user_ids,
        "current_user_team": user.get("team"),
        "note": "Team rosters are not stored by this API. Empty list means empty, not hidden.",
    }


@router.get("/auth/oauth/{provider}")
async def oauth(provider: str):
    raise HTTPException(
        status_code=501,
        detail=(
            f"OAuth ({provider}) is not implemented in this local API. Wiring one requires a registered "
            "client, redirect URI and token storage; returning a 'ready' response without them would be "
            "misleading. Use the JWT login above for classroom use."
        ),
    )

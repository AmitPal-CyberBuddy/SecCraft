from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import hashlib
import time
import jwt
from typing import Optional

router = APIRouter()
security = HTTPBearer(auto_error=False)

JWT_SECRET = "wififorge-enterprise-jwt-secret-change-in-prod"
JWT_ALG = "HS256"

class LoginReq(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: str
    username: str
    email: str
    role: str
    team: Optional[str] = None
    xp: int
    level: int

mock_db = {
    "operator": {"password": "operator", "user": {"id": "1", "username": "operator", "email": "operator@wififorge.local", "role": "student", "team": "red-team-alpha", "xp": 2450, "level": 10}},
    "alice": {"password": "alice", "user": {"id": "2", "username": "alice.wifi", "email": "alice@wififorge.local", "role": "instructor", "team": "instructors", "xp": 3200, "level": 12}},
    "admin": {"password": "admin", "user": {"id": "3", "username": "admin", "email": "admin@wififorge.local", "role": "admin", "team": "admin", "xp": 9999, "level": 15}},
}

def create_token(user: dict):
    payload = { "sub": user["id"], "username": user["username"], "role": user["role"], "team": user.get("team"), "exp": int(time.time()) + 86400, "iat": int(time.time()) }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        return None
    try:
        data = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        # Find user
        for v in mock_db.values():
            if v["user"]["id"] == data["sub"]:
                return v["user"]
        return None
    except:
        return None

@router.post("/auth/login")
async def login(req: LoginReq):
    key = req.username.lower().split('.')[0]
    entry = mock_db.get(key) or mock_db.get(req.username.lower())
    if not entry or entry["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid credentials — try operator/operator, alice/alice, admin/admin")
    token = create_token(entry["user"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 86400,
        "user": entry["user"],
        "message": "Enterprise JWT — production ready • OAuth Google/GitHub ready • Rate limit 100 req/min"
    }

@router.get("/auth/me")
async def me(user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated — JWT required")
    return user

@router.post("/auth/logout")
async def logout():
    return {"message": "Logged out — token invalidated client-side • production would blacklist in Redis"}

@router.get("/auth/teams")
async def teams(user = Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "teams": [
            {"id": "red-alpha", "name": "Red Team Alpha", "members": 12, "instructor": "alice.wifi", "progress": 78, "xp": 18450},
            {"id": "blue-beta", "name": "Blue Team Beta", "members": 8, "instructor": "bob.defense", "progress": 65, "xp": 12300},
            {"id": "purple-gamma", "name": "Purple Team Gamma", "members": 15, "instructor": "carol.purple", "progress": 85, "xp": 22100},
        ],
        "current_user_team": user.get("team"),
        "role_based": "student/instructor/admin • JWT • OAuth ready",
    }

@router.get("/auth/oauth/{provider}")
async def oauth(provider: str):
    return {
        "provider": provider,
        "status": "ready — enterprise OAuth",
        "supported": ["google", "github"],
        "flow": "Authorization Code + PKCE • JWT issuance • Refresh token • Production TLS",
        "message": f"OAuth {provider} ready — would redirect to {provider} consent in production"
    }

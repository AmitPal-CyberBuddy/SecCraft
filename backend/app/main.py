from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routers import content, progress, labs, pcaps, enterprise, auth
from app.core.database import init_db
from app.core import config

app = FastAPI(
    title="WiFiForge API (optional local parser)",
    description=(
        "Local, zero-cost helper API for the WiFiForge academy: content metadata, offline capture "
        "decoding and optional multi-user progress storage. The hosted build is static and does not "
        "require this service; nothing here is exposed to the internet by default."
    ),
    version="0.2.0",
    docs_url="/docs",
    redoc_url=None,
    openapi_url="/openapi.json",
)

# CORS: explicit allowlist from the environment (see app/core/config.py). No wildcard origin, no
# wildcard methods/headers, and credentials are only allowed for the configured origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=config.ALLOWED_METHODS,
    allow_headers=config.ALLOWED_HEADERS,
    max_age=600,
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Baseline hardening for the API responses (CSP is set by the static host for the app itself)."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
    response.headers["Cache-Control"] = "no-store"
    return response


# Include routers
app.include_router(content.router, prefix="/api", tags=["content"])
app.include_router(progress.router, prefix="/api", tags=["progress"])
app.include_router(labs.router, prefix="/api", tags=["labs"])
app.include_router(pcaps.router, prefix="/api", tags=["pcaps"])
app.include_router(enterprise.router, prefix="/api", tags=["enterprise"])
app.include_router(auth.router, prefix="/api", tags=["auth"])


@app.on_event("startup")
async def startup_event():
    init_db()


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "WiFiForge API",
        "version": "0.2.0",
        "mode": "local",
        "auth_enabled": bool(config.JWT_SECRET),
        "demo_users": config.DEMO_USERS_ENABLED,
        "message": "Forge. Break. Fix. Retest.",
    }


@app.get("/")
async def root():
    return {
        "name": "WiFiForge — Wireless Security Academy",
        "tagline": "Forge. Break. Fix. Retest.",
        "scope": "Optional local helper API. The academy itself is a static, offline-capable build.",
        "docs": "/docs",
    }

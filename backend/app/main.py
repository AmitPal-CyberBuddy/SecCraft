from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.dependencies import auth_is_configured
from app.api.v1.router import router as v1_router
from app.core import config
from app.core.database import init_db
from app.core.feedback_body_limit import FeedbackBodyLimit
from app.routers import content, learning_paths, pcaps


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Local SQLite may create its schema for development/tests. Deployed PostgreSQL uses Alembic.
    init_db()
    yield


app = FastAPI(
    title="SecCraft API",
    description=(
        "Versioned account and synchronization API plus read-only access to version-controlled learning "
        "content and supplied lab artifacts. Guest learning remains static and available without this service."
    ),
    version="3.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if config.ENABLE_API_DOCS else None,
    redoc_url="/api/redoc" if config.ENABLE_API_DOCS else None,
    openapi_url="/api/openapi.json" if config.ENABLE_API_DOCS else None,
)

app.add_middleware(FeedbackBodyLimit)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=config.ALLOWED_METHODS,
    allow_headers=config.ALLOWED_HEADERS,
    max_age=600,
    expose_headers=["Retry-After"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=(), usb=()")
    response.headers.setdefault("Cache-Control", "no-store" if request.url.path.startswith("/api/v1/") else "public, max-age=60")
    return response


# Only read-only public static/catalogue routes are retained under the legacy /api prefix. The former
# shared-local progress, demo login, answer-revealing lab validator, analytics, and upload routes are
# deliberately no longer mounted.
for router in (content.router, learning_paths.router, pcaps.router):
    app.include_router(router, prefix="/api")
app.include_router(v1_router, prefix="/api/v1")


@app.get("/api/health", include_in_schema=False)
def health():
    return {
        "status": "ok",
        "service": "SecCraft API",
        "version": "3.0.0",
        "platform": "SecCraft",
        "guest_learning_available": True,
        "account_services_configured": auth_is_configured(),
    }

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import content, progress, labs, pcaps, enterprise, auth, learning_paths
from app.core.database import init_db
from app.core import config


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="SecCraft API — Hands-on Cybersecurity Learning Platform",
    description=(
        "Optional local API for SecCraft: learning-path and content metadata, offline capture decoding, "
        "and optional progress storage. The GitHub Pages frontend is static and uses bundled learning "
        "and lab data; it does not require this service. This API is intended for local development "
        "and should only be exposed with an explicitly configured origin allowlist and secrets."
    ),
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Keep every API surface under the same prefix used by the frontend and reverse-proxy config.
for router in (content.router, progress.router, labs.router, pcaps.router, enterprise.router, auth.router, learning_paths.router):
    app.include_router(router, prefix="/api")


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "SecCraft API — Hands-on Cybersecurity Learning Platform",
        "version": "2.1.0",
        "platform": "SecCraft",
        # Retained for clients that identify the former product name.
        "legacy": "WiFiForge",
        "learning_paths": 8,
        "available_learning_paths": 1,
        "tagline": "Learn. Practice. Investigate. Improve.",
        "secondary": "Learn cybersecurity by doing.",
        "philosophy": "Investigate → Test → Collect evidence → Assess impact → Remediate → Retest → Report",
        "message": "SecCraft — Learn. Practice. Investigate. Improve. Wireless Pentesting is the first available learning path.",
    }

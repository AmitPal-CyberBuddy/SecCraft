from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.routers import content, progress, labs, pcaps, enterprise, auth, learning_paths
from app.core.database import init_db
from app.core import config

app = FastAPI(
    title="SecCraft API — Hands-on Cybersecurity Learning Platform (optional local parser)",
    description=(
        "Local, zero-cost helper API for the SecCraft hands-on cybersecurity learning platform (legacy WiFiForge): "
        "learning paths, content metadata, offline capture decoding and optional multi-user progress storage. "
        "The hosted build is static and does not require this service; nothing here is exposed to the internet by default. "
        "SecCrafting hardens metal after forging — maps to Fix→Retest loop. Tagline: Forge. Break. Fix. SecCraft. Retest."
    ),
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

app.include_router(content.router)
app.include_router(progress.router)
app.include_router(labs.router)
app.include_router(pcaps.router)
app.include_router(enterprise.router)
app.include_router(auth.router)
app.include_router(learning_paths.router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "SecCraft API — Hands-on Cybersecurity Learning Platform (legacy WiFiForge)",
        "version": "2.1.0",
        "platform": "SecCraft",
        "legacy": "WiFiForge",
        "learning_paths": 8,
        "tagline": "Forge. Break. Fix. SecCraft. Retest.",
        "secondary": "Learn cybersecurity by doing.",
        "philosophy": "Learn → Understand → Observe → Enumerate → Test → Validate → Collect Evidence → Understand Impact → Remediate → SecCraft (Harden) → Retest → Report",
        "message": "Forge. Break. Fix. SecCraft. Retest. — Learn cybersecurity by doing. — Wireless Pentesting is Learning Path #1 (legacy WiFiForge).",
    }

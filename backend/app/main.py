from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import content, progress, labs, pcaps
from app.core.database import init_db

app = FastAPI(
    title="WiFiForge API",
    description="Wireless Pentest Academy — Backend API",
    version="0.1.0",
)

# CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(content.router, prefix="/api", tags=["content"])
app.include_router(progress.router, prefix="/api", tags=["progress"])
app.include_router(labs.router, prefix="/api", tags=["labs"])
app.include_router(pcaps.router, prefix="/api", tags=["pcaps"])

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "WiFiForge API",
        "version": "0.1.0",
        "mode": "local",
        "message": "Forge. Break. Fix. Retest."
    }

@app.get("/")
async def root():
    return {
        "name": "WiFiForge — Wireless Pentest Academy",
        "tagline": "Forge. Break. Fix. Retest.",
        "docs": "/docs",
        "health": "/api/health"
    }

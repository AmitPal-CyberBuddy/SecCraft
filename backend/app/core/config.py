import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
CONTENT_DIR = BASE_DIR.parent / "frontend" / "src" / "content"
# Fallback to content/ if exists at repo root
REPO_CONTENT_DIR = BASE_DIR.parent / "content"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/wififorge.db")

# Allowed origins
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

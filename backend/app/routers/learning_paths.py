from fastapi import APIRouter, HTTPException
import json
from pathlib import Path
from app.core.config import CONTENT_DIR, REPO_CONTENT_DIR

router = APIRouter()

def get_learning_paths_path():
    p = CONTENT_DIR / "learning-paths.json"
    if p.exists():
        return p
    p2 = REPO_CONTENT_DIR / "learning-paths.json"
    if p2.exists():
        return p2
    # Fallback to frontend/src/content/learning-paths.json from repo root
    from app.core.config import REPO_ROOT
    p3 = REPO_ROOT / "frontend" / "src" / "content" / "learning-paths.json"
    if p3.exists():
        return p3
    return p

@router.get("/learning-paths")
async def list_learning_paths():
    path = get_learning_paths_path()
    if not path.exists():
        raise HTTPException(
            status_code=503,
            detail="Learning paths content not found. Expected frontend/src/content/learning-paths.json",
        )
    with open(path) as f:
        data = json.load(f)
    return data

@router.get("/learning-paths/{path_id}")
async def get_learning_path(path_id: str):
    path = get_learning_paths_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="Learning paths not found")
    with open(path) as f:
        paths = json.load(f)
    for p in paths:
        if p["id"] == path_id:
            return p
    raise HTTPException(status_code=404, detail="Learning path not found")

@router.get("/platform")
async def get_platform():
    # platform.json
    from app.core.config import REPO_ROOT
    candidates = [
        CONTENT_DIR / "platform.json",
        REPO_ROOT / "frontend" / "src" / "content" / "platform.json",
    ]
    for cand in candidates:
        if cand.exists():
            with open(cand) as f:
                return json.load(f)
    raise HTTPException(status_code=404, detail="Platform config not found")

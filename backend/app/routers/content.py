from fastapi import APIRouter, HTTPException
from pathlib import Path
import json
from app.core.config import CONTENT_DIR, REPO_CONTENT_DIR

router = APIRouter()

def get_modules_path():
    # Try frontend content first
    p = CONTENT_DIR / "modules.json"
    if p.exists():
        return p
    # Fallback to repo content
    p2 = REPO_CONTENT_DIR / "modules.json"
    if p2.exists():
        return p2
    # Try backend relative
    return p

@router.get("/modules")
async def list_modules():
    path = get_modules_path()
    if not path.exists():
        # No content in this checkout — say so instead of inventing a module list.
        raise HTTPException(
            status_code=503,
            detail=(
                "Module content not found. Expected frontend/src/content/modules.json (or content/modules.json). "
                "Serve the API from a full checkout of the repository."
            ),
        )
    with open(path) as f:
        data = json.load(f)
    return data

@router.get("/modules/{module_id}")
async def get_module(module_id: str):
    path = get_modules_path()
    if not path.exists():
        raise HTTPException(status_code=404, detail="Modules not found")
    with open(path) as f:
        modules = json.load(f)
    for m in modules:
        if m["id"] == module_id:
            return m
    raise HTTPException(status_code=404, detail="Module not found")

@router.get("/content/{module_id}/{lesson_id}")
async def get_lesson_content(module_id: str, lesson_id: str):
    # Try frontend content lessons
    lesson_path = CONTENT_DIR / "lessons" / module_id / f"{lesson_id}.md"
    if lesson_path.exists():
        return lesson_path.read_text()
    # Try repo content
    repo_lesson = REPO_CONTENT_DIR / "modules" / module_id / "lessons" / f"{lesson_id}.md"
    if repo_lesson.exists():
        return repo_lesson.read_text()
    raise HTTPException(status_code=404, detail="Lesson not found")

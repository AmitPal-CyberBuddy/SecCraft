from fastapi import APIRouter, HTTPException
from pathlib import Path
import json
import re
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
async def list_modules(path: str = None):
    modules_path = get_modules_path()
    if not modules_path.exists():
        raise HTTPException(
            status_code=503,
            detail=(
                "Module content not found. Expected frontend/src/content/modules.json (or content/modules.json). "
                "Serve the API from a full checkout of the repository."
            ),
        )
    with open(modules_path) as f:
        data = json.load(f)
    if path:
        # path-aware filter: learningPathId
        filtered = [m for m in data if m.get("learningPathId") == path or m.get("id") in (await _modules_for_path(path))]
        # If filtered empty but path exists, return all with that learningPathId
        if filtered:
            return filtered
        # fallback: filter by learningPathId directly
        return [m for m in data if m.get("learningPathId") == path]
    return data

async def _modules_for_path(path_id: str):
    # helper to get module ids from learning-paths.json
    try:
        from app.core.config import REPO_ROOT
        lp_path = REPO_ROOT / "frontend" / "src" / "content" / "learning-paths.json"
        if lp_path.exists():
            import json as _json
            lps = _json.loads(lp_path.read_text())
            for lp in lps:
                if lp["id"] == path_id:
                    return lp.get("modules", [])
    except Exception:
        pass
    return []

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
    # IDs are repository identifiers, never caller-controlled filesystem paths.
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,127}", module_id) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,127}", lesson_id):
        raise HTTPException(status_code=404, detail="Lesson not found")
    # Try frontend content lessons
    lesson_path = CONTENT_DIR / "lessons" / module_id / f"{lesson_id}.md"
    if lesson_path.exists():
        return lesson_path.read_text()
    # Try repo content
    repo_lesson = REPO_CONTENT_DIR / "modules" / module_id / "lessons" / f"{lesson_id}.md"
    if repo_lesson.exists():
        return repo_lesson.read_text()
    raise HTTPException(status_code=404, detail="Lesson not found")

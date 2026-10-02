"""Content delivery API separating public catalogue metadata from authenticated learning content."""

from functools import lru_cache
import json
import os
from pathlib import Path
import re
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.dependencies import active_profile
from app.core.config import CONTENT_DIR, PCAP_DIR, REPO_CONTENT_DIR, REPO_ROOT
from app.core.database import get_db
from app.models.content import ContentArtifact, ContentRecord, ContentRelease
from app.models.platform import UserProfile
from app.services.content_storage import get_verified

router = APIRouter()

SAFE_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$")
SAFE_FILENAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}\.(pcapng|pcap|zip|json|txt|md)$")


def _validate_id(val: str, name: str = "identifier") -> str:
    if not isinstance(val, str) or not SAFE_ID_PATTERN.fullmatch(val):
        raise HTTPException(status_code=404, detail=f"Invalid {name}.")
    return val


def _get_json_file(filename: str) -> Path:
    candidates = [
        CONTENT_DIR / filename,
        REPO_CONTENT_DIR / filename,
        REPO_ROOT / "frontend" / "src" / "content" / filename,
    ]
    for c in candidates:
        if c.is_file():
            return c
    return candidates[0]


@lru_cache(maxsize=16)
def _load_json_cached(filename: str, mtime: float) -> Any:
    path = _get_json_file(filename)
    if not path.is_file():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_content_json(filename: str) -> Any:
    path = _get_json_file(filename)
    if not path.is_file():
        return None
    mtime = path.stat().st_mtime
    return _load_json_cached(filename, mtime)


# ==============================================================================
# PUBLIC CATALOGUE & DISCOVERY METADATA (NO AUTH REQUIRED)
# ==============================================================================

@router.get("/catalog")
def get_public_catalog() -> dict[str, Any]:
    """Returns public academy catalogue metadata without sensitive lesson bodies or answer keys."""
    raw_modules = load_content_json("modules.json") or []
    raw_paths = load_content_json("learning-paths.json") or []
    raw_skills = load_content_json("skills.json") or []

    # Strip raw content / answers from modules for public consumption
    public_modules = []
    for m in raw_modules:
        lessons_summary = [
            {
                "id": l.get("id"),
                "title": l.get("title"),
                "kind": l.get("kind", "concept"),
            }
            for l in m.get("lessons", [])
        ]
        public_modules.append({
            "id": m.get("id"),
            "title": m.get("title"),
            "learningPathId": m.get("learningPathId"),
            "phase": m.get("phase"),
            "phaseName": m.get("phaseName"),
            "difficulty": m.get("difficulty"),
            "estimated_hours": m.get("estimated_hours"),
            "prerequisites": m.get("prerequisites", []),
            "skills": m.get("skills", []),
            "description": m.get("description"),
            "objectives": m.get("objectives", []),
            "lessons_count": len(lessons_summary),
            "lessons": lessons_summary,
            "lab_requirement": m.get("lab_requirement"),
        })

    return {
        "paths": raw_paths,
        "modules": public_modules,
        "skills": raw_skills,
    }


@router.get("/paths/{path_id}")
def get_path_overview(path_id: str) -> dict[str, Any]:
    """Returns single learning path discovery overview."""
    _validate_id(path_id, "path_id")
    raw_paths = load_content_json("learning-paths.json") or []
    target_path = next((p for p in raw_paths if p.get("id") == path_id), None)
    if not target_path:
        raise HTTPException(status_code=404, detail="Learning path not found.")

    raw_modules = load_content_json("modules.json") or []
    path_modules = [
        {
            "id": m.get("id"),
            "title": m.get("title"),
            "phase": m.get("phase"),
            "phaseName": m.get("phaseName"),
            "difficulty": m.get("difficulty"),
            "estimated_hours": m.get("estimated_hours"),
            "description": m.get("description"),
            "skills": m.get("skills", []),
            "lessons_count": len(m.get("lessons", [])),
        }
        for m in raw_modules
        if m.get("learningPathId") == path_id or m.get("id") in target_path.get("modules", [])
    ]

    return {
        **target_path,
        "modules_detail": path_modules,
    }


@router.get("/modules/{module_id}/overview")
def get_module_overview(module_id: str) -> dict[str, Any]:
    """Returns single module discovery overview for public inspection."""
    _validate_id(module_id, "module_id")
    raw_modules = load_content_json("modules.json") or []
    target_module = next((m for m in raw_modules if m.get("id") == module_id), None)
    if not target_module:
        raise HTTPException(status_code=404, detail="Module not found.")

    lessons_summary = [
        {
            "id": l.get("id"),
            "title": l.get("title"),
            "kind": l.get("kind", "concept"),
        }
        for l in target_module.get("lessons", [])
    ]

    return {
        "id": target_module.get("id"),
        "title": target_module.get("title"),
        "learningPathId": target_module.get("learningPathId"),
        "phase": target_module.get("phase"),
        "phaseName": target_module.get("phaseName"),
        "difficulty": target_module.get("difficulty"),
        "estimated_hours": target_module.get("estimated_hours"),
        "prerequisites": target_module.get("prerequisites", []),
        "skills": target_module.get("skills", []),
        "description": target_module.get("description"),
        "objectives": target_module.get("objectives", []),
        "evidence_focus": target_module.get("evidence_focus"),
        "retest_focus": target_module.get("retest_focus"),
        "lessons_count": len(lessons_summary),
        "lessons": lessons_summary,
        "lab_requirement": target_module.get("lab_requirement"),
    }


# ==============================================================================
# EXPLICIT PUBLIC SAMPLES (NO AUTH; NEVER DERIVED FROM CONTENT MATURITY/FOLDERS)
# ==============================================================================

PUBLIC_SAMPLE_LESSONS = {
    ("01-intro-wireless", "02-scope-and-assessment-decisions"),
    ("android-01-platform", "01-architecture-sandbox-and-trust-boundaries"),
}
PUBLIC_WIRELESS_SAMPLE_FILES = {"README.md", "authorized-inventory.csv", "scope.md", "worksheet.md"}


@router.get("/samples/lessons/{module_id}/{lesson_id}")
def get_public_sample_lesson(module_id: str, lesson_id: str) -> dict[str, Any]:
    _validate_id(module_id, "module_id")
    _validate_id(lesson_id, "lesson_id")
    if (module_id, lesson_id) not in PUBLIC_SAMPLE_LESSONS:
        raise HTTPException(status_code=404, detail="Public sample not found.")
    lesson_file = REPO_ROOT / "frontend" / "src" / "content" / "lessons" / module_id / f"{lesson_id}.md"
    if not lesson_file.is_file():
        raise HTTPException(status_code=404, detail="Public sample not found.")
    return {"module_id": module_id, "lesson_id": lesson_id, "content": lesson_file.read_text(encoding="utf-8"), "access": "public-sample"}


@router.get("/samples/wireless/{filename}")
def get_public_wireless_sample_file(filename: str):
    if filename not in PUBLIC_WIRELESS_SAMPLE_FILES:
        raise HTTPException(status_code=404, detail="Public sample file not found.")
    sample_root = REPO_ROOT / "frontend" / "public" / "wireless-foundations" / "WF-FND-01"
    file = sample_root / filename
    if not file.is_file():
        raise HTTPException(status_code=404, detail="Public sample file not found.")
    return FileResponse(file, filename=filename)


# ==============================================================================
# AUTHENTICATED LEARNING CONTENT DELIVERY (ACTIVE PROFILE REQUIRED)
# ==============================================================================

@router.get("/lessons/{module_id}/{lesson_id}")
def get_lesson_content(
    module_id: str,
    lesson_id: str,
    user: UserProfile = Depends(active_profile),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Authenticated delivery from the current imported release, with a development file fallback."""
    _validate_id(module_id, "module_id")
    _validate_id(lesson_id, "lesson_id")
    current = db.scalar(select(ContentRelease).where(ContentRelease.status == "current"))
    if current:
        record = db.scalar(select(ContentRecord).where(
            ContentRecord.release_id == current.id,
            ContentRecord.stable_id == f"{module_id}/{lesson_id}",
            ContentRecord.content_type == "lesson-body",
            ContentRecord.delivery_class.in_(("protected-learner", "public")),
        ))
        if not record:
            raise HTTPException(status_code=404, detail="Lesson not found in current release.")
        return {"module_id": module_id, "lesson_id": lesson_id, "title": record.display_slug, "content": record.body, "release_id": current.id}

    candidates = [
        CONTENT_DIR / "lessons" / module_id / f"{lesson_id}.md",
        REPO_CONTENT_DIR / "modules" / module_id / "lessons" / f"{lesson_id}.md",
        REPO_CONTENT_DIR / "lessons" / module_id / f"{lesson_id}.md",
        REPO_ROOT / "frontend" / "src" / "content" / "lessons" / module_id / f"{lesson_id}.md",
    ]

    lesson_file: Optional[Path] = None
    for cand in candidates:
        if cand.is_file():
            lesson_file = cand
            break

    if not lesson_file:
        raise HTTPException(status_code=404, detail="Lesson not found.")

    text = lesson_file.read_text(encoding="utf-8")
    title = lesson_id.replace("-", " ").title()
    for line in text.splitlines():
        if line.startswith("# "):
            title = line[2:].strip()
            break

    return {
        "module_id": module_id,
        "lesson_id": lesson_id,
        "title": title,
        "content": text,
    }


@router.get("/quizzes/{module_id}")
def get_module_quiz(
    module_id: str,
    user: UserProfile = Depends(active_profile),
) -> dict[str, Any]:
    """Authenticated delivery of module quiz questions. Requires approved account."""
    _validate_id(module_id, "module_id")
    raw_quizzes = load_content_json("quizzes.json") or {}
    questions = raw_quizzes.get(module_id, [])
    if not questions:
        raise HTTPException(status_code=404, detail="Quiz questions not found for this module.")
    # Learner delivery never includes answer keys or solutions. Grading reads server-only records.
    learner_questions = [
        {key: value for key, value in question.items() if key not in {"correct", "answer", "explanation", "solution", "rationale"}}
        for question in questions
    ]
    return {
        "module_id": module_id,
        "questions": learner_questions,
        "grading_class": "practice",
    }


@router.get("/labs/{lab_id}")
def get_lab_details(
    lab_id: str,
    user: UserProfile = Depends(active_profile),
) -> dict[str, Any]:
    """Authenticated delivery of practical lab details. Requires approved account."""
    _validate_id(lab_id, "lab_id")
    raw_labs = load_content_json("labs.json") or {}
    labs_list = raw_labs.get("labs", [])
    lab = next((item for item in labs_list if item.get("id") == lab_id), None)
    if not lab:
        raise HTTPException(status_code=404, detail="Lab not found.")
    return lab


@router.get("/artifacts/by-id/{artifact_id}")
def download_imported_artifact(
    artifact_id: str,
    user: UserProfile = Depends(active_profile),
    db: Session = Depends(get_db),
):
    """Serve one current-release learner artifact after account authorization; never expose object keys."""
    _validate_id(artifact_id, "artifact_id")
    current = db.scalar(select(ContentRelease).where(ContentRelease.status == "current"))
    if not current:
        raise HTTPException(status_code=404, detail="No current content release.")
    artifact = db.scalar(select(ContentArtifact).where(
        ContentArtifact.release_id == current.id,
        ContentArtifact.stable_id == artifact_id,
        ContentArtifact.access_class == "protected-learner",
    ))
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found.")
    storage_root = Path(os.getenv("CONTENT_STORAGE_ROOT", "/tmp/seccraft-content-storage")).resolve()
    try:
        data = get_verified(artifact.object_key, artifact.sha256, artifact.size, storage_root)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Artifact object unavailable.")
    except (ValueError, RuntimeError):
        raise HTTPException(status_code=503, detail="Artifact integrity validation failed.")
    return Response(data, media_type=artifact.media_type, headers={
        "Content-Disposition": f'attachment; filename="{artifact.filename}"',
        "Cache-Control": "private, no-store",
    })


@router.get("/artifacts/{artifact_type}/{filename}")
def download_artifact(
    artifact_type: str,
    filename: str,
    user: UserProfile = Depends(active_profile),
):
    """Authenticated download of lab capture files and demo archives. Requires approved account."""
    _validate_id(artifact_type, "artifact_type")
    if not SAFE_FILENAME_PATTERN.fullmatch(filename):
        raise HTTPException(status_code=404, detail="Invalid artifact filename.")

    base_dirs = {
        "pcaps": PCAP_DIR,
        "lab-data": REPO_ROOT / "frontend" / "public" / "lab-data",
        "demos": REPO_ROOT / "frontend" / "public" / "android-demos",
        "cases": REPO_ROOT / "frontend" / "public" / "android-cases",
        "foundations": REPO_ROOT / "frontend" / "public" / "android-foundations",
        "android": REPO_ROOT / "frontend" / "public" / "android-practice",
        "wireless": REPO_ROOT / "frontend" / "public" / "wireless-practice",
    }

    base = base_dirs.get(artifact_type)
    if not base or not base.is_dir():
        raise HTTPException(status_code=404, detail="Artifact category not found.")

    # Search for matching file
    resolved: Optional[Path] = None
    for cand in base.rglob(filename):
        if cand.is_file() and not cand.is_symlink() and cand.resolve().is_relative_to(base.resolve()):
            resolved = cand
            break

    if not resolved:
        raise HTTPException(status_code=404, detail="Artifact file not found.")

    return FileResponse(
        path=resolved,
        filename=resolved.name,
        media_type="application/octet-stream",
    )

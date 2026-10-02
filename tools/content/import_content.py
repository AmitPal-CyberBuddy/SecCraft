#!/usr/bin/env python3
"""Safe content release importer for isolated development/staging environments only."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from sqlalchemy import create_engine, select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402
from app.models.content import ContentArtifact, ContentPrivateMaterial, ContentPublicSample, ContentRecord, ContentRelease  # noqa: E402
from app.services.content_storage import put_verified, using_supabase  # noqa: E402

ALLOWED_ENVS = {"test", "integration-test", "development", "staging", "prelaunch"}


def safety_guard(database_url: str, storage_root: Path) -> None:
    env = os.getenv("PLATFORM_ENV", "").lower()
    if env not in ALLOWED_ENVS:
        raise SystemExit("refusing content import: PLATFORM_ENV must be test, development, staging, or prelaunch")
    lowered = database_url.lower()
    if any(token in lowered for token in ("prod", "production")):
        raise SystemExit("refusing content import: database URL looks like production")
    if os.getenv("CONTENT_IMPORT_ALLOW_NONLOCAL") != "true" and not (lowered.startswith("sqlite:") or "localhost" in lowered or "127.0.0.1" in lowered):
        raise SystemExit("refusing non-local database; set CONTENT_IMPORT_ALLOW_NONLOCAL=true only for a dedicated staging target")
    storage_root.mkdir(parents=True, exist_ok=True)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_manifest(path: Path) -> tuple[dict, bytes]:
    raw = path.read_bytes()
    manifest = json.loads(raw)
    if manifest.get("mode") != "dry-run" or manifest.get("productionWrites") is not False:
        raise ValueError("manifest must be an approved dry-run manifest")
    if manifest["summary"]["unresolvedClassifications"] != 0 or manifest["summary"]["unmappedFindings"] != 0:
        raise ValueError("manifest still has unresolved or unmapped entries")
    return manifest, raw


def source_revision() -> str:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    except Exception:
        return "unknown"


def json_source(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def find_record(entry: dict, source):
    if not isinstance(source, (dict, list)):
        return None
    content_type, stable_id, module = entry["contentType"], entry["contentId"], entry.get("module")
    if content_type == "practice-item" and isinstance(source, dict):
        return next((item for item in source.get(module, []) if item.get("id") == stable_id), None)
    collection = {"lab-record": "labs", "android-case-record": "cases"}.get(content_type)
    values = source.get(collection, []) if collection and isinstance(source, dict) else source if isinstance(source, list) else []
    return next((item for item in values if item.get("id") == stable_id), None)


def split_record(entry: dict, record: dict | None):
    if not record:
        return None, None, None
    kind = entry["contentType"]
    learner, key, solution = dict(record), None, None
    if kind == "practice-item":
        key = {"correct": learner.pop("correct", None)}
        solution = {"explanation": learner.pop("explanation", None)}
    elif kind == "scenario-record":
        options = learner.get("options", [])
        key = {"correctOptionIds": [o.get("id") for o in options if o.get("correct")]}
        solution = {"analysisByOption": {o.get("id"): o.get("analysis") for o in options if o.get("analysis")}}
        learner["options"] = [{k: o.get(k) for k in ("id", "text")} for o in options]
    elif kind == "challenge-record":
        tasks = learner.get("tasks", [])
        key = {"answers": {t.get("id"): t.get("answer") for t in tasks}}
        solution = {"hints": {t.get("id"): t.get("hint") for t in tasks if t.get("hint")}}
        learner["tasks"] = [{k: t.get(k) for k in ("id", "question")} for t in tasks]
    elif kind == "android-case-record":
        solution = {"fixed": learner.pop("fixed", None), "feedback": learner.pop("feedback", None)}
    return learner, key, solution


def runtime_id(entry: dict) -> str:
    return f"{entry['module']}/{entry['contentId']}" if entry.get('module') else entry['contentId']


def copy_artifact(entry: dict, release_id: str, storage_root: Path) -> ContentArtifact:
    source = ROOT / entry["sourcePath"]
    data = source.read_bytes()
    expected = entry["artifact"]
    if len(data) != expected["size"] or sha256(data) != expected["sha256"]:
        raise ValueError(f"artifact integrity mismatch: {entry['sourcePath']}")
    object_key = f"releases/{release_id}/{expected['sha256']}/{expected['filename']}"
    put_verified(object_key, data, expected["sha256"], expected["mediaType"], storage_root)
    return ContentArtifact(release_id=release_id, stable_id=runtime_id(entry), source_path=entry["sourcePath"], object_key=object_key,
        filename=expected["filename"], media_type=expected["mediaType"], size=expected["size"], sha256=expected["sha256"],
        access_class=entry["deliveryClass"], public_sample=entry["deliveryClass"] == "public")


def stage(session: Session, manifest_path: Path, storage_root: Path, release_override: str | None = None) -> dict:
    manifest, raw = load_manifest(manifest_path)
    release_id = release_override or manifest["release"]
    digest = sha256(raw)
    existing = session.get(ContentRelease, release_id)
    if existing:
        if existing.manifest_sha256 != digest:
            raise ValueError(f"release {release_id} already exists with another manifest")
        return counts(session, release_id) | {"idempotent": True, "releaseId": release_id, "status": existing.status}
    release = ContentRelease(id=release_id, schema_version=manifest["schemaVersion"], source_revision=source_revision(), status="staged", manifest_sha256=digest)
    session.add(release)
    session.flush()
    for entry in manifest["entries"]:
        source_path = ROOT / entry["sourcePath"]
        if entry.get("artifact"):
            artifact = copy_artifact(entry, release_id, storage_root)
            session.add(artifact)
            if entry["deliveryClass"] == "public":
                session.add(ContentPublicSample(release_id=release_id, stable_id=runtime_id(entry), sample_type="artifact", approved_sha256=entry["artifact"]["sha256"]))
            continue
        source = json_source(source_path)
        logical = find_record(entry, source)
        learner, key, solution = split_record(entry, logical)
        body = source_path.read_text(encoding="utf-8") if source_path.suffix in {".md", ".txt"} else None
        if entry["deliveryClass"] in {"server-only", "instructor-only"}:
            session.add(ContentPrivateMaterial(release_id=release_id, stable_id=runtime_id(entry), material_type="instructor" if entry["deliveryClass"] == "instructor-only" else "raw-mixed", payload=source if body is None else None, body=body, reveal_policy="never"))
        else:
            session.add(ContentRecord(release_id=release_id, stable_id=runtime_id(entry), content_type=entry["contentType"], career_path_id=entry.get("careerPath"), learning_path_id=entry.get("learningPath"), module_id=entry.get("module"), display_slug=entry["contentId"], delivery_class=entry["deliveryClass"], source_path=entry["sourcePath"], target_locator=entry["target"]["locator"], learner_payload=learner, body=body))
            if entry["deliveryClass"] == "public" and entry["contentType"] == "lesson-body":
                session.add(ContentPublicSample(release_id=release_id, stable_id=runtime_id(entry), sample_type="lesson"))
        if key and any(value is not None for value in key.values()):
            session.add(ContentPrivateMaterial(release_id=release_id, stable_id=runtime_id(entry), material_type="key", payload=key, reveal_policy="never"))
        if solution and any(value is not None for value in solution.values()):
            session.add(ContentPrivateMaterial(release_id=release_id, stable_id=runtime_id(entry), material_type="solution", payload=solution, reveal_policy="after-first-attempt"))
    session.commit()
    return counts(session, release_id) | {"idempotent": False, "releaseId": release_id, "status": "staged"}


def activate(session: Session, release_id: str) -> dict:
    target = session.get(ContentRelease, release_id)
    if not target or target.status not in {"staged", "retired"}:
        raise ValueError("activation target must be staged or retired")
    now = datetime.now(timezone.utc)
    # Lock release rows on PostgreSQL; the partial unique index independently guarantees one current release.
    for current in session.scalars(select(ContentRelease).where(ContentRelease.status == "current").with_for_update()).all():
        current.status, current.retired_at = "retired", now
    session.flush()  # retire before promoting so the one-current unique index is never transiently violated
    target.status, target.activated_at, target.retired_at = "current", now, None
    session.commit()
    return {"releaseId": release_id, "status": "current"}


def counts(session: Session, release_id: str) -> dict:
    return {"records": len(session.scalars(select(ContentRecord).where(ContentRecord.release_id == release_id)).all()),
        "privateMaterials": len(session.scalars(select(ContentPrivateMaterial).where(ContentPrivateMaterial.release_id == release_id)).all()),
        "artifacts": len(session.scalars(select(ContentArtifact).where(ContentArtifact.release_id == release_id)).all()),
        "publicSamples": len(session.scalars(select(ContentPublicSample).where(ContentPublicSample.release_id == release_id)).all())}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("stage", "activate", "rollback", "status"))
    parser.add_argument("--manifest", type=Path, default=ROOT / "content/migration/CONTENT_MIGRATION_MANIFEST.json")
    parser.add_argument("--release")
    parser.add_argument("--database-url", default=os.getenv("PLATFORM_DATABASE_URL", "sqlite:////tmp/seccraft-content-staging.db"))
    parser.add_argument("--storage-root", type=Path, default=Path(os.getenv("CONTENT_STORAGE_ROOT", "/tmp/seccraft-content-storage")))
    args = parser.parse_args()
    safety_guard(args.database_url, args.storage_root)
    engine = create_engine(args.database_url)
    if engine.dialect.name == "sqlite":
        engine = engine.execution_options(schema_translate_map={"content": None})
    with Session(engine) as session:
        if args.command == "stage": result = stage(session, args.manifest, args.storage_root, args.release)
        elif args.command in {"activate", "rollback"}:
            if not args.release: raise SystemExit("--release is required")
            result = activate(session, args.release)
        else:
            result = [{"releaseId": r.id, "status": r.status, **counts(session, r.id)} for r in session.scalars(select(ContentRelease)).all()]
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    main()

from __future__ import annotations
import json
from pathlib import Path
import sys

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools/content"))
from import_content import activate, stage  # noqa: E402
from app.core.database import Base  # noqa: E402
from app.models.content import ContentArtifact, ContentPrivateMaterial, ContentRelease  # noqa: E402


def test_synthetic_manifest_import(tmp_path: Path) -> None:
    evidence = ROOT / "content/fixtures/synthetic-evidence.txt"
    import hashlib
    data = evidence.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    manifest_data = {
        "schemaVersion": 1, "mode": "dry-run", "productionWrites": False, "release": "synthetic-db-import",
        "summary": {"unresolvedClassifications": 0, "unmappedFindings": 0},
        "entries": [{
            "sourcePath": "content/fixtures/synthetic-evidence.txt", "contentType": "artifact", "contentId": "synthetic-evidence",
            "careerPath": "cybersecurity", "learningPath": "synthetic-security", "module": "synthetic-boundaries",
            "classification": "MOVE_TO_PROTECTED_CONTENT", "deliveryClass": "protected-learner",
            "target": {"locator": "protected-artifacts/synthetic-evidence.txt"},
            "artifact": {"filename": "synthetic-evidence.txt", "mediaType": "text/plain", "size": len(data), "sha256": digest},
        }],
    }
    manifest = tmp_path / "synthetic-manifest.json"
    manifest.write_text(json.dumps(manifest_data))
    engine = create_engine(f"sqlite:///{tmp_path / 'synthetic.db'}").execution_options(schema_translate_map={"content": None})
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        result = stage(session, manifest, tmp_path / "storage")
        assert result["artifacts"] == 1 and result["records"] == 0 and result["idempotent"] is False


def test_full_manifest_stages_idempotently_and_rolls_back(tmp_path: Path) -> None:
    engine = create_engine(f"sqlite:///{tmp_path / 'staging.db'}").execution_options(schema_translate_map={"content": None})
    Base.metadata.create_all(engine)
    manifest = ROOT / "content/migration/CONTENT_MIGRATION_MANIFEST.json"
    storage = tmp_path / "storage"
    with Session(engine) as session:
        first = stage(session, manifest, storage, "test-release-1")
        assert first == {"records": 363, "privateMaterials": 446, "artifacts": 173, "publicSamples": 6, "idempotent": False, "releaseId": "test-release-1", "status": "staged"}
        again = stage(session, manifest, storage, "test-release-1")
        assert again["idempotent"] is True
        assert activate(session, "test-release-1")["status"] == "current"
        stage(session, manifest, storage, "test-release-2")
        activate(session, "test-release-2")
        activate(session, "test-release-1")
        statuses = {row.id: row.status for row in session.scalars(select(ContentRelease)).all()}
        assert statuses == {"test-release-1": "current", "test-release-2": "retired"}
        assert session.scalar(select(ContentArtifact).where(ContentArtifact.access_class == "server-only")) is not None
        solution = session.scalar(select(ContentPrivateMaterial).where(ContentPrivateMaterial.material_type == "solution"))
        assert solution is not None and solution.reveal_policy == "after-first-attempt"


def test_importer_refuses_unresolved_manifest(tmp_path: Path) -> None:
    source = json.loads((ROOT / "content/migration/CONTENT_MIGRATION_MANIFEST.json").read_text())
    source["summary"]["unresolvedClassifications"] = 1
    manifest = tmp_path / "bad.json"
    manifest.write_text(json.dumps(source))
    engine = create_engine(f"sqlite:///{tmp_path / 'bad.db'}").execution_options(schema_translate_map={"content": None})
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        try:
            stage(session, manifest, tmp_path / "storage")
        except ValueError as exc:
            assert "unresolved" in str(exc)
        else:
            raise AssertionError("unresolved manifest must be rejected")

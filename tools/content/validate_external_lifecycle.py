#!/usr/bin/env python3
"""External N/N+1, concurrent activation, rollback, and no-backend-deploy acceptance."""
from __future__ import annotations
import json, os, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[2]
BASE_MANIFEST=ROOT/"content/migration/CONTENT_MIGRATION_MANIFEST.json"
LESSON=ROOT/"frontend/src/content/lessons/android-01-platform/02-components-binder-and-permissions.md"
MARKER="Pre-launch release update acceptance marker."
DB=os.environ["PLATFORM_DATABASE_URL"]
RELEASE_N=os.environ["CONTENT_RELEASE_ID"]
RELEASE_NEXT=f"{RELEASE_N}-update"


def importer(command, release, manifest=BASE_MANIFEST):
    result=subprocess.run([sys.executable,str(ROOT/"tools/content/import_content.py"),command,"--release",release,"--manifest",str(manifest),"--database-url",DB],cwd=ROOT,text=True,capture_output=True)
    if result.returncode: raise RuntimeError(result.stderr or result.stdout)
    return json.loads(result.stdout)


def lesson_body():
    url=os.environ["STAGING_API_URL"].rstrip("/")+"/api/v1/content/lessons/android-01-platform/02-components-binder-and-permissions"
    request=Request(url,headers={"Authorization":f"Bearer {os.environ['STAGING_APPROVED_JWT']}"})
    with urlopen(request,timeout=30) as response: return json.loads(response.read())["content"]


def main():
    original=LESSON.read_text()
    if MARKER in original: raise RuntimeError("acceptance marker already exists in authored source")
    manifest=json.loads(BASE_MANIFEST.read_text()); manifest["release"]=RELEASE_NEXT
    with tempfile.TemporaryDirectory() as directory:
        next_manifest=Path(directory)/"release-next.json"; next_manifest.write_text(json.dumps(manifest))
        try:
            LESSON.write_text(original+f"\n\n{MARKER}\n")
            staged=importer("stage",RELEASE_NEXT,next_manifest)
            assert staged["status"]=="staged" and not staged["idempotent"]
            assert importer("stage",RELEASE_NEXT,next_manifest)["idempotent"] is True
        finally:
            LESSON.write_text(original)
        # Competing activations may serialize or one may lose the unique-index race; only the invariant matters.
        def activate(release):
            try: return (release,"ok",importer("activate",release))
            except Exception as exc: return (release,"rejected",type(exc).__name__)
        with ThreadPoolExecutor(max_workers=2) as pool: outcomes=list(pool.map(activate,(RELEASE_N,RELEASE_NEXT)))
        from sqlalchemy import create_engine, text
        engine=create_engine(DB)
        with engine.connect() as connection:
            assert connection.execute(text("SELECT count(*) FROM content.content_releases WHERE status='current'")).scalar_one()==1
            current=connection.execute(text("SELECT id FROM content.content_releases WHERE status='current'")).scalar_one()
        if current != RELEASE_NEXT: importer("activate",RELEASE_NEXT)
        assert MARKER in lesson_body(), "FastAPI did not serve the activated database content"
        importer("rollback",RELEASE_N)
        assert MARKER not in lesson_body(), "rollback did not restore the previous release body"
        print(json.dumps({"releaseN":RELEASE_N,"releaseNPlus1":RELEASE_NEXT,"concurrentOutcomes":outcomes,"oneCurrent":True,"updatedContentServedWithoutBackendRestart":True,"rollbackServedPreviousContent":True},indent=2))

if __name__=="__main__": main()

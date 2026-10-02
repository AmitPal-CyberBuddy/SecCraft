#!/usr/bin/env python3
"""Backup/restore external staging DB and referenced private objects; never prints secrets."""
from __future__ import annotations
import hashlib, json, os, subprocess, sys
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from sqlalchemy import create_engine, text


def req(method, base, bucket, key, service_key, data=None):
    url=f"{base.rstrip('/')}/storage/v1/object/{quote(bucket, safe='')}/{quote(key, safe='/')}"
    headers={"Authorization":f"Bearer {service_key}","apikey":service_key}
    if data is not None: headers.update({"Content-Type":"application/octet-stream","x-upsert":"true"})
    with urlopen(Request(url,data=data,headers=headers,method=method),timeout=60) as r: return r.read()

def backup(dest: Path):
    dest.mkdir(parents=True,exist_ok=False); db=os.environ["CONTENT_BACKUP_DATABASE_URL"]
    subprocess.run(["pg_dump","--format=custom","--file",str(dest/"database.dump"),db],check=True)
    engine=create_engine(os.environ["PLATFORM_DATABASE_URL"])
    with engine.connect() as c: rows=[dict(r) for r in c.execute(text("SELECT object_key,sha256,size FROM content.content_artifacts")).mappings()]
    base=os.environ["SUPABASE_URL"]; bucket=os.environ["CONTENT_STORAGE_BUCKET"]; service=os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    for row in rows:
        data=req("GET",base,bucket,row["object_key"],service)
        assert len(data)==row["size"] and hashlib.sha256(data).hexdigest()==row["sha256"]
        path=dest/"objects"/row["object_key"]; path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(data)
    (dest/"objects.json").write_text(json.dumps(rows,indent=2)+"\n")
    print(f"backup complete: {len(rows)} verified objects and PostgreSQL dump")

def restore(src: Path):
    # Restoration must target isolated recovery resources, never the live staging DB/bucket.
    db=os.environ["CONTENT_RECOVERY_DATABASE_URL"]
    local_root=os.getenv("CONTENT_RECOVERY_STORAGE_ROOT")
    base=os.getenv("CONTENT_RECOVERY_SUPABASE_URL",""); bucket=os.getenv("CONTENT_RECOVERY_STORAGE_BUCKET",""); service=os.getenv("CONTENT_RECOVERY_SERVICE_ROLE_KEY","")
    target=db+(local_root or base+bucket)
    if any(x in target.lower() for x in ("prod","production")): raise SystemExit("refusing production-looking recovery target")
    if not local_root and not all((base,bucket,service)): raise SystemExit("set CONTENT_RECOVERY_STORAGE_ROOT or all recovery Supabase variables")
    subprocess.run(["pg_restore","--clean","--if-exists","--no-owner","--dbname",db,str(src/"database.dump")],check=True)
    rows=json.loads((src/"objects.json").read_text())
    for row in rows:
        data=(src/"objects"/row["object_key"]).read_bytes(); assert len(data)==row["size"] and hashlib.sha256(data).hexdigest()==row["sha256"]
        if local_root:
            destination=Path(local_root)/row["object_key"]; destination.parent.mkdir(parents=True,exist_ok=True); destination.write_bytes(data)
        else: req("POST",base,bucket,row["object_key"],service,data)
    print(f"restore complete: database and {len(rows)} verified objects restored to isolated recovery target")

if __name__=="__main__":
    if len(sys.argv)!=3 or sys.argv[1] not in {"backup","restore"}: raise SystemExit("usage: backup_external_staging.py backup|restore PATH")
    {"backup":backup,"restore":restore}[sys.argv[1]](Path(sys.argv[2]))

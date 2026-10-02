#!/usr/bin/env python3
"""Pre-launch progress compatibility probes using synthetic approved accounts only."""
from __future__ import annotations
import json, os
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from sqlalchemy import create_engine, text

BASE=os.environ["STAGING_API_URL"].rstrip("/")+"/api/v1"
NEW=os.environ["STAGING_APPROVED_JWT"]
EXISTING=os.environ["STAGING_APPROVED_WITH_PROGRESS_JWT"]
PENDING=os.environ["STAGING_PENDING_JWT"]
RECORD={"path_id":"android-pentesting","module_id":"android-01-platform","activity_type":"lesson","activity_id":"01-architecture-sandbox-and-trust-boundaries","content_version":"current","state":"completed"}

def call(method,path,token,payload=None):
    data=json.dumps(payload).encode() if payload is not None else None
    request=Request(BASE+path,data=data,method=method,headers={"Authorization":f"Bearer {token}","Content-Type":"application/json"})
    try:
        with urlopen(request,timeout=30) as response: return response.status,json.loads(response.read())
    except HTTPError as exc: return exc.code,json.loads(exc.read())

def main():
    assert call("GET","/progress",PENDING)[0]==403
    status,fresh=call("GET","/progress",NEW); assert status==200
    # This account must remain a genuine no-history fixture.
    assert fresh["records"]==[] and fresh["xp"]["total"]==0
    status,result=call("POST","/progress/import",EXISTING,{"records":[RECORD]}); assert status==200
    assert result["imported_records_are_verified"] is False and result["xp_awarded"]==0
    status,history=call("GET","/progress",EXISTING); assert status==200
    match=next((row for row in history["records"] if all(row[key]==value for key,value in RECORD.items())),None)
    assert match and match["verified"] is False and match["source"] in {"local_import","self_reported"}
    engine=create_engine(os.environ["PLATFORM_DATABASE_URL"])
    with engine.connect() as connection:
        assert connection.execute(text("SELECT count(*) FROM progress_records WHERE verified=true AND activity_id=:id"),{"id":RECORD["activity_id"]}).scalar_one()==0
    print("progress: pending denied; no-history account empty; historical stable IDs readable; Practice remained unverified with zero XP")
if __name__=="__main__": main()

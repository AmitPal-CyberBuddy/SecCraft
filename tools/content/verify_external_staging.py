#!/usr/bin/env python3
"""Fail-closed probes for real external PostgreSQL, private Storage, and FastAPI."""
from __future__ import annotations
import hashlib, json, os, sys
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import Request, urlopen
from sqlalchemy import create_engine, text


def request(url, token=None, apikey=None):
    headers = {}
    if token: headers["Authorization"] = f"Bearer {token}"
    if apikey: headers["apikey"] = apikey
    try:
        with urlopen(Request(url, headers=headers), timeout=30) as response:
            return response.status, response.read()
    except HTTPError as exc:
        return exc.code, exc.read()


def artifact_row():
    engine = create_engine(os.environ["PLATFORM_DATABASE_URL"])
    with engine.connect() as conn:
        row = conn.execute(text("SELECT stable_id, object_key, sha256, size FROM content.content_artifacts WHERE access_class='protected-learner' ORDER BY id LIMIT 1")).mappings().first()
    if not row: raise AssertionError("no protected learner artifact was imported")
    return row


def database():
    engine = create_engine(os.environ["PLATFORM_DATABASE_URL"])
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='content' AND c.relkind='r'")).all()
        expected = {"content_releases", "content_records", "content_private_material", "content_artifacts", "content_public_samples"}
        assert expected == {name for name, enabled in rows if enabled}, "private content schema or RLS is incomplete"
        role = os.environ["CONTENT_DATABASE_RUNTIME_ROLE"]
        policies = conn.execute(text("SELECT tablename FROM pg_policies WHERE schemaname='content' AND policyname='backend_service_access' AND :role = ANY(roles)"), {"role": role}).scalars().all()
        assert expected == set(policies), "backend runtime RLS policies are incomplete"
        assert conn.execute(text("SELECT count(*) FROM content.content_releases WHERE status='current'")).scalar_one() <= 1
    print("database: private content schema, RLS, and one-current invariant verified")


def storage():
    row = artifact_row(); base = os.environ["SUPABASE_URL"].rstrip("/"); bucket = os.environ["CONTENT_STORAGE_BUCKET"]
    url = f"{base}/storage/v1/object/{quote(bucket, safe='')}/{quote(row['object_key'], safe='/')}"
    anon = os.environ["SUPABASE_ANON_KEY"]
    status, _ = request(url, anon, anon)
    assert status in {400, 401, 403, 404}, f"anonymous direct Storage read unexpectedly returned {status}"
    service = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    status, data = request(url, service, service)
    assert status == 200 and len(data) == row["size"] and hashlib.sha256(data).hexdigest() == row["sha256"]
    guessed = url + "-guessed"
    assert request(guessed, anon, anon)[0] in {400, 401, 403, 404}
    print("storage: direct/guessed public reads denied; service object hash verified")


def authorization():
    base = os.environ["STAGING_API_URL"].rstrip("/") + "/api/v1/content"
    pending = os.environ["STAGING_PENDING_JWT"]; approved = os.environ["STAGING_APPROVED_JWT"]
    checks = [
        ("anonymous catalogue", f"{base}/catalog", None, {200}),
        ("anonymous public lesson", f"{base}/samples/lessons/01-intro-wireless/02-scope-and-assessment-decisions", None, {200}),
        ("anonymous protected lesson", f"{base}/lessons/android-01-platform/02-components-binder-and-permissions", None, {401}),
        ("pending protected lesson", f"{base}/lessons/android-01-platform/02-components-binder-and-permissions", pending, {403}),
        ("approved protected lesson", f"{base}/lessons/android-01-platform/02-components-binder-and-permissions", approved, {200}),
        ("approved unknown direct ID", f"{base}/lessons/android-01-platform/does-not-exist", approved, {404}),
    ]
    row = artifact_row(); aid = quote(row["stable_id"], safe="")
    checks += [
        ("anonymous protected artifact", f"{base}/artifacts/by-id/{aid}", None, {401}),
        ("pending protected artifact", f"{base}/artifacts/by-id/{aid}", pending, {403}),
        ("approved protected artifact", f"{base}/artifacts/by-id/{aid}", approved, {200}),
        ("invalid token", f"{base}/lessons/android-01-platform/02-components-binder-and-permissions", approved + "invalid", {401}),
    ]
    failures = []
    for name, url, token, expected in checks:
        status, _ = request(url, token)
        if status not in expected: failures.append(f"{name}: got {status}, expected {sorted(expected)}")
    if failures: raise AssertionError("; ".join(failures))
    print("authorization: anonymous, pending, approved, direct-ID, artifact, and invalid-token probes passed")


if __name__ == "__main__":
    {"database": database, "storage": storage, "authorization": authorization}[sys.argv[1]]()

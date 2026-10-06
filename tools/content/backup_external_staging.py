#!/usr/bin/env python3
"""Back up SecCraft-owned staging data and restore it into disposable recovery resources.

Backup scope is exactly the SecCraft-owned data: the private ``content`` schema and the
application tables in ``public`` (accounts, progress, feedback, and the Alembic version marker).
Supabase-managed schemas (``auth``, ``storage``, ``extensions``, and the other internal schemas)
are never dumped, never restored, and never written to a GitHub artifact.

Connection strings and keys are secrets. Every URL is normalised in memory to the ordinary
``postgresql://`` spelling that ``pg_dump``, ``pg_restore``, and ``psql`` accept (they reject the
``postgresql+psycopg://`` SQLAlchemy spelling), PostgreSQL tool output is redacted before any of
it is printed, and no connection string, password, object key credential, or service key is ever
written to the log. The restore target is always a disposable database plus a disposable local
filesystem directory; a production-looking target is refused.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any, Mapping, Sequence
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen

from sqlalchemy import create_engine, text

CONTENT_SCHEMA = "content"
CONTENT_TABLES = (
    "content_releases",
    "content_records",
    "content_private_material",
    "content_artifacts",
    "content_public_samples",
)
# SecCraft-owned application tables in `public`. They are listed one by one because pg_dump
# offers no way to combine a whole-schema dump with individual tables: as soon as --table is
# given, every --schema switch is ignored. Anything not named here belongs to Supabase.
APP_PUBLIC_TABLES = (
    "user_profiles",
    "platform_admins",
    "platform_settings",
    "progress_records",
    "assessment_attempts",
    "xp_events",
    "achievement_awards",
    "admin_audit_events",
    "feedback",
    "feedback_quotas",
    "alembic_version",
)
CONTENT_DUMP_NAME = "content-schema.dump"
PUBLIC_DUMP_NAME = "public-app-tables.dump"
OBJECTS_INDEX_NAME = "objects.json"
MANIFEST_NAME = "manifest.json"
DUMP_NAMES = (CONTENT_DUMP_NAME, PUBLIC_DUMP_NAME)
OBJECT_DIRECTORY = "objects"

URL_PATTERN = re.compile(r"[a-z][a-z0-9+.-]*://[^\s\"']*", re.IGNORECASE)
CREDENTIAL_PATTERN = re.compile(r"[A-Za-z0-9._%+-]+:[^\s:@/]+@")
# Token shapes that must never survive into a diagnostic: Supabase JWTs, service-role keys, and
# bearer headers. Nothing here is ever printed, but a failure message must stay safe if a tool
# ever quotes one of them back.
SECRET_PATTERNS = (
    re.compile(r"eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}"),
    re.compile(r"\b(?:sb|sbp)_[A-Za-z0-9_-]{8,}"),
    re.compile(r"\bservice[_-]?role[_-][A-Za-z0-9_-]{8,}", re.IGNORECASE),
    re.compile(r"\bbearer\s+[A-Za-z0-9._~+/=-]+", re.IGNORECASE),
)
ROLE_PATTERN = re.compile(r"[a-z_][a-z0-9_]{0,62}")
# A path component, host, or database name that clearly belongs to production.
PRODUCTION_PATTERN = re.compile(r"prod(uction)?([-_][a-z0-9]+)*", re.IGNORECASE)


class DatabaseUrlError(RuntimeError):
    """Raised for a missing or unusable database URL; the message never contains the value."""


def cli_database_url(variable: str, environ: Mapping[str, str] | None = None) -> str:
    """Return the postgresql:// spelling of an environment variable, or fail closed.

    ``pg_dump``, ``pg_restore``, and ``psql`` accept an ordinary PostgreSQL URI only. A
    SQLAlchemy URL such as ``postgresql+psycopg://`` is converted entirely in memory; anything
    that is not a PostgreSQL URL is rejected and only the variable name is reported.
    """
    values = os.environ if environ is None else environ
    raw = (values.get(variable) or "").strip()
    if not raw:
        raise DatabaseUrlError(f"required {variable} is unset or empty; connection strings are never printed")
    lowered = raw.lower()
    if lowered.startswith("postgresql://"):
        return raw
    if lowered.startswith("postgres://") or lowered.startswith("postgresql+"):
        remainder = raw.partition("://")[2]
        if remainder:
            return f"postgresql://{remainder}"
    raise DatabaseUrlError(
        f"{variable} must use the postgresql:// scheme that pg_dump, pg_restore, and psql accept; the value is never printed"
    )


def sqlalchemy_database_url(cli_url: str, driver: str = "psycopg") -> str:
    """Derive the SQLAlchemy spelling of an already-normalised CLI URL, in memory only."""
    prefix = "postgresql://"
    if cli_url.startswith(prefix):
        return f"postgresql+{driver}://{cli_url[len(prefix):]}"
    raise DatabaseUrlError("only a postgresql:// URL can be used with SQLAlchemy; the value is never printed")


def _url_components(url: str) -> list[str]:
    try:
        parts = urlsplit(url)
        port = parts.port
    except ValueError:
        return []
    candidates = [parts.username, parts.password, parts.hostname]
    if port:
        candidates.append(str(port))
    candidates.append(parts.path.lstrip("/"))
    candidates.append(parts.query)
    return [value for value in candidates if value and len(value) >= 3]


def looks_like_production(value: str) -> bool:
    """True when one of the value's own components names production, not merely contains 'prod'."""
    return any(PRODUCTION_PATTERN.fullmatch(component.strip()) for component in re.split(r"[/\\:]+", value or "") if component.strip())


def redact(text: str, *urls: str, secrets: Sequence[str] = ()) -> str:
    """Remove every URL, credential, token, and URL component from ``text``."""
    sanitised = text or ""
    for secret in secrets:
        if secret:
            sanitised = sanitised.replace(secret, "[REDACTED-SECRET]")
    for url in urls:
        if not url:
            continue
        sanitised = sanitised.replace(url, "[REDACTED-CONNECTION-STRING]")
        for component in _url_components(url):
            sanitised = sanitised.replace(component, "[REDACTED]")
    sanitised = URL_PATTERN.sub("[REDACTED-CONNECTION-STRING]", sanitised)
    sanitised = CREDENTIAL_PATTERN.sub("[REDACTED-CREDENTIALS]", sanitised)
    for pattern in SECRET_PATTERNS:
        sanitised = pattern.sub("[REDACTED-SECRET]", sanitised)
    return sanitised


def require_value(variable: str, purpose: str, environ: Mapping[str, str] | None = None) -> str:
    values = os.environ if environ is None else environ
    value = (values.get(variable) or "").strip()
    if not value:
        raise SystemExit(f"required {variable} is unset or empty, so {purpose} cannot run; values are never printed")
    return value


def content_dump_command(database_url: str, destination: Path) -> list[str]:
    """pg_dump of the private content schema only: schema DDL, tables, sequences, indexes, policies."""
    return [
        "pg_dump",
        "--format=custom",
        "--no-owner",
        "--no-acl",
        f"--schema={CONTENT_SCHEMA}",
        "--file",
        str(destination),
        database_url,
    ]


def public_dump_command(database_url: str, destination: Path) -> list[str]:
    """pg_dump of only the named SecCraft-owned public tables; no Supabase-managed schema."""
    command = ["pg_dump", "--format=custom", "--no-owner", "--no-acl"]
    command += [f"--table=public.{table}" for table in APP_PUBLIC_TABLES]
    command += ["--file", str(destination), database_url]
    return command


def run_cli(command: Sequence[str], label: str, *redaction_sources: str) -> None:
    """Run a PostgreSQL CLI tool; report a redacted, bounded summary only if it fails."""
    result = subprocess.run(list(command), capture_output=True, text=True, check=False)
    if result.returncode == 0:
        return
    detail = " ".join(part for part in (result.stderr, result.stdout) if part).strip()
    detail = re.sub(r"\s+", " ", redact(detail, *redaction_sources)).strip()[:300]
    detail = detail or "no diagnostic text was produced"
    raise SystemExit(
        f"{label} failed with exit status {result.returncode}; connection strings are never printed. "
        f"Sanitized tool output: {detail}"
    )


def storage_failure(message: str, service_key: str) -> SystemExit:
    """A Storage failure that cannot quote the object URL, the bearer token, or the project key."""
    return SystemExit(f"{redact(message, secrets=(service_key,))} keys and tokens are never printed")


def storage_request(method: str, base: str, bucket: str, key: str, service_key: str, data: bytes | None = None) -> bytes:
    url = f"{base.rstrip('/')}/storage/v1/object/{quote(bucket, safe='')}/{quote(key, safe='/')}"
    headers = {"Authorization": f"Bearer {service_key}", "apikey": service_key}
    if data is not None:
        headers.update({"Content-Type": "application/octet-stream", "x-upsert": "true"})
    try:
        with urlopen(Request(url, data=data, headers=headers, method=method), timeout=60) as response:
            return response.read()
    except HTTPError as error:
        raise storage_failure(f"Storage {method} for object {key!r} returned HTTP {error.code};", service_key) from None
    except URLError as error:
        raise storage_failure(f"Storage {method} for object {key!r} failed: {error.reason};", service_key) from None


def object_index(runtime_url: str) -> list[dict[str, Any]]:
    """Every released object with its recorded size and hash, read through the runtime role."""
    engine = create_engine(runtime_url)
    try:
        with engine.connect() as connection:
            rows = [
                dict(row)
                for row in connection.execute(
                    text(
                        f"SELECT object_key, sha256, size FROM {CONTENT_SCHEMA}.content_artifacts "
                        "ORDER BY object_key"
                    )
                ).mappings()
            ]
    finally:
        engine.dispose()
    if not rows:
        raise SystemExit("the source release has no content artifacts, so a backup would prove nothing")
    keys = [row["object_key"] for row in rows]
    if len(set(keys)) != len(keys):
        raise SystemExit("the source object index contains duplicate object keys")
    return rows


def source_manifest(database_url: str) -> dict[str, Any]:
    """Counts and release metadata captured before the dump, compared again after the restore."""
    engine = create_engine(database_url)
    try:
        with engine.connect() as connection:
            releases = [
                {"release_id": row["id"], "status": row["status"]}
                for row in connection.execute(
                    text(f"SELECT id, status FROM {CONTENT_SCHEMA}.content_releases ORDER BY id")
                ).mappings()
            ]
            counts: dict[str, int] = {}
            for table in CONTENT_TABLES:
                counts[f"{CONTENT_SCHEMA}.{table}"] = connection.execute(
                    text(f"SELECT count(*) FROM {CONTENT_SCHEMA}.{table}")
                ).scalar_one()
            for table in APP_PUBLIC_TABLES:
                counts[f"public.{table}"] = connection.execute(
                    text(f"SELECT count(*) FROM public.{table}")
                ).scalar_one()
    finally:
        engine.dispose()
    if not releases:
        raise SystemExit("the source release history is empty, so a backup would prove nothing")
    if not any(release["status"] == "current" for release in releases):
        raise SystemExit("the source has no current release to back up")
    return {"releases": releases, "counts": counts}


def recovery_state(database_url: str) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """Release metadata and row counts read back from the disposable recovery database."""
    engine = create_engine(database_url)
    try:
        with engine.connect() as connection:
            releases = [
                {"release_id": row["id"], "status": row["status"]}
                for row in connection.execute(
                    text(f"SELECT id, status FROM {CONTENT_SCHEMA}.content_releases ORDER BY id")
                ).mappings()
            ]
            counts: dict[str, int] = {}
            for table in CONTENT_TABLES:
                counts[f"{CONTENT_SCHEMA}.{table}"] = connection.execute(
                    text(f"SELECT count(*) FROM {CONTENT_SCHEMA}.{table}")
                ).scalar_one()
            for table in APP_PUBLIC_TABLES:
                counts[f"public.{table}"] = connection.execute(
                    text(f"SELECT count(*) FROM public.{table}")
                ).scalar_one()
    finally:
        engine.dispose()
    return releases, counts


def load_json(path: Path) -> Any:
    if not path.is_file():
        raise SystemExit(f"the backup is incomplete: {path.name} is missing and nothing is uploaded")
    return json.loads(path.read_text())


def prepare_recovery_database(database_url: str, runtime_role: str) -> None:
    """Create the runtime role the archived content RLS policies reference.

    The dump carries the private content schema's row-level security policies, which are granted
    to the runtime role. A disposable PostgreSQL container does not have that role, so it is
    created here (NOLOGIN, no password) instead of restoring with errors. Only a validated
    identifier is ever interpolated; the value is read from CONTENT_DATABASE_RUNTIME_ROLE.
    """
    if not ROLE_PATTERN.fullmatch(runtime_role):
        raise SystemExit("CONTENT_DATABASE_RUNTIME_ROLE is not a safe PostgreSQL role identifier; values are never printed")
    engine = create_engine(database_url)
    try:
        with engine.begin() as connection:
            present = connection.execute(
                text("SELECT 1 FROM pg_roles WHERE rolname = :name"), {"name": runtime_role}
            ).scalar_one_or_none()
            if not present:
                connection.execute(text(f'CREATE ROLE "{runtime_role}" NOLOGIN'))
    finally:
        engine.dispose()


def backup(destination: Path, environ: Mapping[str, str] | None = None) -> None:
    """Dump SecCraft-owned database objects and download every referenced object."""
    env = os.environ if environ is None else environ
    backup_url = cli_database_url("CONTENT_BACKUP_DATABASE_URL", env)
    runtime_url = require_value("PLATFORM_DATABASE_URL", "the released object index", env)
    base = require_value("SUPABASE_URL", "the private Storage bucket", env)
    bucket = require_value("CONTENT_STORAGE_BUCKET", "the private Storage bucket", env)
    service_key = require_value("SUPABASE_SERVICE_ROLE_KEY", "the private Storage bucket", env)

    if destination.exists():
        raise SystemExit(f"refusing to overwrite the existing backup directory {destination.name}")
    destination.mkdir(parents=True)
    try:
        # Capture the source state first so the restored state can be compared with it.
        manifest = source_manifest(sqlalchemy_database_url(backup_url))
        run_cli(
            content_dump_command(backup_url, destination / CONTENT_DUMP_NAME),
            "pg_dump of the private content schema",
            backup_url,
        )
        run_cli(
            public_dump_command(backup_url, destination / PUBLIC_DUMP_NAME),
            "pg_dump of the SecCraft-owned public tables",
            backup_url,
        )
        for name in DUMP_NAMES:
            dump = destination / name
            if not dump.is_file() or dump.stat().st_size == 0:
                raise SystemExit(f"pg_dump produced no usable {name}; nothing is uploaded")

        rows = object_index(runtime_url)
        for row in rows:
            payload = storage_request("GET", base, bucket, row["object_key"], service_key)
            if len(payload) != row["size"] or hashlib.sha256(payload).hexdigest() != row["sha256"]:
                raise SystemExit(
                    f"Storage object {row['object_key']} does not match the recorded size and SHA-256; tokens are never printed"
                )
            path = destination / OBJECT_DIRECTORY / row["object_key"]
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)

        manifest["objects"] = len(rows)
        (destination / OBJECTS_INDEX_NAME).write_text(json.dumps(rows, indent=2) + "\n")
        (destination / MANIFEST_NAME).write_text(json.dumps(manifest, indent=2) + "\n")
    except BaseException:
        # Never leave a partial dump behind for a later step to trust.
        _remove_tree(destination)
        raise

    releases = manifest["releases"]
    current = sum(1 for release in releases if release["status"] == "current")
    retired = sum(1 for release in releases if release["status"] == "retired")
    print(
        "backup complete: private content schema and "
        f"{len(APP_PUBLIC_TABLES)} SecCraft-owned public tables dumped, {len(releases)} release rows "
        f"({current} current, {retired} retired) and {len(rows)} verified objects recorded"
    )


def _remove_tree(path: Path) -> None:
    if not path.exists():
        return
    for child in sorted(path.rglob("*"), reverse=True):
        if child.is_dir():
            child.rmdir()
        else:
            child.unlink()
    path.rmdir()


def restore(source: Path, environ: Mapping[str, str] | None = None) -> None:
    """Restore the dumps into the disposable recovery database and filesystem."""
    env = os.environ if environ is None else environ
    recovery_url = cli_database_url("CONTENT_RECOVERY_DATABASE_URL", env)
    recovery_sqlalchemy_url = sqlalchemy_database_url(recovery_url)
    runtime_role = require_value("CONTENT_DATABASE_RUNTIME_ROLE", "the archived content RLS policies", env)
    local_root = (env.get("CONTENT_RECOVERY_STORAGE_ROOT") or "").strip()
    remote = tuple((env.get(name) or "").strip() for name in ("CONTENT_RECOVERY_SUPABASE_URL", "CONTENT_RECOVERY_STORAGE_BUCKET", "CONTENT_RECOVERY_SERVICE_ROLE_KEY"))
    if local_root and any(remote):
        raise SystemExit("configure either CONTENT_RECOVERY_STORAGE_ROOT or the recovery Supabase variables, never both")
    if not local_root and not all(remote):
        raise SystemExit("set CONTENT_RECOVERY_STORAGE_ROOT for the disposable recovery filesystem; values are never printed")
    # Restoration must target isolated recovery resources, never the live staging DB or bucket.
    if looks_like_production(recovery_url) or looks_like_production(local_root):
        raise SystemExit("refusing a production-looking recovery target")

    manifest = load_json(source / MANIFEST_NAME)
    rows = load_json(source / OBJECTS_INDEX_NAME)
    if not rows:
        raise SystemExit("the backup object index is empty, so a restore would prove nothing")
    for name in DUMP_NAMES:
        dump = source / name
        if not dump.is_file() or dump.stat().st_size == 0:
            raise SystemExit(f"the backup is incomplete: {name} is missing and nothing is uploaded")

    prepare_recovery_database(recovery_sqlalchemy_url, runtime_role)
    for name in DUMP_NAMES:
        run_cli(
            ["pg_restore", "--clean", "--if-exists", "--no-owner", "--dbname", recovery_url, str(source / name)],
            f"pg_restore of {name}",
            recovery_url,
        )

    restored_releases, restored_counts = recovery_state(recovery_sqlalchemy_url)
    _verify_database(manifest, restored_releases, restored_counts)
    if any(remote):
        upload_recovery_objects(source, rows, remote)
    else:
        recovery_root = Path(local_root)
        write_recovery_objects(source, rows, recovery_root)
        verify_recovery_objects(rows, recovery_root)

    current = sum(1 for release in restored_releases if release["status"] == "current")
    retired = sum(1 for release in restored_releases if release["status"] == "retired")
    print(
        "restore complete: "
        f"{len(restored_releases)} release rows ({current} current, {retired} retired), "
        f"{len(restored_counts)} table counts identical to the source, and {len(rows)} objects re-verified "
        "by size and SHA-256 in the disposable recovery target"
    )


def _verify_database(manifest: Mapping[str, Any], releases: list[dict[str, Any]], counts: Mapping[str, int]) -> None:
    if releases != manifest["releases"]:
        expected = {(row["release_id"], row["status"]) for row in manifest["releases"]}
        actual = {(row["release_id"], row["status"]) for row in releases}
        missing = sorted(expected - actual)
        unexpected = sorted(actual - expected)
        raise SystemExit(
            "recovered release metadata does not match the source; "
            f"{len(missing)} release rows are missing (for example {missing[0][0] if missing else 'none'}) and "
            f"{len(unexpected)} are unexpected ({unexpected[0][0] if unexpected else 'none'}); release history is immutable"
        )
    if not any(release["status"] == "current" for release in releases):
        raise SystemExit("the recovery database has no current release after the restore")
    mismatched = {
        table: (manifest["counts"][table], counts.get(table))
        for table in manifest["counts"]
        if counts.get(table) != manifest["counts"][table]
    }
    if mismatched:
        first = sorted(mismatched)[0]
        raise SystemExit(
            f"recovered row counts do not match the source for {len(mismatched)} tables; "
            f"{first} expected {mismatched[first][0]} rows and found {mismatched[first][1]}"
        )


def write_recovery_objects(source: Path, rows: list[dict[str, Any]], local_root: Path) -> None:
    """Copy every verified backup object into the disposable recovery filesystem."""
    for row in rows:
        key = row["object_key"]
        origin = source / OBJECT_DIRECTORY / key
        if not origin.is_file():
            raise SystemExit(f"the backup is missing object {key}; nothing is uploaded")
        payload = origin.read_bytes()
        if len(payload) != row["size"] or hashlib.sha256(payload).hexdigest() != row["sha256"]:
            raise SystemExit(f"backup object {key} does not match the recorded size and SHA-256")
        destination = local_root / key
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(payload)


def verify_recovery_objects(rows: list[dict[str, Any]], local_root: Path) -> None:
    """Prove the recovered objects exist with the recorded size and SHA-256, and nothing else."""
    expected = {row["object_key"]: (row["size"], row["sha256"]) for row in rows}
    if len(expected) != len(rows):
        raise SystemExit("the backup object index contains duplicate object keys")
    recovered: dict[str, Path] = {}
    for path in sorted(local_root.rglob("*")):
        if path.is_file():
            recovered[path.relative_to(local_root).as_posix()] = path
    missing = sorted(set(expected) - set(recovered))
    if missing:
        raise SystemExit(f"{len(missing)} recovered objects are missing, for example {missing[0]}")
    unexpected = sorted(set(recovered) - set(expected))
    if unexpected:
        raise SystemExit(f"{len(unexpected)} unexpected files appeared in the recovery storage root, for example {unexpected[0]}")
    for key, path in recovered.items():
        size, digest = expected[key]
        payload = path.read_bytes()
        if len(payload) != size:
            raise SystemExit(f"recovered object {key} size differs from the recorded size")
        if hashlib.sha256(payload).hexdigest() != digest:
            raise SystemExit(f"recovered object {key} SHA-256 differs from the recorded hash")


def upload_recovery_objects(source: Path, rows: list[dict[str, Any]], remote: tuple[str, ...]) -> None:
    """Alternative recovery path: upload into a disposable recovery bucket and read it back."""
    base, bucket, service_key = remote
    for row in rows:
        key = row["object_key"]
        origin = source / OBJECT_DIRECTORY / key
        if not origin.is_file():
            raise SystemExit(f"the backup is missing object {key}; nothing is uploaded")
        payload = origin.read_bytes()
        if len(payload) != row["size"] or hashlib.sha256(payload).hexdigest() != row["sha256"]:
            raise SystemExit(f"backup object {key} does not match the recorded size and SHA-256")
        storage_request("POST", base, bucket, key, service_key, payload)
        recovered = storage_request("GET", base, bucket, key, service_key)
        if len(recovered) != row["size"] or hashlib.sha256(recovered).hexdigest() != row["sha256"]:
            raise SystemExit(f"recovered object {key} does not match the recorded size and SHA-256")


def main(argv: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    subcommands = parser.add_subparsers(dest="command", required=True)
    for name in ("backup", "restore"):
        subcommand = subcommands.add_parser(name)
        subcommand.add_argument("path", type=Path)
    arguments = parser.parse_args(argv)
    try:
        {"backup": backup, "restore": restore}[arguments.command](arguments.path)
    except DatabaseUrlError as error:
        raise SystemExit(str(error)) from None
    return 0


if __name__ == "__main__":
    sys.exit(main())

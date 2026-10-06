"""Regression tests for the pre-launch backup/restore tool.

The tool must never hand a SQLAlchemy URL to a PostgreSQL CLI tool, never print a connection
string or a service key, dump only SecCraft-owned objects, and prove that a restore really
recovered the release metadata, the table counts, and every object hash.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

MODULE_PATH = Path(__file__).resolve().parents[1] / "backup_external_staging.py"
SPEC = importlib.util.spec_from_file_location("backup_external_staging", MODULE_PATH)
assert SPEC and SPEC.loader
backup_tool = importlib.util.module_from_spec(SPEC)
sys.modules["backup_external_staging"] = backup_tool
SPEC.loader.exec_module(backup_tool)

RUNTIME_URL = "postgresql+psycopg://seccraft_app:runtime-only-secret@db.example.test:5432/seccraft_prelaunch"
CLI_BACKUP_URL = "postgresql://postgres:backup-only-secret@db.example.test:5432/seccraft_prelaunch"
CLI_BACKUP_SQLALCHEMY_URL = "postgresql+psycopg://postgres:backup-only-secret@db.example.test:5432/seccraft_prelaunch"
CLI_RECOVERY_URL = "postgresql://recovery:recovery-only-disposable@127.0.0.1:55432/seccraft_recovery"
SERVICE_KEY = "service-role-key-that-must-never-be-printed"
FIXTURE_SECRETS = (
    CLI_BACKUP_URL,
    CLI_BACKUP_SQLALCHEMY_URL,
    RUNTIME_URL,
    CLI_RECOVERY_URL,
    "backup-only-secret",
    "runtime-only-secret",
    "db.example.test",
    SERVICE_KEY,
)
BACKUP_ENVIRONMENT = {
    "CONTENT_BACKUP_DATABASE_URL": CLI_BACKUP_SQLALCHEMY_URL,
    "PLATFORM_DATABASE_URL": RUNTIME_URL,
    "SUPABASE_URL": "https://supabase.example.invalid",
    "CONTENT_STORAGE_BUCKET": "seccraft-content-staging",
    "SUPABASE_SERVICE_ROLE_KEY": SERVICE_KEY,
}
RELEASES = [
    {"release_id": "prelaunch-20261002-n6", "status": "retired"},
    {"release_id": "prelaunch-20261002-n7", "status": "current"},
]
COUNTS = {
    **{f"{backup_tool.CONTENT_SCHEMA}.{table}": index for index, table in enumerate(backup_tool.CONTENT_TABLES)},
    **{f"public.{table}": index for index, table in enumerate(backup_tool.APP_PUBLIC_TABLES)},
}
OBJECT_PAYLOAD = b"artifact-payload"
OBJECTS = [
    {
        "object_key": "labs/wireless/one.pcap",
        "sha256": hashlib.sha256(OBJECT_PAYLOAD).hexdigest(),
        "size": len(OBJECT_PAYLOAD),
        "payload": OBJECT_PAYLOAD,
    }
]


def assert_no_secrets(text: str) -> None:
    for secret in FIXTURE_SECRETS:
        assert secret not in text, f"output leaked {secret!r}"


class FakeRows(list):
    def all(self) -> list:
        return list(self)


class FakeResult:
    def __init__(self, scalar: object = None, rows: list | None = None) -> None:
        self._scalar = scalar
        self._rows = FakeRows(rows or [])

    def mappings(self) -> FakeRows:
        return self._rows

    def scalar_one(self):
        return self._scalar

    def scalar_one_or_none(self):
        return self._scalar


class FakeConnection:
    def __init__(self, releases, counts, objects, role_present: bool = False) -> None:
        self.releases = releases
        self.counts = counts
        self.objects = objects
        self.role_present = role_present
        self.executed: list[str] = []

    def execute(self, statement, parameters=None):
        sql = " ".join(str(statement).split())
        self.executed.append(sql)
        if "FROM pg_roles" in sql:
            return FakeResult(scalar=1 if self.role_present else None)
        if "count(*)" in sql:
            return FakeResult(scalar=self.counts.get(sql.split(" FROM ", 1)[1]))
        if "content_releases" in sql and "id, status" in sql:
            return FakeResult(rows=[{"id": release["release_id"], "status": release["status"]} for release in self.releases])
        if "content_artifacts" in sql:
            return FakeResult(rows=[{key: row[key] for key in ("object_key", "sha256", "size")} for row in self.objects])
        if sql.upper().startswith("CREATE ROLE"):
            self.role_present = True
            return FakeResult()
        raise AssertionError(f"unexpected statement: {sql}")

    def __enter__(self):
        return self

    def __exit__(self, *exc_info):
        return False


class FakeEngine:
    def __init__(self, connection: FakeConnection) -> None:
        self.connection = connection

    def connect(self):
        return self.connection

    def begin(self):
        return self.connection

    def dispose(self):
        return None


def install_fake_engine(monkeypatch, *, releases=None, counts=None, objects=None, role_present: bool = False):
    connection = FakeConnection(
        RELEASES if releases is None else releases,
        COUNTS if counts is None else counts,
        OBJECTS if objects is None else objects,
        role_present=role_present,
    )
    monkeypatch.setattr(backup_tool, "create_engine", lambda *args, **kwargs: FakeEngine(connection))
    return connection


def write_backup(source: Path, *, releases=RELEASES, counts=COUNTS, objects=OBJECTS) -> None:
    source.mkdir(parents=True, exist_ok=True)
    for name in backup_tool.DUMP_NAMES:
        (source / name).write_bytes(b"custom-format-dump")
    for row in objects:
        path = source / backup_tool.OBJECT_DIRECTORY / row["object_key"]
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(row["payload"])
    (source / backup_tool.OBJECTS_INDEX_NAME).write_text(
        json.dumps([{key: row[key] for key in ("object_key", "sha256", "size")} for row in objects])
    )
    (source / backup_tool.MANIFEST_NAME).write_text(
        json.dumps({"releases": releases, "counts": counts, "objects": len(objects)})
    )


def restore_environment(storage_root: Path) -> dict[str, str]:
    return {
        "CONTENT_RECOVERY_DATABASE_URL": CLI_RECOVERY_URL,
        "CONTENT_RECOVERY_STORAGE_ROOT": str(storage_root),
        "CONTENT_DATABASE_RUNTIME_ROLE": "seccraft_app",
    }


def no_cli_tool_may_run(*args, **kwargs):
    pytest.fail("no PostgreSQL CLI tool may be invoked on this path")


# ---------------------------------------------------------------------------------------------
# URL handling
# ---------------------------------------------------------------------------------------------


def test_cli_database_url_normalises_sqlalchemy_urls_in_memory():
    assert backup_tool.cli_database_url("X", {"X": CLI_BACKUP_SQLALCHEMY_URL}) == CLI_BACKUP_URL
    assert backup_tool.cli_database_url("X", {"X": CLI_BACKUP_URL}) == CLI_BACKUP_URL
    # The legacy postgres:// spelling is normalised too; the fixture host is the one the
    # repository hygiene scan allowlists for documentation and tests.
    assert (
        backup_tool.cli_database_url("X", {"X": "postgres://legacy:legacy-fixture-secret@db.example.test:5432/legacy_db"})
        == "postgresql://legacy:legacy-fixture-secret@db.example.test:5432/legacy_db"
    )


def test_sqlalchemy_database_url_is_derived_in_memory_or_rejected():
    assert (
        backup_tool.sqlalchemy_database_url(CLI_RECOVERY_URL)
        == "postgresql+psycopg://recovery:recovery-only-disposable@127.0.0.1:55432/seccraft_recovery"
    )
    with pytest.raises(backup_tool.DatabaseUrlError) as error:
        backup_tool.sqlalchemy_database_url("sqlite:///tmp/example.db")
    assert_no_secrets(str(error.value))


def test_empty_or_unusable_urls_fail_before_any_tool_is_invoked(monkeypatch):
    monkeypatch.setattr(backup_tool.subprocess, "run", no_cli_tool_may_run)
    for values in ({}, {"CONTENT_BACKUP_DATABASE_URL": ""}, {"CONTENT_BACKUP_DATABASE_URL": "   "}):
        with pytest.raises(backup_tool.DatabaseUrlError) as error:
            backup_tool.cli_database_url("CONTENT_BACKUP_DATABASE_URL", values)
        assert "CONTENT_BACKUP_DATABASE_URL" in str(error.value)
        assert_no_secrets(str(error.value))

    with pytest.raises(backup_tool.DatabaseUrlError) as error:
        backup_tool.cli_database_url(
            "CONTENT_BACKUP_DATABASE_URL", {"CONTENT_BACKUP_DATABASE_URL": "mysql://user:secret@host/db"}
        )
    assert "postgresql://" in str(error.value)
    assert "secret" not in str(error.value)

    with pytest.raises(backup_tool.DatabaseUrlError) as restore_error:
        backup_tool.restore(Path("/nonexistent"), {})
    assert "CONTENT_RECOVERY_DATABASE_URL" in str(restore_error.value)
    assert_no_secrets(str(restore_error.value))


def test_redaction_removes_connection_strings_credentials_and_their_components():
    text = (
        f'psql: error: connection to server at "db.example.test", port 5432 failed for {CLI_BACKUP_URL} '
        "and postgresql+psycopg://other:other-secret@db.example.test:5433/otherdb refused"
    )
    redacted = backup_tool.redact(text, CLI_BACKUP_URL)
    for secret in ("backup-only-secret", "db.example.test", "5432", "other-secret", "otherdb", "5433"):
        assert secret not in redacted, f"redaction left {secret!r} in place"
    assert redacted.count("[REDACTED-CONNECTION-STRING]") >= 2


def test_failing_cli_tools_report_a_redacted_bounded_summary(monkeypatch):
    monkeypatch.setattr(
        backup_tool.subprocess,
        "run",
        lambda *args, **kwargs: SimpleNamespace(
            returncode=1,
            stdout="",
            stderr=f"pg_restore: error: could not connect to database {CLI_RECOVERY_URL}: fatal\nsecond line",
        ),
    )
    with pytest.raises(SystemExit) as error:
        backup_tool.run_cli(
            ["pg_restore", "--dbname", CLI_RECOVERY_URL, "dump"], "pg_restore of content-schema.dump", CLI_RECOVERY_URL
        )
    message = str(error.value)
    assert "pg_restore of content-schema.dump failed with exit status 1" in message
    assert "SANITIZED TOOL OUTPUT" in message.upper()
    assert_no_secrets(message)
    assert "\n" not in message, "the summary must be bounded to a single line"

    monkeypatch.setattr(
        backup_tool.subprocess, "run", lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout="", stderr="")
    )
    backup_tool.run_cli(["pg_dump", "--version"], "pg_dump", CLI_BACKUP_URL)


# ---------------------------------------------------------------------------------------------
# Backup scope
# ---------------------------------------------------------------------------------------------


def test_backup_scope_covers_the_content_schema_and_named_secraft_public_tables_only():
    assert backup_tool.CONTENT_TABLES == (
        "content_releases",
        "content_records",
        "content_private_material",
        "content_artifacts",
        "content_public_samples",
    )
    content_command = backup_tool.content_dump_command(CLI_BACKUP_URL, Path("/tmp/content.dump"))
    assert content_command[:2] == ["pg_dump", "--format=custom"]
    assert f"--schema={backup_tool.CONTENT_SCHEMA}" in content_command
    assert "--table=public." not in " ".join(content_command)

    command = backup_tool.public_dump_command(CLI_BACKUP_URL, Path("/tmp/public.dump"))
    targets = [argument.split("=", 1)[1] for argument in command if argument.startswith("--table=")]
    assert targets == [f"public.{table}" for table in backup_tool.APP_PUBLIC_TABLES]
    for required in ("user_profiles", "progress_records", "feedback", "feedback_quotas", "alembic_version"):
        assert f"public.{required}" in targets
    for managed in (
        "auth",
        "storage",
        "extensions",
        "realtime",
        "graphql",
        "graphql_public",
        "vault",
        "pgsodium",
        "net",
        "pgbouncer",
        "cron",
        "supabase_migrations",
        "supabase_functions",
        "information_schema",
        "pg_catalog",
    ):
        assert not any(target.startswith(f"{managed}.") for target in targets)
        assert f"--schema={managed}" not in command
        assert f"--table={managed}." not in command
    assert command[-1] == CLI_BACKUP_URL
    assert "+psycopg" not in " ".join(command)


def test_backup_dumps_with_cli_urls_and_records_the_source_state(monkeypatch, tmp_path):
    recorded: list[list[str]] = []

    def fake_run(command, **kwargs):
        recorded.append(list(command))
        Path(command[command.index("--file") + 1]).write_bytes(b"dump")
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(backup_tool.subprocess, "run", fake_run)
    monkeypatch.setattr(backup_tool, "storage_request", lambda *args, **kwargs: OBJECT_PAYLOAD)
    install_fake_engine(monkeypatch)

    destination = tmp_path / "backup"
    backup_tool.backup(destination, BACKUP_ENVIRONMENT)

    assert len(recorded) == 2, "one dump for the private schema and one for the SecCraft-owned public tables"
    for command in recorded:
        assert CLI_BACKUP_URL in command, "pg_dump must receive the ordinary postgresql:// URL"
        assert not any("+psycopg" in argument for argument in command), "CLI tools must never see a SQLAlchemy URL"
        assert "--format=custom" in command and "--no-owner" in command
    manifest = json.loads((destination / backup_tool.MANIFEST_NAME).read_text())
    assert manifest["objects"] == 1
    assert manifest["releases"] == RELEASES
    assert set(manifest["counts"]) == {
        *[f"{backup_tool.CONTENT_SCHEMA}.{table}" for table in backup_tool.CONTENT_TABLES],
        *[f"public.{table}" for table in backup_tool.APP_PUBLIC_TABLES],
    }
    objects = json.loads((destination / backup_tool.OBJECTS_INDEX_NAME).read_text())
    assert objects[0]["object_key"] == OBJECTS[0]["object_key"]
    assert (destination / backup_tool.OBJECT_DIRECTORY / OBJECTS[0]["object_key"]).read_bytes() == OBJECT_PAYLOAD


def test_backup_removes_a_partial_dump_directory_when_pg_dump_fails(monkeypatch, tmp_path):
    monkeypatch.setattr(
        backup_tool.subprocess,
        "run",
        lambda *args, **kwargs: SimpleNamespace(returncode=1, stdout="", stderr=f"pg_dump: error: {CLI_BACKUP_URL}"),
    )
    install_fake_engine(monkeypatch)
    destination = tmp_path / "backup"

    with pytest.raises(SystemExit) as error:
        backup_tool.backup(destination, BACKUP_ENVIRONMENT)

    message = str(error.value)
    assert "pg_dump of the private content schema failed" in message
    assert not destination.exists(), "a failed backup must not leave a partial dump behind"
    assert_no_secrets(message)


def test_backup_refuses_a_vacuous_source(monkeypatch, tmp_path):
    def fake_run(command, **kwargs):
        Path(command[command.index("--file") + 1]).write_bytes(b"dump")
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(backup_tool.subprocess, "run", fake_run)
    install_fake_engine(monkeypatch, releases=[{"release_id": "n1", "status": "staged"}])
    with pytest.raises(SystemExit) as no_current:
        backup_tool.backup(tmp_path / "backup", BACKUP_ENVIRONMENT)
    assert "no current release" in str(no_current.value)
    assert not (tmp_path / "backup").exists()

    install_fake_engine(monkeypatch, objects=[])
    with pytest.raises(SystemExit) as no_objects:
        backup_tool.backup(tmp_path / "backup", BACKUP_ENVIRONMENT)
    assert "no content artifacts" in str(no_objects.value)
    assert_no_secrets(str(no_objects.value))


def test_backup_requires_the_storage_credentials_without_printing_them(tmp_path):
    environment = {key: value for key, value in BACKUP_ENVIRONMENT.items() if key != "SUPABASE_SERVICE_ROLE_KEY"}
    with pytest.raises(SystemExit) as error:
        backup_tool.backup(tmp_path / "backup", environment)
    assert "SUPABASE_SERVICE_ROLE_KEY" in str(error.value)
    assert not (tmp_path / "backup").exists()


# ---------------------------------------------------------------------------------------------
# Restore
# ---------------------------------------------------------------------------------------------


def test_restore_refuses_a_production_looking_or_incomplete_target(monkeypatch, tmp_path):
    monkeypatch.setattr(backup_tool.subprocess, "run", no_cli_tool_may_run)
    write_backup(tmp_path / "backup")

    production = restore_environment(tmp_path / "recovery-storage")
    production["CONTENT_RECOVERY_DATABASE_URL"] = (
        "postgresql://recovery:recovery-only-disposable@127.0.0.1:55432/production"
    )
    with pytest.raises(SystemExit) as error:
        backup_tool.restore(tmp_path / "backup", production)
    assert "production-looking" in str(error.value)

    without_storage = restore_environment(tmp_path / "recovery-storage")
    without_storage.pop("CONTENT_RECOVERY_STORAGE_ROOT")
    with pytest.raises(SystemExit) as error:
        backup_tool.restore(tmp_path / "backup", without_storage)
    assert "CONTENT_RECOVERY_STORAGE_ROOT" in str(error.value)

    incomplete = restore_environment(tmp_path / "recovery-storage")
    (tmp_path / "backup" / backup_tool.PUBLIC_DUMP_NAME).unlink()
    with pytest.raises(SystemExit) as error:
        backup_tool.restore(tmp_path / "backup", incomplete)
    assert "incomplete" in str(error.value)
    assert_no_secrets(str(error.value))


def test_restore_proves_release_metadata_counts_and_every_object(monkeypatch, tmp_path):
    recorded: list[list[str]] = []

    def fake_run(command, **kwargs):
        recorded.append(list(command))
        return SimpleNamespace(returncode=0, stdout="", stderr="")

    monkeypatch.setattr(backup_tool.subprocess, "run", fake_run)
    connection = install_fake_engine(monkeypatch)
    write_backup(tmp_path / "backup")
    storage_root = tmp_path / "recovery-storage"

    backup_tool.restore(tmp_path / "backup", restore_environment(storage_root))

    assert len(recorded) == 2, "both dumps must be restored"
    for command in recorded:
        assert command[1:3] == ["--clean", "--if-exists"]
        assert CLI_RECOVERY_URL in command, "pg_restore must receive the ordinary postgresql:// URL"
        assert not any("+psycopg" in argument for argument in command)
    assert any(
        statement.upper().startswith('CREATE ROLE "SECCRAFT_APP"') for statement in connection.executed
    ), "the runtime role the archived content RLS policies reference must exist before pg_restore runs"
    assert (storage_root / OBJECTS[0]["object_key"]).read_bytes() == OBJECT_PAYLOAD


def test_restore_never_reuses_the_live_supabase_credentials(monkeypatch, tmp_path):
    recorded: list[list[str]] = []
    monkeypatch.setattr(
        backup_tool.subprocess,
        "run",
        lambda command, **kwargs: recorded.append(list(command)) or SimpleNamespace(returncode=0, stdout="", stderr=""),
    )
    install_fake_engine(monkeypatch)
    write_backup(tmp_path / "backup")
    environment = restore_environment(tmp_path / "recovery-storage")
    environment.update({"SUPABASE_URL": "https://supabase.example.invalid", "SUPABASE_SERVICE_ROLE_KEY": SERVICE_KEY})

    backup_tool.restore(tmp_path / "backup", environment)

    for command in recorded:
        assert not any("supabase" in argument.lower() for argument in command)
        assert SERVICE_KEY not in " ".join(command)


def test_restore_fails_when_release_metadata_or_counts_differ(monkeypatch, tmp_path):
    monkeypatch.setattr(
        backup_tool.subprocess, "run", lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout="", stderr="")
    )

    write_backup(tmp_path / "backup")
    install_fake_engine(monkeypatch, releases=[{"release_id": "prelaunch-20261002-n7", "status": "current"}])
    with pytest.raises(SystemExit) as error:
        backup_tool.restore(tmp_path / "backup", restore_environment(tmp_path / "storage-a"))
    message = str(error.value)
    assert "release metadata does not match the source" in message
    assert "immutable" in message
    assert_no_secrets(message)

    write_backup(tmp_path / "backup-two")
    install_fake_engine(monkeypatch, counts={**COUNTS, "content.content_records": 999})
    with pytest.raises(SystemExit) as error:
        backup_tool.restore(tmp_path / "backup-two", restore_environment(tmp_path / "storage-b"))
    message = str(error.value)
    assert "row counts do not match the source" in message
    assert "content.content_records" in message
    assert_no_secrets(message)


def test_recovered_objects_are_verified_by_presence_size_hash_and_absence_of_extras(tmp_path):
    rows = [{key: OBJECTS[0][key] for key in ("object_key", "sha256", "size")}]
    root = tmp_path / "storage"
    root.mkdir()

    with pytest.raises(SystemExit) as missing:
        backup_tool.verify_recovery_objects(rows, root)
    assert "recovered objects are missing" in str(missing.value)

    (root / OBJECTS[0]["object_key"]).parent.mkdir(parents=True)
    (root / OBJECTS[0]["object_key"]).write_bytes(OBJECT_PAYLOAD[:3])
    with pytest.raises(SystemExit) as wrong_size:
        backup_tool.verify_recovery_objects(rows, root)
    assert "size differs from the recorded size" in str(wrong_size.value)

    (root / OBJECTS[0]["object_key"]).write_bytes(b"tampered-payload")
    with pytest.raises(SystemExit) as wrong_hash:
        backup_tool.verify_recovery_objects(rows, root)
    assert "SHA-256 differs from the recorded hash" in str(wrong_hash.value)

    (root / OBJECTS[0]["object_key"]).write_bytes(OBJECT_PAYLOAD)
    (root / "unexpected-file").write_bytes(b"x")
    with pytest.raises(SystemExit) as unexpected:
        backup_tool.verify_recovery_objects(rows, root)
    assert "unexpected files appeared in the recovery storage root" in str(unexpected.value)

    (root / "unexpected-file").unlink()
    backup_tool.verify_recovery_objects(rows, root)


def test_restore_fails_when_the_backup_objects_directory_is_incomplete(monkeypatch, tmp_path):
    monkeypatch.setattr(
        backup_tool.subprocess, "run", lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout="", stderr="")
    )
    install_fake_engine(monkeypatch)
    write_backup(tmp_path / "backup")
    (tmp_path / "backup" / backup_tool.OBJECT_DIRECTORY / OBJECTS[0]["object_key"]).unlink()

    with pytest.raises(SystemExit) as error:
        backup_tool.restore(tmp_path / "backup", restore_environment(tmp_path / "storage"))
    assert "the backup is missing object" in str(error.value)
    assert_no_secrets(str(error.value))


def test_restore_rejects_an_unsafe_runtime_role_identifier(monkeypatch, tmp_path):
    monkeypatch.setattr(backup_tool.subprocess, "run", no_cli_tool_may_run)
    write_backup(tmp_path / "backup")
    environment = restore_environment(tmp_path / "storage")
    environment["CONTENT_DATABASE_RUNTIME_ROLE"] = 'seccraft_app"; DROP ROLE x; --'

    with pytest.raises(SystemExit) as error:
        backup_tool.restore(tmp_path / "backup", environment)
    assert "not a safe PostgreSQL role identifier" in str(error.value)
    assert "DROP ROLE" not in str(error.value)


def test_redaction_removes_tokens_and_service_keys_from_diagnostics():
    jwt = "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.QWERTYuiop1234567890abc"
    bearer = "Authorization: Bearer abcdefghijklmnop.qrstuvwxyz.0123456789"
    message = backup_tool.redact(
        f"upload rejected with {jwt} via {bearer} using {SERVICE_KEY} and {CLI_BACKUP_SQLALCHEMY_URL}",
        CLI_BACKUP_SQLALCHEMY_URL,
    )

    assert jwt not in message
    assert "abcdefghijklmnop" not in message
    assert SERVICE_KEY not in message
    assert "backup-only-secret" not in message
    assert CLI_BACKUP_SQLALCHEMY_URL not in message
    assert message.count("[REDACTED-SECRET]") >= 3
    assert "[REDACTED-CONNECTION-STRING]" in message


def test_storage_failures_never_echo_the_service_key(monkeypatch):
    seen_requests = []

    def failing_urlopen(request, timeout=None):
        seen_requests.append(request.full_url)
        raise backup_tool.HTTPError(request.full_url, 403, "forbidden", None, None)

    monkeypatch.setattr(backup_tool, "urlopen", failing_urlopen)

    with pytest.raises(SystemExit) as error:
        backup_tool.storage_request("PUT", "https://storage.example.invalid", "bucket", "labs/one.zip", SERVICE_KEY)

    message = str(error.value)
    assert "403" in message
    assert SERVICE_KEY not in message
    assert "storage.example.invalid" not in message
    assert seen_requests and seen_requests[0].startswith("https://storage.example.invalid")

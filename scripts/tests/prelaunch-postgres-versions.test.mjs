import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testsDir, '../..');
const versionScript = resolve(repoRoot, 'scripts/verify-prelaunch-postgres-versions.sh');
const workflowPath = resolve(repoRoot, '.github/workflows/prelaunch-validation.yml');

// Fixture connection strings mirror the real URL shape (including embedded credentials) so the
// never-printed assertions are meaningful. The db.example.test host is already allowlisted by
// scripts/verify-no-sensitive-files-tracked.sh for documentation and test fixtures.
const stagingUrl = 'postgresql://staging-fixture:fixture-only-staging-secret@db.example.test:5432/seccraft_staging_fixture';
const recoveryUrl = 'postgresql://recovery-fixture:fixture-only-recovery-secret@db.example.test:55432/seccraft_recovery_fixture';
const fixtureSecrets = Object.freeze([
  stagingUrl,
  recoveryUrl,
  'fixture-only-staging-secret',
  'fixture-only-recovery-secret',
  'staging-fixture',
  'recovery-fixture',
  'db.example.test',
]);

const dumpToolMock = (tool) => `#!/bin/bash
printf '${tool} (PostgreSQL) %s\\n' "$MOCK_CLIENT_VERSION"
`;

// The mock records every query target and argument list, and it deliberately echoes the
// connection string to stderr when failing so the tests can prove the real script suppresses
// driver diagnostics instead of leaking URLs.
const psqlMock = `#!/bin/bash
if [[ "\${1:-}" == "--version" ]]; then
  printf 'psql (PostgreSQL) %s\\n' "$MOCK_CLIENT_VERSION"
  exit 0
fi
printf '%s\\t%s\\n' "\${PGDATABASE:-}" "$*" >> "$PSQL_CALLS_FILE"
if [[ -n "\${MOCK_PSQL_FAIL:-}" ]]; then
  printf 'psql: error: connection to server at "%s" failed\\n' "\${PGDATABASE:-}" >&2
  exit 2
fi
case "\${PGDATABASE:-}" in
  "$MOCK_STAGING_URL") printf '%s\\n' "$MOCK_STAGING_SERVER_VERSION_NUM" ;;
  "$MOCK_RECOVERY_URL") printf '%s\\n' "$MOCK_RECOVERY_SERVER_VERSION_NUM" ;;
  *) printf 'psql: error: unexpected fixture target\\n' >&2; exit 3 ;;
esac
`;

function makeHarness({
  clientVersion = '17.5',
  missingTools = [],
  psqlFail = false,
  stagingVersionNum = '170005',
  recoveryVersionNum = '170005',
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'seccraft-prelaunch-pg-version-test-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const callsFile = join(root, 'psql-calls');
  writeFileSync(callsFile, '');

  const mocks = { pg_dump: dumpToolMock('pg_dump'), pg_restore: dumpToolMock('pg_restore'), psql: psqlMock };
  for (const [tool, source] of Object.entries(mocks)) {
    if (missingTools.includes(tool)) continue;
    const mockPath = join(bin, tool);
    writeFileSync(mockPath, source);
    chmodSync(mockPath, 0o755);
  }

  const env = {
    // Hermetic PATH: only the mock toolchain resolves, exactly like a runner where
    // /usr/lib/postgresql/17/bin was prepended to GITHUB_PATH.
    PATH: bin,
    HOME: process.env.HOME ?? tmpdir(),
    MOCK_CLIENT_VERSION: clientVersion,
    MOCK_STAGING_URL: stagingUrl,
    MOCK_RECOVERY_URL: recoveryUrl,
    MOCK_STAGING_SERVER_VERSION_NUM: stagingVersionNum,
    MOCK_RECOVERY_SERVER_VERSION_NUM: recoveryVersionNum,
    PSQL_CALLS_FILE: callsFile,
    CONTENT_BACKUP_DATABASE_URL: stagingUrl,
    CONTENT_RECOVERY_DATABASE_URL: recoveryUrl,
  };
  if (psqlFail) env.MOCK_PSQL_FAIL = '1';

  return { env, callsFile, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function runVersionScript(env, args = []) {
  return spawnSync('/bin/bash', [versionScript, ...args], { cwd: repoRoot, env, encoding: 'utf8' });
}

function outputOf(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function recordedCalls(harness) {
  return readFileSync(harness.callsFile, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf('\t');
      return { target: line.slice(0, separator), args: line.slice(separator + 1) };
    });
}

function assertNoFixtureSecrets(output) {
  for (const secret of fixtureSecrets) {
    assert.equal(output.includes(secret), false, 'connection strings and their parts must never appear in diagnostic output');
  }
}

test('workflow pins the PostgreSQL 17 recovery image, client bin directory, and diagnostic before backup', () => {
  const workflow = readFileSync(workflowPath, 'utf8');

  assert.ok(workflow.includes('image: postgres:17'), 'the disposable recovery service must use the postgres:17 image');
  assert.doesNotMatch(workflow, /image:\s*postgres:16\b/, 'no pre-launch service may pin a pre-17 PostgreSQL image');
  assert.ok(
    workflow.includes('sudo apt-get install -y postgresql-client-17'),
    'the workflow must install the PostgreSQL 17 client toolchain when the runner image lacks it',
  );

  const pathIndex = workflow.indexOf('echo /usr/lib/postgresql/17/bin >> "$GITHUB_PATH"');
  assert.ok(pathIndex > -1, 'the workflow must add /usr/lib/postgresql/17/bin to GITHUB_PATH');
  const diagnosticIndex = workflow.indexOf('run: bash scripts/verify-prelaunch-postgres-versions.sh 17');
  assert.ok(diagnosticIndex > -1, 'the workflow must run the fail-closed major-version diagnostic');
  const backupIndex = workflow.indexOf('backup_external_staging.py backup');
  assert.ok(backupIndex > -1, 'the backup step must remain present');

  assert.ok(pathIndex < diagnosticIndex, 'GITHUB_PATH must be updated before the diagnostic runs');
  assert.ok(diagnosticIndex < backupIndex, 'the diagnostic must run before the backup step');
  assert.ok(pathIndex < backupIndex, 'GITHUB_PATH must be updated before the backup step');
  assert.ok(
    workflow.indexOf('CONTENT_RECOVERY_DATABASE_URL: postgresql://recovery:') < diagnosticIndex
      && workflow.lastIndexOf('CONTENT_RECOVERY_DATABASE_URL') > diagnosticIndex,
    'the diagnostic step must receive the recovery database URL from its own env block',
  );
});

test('existing immutable-release lifecycle steps remain intact', () => {
  const workflow = readFileSync(workflowPath, 'utf8');
  for (const command of [
    'run: bash tools/content/run_external_staging.sh',
    'run: python tools/content/validate_external_lifecycle.py',
    'run: python tools/content/verify_external_progress.py',
    'python tools/content/backup_external_staging.py backup "$backup"',
    'python tools/content/backup_external_staging.py restore "$backup"',
    'rm -rf "$backup" "$CONTENT_RECOVERY_STORAGE_ROOT"',
  ]) {
    assert.ok(workflow.includes(command), `pre-launch workflow lost a required step: ${command}`);
  }
  assert.doesNotMatch(
    workflow,
    /import_content\.py (rollback|delete)|DROP DATABASE|delete-release/i,
    'the pre-launch workflow must never delete or roll back existing releases directly',
  );
});

test('passes when clients and both servers report major 17 and prints no database URLs', () => {
  const harness = makeHarness();
  try {
    const result = runVersionScript(harness.env);
    const output = outputOf(result);

    assert.equal(result.status, 0, output);
    assert.match(output, /client pg_dump: major 17 /);
    assert.match(output, /client pg_restore: major 17 /);
    assert.match(output, /client psql: major 17 /);
    assert.match(output, /server external staging backup source: major 17 \(server_version_num 170005\)/);
    assert.match(output, /server disposable recovery restore target: major 17 \(server_version_num 170005\)/);
    assert.match(output, /diagnostic passed/);
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('the diagnostic only reads server_version_num and never mutates release state', () => {
  const harness = makeHarness();
  try {
    const result = runVersionScript(harness.env);
    assert.equal(result.status, 0, outputOf(result));

    const calls = recordedCalls(harness);
    assert.equal(calls.length, 2, 'exactly one read-only probe per database target');
    assert.deepEqual(
      calls.map((call) => call.target).sort(),
      [stagingUrl, recoveryUrl].sort(),
    );
    for (const call of calls) {
      assert.match(call.args, /SHOW server_version_num/);
      assert.doesNotMatch(
        call.args,
        /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|VACUUM|CALL|COPY)\b/i,
        'the diagnostic must stay strictly read-only so existing releases cannot change',
      );
    }
  } finally {
    harness.cleanup();
  }
});

test('fails closed when the disposable recovery server is not major 17', () => {
  const harness = makeHarness({ recoveryVersionNum: '160009' });
  try {
    const result = runVersionScript(harness.env);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /disposable recovery restore target server is major 16/);
    assert.match(output, /requires major 17/);
    assert.match(output, /Backup and restore are blocked/);
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('fails closed when the external staging server is not major 17', () => {
  const harness = makeHarness({ stagingVersionNum: '150012' });
  try {
    const result = runVersionScript(harness.env);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /external staging backup source server is major 15/);
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('fails closed when a client resolves to a pre-17 toolchain and contacts no server', () => {
  const harness = makeHarness({ clientVersion: '14.13' });
  try {
    const result = runVersionScript(harness.env);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /pg_dump resolves to major 14 but this run requires major 17/);
    assert.match(output, /\/usr\/lib\/postgresql\/17\/bin/);
    assert.equal(recordedCalls(harness).length, 0, 'no server may be contacted before the client toolchain passes');
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('fails closed when a client tool is missing from PATH', () => {
  const harness = makeHarness({ missingTools: ['pg_restore'] });
  try {
    const result = runVersionScript(harness.env);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /pg_restore is not on PATH/);
    assert.match(output, /add \/usr\/lib\/postgresql\/17\/bin to GITHUB_PATH/);
    assert.equal(recordedCalls(harness).length, 0, 'no server may be contacted before the client toolchain passes');
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('suppresses driver diagnostics so a failing connection cannot leak the URL', () => {
  const harness = makeHarness({ psqlFail: true });
  try {
    const result = runVersionScript(harness.env);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /external staging backup source database did not report its server version/);
    assert.match(output, /disposable recovery restore target database did not report its server version/);
    assert.match(output, /the connection string is never printed/);
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('fails closed and names the variable when a required database URL is unset', () => {
  const harness = makeHarness();
  try {
    harness.env.CONTENT_RECOVERY_DATABASE_URL = '';
    const result = runVersionScript(harness.env);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /Required CONTENT_RECOVERY_DATABASE_URL is unset/);
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('fails closed on an unparsable server version without printing it as a URL', () => {
  const harness = makeHarness({ stagingVersionNum: 'not-a-version' });
  try {
    const result = runVersionScript(harness.env);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /external staging backup source database reported a server version that could not be parsed/);
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('holds every client and server to the expected major passed as an argument', () => {
  const harness = makeHarness();
  try {
    const result = runVersionScript(harness.env, ['16']);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /pg_dump resolves to major 17 but this run requires major 16/);
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('rejects a non-numeric expected major without echoing the argument', () => {
  const harness = makeHarness();
  const argument = 'not-a-number-and-not-a-url';
  try {
    const result = runVersionScript(harness.env, [argument]);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /must be a non-negative integer/);
    assert.equal(output.includes(argument), false, 'the rejected argument must never be echoed');
    assert.equal(recordedCalls(harness).length, 0, 'an invalid expectation must stop before any probe');
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

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
const readinessScript = resolve(repoRoot, 'scripts/wait-for-prelaunch-recovery-postgres.sh');
const workflowPath = resolve(repoRoot, '.github/workflows/prelaunch-validation.yml');

// Fixture connection strings mirror the real URL shape, including embedded credentials, so the
// never-printed assertions are meaningful. The db.example.test host is already allowlisted by
// scripts/verify-no-sensitive-files-tracked.sh for documentation and test fixtures.
const stagingUrl = 'postgresql://staging-fixture:fixture-only-staging-secret@db.example.test:5432/seccraft_staging_fixture';
const stagingSqlalchemyUrl = 'postgresql+psycopg://staging-fixture:fixture-only-staging-secret@db.example.test:5432/seccraft_staging_fixture';
const recoveryUrl = 'postgresql://recovery-fixture:fixture-only-recovery-secret@db.example.test:55432/seccraft_recovery_fixture';
const recoverySqlalchemyUrl = 'postgresql+psycopg://recovery-fixture:fixture-only-recovery-secret@db.example.test:55432/seccraft_recovery_fixture';
const fixtureSecrets = Object.freeze([
  stagingUrl,
  stagingSqlalchemyUrl,
  recoveryUrl,
  recoverySqlalchemyUrl,
  'fixture-only-staging-secret',
  'fixture-only-recovery-secret',
  'staging-fixture',
  'recovery-fixture',
  'db.example.test',
  'postgresql+psycopg',
]);

const dumpToolMock = (tool) => `#!/bin/bash
printf '${tool} (PostgreSQL) %s\\n' "$MOCK_CLIENT_VERSION"
`;

// The psql mock emulates the behaviour that broke the previous diagnostic: libpq only accepts a
// connection URI as the connection argument, it never parses PGDATABASE as a URI, and it rejects
// the SQLAlchemy postgresql+psycopg:// spelling. A regression therefore fails here instead of
// silently probing the local socket. The mock also quotes the connection string on failure so the
// tests can prove the real script suppresses and redacts driver diagnostics.
const psqlMock = `#!/bin/bash
set -u
if [[ "\${1:-}" == "--version" ]]; then
  printf 'psql (PostgreSQL) %s\\n' "$MOCK_CLIENT_VERSION"
  exit 0
fi
connection=""
args="$*"
while (( $# )); do
  case "$1" in
    --dbname) connection="\${2:-}"; shift 2; continue ;;
    --dbname=*) connection="\${1#--dbname=}" ;;
    -d) connection="\${2:-}"; shift 2; continue ;;
  esac
  shift
done
printf 'connection=%s\\targs=%s\\tpgdatabase=%s\\n' "$connection" "$args" "\${PGDATABASE:-}" >> "$PSQL_CALLS_FILE"
if [[ -n "\${PGDATABASE:-}" ]]; then
  printf 'psql: error: PGDATABASE %s is a database name, not a connection URI\\n' "$PGDATABASE" >&2
  exit 2
fi
if [[ "$connection" != postgresql://* ]]; then
  if [[ -n "\${MOCK_PSQL_FAIL:-}" ]]; then
    printf 'psql: error: connection to server at "%s" failed\\n' "$connection" >&2
  else
    printf 'psql: error: invalid connection string "%s"\\n' "$connection" >&2
  fi
  exit 2
fi
if [[ -n "\${MOCK_PSQL_FAIL:-}" ]]; then
  if [[ -n "\${MOCK_PSQL_LEAK:-}" ]]; then
    printf 'psql: error: server said %s and %s and key %s\\n' "\${MOCK_PSQL_LEAK}" 'Authorization: Bearer abcdefghijklmnop.qrstuvwxyz.0123456789' 'sb_secret_abcdefgh12345678' >&2
  fi
  printf 'psql: error: connection to server at "%s" (db.example.test), port 5432 failed: Connection refused\\n' "$connection" >&2
  exit 2
fi
case "$connection" in
  "$MOCK_STAGING_URL") printf '%s\\n' "$MOCK_STAGING_SERVER_VERSION_NUM" ;;
  "$MOCK_RECOVERY_URL") printf '%s\\n' "$MOCK_RECOVERY_SERVER_VERSION_NUM" ;;
  *) printf 'psql: error: unexpected fixture target "%s"\\n' "$connection" >&2; exit 3 ;;
esac
`;

function makeHarness({
  clientVersion = '17.5',
  missingTools = [],
  psqlFail = false,
  psqlLeak = '',
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
  if (psqlLeak) env.MOCK_PSQL_LEAK = psqlLeak;

  return { env, callsFile, bin, root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function runScript(script, env, args = []) {
  return spawnSync('/bin/bash', [script, ...args], { cwd: repoRoot, env, encoding: 'utf8' });
}

function runVersionScript(env, args = []) {
  return runScript(versionScript, env, args);
}

function outputOf(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function recordedCalls(harness) {
  return readFileSync(harness.callsFile, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const fields = line.split('\t');
      const value = (prefix) => (fields.find((field) => field.startsWith(prefix)) ?? '').slice(prefix.length);
      return { connection: value('connection='), args: value('args='), pgDatabase: value('pgdatabase=') };
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
  assert.ok(
    workflow.includes('for tool in pg_dump pg_restore psql; do'),
    'the workflow must verify the whole PostgreSQL 17 client toolchain, including psql',
  );
  assert.ok(
    workflow.includes('"$pg17_bin/$tool" --version'),
    'the workflow must print pg_dump --version, pg_restore --version, and psql --version from the pinned bin directory',
  );

  const pathIndex = workflow.indexOf('echo /usr/lib/postgresql/17/bin >> "$GITHUB_PATH"');
  assert.ok(pathIndex > -1, 'the workflow must add /usr/lib/postgresql/17/bin to GITHUB_PATH');
  const readinessIndex = workflow.indexOf('run: bash scripts/wait-for-prelaunch-recovery-postgres.sh');
  assert.ok(readinessIndex > -1, 'the workflow must wait for the disposable recovery service');
  const diagnosticIndex = workflow.indexOf('run: bash scripts/verify-prelaunch-postgres-versions.sh 17');
  assert.ok(diagnosticIndex > -1, 'the workflow must run the fail-closed major-version diagnostic');
  const backupIndex = workflow.indexOf('backup_external_staging.py backup');
  assert.ok(backupIndex > -1, 'the backup step must remain present');

  assert.ok(readinessIndex < diagnosticIndex, 'the readiness probe must run before the diagnostic');
  assert.ok(pathIndex < readinessIndex, 'GITHUB_PATH must be updated before the readiness probe');
  assert.ok(pathIndex < diagnosticIndex, 'GITHUB_PATH must be updated before the diagnostic runs');
  assert.ok(diagnosticIndex < backupIndex, 'the diagnostic must run before the backup step');
  assert.ok(pathIndex < backupIndex, 'GITHUB_PATH must be updated before the backup step');
});

test('the diagnostic and the backup share one non-Supabase recovery configuration', () => {
  const workflow = readFileSync(workflowPath, 'utf8');
  const jobEnvStart = workflow.indexOf('    env:\n');
  const stepsStart = workflow.indexOf('    steps:\n');
  assert.ok(jobEnvStart > -1 && stepsStart > jobEnvStart, 'the job must keep a job-level env block before its steps');
  const jobEnv = workflow.slice(jobEnvStart, stepsStart);
  const steps = workflow.slice(stepsStart);

  // The static recovery database URL stays job-scoped so the readiness probe, diagnostic, backup,
  // restore, and cleanup can never diverge.
  assert.ok(jobEnv.includes('CONTENT_RECOVERY_DATABASE_URL:'), 'CONTENT_RECOVERY_DATABASE_URL must be defined once at job level');
  assert.equal(
    steps.includes('CONTENT_RECOVERY_DATABASE_URL:'),
    false,
    'CONTENT_RECOVERY_DATABASE_URL must not be redefined per step, so the readiness probe, diagnostic, backup, and cleanup cannot diverge',
  );
  assert.ok(steps.includes('$CONTENT_RECOVERY_DATABASE_URL') || steps.includes('CONTENT_RECOVERY_DATABASE_URL'), 'CONTENT_RECOVERY_DATABASE_URL must remain visible to the recovery steps');

  assert.ok(
    /CONTENT_RECOVERY_DATABASE_URL: postgresql:\/\/recovery:recovery-only-disposable@127\.0\.0\.1:55432\/seccraft_recovery/.test(jobEnv),
    'the recovery database must point at the disposable PostgreSQL service, never at Supabase',
  );
  assert.doesNotMatch(
    jobEnv,
    /CONTENT_RECOVERY_DATABASE_URL:.*SUPABASE/,
    'the recovery database URL must never be sourced from the Supabase project',
  );

  // The disposable storage root depends on the runner's temporary directory. GitHub evaluates
  // job-level env before allocating a runner, so ${{ runner.* }} there fails the whole workflow at
  // startup (run 37438753903: "Unrecognized named-value: runner"). The value must instead be
  // exported to GITHUB_ENV by one dedicated step that runs before every consumer.
  assert.doesNotMatch(jobEnv, /\$\{\{\s*runner\./, 'job-level env must never evaluate runner.* expressions');
  assert.equal(
    jobEnv.includes('CONTENT_RECOVERY_STORAGE_ROOT'),
    false,
    'CONTENT_RECOVERY_STORAGE_ROOT cannot live in job-level env because it needs the runner context',
  );

  const exportLine = 'echo "CONTENT_RECOVERY_STORAGE_ROOT=$RUNNER_TEMP/seccraft-recovery-storage" >> "$GITHUB_ENV"';
  const configureIndex = steps.indexOf(exportLine);
  assert.ok(configureIndex > -1, 'a dedicated step must export CONTENT_RECOVERY_STORAGE_ROOT to GITHUB_ENV from $RUNNER_TEMP');
  assert.equal(
    (steps.match(/CONTENT_RECOVERY_STORAGE_ROOT=/g) ?? []).length,
    1,
    'CONTENT_RECOVERY_STORAGE_ROOT must be defined exactly once so consumers cannot diverge',
  );

  const readinessIndex = steps.indexOf('run: bash scripts/wait-for-prelaunch-recovery-postgres.sh');
  const diagnosticIndex = steps.indexOf('run: bash scripts/verify-prelaunch-postgres-versions.sh 17');
  const backupIndex = steps.indexOf('backup_external_staging.py backup');
  const cleanupIndex = steps.indexOf('Confirm no secret-bearing artifacts are retained');
  for (const [label, index] of [
    ['readiness probe', readinessIndex],
    ['version diagnostic', diagnosticIndex],
    ['backup/restore step', backupIndex],
    ['always() cleanup', cleanupIndex],
  ]) {
    assert.ok(index > -1, `the ${label} must remain present in the workflow`);
    assert.ok(configureIndex < index, `CONTENT_RECOVERY_STORAGE_ROOT must be exported before the ${label}`);
  }
});

test('no backup, dump, object copy, or recovery export is uploaded as an artifact and cleanup always runs', () => {
  const workflow = readFileSync(workflowPath, 'utf8');
  assert.doesNotMatch(workflow, /actions\/upload-artifact/, 'pre-launch validation must never upload an artifact');

  const cleanup = workflow.slice(workflow.indexOf('Confirm no secret-bearing artifacts are retained'));
  assert.match(cleanup, /if: always\(\)/, 'the cleanup step must run even when an earlier step failed');
  assert.match(cleanup, /rm -rf "\$RUNNER_TEMP\/seccraft-prelaunch-backup"/, 'cleanup must delete the temporary dump directory');
  assert.match(
    cleanup,
    /rm -rf .*"\$\{CONTENT_RECOVERY_STORAGE_ROOT:-\$RUNNER_TEMP\/seccraft-recovery-storage\}"/,
    'cleanup must delete the temporary recovery filesystem, with the deterministic fallback in case the export step never ran',
  );
  assert.match(cleanup, /bash scripts\/verify-no-sensitive-files-tracked\.sh/, 'cleanup must re-run the hygiene scan');
});

test('passes when clients and both servers report major 17 and prints no database URLs', () => {
  const harness = makeHarness();
  try {
    const result = runVersionScript(harness.env);
    const output = outputOf(result);

    assert.equal(result.status, 0, output);
    assert.match(output, /client pg_dump: major 17 \(resolved from .*\/pg_dump\)/);
    assert.match(output, /client pg_restore: major 17 \(resolved from .*\/pg_restore\)/);
    assert.match(output, /client psql: major 17 \(resolved from .*\/psql\)/);
    assert.match(output, /server source \(CONTENT_BACKUP_DATABASE_URL\): major 17 \(server_version_num 170005\)/);
    assert.match(output, /server recovery \(CONTENT_RECOVERY_DATABASE_URL\): major 17 \(server_version_num 170005\)/);
    assert.match(
      output,
      /PostgreSQL compatibility verified: pg_dump=17, pg_restore=17, psql=17, source=17, recovery=17/,
      'the diagnostic must print the canonical one-line compatibility summary',
    );
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('PostgreSQL CLI tools only ever receive ordinary postgresql:// connection strings', () => {
  const harness = makeHarness();
  try {
    // The source variable is deliberately spelled the SQLAlchemy way: the diagnostic must
    // normalise it in memory instead of handing postgresql+psycopg:// to psql.
    harness.env.CONTENT_BACKUP_DATABASE_URL = stagingSqlalchemyUrl;
    const result = runVersionScript(harness.env);
    const output = outputOf(result);

    assert.equal(result.status, 0, output);
    const calls = recordedCalls(harness);
    assert.equal(calls.length, 2, 'exactly one read-only probe per database target');
    assert.deepEqual(
      calls.map((call) => call.connection).sort(),
      [stagingUrl, recoveryUrl].sort(),
      'psql must receive the normalised postgresql:// URL, never the SQLAlchemy spelling',
    );
    for (const call of calls) {
      assert.match(call.connection, /^postgresql:\/\//);
      assert.doesNotMatch(call.connection, /\+psycopg/, 'CLI tools must never receive a driver-suffixed URL');
      assert.equal(call.pgDatabase, '', 'PGDATABASE must stay unused: libpq reads it as a database name, not a URI');
      assert.match(call.args, /SHOW server_version_num/);
    }
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('SQLAlchemy URLs are rejected for non-PostgreSQL schemes and read-only probes never mutate state', () => {
  const harness = makeHarness();
  try {
    const result = runVersionScript(harness.env);
    assert.equal(result.status, 0, outputOf(result));

    const calls = recordedCalls(harness);
    assert.equal(calls.length, 2, 'exactly one read-only probe per database target');
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

  // A rejected scheme is caught in the preflight, before any PostgreSQL tool or server is used.
  const rejectedHarness = makeHarness();
  try {
    rejectedHarness.env.CONTENT_RECOVERY_DATABASE_URL = 'sqlite:///tmp/not-postgres.sqlite';
    const rejected = runVersionScript(rejectedHarness.env);
    const rejectedOutput = outputOf(rejected);
    assert.equal(rejected.status, 1);
    assert.match(rejectedOutput, /CONTENT_RECOVERY_DATABASE_URL must use the postgresql:\/\/ scheme/);
    assert.equal(rejectedOutput.includes('not-postgres.sqlite'), false, 'the rejected value must never be echoed');
    assert.equal(recordedCalls(rejectedHarness).length, 0, 'a rejected URL must not reach any probe');
    assertNoFixtureSecrets(rejectedOutput);
  } finally {
    rejectedHarness.cleanup();
  }
});

test('fails closed and contacts no server when a required database URL is empty', () => {
  for (const variable of ['CONTENT_BACKUP_DATABASE_URL', 'CONTENT_RECOVERY_DATABASE_URL']) {
    const harness = makeHarness();
    try {
      harness.env[variable] = '';
      const result = runVersionScript(harness.env);
      const output = outputOf(result);

      assert.equal(result.status, 1);
      assert.match(output, new RegExp(`Required ${variable} is unset or empty`));
      assert.equal(recordedCalls(harness).length, 0, 'an empty URL must fail before any PostgreSQL tool or server is used');
      assertNoFixtureSecrets(output);
    } finally {
      harness.cleanup();
    }
  }
});

test('fails closed when PostgreSQL 17 must dump a PostgreSQL 17 server with an older client', () => {
  const harness = makeHarness({ clientVersion: '16.15' });
  try {
    const result = runVersionScript(harness.env);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /pg_dump resolves to major 16 but this run requires major 17/);
    assert.match(output, /Backup and restore are blocked/);
    assert.equal(recordedCalls(harness).length, 0, 'no server may be contacted before the client toolchain passes');
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('fails closed when either server reports an older or newer major version', () => {
  for (const [label, versionNum, expected] of [
    ['disposable recovery restore target', '160009', /The recovery \(CONTENT_RECOVERY_DATABASE_URL\) server is major 16/],
    ['external staging backup source', '180000', /The source \(CONTENT_BACKUP_DATABASE_URL\) server is major 18/],
  ]) {
    const harness = makeHarness(
      label.includes('recovery') ? { recoveryVersionNum: versionNum } : { stagingVersionNum: versionNum },
    );
    try {
      const result = runVersionScript(harness.env);
      const output = outputOf(result);

      assert.equal(result.status, 1);
      assert.match(output, expected, `${label} must fail closed on a major-version mismatch`);
      assert.match(output, /requires major 17/);
      assertNoFixtureSecrets(output);
    } finally {
      harness.cleanup();
    }
  }
});

test('fails closed when a client tool is missing or its version is unparsable', () => {
  const missingHarness = makeHarness({ missingTools: ['pg_restore'] });
  try {
    const result = runVersionScript(missingHarness.env);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /pg_restore is not on PATH/);
    assert.equal(recordedCalls(missingHarness).length, 0, 'no server may be contacted before the client toolchain passes');
    assertNoFixtureSecrets(output);
  } finally {
    missingHarness.cleanup();
  }

  const unparsableHarness = makeHarness({ stagingVersionNum: 'not-a-version' });
  try {
    const result = runVersionScript(unparsableHarness.env);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /source \(CONTENT_BACKUP_DATABASE_URL\) database reported a server version that could not be parsed/);
    assertNoFixtureSecrets(output);
  } finally {
    unparsableHarness.cleanup();
  }
});

test('reports an unreachable server with a sanitised cause instead of suppressing everything or leaking the URL', () => {
  const harness = makeHarness({ psqlFail: true });
  try {
    const result = runVersionScript(harness.env);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /source \(CONTENT_BACKUP_DATABASE_URL\) database did not report its server version/);
    assert.match(output, /recovery \(CONTENT_RECOVERY_DATABASE_URL\) database did not report its server version/);
    assert.match(output, /the connection string is never printed/);
    assert.match(output, /psql reported:/, 'the real cause must be surfaced so an operator is not left guessing');
    assert.match(output, /Connection refused/, 'the sanitised libpq cause must survive redaction');
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('redacts a JWT, bearer header, or project key that a driver quotes back', () => {
  const serviceRoleJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.QWERTYuiop1234567890abc';
  const harness = makeHarness({ psqlFail: true, psqlLeak: serviceRoleJwt });
  try {
    const result = runVersionScript(harness.env);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.equal(output.includes(serviceRoleJwt), false, 'a quoted JWT must never reach the log');
    assert.equal(output.includes('abcdefghijklmnop.qrstuvwxyz'), false, 'a quoted bearer token must never reach the log');
    assert.equal(output.includes('sb_secret_abcdefgh12345678'), false, 'a quoted project key must never reach the log');
    assert.match(output, /\[REDACTED-SECRET\]/, 'the redaction marker must show a secret was suppressed');
    assert.match(output, /Connection refused/, 'the cause must still be reported');
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

const isReadyMock = `#!/bin/bash
set -u
connection=""
while (( $# )); do
  case "$1" in
    --dbname) connection="\${2:-}"; shift 2; continue ;;
    --dbname=*) connection="\${1#--dbname=}" ;;
  esac
  shift
done
attempts=0
if [[ -f "$PG_ISREADY_CALLS_FILE" ]]; then
  read -r attempts < "$PG_ISREADY_CALLS_FILE"
fi
attempts=$((attempts + 1))
printf '%s' "$attempts" > "$PG_ISREADY_CALLS_FILE"
printf 'connection=%s\\n' "$connection" >> "$PG_ISREADY_TARGETS_FILE"
if [[ "$connection" != postgresql://* ]]; then
  printf 'pg_isready: error: connection string "%s" is not a URI\\n' "$connection" >&2
  exit 2
fi
if (( attempts <= \${MOCK_ISREADY_FAILURES:-0} )); then
  printf 'pg_isready: error: connection to server at "db.example.test" failed\\n' >&2
  exit 2
fi
printf 'db.example.test:55432 - accepting connections\\n'
`;

function makeReadinessHarness({ failures = 0, attempts = 24, interval = 0, missingTool = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'seccraft-prelaunch-readiness-test-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  if (!missingTool) {
    const mockPath = join(bin, 'pg_isready');
    writeFileSync(mockPath, isReadyMock);
    chmodSync(mockPath, 0o755);
  }
  // The readiness loop sleeps between attempts; the mock keeps the retry budget observable and
  // the test fast without letting any other external command resolve.
  const sleepPath = join(bin, 'sleep');
  writeFileSync(sleepPath, '#!/bin/bash\nprintf \'%s\\n\' "$1" >> "$SLEEP_CALLS_FILE"\n');
  chmodSync(sleepPath, 0o755);
  const env = {
    PATH: bin,
    HOME: process.env.HOME ?? tmpdir(),
    CONTENT_RECOVERY_DATABASE_URL: recoveryUrl,
    PG_ISREADY_CALLS_FILE: join(root, 'calls'),
    PG_ISREADY_TARGETS_FILE: join(root, 'targets'),
    MOCK_ISREADY_FAILURES: String(failures),
    PRELAUNCH_RECOVERY_READINESS_ATTEMPTS: String(attempts),
    PRELAUNCH_RECOVERY_READINESS_INTERVAL: String(interval),
    SLEEP_CALLS_FILE: join(root, 'sleep-calls'),
  };
  writeFileSync(env.PG_ISREADY_CALLS_FILE, '0');
  writeFileSync(env.PG_ISREADY_TARGETS_FILE, '');
  writeFileSync(env.SLEEP_CALLS_FILE, '');
  return { env, root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test('waits for the disposable recovery service and reports bounded success without printing the URL', () => {
  const harness = makeReadinessHarness({ failures: 2, attempts: 5 });
  try {
    const result = runScript(readinessScript, harness.env, ['CONTENT_RECOVERY_DATABASE_URL']);
    const output = outputOf(result);

    assert.equal(result.status, 0, output);
    assert.match(output, /recovery PostgreSQL service is accepting connections \(attempt 3 of 5\)/);
    assert.equal(output.includes('accepting connections\n'), false, 'pg_isready output must not be forwarded');
    const probed = readFileSync(harness.env.PG_ISREADY_TARGETS_FILE, 'utf8').split('\n').filter(Boolean);
    assert.deepEqual(probed, [`connection=${recoveryUrl}`, `connection=${recoveryUrl}`, `connection=${recoveryUrl}`]);
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('fails clearly after a bounded number of retries when the recovery service never answers', () => {
  const harness = makeReadinessHarness({ failures: 99, attempts: 3, interval: 0 });
  try {
    const result = runScript(readinessScript, harness.env, ['CONTENT_RECOVERY_DATABASE_URL']);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /Disposable recovery PostgreSQL unavailable/);
    assert.match(output, /did not accept connections within 3 attempts/);
    assert.equal(readFileSync(harness.env.PG_ISREADY_CALLS_FILE, 'utf8'), '3', 'the retry budget must be bounded exactly');
    assert.deepEqual(
      readFileSync(harness.env.SLEEP_CALLS_FILE, 'utf8').split('\n').filter(Boolean),
      ['0', '0'],
      'the probe must wait between attempts and stop at the bound',
    );
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('fails closed before probing when the recovery URL is empty or pg_isready is missing', () => {
  const emptyHarness = makeReadinessHarness();
  try {
    emptyHarness.env.CONTENT_RECOVERY_DATABASE_URL = '';
    const result = runScript(readinessScript, emptyHarness.env, ['CONTENT_RECOVERY_DATABASE_URL']);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /Required CONTENT_RECOVERY_DATABASE_URL is unset or empty/);
    assert.equal(readFileSync(emptyHarness.env.PG_ISREADY_CALLS_FILE, 'utf8'), '0', 'an empty URL must fail before probing');
    assertNoFixtureSecrets(output);
  } finally {
    emptyHarness.cleanup();
  }

  const missingHarness = makeReadinessHarness({ missingTool: true });
  try {
    const result = runScript(readinessScript, missingHarness.env, ['CONTENT_RECOVERY_DATABASE_URL']);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /pg_isready is not on PATH/);
    assertNoFixtureSecrets(output);
  } finally {
    missingHarness.cleanup();
  }
});

test('a failing recovery readiness probe never leaks the connection string through pg_isready diagnostics', () => {
  const harness = makeReadinessHarness({ failures: 99, attempts: 2, interval: 0 });
  try {
    const result = runScript(readinessScript, harness.env, ['CONTENT_RECOVERY_DATABASE_URL']);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.equal(output.includes('db.example.test'), false, 'pg_isready diagnostics must not be forwarded');
    assertNoFixtureSecrets(output);
  } finally {
    harness.cleanup();
  }
});

test('the workflow never traces these scripts, so no connection string can appear in an echo', () => {
  const workflow = readFileSync(workflowPath, 'utf8');
  for (const script of ['verify-prelaunch-postgres-versions.sh', 'wait-for-prelaunch-recovery-postgres.sh']) {
    assert.ok(workflow.includes(`bash scripts/${script}`), `${script} must stay part of the workflow`);
  }
  assert.doesNotMatch(workflow, /set -x/, 'shell tracing would echo every connection string');
  for (const script of [versionScript, readinessScript]) {
    assert.match(readFileSync(script, 'utf8'), /^set \+x$/m, 'each script must disable shell tracing explicitly');
  }
});

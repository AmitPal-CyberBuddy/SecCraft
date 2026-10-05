import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const testsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testsDir, '../..');
const tokenScript = resolve(repoRoot, 'scripts/acquire-prelaunch-tokens.sh');
const allowedFixtureLabels = ['pending', 'approved-new', 'approved-progress'];
const accountCredentials = Object.freeze({
  PENDING_EMAIL: 'pending-fixture@example.invalid',
  PENDING_PASSWORD: 'test-only-pending-password',
  APPROVED_NEW_EMAIL: 'approved-new-fixture@example.invalid',
  APPROVED_NEW_PASSWORD: 'test-only-approved-new-password',
  APPROVED_PROGRESS_EMAIL: 'approved-progress-fixture@example.invalid',
  APPROVED_PROGRESS_PASSWORD: 'test-only-approved-progress-password',
});
const fixtureByCredential = Object.freeze({
  PENDING_EMAIL: 'pending',
  PENDING_PASSWORD: 'pending',
  APPROVED_NEW_EMAIL: 'approved-new',
  APPROVED_NEW_PASSWORD: 'approved-new',
  APPROVED_PROGRESS_EMAIL: 'approved-progress',
  APPROVED_PROGRESS_PASSWORD: 'approved-progress',
});
const providerDiagnostic = 'mock auth provider diagnostic must stay private';

function makeHarness({ mode = 'valid', failAt } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'seccraft-prelaunch-token-test-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const callsFile = join(root, 'curl-calls');
  const githubEnv = join(root, 'github-env');
  const curl = join(bin, 'curl');

  writeFileSync(githubEnv, '');
  writeFileSync(curl, `#!/usr/bin/env bash
set -euo pipefail
calls=0
if [[ -f "$CURL_CALLS_FILE" ]]; then
  read -r calls < "$CURL_CALLS_FILE"
fi
calls=$((calls + 1))
printf '%s\\n' "$calls" > "$CURL_CALLS_FILE"
cat >/dev/null
if [[ "\${MOCK_CURL_FAIL_AT:-}" == "$calls" ]]; then
  printf '%s\\n' '${providerDiagnostic}' >&2
  exit 22
fi
case "\${MOCK_CURL_MODE:-valid}" in
  empty) printf '%s' '{"access_token":""}' ;;
  valid) printf '{"access_token":"unit-test-access-token-%s"}' "$calls" ;;
  *) exit 90 ;;
esac
`);
  chmodSync(curl, 0o755);

  const env = {
    PATH: `${bin}${delimiter}${process.env.PATH ?? '/usr/bin:/bin'}`,
    HOME: process.env.HOME ?? tmpdir(),
    SUPABASE_URL: 'https://supabase.example.invalid',
    SUPABASE_ANON_KEY: 'test-only-anon-key',
    GITHUB_ENV: githubEnv,
    CURL_CALLS_FILE: callsFile,
    MOCK_CURL_MODE: mode,
    ...accountCredentials,
  };
  if (failAt !== undefined) env.MOCK_CURL_FAIL_AT = String(failAt);

  return {
    env,
    callsFile,
    githubEnv,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function runTokenScript(env) {
  return spawnSync('bash', [tokenScript], {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
  });
}

function outputOf(result) {
  return `${result.stdout ?? ''}${result.stderr ?? ''}`;
}

function callCount(harness) {
  return existsSync(harness.callsFile) ? Number(readFileSync(harness.callsFile, 'utf8')) : 0;
}

function assertNoFixtureCredentials(output) {
  for (const credential of Object.values(accountCredentials)) {
    assert.equal(output.includes(credential), false, 'fixture credentials must not appear in output');
  }
  assert.equal(output.includes('test-only-anon-key'), false, 'the API key must not appear in output');
}

test('workflow delegates synthetic-token acquisition to the tested fail-closed script', () => {
  const workflow = readFileSync(resolve(repoRoot, '.github/workflows/prelaunch-validation.yml'), 'utf8');
  assert.match(workflow, /run: bash scripts\/acquire-prelaunch-tokens\.sh/);
  assert.doesNotMatch(workflow, /curl --fail --silent --show-error -X POST/);
});

test('checks every account email and password before making any login request', () => {
  for (const [name, value] of Object.entries(accountCredentials)) {
    const harness = makeHarness();
    try {
      harness.env[name] = '';
      const result = runTokenScript(harness.env);
      const output = outputOf(result);
      const fixture = fixtureByCredential[name];

      assert.equal(result.status, 1, `missing ${name} should stop token acquisition`);
      assert.ok(
        output.includes(`Fixture ${fixture} is missing required credential ${name}`),
        'the diagnostic should use the fixture label and credential name only',
      );
      assert.equal(callCount(harness), 0, 'no fixture may log in before all six credentials pass');
      assert.equal(readFileSync(harness.githubEnv, 'utf8'), '', 'missing credentials must not export tokens');
      assertNoFixtureCredentials(output);
    } finally {
      harness.cleanup();
    }
  }
});

test('failed login reports only the fixture label and does not export partial tokens', () => {
  const harness = makeHarness({ failAt: 2 });
  try {
    const result = runTokenScript(harness.env);
    const output = outputOf(result);
    const failures = [...output.matchAll(/Fixture ([a-z-]+) could not obtain an access token/g)].map((match) => match[1]);

    assert.equal(result.status, 1);
    assert.deepEqual(failures, ['approved-new']);
    assert.ok(failures.every((fixture) => allowedFixtureLabels.includes(fixture)));
    assert.equal(output.includes(providerDiagnostic), false, 'provider diagnostics must not be forwarded');
    assertNoFixtureCredentials(output);
    assert.equal(callCount(harness), 2);
    assert.equal(readFileSync(harness.githubEnv, 'utf8'), '', 'tokens are exported only after all logins succeed');
  } finally {
    harness.cleanup();
  }
});

test('empty access-token responses are neither masked nor exported', () => {
  const harness = makeHarness({ mode: 'empty' });
  try {
    const result = runTokenScript(harness.env);
    const output = outputOf(result);

    assert.equal(result.status, 1);
    assert.match(output, /Fixture pending could not obtain an access token/);
    assert.equal(output.includes('::add-mask::'), false, 'an empty token must never be registered as a mask');
    assert.equal(output.includes('STAGING_PENDING_JWT='), false);
    assert.equal(readFileSync(harness.githubEnv, 'utf8'), '', 'an empty token must never reach GITHUB_ENV');
    assert.equal(callCount(harness), 1);
    assertNoFixtureCredentials(output);
  } finally {
    harness.cleanup();
  }
});

test('exports and masks three non-empty tokens after every fixture login succeeds', () => {
  const harness = makeHarness();
  try {
    const result = runTokenScript(harness.env);
    const output = outputOf(result);
    const tokens = [1, 2, 3].map((number) => `unit-test-access-token-${number}`);

    assert.equal(result.status, 0, 'a complete synthetic-token flow should succeed');
    assert.equal(callCount(harness), 3);
    assert.deepEqual(
      readFileSync(harness.githubEnv, 'utf8').trimEnd().split('\n'),
      [
        `STAGING_PENDING_JWT=${tokens[0]}`,
        `STAGING_APPROVED_JWT=${tokens[1]}`,
        `STAGING_APPROVED_WITH_PROGRESS_JWT=${tokens[2]}`,
      ],
    );
    for (const token of tokens) assert.ok(output.includes(`::add-mask::${token}`));
    assertNoFixtureCredentials(output);
  } finally {
    harness.cleanup();
  }
});

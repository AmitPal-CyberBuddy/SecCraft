import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testsDir, '../..');
const validator = resolve(repoRoot, 'scripts/validate-prelaunch-env.sh');

const requiredRuntimeValues = [
  'PLATFORM_DATABASE_URL',
  'CONTENT_MIGRATION_DATABASE_URL',
  'CONTENT_BACKUP_DATABASE_URL',
  'CONTENT_DATABASE_RUNTIME_ROLE',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PENDING_EMAIL',
  'PENDING_PASSWORD',
  'APPROVED_NEW_EMAIL',
  'APPROVED_NEW_PASSWORD',
  'APPROVED_PROGRESS_EMAIL',
  'APPROVED_PROGRESS_PASSWORD',
  'CONTENT_RELEASE_ID',
];

function fixtureEnvironment(missingName) {
  const env = {
    PATH: process.env.PATH ?? '/usr/bin:/bin',
    HOME: process.env.HOME ?? '/tmp',
  };
  for (const name of requiredRuntimeValues) {
    if (name !== missingName) env[name] = `test-only-value-${name}`;
  }
  return env;
}

function runValidator(env) {
  return spawnSync('bash', [validator], {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
  });
}

test('workflow sources match the preflight setting map', () => {
  const workflow = readFileSync(resolve(repoRoot, '.github/workflows/prelaunch-validation.yml'), 'utf8');
  const expectedMappings = [
    'PLATFORM_DATABASE_URL: ${{ secrets.PRELAUNCH_DATABASE_URL }}',
    'CONTENT_MIGRATION_DATABASE_URL: ${{ secrets.PRELAUNCH_MIGRATION_DATABASE_URL }}',
    'CONTENT_BACKUP_DATABASE_URL: ${{ secrets.PRELAUNCH_BACKUP_DATABASE_URL }}',
    'CONTENT_DATABASE_RUNTIME_ROLE: ${{ vars.CONTENT_DATABASE_RUNTIME_ROLE }}',
    'SUPABASE_URL: ${{ vars.SUPABASE_URL }}',
    'SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}',
    'SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}',
    'PENDING_EMAIL: ${{ secrets.PRELAUNCH_PENDING_EMAIL }}',
    'PENDING_PASSWORD: ${{ secrets.PRELAUNCH_PENDING_PASSWORD }}',
    'APPROVED_NEW_EMAIL: ${{ secrets.PRELAUNCH_APPROVED_NEW_EMAIL }}',
    'APPROVED_NEW_PASSWORD: ${{ secrets.PRELAUNCH_APPROVED_NEW_PASSWORD }}',
    'APPROVED_PROGRESS_EMAIL: ${{ secrets.PRELAUNCH_APPROVED_PROGRESS_EMAIL }}',
    'APPROVED_PROGRESS_PASSWORD: ${{ secrets.PRELAUNCH_APPROVED_PROGRESS_PASSWORD }}',
    'CONTENT_RELEASE_ID: ${{ inputs.release_id }}',
  ];
  for (const mapping of expectedMappings) assert.ok(workflow.includes(mapping), `missing workflow mapping: ${mapping}`);
});

test('reports the missing GitHub setting name without exposing configured values', () => {
  const env = fixtureEnvironment('CONTENT_MIGRATION_DATABASE_URL');
  const result = runValidator(env);
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  assert.equal(result.status, 1);
  assert.match(output, /CONTENT_MIGRATION_DATABASE_URL/);
  assert.match(output, /secret PRELAUNCH_MIGRATION_DATABASE_URL/);
  assert.doesNotMatch(output, /test-only-value-/);
});

test('passes with complete configuration and does not print configured values', () => {
  const env = fixtureEnvironment();
  const result = runValidator(env);
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;

  assert.equal(result.status, 0, output);
  assert.match(output, /No tracked environment files/);
  assert.doesNotMatch(output, /test-only-value-/);
});

test('VITE_API_BASE stays an origin with no /api/v1 path in the workflow and in every example', () => {
  const sources = [
    ['.github/workflows/prelaunch-validation.yml', /VITE_API_BASE:\s*([^\n]*)/g],
    ['.github/workflows/pages.yml', /VITE_API_BASE:\s*([^\n]*)/g],
    ['deploy/staging.env.example', /^\s*VITE_API_BASE=(.*)$/gm],
    ['frontend/.env.example', /^\s*#.*VITE_API_BASE=(.*)$/gm],
    ['docker-compose.env.example', /^\s*VITE_API_BASE=(.*)$/gm],
  ];

  let checked = 0;
  for (const [relative, pattern] of sources) {
    const content = readFileSync(resolve(repoRoot, relative), 'utf8');
    for (const match of content.matchAll(pattern)) {
      const value = (match[1] ?? '').trim();
      if (!value || value.startsWith('${{') || value.startsWith('${')) continue;
      checked += 1;
      assert.equal(
        value.includes('/api/'),
        false,
        `${relative} must set VITE_API_BASE to an origin without an /api path, found ${value}`,
      );
      assert.equal(
        value.endsWith('/api') || value.endsWith('/api/v1'),
        false,
        `${relative} must not append the API prefix to VITE_API_BASE`,
      );
      const parsed = new URL(value);
      assert.equal(parsed.pathname, '/', `${relative} must not give VITE_API_BASE a path component`);
      assert.equal(parsed.search, '', `${relative} must not give VITE_API_BASE a query string`);
    }
  }
  assert.ok(checked >= 3, 'the VITE_API_BASE sources must still be present and non-empty');

  const prelaunch = readFileSync(resolve(repoRoot, '.github/workflows/prelaunch-validation.yml'), 'utf8');
  assert.ok(
    prelaunch.includes('VITE_API_BASE: http://127.0.0.1:8000'),
    'pre-launch validation must build against the local FastAPI origin without the API prefix',
  );
  const stagingExample = readFileSync(resolve(repoRoot, 'deploy/staging.env.example'), 'utf8');
  assert.ok(
    stagingExample.includes('VITE_API_BASE=http://127.0.0.1:8000'),
    'deploy/staging.env.example must document the origin-only VITE_API_BASE value',
  );
});

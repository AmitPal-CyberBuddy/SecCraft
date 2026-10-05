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

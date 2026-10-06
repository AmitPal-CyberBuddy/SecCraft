import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const testsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testsDir, '../..');
const workflowsDir = resolve(repoRoot, '.github/workflows');
const prelaunchPath = resolve(workflowsDir, 'prelaunch-validation.yml');

function workflowFiles() {
  return readdirSync(workflowsDir)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort()
    .map((name) => ({ name, path: resolve(workflowsDir, name), content: readFileSync(resolve(workflowsDir, name), 'utf8') }));
}

// Collects the text of every `env:` mapping declared at workflow level (no indent) or job level
// (the two-space/one-level indentation used by this repository). Step-level, service-level, and
// defaults-level env blocks sit deeper and are intentionally excluded: the runner context only
// became a startup failure when it appeared in the env that GitHub evaluates before allocating a
// runner (workflow level and job level).
function topLevelEnvBlocks(content) {
  const blocks = [];
  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const header = /^( {0,4})env:\s*(#.*)?$/.exec(lines[index]);
    if (!header) continue;
    const indent = header[1].length;
    const block = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const line = lines[cursor];
      if (line.trim() === '' || line.trim().startsWith('#')) {
        block.push(line);
        continue;
      }
      const currentIndent = /^ */.exec(line)[0].length;
      if (currentIndent <= indent) break;
      block.push(line);
    }
    blocks.push(block.join('\n'));
  }
  return blocks;
}

function expressionRootContexts(block) {
  return [...block.matchAll(/\$\{\{\s*([A-Za-z_][A-Za-z0-9_-]*)/g)].map((match) => match[1]);
}

test('no workflow evaluates a runner.* expression anywhere (startup failure regression)', () => {
  // GitHub evaluates job-level env before a runner is allocated, so any ${{ runner.* }} there kills
  // the whole run at startup with "Unrecognized named-value: runner" (run 37438753903). Run steps
  // already receive $RUNNER_TEMP, $GITHUB_ENV, and friends as ordinary shell variables, so no
  // workflow in this repository ever needs the runner context inside an expression.
  for (const workflow of workflowFiles()) {
    assert.doesNotMatch(
      workflow.content,
      /\$\{\{\s*runner\./,
      `${workflow.name} must never evaluate a runner.* expression; use the $RUNNER_* shell variables inside run steps`,
    );
  }
});

test('workflow-level and job-level env only use contexts GitHub can evaluate before a runner exists', () => {
  // Contexts available to job-level env at compile time. Anything else (runner, env, steps, job,
  // matrix results, ...) either fails startup or evaluates to an empty string, which for the
  // pre-launch workflow would mean silently dumping recovery files into the wrong place.
  const allowed = new Set(['github', 'secrets', 'vars', 'inputs', 'needs', 'strategy', 'matrix']);
  for (const workflow of workflowFiles()) {
    for (const block of topLevelEnvBlocks(workflow.content)) {
      for (const context of expressionRootContexts(block)) {
        assert.ok(
          allowed.has(context),
          `${workflow.name} uses the "${context}" context in workflow/job-level env, which GitHub cannot evaluate before allocating a runner`,
        );
      }
    }
  }
});

test('the pre-launch workflow stays manual-only, serialized, protected, and read-only', () => {
  const workflow = readFileSync(prelaunchPath, 'utf8');

  assert.match(workflow, /^on:\n {2}workflow_dispatch:\n/m, 'the pre-launch workflow must trigger only via workflow_dispatch');
  assert.doesNotMatch(workflow, /^\s*(push|pull_request|schedule):/m, 'the pre-launch workflow must never run automatically');
  assert.match(workflow, /release_id:\n\s*description:.*\n\s*required: true\n\s*type: string/, 'the immutable release ID input must stay mandatory');

  assert.match(workflow, /environment: prelaunch\n/, 'the job must keep using the protected prelaunch environment');
  assert.match(workflow, /concurrency:\n\s*group: seccraft-prelaunch-content\n\s*cancel-in-progress: false/, 'runs must stay serialized without cancelling an in-flight validation');

  const permissionsBlock = workflow.slice(workflow.indexOf('permissions:'), workflow.indexOf('jobs:'));
  assert.match(permissionsBlock, /contents: read/, 'the workflow must keep read-only repository permissions');
  assert.doesNotMatch(permissionsBlock, /(write|packages|deployments|id-token)/, 'the workflow must never request elevated permissions');
});

test('actionlint validates every workflow when the pinned binary is available', (t) => {
  // CI installs the pinned actionlint release before running these tests and also runs it as its
  // own gate step; locally the test uses ACTIONLINT_BIN or the actionlint on PATH when present.
  const binary = process.env.ACTIONLINT_BIN || 'actionlint';
  const probe = spawnSync(binary, ['-version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    t.skip(`actionlint is not installed (${binary}); CI provides the pinned binary, install it locally to run this gate`);
    return;
  }

  const files = workflowFiles().map((workflow) => workflow.path);
  // shellcheck and pyflakes integrations are disabled so the gate is deterministic whether or not
  // those tools happen to be installed; expression and structure checks are what this gate exists
  // for (they catch the job-level runner context class of startup failures).
  const result = spawnSync(binary, ['-shellcheck=', '-pyflakes=', ...files], { encoding: 'utf8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  assert.equal(result.status, 0, `actionlint reported workflow problems:\n${output}`);
  assert.equal(output.trim(), '', 'actionlint must stay silent when every workflow is valid');
});

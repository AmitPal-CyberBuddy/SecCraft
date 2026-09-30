import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = fileURLToPath(new URL('../', import.meta.url))

/**
 * Product-state regression.
 *
 * The access matrix in `src/lib/access.ts` decides what SecCraft *renders* for each user state. It
 * is explicitly not an authorization boundary — the API is — so this test guards the two things the
 * product must never get wrong:
 *
 *   1. A guest (and every non-approved signed-in state) keeps the full learning experience.
 *   2. Account-backed surfaces and the owner console are never shown to a state that the server
 *      would reject anyway.
 */
test('user-state derivation and the access matrix hold for every state', async t => {
  const testEnv = new Map([
    ['VITE_API_BASE', ''],
    ['VITE_SUPABASE_URL', 'https://auth-test.invalid'],
    ['VITE_SUPABASE_ANON_KEY', 'unit-test-public-anon-key'],
  ])
  const savedEnv = new Map([...testEnv.keys()].map(key => [key, process.env[key]]))
  for (const [key, value] of testEnv) process.env[key] = value

  const vite = await createServer({
    configFile: `${frontendRoot}/vite.config.ts`,
    root: frontendRoot,
    mode: 'test',
    appType: 'custom',
    logLevel: 'silent',
    server: { middlewareMode: true },
  })
  t.after(async () => {
    await vite.close()
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  const { deriveUserState, allows, isSignedIn, isOwner, STATE_META, PROVENANCE_META } = await vite.ssrLoadModule('/src/lib/access.ts')

  await t.test('a session collapses to exactly one product state', () => {
    const account = status => ({ account_status: status, is_admin: false })
    assert.equal(deriveUserState({ hasSession: false, account: null }), 'guest')
    assert.equal(deriveUserState({ hasSession: true, account: null }), 'pending', 'a verified session with no profile is still awaiting approval')
    assert.equal(deriveUserState({ hasSession: true, account: account('pending') }), 'pending')
    assert.equal(deriveUserState({ hasSession: true, account: account('active') }), 'active')
    assert.equal(deriveUserState({ hasSession: true, account: account('rejected') }), 'rejected')
    assert.equal(deriveUserState({ hasSession: true, account: account('suspended') }), 'suspended')
  })

  await t.test('the owner allowlist outranks the learner profile status', () => {
    for (const status of ['pending', 'active', 'rejected', 'suspended']) {
      assert.equal(deriveUserState({ hasSession: true, account: { account_status: status, is_admin: true } }), 'owner')
    }
    assert.ok(isOwner('owner'))
    assert.ok(!isOwner('active'))
  })

  await t.test('guest learning is never withdrawn to force registration', () => {
    const learningStates = ['public', 'guest', 'pending', 'active', 'rejected', 'suspended']
    for (const capability of ['guest-workspace', 'local-progress', 'profile', 'settings', 'progress-file', 'password-recovery']) {
      for (const state of learningStates) {
        assert.ok(allows(state, capability), `${state} must keep ${capability}`)
      }
    }
  })

  await t.test('account-backed surfaces match what the server actually serves', () => {
    // `active_profile` on the API permits active accounts and the owner allowlist only, so the UI
    // must not offer these to any other state — it would be a dead control.
    for (const capability of ['account-progress', 'progress-merge', 'assessment-attempts']) {
      for (const state of ['active', 'owner']) {
        assert.ok(allows(state, capability), `${state} should reach ${capability}`)
      }
      for (const state of ['public', 'guest', 'pending', 'rejected', 'suspended']) {
        assert.ok(!allows(state, capability), `${state} must not be offered ${capability}`)
      }
    }
  })

  await t.test('the owner console is never reachable from a learner state', () => {
    for (const state of ['public', 'guest', 'pending', 'active', 'rejected', 'suspended']) {
      assert.ok(!allows(state, 'admin-console'), `${state} must not be offered the owner console`)
    }
    assert.ok(allows('owner', 'admin-console'))
  })

  await t.test('account status is only offered to a real session', () => {
    for (const state of ['pending', 'active', 'rejected', 'suspended', 'owner']) {
      assert.ok(allows(state, 'account-status'))
      assert.ok(isSignedIn(state))
    }
    for (const state of ['public', 'guest']) {
      assert.ok(!allows(state, 'account-status'))
      assert.ok(!isSignedIn(state))
    }
  })

  await t.test('every state carries presentation copy', () => {
    for (const state of ['public', 'guest', 'pending', 'active', 'rejected', 'suspended', 'owner']) {
      const meta = STATE_META[state]
      assert.ok(meta?.label, `${state} needs a chip label`)
      assert.ok(meta?.nextAction, `${state} needs a next action`)
      assert.ok(meta?.summary, `${state} needs a summary`)
    }
    for (const provenance of ['local', 'derived', 'server', 'imported']) {
      assert.ok(PROVENANCE_META[provenance]?.label)
      assert.ok(PROVENANCE_META[provenance]?.note, `${provenance} must state what it is worth`)
    }
  })
})

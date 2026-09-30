import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = fileURLToPath(new URL('../', import.meta.url))

/**
 * Product-state regression.
 *
 * The access matrix in `src/lib/access.ts` and the curriculum tiers in `src/lib/contentAccess.ts`
 * decide what SecCraft *renders*. Neither is an authorization boundary — the API is — so this test
 * guards the things the product must never get wrong:
 *
 *   1. Every state, including rejected and suspended, keeps the Preview Curriculum and a local
 *      practice record. Revoking learning is a policy decision the platform has not made.
 *   2. The Full Curriculum and account-backed records are shown only to approved accounts, which is
 *      the state the server would accept anyway.
 *   3. Practice figures are never labelled as records.
 *   4. Certificates are issued to nobody, because nothing on the server awards verified XP yet.
 */
const vite = await createServer({
  configFile: `${frontendRoot}/vite.config.ts`,
  root: frontendRoot,
  mode: 'test',
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
})
after(async () => {
  await vite.close()
  process.exit(0)
})

const load = path => vite.ssrLoadModule(path)

test('user-state derivation, curriculum tiers, and the access matrix hold for every state', async () => {
  const { deriveUserState, allows, ACCESS_MATRIX, STATE_META, standingFor, CERTIFICATE_DISABLED_NOTE } =
    await load('/src/lib/access.ts')
  const { canAccessTier, contentTierOf, availableTiers, TIER_COUNTS } = await load('/src/lib/contentAccess.ts')

  const account = (status, is_admin = false) => ({ user_id: 'u', email: 'a@b.c', account_status: status, is_admin })

  /* --- state derivation ------------------------------------------------ */

  assert.equal(deriveUserState({ hasSession: false, account: null }), 'guest')
  assert.equal(
    deriveUserState({ hasSession: false, account: account('active') }),
    'guest',
    'a stale account record must never create a session',
  )
  for (const status of ['pending', 'active', 'rejected', 'suspended']) {
    assert.equal(deriveUserState({ hasSession: true, account: account(status) }), status)
  }
  assert.equal(
    deriveUserState({ hasSession: true, account: account('suspended', true) }),
    'owner',
    'the owner allowlist must win over account status',
  )
  assert.equal(
    deriveUserState({ hasSession: true, account: null }),
    'pending',
    'a session with no profile yet is pending, never active',
  )

  // The learner set is the union of every state that can be shown the workspace. `owner` is
  // deliberately absent: an owner is an authorization source, not a learner profile.
  const ALL_STATES = ['public', 'guest', 'pending', 'active', 'rejected', 'suspended', 'owner']
  // `owner` is absent from the learner set: an owner is an authorization source, not a profile
  // awaiting review. It still gets a full workspace, so it is asserted explicitly instead.
  assert.deepEqual(
    [...ACCESS_MATRIX['guest-workspace']].sort(),
    ['active', 'guest', 'pending', 'public', 'rejected', 'suspended'],
    'the learner set must be exactly the six non-owner states',
  )
  assert.ok(!ACCESS_MATRIX['guest-workspace'].includes('owner'), 'owner is not part of the learner set')
  assert.equal(deriveUserState({ hasSession: true, account: account('active', true) }), 'owner')

  /* --- the curriculum tier is the product boundary --------------------- */

  for (const state of ALL_STATES) {
    assert.equal(canAccessTier(state, 'preview'), true, `${state} must always have the Preview Curriculum`)
  }
  for (const state of ['active', 'owner']) {
    assert.equal(canAccessTier(state, 'full'), true, `${state} must have the Full Curriculum`)
  }
  for (const state of ['public', 'guest', 'pending', 'rejected', 'suspended']) {
    assert.equal(
      canAccessTier(state, 'full'),
      false,
      `${state} must not be given the Full Curriculum`,
    )
  }
  assert.deepEqual(availableTiers('pending'), ['preview'])
  assert.deepEqual(availableTiers('active'), ['preview', 'full'])

  /* --- the cut line must stay pinned to modules 01-06 ------------------- */

  assert.equal(TIER_COUNTS.preview, 9, 'six wireless and three Android Foundations preview modules')
  assert.equal(TIER_COUNTS.full, 18, 'nine wireless and nine Android Full modules')

  const modules = (await load('/src/content/modules.json')).default
  const derivedPreview = modules.filter(m => contentTierOf(m) === 'preview').map(m => m.id)
  assert.deepEqual(
    derivedPreview,
    [
      '01-intro-wireless',
      '02-wifi-fundamentals',
      '03-80211-architecture',
      '04-kali-wireless-setup',
      '05-wireless-recon',
      '06-traffic-analysis',
      'android-01-platform',
      'android-02-workstation',
      'android-03-apk-triage',
    ],
    'the Preview Curriculum must be exactly modules 01-06',
  )

  // An unparseable phase must not silently widen the public preview.
  assert.equal(contentTierOf({ id: 'unknown' }), 'full')
  assert.equal(contentTierOf({ id: 'x', phase: 'not-a-number' }), 'full')
  assert.equal(contentTierOf({ id: 'x', phase: '' }), 'full')
  assert.equal(contentTierOf({ id: 'x', phase: '2' }), 'preview', 'phase may arrive as a string')
  assert.equal(contentTierOf({ id: 'x', phase: 3 }), 'full')

  /* --- account-backed records mirror what the API will accept --------- */

  for (const state of ['active', 'owner']) {
    assert.equal(allows(state, 'account-progress'), true, `${state} must have account progress`)
    assert.equal(allows(state, 'assessment-attempts'), true, `${state} must have assessment attempts`)
    assert.equal(standingFor(state), 'record', `${state} figures are an account record`)
  }
  for (const state of ['public', 'guest', 'pending', 'rejected', 'suspended']) {
    assert.equal(allows(state, 'account-progress'), false, `${state} must not claim account progress`)
    assert.equal(allows(state, 'assessment-attempts'), false, `${state} must not claim assessment attempts`)
    assert.equal(standingFor(state), 'practice', `${state} figures must be labelled practice`)
  }

  /* --- certificates are off everywhere --------------------------------- */

  for (const state of ALL_STATES) {
    assert.equal(allows(state, 'certificate'), false, 'no state may be issued a certificate')
  }
  assert.match(CERTIFICATE_DISABLED_NOTE, /not issued yet/i)

  /* --- the owner console stays owner-only ------------------------------- */

  for (const state of ALL_STATES) {
    assert.equal(allows(state, 'admin-console'), state === 'owner', `${state} must not reach the console`)
  }

  /* --- rejected and suspended keep the preview experience --------------- */

  for (const state of ['rejected', 'suspended']) {
    assert.equal(allows(state, 'guest-workspace'), true, `${state} must keep learning`)
    assert.equal(allows(state, 'local-progress'), true, `${state} must keep a local practice record`)
  }

  /* --- the matrix is total and its metadata is complete ----------------- */

  for (const [capability, states] of Object.entries(ACCESS_MATRIX)) {
    for (const state of states) {
      assert.ok(ALL_STATES.includes(state), `${capability} lists unknown state ${state}`)
    }
  }
  for (const state of ALL_STATES) {
    const meta = STATE_META[state]
    assert.ok(meta.label && meta.tone && meta.summary && meta.nextAction, `${state} needs full presentation metadata`)
    assert.doesNotMatch(meta.summary, /certificate/i, `${state} summary must not imply a certificate exists`)
  }

  /* --- no copy may claim the content is secured ------------------------- */

  const { CONTENT_TIER_NOTE, CONTENT_NOT_ENFORCED_NOTE } = await load('/src/lib/contentAccess.ts')
  for (const banned of [/securely locked/i, /protected content/i, /cannot be accessed/i, /encrypted/i, /secure vault/i]) {
    assert.doesNotMatch(CONTENT_TIER_NOTE, banned, 'the tier note must not claim enforcement')
    assert.doesNotMatch(CONTENT_NOT_ENFORCED_NOTE, banned, 'the honesty note must not claim enforcement')
  }
  assert.match(CONTENT_TIER_NOTE, /not a security boundary/i)
  assert.match(CONTENT_NOT_ENFORCED_NOTE, /not access control/i)

  // The approved terminology must actually be used.
  assert.match(CONTENT_TIER_NOTE, /Full Curriculum/)
  const { CONTENT_TIER_META, currentCurriculumLabel } = await load('/src/lib/contentAccess.ts')
  assert.equal(CONTENT_TIER_META.preview.label, 'Preview Curriculum')
  assert.equal(CONTENT_TIER_META.full.label, 'Full Curriculum')
  assert.equal(currentCurriculumLabel('guest'), 'Preview Curriculum')
  assert.equal(currentCurriculumLabel('active'), 'Full Curriculum')
  assert.equal(currentCurriculumLabel('pending'), 'Preview Curriculum')
  assert.equal(currentCurriculumLabel('suspended'), 'Preview Curriculum')
})


test('account achievements use the backend id field without promoting import trust', async () => {
  const { mapServerAchievements } = await load('/src/lib/useServerProgress.ts')
  assert.deepEqual(mapServerAchievements([
    { id: 'first-steps', verified: false, awarded_at: '2026-09-30T00:00:00Z' },
  ]), [{ id: 'first-steps', verified: false, awardedAt: '2026-09-30T00:00:00Z' }])
  assert.deepEqual(mapServerAchievements(null), [])
})

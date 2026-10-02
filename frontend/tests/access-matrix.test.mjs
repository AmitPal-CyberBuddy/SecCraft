import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const frontendRoot = fileURLToPath(new URL('../', import.meta.url))

/**
 * Product-state regression.
 *
 * The access matrix in `src/lib/access.ts` decides what SecCraft *renders*; the API is the
 * authorization boundary. The model: the catalogue is public, lessons / labs / assessments are for
 * approved accounts, and content maturity (Preview / Published / Coming soon, in
 * `src/lib/contentMaturity.ts`) is a separate idea from access. This test guards:
 *
 *   1. Every state sees the catalogue; only approved accounts and owners are shown learning content.
 *   2. Rejected and suspended states are never shown learning content and never lose the catalogue.
 *   3. Access and maturity stay separate vocabularies, and no UI copy presents Preview/Full as an
 *      access level or calls lesson content open or public.
 *   4. Practice figures are never labelled as records.
 *   5. Certificates are issued to nobody, because nothing on the server awards verified XP yet.
 */
const vite = await createServer({
  configFile: `${frontendRoot}/vite.config.ts`,
  root: frontendRoot,
  mode: 'test',
  appType: 'custom',
  logLevel: 'silent',
  server: { middlewareMode: true },
})

const load = path => vite.ssrLoadModule(path)

// One parent test with subtests. A root-level `after` hook used to call process.exit(0) before the
// last test ran, so the last test in this file silently never executed and could not fail CI.
test('access model', async t => {
  const failures = []
  const check = (name, fn) => t.test(name, async () => {
    try { await fn() } catch (error) { failures.push(error); throw error }
  })

  await check('user-state derivation, access and the access matrix hold for every state', async () => {
    const { deriveUserState, allows, ACCESS_MATRIX, STATE_META, standingFor, accessLabel, CATALOGUE_NOTE, ACCOUNT_ADDS_NOTE, CERTIFICATE_DISABLED_NOTE } =
      await load('/src/lib/access.ts')
    const { maturityOfPath, maturityOfModule, MATURITY_META } = await load('/src/lib/contentMaturity.ts')

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

    /* --- the catalogue is public; learning content is for approved accounts - */

    for (const state of ALL_STATES) {
      assert.equal(allows(state, 'catalogue'), true, `${state} must always see the catalogue`)
    }
    for (const state of ['active', 'owner']) {
      assert.equal(allows(state, 'learning-content'), true, `${state} must be shown learning content`)
    }
    for (const state of ['public', 'guest', 'pending', 'rejected', 'suspended']) {
      assert.equal(allows(state, 'learning-content'), false, `${state} must not be shown learning content`)
    }
    assert.equal(accessLabel('guest'), 'Catalogue access')
    assert.equal(accessLabel('pending'), 'Catalogue access')
    assert.equal(accessLabel('rejected'), 'Catalogue access')
    assert.equal(accessLabel('suspended'), 'Catalogue access')
    assert.equal(accessLabel('active'), 'Approved learning')
    assert.equal(accessLabel('owner'), 'Approved learning')

    /* --- content maturity is a separate vocabulary ----------------------- */

    assert.deepEqual(Object.values(MATURITY_META).map(meta => meta.label), ['Preview', 'Published', 'Coming soon'])
    const paths = (await load('/src/content/learning-paths.json')).default
    const pathMaturity = {}
    for (const path of paths) pathMaturity[maturityOfPath(path)] = (pathMaturity[maturityOfPath(path)] ?? 0) + 1
    assert.deepEqual(pathMaturity, { published: 2, 'coming-soon': 6 }, 'two available paths; six planned ones are Coming soon')

    const modules = (await load('/src/content/modules.json')).default
    assert.deepEqual(
      modules.filter(m => maturityOfModule(m) === 'preview').map(m => m.id),
      ['07-wep-legacy'],
      'today only the one module marked brief is Preview maturity; set `maturity` explicitly to change that',
    )
    assert.equal(modules.filter(m => maturityOfModule(m) === 'published').length, modules.length - 1)
    assert.equal(maturityOfModule({ maturity: 'preview', content_status: 'authored' }), 'preview', 'an explicit maturity wins')
    assert.equal(maturityOfModule({ maturity: 'nonsense', content_status: 'brief' }), 'preview', 'an unknown value is ignored')
    assert.equal(maturityOfPath({ maturity: 'preview', status: 'planned' }), 'preview')
    assert.equal(maturityOfPath({}), 'coming-soon', 'a path of unknown status must never be presented as published')
    assert.equal(maturityOfPath({ status: 'planned' }), 'coming-soon')

    // The access-tier module is gone for good: Preview and Full are not access levels.
    await assert.rejects(() => load('/src/lib/contentAccess.ts'), 'the access-tier module must not come back')

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

    /* --- vocabulary: no copy may call lessons public or claim secrecy ------ */

    // Lesson text is enforced server-side, but quizzes, answer keys and practice artifacts are not yet
    // behind that boundary, so copy must not claim the content is secret, locked or encrypted.
    const bannedAccessWording = [/Preview Curriculum/i, /Full Curriculum/i, /open to everyone/i, /no account required/i, /readable here/i, /public on this site/i, /preview lessons/i]
    const bannedSecrecyClaims = [/securely locked/i, /protected content/i, /cannot be accessed/i, /encrypted/i, /secure vault/i]
    const copy = [CATALOGUE_NOTE, ACCOUNT_ADDS_NOTE, ...ALL_STATES.flatMap(state => [STATE_META[state].label, STATE_META[state].summary, STATE_META[state].nextAction])]
    for (const text of copy) {
      for (const banned of [...bannedAccessWording, ...bannedSecrecyClaims]) {
        assert.doesNotMatch(text, banned, `copy must not match ${banned}: "${text.slice(0, 60)}…"`)
      }
    }
    assert.match(CATALOGUE_NOTE, /catalogue is public/i)
    assert.match(CATALOGUE_NOTE, /approved accounts/i)
    assert.match(STATE_META.pending.summary, /awaiting approval/i)
    assert.match(STATE_META.pending.nextAction, /explore the SecCraft catalogue/i)
  })

  await check('no UI source presents Preview or Full as an access level or calls lesson content public', async () => {
    const { readdirSync, readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
      entry.isDirectory() ? walk(join(dir, entry.name)) : /\.(tsx?|css)$/.test(entry.name) ? [join(dir, entry.name)] : [])
    const banned = [/Preview Curriculum/i, /Full Curriculum/i, /open to everyone/i, /no account required/i, /readable here/i, /public on this site/i, /preview lessons/i, /explore the preview/i, /try the preview/i, /start the preview/i, /preview learning/i]
    const offenders = []
    for (const file of walk(join(frontendRoot, 'src'))) {
      const text = readFileSync(file, 'utf8')
      for (const pattern of banned) if (pattern.test(text)) offenders.push(`${file.replace(frontendRoot, '')}: ${pattern}`)
    }
    assert.deepEqual(offenders, [], 'access wording from the retired Preview/Full model must not return')
  })


  await check('account achievements use the backend id field without promoting import trust', async () => {
    const { mapServerAchievements } = await load('/src/lib/useServerProgress.ts')
    assert.deepEqual(mapServerAchievements([
      { id: 'first-steps', verified: false, awarded_at: '2026-09-30T00:00:00Z' },
    ]), [{ id: 'first-steps', verified: false, awardedAt: '2026-09-30T00:00:00Z' }])
    assert.deepEqual(mapServerAchievements(null), [])
  })

  await vite.close()
  // Vite leaves timers behind, so the process would not exit on its own. Exit after the last
  // subtest, with an explicit code, so a failing assertion fails the run.
  setTimeout(() => process.exit(failures.length === 0 ? 0 : 1), 40)
})

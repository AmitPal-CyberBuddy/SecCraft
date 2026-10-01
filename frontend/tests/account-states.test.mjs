import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const frontendRoot = fileURLToPath(new URL('../', import.meta.url))

/**
 * Account-state rendering regression.
 *
 * Renders the real Shell and AdminShell against a stubbed account service, once per product state,
 * and asserts the three things the product promises:
 *
 *   1. Every learning destination survives in every state — registration is never coerced.
 *   2. The state-specific banner and account copy actually appear for that state.
 *   3. Owner content is never rendered to a non-owner (a rendering guard, not an authorization
 *      control — the API rejects non-owner calls independently).
 *
 * Also covers the guest-with-no-backend case, which is the resilience requirement.
 */
test('every account state renders the right surfaces and never drops the learner app', async t => {
  const testEnv = new Map([
    ['VITE_API_BASE', ''],
    ['VITE_SUPABASE_URL', 'https://auth-test.invalid'],
    ['VITE_SUPABASE_ANON_KEY', 'unit-test-public-anon-key'],
  ])
  const savedEnv = new Map([...testEnv.keys()].map(key => [key, process.env[key]]))
  for (const [key, value] of testEnv) process.env[key] = value

  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
    // `pretendToBeVisual` starts a requestAnimationFrame loop that never yields, which would keep
    // the test process alive after the assertions finish.
    pretendToBeVisual: false,
  })

  const KEYS = [
    'HTMLElement', 'HTMLInputElement', 'HTMLAnchorElement', 'HTMLButtonElement', 'SVGElement',
    'Element', 'Node', 'NodeFilter', 'Text', 'Comment', 'DocumentFragment', 'Event', 'CustomEvent',
    'KeyboardEvent', 'MouseEvent', 'PointerEvent', 'FocusEvent', 'MutationObserver', 'DOMParser',
    'CSS', 'document', 'window', 'navigator', 'getComputedStyle', 'requestAnimationFrame',
    'cancelAnimationFrame', 'localStorage', 'location', 'history',
  ]
  for (const key of KEYS) {
    const value = dom.window[key]
    if (value === undefined) continue
    try {
      Object.defineProperty(globalThis, key, { value, writable: true, configurable: true })
    } catch { /* some globals are locked down by the runtime */ }
  }
  const mediaQueryStub = () => ({
    matches: false, media: '', onchange: null,
    addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
    dispatchEvent() { return false },
  })
  globalThis.matchMedia = mediaQueryStub
  try { Object.defineProperty(dom.window, 'matchMedia', { value: mediaQueryStub, writable: true, configurable: true }) } catch { /* ignore */ }
  globalThis.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} }
  globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} }
  globalThis.innerWidth = 1440
  globalThis.scrollTo = () => {}
  globalThis.IS_REACT_ACT_ENVIRONMENT = true

  let accountResponse = { status: 200, body: null }
  let backendDown = false
  let accountHandler = null
  const savedFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    if (backendDown) throw new Error('backend unavailable')
    const target = String(url)
    const json = (body, status) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
    if (target.includes('/api/v1/account')) {
      if (accountHandler) return accountHandler(init)
      return accountResponse.status === 200 ? json(accountResponse.body, 200) : json(accountResponse.body, accountResponse.status)
    }
    if (target.includes('/api/v1/progress')) return json({ records: [], xp: { total: 0, verified: true }, achievements: [] }, 200)
    if (target.includes('/api/v1/public-config')) return json({ auth_configured: true, signup_enabled: true }, 200)
    if (target.includes('/api/v1/admin/')) return json({ detail: 'Owner access required.' }, 403)
    return new Response('[]', { status: 200 })
  }

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
    globalThis.fetch = savedFetch
    dom.window.close()
    for (const [key, value] of savedEnv) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  const React = await import('react')
  const { act } = React
  const { createRoot } = await import('react-dom/client')
  const { MemoryRouter } = await import('react-router-dom')
  const { ThemeProvider } = await vite.ssrLoadModule('/src/components/theme/ThemeProvider.tsx')
  const { LocalProfileProvider } = await vite.ssrLoadModule('/src/components/profile/LocalProfile.tsx')
  const { SessionProvider, useSession } = await vite.ssrLoadModule('/src/lib/session.tsx')
  const { Shell } = await vite.ssrLoadModule('/src/components/layout/Shell.tsx')
  const { AdminShell } = await vite.ssrLoadModule('/src/components/layout/AdminShell.tsx')
  const { Dashboard } = await vite.ssrLoadModule('/src/pages/Dashboard.tsx')
  const { PublicHome } = await vite.ssrLoadModule('/src/pages/PublicHome.tsx')
  const { Profile } = await vite.ssrLoadModule('/src/pages/Profile.tsx')
  const { Sync } = await vite.ssrLoadModule('/src/pages/Sync.tsx')
  const { Settings } = await vite.ssrLoadModule('/src/pages/Settings.tsx')
  const { AdminPage } = await vite.ssrLoadModule('/src/pages/Admin.tsx')
  const { AccountStatusPage, SignupPage, UpdatePasswordPage } = await vite.ssrLoadModule('/src/pages/Account.tsx')
  const { ReportEditor } = await vite.ssrLoadModule('/src/components/report/ReportEditor.tsx')
  const { passwordGuidance, generatePassword } = await vite.ssrLoadModule('/src/lib/passwordGuidance.ts')
  const { supabase } = await vite.ssrLoadModule('/src/lib/supabase.ts')

  let fakeSession = null
  let authListener = null
  if (supabase) {
    supabase.auth.getSession = async () => ({ data: { session: fakeSession }, error: null })
    supabase.auth.onAuthStateChange = callback => { authListener = callback; return { data: { subscription: { unsubscribe() {} } } } }
    supabase.auth.signOut = async () => { fakeSession = null; return { error: null } }
  }

  // The Supabase client and the Vite SSR pipeline both leave timers behind, so the process would
  // never exit on its own. Subtest failures are counted here and the exit code is set explicitly.
  const failures = []
  // Supabase/Vite leave timers alive; exit after the *last* subtest, not in an early after-hook.

  const container = document.getElementById('root')
  const wrap = child =>
    React.createElement(ThemeProvider, null, React.createElement(LocalProfileProvider, null, React.createElement(SessionProvider, null, child)))

  async function render(node) {
    const root = createRoot(container)
    await act(async () => { root.render(node) })
    for (let i = 0; i < 3; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 20)) })
    const text = container.textContent || ''
    await act(async () => { root.unmount() })
    return text
  }

  // Destinations every state keeps. The Preview Curriculum and the practice surfaces are never
  // taken away — approval adds the record, it does not revoke the reading.
  const learnerNav = ['Learning Paths', 'Modules', 'Labs', 'Challenges', 'Analytics', 'Settings', 'Progress sync']
  // Which tier each state is shown, and whether the "continue with an approved account" upsell
  // should be offered. A non-approved state may legitimately *name* the Full Curriculum in the
  // upsell copy — what it must never do is be presented as already having it.
  const APPROVED = new Set(['active', 'owner'])
  const tierByState = Object.fromEntries(
    ['guest', 'unverified', 'pending', 'active', 'rejected', 'suspended', 'owner'].map(label => [
      label,
      {
        tier: APPROVED.has(label) ? 'Full Curriculum' : 'Preview Curriculum',
        upsell: !APPROVED.has(label),
      },
    ]),
  )

  const scenarios = [
    { label: 'guest', session: null, response: { status: 401, body: { detail: 'Bearer access token required.' } }, expect: ['Preview learner', 'Request an account'] },
    { label: 'unverified', session: { access_token: 't' }, response: { status: 403, body: { detail: { code: 'email_not_verified', message: 'Verify your email before continuing.' } } }, expect: ['Confirm your email address', 'Keep learning'] },
    { label: 'pending', session: { access_token: 't' }, response: { status: 200, body: { user_id: 'u1', email: 'p@example.com', account_status: 'pending', is_admin: false } }, expect: ['Approval pending', 'Keep learning', 'Sign out'] },
    { label: 'active', session: { access_token: 't' }, response: { status: 200, body: { user_id: 'u2', email: 'a@example.com', account_status: 'active', is_admin: false } }, expect: ['Account snapshot', 'Approved account', 'Practice XP (this browser)'] },
    { label: 'rejected', session: { access_token: 't' }, response: { status: 200, body: { user_id: 'u3', email: 'r@example.com', account_status: 'rejected', is_admin: false } }, expect: ['Not approved', 'Continue in the Preview Curriculum'] },
    { label: 'suspended', session: { access_token: 't' }, response: { status: 200, body: { user_id: 'u4', email: 's@example.com', account_status: 'suspended', is_admin: false } }, expect: ['Suspended', 'Continue in the Preview Curriculum'] },
    { label: 'owner', session: { access_token: 't' }, response: { status: 200, body: { user_id: 'o1', email: 'o@example.com', account_status: 'active', is_admin: true } }, expect: ['Open owner console', 'Owner console', 'Practice XP (this browser)'] },
  ]

  for (const scenario of scenarios) {
    await t.test(`${scenario.label} state`, { concurrency: false }, async () => {
     try {
      backendDown = false
      fakeSession = scenario.session
      accountResponse = scenario.response

      const shellText = await render(
        wrap(
          React.createElement(
            MemoryRouter,
            { initialEntries: ['/app?path=wireless-pentesting'] },
            React.createElement(
              Shell,
              null,
              React.createElement(Dashboard),
              React.createElement('hr'),
              React.createElement(Profile),
              React.createElement('hr'),
              React.createElement(Sync),
              React.createElement('hr'),
              React.createElement(Settings),
            ),
          ),
        ),
      )

      assert.ok(shellText.includes(APPROVED.has(scenario.label) ? 'Your learning workspace' : 'Explore the preview'), `${scenario.label}: workspace presentation must reflect the actual tier`)
      assert.ok(shellText.includes(APPROVED.has(scenario.label) ? 'View account records' : 'Practice stays in this browser'), `${scenario.label}: header must explain record provenance`)

      for (const destination of learnerNav) {
        assert.ok(shellText.includes(destination), `${scenario.label}: learner navigation lost "${destination}"`)
      }

      const publicText = await render(
        wrap(React.createElement(MemoryRouter, { initialEntries: ['/'] }, React.createElement(PublicHome))),
      )
      assert.ok(publicText.includes('Preview Curriculum'), `${scenario.label}: public site must describe guest preview access`)
      assert.ok(publicText.includes('Once your account is approved'), `${scenario.label}: public site must describe approval honestly`)
      assert.ok(publicText.includes('not independently verified'), `${scenario.label}: public site must label imported/practice data`)
      assert.ok(!publicText.includes('Certificate issued'), `${scenario.label}: no issuance claim`)

      // The curriculum tier shown must match the product model for this state.
      const tier = tierByState[scenario.label]
      assert.ok(
        shellText.includes(tier.tier),
        `${scenario.label}: should be shown the "${tier.tier}"`,
      )
      if (tier.upsell) {
        assert.ok(
          /Request an account|Log in|account record/.test(shellText),
          `${scenario.label}: a non-approved state must be offered a route to an approved account`,
        )
      } else {
        assert.ok(
          !/Request an account/.test(shellText),
          `${scenario.label}: an approved account must not be sold an account`,
        )
      }

      // A non-approved state must never be shown the dashboard as if it held the Full Curriculum.
      if (!tier.upsell) {
        assert.ok(shellText.includes('Full Curriculum'), `${scenario.label}: should see the full-curriculum framing`)
      }

      // Local XP is local in EVERY state, including approved. An account adds a record beside it;
      // it does not turn the browser figure into one. This previously regressed for approved
      // users, who saw a bare "0 XP" with no marker at all.
      assert.ok(
        shellText.includes('Practice — unverified'),
        `${scenario.label}: local XP must be labelled as practice, even when approved`,
      )
      assert.ok(
        !/Practice XP \(this browser\)Server/.test(shellText),
        `${scenario.label}: practice and record figures must not be conflated`,
      )

      // Certificates are issued to nobody.
      assert.ok(
        !/Certificate (issued|earned|awarded)/i.test(shellText),
        `${scenario.label}: no certificate claim may appear`,
      )

      const adminText = await render(
        wrap(React.createElement(MemoryRouter, { initialEntries: ['/admin'] }, React.createElement(AdminShell, null, React.createElement(AdminPage)))),
      )
      const combined = `${shellText} ${adminText}`
      for (const fragment of scenario.expect) {
        assert.ok(combined.includes(fragment), `${scenario.label}: expected "${fragment}" to be shown`)
      }
     } catch (error) {
      failures.push(error)
      throw error
     }
    })
  }

  await t.test('a backend outage never breaks guest learning', async () => {
   try {
    backendDown = true
    fakeSession = null
    const text = await render(
      wrap(React.createElement(MemoryRouter, { initialEntries: ['/app?path=wireless-pentesting'] }, React.createElement(Shell, null, React.createElement(Dashboard)))),
    )
    for (const destination of learnerNav) {
      assert.ok(text.includes(destination), `outage: learner navigation lost "${destination}"`)
    }
    assert.ok(text.includes('What should I do next') || text.includes('Next step for you'), 'outage: the dashboard should still recommend a next step')
    assert.ok(text.includes('Preview Curriculum'), 'outage: the preview tier must still be stated')
    assert.ok(text.includes('Practice — unverified'), 'outage: practice figures must still be labelled')
    backendDown = false
   } catch (error) {
    failures.push(error)
    throw error
   }
  })
  await t.test('login ignores an older in-flight lookup and shows loading until fresh owner status arrives', async () => {
    try {
      backendDown = false
      const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
      let resolveOld, resolveNew
      const oldResponse = new Promise(resolve => { resolveOld = resolve })
      const newResponse = new Promise(resolve => { resolveNew = resolve })
      const requests = []
      accountHandler = init => {
        const token = new Headers(init?.headers).get('authorization')
        requests.push(token)
        if (token === 'Bearer old-session') return oldResponse
        if (token === 'Bearer new-session') return newResponse
        throw new Error(`Unexpected account request identity: ${token}`)
      }
      fakeSession = { access_token: 'old-session' }
      let manualRetry
      function Probe() {
        manualRetry = useSession().refreshAccount
        return null
      }
      const root = createRoot(container)
      act(() => {
        root.render(wrap(React.createElement(MemoryRouter, { initialEntries: ['/account'] },
          React.createElement(React.Fragment, null,
            React.createElement(AccountStatusPage),
            React.createElement(AdminShell, null, React.createElement('span', null, 'Owner console visible')),
            React.createElement(Probe),
          ),
        )))
      })
      for (let i = 0; i < 3; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) })
      assert.deepEqual(requests, ['Bearer old-session'], 'the mount lookup has started')

      // Supabase signs in while the old request is unresolved. Normal login must launch a new
      // lookup; the explicit refresh performed by LoginPage joins that fresh request.
      fakeSession = { access_token: 'new-session' }
      act(() => { authListener('SIGNED_IN', fakeSession) })
      const retry = manualRetry()
      await act(async () => { await Promise.resolve() })
      assert.deepEqual(requests, ['Bearer old-session', 'Bearer new-session'])
      assert.match(container.textContent, /Checking account status/i)
      assert.doesNotMatch(container.textContent, /Approval pending|Owner console visible/)

      resolveOld(json({ account_status: 'pending', is_admin: false }))
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) })
      assert.match(container.textContent, /Checking account status/i, 'stale pending response must not win')
      assert.doesNotMatch(container.textContent, /Approval pending/)

      resolveNew(json({ user_id: 'owner-1', email: 'owner@example.com', account_status: 'active', is_admin: true }))
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)) })
      await retry
      assert.match(container.textContent, /Owner access/)
      assert.match(container.textContent, /Owner console visible/)
      assert.match(container.textContent, /Re-check status/, 'manual retry remains available')
      assert.doesNotMatch(container.textContent, /Approval pending/)
      await act(async () => { root.unmount() })
      accountHandler = null
    } catch (error) {
      failures.push(error)
      throw error
    }
  })

  await t.test('a failed account lookup never masquerades as approval pending', async () => {
    try {
      fakeSession = { access_token: 't' }
      accountResponse = { status: 503, body: { detail: 'Temporarily unavailable' } }
      const text = await render(wrap(React.createElement(MemoryRouter, { initialEntries: ['/account'] }, React.createElement(AccountStatusPage))))
      assert.match(text, /Account status unavailable/)
      assert.match(text, /Re-check status/)
      assert.doesNotMatch(text, /Approval pending/)
      const workspace = await render(wrap(React.createElement(MemoryRouter, { initialEntries: ['/app?path=wireless-pentesting'] },
        React.createElement(Shell, null, React.createElement(Dashboard)))))
      assert.match(workspace, /Signed in · account status unavailable/)
      assert.match(workspace, /Status unavailable/)
      assert.doesNotMatch(workspace, /Approval pending/)
    } catch (error) {
      failures.push(error)
      throw error
    }
  })

  await t.test('account API failure preserves confirmed identity without inventing approval', async () => {
    try {
      backendDown = false
      fakeSession = { access_token: 'confirmed-session' }
      accountHandler = () => { throw new Error('temporary network failure') }
      let snapshot
      function Probe() {
        snapshot = useSession()
        return React.createElement('span', null, snapshot.hasSession ? 'Signed in' : 'Guest')
      }
      const text = await render(wrap(React.createElement(MemoryRouter, { initialEntries: ['/account'] },
        React.createElement(React.Fragment, null, React.createElement(Probe), React.createElement(AccountStatusPage)))))
      assert.match(text, /Signed in/)
      assert.match(text, /Account status unavailable/)
      assert.doesNotMatch(text, /Approval pending/)
      assert.equal(snapshot.account, null, 'failed lookups cannot retain owner or active authority')
      accountHandler = null
    } catch (error) {
      failures.push(error)
      throw error
    }
  })

  await t.test('non-owner admin gate never mounts page or requests owner endpoints', async () => {
    try {
      fakeSession = { access_token: 'ordinary-session' }
      accountResponse = { status: 200, body: { user_id: 'learner', email: 'learner@example.com', account_status: 'active', is_admin: false } }
      let adminRequests = 0
      // Count network calls from the real AdminPage, not just a synthetic child.
      const previousFetch = globalThis.fetch
      globalThis.fetch = (url, init) => {
        if (String(url).includes('/api/v1/admin/')) adminRequests++
        return previousFetch(url, init)
      }
      try {
        const text = await render(wrap(React.createElement(MemoryRouter, { initialEntries: ['/admin'] },
          React.createElement(AdminShell, null, React.createElement(AdminPage)))))
        assert.match(text, /Owner access required/)
        assert.equal(adminRequests, 0)
      } finally {
        globalThis.fetch = previousFetch
      }
    } catch (error) {
      failures.push(error)
      throw error
    }
  })

  await t.test('signup explains estimated strength and generates unique passwords with required character groups', async () => {
    try {
      backendDown = false
      accountHandler = null
      const text = await render(wrap(React.createElement(MemoryRouter, { initialEntries: ['/signup'] }, React.createElement(SignupPage))))
      assert.match(text, /Password strength: Not entered/)
      assert.match(text, /Suggest a strong password/)
      assert.match(text, /Strength is an estimate, not a breach check/)
      assert.equal(passwordGuidance('abc').strength, 'Weak')
      assert.equal(passwordGuidance('Longer7!word').strength, 'Moderate')
      for (const predictable of ['Password123!Password123!', 'Qwerty123!Qwerty123!', '12345678901234567890', 'a'.repeat(32), 'correct horse battery staple']) {
        assert.equal(passwordGuidance(predictable).strength, 'Weak', predictable)
      }
      assert.equal(passwordGuidance('river lantern copper orbit').strength, 'Strong', 'unrelated words do not need arbitrary uppercase/symbol rules')
      assert.equal(passwordGuidance('x'.repeat(129)).validLength, false)
      assert.equal(passwordGuidance('雪山'.repeat(15)).strength, 'Weak')
      assert.ok(passwordGuidance('avani@example.com', ['avani@example.com']).score < passwordGuidance('avani@example.com').score)

      const passwords = new Set(Array.from({ length: 25 }, () => generatePassword()))
      assert.equal(passwords.size, 25, 'fresh secure randomness on each suggestion')
      for (const password of passwords) {
        assert.equal(password.length, 20)
        assert.match(password, /[A-Z]/)
        assert.match(password, /[a-z]/)
        assert.match(password, /[0-9]/)
        assert.match(password, /[^A-Za-z0-9\s]/)
        assert.equal(passwordGuidance(password).strength, 'Strong')
      }
      const root = createRoot(container)
      await act(async () => { root.render(wrap(React.createElement(MemoryRouter, { initialEntries: ['/signup'] }, React.createElement(SignupPage)))) })
      const suggest = [...container.querySelectorAll('button')].find(button => button.textContent.includes('Suggest a strong password'))
      await act(async () => { suggest.click() })
      const generatedInput = container.querySelector('input[autocomplete="new-password"]')
      assert.equal(generatedInput.value.length, 20)
      assert.equal(generatedInput.type, 'text', 'generated password is visible so it can be saved')
      assert.match(container.textContent, /Password strength: Strong/)
      await act(async () => { root.unmount() })
    } catch (error) {
      failures.push(error)
      throw error
    }
  })

  await t.test('recovery shows matching guidance and a generated password', async () => {
    try {
      const root = createRoot(container)
      await act(async () => { root.render(wrap(React.createElement(MemoryRouter, { initialEntries: ['/update-password'] }, React.createElement(UpdatePasswordPage)))) })
      const suggest = [...container.querySelectorAll('button')].find(button => button.textContent.includes('Suggest a strong password'))
      assert.ok(suggest)
      await act(async () => { suggest.click() })
      assert.match(container.textContent, /Password strength: Strong/)
      assert.equal(container.querySelector('input[autocomplete="new-password"]').type, 'text')
      await act(async () => { root.unmount() })
    } catch (error) { failures.push(error); throw error }
  })

  await t.test('finding draft warns on unsaved navigation and confirms local save', async () => {
    const oldConfirm = window.confirm
    try {
      localStorage.removeItem('platform-report-draft')
      const root = createRoot(container)
      await act(async () => { root.render(React.createElement('div', null, React.createElement(ReportEditor), React.createElement('a', { href: '/paths' }, 'Leave editor'))) })
      const title = container.querySelector('input[placeholder^="Finding title"]')
      assert.ok(title)
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        setter.call(title, 'Scoped finding')
        title.dispatchEvent(new window.Event('input', { bubbles: true }))
      })
      assert.match(container.textContent, /Unsaved changes in this browser/)
      window.confirm = () => false
      const leave = container.querySelector('a[href="/paths"]')
      const click = new window.MouseEvent('click', { bubbles: true, cancelable: true })
      await act(async () => { leave.dispatchEvent(click) })
      assert.equal(click.defaultPrevented, true)
      const save = [...container.querySelectorAll('button')].find(button => button.textContent.trim() === 'Save')
      await act(async () => { save.click() })
      assert.match(container.textContent, /Draft saved in this browser only/)
      assert.equal(JSON.parse(localStorage.getItem('platform-report-draft')).title, 'Scoped finding')
      await act(async () => { root.unmount() })
      localStorage.removeItem('platform-report-draft')
    } catch (error) { failures.push(error); throw error }
    finally { window.confirm = oldConfirm }
  })

  setTimeout(() => process.exit(failures.length === 0 ? 0 : 1), 40)
})

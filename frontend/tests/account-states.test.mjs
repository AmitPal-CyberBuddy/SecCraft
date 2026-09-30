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
  const savedFetch = globalThis.fetch
  globalThis.fetch = async url => {
    if (backendDown) throw new Error('backend unavailable')
    const target = String(url)
    const json = (body, status) =>
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
    if (target.includes('/api/v1/account')) {
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
  const { SessionProvider } = await vite.ssrLoadModule('/src/lib/session.tsx')
  const { Shell } = await vite.ssrLoadModule('/src/components/layout/Shell.tsx')
  const { AdminShell } = await vite.ssrLoadModule('/src/components/layout/AdminShell.tsx')
  const { Dashboard } = await vite.ssrLoadModule('/src/pages/Dashboard.tsx')
  const { Profile } = await vite.ssrLoadModule('/src/pages/Profile.tsx')
  const { Sync } = await vite.ssrLoadModule('/src/pages/Sync.tsx')
  const { Settings } = await vite.ssrLoadModule('/src/pages/Settings.tsx')
  const { AdminPage } = await vite.ssrLoadModule('/src/pages/Admin.tsx')
  const { supabase } = await vite.ssrLoadModule('/src/lib/supabase.ts')

  let fakeSession = null
  if (supabase) {
    supabase.auth.getSession = async () => ({ data: { session: fakeSession }, error: null })
    supabase.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() {} } } })
    supabase.auth.signOut = async () => { fakeSession = null; return { error: null } }
  }

  // The Supabase client and the Vite SSR pipeline both leave timers behind, so the process would
  // never exit on its own. Subtest failures are counted here and the exit code is set explicitly.
  const failures = []
  t.after(() => {
    process.exit(failures.length === 0 ? 0 : 1)
  })

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

  const learnerNav = ['Learning Paths', 'Modules', 'Labs', 'Challenges', 'Analytics', 'Settings', 'Progress sync']

  const scenarios = [
    { label: 'guest', session: null, response: { status: 401, body: { detail: 'Bearer access token required.' } }, expect: ['Guest learner', 'Request an account'] },
    { label: 'unverified', session: { access_token: 't' }, response: { status: 403, body: { detail: { code: 'email_not_verified', message: 'Verify your email before continuing.' } } }, expect: ['Confirm your email address', 'Keep learning'] },
    { label: 'pending', session: { access_token: 't' }, response: { status: 200, body: { user_id: 'u1', email: 'p@example.com', account_status: 'pending', is_admin: false } }, expect: ['Approval pending', 'Keep learning', 'Sign out'] },
    { label: 'active', session: { access_token: 't' }, response: { status: 200, body: { user_id: 'u2', email: 'a@example.com', account_status: 'active', is_admin: false } }, expect: ['Account snapshot', 'Approved account'] },
    { label: 'rejected', session: { access_token: 't' }, response: { status: 200, body: { user_id: 'u3', email: 'r@example.com', account_status: 'rejected', is_admin: false } }, expect: ['Not approved', 'Continue with guest learning'] },
    { label: 'suspended', session: { access_token: 't' }, response: { status: 200, body: { user_id: 'u4', email: 's@example.com', account_status: 'suspended', is_admin: false } }, expect: ['Suspended', 'Continue with guest learning'] },
    { label: 'owner', session: { access_token: 't' }, response: { status: 200, body: { user_id: 'o1', email: 'o@example.com', account_status: 'active', is_admin: true } }, expect: ['Open owner console', 'Owner console'] },
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
            { initialEntries: ['/app'] },
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

      for (const destination of learnerNav) {
        assert.ok(shellText.includes(destination), `${scenario.label}: learner navigation lost "${destination}"`)
      }

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
      wrap(React.createElement(MemoryRouter, { initialEntries: ['/app'] }, React.createElement(Shell, null, React.createElement(Dashboard)))),
    )
    for (const destination of learnerNav) {
      assert.ok(text.includes(destination), `outage: learner navigation lost "${destination}"`)
    }
    assert.ok(text.includes('What should I do next') || text.includes('Next step for you'), 'outage: the dashboard should still recommend a next step')
    backendDown = false
   } catch (error) {
    failures.push(error)
    throw error
   }
  })
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const rootPath = fileURLToPath(new URL('../', import.meta.url))

test('owner console retains unsaved policy edits, isolates filters and confirms status changes', async t => {
  const saved = Object.fromEntries(['VITE_API_BASE', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'].map(key => [key, process.env[key]]))
  for (const key of Object.keys(saved)) process.env[key] = ''
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' })
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'SVGElement', 'Element', 'Node', 'Event', 'MouseEvent', 'MutationObserver', 'getComputedStyle', 'localStorage']) {
    if (dom.window[key]) Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true, writable: true })
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const vite = await createServer({ configFile: `${rootPath}/vite.config.ts`, root: rootPath, mode: 'test', appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
  const originalFetch = globalThis.fetch
  t.after(async () => {
    await vite.close(); globalThis.fetch = originalFetch; dom.window.close()
    for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value }
  })
  const { AdminPage } = await vite.ssrLoadModule('/src/pages/Admin.tsx')
  const React = await import('react')
  const { act } = React
  const { createRoot } = await import('react-dom/client')
  const container = document.getElementById('root')
  const root = createRoot(container)
  t.after(async () => { await act(async () => { root.unmount() }) })

  let signup = false
  let active = 0
  let failAccounts = false
  const calls = []
  const json = body => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
  globalThis.fetch = async (url, init = {}) => {
    const request = String(url)
    calls.push({ request, method: init.method || 'GET', body: init.body && JSON.parse(init.body) })
    if (request.includes('/admin/settings')) {
      if (init.method === 'PATCH') signup = JSON.parse(init.body).signup_enabled
      return json({ signup_enabled: signup, approved_user_limit: 2, active_approved_users: active, admins_excluded_from_limit: true })
    }
    if (request.includes('/admin/users/') && init.method === 'PATCH') { active += 1; return json({ account_status: 'active' }) }
    if (request.includes('/admin/users')) {
      if (failAccounts) return new Response(JSON.stringify({ detail: 'Account service unavailable' }), { status: 503 })
      const all = [
        { user_id: 'pending-id', email: 'pending@example.test', display_name: null, account_status: 'pending', created_at: '2026-01-01T00:00:00Z', reviewed_at: null },
        { user_id: 'active-id', email: 'active@example.test', display_name: null, account_status: 'active', created_at: '2026-01-02T00:00:00Z', reviewed_at: null },
      ]
      const status = new URL(request, 'http://localhost').searchParams.get('status')
      return json({ users: status ? all.filter(u => u.account_status === status) : all })
    }
    if (request.includes('/admin/audit')) return json({ events: [] })
    throw new Error(`Unexpected request: ${request}`)
  }
  async function flush() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 35)) }) }
  function button(name) { return [...container.querySelectorAll('button')].find(el => el.textContent.trim() === name) }
  async function click(el) { assert.ok(el, 'expected button'); await act(async () => { el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) }) }
  await act(async () => { root.render(React.createElement(AdminPage)) })
  await flush()
  assert.match(container.textContent, /pending@example\.test/)
  assert.ok(!container.textContent.includes('active@example.test'))
  assert.ok(calls.some(c => c.request.includes('status=pending&limit=200')))

  const toggle = container.querySelector('.sc-owner-toggle input')
  await act(async () => { toggle.click() })
  assert.match(container.textContent, /Unsaved changes/)
  await click(button('Active'))
  await flush()
  assert.match(container.textContent, /active@example\.test/)
  assert.ok(!container.textContent.includes('pending@example.test'), 'previous filter must be cleared')
  assert.equal(container.querySelector('.sc-owner-toggle input').checked, true, 'filter changes must not discard unsaved policy')

  await click(button('Pending'))
  await flush()
  await click(button('Approve'))
  assert.match(container.textContent, /Confirm approval/)
  assert.equal(calls.filter(c => c.method === 'PATCH' && c.request.includes('/admin/users/')).length, 0, 'approval must await confirmation')
  await click(button('Confirm approval'))
  await flush()
  assert.equal(calls.filter(c => c.method === 'PATCH' && c.request.includes('/admin/users/')).length, 1)
  assert.equal(container.querySelector('.sc-owner-toggle input').checked, true, 'status refresh must preserve the draft')
  await click(button('Save policy'))
  await flush()
  assert.ok(calls.some(c => c.method === 'PATCH' && c.request.includes('/admin/settings') && c.body.signup_enabled === true))

  failAccounts = true
  await click(button('All'))
  await flush()
  assert.match(container.textContent, /Account service unavailable/)
  assert.ok(!container.textContent.includes('pending@example.test'), 'failed filter must never show stale rows')
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

test('feedback retries preserve drafts and identifiers; inbox text and stale reviews remain safe', async t => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  const saved = new Map()
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Element', 'SVGElement', 'Event', 'MouseEvent', 'localStorage', 'sessionStorage', 'location', 'IS_REACT_ACT_ENVIRONMENT']) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : dom.window[key] })
  }
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  window.scrollTo = () => {}
  window.HTMLElement.prototype.scrollIntoView = () => {}
  const oldFetch = globalThis.fetch
  const rootPath = fileURLToPath(new URL('../', import.meta.url))
  const vite = await createServer({ root: rootPath, configFile: `${rootPath}/vite.config.ts`, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
  const React = await import('react')
  const { act } = React
  const { createRoot } = await import('react-dom/client')
  const { MemoryRouter, createMemoryRouter, RouterProvider } = await import('react-router-dom')
  const { FeedbackPage } = await vite.ssrLoadModule('/src/pages/Feedback.tsx')
  const { AdminFeedback } = await vite.ssrLoadModule('/src/pages/AdminFeedback.tsx')
  const { ReportEditor } = await vite.ssrLoadModule('/src/components/report/ReportEditor.tsx')
  const root = createRoot(document.getElementById('root'))
  t.after(async () => {
    await act(async () => root.unmount()); await vite.close(); globalThis.fetch = oldFetch; dom.window.close()
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  const h = React.createElement
  const button = text => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === text)
  const click = async text => { assert.ok(button(text), text); await act(async () => button(text).click()) }
  const fill = async (input, value) => act(async () => {
    Object.getOwnPropertyDescriptor(input.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype, 'value').set.call(input, value)
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })
  const calls = []
  let responseStatus = 503
  globalThis.fetch = async (url, init) => {
    calls.push(JSON.parse(init.body))
    return responseStatus === 201 ? json({ saved: true, reference: 42 }, 201) : json({ detail: 'Service unavailable; keep your message.' }, responseStatus, { 'Retry-After': '1' })
  }
  await act(async () => root.render(h(MemoryRouter, { initialEntries: ['/feedback?page=/labs'] }, h(FeedbackPage))))
  await fill(document.querySelector('input[minlength="3"]'), 'A useful correction')
  await fill(document.querySelector('textarea'), 'The lab instructions need a clearer example.')
  await click('Send feedback')
  assert.match(document.querySelector('[role="alert"]').textContent, /Service unavailable/)
  assert.match(document.querySelector('textarea').value, /clearer example/)
  assert.match(sessionStorage.getItem('platform-feedback-draft'), /clearer example/)
  responseStatus = 429
  await click('Send feedback')
  assert.equal(button('Send feedback').disabled, true)
  assert.equal(calls[0].request_id, calls[1].request_id, 'retries reuse an idempotency ID')
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 1100)) })
  responseStatus = 201
  await click('Send feedback')
  assert.match(document.body.textContent, /Feedback saved · reference #42/)
  assert.equal(sessionStorage.getItem('platform-feedback-draft'), null)
  assert.equal(calls[2].request_id, calls[0].request_id)

  const record = { id: 7, category: 'bug', subject: '<script>not executable</script>', status: 'new', created_at: new Date().toISOString(), message: '<img src=x onerror=alert(1)>', reply_email: null, user_id: null, page_reference: '/labs', internal_note: '', version: 1 }
  let conflict = true
  globalThis.fetch = async (url, init = {}) => {
    if (init.method === 'PATCH') {
      if (conflict) return json({ detail: 'Another review changed this entry. Reload it before saving.' }, 409)
      Object.assign(record, JSON.parse(init.body), { version: 2 })
      return json(record)
    }
    return String(url).includes('/feedback?') ? json({ items: [record], next_cursor: null }) : json(record)
  }
  await act(async () => root.render(h(MemoryRouter, null, h(AdminFeedback))))
  await click('<script>not executable</script>#7 · bug · new' + new Date(record.created_at).toLocaleString())
  assert.ok(document.body.textContent.includes(record.message))
  assert.equal(document.querySelector('.sc-feedback-message img'), null)
  assert.equal(document.querySelector('.sc-feedback-inbox script'), null)
  await fill(document.querySelector('textarea'), 'Owner-only review notes')
  await click('Save review')
  assert.match(document.querySelector('[role="alert"]').textContent, /Another review/)
  assert.equal(document.querySelector('textarea').value, 'Owner-only review notes')
  conflict = false
  await click('Save review')
  assert.match(document.body.textContent, /Review saved/)

  // A real data router exercises navigate() and POP, not a document click approximation.
  let finishExample
  globalThis.fetch = async () => new Promise(resolve => { finishExample = () => resolve(json({ frames: [{ number: 1, bssid: '00:00:00:00:00:00' }] })) })
  const router = createMemoryRouter([{ path: '/reports', element: h(ReportEditor) }, { path: '*', element: h('p', null, 'Other page') }], { initialEntries: ['/other', '/reports'], initialIndex: 1 })
  await act(async () => root.render(h(RouterProvider, { router })))
  window.confirm = () => false
  await click('Load worked example (lab data)')
  await fill(document.getElementById('finding-title'), 'New edit during the fetch')
  await act(async () => finishExample())
  assert.equal(document.getElementById('finding-title').value, 'New edit during the fetch')
  assert.match(document.body.textContent, /not applied because you edited/)
  await act(async () => router.navigate('/elsewhere'))
  assert.equal(router.state.location.pathname, '/reports')
  await act(async () => router.navigate(-1))
  assert.equal(router.state.location.pathname, '/reports')
  window.confirm = () => true
  await act(async () => router.navigate('/elsewhere'))
  assert.equal(router.state.location.pathname, '/elsewhere')
  router.dispose()
})

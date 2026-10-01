import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

test('shared controls preserve selection, labels, feedback semantics and motion preference', async t => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  const saved = new Map()
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Event', 'MouseEvent', 'IS_REACT_ACT_ENVIRONMENT']) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : dom.window[key] })
  }
  const rootPath = fileURLToPath(new URL('../', import.meta.url))
  const vite = await createServer({ root: rootPath, configFile: `${rootPath}/vite.config.ts`, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
  const React = await import('react')
  const { act } = React
  const { createRoot } = await import('react-dom/client')
  const { ViewSwitcher, TextField, Notice } = await vite.ssrLoadModule('/src/components/common/Controls.tsx')
  const { EmptyState, Panel } = await vite.ssrLoadModule('/src/components/common/Workspace.tsx')
  const { scrollBehavior } = await vite.ssrLoadModule('/src/lib/motion.ts')
  const root = createRoot(document.getElementById('root'))
  t.after(async () => {
    await act(async () => root.unmount())
    await vite.close()
    dom.window.close()
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  const h = React.createElement
  function Views() {
    const [value, setValue] = React.useState('editor')
    return h(ViewSwitcher, { label: 'Reporting tools', value, onChange: setValue, options: [
      { id: 'editor', label: 'Report editor', count: 0 }, { id: 'vault', label: 'Evidence vault' },
    ] })
  }
  await act(async () => root.render(h(Views)))
  assert.equal(document.querySelector('[role="group"]').getAttribute('aria-label'), 'Reporting tools')
  let buttons = [...document.querySelectorAll('button')]
  assert.equal(buttons[0].getAttribute('aria-pressed'), 'true')
  assert.equal(buttons[0].type, 'button')
  assert.match(buttons[0].textContent, /0/)
  await act(async () => buttons[1].click())
  buttons = [...document.querySelectorAll('button')]
  assert.equal(buttons[1].getAttribute('aria-pressed'), 'true')
  assert.equal(buttons[0].getAttribute('aria-pressed'), 'false')
  assert.equal(buttons[1].textContent, 'Evidence vault')

  await act(async () => root.render(h(TextField, { label: 'Search commands', hint: 'Try RADIUS', error: 'Use a shorter query', 'aria-describedby': 'extra', type: 'search' })))
  const input = document.querySelector('input')
  assert.equal(document.querySelector('label').htmlFor, input.id)
  assert.equal(input.getAttribute('aria-invalid'), 'true')
  const descriptions = input.getAttribute('aria-describedby').split(' ')
  assert.equal(descriptions[0], 'extra')
  assert.equal(document.getElementById(descriptions[1]).textContent, 'Try RADIUS')
  assert.equal(document.getElementById(descriptions[2]).getAttribute('role'), 'alert')
  await act(async () => root.render(h(TextField, { label: 'Search commands', disabled: true })))
  assert.equal(document.querySelector('input').disabled, true)
  assert.equal(document.querySelector('input').hasAttribute('aria-invalid'), false)
  assert.equal(document.querySelector('[role="alert"]'), null)

  for (const [props, role] of [[{}, 'note'], [{ live: true, kind: 'success' }, 'status'], [{ live: true, kind: 'error' }, 'alert']]) {
    await act(async () => root.render(h(Notice, { ...props, title: 'Record status' }, 'Your local record is unchanged.')))
    assert.ok(document.querySelector(`[role="${role}"]`))
  }
  await act(async () => root.render(h(Panel, { title: 'Results', surface: true }, h(EmptyState, { title: 'No results', action: h('button', {}, 'Clear filters') }))))
  assert.equal(document.querySelector('h2').textContent, 'Results')
  assert.ok(document.querySelector('.ws-panel-surface'))
  assert.equal(document.querySelector('.ws-empty-action button').textContent, 'Clear filters')
  window.matchMedia = () => ({ matches: true })
  assert.equal(scrollBehavior(), 'instant')
  window.matchMedia = () => ({ matches: false })
  assert.equal(scrollBehavior(), 'smooth')
  document.documentElement.classList.add('reduce-motion')
  assert.equal(scrollBehavior(), 'instant')
  document.documentElement.classList.remove('reduce-motion')
})

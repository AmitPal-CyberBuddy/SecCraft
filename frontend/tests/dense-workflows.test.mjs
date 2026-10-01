import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

test('dense workflows keep data intact and provide actionable feedback', async t => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' })
  const saved = new Map()
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'Element', 'SVGElement', 'Event', 'MouseEvent', 'localStorage', 'location', 'IS_REACT_ACT_ENVIRONMENT']) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key))
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : dom.window[key] })
  }
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
  window.HTMLElement.prototype.scrollIntoView = () => {}
  const oldFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: init?.body })
    if (String(url).includes('/api/pcaps/')) return new Response(readFileSync(new URL('../public/lab-data/beacon-only.json', import.meta.url), 'utf8'), { status: 200 })
    const payload = String(url).endsWith('/preview') ? {
      incoming_records: 1, unique_records: 1, would_insert: 1, would_upgrade_unverified_progress: 0,
      verified_server_records_preserved: 2, unchanged: 0, imported_records_are_verified: false,
    } : { inserted: 1, upgraded_unverified_progress: 0, verified_server_records_preserved: 2, xp_awarded: 0 }
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const rootPath = fileURLToPath(new URL('../', import.meta.url))
  const vite = await createServer({ root: rootPath, configFile: `${rootPath}/vite.config.ts`, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
  const React = await import('react')
  const { act } = React
  const { createRoot } = await import('react-dom/client')
  const { MemoryRouter } = await import('react-router-dom')
  const { MotionConfig } = await import('framer-motion')
  const { CopyButton } = await vite.ssrLoadModule('/src/components/common/TechnicalContent.tsx')
  const { Reports } = await vite.ssrLoadModule('/src/pages/Reports.tsx')
  const { ProgressSyncPanel } = await vite.ssrLoadModule('/src/components/progress/ProgressSyncPanel.tsx')
  const { PcapUploader } = await vite.ssrLoadModule('/src/components/lab/PcapUploader.tsx')
  const { PcapInspector } = await vite.ssrLoadModule('/src/components/lab/PcapInspector.tsx')
  const { TerminalEmulator } = await vite.ssrLoadModule('/src/components/terminal/TerminalEmulator.tsx')
  const { EvidenceVault } = await vite.ssrLoadModule('/src/components/evidence/EvidenceVault.tsx')
  const root = createRoot(document.getElementById('root'))
  t.after(async () => {
    await act(async () => root.unmount())
    await vite.close()
    globalThis.fetch = oldFetch
    dom.window.close()
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor)
      else delete globalThis[key]
    }
  })
  const h = React.createElement
  const render = async component => { await act(async () => root.render(h(MemoryRouter, null, h(MotionConfig, { reducedMotion: 'always', transition: { duration: 0 } }, h(component))))) }
  const button = text => [...document.querySelectorAll('button')].find(item => item.textContent.trim() === text)
  const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 120)) })
  let copied = ''
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { copied = text } } })
  await act(async () => root.render(h(CopyButton, { text: 'tshark -r capture.pcapng', label: 'Copy command' })))
  await act(async () => button('Copy command').click())
  assert.equal(copied, 'tshark -r capture.pcapng')
  assert.match(document.querySelector('[role="status"]').textContent, /Copied/)
  navigator.clipboard.writeText = async () => { throw new Error('Denied') }
  await act(async () => button('Copy command').click())
  assert.match(document.body.textContent, /copy it manually/)

  await render(Reports)
  const title = document.getElementById('finding-title')
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(title, 'My unsaved finding')
    title.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await act(async () => button('Preview').click())
  await settle()
  assert.match(document.querySelector('.ws-report-preview').textContent, /My unsaved finding/)
  await act(async () => button('Edit').click())
  await settle()
  assert.equal(document.getElementById('finding-title').value, 'My unsaved finding')
  await act(async () => button('CVSS').click())
  await settle()
  assert.equal(document.querySelector('.ws-report-editor').closest('[hidden]').hidden, true)
  await act(async () => button('Report editor').click())
  assert.equal(document.getElementById('finding-title').value, 'My unsaved finding')
  await act(async () => button('Save').click())
  assert.equal(JSON.parse(localStorage.getItem('platform-report-draft')).title, 'My unsaved finding')

  await render(ProgressSyncPanel)
  const records = [{ path_id: 'wireless-pentesting', module_id: '01-intro-wireless', activity_type: 'lesson', activity_id: 'first', content_version: 'v1', state: 'completed' }]
  const picker = document.querySelector('input[type="file"]')
  await act(async () => {
    Object.defineProperty(picker, 'files', { configurable: true, value: [{ name: 'practice.json', size: 512, text: async () => JSON.stringify({ records }) }] })
    picker.dispatchEvent(new window.Event('change', { bubbles: true }))
  })
  assert.match(document.body.textContent, /practice.json/)
  await act(async () => button('Preview merge').click())
  assert.ok(button('Review confirmation'))
  assert.equal(calls.filter(call => call.url.endsWith('/import')).length, 0)
  await act(async () => button('Review confirmation').click())
  assert.ok(document.querySelector('[aria-label="Confirm progress transfer"]'))
  await act(async () => button('Cancel').click())
  assert.equal(calls.filter(call => call.url.endsWith('/import')).length, 0)
  await act(async () => button('Review confirmation').click())
  await act(async () => button('Confirm merge').click())
  const merges = calls.filter(call => call.url.endsWith('/import'))
  assert.equal(merges.length, 1)
  assert.deepEqual(JSON.parse(merges[0].body).records, records)
  assert.match(document.body.textContent, /no XP was awarded/)
  assert.match(document.body.textContent, /Last successful transfer in this session/)

  await render(PcapUploader)
  let fileInput = document.querySelector('input[type="file"]')
  const choose = async files => act(async () => {
    Object.defineProperty(fileInput, 'files', { configurable: true, value: files })
    fileInput.dispatchEvent(new window.Event('change', { bubbles: true }))
  })
  await choose([{ name: 'not-a-capture.txt', size: 12 }])
  assert.match(document.querySelector('[role="alert"]').textContent, /non-empty .pcap/)
  await choose([{ name: 'huge.pcap', size: 51 * 1024 * 1024 }])
  assert.match(document.querySelector('[role="alert"]').textContent, /50 MB/)
  await choose([{ name: 'unreadable.pcap', size: 12, arrayBuffer: async () => { throw new Error('Unreadable') } }])
  assert.match(document.body.textContent, /Could not read this file/)
  const same = () => ({ name: 'same.pcap', size: 4, arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer })
  await choose([same(), same()])
  await settle()
  assert.equal(document.querySelectorAll('button[aria-label="Remove same.pcap"]').length, 2)
  await act(async () => document.querySelector('button[aria-label="Remove same.pcap"]').click())
  await settle()
  assert.equal(document.querySelectorAll('button[aria-label="Remove same.pcap"]').length, 1)

  let selectedFrame
  await render(() => h(PcapInspector, { pcapId: 'beacon-only', onFrameSelect: frame => { selectedFrame = frame } }))
  await settle()
  assert.ok(document.querySelector('.ws-pcap-table [role="region"][tabindex="0"]'))
  const frameButton = document.querySelector('button[aria-label^="Inspect frame"]')
  assert.ok(frameButton)
  await act(async () => frameButton.click())
  assert.ok(selectedFrame.number)
  assert.equal(frameButton.getAttribute('aria-pressed'), 'true')
  assert.ok(document.querySelector('.ws-pcap-cards details summary'))
  assert.ok(document.querySelector('.ws-pcap-cards dd'))

  await render(TerminalEmulator)
  assert.ok(document.querySelector('input[aria-label="Simulated command"][spellcheck="false"]'))
  assert.ok(document.querySelector('[aria-label="Simulated command transcript"][tabindex="0"]'))
  assert.match(document.body.textContent, /no commands execute on your device/)

  localStorage.setItem('platform-evidence-vault', JSON.stringify([{ id: 'existing', label: 'Saved capture', kind: 'capture', claim: 'Original claim', filter: '', frames: '1', sha256: '', bytes: 1, createdAt: '2026-09-30' }]))
  await render(EvidenceVault)
  assert.match(document.body.textContent, /Saved capture/)
  assert.equal(JSON.parse(localStorage.getItem('platform-evidence-vault')).length, 1)
  const label = [...document.querySelectorAll('label')].find(item => item.textContent === 'Artifact label (required)')
  assert.ok(document.getElementById(label.htmlFor))

  await t.test('packet filters keep controls mounted and discard late responses, even when fetch ignores abort', async () => {
    const pending = []
    globalThis.fetch = (url, init) => new Promise(resolve => pending.push({ url: String(url), signal: init?.signal, resolve }))
    const bundled = JSON.parse(readFileSync(new URL('../public/lab-data/beacon-only.json', import.meta.url), 'utf8'))
    await render(() => h(PcapInspector, { pcapId: 'beacon-only' }))
    await settle()
    const reply = async (index, frames, status = 200) => act(async () => {
      pending[index].resolve(new Response(JSON.stringify({ ...bundled, frames }), { status }))
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    await reply(0, bundled.frames)
    const input = document.querySelector('input[aria-label="Packet display filter"]')
    await act(async () => button('EAPOL').click())
    await settle()
    assert.equal(input.isConnected, true)
    assert.match(document.querySelector('.sc-technical-status').textContent, /Previous results remain visible/)
    assert.equal(document.querySelector('.ws-pcap-table').getAttribute('aria-busy'), 'true')
    await act(async () => button('Beacons').click())
    await settle()
    assert.equal(pending[1].signal.aborted, true)
    await reply(2, bundled.frames.slice(0, 1))
    await reply(1, bundled.frames)
    assert.equal(document.querySelectorAll('.ws-pcap-table tbody tr').length, 1)
    assert.equal(button('Beacons').getAttribute('aria-pressed'), 'true')
    assert.equal(button('EAPOL').getAttribute('aria-pressed'), 'false')
    // Both API and bundled lookup fail: retain the known result, clearly labelled.
    await act(async () => button('EAPOL').click())
    await settle()
    await reply(3, [], 503)
    await settle()
    assert.match(pending[4].url, /lab-data/)
    await reply(4, [], 404)
    assert.equal(document.querySelectorAll('.ws-pcap-table tbody tr').length, 1)
    assert.match(document.querySelector('[role="alert"]').textContent, /Previous results are unchanged/)
    assert.equal(input.isConnected, true)
  })

})

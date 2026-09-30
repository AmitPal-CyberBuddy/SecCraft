import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

const tour = readFileSync(new URL('../src/components/tour/GuidedTour.tsx', import.meta.url), 'utf8')
const topbar = readFileSync(new URL('../src/components/layout/Topbar.tsx', import.meta.url), 'utf8')
const dashboard = readFileSync(new URL('../src/pages/Dashboard.tsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

test('tour points at visible workspace controls rather than retired sidebar or dashboard widgets', () => {
  for (const [selector, source] of [
    ['.sc-experience-row', topbar],
    ['#mobile-navigation-toggle', topbar],
    ['.ws-focus', dashboard],
    ['[data-tour="search"]', topbar],
    ['.sc-avatar-trigger', topbar],
  ]) {
    assert.ok(tour.includes(selector), `missing tour step for ${selector}`)
    assert.ok(source.includes(selector.replace(/^[.#]/, '').replace('[data-tour="search"]', 'data-tour="search"')), `${selector} has no live target`)
  }
  assert.ok(tour.includes("pathname === '/app'"), 'dashboard-only steps must be conditional')
  assert.ok(app.includes("location.pathname !== '/admin'"), 'owner console must not show a learner tour')
  assert.ok(!/data-tour="(sidebar|dashboard-stats|daily|reports)"/.test(tour), 'retired anchors must not return')
  assert.ok(tour.includes('Practice is saved in this browser and is unverified'))
})


test('legacy path redirects to the wireless path instead of mixing phases across paths', async () => {
  const { readFileSync } = await import('node:fs')
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')
  assert.match(app, /path="\/legacy\/path" element=\{<Navigate to="\/paths\/wireless-pentesting" replace \/>\}/)
})

test('finding editor labels identify their associated controls', async () => {
  const { readFileSync } = await import('node:fs')
  const source = readFileSync(new URL('../src/components/report/ReportEditor.tsx', import.meta.url), 'utf8')
  for (const name of ['title', 'severity', 'description', 'technical-details', 'affected-component', 'evidence', 'impact', 'recommendation', 'references', 'retest']) {
    assert.match(source, new RegExp(`htmlFor="finding-${name}"`))
    assert.match(source, new RegExp(`<(input|select|textarea) id="finding-${name}"`))
  }
})

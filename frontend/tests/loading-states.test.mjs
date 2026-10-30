import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')

test('loading placeholders are structural, accessible, and deliberately still', () => {
  const skeleton = read('components/common/Skeleton.tsx')
  assert.match(skeleton, /role="status"/)
  assert.match(skeleton, /aria-live="polite"/)
  assert.match(skeleton, /sr-only/, 'the status region must carry an announced label')
  assert.match(skeleton, /aria-hidden="true"/, 'placeholder bars are decorative')
  assert.doesNotMatch(skeleton, /framer-motion|animate-pulse|transition-all|motion\./)

  const css = read('styles/skeleton.css')
  assert.doesNotMatch(css, /animation:|transition:|@keyframes/, 'a placeholder marks where content arrives; the arrival itself is the feedback')

  const app = read('App.tsx')
  assert.match(app, /SkeletonPage label="Loading the owner console…"/)
  assert.match(app, /SkeletonPage label="Loading…"/)
  assert.match(read('main.tsx'), /import '\.\/styles\/skeleton\.css'/)

  const dashboard = read('pages/Dashboard.tsx')
  assert.match(dashboard, /SkeletonRow label="Reading account record…"/, 'the account snapshot loading state keeps its honest label for assistive tech')
  assert.match(dashboard, /ResultTransition identity=\{nextAction\.to\} className="ws-focus-main"/, 'the next-step panel acknowledges a changed recommendation with the sanctioned settle')
})

test('progress fills and the scroll-top control move on shared tokens with instant quiet modes', () => {
  const workspace = read('styles/workspace.css')
  assert.match(workspace, /\.ws-progress > span \{ transition:width var\(--motion-selection\) var\(--motion-ease\); \}/)
  assert.match(workspace, /\.sc-nav-track span \{ transition:width var\(--motion-selection\) var\(--motion-ease\); \}/)
  assert.match(workspace, /@keyframes sc-rise-in \{ from \{ opacity:0; translate:0 var\(--motion-distance-settle\); \}/)
  assert.match(workspace, /\(prefers-reduced-motion:reduce\) \{ \.sc-scroll-top \{ animation:none; \} \}/)
  assert.match(workspace, /:is\(\.reduce-motion,\[data-motion="reduced"\],\[data-motion-paused="true"\]\) \.sc-scroll-top \{ animation:none; \}/)
})

test('empty states carry the product mark, decoratively and without motion', () => {
  const workspace = read('components/common/Workspace.tsx')
  assert.match(workspace, /aria-hidden="true" className="ws-empty-mark"><Shield /, 'the empty-state mark is the brand shield and stays decorative')
  assert.doesNotMatch(workspace, /framer-motion|motion\./, 'the shared workspace vocabulary never animates')
  const css = read('styles/workspace.css')
  assert.match(css, /\.ws-empty-mark \{ display:inline-grid;/)
  assert.doesNotMatch(css, /\.ws-empty-mark[^}]*animation|\.ws-empty-mark[^}]*transition/)
})

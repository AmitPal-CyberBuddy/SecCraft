import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'

const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
const css = read('styles/workspace.css')
const publicCss = read('styles/public-home.css')
const luminance = hex => {
  const rgb = hex.match(/\w\w/g).map(channel => parseInt(channel, 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return rgb.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
}

test('filled actions use a theme-paired foreground with AA normal-text contrast', () => {
  for (const selector of [':root', '.light,[data-theme="light"]']) {
    const block = css.slice(css.indexOf(`${selector} {`)).split('}')[0]
    const ink = block.match(/--action-ink:#([\da-f]{6})/)[1]
    const fill = block.match(/--learning:#([\da-f]{6})/)[1]
    const values = [luminance(ink), luminance(fill)].sort((a, b) => a - b)
    assert.ok((values[1] + .05) / (values[0] + .05) >= 4.5, selector)
  }
  assert.match(css, /\.ws-action \{[^}]*color:var\(--action-ink\)/)
  assert.match(publicCss, /\.public-primary \{[^}]*color:var\(--action-ink\)/)
})

test('the shell owns the sole dashboard account banner', () => {
  assert.equal((read('components/layout/Shell.tsx').match(/<AccountBanner\s*\/>/g) || []).length, 1)
  assert.doesNotMatch(read('pages/Dashboard.tsx'), /<AccountBanner/)
})

test('sticky tools follow measured header height and clean up observation', () => {
  const header = read('components/layout/Topbar.tsx')
  assert.match(header, /new ResizeObserver\(measure\)/)
  assert.match(header, /getBoundingClientRect\(\)\.height/)
  assert.match(header, /observer\?\.disconnect\(\)/)
  assert.match(css, /--sticky-offset:calc\(var\(--header-height\) \+ 16px\)/)
  for (const page of ['Labs', 'Reference', 'ModuleDetail']) {
    assert.doesNotMatch(read(`pages/${page}.tsx`), /sticky top-\[(64|80)px\]/)
  }
  assert.match(css, /@media\(max-height:500px\)/)
})

test('public availability copy comes from the curriculum catalogue', () => {
  const about = read('pages/PublicInfo.tsx')
  assert.match(about, /learningPaths\.filter\(path => path\.status === 'available'\)/)
  assert.doesNotMatch(about, /ships one complete path|Other catalogue entries are listed as planned/)
})

// The real-browser pass caught scroll-only skip targets; they must receive keyboard focus too.
test('public and workspace skip links target focusable main landmarks', () => {
  assert.match(read('components/layout/Shell.tsx'), /<main id="main-content" tabIndex=\{-1\}/)
  assert.match(read('components/public/PublicLayout.tsx'), /<main id="public-main" tabIndex=\{-1\}/)
})

test('graphite/teal text, action states and functional outlines retain contrast in both themes', () => {
  const parse = selector => Object.fromEntries([...css.slice(css.indexOf(`${selector} {`)).split('}')[0].matchAll(/--([\w-]+):\s*(#[\da-f]{3,6}|var\(--[\w-]+\))/g)].map(match => [match[1], match[2]]))
  const dark = parse(':root')
  for (const [mode, tokens] of [['dark', dark], ['light', { ...dark, ...parse('.light,[data-theme="light"]') }]]) {
    const resolve = name => {
      const value = tokens[name]
      assert.ok(value, name)
      if (value.startsWith('var(')) return resolve(value.slice(6, -1))
      const hex = value.slice(1)
      return hex.length === 3 ? [...hex].map(char => char + char).join('') : hex
    }
    const contrast = (a, b, required) => {
      const [low, high] = [luminance(resolve(a)), luminance(resolve(b))].sort((a, b) => a - b)
      const ratio = (high + .05) / (low + .05)
      assert.ok(ratio >= required, `${mode}: ${a}/${b} = ${ratio.toFixed(2)}; expected ${required}`)
    }
    for (const surface of ['app-bg', 'panel-bg', 'panel-raised', 'panel-inset']) {
      for (const ink of ['ink-primary', 'ink-secondary', 'ink-muted', 'link-color']) contrast(ink, surface, 4.5)
      contrast('control-border', surface, 3)
      contrast('focus-color', surface, 3)
      for (const series of ['chart-one','chart-two','chart-three','chart-four']) contrast(series, surface, 3)
    }
    for (const [ink, fill] of [['on-success','success'],['on-warning','attention'],['on-danger','danger'],['on-owner','owner'],['on-info','info']]) contrast(ink, fill, 4.5)
    for (const state of ['action-fill', 'action-hover', 'action-pressed']) contrast('action-ink', state, 4.5)
    for (const [ink, fill] of [['learning', 'accent-bg'], ['success', 'success-bg'], ['attention', 'warning-bg'], ['danger', 'danger-bg'], ['info', 'info-bg'], ['owner', 'owner-bg']]) {
      contrast(ink, fill, 4.5)
      contrast('ink-secondary', fill, 4.5)
      contrast('ink-muted', fill, 4.5)
    }
  }
})

// A source guard prevents a second dark-only palette from reappearing in components.
test('components use semantic color roles, not literal palette utilities', () => {
  const visit = url => {
    for (const entry of readdirSync(url, { withFileTypes: true })) {
      const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), url)
      if (entry.isDirectory()) visit(child)
      else if (/\.tsx?$/.test(entry.name)) {
        const source = readFileSync(child, 'utf8')
        assert.doesNotMatch(source, /(?:text|bg|border|from|via|to|ring|divide|accent|fill|stroke)-(?:\[#[\da-fA-F]+\]|(?:slate|gray|zinc|neutral|cyan|teal|blue|sky|emerald|green|lime|amber|orange|yellow|red|rose|pink|violet|purple|indigo)-\d+|white\b|black\b)/, child.pathname)
        assert.doesNotMatch(source, /(?:text|bg|border)-\[var\(--[\w-]+\)\]\//, `Unresolved alpha utility: ${child.pathname}`)
      }
    }
  }
  visit(new URL('../src/', import.meta.url))
  assert.doesNotMatch(read('index.css'), /!important.*light|overrides for hardcoded|#[\da-fA-F]{3,8}\b/)
})

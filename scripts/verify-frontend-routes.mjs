#!/usr/bin/env node
/** Verify static and template-literal React Router destinations against App.tsx routes. */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const appFile = path.join(root, 'frontend/src/App.tsx')
const sourceRoot = path.join(root, 'frontend/src')
const app = fs.readFileSync(appFile, 'utf8')
const routePaths = [...app.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map(match => match[1])

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : /\.(tsx?|jsx?)$/.test(entry.name) ? [full] : []
  })
}

function routeRegex(route) {
  if (route === '*') return /^\/.*$/
  const escaped = route.split('/').map(segment => {
    if (segment === '*') return '.*'
    if (segment.startsWith(':')) return '[^/]+'
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }).join('/')
  return new RegExp(`^${escaped}/?$`)
}

const matchers = routePaths.map(route => ({ route, regex: routeRegex(route) }))
const destinations = new Map()
const patterns = [
  { kind: 'JSX to', regex: /\bto\s*=\s*\{\s*(["'`])([^"'`]*?)(?:\$\{[^}]*\}[^"'`]*)?\1\s*\}/gs },
  { kind: 'quoted route', regex: /\b(?:to|href)\s*=\s*(["'])(\/[^"']*)\1/g },
  { kind: 'navigation config', regex: /\bto\s*:\s*(["'`])(\/[^"'`]*)\1/g },
  { kind: 'search index', regex: /\bpath\s*:\s*(["'`])(\/[^"'`]*)\1/g },
  { kind: 'navigate', regex: /\bnavigate\(\s*(["'`])(\/[^"'`]*)\1/g },
]

for (const file of walk(sourceRoot)) {
  const source = fs.readFileSync(file, 'utf8')
  for (const { kind, regex } of patterns) {
    regex.lastIndex = 0
    for (const match of source.matchAll(regex)) {
      let raw = match[2]
      if (!raw?.startsWith('/')) continue
      raw = raw.replace(/\$\{[^}]+\}/g, 'route-audit-param')
      const route = raw.split(/[?#]/, 1)[0] || '/'
      const key = `${route} (${kind})`
      if (!destinations.has(key)) destinations.set(key, { route, file: path.relative(root, file), line: source.slice(0, match.index).split('\n').length })
    }
  }
}

const broken = [...destinations.entries()].filter(([, target]) => !matchers.some(matcher => matcher.regex.test(target.route)))
if (broken.length) {
  console.error(`Found ${broken.length} internal destinations with no matching SPA route:`)
  for (const [, target] of broken) console.error(`  ${target.file}:${target.line} → ${target.route}`)
  process.exit(1)
}
console.log(`Verified ${destinations.size} distinct internal route destinations against ${routePaths.length} SPA routes.`)

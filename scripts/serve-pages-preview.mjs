#!/usr/bin/env node
/**
 * WiFiForge — local GitHub Pages emulator.
 *
 * Serves the production build the way GitHub Pages does for a project site:
 * everything under a sub-path (/WiFiForge/), and unknown paths answered with
 * 404.html + HTTP 404 instead of a client-side rewrite. If the app boots here,
 * it boots on Pages.
 *
 * Usage:
 *   cd frontend && npm run build
 *   node ../scripts/serve-pages-preview.mjs [--port 4173] [--base /WiFiForge/]
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'frontend', 'dist')

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback
}

const PORT = Number(arg('port', process.env.PORT || 4173))
const BASE = (() => {
  const b = arg('base', `/${path.basename(ROOT)}/`)
  return b.endsWith('/') ? b : `${b}/`
})()

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pcap': 'application/vnd.tcpdump.pcap',
  '.pcapng': 'application/vnd.tcpdump.pcap',
  '.conf': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

const send = (res, status, file) => {
  res.writeHead(status, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  })
  fs.createReadStream(file).pipe(res)
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error(`✖ No build found at ${DIST}\n  Run: cd frontend && npm ci && npm run build`)
  process.exit(1)
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)

    if (url.pathname === '/' || url.pathname === BASE.slice(0, -1)) {
      res.writeHead(302, { Location: BASE })
      return res.end()
    }
    if (!url.pathname.startsWith(BASE)) {
      return send(res, 404, path.join(DIST, '404.html'))
    }

    const rel = decodeURIComponent(url.pathname.slice(BASE.length)) || 'index.html'
    const file = path.join(DIST, rel)
    if (!file.startsWith(DIST)) {
      return send(res, 403, path.join(DIST, '404.html'))
    }
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      return send(res, 200, file)
    }
    // GitHub Pages behaviour: no SPA rewrite, 404.html answers with a 404 status.
    return send(res, 404, path.join(DIST, '404.html'))
  })
  .listen(PORT, '0.0.0.0', () => {
    console.log(`▸ GitHub Pages emulator — ${DIST} mounted at ${BASE}`)
    console.log(`  http://localhost:${PORT}${BASE}`)
  })

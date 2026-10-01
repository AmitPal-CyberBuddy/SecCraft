// SecCraft Service Worker — offline-first shell, static-host safe (GitHub Pages sub-path).
// Every URL is derived from the registration scope, so the same file works at
// https://<owner>.github.io/<repo>/ and at a domain root.
const VERSION = '__SECCRAFT_BUILD_ID__'
const BASE = new URL(self.registration.scope).pathname
const CACHE_PREFIX = `seccraft-${BASE}-`
const CACHE = `${CACHE_PREFIX}${VERSION}`
const INDEX = new URL('index.html', self.registration.scope).href
const PRECACHE = ['index.html', 'manifest.json', 'favicon.svg'].map(p => new URL(p, self.registration.scope).href)

const OFFLINE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>SecCraft — Offline</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#020617;color:#e2e8f0;
font:16px/1.6 ui-sans-serif,system-ui,sans-serif;text-align:center;padding:2rem}
h1{color:#22d3ee;font-size:1.25rem;margin:0 0 .5rem}p{color:#94a3b8;margin:0}</style></head>
<body><div><h1>Forge mark: offline</h1><p>SecCraft has not cached this page yet. Reconnect once to make it available offline.</p></div></body></html>`

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // Individually, so one missing asset cannot fail the whole install.
      .then(c => Promise.all(PRECACHE.map(url => c.add(url).catch(() => undefined))))
  )
})

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') void self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      // Drop caches from previous deploys so a release does not leave dead weight behind.
      .then(keys => Promise.all(keys.filter(k => (k.startsWith(CACHE_PREFIX) || k === 'seccraft-v2.3.0') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

const cacheMatch = async (request) => (await caches.open(CACHE)).match(request)

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return          // fonts/CDN → straight to network
  if (!url.pathname.startsWith(BASE)) return              // out of this SW's scope

  // API passthrough — never cache, answer with a local-first payload when offline.
  if (url.pathname.startsWith(`${BASE}api/`)) {
    e.respondWith(
      fetch(req).catch(() => new Response(
        JSON.stringify({ error: 'Offline — local-first mode', offline: true }),
        { status: 503, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
      )),
    )
    return
  }

  // Navigations — network-first on the app shell. GitHub Pages answers unknown deep
  // links with its own 404 page, so we always resolve the shell ourselves.
  // Case downloads are files, not SPA routes (also when opened directly while offline).
  const wirelessCaseFile = ['wireless-foundations/', 'wireless-practice/'].some(prefix => url.pathname.startsWith(`${BASE}${prefix}`))
  if (req.mode === 'navigate' && !wirelessCaseFile) {
    e.respondWith((async () => {
      try {
        const res = await fetch(INDEX, { cache: 'no-cache' })
        if (!res.ok) throw new Error(`shell ${res.status}`)
        const cache = await caches.open(CACHE)
        await cache.put(INDEX, res.clone())
        return res
      } catch {
        const cached = await cacheMatch(INDEX)
        return cached || new Response(OFFLINE_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }
    })())
    return
  }

  // Hashed assets are immutable; unhashed public files must be refreshed on deploy.
  const immutable = url.pathname.startsWith(`${BASE}assets/`)
  e.respondWith((async () => {
    const cache = await caches.open(CACHE)
    const cached = await cache.match(req)
    if (immutable && cached) return cached
    try {
      const res = await fetch(req, { cache: 'no-cache' })
      if (res.ok) await cache.put(req, res.clone())
      return res
    } catch {
      return cached || Response.error()
    }
  })())
})

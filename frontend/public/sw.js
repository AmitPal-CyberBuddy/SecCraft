// SecCraft Service Worker — offline-first shell, static-host safe (GitHub Pages sub-path).
// Every URL is derived from the registration scope, so the same file works at
// https://<owner>.github.io/<repo>/ and at a domain root.
const VERSION = 'v2.3.0'
const CACHE = `seccraft-${VERSION}`

const BASE = new URL(self.registration.scope).pathname
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
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      // Drop caches from previous deploys so a release does not leave dead weight behind.
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

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
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(INDEX, { cache: 'no-cache' })
        if (!res.ok) throw new Error(`shell ${res.status}`)
        const cache = await caches.open(CACHE)
        cache.put(INDEX, res.clone())
        return res
      } catch {
        const cached = await caches.match(INDEX)
        return cached || new Response(OFFLINE_PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
      }
    })())
    return
  }

  // Hashed build assets + public files — cache first, then fill the cache.
  e.respondWith(caches.match(req).then(cached => cached || fetch(req).then(res => {
    if (res.ok) {
      const clone = res.clone()
      caches.open(CACHE).then(c => c.put(req, clone))
    }
    return res
  }).catch(() => cached)))
})

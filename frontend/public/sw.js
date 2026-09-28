// WiFiForge Service Worker — Enterprise PWA offline-first zero-cost
const CACHE = 'wififorge-v2.1-enterprise'
const ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  // API passthrough — always network
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ error: 'Offline — local-first mode', offline: true }), { headers: { 'Content-Type': 'application/json' } })))
    return
  }
  // Navigation — cache first then network
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.match('/').then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone()
      caches.open(CACHE).then(c => c.put(e.request, clone))
      return res
    }).catch(() => caches.match('/'))))
    return
  }
  // Assets — cache first
  e.respondWith(caches.match(e.request).then(cached => {
    if (cached) return cached
    return fetch(e.request).then(res => {
      if (res.ok && e.request.method === 'GET') {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
      }
      return res
    }).catch(() => cached)
  }))
})

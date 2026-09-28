# Deploying WiFiForge to GitHub Pages

The academy is a static Vite/React SPA, so it runs on GitHub Pages as-is.
**Live URL:** <https://amitpal-cyberbuddy.github.io/WiFiForge/>

---

## How it works

| Piece | Where | Why |
| --- | --- | --- |
| Build + deploy | [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) | `actions/deploy-pages` publishes `frontend/dist` on every push to `main` |
| Sub-path base | `frontend/vite.config.ts` (`DEFAULT_BASE`, `VITE_BASE`) | Project sites are served from `/<repo>/`, not `/` |
| Deep links | `404.html` emitted by the `wififorge:static-hosting` Vite plugin | GitHub Pages has no SPA rewrite; the shell answers `/WiFiForge/labs` and the router takes over |
| Router | `src/App.tsx` — `<BrowserRouter basename={import.meta.env.BASE_URL}>` | Links stay inside the sub-path |
| Service worker | `public/sw.js` — every URL derived from `self.registration.scope` | Offline shell + precache work at any mount point |
| PWA manifest | `public/manifest.json` — relative `./` URLs | Resolves against the manifest URL, so no hard-coded `/` |
| Local parity check | `scripts/serve-pages-preview.mjs` | Emulates Pages (sub-path + 404.html, no rewrite) before pushing |

## Local preview that behaves like Pages

```bash
cd frontend
npm ci
npm run build
npm run preview:pages        # http://localhost:4173/WiFiForge/
```

Flags: `--port 4173`, `--base /WiFiForge/`. The emulator intentionally returns
`404.html` with a real 404 status for unknown paths, so a working preview means a
working deployment.

Plain `npm run dev` still serves the app at the same base (`/WiFiForge/`) with the
FastAPI proxy for `/api`. Use `VITE_BASE=/ npm run dev` to work at the domain root.

## Enabling Pages (one time)

1. **Settings → Pages → Build and deployment → Source: _GitHub Actions_ → Save.**
   This is the only manual step — the site cannot be created by a token
   (`actions/configure-pages` with `enablement: true` is rejected on this repo with
   *Resource not accessible by integration*, so the workflow assumes Pages already exists).
2. Re-run the **Deploy Frontend to GitHub Pages** workflow (Actions → that run → *Re-run all jobs*).
3. Verify a deep link, e.g. `https://amitpal-cyberbuddy.github.io/WiFiForge/labs`
   (GitHub returns 404 for the path, the page still renders).

After that, every push to `main` redeploys automatically.

## What works on Pages

Everything the SPA ships itself: all 20 modules / 80 lessons (Markdown is bundled at
build time), challenges, reference, gamification, reports + PDF export, terminal,
evidence vault, theme, search — plus offline use after the first visit.

The **FastAPI backend cannot run on Pages.** Anything that needs the API degrades to
its built-in local-first/mock data (`src/lib/api.ts`, `src/pages/Labs.tsx`,
`src/components/lab/PcapInspector.tsx`) rather than erroring, so the UI is fully
navigable. For live PCAP parsing, run the stack locally:

```bash
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev        # proxies /api → :8000
```

## Custom domain

1. Add a `CNAME` file containing the domain to `frontend/public/`.
2. In **Settings → Pages**, set the custom domain.
3. Build with the domain root as the base so the app is not nested:
   `VITE_BASE=/ npm run build` (or set `VITE_BASE` in the workflow env).

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Blank page, 404s for `/assets/*` | Built with the wrong base — set `VITE_BASE=/WiFiForge/` (the workflow does this from the repo name) |
| Deep link shows GitHub's 404 | `404.html` missing from `dist` — it is emitted by the Vite plugin; check the build log |
| Styles/fonts missing | `index.html` still points at root-absolute `/favicon.svg` — the plugin re-points `public/` files at the base |
| Stale content after a deploy | The service worker caches the shell; it is network-first for navigations, so one hard reload is enough. Bump `VERSION` in `public/sw.js` to force a clean cache |
| `/api/*` fails in production | Expected — Pages is static. Use the local stack for API-backed labs |

# Deploying Quench (Legacy WiFiForge) to GitHub Pages — Platform-level

> **Platform Repositioning (2026-09-28):** Platform brand Quench (recommended, pending stakeholder final) — legacy WiFiForge retained as Wireless path sub-brand. GitHub Pages deployment currently remains at `/WiFiForge/` for backward compatibility. See `docs/BRANDING_MIGRATION.md` Stage 5 and `docs/IMPLEMENTATION_PLAN_STAGE3_6.md` for future rename plan.

The academy is a static Vite/React SPA, now platform-level — it runs on GitHub Pages as-is.
**Live URL (current, backward compat):** <https://amitpal-cyberbuddy.github.io/WiFiForge/>
**Future URL (when repo rename decided, e.g., Quench):** <https://amitpal-cyberbuddy.github.io/Quench/> with redirect from old URL (GitHub auto-redirects repo renames)

---

## How it works — Platform-level

| Piece | Where | Why |
| --- | --- | --- |
| Build + deploy | [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) | `actions/deploy-pages` publishes `frontend/dist` on every push to `main` |
| Sub-path base | `frontend/vite.config.ts` (`DEFAULT_BASE`, `VITE_BASE`) | Project sites are served from `/<repo>/`, not `/` — currently `/WiFiForge/` kept for backward compat, future `/Quench/` or `/<new-repo>/` |
| Deep links | `404.html` emitted by the `wififorge:static-hosting` Vite plugin (future `anvil:static-hosting` alias) | GitHub Pages has no SPA rewrite; the shell answers `/WiFiForge/labs` and the router takes over — platform routes /paths, /paths/:pathId, /paths/:pathId/modules/:id |
| Router | `src/App.tsx` — `<BrowserRouter basename={import.meta.env.BASE_URL}>` + explicit redirects `/path` → `/paths/wireless-pentesting` (Stage 6 compatibility) | Links stay inside sub-path, legacy deep links still work via SPA fallback |
| Service worker | `public/sw.js` — every URL derived from `self.registration.scope` | Offline shell + precache work at any mount point |
| PWA manifest | `public/manifest.json` — relative `./` URLs — name Quench — Hands-on Cybersecurity Learning Platform | Resolves against manifest URL, no hard-coded `/` |
| Local parity check | `scripts/serve-pages-preview.mjs` | Emulates Pages (sub-path + 404.html, no rewrite) before pushing |
| Platform config | `frontend/src/content/platform.json` — name Quench, tagline Forge. Break. Fix. Retest., secondary Learn cybersecurity by doing. | Domain-neutral platform metadata |
| Learning paths | `frontend/src/content/learning-paths.json` — 8 paths, 1 available wireless-pentesting (legacy WiFiForge), 7 planned | Path-aware architecture |

## Local preview that behaves like Pages

```bash
cd frontend
npm ci
npm run build
npm run preview:pages        # http://localhost:4173/WiFiForge/ (current base, backward compat)
```

Flags: `--port 4173`, `--base /WiFiForge/`. The emulator intentionally returns
`404.html` with a real 404 status for unknown paths, so a working preview means a
working deployment.

Plain `npm run dev` still serves the app at the same base (`/WiFiForge/`) with the
FastAPI proxy for `/api`. Use `VITE_BASE=/ npm run dev` to work at the domain root.

**Future rename preview:**
```bash
VITE_BASE=/Quench/ npm run build
VITE_BASE=/Quench/ npm run preview:pages   # http://localhost:4173/Quench/
```

## Enabling Pages (one time) — DONE

Pages is enabled on this repo: **Source: _GitHub Actions_**, `build_type: workflow`.
Nothing more to configure there.

> Enabling Pages **publishes nothing by itself.** Until one run of this workflow
> completes successfully, `https://amitpal-cyberbuddy.github.io/WiFiForge/` serves
> GitHub's default *404 — There isn't a GitHub Pages site here.* That is the state
> this repo was in: every deploy attempt ran *before* Pages existed and died with
> `Failed to create deployment (status: 404)`.

The `github-pages` environment is restricted to the **`main`** branch, so a deploy
can only be triggered from `main` — not from a feature branch, and not by
`actions/configure-pages` running as a bot token.

## Publishing / redeploying — Platform

Any one of these runs `pages.yml` on `main` and publishes:

1. **Push (or merge a PR) to `main`** — automatic, this is the normal path.
2. **Actions → _Deploy Frontend to GitHub Pages_ → a run → _Re-run all jobs_** —
   re-publishes the existing `main` without a new commit. Use this to recover from
   the 404 state above.
3. **Actions → _Deploy Frontend to GitHub Pages_ → _Run workflow_ → branch `main`**
   (`workflow_dispatch`).

Then verify deep links:
- Platform: `https://amitpal-cyberbuddy.github.io/WiFiForge/` (dashboard platform overview)
- Learning paths: `https://amitpal-cyberbuddy.github.io/WiFiForge/paths` (list all paths)
- Path detail: `https://amitpal-cyberbuddy.github.io/WiFiForge/paths/wireless-pentesting` (phases)
- Module: `https://amitpal-cyberbuddy.github.io/WiFiForge/paths/wireless-pentesting/modules/02-wifi-fundamentals`
- Labs: `https://amitpal-cyberbuddy.github.io/WiFiForge/labs?path=wireless-pentesting` (path-aware, 16 artifacts)
- Challenges: `https://amitpal-cyberbuddy.github.io/WiFiForge/challenges?path=wireless-pentesting`
- Legacy: `https://amitpal-cyberbuddy.github.io/WiFiForge/path` → redirects to `/paths/wireless-pentesting` (Stage 6 compatibility)
- Legacy: `https://amitpal-cyberbuddy.github.io/WiFiForge/modules/02-wifi-fundamentals` → still works via effectivePathId fallback

The workflow now guards both ends: a **pre-flight** step fails fast with a
plain instruction if Pages is missing or not set to GitHub Actions, and a
post-deploy **Verify the site actually serves** step polls the live URL.

After that, every push to `main` redeploys automatically.

## What works on Pages — Platform

Everything the SPA ships itself: platform overview, 8 learning paths (1 available Wireless Pentesting with 20 modules / 27 authored lessons, 7 planned architecture ready), 16 verified artifacts, 15 challenges (45 tasks), 35 decision scenarios, 42-item checklist, ENG-01 engagement, reference, gamification, reports + PDF export, terminal (operator@anvil prompt, legacy kali@wififorge note), evidence vault (platform-evidence-vault with wififorge-evidence-vault fallback), theme (platform-theme with wififorge-theme fallback), search (generic index of paths, modules, labs, challenges, skills), plus offline use after first visit.

The **FastAPI backend cannot run on Pages.** Anything that needs the API degrades to
its bundled offline datasets (`src/pages/Labs.tsx`,
`src/components/lab/PcapInspector.tsx`) rather than erroring, so the UI is fully
navigable. For live PCAP parsing, run the stack locally:

```bash
cd backend && uvicorn app.main:app --reload --port 8000
cd frontend && npm run dev        # proxies /api → :8000
```

Backend now supports platform-level routes:
- `/api/learning-paths` — 8 paths
- `/api/learning-paths/wireless-pentesting` — path detail
- `/api/platform` — platform metadata Quench
- `/api/modules?path=wireless-pentesting` — path-aware filter + backward compat returning all modules
- `/api/health` — includes platform, legacy, learning_paths counts, message Forge. Break. Fix. Retest. — Learn cybersecurity by doing.

## Custom domain — Platform

1. Add a `CNAME` file containing the domain to `frontend/public/` (e.g., anvil.academy).
2. In **Settings → Pages**, set the custom domain.
3. Build with the domain root as the base so the app is not nested:
   `VITE_BASE=/ npm run build` (or set `VITE_BASE` in the workflow env).
4. Keep old GitHub Pages project site with redirect page to new domain for backward compat.

## Repository Rename — Stage 5 Plan (Pending Stakeholder Decision)

**Current:** `AmitPal-CyberBuddy/WiFiForge` — base `/WiFiForge/`
**Future (example):** `AmitPal-CyberBuddy/Quench` — base `/Quench/` or custom domain

Steps when rename decided:
1. Rename repo in GitHub Settings — GitHub automatically redirects old URL to new (https://github.com/AmitPal-CyberBuddy/WiFiForge → https://github.com/AmitPal-CyberBuddy/Quench)
2. Update `frontend/vite.config.ts` DEFAULT_BASE to `/Quench/` (or `/<new-repo>/`)
3. Update `frontend/src/content/platform.json` links.github
4. Update README.md badges, live demo link, but keep note "Legacy: WiFiForge"
5. Update `frontend/package.json` name (already anvil), description
6. Update `backend/app/core/config.py` env vars — already supports PLATFORM_* with WIFIFORGE_* fallback
7. Update `docker-compose.yml`, `Dockerfile`, `nginx.conf` env var docs
8. Keep old site at `/WiFiForge/` with a simple redirect page to new URL for 6 months (or use GitHub Pages redirect via meta refresh in 404.html)
9. Update docs, OG image, favicon, SEO metadata, manifest.json (already Quench)
10. Verify build, verify-no-dummy-data.py, verify-lab-artifacts.py

Do NOT break existing deployment while changing branding — Stage 1-2 kept VITE_BASE=/WiFiForge/, Stage 5 updates with redirect.

## Troubleshooting — Platform

| Symptom | Cause / fix |
| --- | --- |
| Site shows GitHub's default *404 — There isn't a GitHub Pages site here* | Pages enabled but nothing ever published. Check `gh api repos/AmitPal-CyberBuddy/WiFiForge/pages --jq '.status'` — `null` means never deployed. Trigger run on `main`. |
| Deploy job: `Failed to create deployment (status: 404)` | Run executed before Pages enabled, or Source is *Deploy from a branch* instead of *GitHub Actions*. Enable Pages with Source: GitHub Actions, then re-run. |
| Deploy job: *branch not allowed* / environment rejected | `github-pages` environment only permits `main`. Deploys cannot run from `arena/*` or other feature branches. |
| Blank page, 404s for `/assets/*` | Built with wrong base — set `VITE_BASE=/WiFiForge/` (current) or `/Quench/` (future) — workflow does this from repo name |
| Deep link shows GitHub's 404 | `404.html` missing from `dist` — emitted by Vite plugin; check build log |
| Styles/fonts missing | `index.html` still points at root-absolute `/favicon.svg` — plugin re-points `public/` files at base |
| Stale content after deploy | Service worker caches shell; network-first for navigations, one hard reload enough. Bump `VERSION` in `public/sw.js` |
| `/api/*` fails in production | Expected — Pages static. Use local stack for API-backed labs. New platform routes /api/learning-paths, /api/platform also need local stack |
| Legacy deep link `/path` not working | Should redirect to `/paths/wireless-pentesting` via App.tsx Navigate — check App.tsx routes (Stage 6 compatibility) |
| Search shows only wireless items | Should show generic index of paths, modules, labs, challenges, skills — check GlobalSearch.tsx generic indexing (Stage 3) |
| Labs shows PCAPs count 0 for wireless | Should show 16 for wireless-pentesting, 0 for planned — check Labs.tsx effectivePathId logic and getStatsForPath |

*Forge. Break. Fix. Retest. — Platform Deployment*

# Deploying SecCraft (Legacy WiFiForge) to GitHub Pages — Platform-level

**Canonical repository:** <https://github.com/AmitPal-CyberBuddy/SecCraft>
**Canonical GitHub Pages URL:** <https://amitpal-cyberbuddy.github.io/SecCraft/>

The repository and Pages base are now both `SecCraft`. The Vite default base is `/SecCraft/`, and the Pages workflow derives `VITE_BASE` from the repository name so deployed assets, router links, and deep links share the same path. WiFiForge remains only in intentional legacy compatibility labels and migration history.

---

## How it works — Platform-level

| Piece | Where | Why |
| --- | --- | --- |
| Build + deploy | [`.github/workflows/pages.yml`](../.github/workflows/pages.yml) | `actions/deploy-pages` publishes `frontend/dist` on every push to `main` |
| Sub-path base | `frontend/vite.config.ts` (`DEFAULT_BASE`, `VITE_BASE`) | Local default is `/SecCraft/`; the GitHub Actions build sets `VITE_BASE` from the actual repository name |
| Deep links | `404.html` emitted by Vite's SPA fallback plugin (internal legacy plugin identifier retained) | GitHub Pages has no SPA rewrite; the shell answers `/SecCraft/labs` and the router takes over — platform routes /paths, /paths/:pathId, /paths/:pathId/modules/:id |
| Router | `src/App.tsx` — `<BrowserRouter basename={import.meta.env.BASE_URL}>`; `/` is the public homepage and the guest workspace is `/app` | Public/account routes and guest learning stay inside the Pages sub-path; existing learning deep links still work via SPA fallback |
| Service worker | `public/sw.js` — every URL derived from `self.registration.scope` | Offline shell + precache work at any mount point |
| PWA manifest | `public/manifest.json` — relative `./` URLs — name SecCraft — Hands-on Cybersecurity Learning Platform | Resolves against manifest URL, no hard-coded `/` |
| Local parity check | `scripts/serve-pages-preview.mjs` | Emulates Pages (sub-path + 404.html, no rewrite) before pushing |
| Platform config | `frontend/src/content/platform.json` — name SecCraft, primary line Learn. Practice. Investigate. Improve., supporting line Learn cybersecurity by doing. | Domain-neutral platform metadata |
| Learning paths | `frontend/src/content/learning-paths.json` — 8 paths, 1 available wireless-pentesting (legacy WiFiForge), 7 planned | Path-aware architecture |

## Local preview that behaves like Pages

```bash
cd frontend
npm ci
npm run build
npm run preview:pages        # http://localhost:4173/SecCraft/
```

Flags: `--port 4173`, `--base /SecCraft/`. The emulator intentionally returns
`404.html` with a real 404 status for unknown paths, so a working preview means a
working deployment.

Plain `npm run dev` still serves the app at the same base (`/SecCraft/`) with the
FastAPI proxy for `/api`. Use `VITE_BASE=/ npm run dev` to work at the domain root.

**Build for a root-domain host (for example, a custom domain):**
```bash
VITE_BASE=/ npm run build
```

## Enabling Pages (one time) — DONE

Pages is enabled on this repo: **Source: _GitHub Actions_**, `build_type: workflow`.
Nothing more to configure there.

> Enabling Pages **publishes nothing by itself.** Until one run of this workflow
> completes successfully, `https://amitpal-cyberbuddy.github.io/SecCraft/` serves
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
- Public homepage: `https://amitpal-cyberbuddy.github.io/SecCraft/`; guest workspace: `https://amitpal-cyberbuddy.github.io/SecCraft/app`
- Learning paths: `https://amitpal-cyberbuddy.github.io/SecCraft/paths` (list all paths)
- Path detail: `https://amitpal-cyberbuddy.github.io/SecCraft/paths/wireless-pentesting` (phases)
- Module: `https://amitpal-cyberbuddy.github.io/SecCraft/paths/wireless-pentesting/modules/02-wifi-fundamentals`
- Labs: `https://amitpal-cyberbuddy.github.io/SecCraft/labs?path=wireless-pentesting` (path-aware, 16 artifacts)
- Challenges: `https://amitpal-cyberbuddy.github.io/SecCraft/challenges?path=wireless-pentesting`
- Legacy: `https://amitpal-cyberbuddy.github.io/SecCraft/path` → redirects to `/paths/wireless-pentesting` (Stage 6 compatibility)
- Legacy: `https://amitpal-cyberbuddy.github.io/SecCraft/modules/02-wifi-fundamentals` → still works via effectivePathId fallback

The workflow now guards both ends: a **pre-flight** step fails fast with a
plain instruction if Pages is missing or not set to GitHub Actions, and a
post-deploy **Verify the site actually serves** step polls the live URL.

After that, every push to `main` redeploys automatically.

## What works on Pages — Platform

Everything the SPA ships itself: public homepage, guest workspace, 8 learning paths (1 available Wireless Pentesting with 20 modules / 27 authored lessons, 7 planned), 16 verified artifacts, 15 challenges (45 tasks), 35 decision scenarios, 42-item checklist, ENG-01 engagement, reference, local gamification, reports + PDF export, simulated terminal, evidence vault, theme, generic search, and offline use after first visit. `/` is the public homepage; the existing workspace remains available at `/app` without registration.

The **FastAPI backend and PostgreSQL cannot run on Pages.** Without build-time `VITE_API_BASE`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`, the deployed app is guest-only and account controls stay unavailable. To enable accounts, deploy the API/database elsewhere, set those public frontend values as GitHub Actions repository variables, configure backend CORS and provider settings, then rebuild. Do not put service-role keys or database credentials in Pages variables or frontend builds. See [`ACCOUNT_SYNC_PLATFORM.md`](ACCOUNT_SYNC_PLATFORM.md) for the setup and provider-side signup limitation.

Static lessons and bundled PCAP data work offline without the API. API-backed account synchronization and server PCAP parsing require the external API. In local development, run:

```bash
# Terminal 1
cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# Terminal 2
cd frontend && npm run dev  # Vite proxies same-origin /api to port 8000
```

Read-only content routes include `/api/learning-paths`, `/api/learning-paths/{path_id}`, `/api/platform`, `/api/modules?path=wireless-pentesting`, and `/api/health`. Versioned account routes use `/api/v1/*`; they fail closed when Supabase/database configuration is missing.

## Custom domain — Platform

1. Add a `CNAME` file containing the domain to `frontend/public/` (e.g., `learn.example.org`).
2. In **Settings → Pages**, set the custom domain.
3. Build with the domain root as the base so the app is not nested:
   `VITE_BASE=/ npm run build` (or set `VITE_BASE` in the workflow env).
4. Keep the canonical `/SecCraft/` Pages URL in the README, platform metadata, and deployment links.

## Repository Rename — Applied

The repository is `AmitPal-CyberBuddy/SecCraft`, and the canonical Pages address is `https://amitpal-cyberbuddy.github.io/SecCraft/`. `frontend/vite.config.ts` defaults to `/SecCraft/`; the Pages workflow builds using `/${{ github.event.repository.name }}/` so generated asset URLs and the React Router basename stay aligned. Update that default if the repository is renamed again; no old `/WiFiForge/` base is used for the current build.

## Troubleshooting — Platform

| Symptom | Cause / fix |
| --- | --- |
| Site shows GitHub's default *404 — There isn't a GitHub Pages site here* | Pages enabled but nothing ever published. Check `gh api repos/AmitPal-CyberBuddy/SecCraft/pages --jq '.status'` — `null` means never deployed. Trigger run on `main`. |
| Deploy job: `Failed to create deployment (status: 404)` | Run executed before Pages enabled, or Source is *Deploy from a branch* instead of *GitHub Actions*. Enable Pages with Source: GitHub Actions, then re-run. |
| Deploy job: *branch not allowed* / environment rejected | `github-pages` environment only permits `main`. Deploys cannot run from `arena/*` or other feature branches. |
| Blank page, 404s for `/assets/*` | Built with wrong base — local default is `/SecCraft/`; the workflow derives `VITE_BASE` from the repository name |
| Deep link shows GitHub's 404 | `404.html` missing from `dist` — emitted by Vite plugin; check build log |
| Styles/fonts missing | `index.html` still points at root-absolute `/favicon.svg` — plugin re-points `public/` files at base |
| Stale content after deploy | Service worker caches shell; network-first for navigations, one hard reload enough. Bump `VERSION` in `public/sw.js` |
| `/api/*` fails in production | Expected — Pages static. Use local stack for API-backed labs. New platform routes /api/learning-paths, /api/platform also need local stack |
| Legacy deep link `/path` not working | Should redirect to `/paths/wireless-pentesting` via App.tsx Navigate — check App.tsx routes (Stage 6 compatibility) |
| Search shows only wireless items | Should show generic index of paths, modules, labs, challenges, skills — check GlobalSearch.tsx generic indexing (Stage 3) |
| Labs shows PCAPs count 0 for wireless | Should show 16 for wireless-pentesting, 0 for planned — check Labs.tsx effectivePathId logic and getStatsForPath |

*Learn. Practice. Investigate. Improve. — SecCraft Deployment*

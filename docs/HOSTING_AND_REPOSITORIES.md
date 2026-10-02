# Hosting and repository privacy: GitHub Pages → Render Static Site

*Status: design for owner review · 2 October 2026 · **nothing here is applied.** The decisions were: plan the move of the frontend from GitHub Pages to a Render Static Site, make the application repository private later, and for now do not break the existing deployment, migrate the frontend, or change the existing Render and Supabase configuration. Part of [`ACCESS_AND_LEARNING_MODEL.md`](ACCESS_AND_LEARNING_MODEL.md); the content side is in [`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md).*

```text
Private GitHub repositories
   SecCraft (application)           SecCraft-content (private from day one)
        │                                   │
        ├───────────────┐                   │  importer
        ▼               ▼                   ▼
 Render Static Site   Render Web Service ──► Supabase
   (frontend)           (FastAPI)           ├─ Auth
                                            ├─ PostgreSQL (app data + private `content` schema)
                                            └─ Storage (private buckets)
```

## 1. Rules for the time being

1. **Do not break GitHub Pages.** Pages stays the production frontend until a cutover is approved.
2. **Do not migrate the frontend yet,** and do not change the existing Render or Supabase configuration unnecessarily.
3. **Design so the move is clean:** keep everything host-specific isolated and listed (§4), and keep every absolute URL derived from the base path or the page origin.
4. **Do not commit a `render.yaml` yet.** Render's documentation says that if a Blueprint names an *existing* service, Render "attempts to apply the Blueprint's configuration to that existing service." A `render.yaml` added casually could take over the live API service. The draft in §6 is documentation only and uses a new name.

## 2. Platform facts this plan depends on

Checked against current documentation on 2 October 2026; re-verify at the time of each step.

| Fact | Consequence |
|---|---|
| GitHub Pages is available for **private** repositories only on a paid plan (Pro for a personal account, Team or higher for an organization); on Free it needs a public repository | **The Render move must happen before the repository is made private**, or the Pages site goes down. This repository belongs to a personal account. |
| On Free, private repositories get a monthly allowance of Actions minutes (2,000 Linux minutes); public repositories are unlimited | **Our CI would exhaust it quickly** (§7) |
| On Free, protected branches and required reviews apply to public repositories only | A private repo on Free has no enforced review gate. Fine for a solo author; relevant for CODEOWNERS and production approvals. |
| Render static sites are free, on a global CDN, with atomic deploys that immediately invalidate caches, custom headers, pull-request previews and custom domains (Hobby workspaces include 2); they count against the workspace's monthly bandwidth and pipeline minutes | Suitable for the frontend |
| Render rewrite rules **never override a path that exists as a resource**, then apply the first matching rule top to bottom, otherwise return 404. Rules cannot target the domain root alone (`/*` is valid) | A `/* → /index.html` rewrite gives the SPA fallback with status 200, and prerendered pages (real files) win over it. **A missing hashed asset would also be rewritten to the HTML shell**: test stale-chunk behaviour on staging. |
| Blueprint: a static site is `type: web` with `runtime: static`; it supports `staticPublishPath`, `routes` (redirect or rewrite), `headers`, `rootDir`, `buildFilter`; `previews.generation` controls previews | The static site can be declared as code |
| **Free web services spin down after 15 minutes idle and take about a minute to start**; Render says not to use free instances for production | The client gives API calls an **8-second deadline** (`API_REQUEST_TIMEOUT_MS` in `lib/api.ts`). After an idle period the first learner request would time out. Use a paid compute plan for the API, or add a "waking the service" state with retries. |
| Supabase Free: projects pause after a week of inactivity; **no automatic backups**; no point-in-time recovery | Learner records and evidence must not live on Free. Content is reconstructible from the private repo; attempts and progress are not. |
| Supabase's REST API exposes only `public` (and `graphql_public`, `storage`) unless more schemas are listed; Storage buckets are private by default and files leave them through RLS-checked downloads or signed URLs with an expiry in seconds | Supports the private `content` schema and private buckets |

Sources: GitHub Docs, *About GitHub Pages* and *GitHub Pages limits*; GitHub plan tables; Render Docs, *Static Sites*, *Redirects and rewrites*, *Blueprint YAML reference*, *Deploy for Free*; Supabase *pricing*, *Production checklist*, *Storage buckets* and *createSignedUrl* reference, *Using custom schemas*.

## 3. What does not change when the host changes

Already derived from the base path or the origin, so no code change is needed: the router `basename` (`import.meta.env.BASE_URL`), the web manifest (`./`), the service worker's scope-derived paths, `accountRedirect()` in `lib/supabase.ts`, the CSP `connect-src` (from `VITE_API_BASE` and `VITE_SUPABASE_URL`), and the API origin (`VITE_API_BASE`). Setting `VITE_BASE=/` in the Render build is enough for root hosting.

## 4. Inventory of GitHub-Pages-specific parts

| Item | Where | Today | At the move |
|---|---|---|---|
| Default base `/SecCraft/` | `vite.config.ts` (`DEFAULT_BASE`) | subpath | `VITE_BASE=/` in the Render build environment |
| `404.html` copy and `.nojekyll` | `pagesHostingPlugin` | emitted for subpath builds only | not emitted at root; harmless |
| SPA fallback | Pages answers unknown paths with `404.html` and **HTTP 404** | | Render rewrite `/* → /index.html` (status 200); real files win |
| `robots.txt` with `Disallow: /` | `securityPlugin` | always | replaced by the P5 SEO build |
| `_headers` | `securityPlugin` | emitted (Netlify/Cloudflare format) | Render takes headers from its own configuration; mirror them (§6) and verify on staging |
| Pages preview emulator and CI job | `scripts/serve-pages-preview.mjs`, `preview:pages`, the production-subpath job | subpath plus 404 | add a root-base mode with rewrite fallback before the staging check; keep the subpath mode until cutover |
| Deploy workflow | `.github/workflows/pages.yml` | on push to `main` | keep until the repository goes private (rollback path), then disable |
| `platform.json` links | `liveDemo`, `docs` | Pages URL, GitHub tree | update at cutover; the `docs` link breaks when the repo is private |
| SECURITY.md link in the UI | `SecurityPosture.tsx` | public GitHub URL | replace before the repo goes private (404 for visitors otherwise) |
| README, `docs/GITHUB_PAGES.md` | – | Pages instructions | update |
| CORS | backend `PLATFORM_ALLOWED_ORIGINS` (explicit origins required in production) | Pages origin | **add the new origin before cutover**; remove the old one afterwards |
| Supabase Auth | Site URL and redirect allow-list | Pages origin | **add the new origin before cutover**, including the sign-in, update-password and account paths |

## 5. Consequences of changing origin

* Browser storage, the Supabase session and the service worker are **per origin**: everyone signs in again on the new origin. Local practice progress stays on the old origin (it is removed in P4 anyway, so do the move after P4 or accept the loss).
* A returning visitor's old service worker keeps serving the cached shell from the old origin. After cutover the Pages deploy becomes a **redirect stub** pointing to the new origin; the old worker's network-first navigation fetches the stub and the visitor lands on the new site.
* Canonical URLs and the sitemap (P5) embed the final origin, so **decide the domain before P5**.

## 6. Draft Render Blueprint (documentation only)

```yaml
# DRAFT. Do not add as render.yaml while the live services exist (see §1.4).
services:
  - type: web
    runtime: static
    name: seccraft-web-staging              # a NEW name; never the live API service's name
    repo: https://github.com/<owner>/SecCraft
    branch: main
    buildCommand: npm ci --prefix frontend && VITE_BASE=/ npm run build --prefix frontend
    staticPublishPath: frontend/dist
    buildFilter:                              # do not rebuild for docs, backend or tests
      paths: [frontend/**]
      ignoredPaths: [frontend/tests/**]
    envVars:
      - { key: VITE_API_BASE,          sync: false }
      - { key: VITE_SUPABASE_URL,      sync: false }
      - { key: VITE_SUPABASE_ANON_KEY, sync: false }
    routes:
      - { type: rewrite, source: /*, destination: /index.html }
    headers:                                  # mirror dist/_headers; verify on staging
      - { path: /*, name: X-Content-Type-Options,         value: nosniff }
      - { path: /*, name: X-Frame-Options,                value: DENY }
      - { path: /*, name: Referrer-Policy,                value: no-referrer }
      - { path: /*, name: Permissions-Policy,             value: "geolocation=(), microphone=(), camera=(), usb=()" }
      - { path: /*, name: Cross-Origin-Opener-Policy,     value: same-origin }
      - { path: /*, name: Cross-Origin-Resource-Policy,   value: same-origin }
```

The Content-Security-Policy stays in the page's `<meta>` tag, which the build already writes. Field names were taken from the Blueprint reference; run `render blueprints validate` on the real file.

## 7. Continuous-integration cost once the repository is private

Measured from the last two fully completed runs (REST job timestamps; `gh run view --json jobs` returned wrong durations here):

| Job | Minutes |
|---|---|
| Browser: responsive, accessibility and keyboard smoke | 26 |
| Browser: Wireless and Android lessons | 22 |
| Browser: production subpath and offline downloads | 11 |
| Frontend, Backend, PostgreSQL, hygiene | 2 |
| **One full run** | **about 61 minutes of runner time (about 64–66 billed), 26 minutes wall clock** |

At 2,000 minutes a month a Free private repository allows about **30 full runs**. Every push to `main` or `arena/*` and every pull request event triggers a run, and a branch with an open PR triggers two. Options, in the order I would apply them:

1. **Cancel superseded runs** with `concurrency` per ref, and run the heavy browser jobs on pull requests to `main` plus a nightly or manual run, not on every push (halves usage).
2. **Move the lesson-reading job to content CI** ([`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md) §10): about 22 minutes off every application push; it runs only when content changes.
3. **Path filters** so docs-only changes skip the browser jobs.
4. **A paid plan.** For a personal account GitHub Pro also restores Pages for private repositories (a rollback path during the move), raises the allowance to 3,000 minutes, and enables protected branches on private repositories.
5. A self-hosted runner (free minutes, you operate the machine).

## 8. Sequence

Each step is additive until H4, and each has a rollback. None starts without approval.

| Step | What happens | Who | Rollback |
|---|---|---|---|
| **H0 Prerequisites** | decisions in §10; API on a paid compute plan; Supabase Pro before learner records; the domain chosen; the GitHub plan decided (§7) | owner | – |
| **H1 Staging site** | create `seccraft-web-staging` (a new static site on its `onrender.com` URL, linked from nowhere); add its origin to `PLATFORM_ALLOWED_ORIGINS` and the Supabase redirect list (additive); add the root-base mode to the preview emulator | owner (Render, Supabase), me (code) | delete the staging service; remove the origins |
| **H2 Parity** | run the production browser job against the staging URL; check the rewrite fallback, missing-asset behaviour, service-worker update, sign-in round trip, downloads, headers, CORS | me | none needed |
| **H3 Cutover** | point the custom domain (or announce the new URL); turn the Pages deploy into a redirect stub; update `platform.json` and the docs | owner (DNS, Render), me (code) | revert DNS; redeploy the normal Pages build |
| **H4 Make the repository private** | after H3 has been stable for an agreed period: replace the UI's GitHub links, disable the Pages workflow, apply the CI changes in §7, review secrets and Dependabot settings, then change visibility | owner (GitHub settings), me (code, docs) | make the repo public again (history stays as it was) |

Ordering with the content work: the move is independent of P3, but **the repository should not go private before P3 completes the content move** unless you accept private history as the only protection. The privacy of the repository protects history going forward; it does not recall what has been public. This repository has **0 forks, 0 stars and 0 watchers**, so there are no public forks holding copies, but clones and crawler caches cannot be enumerated.

## 9. Pre-privacy checklist (H4)

* UI and docs: links to GitHub URLs (`SecurityPosture.tsx`, `platform.json`, README badges) replaced with in-app pages or removed.
* `NextTaskForYou`, `VisualUpdates`, `requirement.md`: move or delete.
* Secrets audit and rotation for anything that has ever been in the repository history. The CI hygiene job only checks that no `.env` file is currently tracked; it does not scan history, so run a history scan once before the visibility change.
* GitHub features that differ on private repositories (Dependabot alerts, secret scanning, code scanning) checked against the plan.
* Pages disabled only after the redirect stub has served for a while.

## 10. Decisions needed before H0

| Decision | Recommendation |
|---|---|
| Final domain | A custom domain, chosen before P5 |
| API compute plan | A paid instance; the 8-second client deadline cannot survive a one-minute cold start |
| Supabase plan | Pro before real learner records (backups, no pausing) |
| GitHub plan | Pro (personal account): private Pages as a rollback path, more minutes, protected branches |
| Whether the staging site is linked from anywhere | No |
| Timing of H3 relative to P4 | After P4, so no local progress is stranded on the old origin |

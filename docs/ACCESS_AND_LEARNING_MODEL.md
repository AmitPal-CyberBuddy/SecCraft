# SecCraft access and learning model: public catalogue, authenticated learning

*Status: plan, with the owner's decisions confirmed on 2 October 2026 (two rounds). This document changes no infrastructure and migrates no content. Detail lives in [`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md) (private content repository, importer, schema, leak check), [`HOSTING_AND_REPOSITORIES.md`](HOSTING_AND_REPOSITORIES.md) (Render static site, repository privacy, sequence) and [`IA_AUDIT.md`](IA_AUDIT.md) (page-by-page classification). Supersedes [`PREVIEW_VS_APPROVED_PLAN.md`](PREVIEW_VS_APPROVED_PLAN.md).*

> **Publicly discoverable curriculum, privately delivered learning content, account-backed progress, and eventually evidence-backed competency.**

```text
        PUBLIC  /paths/…                             AUTHENTICATED  /learn/…
   Discover → Evaluate → Start Learning  ──►  Login → Approval  ──►  Learn → Practice → Prove
        metadata only                                                  lessons · labs · scenarios · assessments
                                                                                │
                                                                                ▼
                                                                       Competency record
```

This is one coordinated product change: backend, content, access control, information architecture and UI are sequenced together (§11), not access control first and a UI retrofit afterwards.

---

## 1. Decisions (confirmed by the owner)

| # | Decision |
|---|---|
| D1 | The gate exists for **record integrity and controlled access to the practical learning environment**. Content secrecy is secondary but required: protected material must not be in the public build or any public surface. |
| D2 | Access has three states: **public** (catalogue), **pending** (catalogue + account status), **active** (full learning). Signed in is not approved. |
| D3 | **Authoring source: a private repository plus an importer into PostgreSQL.** The repository is the source of truth for protected instructional content; PostgreSQL is the runtime delivery layer. Direct or manual database editing is not the primary workflow. The private repository must never be exposed through the public frontend or bundled into the Vite build. |
| D4 | Large binary lab resources (PCAPs, APKs, datasets) go to **private object storage**, not PostgreSQL. |
| D5 | **One public sample per Learning Path:** Wireless `01-intro-wireless/02-scope-and-assessment-decisions`; Android `android-01-platform/01-architecture-sandbox-and-trust-boundaries`. They are *public samples*, not a "Preview Curriculum" access tier. |
| D6 | Vocabulary: **access** (Public Catalogue / Pending / Active) is separate from **content maturity** (Preview / Published / Coming soon). |
| D7 | **`/paths/…` is the public catalogue; `/learn/…` is authenticated learning.** The route structure is a UX distinction. Authorization is enforced server-side. |
| D8 | Existing quizzes, scenarios and challenges are **practice material only**. Their answer keys have been public, so they are never treated as verified evidence. |
| D9 | **Demonstrated** and **Verified** require **new private verification items**, authored initially by the owner and maintained through the private authoring workflow (never hard-coded in the frontend). The rubric is defined with the competency model (P7). |
| D10 | Stack: **FastAPI on Render; Supabase Auth; Supabase PostgreSQL** for application and learning data. |
| D11 | The **frontend will move from GitHub Pages to a Render Static Site**, and the main repository will become **private**, both later. The content repository stays separate from the application repository where that separation is useful (it is: [`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md) §2). |
| D12 | **For now:** do not break the Pages deployment, do not migrate the frontend, do not change the existing Render or Supabase configuration unnecessarily, and make no destructive infrastructure change or bulk content migration. |
| D13 | Progress belongs to the account. No guest learning, browser-local learning record, XP, or progress import/export (P4). |
| D14 | Career Paths and Skill Tracks exist **in the data model now**; no large empty interfaces until there is content. |
| D15 | Path and Module Overview pages are real discovery pages, prerendered where appropriate; `robots.txt` and the Pages deep-link 404 are revisited. |
| D16 | The page structure is **not fixed**: audit, then restructure, redesign, remove or create pages as the new journey requires. |
| D17 | The leak check covers **lesson content, lab instructions, answer keys, assessment solutions, private verification material, and other protected artifacts**. |

---

## 2. Vocabulary

| Concept | Values | Lives in | Replaces |
|---|---|---|---|
| **Access** | public · pending · active (rejected and suspended are account outcomes; owner is a role) | `lib/access.ts` | `ContentTier` preview/full |
| **Content maturity** | Preview · Published · Coming soon | `lib/contentMaturity.ts`; `maturity` in the catalogue | the access-flavoured use of "Preview"; path `planned` |
| **Lab environment** | offline evidence · offline + optional hardware · RF validation needs hardware | `TierBadge` (to be renamed) | unchanged meaning |
| **Public sample** | a deliberately chosen public lesson per path | `sample: true` in the catalogue | a free "preview curriculum" |
| **Practice vs verified** | an item's `grading` class | item schema | one undifferentiated "progress" |

Copy rules: never say lesson content is open, public or readable without an account; never present Preview or Full as an access level; say *catalogue* for what a visitor sees and *learning* for what an approved account does.

---

## 3. Access model

```text
Visitor ─ no session ────────────────► catalogue · public samples · About / Methodology / Resources
Signed in, pending ──────────────────► catalogue · account status ("awaiting approval")
Signed in, active ───────────────────► full learning environment (/learn/…)
Signed in, rejected / suspended ─────► catalogue · account status (with a contact path)
Owner (a role, not a state) ─────────► owner console, in addition to the learner view
```

The frontend's seven states collapse to five plus an owner flag (`public` and `guest` become *visitor*). Approval stays manual, as a policy setting in `PlatformSettings` (manual now; an optional auto-approve for verified emails later).

| Capability | Visitor | Pending | Active | Rejected / Suspended |
|---|---|---|---|---|
| `catalogue`, `public-sample` | ✓ | ✓ | ✓ | ✓ |
| `account-status` | – | ✓ | ✓ | ✓ |
| `learning-content` (lessons, labs, items, assessments, artifacts) | – | – | ✓ | – |
| `progress-record`, `assessment-attempts`, `evidence` | – | – | ✓ | – |
| `admin-console` | owner only | | | |

**The guard.** `Start Learning` goes to `/learn/…`: a visitor is sent to sign in with the destination preserved ("Continue with Wireless Pentesting"); a pending, rejected or suspended user lands on the account status page (resuming at the destination once approved); an active user gets the lesson. `next` is validated (same origin, begins with `/learn/`, no scheme, no `//`).

> **The guard is UX.** Every `/learn` page fetches its content from the authenticated API, which checks the account on every request. A visitor who bypasses the guard receives nothing, and the `/learn` JavaScript contains no content (the leak check verifies it).

---

## 4. Information architecture

### 4.1 Journey

```text
Discover → Explore a path → Explore a module → Review objectives → Start Learning
        → Sign in / Request access → Approval → /learn/… → Learn → Practice → Prove
```

### 4.2 Route map

```text
PUBLIC  (public layout; ★ prerendered)
  ★ /                                                   Home
  ★ /paths                                              Learning Paths (the Learning landing)
  ★ /paths/:pathId                                      Path Overview
  ★ /paths/:pathId/modules/:moduleId                    Module Overview
  ★ /paths/:pathId/modules/:moduleId/lessons/:lessonId  Lesson Overview (a designated sample shows its body)
  ★ /labs                                               Labs catalogue (metadata)
  ★ /methodology   /about   /resources   /feedback
    /career-paths, /skills                              data now, pages later; shown only when they have content
    /sign-in   /request-access   /reset-password   /update-password   (/login and /signup stay as aliases)
    /account                                            account and approval status (any signed-in state)

LEARNING  (workspace layout; active accounts only; authorization enforced by the API)
    /learn                                              workspace home: Continue learning, my paths, upcoming
    /learn/:pathId                                      my path: modules with my progress
    /learn/:pathId/:moduleId                            module workspace
    /learn/:pathId/:moduleId/lessons/:lessonId          lesson
    /learn/:pathId/:moduleId/labs/:labId                lab
    /learn/:pathId/:moduleId/scenarios/:scenarioId      scenario
    /learn/progress   /learn/skills   /learn/evidence   /learn/assessments/:id   /learn/tools/…

OWNER   /admin/…                                        unchanged
```

* **Reserved first segments under `/learn`:** `progress`, `skills`, `evidence`, `assessments`, `tools`, `account`. The catalogue validator rejects a path id that equals one.
* **Path ids and URL slugs.** Your example used `/paths/android-security`; the catalogue id today is `android-pentesting` (titled "Android Application Security"). The id is embedded in progress records, content keys and lesson links, so it should not be renamed. If you want `android-security` in the URL, add a `slug` field and a redirect from the current URL. *Still open (§12).*
* **Redirects keep old links alive:** `/app`, `/dashboard` → `/learn`; `/paths/:p/modules/:m?tab=theory&lesson=x` → `/learn/:p/:m/lessons/x` (behind the guard); `/modules/:id` → the path-qualified URL; `/progress`, `/analytics` → `/learn/progress`; `/engagement`, `/assessments` → `/learn/assessments`; `/how-it-works` → `/methodology`.

### 4.3 Navigation

* **Public:** Home · Learning (Career Paths / Learning Paths / Skill Tracks, each rendered only when its collection has published content) · Labs · About · Methodology · Resources · Sign in · Request access.
* **Learning:** Continue · My Learning · Labs · Scenarios · Assessments · Progress · Skills · Evidence · Account.
* A page never offers a link its viewer cannot follow.

### 4.4 What the pages are

* **Path Overview:** purpose, what you will learn, the learning journey (phases), practical experience (labs, scenarios, assessments, capstone), prerequisites, tools, expected outcomes, assessment, Start Learning.
* **Module Overview:** what you will learn, lessons with descriptions, skills, lab and scenario counts, prerequisites, Start Module. Never a locked screen.
* **Lesson Overview:** title, description, objectives, kind, position, Start Learning; a designated sample also shows the lesson.
* **`/paths` = discover and evaluate. `/learn` = learn, practice and prove.** The workspace home is *Continue learning*, *My learning*, *Skills*, *Upcoming*; competency, progress and evidence replace XP.

The existing pages are classified one by one in [`IA_AUDIT.md`](IA_AUDIT.md).

---

## 5. Content boundary

### 5.1 Public: the catalogue projection

Only these fields are public, enforced by a whitelist schema rather than habit: learning paths, career paths, skill tracks, descriptions, **lesson titles and descriptions**, objectives, skills, prerequisites, difficulty, duration, lab and scenario counts, expected outcomes, the learning journey, `maturity`, and a `sample` flag. Forbidden keys in any public JSON: `body`, `content`, `correct`, `answer`, `answer_basis`, `flag`, `best`, `rationale`, `tasks`, `rubric`.

The projection is **generated** from the private repository and published to the application repository as a reviewed pull request ([`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md) §4).

### 5.2 The public samples

Both are conceptual and neither contains an attack procedure. **Android** is self-contained (public OWASP links only; three read-only inspection commands for an owned device). **Wireless links to four files from the `WF-FND-01` pack**, and the full pack also holds the captures and `self-review.md` that the later independent case (`03-foundations-independent-case`) is built on. Recommendation: publish only the four scope-exercise files plus a reduced zip as *sample artifacts*, and keep the rest private. A sample may only link to sample artifacts, catalogue pages and external URLs.

### 5.3 Private content and where it lives

```text
Private content repository ──importer──► PostgreSQL (schema `content`, private) ──► FastAPI ──► approved learner
        │                                 Storage (private buckets): PCAPs, archives, datasets, APK source ──┘
```

* Every import is an immutable **release**; attempts and progress record the release used; rollback is a pointer change.
* The repository split (two repositories, and exactly what moves) is in [`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md) §2.

### 5.4 What counts as protected

| Class | Public site and API | Active learner | Server only |
|---|---|---|---|
| Lesson content | never (samples excepted) | yes | |
| Lab instructions | never | yes | |
| Item prompts | never | yes, per item | |
| Answer keys, rubrics, solutions | never | **never** | yes |
| Explanations and model feedback | never | only after submission | |
| Verification material | never | prompt during an attempt only; keys never | yes |
| Artifacts | never (sample artifacts excepted) | yes, via the artifacts API | |
| Instructor material (for example `docs/instructors/ENG-01_answer_key.md`, **public today**) | never | never | yes |

### 5.5 Supabase exposure

The browser carries the project's public key, and Supabase exposes `public` (and `graphql_public`, `storage`) through its REST API by default. Private tables therefore live in a `content` schema that is **not exposed**, with row-level security and revoked grants (the pattern already in the repository), private storage buckets, and two independent checks: a database privilege test and a live probe after each import. A hosted project has had cases where the dashboard setting and the running configuration disagreed, which is why both exist.

### 5.6 Practice and verified

Items carry `grading: practice | verified`, and the rule is structural: items under `items/` in the content repository can only be `practice`; only files under `verification/` can be `verified`; a database `CHECK` and the importer enforce it. Practice items are graded **server-side from the private key** and recorded as practice; they never contribute to *Demonstrated* or *Verified*. Existing quizzes, scenarios and challenges are `practice` by classification and need no re-authoring.

| Item kind | Grader | Recorded as |
|---|---|---|
| Multiple choice, scenario "best next step" | exact match | `practice` or `verified` by item class |
| Parametrised lab check (a BSSID, a channel) | validator with tolerant normalisation | same |
| Challenge flag, short answer | exact or normalised match | same |
| Independent assessment, engagement | rubric self-review; later instructor review | `self_reported` until reviewed |

Anti-enumeration: no per-option feedback before submission; explanations only after a complete submission; per-item attempt limits and cooldowns; idempotency keys (already present); rate limits per account; verification prompts delivered inside an attempt, not as a list.

### 5.7 Consequences

1. **Tooling moves with the content.** 38 of the 59 files in `scripts/` are content tooling; the nine lesson-reading browser scripts become content QA ([`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md) §2.4, §10).
2. **What has been published stays published.** The repository is public today (0 forks, 0 stars, 0 watchers). Privacy later protects history going forward; it does not recall it. A history rewrite is not planned.
3. **No existing item can support a verified record** (D8). Verification items are new, private, and written after the boundary exists (D9).
4. **Existing artifact links** (`/wireless-practice/…`) become artifacts-API requests, rewritten by the lesson renderer.
5. **The backend image bakes content in today.** After the migration the API reads the database: content releases stop requiring a backend deploy.

### 5.8 The leak check

Specified in [`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md) §9. In short: markers per protected class and a whitelist for the public JSON and `frontend/public` (needs no access to private content); an anonymous sweep and an active-learner sweep over every route; a database privilege test; a live probe. Report-only until the contract step, then enforcing.

---

## 6. API contract

The API paths stay under `/api/v1/…`. `/learn` is a frontend namespace only.

| Endpoint | Auth | Status |
|---|---|---|
| `GET /api/v1/content/catalog`, `/paths/{id}`, `/modules/{id}/overview` | public | exists; the catalogue is also published as static JSON so discovery never depends on the API being awake |
| `GET /api/v1/content/samples/{lessonKey}` | public | new (designated samples only) |
| `GET /api/v1/content/lessons/{module}/{lesson}` | active | exists |
| `GET /api/v1/content/labs/{id}` | active | exists; extend with instructions, no answers |
| `GET /api/v1/content/items/{module}` / `assessments/{id}` | active | new: items without keys |
| `POST /api/v1/attempts` | active | exists; add graders, `practice`/`verified` |
| `GET /api/v1/content/artifacts/{type}/{file}` | active | exists; becomes the only way to get an artifact |
| `POST /api/v1/progress/events` | active | **new**; replaces import |
| `GET /api/v1/progress` | active | exists |
| `GET /api/v1/competencies`, `/evidence` | active | P7 |
| Legacy `/api/modules`, `/learning-paths`, `/platform` | public | consolidate into `/api/v1/content/*` |
| Legacy `GET /api/pcaps/*` | **anonymous today** | move behind authentication (P3.6) |
| Legacy `GET /api/content/{module}/{lesson}` | was anonymous | **removed** (done) |
| `POST /api/v1/progress/import*` | active | remove after P4 |

---

## 7. Learning records

* `ProgressRecord` already has `source` (`local_import | self_reported | server`) and `verified`. After P4, lesson and lab *started/completed* are written directly as `self_reported` (engagement, never demonstration); graded attempts are `server`, and `verified` only for verification items.
* **Competency states (proposal; the rubric is defined in P7 with the owner):**

| State | Rule |
|---|---|
| Practicing | at least one started or attempted activity mapped to the skill |
| Completed | all required lessons and labs of the skill's modules completed (self-reported counts) |
| Demonstrated | a server-graded **verification** item for the skill passed |
| Verified | Demonstrated, plus independent review (instructor or owner) or a controlled assessment |

* States are derived by the server from progress, attempts and evidence, and are always shown with their provenance. The skill ↔ module/lab/assessment mapping lives in the catalogue now, so Skill Tracks can appear later without a migration.
* **Local-first tools:** reports, evidence vault, engagement submissions and lab answers become account-backed (they are the "prove" evidence); the terminal simulator and CVSS calculator are stateless tools; theme, reading and motion preferences stay local; reference, flashcards, and notes are open decisions (§12).

---

## 8. Public discovery

* **Prerender** the public routes after the build: real HTML per route with title, description, canonical URL, Open Graph and JSON-LD (`Course`), plus `sitemap.xml`; the client takes over with a normal client render, not hydration.
* **`robots.txt`:** today the build writes `Disallow: /`. Target: allow the catalogue; disallow `/learn/`, `/account`, `/sign-in`, `/request-access`; point at the sitemap.
* **Hosting semantics matter.** GitHub Pages answers unknown paths with HTTP 404 and the shell. A Render static site with a `/* → /index.html` rewrite answers with 200 and never overrides a real file, so prerendered pages win ([`HOSTING_AND_REPOSITORIES.md`](HOSTING_AND_REPOSITORIES.md) §2). **Decide the domain before P5**: canonical URLs and the sitemap embed it.
* **Service worker:** it answers every navigation with the app shell today. It must fetch the requested URL for prerendered routes (network first, shell as fallback) and treat the Android file folders like the Wireless ones (the Android "Verify hash" link opens the shell on a production build).

---

## 9. Deployment architecture

```text
Private repositories:  SecCraft (application)    SecCraft-content (private from day one)
                          │        │                    │ importer
                          ▼        ▼                    ▼
              Render Static Site   Render Web Service ─► Supabase: Auth · PostgreSQL · Storage
                  (frontend)          (FastAPI)
```

**Today:** GitHub Pages serves the frontend; FastAPI runs on Render; Supabase provides Auth and PostgreSQL. **Later (D11):** the frontend moves to a Render Static Site and the application repository becomes private.

**Order:** the Render move precedes making the repository private, because Pages from a private repository needs a paid GitHub plan. The staged sequence (H0–H4), the Pages-specific inventory, a draft Blueprint, the CI-cost analysis (one full run is about 61 runner-minutes) and the platform facts verified for this plan are in [`HOSTING_AND_REPOSITORIES.md`](HOSTING_AND_REPOSITORIES.md). A `render.yaml` is deliberately not added yet: a Blueprint that names an existing service takes it over.

**Before real learner records:** the API on a paid compute plan (a free instance sleeps after 15 minutes and takes about a minute to wake, while the client gives requests 8 seconds), and Supabase on a plan with backups (Free has none and pauses after a week idle).

---

## 10. Testing strategy

* **Two repositories, two CIs** ([`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md) §10). The application repo runs on fixtures (a small synthetic content set with canary markers); the content repo runs validation, artifact verification, the importer, and **content QA** (the lesson-reading browser scripts) against the real content with the application checked out at a pinned ref.
* **An authenticated end-to-end stack** replaces per-script API stubs in P4: FastAPI with `PLATFORM_ENV=test`, seeded users (visitor, pending, active, rejected, owner), the frontend proxying `/api` to it. The first task is a spike on injecting a Supabase-shaped session or providing a test shim. The approved-learner fixture (`scripts/lib/ui-audit-fixtures.mjs`) is the stopgap.
* **Contract tests:** whitelist schema for the public JSON, the anonymous and active-learner sweeps, the database privilege test, the live probe, the leak check.
* Unit tests that pin the old model are rewritten with the phase that removes it ([`IA_AUDIT.md`](IA_AUDIT.md) §8).

---

## 11. Phases, slices and gates

Sizes are relative (S/M/L). A step is done when its acceptance checks pass in CI.

| Phase | Scope | Size | State |
|---|---|---|---|
| **P1** Terminology | access vs maturity; remove the contradictory copy; source-scan test | S | **done** |
| **P2** Audit and IA design | `IA_AUDIT.md`, this plan, the two design documents | S | **this change** |
| **P3** Content boundary | slices P3.1–P3.6 below | L | next, after approval |
| **P4** Account-backed learning | `POST /progress/events`; `/learn` guard with `next`; account status page; collapse `UserState`; delete local progress, XP, achievements, daily, streak, sync and local profile; authenticated end-to-end stack | L | |
| **P5** Public catalogue and discovery | public layout for catalogue routes; Path, Module and Lesson Overview; samples; data-driven nav; prerender, sitemap, robots, service worker | M | needs the domain decision |
| **P6** Learning workspace | `/learn` home, module and lab workspaces, scenarios and assessments hubs, Progress, Skills, Evidence | M–L | |
| **P7** Competency and evidence | evidence storage, the owner's verification rubric, competency states, Skills pages, review for *Verified* | M | needs the owner's verification items |
| **Hosting track H0–H4** | staging site on Render, parity, cutover, private repository | M | independent of P3; see the hosting document |

**P3 in controlled slices** ([`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md) §11): P3.1 contract (schemas, fixtures, whitelist test, leak check in report-only mode; additive) → P3.2 schema and API (migration on local and CI Postgres only; file fallback) → P3.3 importer and the private repository (owner creates it; bootstrap from a filtered clone; dry run into staging) → *gate: first production import* → P3.4 frontend (`/learn`, items and labs from the API, public pages from the projection) → *gate: contract* → P3.5 contract (remove private content from the application repo and bundle; enforce the leak check; update the Dockerfile; move scripts) → P3.6 cleanup (legacy `/api/pcaps/*`, unmounted routers).

**Acceptance for P3:** the leak check passes in enforce mode; both sweeps pass; `anon` and `authenticated` have no privilege on `content.*`; `dist/` contains no private marker; every item kind is graded server-side; a verification item cannot be recorded as practice or the reverse; the application CI is green without private content; content QA is green in the content repository.

**Gates that wait for explicit approval:** creating the private repository; the first production import; the contract step; the Render staging site; the cutover; the repository visibility change.

**Dependencies:** P3 → P4 (a progress write is only meaningful once grading is server-side) → P6 → P7. P5 needs P3's projection and the domain decision, and can run beside P4. Do the H3 cutover after P4.

---

## 12. Decisions still open

| # | Decision | Recommendation |
|---|---|---|
| O1 | Wireless sample: publish the whole `WF-FND-01` pack, or only the four scope-exercise files plus a reduced zip | Only the scope-exercise files (§5.2) |
| O2 | URL slug for the Android path: keep `android-pentesting`, or `android-security` with a redirect | Keep the id; add a slug only if you want the new URL |
| O3 | Reference commands, filters, checklist: public *Resources* or private | Public, if you consider them generic |
| O4 | Notes, bookmarks, flashcards | Account-backed notes if wanted; otherwise drop |
| O5 | Which modules are *Preview* maturity | Today only `07-wep-legacy` (`content_status: brief`) is derivable; set `maturity` explicitly |
| O6 | Approval policy | Keep manual; add an auto-approve-verified-email option later |
| O7 | Domain | A custom domain, before P5 |
| O8 | Render, Supabase and GitHub plans | See the hosting document §10 |
| O9 | Retention and privacy for learner records and evidence | Define before P7, ideally before P4 stores anything new |
| O10 | The legacy lab stack under `docker/`, `reporting/templates/finding.md`, and the internal notes (`NextTaskForYou`, `VisualUpdates`, `requirement.md`) | Retire the lab stack; decide the template with O3; move the notes out |

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Private tables readable through the public key | non-exposed `content` schema, RLS and revoked grants, database privilege test, live probe |
| Answer enumeration through repeated attempts | attempt limits, no pre-submission feedback, rate limits, audit trail |
| An approved account scraping everything it can read | per-account rate limits; the value is practice, assessment and records, not secrecy |
| A new route leaking content | the anonymous and active-learner sweeps cover every route automatically |
| Private content reaching a frontend build | the application repository never contains it; the build never fetches it |
| **Pages goes down if the repository is made private on a Free plan** | Render move first (H3 before H4), or a paid plan |
| **CI minutes exhausted on a private repository** (about 61 minutes per full run against a 2,000-minute allowance) | cancel superseded runs, run heavy jobs on pull requests, move content QA out, path filters, or a paid plan |
| **API cold start versus the 8-second client deadline** | paid compute plan, or a retry state |
| **Supabase Free: no backups, pauses after a week idle** | Pro before real learner records |
| **A Blueprint adopts a live service by name** | no `render.yaml` until reviewed; new names only |
| **A rewrite masks a missing asset** (HTML served with 200) | test stale-chunk behaviour on staging; keep the update flow |
| Links to a private repository in the UI | replace before the visibility change |
| Private/public id drift | the importer fails on any mismatch |
| Manual approval becomes a bottleneck | policy setting; status page with expectations and a contact path |

---

## 14. Done so far

* **Closed an anonymous lesson route** (`GET /api/content/{module}/{lesson}` returned full lesson text with no credentials) and added a test that sweeps every GET route; verified to fail on the old code.
* **Browser QA fixed** (the original failing CI): approved-learner fixture, a focus race, the Android script's stale checks, three parallel CI jobs. CI is green on every commit pushed so far: all seven jobs, including the three browser jobs, on `b429d23`, `3e17b27`, `e0662e8` and `739a52b`.
* **Phase 1:** access and content maturity separated; the contradictory copy removed; a source-scan test keeps it out; `lib/contentAccess.ts` removed.
* **A test-harness bug fixed:** a root-level hook in `access-matrix.test.mjs` exited before its last test ran, so that test never executed and could not fail CI. Every other test file was checked.
* **Phase 2:** the audit and this plan, with the content-pipeline and hosting designs, grounded in an inventory of the repository, the API's anonymous surface, and verified platform documentation.

# SecCraft access and learning model: public catalogue, authenticated learning

*Status: plan for owner review · 2 October 2026 · supersedes [`PREVIEW_VS_APPROVED_PLAN.md`](PREVIEW_VS_APPROVED_PLAN.md). The page-by-page classification this plan relies on is [`IA_AUDIT.md`](IA_AUDIT.md). Phases are **P1–P7**.*

> **Publicly discoverable curriculum, privately delivered learning content, account-backed progress, and eventually evidence-backed competency.**

This is one coordinated product change, not an access-control change followed by a UI retrofit. Each phase below names its backend, content, UI/IA and test work together.

---

## 1. Decisions (owner, 2 October 2026)

| # | Decision |
|---|---|
| 1 | The gate exists for **record integrity and controlled access to the practical learning environment**. Content secrecy is a secondary requirement: anything not meant to be public must not be in the public bundle or public repository. |
| 2 | Access is three states: **public** (catalogue and discovery), **authenticated + pending** (catalogue + account status), **authenticated + active** (full learning environment). Signed in does not mean approved. |
| 3 | One deliberately chosen **public sample per Learning Path**, so visitors can see how SecCraft teaches. It is not called "Preview Curriculum": *Preview* is not an access tier. |
| 4 | **Access** (public / pending / active) and **content maturity** (Preview / Published / Coming soon) are separate vocabularies. |
| 5 | Production stack: GitHub (source) · GitHub Pages (public frontend) · Render (FastAPI) · Supabase Auth · Supabase Postgres (application data, learning content, progress, submissions, assessments, competencies) · Supabase Storage (larger private artifacts). No new infrastructure beyond that. |
| 6 | The boundary is real, not a UI gate, and a **CI/build check fails if protected text, answer keys or private material appears in `dist/` or public JSON**. |
| 7 | Progress belongs to the account. No guest learning, no browser-local learning record, no XP, no progress import/export. `completed = true` on the server is not a demonstrated competency: Practicing / Completed / Demonstrated / Verified need explicit rules. |
| 8 | Keep the three-layer model (Career Paths → Learning Paths → Modules; Skill Tracks → Skills → modules/labs/assessments) **in the data**, but do not build large empty Career Path or Skill Track interfaces. |
| 9 | Path and Module Overview pages are public, useful discovery pages (not locked screens), prerendered where appropriate; revisit `robots.txt` and the GitHub Pages deep-link 404 behaviour. |
| 10 | Pages, navigation and components are evaluated against the new journey; the current page structure is not preserved for convenience. |

---

## 2. Vocabulary

Three different things were all called "tier". They are separated:

| Concept | Values | Where it lives | Replaces |
|---|---|---|---|
| **Access** | public · pending · active (+ rejected, suspended as account outcomes; owner as a role) | `lib/access.ts` | `ContentTier` preview/full, `Preview Curriculum` / `Full Curriculum` |
| **Content maturity** | Preview · Published · Coming soon | `lib/contentMaturity.ts`; `maturity` in the catalogue | the access-flavoured use of "Preview"; path `planned` → *Coming soon* |
| **Lab environment** | Offline evidence · Offline + optional hardware · RF validation needs hardware | `TierBadge` (to be renamed) | unchanged meaning; clearer name |

Copy rules: never say lesson content is "open", "public" or "readable here"; never present Preview or Full as an access level; say *catalogue* for what a visitor can see and *learning* for what an approved account can do.

---

## 3. Access model

### 3.1 States

```text
Visitor ─ no session ───────────────► catalogue · public sample · About / Methodology / Resources
Signed in, pending ─────────────────► catalogue · account status ("awaiting approval")
Signed in, active ──────────────────► full learning environment
Signed in, rejected / suspended ────► catalogue · account status (with a contact path)
Owner (role, not a state) ──────────► owner console, in addition to the learner view
```

The frontend's seven states (`public`, `guest`, `pending`, `active`, `rejected`, `suspended`, `owner`) collapse to five plus an owner flag; `public` and `guest` become *visitor*. Approval stays manual. Make that a policy dial in `PlatformSettings` (manual now; optional auto-approve for verified emails later) rather than a hard-coded rule.

### 3.2 Target capability matrix

| Capability | Visitor | Pending | Active | Rejected / Suspended |
|---|---|---|---|---|
| `catalogue` (paths, modules, lesson titles, skills, prerequisites, counts) | ✓ | ✓ | ✓ | ✓ |
| `public-sample` | ✓ | ✓ | ✓ | ✓ |
| `account-status` | – | ✓ | ✓ | ✓ |
| `learning-content` (lessons, labs, scenarios, assessments, artifacts) | – | – | ✓ | – |
| `progress-record`, `assessment-attempts`, `evidence` | – | – | ✓ | – |
| `admin-console` | owner only | | | |

Removed with the old model: `guest-workspace`, `local-progress`, `progress-file`, `progress-merge`, `certificate`.

### 3.3 "Start Learning" guard

```text
Start Learning ──► /learn/…
   visitor ........................ /sign-in?next=<learn url>   "Continue with Wireless Pentesting"
   signed in, pending/rejected/suspended ► /account  (status; resume at <next> once approved)
   signed in, active .............. the lesson
```

`next` is validated: same origin, begins with `/learn/`, no scheme and no `//`. The path/module shown on the sign-in and request-access pages comes from the `next` target, so the learner keeps their destination.

---

## 4. Information architecture

### 4.1 Journey

```text
Discover → Explore a path → Explore a module → Review lessons & objectives → Start Learning
        → Sign in / Request access → Approval → Learning workspace → Learn → Practice → Prove
```

### 4.2 Route map (proposal for review)

The catalogue keeps its current `/paths/…` URLs (already shareable and prerenderable). The authenticated experience moves under `/learn/…`, so "public catalogue" and "authenticated learning" are a visible URL boundary. That boundary also simplifies robots rules, the service worker, and CSP.

```text
PUBLIC (public layout; ★ prerendered)
  ★ /                                         Home
  ★ /paths                                    Learning Paths (the Learning landing)
  ★ /paths/:pathId                            Path Overview
  ★ /paths/:pathId/modules/:moduleId          Module Overview
  ★ /paths/:pathId/modules/:moduleId/lessons/:lessonId   Lesson Overview (the designated sample shows its body)
  ★ /labs                                     Labs catalogue (metadata)
  ★ /methodology   /about   /resources   /feedback
    /career-paths, /skills                    deferred; shown only when they have content
    /sign-in   /request-access   /reset-password   /update-password
    /account                                  account & approval status (any signed-in state)

LEARNING (workspace layout; active accounts only)
    /learn                                    Learning workspace home: Continue learning, my paths, upcoming
    /learn/:pathId/:moduleId                  module workspace
    /learn/:pathId/:moduleId/lessons/:lessonId
    /learn/:pathId/:moduleId/labs/:labId
    /learn/scenarios[/:id]   /learn/assessments[/:id]
    /learn/progress   /learn/skills   /learn/evidence
    /learn/tools/…                            terminal, CVSS calculator

OWNER   /admin/…                              unchanged
```

Redirects keep old links alive: `/app`, `/dashboard` → `/learn`; `/paths/:p/modules/:m?tab=theory&lesson=x` → `/learn/:p/:m/lessons/x` (behind the guard); `/modules/:id` → the path-qualified URL; `/progress`, `/analytics` → `/learn/progress`; `/engagement`, `/assessments` → `/learn/assessments`; `/how-it-works` → `/methodology`; `/login`, `/signup` stay as aliases.

### 4.3 Navigation

* **Public:** Home · Learning (Career Paths / Learning Paths / Skill Tracks, each rendered only when its collection has published content) · Labs · About · Methodology · Resources · Sign in · Request access.
* **Learning:** Continue · My Learning · Labs · Scenarios · Assessments · Progress · Skills · Evidence · Account.
* A page never offers a link the viewer cannot follow: visitors do not see `/learn/…` entries; pending users see their status instead of "Continue".

### 4.4 What the pages show

* **Path Overview:** purpose, what you will learn, the learning journey (phases), practical experience (labs, scenarios, assessments, capstone), prerequisites, tools, expected outcomes, assessment, Start Learning.
* **Module Overview:** what you'll learn, lesson list with descriptions, skills, lab/scenario counts, prerequisites, Start Module. **Never a locked screen.**
* **Lesson Overview:** title, description, objectives, kind, position in the module, Start Learning. For the designated sample it also shows the lesson.
* **Dashboard / workspace home:** Continue Learning, My Learning, Skills, Upcoming. Competency, progress and evidence replace XP.

---

## 5. Content boundary

### 5.1 Public: the catalogue projection

Only these fields are public, enforced by a whitelist schema rather than by habit:

`learning paths`, `career paths`, `skill tracks`, path/module descriptions, **lesson titles and descriptions**, objectives, skills, prerequisites, difficulty, duration, lab/scenario counts, expected outcomes, learning journey (phases), `maturity`, and a `sample` flag.

Forbidden keys in any public JSON: `body`, `content`, `correct`, `answer`, `answer_basis`, `flag`, `best`, `rationale`, `tasks`, `rubric`.

### 5.2 The public sample

One lesson per path, **conceptual and non-operational** (no commands against a target, no lab artifacts). The sample is public by design, so it may live in the public repo and be prerendered, which makes it the best-indexed page in the catalogue. The leak check allow-lists sample ids explicitly.

Suggested picks (owner to confirm):

| Path | Suggested sample | Why |
|---|---|---|
| Wireless Pentesting | `01-intro-wireless` / `02-scope-and-assessment-decisions` ("From permission to an assessment decision", ~690 words) | shows the method (decisions, authorisation) and is non-operational; alternative: `01-why-wireless-is-different` |
| Android Application Security | `android-01-platform` / `01-architecture-sandbox-and-trust-boundaries` (~1,100 words) | foundational concept lesson |

### 5.3 Private and where it lives

Private: lesson bodies, lab instructions, scenario/quiz/challenge/assessment items **with answer keys and rubrics**, private walkthroughs, practice artifacts. Total today: about 2.3 MB.

```text
Authoring source of truth   private repository (e.g. SecCraft-content), reviewed and CI-verified
        │  idempotent importer (CLI, runs on release)
        ▼
Supabase Postgres, schema `content` (not exposed to the REST API)
        lessons · labs · assessment_items (answer_key, rubric) · artifacts (storage key, sha256)
Supabase Storage (private bucket)   PCAPs, archives, datasets; served through the API
```

* **Metadata public, bodies private, joined by stable ids.** `modules.json` and friends stay in the public repo (they are public anyway), so the public site builds without access to private content. The importer fails if a catalogue lesson id has no body, or a body has no catalogue entry.
* The Postgres database is a **deployment artifact**, not the editing surface. Editing in the database directly would lose review, history, and verification.
* The public repository keeps: application code, the catalogue projection, the designated samples, the importer, schemas, and the leak check.

### 5.4 Supabase exposure rules

This is the easiest way to undo the boundary by accident. The browser carries the project's public `anon` key, and **tables in an exposed schema are readable through the REST API with that key unless protected**.

* Put private tables in a schema that is not exposed (`content`), **and** enable row-level security **and** revoke all privileges from `anon` and `authenticated`: the pattern already used in the repository (RLS with no policies in `…_02_account_table_rls`; RLS plus revoked default grants in `…_03_feedback`).
* The backend connects with a dedicated role; only the backend can read `content.*`.
* CI test in the Postgres job: for `anon` and `authenticated`, `has_table_privilege(role, 'content.<table>', 'SELECT')` is false for every private table.
* Storage buckets are private; no public URLs. The API streams small files, or issues short-lived signed URLs for large ones after the authorisation check.

### 5.5 Server-side grading

Answer keys never leave the server. Item delivery strips keys; `POST /attempts` grades and records:

| Item kind | Grader | Recorded as |
|---|---|---|
| Multiple choice (quiz, scenario "best next step") | exact match | `verified` |
| Parametrised lab checks (e.g. a BSSID, a channel) | validator with tolerant normalisation | `verified` |
| Challenge flags / short answers | exact or normalised match | `verified` |
| Independent assessments / engagements | rubric self-review; later instructor review | `self_reported` until reviewed |

Anti-enumeration: no per-option feedback before submission; explanations only after a complete submission; attempt limits and cooldowns per item; idempotency keys (already in place) so retries do not count twice; rate limits per account.

### 5.6 Consequences of moving content

1. **Tooling moves with the content.** 39 of 56 files in `scripts/` and 22 CI `verify-*` invocations read `frontend/src/content` or `frontend/public/…`. Generators, packagers and verifiers move to the private content repository and run in its CI. The public CI cannot run them without a token; that is acceptable (it keeps the public CI independent of private material) but it must be explicit.
2. **Everything already published stays published.** The repository is public, so the current lessons, quiz/scenario/challenge answer keys and artifacts exist in git history, forks and caches. History rewriting is destructive (force-push, broken forks and PR refs) and cannot reach GitHub's caches. **Do not rely on it. Treat the current material as public.**
3. **So no existing item can support a verified record.** Every current quiz, scenario and challenge has had its answers public. They continue as **practice items** (self-check, labelled as such). *Demonstrated* and *Verified* need **new private verification items**, authored after the boundary is real. This is the point where record integrity is decided.
4. **Existing links.** Lessons link to `/wireless-practice/…` files. Those links become authenticated artifact requests (API-served), and the lesson renderer rewrites them.

### 5.7 CI leak check

* **Canary markers.** Every private content file carries a marker (`SC-PRIVATE:<id>`), added by the authoring tool and enforced by the private repo's CI. Designated samples carry `SC-PUBLIC-SAMPLE:<id>`. The public repo's check needs **no access to private content**: it scans for the marker pattern.
* `scripts/verify-no-private-content.mjs` runs after the build and scans `dist/`, `frontend/src`, `frontend/public` and the public JSON. It fails on any `SC-PRIVATE:` marker, any forbidden key in public JSON, and any file in `frontend/public` that is not on the allow-list (icons, manifest, service worker, sample artifacts).
* Backend CI keeps the anonymous route sweep (**added on this branch**: `test_anonymous_requests_never_receive_lesson_text`) and extends it to artifacts and captures; the Postgres job adds the privilege test in §5.4.
* **Transition.** Until the content moves, the script runs in report-only mode and prints today's leaks, so the work is visible without breaking CI.

---

## 6. API contract

| Endpoint | Auth | Status |
|---|---|---|
| `GET /api/v1/content/catalog`, `/paths/{id}`, `/modules/{id}/overview` | public | exists; the catalogue is **also** published as static JSON so discovery does not depend on the API being awake |
| `GET /api/v1/content/samples/{lessonKey}` | public | new (designated samples only) |
| `GET /api/v1/content/lessons/{module}/{lesson}` | active | exists |
| `GET /api/v1/content/labs/{id}` | active | exists; extend with instructions, no answers |
| `GET /api/v1/content/assessments/{id}` | active | new: items without keys |
| `POST /api/v1/attempts` | active | exists; add graders (§5.5) |
| `GET /api/v1/content/artifacts/{type}/{file}` | active | exists; becomes the only way to get an artifact |
| `POST /api/v1/progress/events` | active | **new** (started / completed); replaces import |
| `GET /api/v1/progress` | active | exists |
| `GET /api/v1/competencies`, `/evidence` | active | P7 |
| `GET /api/modules`, `/learning-paths`, `/platform` (legacy) | public | consolidate into `/api/v1/content/*` |
| `GET /api/pcaps/*` (legacy) | **anonymous today** | move behind authentication (P3) |
| `GET /api/content/{module}/{lesson}` (legacy) | was anonymous | **removed** |
| `POST /api/v1/progress/import*` | active | remove after P4 |

Keep the existing `/api/v1/content/…` names where possible to limit frontend churn.

---

## 7. Learning records

### 7.1 Progress

`ProgressRecord` already has `source` (`local_import | self_reported | server`) and `verified`. After P4: lesson/lab "started/completed" are written directly as `self_reported` (an engagement signal, never a demonstration); graded attempts are `server` + `verified`.

### 7.2 Competency states (proposal; detail in P7)

| State | Rule |
|---|---|
| Practicing | at least one started or attempted activity mapped to the skill |
| Completed | all required lessons and labs of the skill's modules completed (self-reported counts) |
| Demonstrated | a server-graded verification item for the skill passed |
| Verified | Demonstrated plus independent review (instructor/owner) or a controlled assessment |

States are derived by the server from progress + attempts + evidence, and always shown with their provenance. Skill ↔ module/lab/assessment mapping lives in the data now (so Skill Tracks can appear later without a migration).

### 7.3 What happens to the local-first tools

| Tool | Proposal |
|---|---|
| Reports / findings, evidence vault, engagement submissions, lab answers | account-backed (they are the "prove" evidence) |
| Terminal simulator, CVSS calculator | stateless workspace tools |
| Reference commands / filters / checklist | public *Resources* if the owner agrees they are generic, otherwise workspace |
| Flashcards, notes & bookmarks | decision needed: account-backed, or dropped |
| Theme, reading and motion preferences, tour-seen | stay local (UI preferences, not learning records) |

---

## 8. Public discovery

* **Prerender** the public routes after the build (`scripts/prerender-catalogue.mjs`): render each route to static HTML (`react-dom/server`), write `dist/<route>/index.html` with `<title>`, description, canonical URL, Open Graph / Twitter tags and JSON-LD (`Course`), plus `sitemap.xml`. Directory-style files are served by GitHub Pages with **HTTP 200**. The client takes over with a normal client-side render, not hydration, so there are no mismatch risks.
* **`robots.txt`.** Today the build writes `Disallow: /`. Target: allow the public catalogue, disallow `/learn/`, `/account`, `/sign-in`, `/request-access`; point at the sitemap.
* **404 behaviour.** The Pages 404 fallback (HTTP 404 with the app shell) stays for authenticated routes, which is desirable since they should not be indexed.
* **Service worker.** It currently answers every navigation with the app shell. It must fetch the requested URL for prerendered routes (network-first, shell as fallback), and treat the Android file folders like the Wireless ones (today the Android "Verify hash" link opens the app shell on the production build).
* A custom domain is optional but gives stable canonical URLs.

---

## 9. Deployment and operations

```text
GitHub ──► GitHub Pages   public frontend + prerendered catalogue
   └─────► Render         FastAPI
                 ├─ Supabase Auth       sign-in, account state
                 ├─ Supabase Postgres   app data + schema `content` (private)
                 └─ Supabase Storage    private artifacts
```

* The catalogue is static, so a sleeping or unreachable API never blanks the public site. Learning needs the API: offline lessons go away by design, so the offline/update UI copy changes accordingly.
* **Check plan limits before launch:** on Render free instances a service spins down when idle (the first request can take tens of seconds), and free Supabase projects pause after a period of inactivity. Either is a poor first impression for an approved learner; decide the tier deliberately.
* **Repository gaps:** there is no `render.yaml` (add one with the environment variable list); the Pages workflow builds without `VITE_API_BASE`, `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` unless repository variables are set (see `GITHUB_PAGES.md`).
* **Privacy:** account-backed records and evidence are personal data. Define retention, deletion and export-on-request before storing evidence.

---

## 10. Testing strategy

* **Replace per-script API stubs with an end-to-end stack.** FastAPI with `PLATFORM_ENV=test` and seeded users (visitor, pending, active, rejected, owner); the backend tests already mint valid test tokens. Playwright runs against the Vite dev server proxying `/api` to it. The frontend's session comes from the Supabase client, so the first task is a spike: inject a Supabase-shaped session into storage, or provide a test auth shim.
* The approved-learner lesson fixture (`scripts/lib/ui-audit-fixtures.mjs`) is a stopgap until then.
* Keep the three parallel browser jobs; add the authenticated suite as a fourth.
* Unit tests that pin the old model are rewritten with the phases that remove it (see `IA_AUDIT.md` §8).
* Contract tests: public JSON schema (whitelist), anonymous route sweep, Postgres privilege test, leak check.

---

## 11. Phases

Sizes are relative (S/M/L). A phase is done when its acceptance checks pass in CI.

### P1 · Product and access terminology: **S** — *in this branch*
Remove "Preview Curriculum", "open to everyone", "public content", "readable here" wherever they conflict with the model. Introduce *Public catalogue* vs *Authenticated learning*, and *Preview / Published / Coming soon* for maturity. Behaviour does not change.
**Accept:** no user-facing string presents Preview/Full as an access level or calls lesson text public; `contentAccess.ts` is gone; `contentMaturity.ts` exists; the two pinning tests are rewritten; CI green.

### P2 · Audit and information-architecture design: **S** — *this document + `IA_AUDIT.md`*
**Accept:** owner answers the open decisions in §12; route map and nav confirmed.

### P3 · Make the content boundary real: **L**
* Catalogue projection + whitelist schema; `maturity`, `sample` flags; sample designation.
* Private content repository; importer; `content` schema with RLS + revoke; Storage bucket; Render configuration.
* Authenticated delivery of lessons, labs, assessment items (no keys), artifacts; legacy `/api/pcaps/*` behind authentication.
* Server-side graders for quizzes, scenarios, challenges, lab checks; attempts recorded with `verified`.
* Frontend consumes the API; `quizData.ts`, `challenges.json`, `scenarios.json` bodies leave the bundle; lab answers leave `ModuleDetail.tsx`; practice artifacts leave `frontend/public`.
* Leak check (§5.7), Postgres privilege test, content verification moved to the private repo.
* **Decide** the history question (§12) and **author new private verification items**.
**Accept:** the leak check passes in enforce mode; anonymous sweep covers every route; `anon`/`authenticated` have no privilege on `content.*`; `dist/` contains no private marker; graders cover every item kind; public CI is green without private access.

### P4 · Account-backed learning: **L**
`POST /progress/events`; `/learn/*` behind the guard; `next` and path context on sign-in/request-access; account/approval status page; collapse `UserState`; delete the local progress store, XP, achievements, daily, streak, sync, local profile, certificate, and their routes, tests and docs; authenticated end-to-end stack replaces the stubs.
**Accept:** a visitor cannot reach `/learn/*`; a pending user lands on status with a resume link; completing a lesson writes one server record; no `localStorage` learning data; the end-to-end suite covers visitor, pending, active, rejected, owner.

### P5 · Public catalogue and discovery: **M**
Public layout for catalogue routes; Learning landing, Path Overview, Module Overview, Lesson Overview, designated samples, Methodology, Resources; data-driven nav (Career Paths / Skill Tracks appear when non-empty); prerender, sitemap, `robots.txt`, canonical/OG/JSON-LD; service-worker update.
**Accept:** `curl` of a Path/Module page returns real content with status 200; sitemap lists every public page; no public page is a locked screen; Lighthouse SEO and axe pass.

### P6 · Learning workspace: **M–L**
Workspace home (Continue learning, My Learning), module workspace, lab workspace, scenarios and assessments hubs, Progress, Skills, Evidence; delete the old dashboard/analytics.
**Accept:** every item in the authenticated list in `IA_AUDIT.md` §5 exists; no XP/gamification surface remains.

### P7 · Competency and evidence: **M**
Evidence storage, competency rules (§7.2), Skills and Competencies pages, instructor/owner review for *Verified*.
**Accept:** each state is derivable from stored data by a documented rule and shown with provenance; nothing is labelled Demonstrated without a server-graded verification item.

**Dependencies:** P3 → P4 (a progress write is only meaningful once grading is server-side) → P6 → P7. P5 needs P3's projection and sample designation but can run beside P4.

---

## 12. Open decisions

| # | Decision | Recommendation |
|---|---|---|
| 1 | Content authoring source | Private repository + importer (§5.3). Direct database editing loses review and verification. |
| 2 | Rewrite public git history? | No. Treat published content as public (§5.6); put the effort into new verification items. Revisit after P3. |
| 3 | Public sample per path | The two suggested lessons in §5.2, or your own picks; must be non-operational. |
| 4 | URL scheme | `/paths/…` public, `/learn/…` authenticated (§4.2). |
| 5 | Where the *Reference* content lives | Public *Resources* if generic; otherwise workspace. |
| 6 | Notes, bookmarks, flashcards | Account-backed notes only if you want them; otherwise drop. |
| 7 | Which modules are *Preview* maturity | Today only `07-wep-legacy` (`content_status: brief`) is derivable; set `maturity` explicitly per module. |
| 8 | Approval policy | Keep manual; add an auto-approve-verified-email setting as a later option. |
| 9 | Custom domain | Recommended for canonical URLs; not required. |
| 10 | Render and Supabase plans | Decide before P3 goes live (cold starts, pausing). |
| 11 | Retention and privacy for learner records and evidence | Define before P7; ideally before P4 stores anything new. |
| 12 | Who authors the new private verification items, and when | Needed before any state above *Completed* is shown. |

---

## 13. Risks

| Risk | Mitigation |
|---|---|
| Tables in an exposed Supabase schema readable with the public key | non-exposed `content` schema + RLS + revoked grants + CI privilege test (§5.4) |
| Answer enumeration through repeated attempts | attempt limits, no pre-submission feedback, rate limits, audit trail |
| An approved account scraping everything it can read | per-account rate limits; do not market the content as secret; the value is practice, assessment and records |
| A new route leaking content | the anonymous sweep covers every OpenAPI route automatically |
| Catalogue unavailable while the API sleeps | catalogue published as static JSON and prerendered HTML |
| Large QA churn | authenticated end-to-end stack first; keep browser jobs parallel |
| Service-worker regressions on prerendered pages | update with P5, covered by the production-subpath job |
| Private/public drift in ids | importer fails on any mismatch; catalogue and content verified together |
| Manual approval becomes a bottleneck | policy dial; status page with expectations and a contact path |

---

## 14. Already done on this branch

* **Closed an anonymous lesson route** (`GET /api/content/{module}/{lesson}` returned full lesson text with no credentials) and added a regression test that sweeps every GET route (verified to fail on the old code).
* **Browser QA fixed** (the original failing CI): approved-learner lesson fixture, a focus race, the Android script's stale checks, three parallel CI jobs.
* Documentation: this plan, `IA_AUDIT.md`; the Pages guide no longer says lessons work offline.

# SecCraft information-architecture audit (Phase 2)

*Status: updated after the owner confirmed the decisions (URLs, samples, repositories, hosting) · 2 October 2026 · source inspection of the repository at `main` (`72cb1ad`) plus the changes on this branch. Companion to [`ACCESS_AND_LEARNING_MODEL.md`](ACCESS_AND_LEARNING_MODEL.md), which defines the target model and the phases referred to here as **P1–P7**, [`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md) (the repository split, file by file) and [`HOSTING_AND_REPOSITORIES.md`](HOSTING_AND_REPOSITORIES.md). This is a source audit, not a rendered or visual review. It supersedes the 46-line stub in `FRONTEND_PAGE_AUDIT.md`.*

## How to read this

Every item is classified against the target model (public catalogue → authenticated learning → account-backed records), using the six categories requested:

| Class | Meaning |
|---|---|
| **1 Keep** | Can remain as-is |
| **2 Restructure** | Same purpose, but its content, data source, layout area or behaviour changes |
| **3 Redesign** | Needs a visual/UX redesign, not just a rewire |
| **4 Remove / replace** | Delete it, or replace it with the named successor |
| **5 New** | Does not exist yet |
| **6 Route/nav** | Needs a routing or navigation change. Shown in its own column because it combines with 1–5 |

Numbers come from the code (route table, import graph, file sizes) and from running the API, not from estimates. Where a classification depends on a decision that is not made yet, the row says so and the decision is listed in the plan under *Open decisions*.

---

## 0. What the audit found

1. **Public and learning surfaces are not separated in routing.** `App.tsx` has 49 route entries: 9 use the public layout, **32 render inside the single learner workspace chrome** (including the catalogue pages `/paths`, `/paths/:id` and `/modules`), 2 are the owner console, 5 are redirects, and 1 is the public layout parent. A visitor browsing the catalogue is already inside the app shell, with local-progress UI, and none of those pages is prerendered or indexable.
2. **`ModuleDetail.tsx` (965 lines) is two products behind one URL.** The module overview and the whole lesson/lab/quiz/report experience live behind `?tab=`. It has to be split: a public Module Overview and an authenticated learning experience.
3. **"Tier" means three unrelated things:** the *access* tier (`ContentTier` preview/full, derived from `phase <= 2`), the *lab environment* tier (`TierBadge`: simulation/hybrid/RF), and *content maturity* (`content_status` authored/expanded/brief, path `status` available/planned). The access/maturity split in the decisions needs the lab one renamed too.
4. **Some old-model copy is false today**, not just awkward. `Modules.tsx` tells every visitor *"All lessons are readable here. Account approval adds account features, not access to the lesson text."* The guided tour says account status doesn't change *"whether bundled course files can be read"*. The home page's primary action is *"Try the preview"*. Lesson text is served only to approved accounts. **Fixed by P1 on this branch.**
5. **The navigation is built on the principle the new model reverses.** `navModel.ts`: *"identical for every user state by design: the product does not remove learning surfaces to push registration."*
6. **Seven routes render the same `Engagement` page, including `/assessments`.** There is no assessment concept in the UI yet, only the ENG-01 engagement.
7. **The local-first machinery is large.** 31 files import `useProgressStore` (614 lines); 35 mention XP/gamification/achievements; 9 routes are built around it (`/sync`, `/progress`, `/analytics`, `/achievements`, `/badges`, `/daily`, `/streak`, `/profile`, `/progress/sync`).
8. **The content boundary is not real yet** (details in §6 and §7): quizzes, scenarios and challenges ship their answer keys in the client bundle; lab answers are hard-coded in `ModuleDetail.tsx`; ~1.1 MB of practice artifacts are served statically; the repository is public and contains all 99 lessons **and an instructor answer key (`docs/instructors/ENG-01_answer_key.md`)**; the legacy API served every lesson anonymously (**fixed on this branch**) and still serves capture analysis anonymously.
9. **Login and signup carry no return destination.** The two `redirect` hits in `Account.tsx` are Supabase email-link settings, not return-to.
10. **Dead code candidates:** `pages/LearningPath.tsx` (170 lines), `components/certificate/Certificate.tsx` (240), `components/admin/CustomModuleCreator.tsx` (75), `lib/platform.ts` (144), `hooks/useReducedMotion.ts` (19), `lib/utils.ts` (10) have no importers. Confirm each by deleting it and running `tsc`.
11. **Test coupling:** 22 browser scripts use per-script API stubs and nearly all open guest routes; 9 assert local progress. Two unit tests (`access-matrix`, `account-states`) pin the old tier model line by line. 38 of the 59 files in `scripts/` are content tooling that moves with the content.

---

## 1. Routes (49 entries)

Target URLs follow the owner's decisions (plan §4): the catalogue keeps `/paths/…`; authenticated learning is `/learn/<pathId>/…`. The route structure is a UX distinction; authorization is enforced by the API.

### 1a. Public layout (`PublicLayout`)

| Route | Today | Target | Class | Route/nav | Phase |
|---|---|---|---|---|---|
| `/` | `PublicHome`: hero "Try the preview", preview counts, Preview/Full explainer | Catalogue-first Home: how SecCraft teaches, paths, the public sample, Start Learning / Request access | 3 | CTA targets change | P1 copy, P5 redesign |
| `/about`, `/how-it-works` | `PublicInfo` (About + How it works) | About SecCraft, Methodology, and Resources as separate pages | 2 | `/how-it-works` → `/methodology` | P5 |
| `/feedback` | `FeedbackPage` | Keep (no approval needed to send feedback) | 1 | – | – |
| `/login` | `LoginPage` | Sign in with `next` + path context ("Continue with Wireless Pentesting") | 2 | **Yes**: accept `next` | P4 |
| `/signup` | `SignupPage` | "Request access" with the same context and an honest approval expectation | 2 | optional rename | P4 |
| `/account` | `AccountStatusPage` | Account & approval status hub for pending / rejected / suspended (contact path, resume-after-approval) | 3 | – | P4 |
| `/reset-password`, `/update-password` | account recovery | Keep | 1 | – | – |

### 1b. Learner workspace chrome (`Shell`) — 32 entries

| Route | Today | Target | Class | Route/nav | Phase |
|---|---|---|---|---|---|
| `/app` | `Dashboard` (local XP, streak, next lesson) | Learning Workspace home: Continue learning, my paths, upcoming | 3 | `/app` → `/learn` | P6 |
| `/dashboard` | redirect → `/app` | remove | 4 | – | P6 |
| `/paths` | `LearningPaths` + local progress | **Public** Learning Paths index, public layout, prerendered | 2 | layout change | P5 |
| `/paths/:pathId` | `PathDetail`: phases, modules with local progress, "Open … case →" links straight into lessons | **Public** Path Overview: purpose, what you will learn, journey, practical experience, prerequisites, tools, outcomes, assessment, Start Learning | 3 | layout change; lesson deep links removed | P5 |
| `/paths/:pathId/modules`, `/modules` | `Modules` + tier banner + local progress | Public module list (folded into the Path Overview journey); decide whether a cross-path `/modules` stays | 2 | – | P5 |
| `/paths/:pathId/modules/:id` | `ModuleDetail` (overview / theory / lab / quiz / report tabs) | **Split:** public Module Overview here; the authenticated lesson, lab and scenario experience at `/learn/:pathId/:moduleId/…` | 2 + 5 | **Yes** | P3, P5, P6 |
| `/modules/:id` | `ModuleDetail`, path-less | redirect to the path-qualified URL | 4 | **Yes** | P5 |
| `/path`, `/learning-path`, `/legacy/path` | redirects → wireless | Keep as redirects (or prune later) | 1 | – | – |
| `/labs`, `/paths/:pathId/labs` | `Labs`: capture library, artifacts, terminal, evidence vault, scoring tabs | Public Labs catalogue (metadata) + authenticated lab workspace | 2 | **Yes** | P5, P6 |
| `/challenges`, `/challenges/:id`, `/paths/:pathId/challenges[/:id]` (4) | `Challenges`, `ChallengeDetail` (answers in the client) | Challenge/scenario catalogue entries (public) + authenticated attempt pages with server grading | 2 | **Yes** | P3, P6 |
| `/reference` | `Reference`: commands, filters, checklist, flashcards, terminal | Split: public Resources vs workspace tools *(decision)* | 2 | **Yes** | P5, P6 |
| `/engagement[/:id]`, `/assessments[/:id]`, `/paths/:pathId/assessments`, `/paths/:pathId/engagements[/:id]` (7) | all render `Engagement` | Assessments hub (new) with attempt and results pages; the engagement stays as one assessment type | 2 + 5 | consolidate 7 → 1 family | P3, P6 |
| `/reports` | `Reports`: editor, templates, timeline, CVSS, PDF, evidence vault | "Findings & evidence" in the workspace; records account-backed | 2 | **Yes** | P6, P7 |
| `/settings` | `Settings`: appearance, accessibility, local-data panel, security posture, progress | Appearance, accessibility, reading preferences only | 2 | – | P4 |
| `/profile` | `Profile` (local profile, certificate, state) | merge into Account | 4 | → `/account` | P4 |
| `/sync`, `/progress/sync` | progress import / export / merge | remove | 4 | – | P4 |
| `/analytics`, `/progress` | `Analytics` (local) | replaced by server-backed Progress and Skills | 4 + 5 | **Yes** | P6 |
| `/achievements`, `/badges` | `Achievements` | remove (competencies replace them) | 4 | – | P4 |
| `/daily`, `/streak` | `Daily` | remove | 4 | – | P4 |
| `*` | `NotFound` in the workspace chrome | keep; render in the layout of the area requested | 2 | – | P5 |

### 1c. Owner console (`AdminShell`)

| Route | Today | Target | Class | Phase |
|---|---|---|---|---|
| `/admin`, `/admin/feedback` | owner console, feedback inbox | Keep. Later: content-import status, approval policy | 1 | – |

### 1d. The journey, stage by stage

| Stage | Page | URL | Exists today? | Class | Phase |
|---|---|---|---|---|---|
| Discover | Home | `/` | `PublicHome` | 3 | P5 |
| Explore a path | Learning Paths; Path Overview | `/paths`, `/paths/:pathId` | `LearningPaths`, `PathDetail` (inside the workspace chrome, with local progress) | 2 / 3 | P5 |
| Explore a module | Module Overview | `/paths/:pathId/modules/:moduleId` | only the *overview tab* of `ModuleDetail` | 5, reusing that content | P5 |
| Review objectives | Lesson Overview (a sample shows its body) | `/paths/:pathId/modules/:moduleId/lessons/:lessonId` | none | 5 | P5 |
| Start Learning | the call to action, carrying the destination | → `/sign-in?next=/learn/…` | none (no return-to anywhere) | 5 + 6 | P4 |
| Login / Sign up | Sign in; Request access | `/sign-in`, `/request-access` | `LoginPage`, `SignupPage` | 2 | P4 |
| Approval | Account and approval status | `/account` | `AccountStatusPage` | 3 | P4 |
| Learn | Lesson | `/learn/:pathId/:moduleId/lessons/:lessonId` | the theory tab of `ModuleDetail` | 2 (extract) | P6 |
| Practice | Lab; scenario | `/learn/:pathId/:moduleId/labs/:labId`, `…/scenarios/:id` | `Labs`, `DecisionPractice`, `ChallengeDetail` | 2 | P3.4, P6 |
| Prove | Assessment; evidence; skills | `/learn/assessments/:id`, `/learn/evidence`, `/learn/skills` | `Engagement` (it renders every assessment route), `Reports`, `EvidenceVault` | 2 + 5 | P7 |
| Continue | Workspace home | `/learn` | `Dashboard` | 3 | P6 |

---

## 2. Navigation and chrome

| Item | Today | Target | Class |
|---|---|---|---|
| Public header (`PublicLayout`) | Learning paths · How it works · About + auth | Home · Learning (Career Paths / Learning Paths / Skill Tracks, each shown only when it has content) · Labs · About · Methodology · Resources · Sign in · Request access | 3 + 6 |
| Workspace chrome (`Shell`, `Sidebar`, `Topbar`, `navModel`) | one nav for every state; Daily, Achievements, Analytics, Sync in the main list | Authenticated workspace navigation: Continue · My Learning · Labs · Scenarios · Assessments · Progress · Skills · Evidence · Account | 3 + 6 |
| Topbar "experience row" | curriculum label + local-practice note | access/status indicator | 2 |
| `AccountBanner` | status banner with "Keep learning" | status banner for pending / rejected / suspended; resume-after-approval | 2 |
| `GlobalSearch` (394 lines) | searches modules, labs, challenges, references | visitors: catalogue only; workspace: adds learning items; never lesson bodies | 2 |
| `GuidedTour` | steps describe the old tiers | rewrite for the new areas | 2 |
| `KeyboardShortcuts`, `ScrollToTop`, `ErrorBoundary`, `AdminShell` | – | Keep | 1 |
| `OfflineIndicator`, `UpdateNotice` | offline-first assumptions | Keep; copy changes (learning needs a connection) | 2 |
| `PointsToast` + `NotificationCenter` | built from local XP/achievement events | remove with gamification; real notifications (approval, feedback replies) later if wanted | 4 |
| Return-to on login/signup | none | `next` with allow-list validation + path context | 5 + 6 |

---

## 3. Components by folder

Based on file inventory, size, and import/flag analysis. Folder rows are directional; each file is re-checked when its phase starts.

| Folder (files / lines) | What it is | Class | Note |
|---|---|---|---|
| `accessibility` (1 / 68) | reading & motion preferences | 1 | local UI preferences are fine |
| `account` (4 / 361) | `AccountBanner`, `StateChip`, `PasswordFeedback`, `PracticeStanding` | 2 / 1 / 1 / 4 | `PracticeStanding` (practice-vs-record chip) disappears with local progress |
| `admin` (1 / 75) | `CustomModuleCreator` | 4 | no importer; replaced by the content importer (P3) |
| `analytics` (1 / 204) | local analytics dashboard | 4 | replaced by server-backed Progress (P6) |
| `animations` (5 / 98) | motion system | 1 | |
| `certificate` (1 / 240) | `Certificate` | 4 | no importer; certificates disabled in the access matrix |
| `challenge` (1 / 17) | `ChallengeCard` | 2 | public catalogue card variant |
| `common` (10 / 313) | controls, loading, results, `LearningPathScope`, `TierBadge`, … | 1 / 2 | rename `TierBadge` → lab-environment badge; `LearningPathScope` serves public and workspace |
| `error`, `theme`, `shortcuts`, `offline` | – | 1 | |
| `evidence` (1 / 323) | evidence vault (browser storage) | 2 | account-backed (P6–P7) |
| `gamification` (4 / 433) | badges, daily challenges, level badge, points toast | 4 | P4 |
| `lab` (8 / 2,320) | capture inspector, handshake diagram, recon map, config viewer, retest, scoring, Android analyzer, uploader | 1 / 2 | the interactive tools remain, moved behind authentication; `LabScoring` and answer checks become server-graded (P3) |
| `layout` (6 / 416) | shells, sidebar, topbar, nav model | 3 | §2 |
| `learning` (7 / 609) | `ModuleCard`, `DecisionPractice`, `AndroidCaseLab`, `Flashcards`, `NotesBookmarks`, progress bars | 2 | answer logic in `DecisionPractice` and `AndroidCaseLab` moves server-side; notes/bookmarks need a decision (account-backed or dropped) |
| `notifications` (1 / 210) | built from local XP events | 4 | |
| `pdf` (1 / 274) | client-side report PDF | 1 → 2 | keeps working; its source data becomes account-backed |
| `profile` (1 / 66) | `LocalProfile` (also wrapped in `main.tsx`) | 4 | |
| `progress` (1 / 261) | `ProgressSyncPanel` | 4 | P4 |
| `public` (1 / 159) | `PublicLayout` | 3 | §2 |
| `reference` (1 / 119) | `ChecklistPanel` | 2 | resources vs tools *(decision)* |
| `report` (3 / 592) | editor, templates, timeline | 2 | account-backed (P6–P7) |
| `search` (1 / 394) | `GlobalSearch` | 2 | §2 |
| `security` (3 / 563) | `CvssCalculator`, `LocalDataPanel`, `SecurityPosture` | 1 / 4 / 4 | the posture claims describe "the guest-first app" |
| `terminal` (2 / 339) | simulated terminal | 1 | stateless workspace tool |
| `tour` (1 / 72) | `GuidedTour` | 2 | §2 |

---

## 4. State, session and libraries

| File | Today | Class | Note |
|---|---|---|---|
| `lib/access.ts` (302) | 7 user states, 14 capabilities, provenance/standing/XP copy | 2 | collapse to visitor / pending / active / rejected / suspended + owner role; remove provenance/standing/XP notes (P4) |
| `lib/contentAccess.ts` (117) | access tier (`preview`/`full`) from `phase <= 2` | 4 | replaced by `lib/contentMaturity.ts` + the `learning-content` capability (P1) |
| `lib/session.tsx` (332) | Supabase session + `GET /account`; derived state | 2 | simplify derived state; carry `next` |
| `lib/api.ts` (328) | API client; lesson fetch is API-only | 2 | typed clients for the new endpoints; remove bundled-JSON fallbacks for private content |
| `lib/useServerProgress.ts` (135) | read-only view of `GET /progress`, deliberately never merged with local | 2 | becomes the primary progress hook once a write path exists |
| `store/useProgressStore.ts` (614) | persisted local progress, XP, level, streak, achievements, merge/migrate | 4 | replaced by server-backed hooks (P4) |
| `lib/supabase.ts`, `passwordGuidance.ts`, `motion.ts`, `readingPreferences.ts` | – | 1 | |
| `lib/learningNavigation.ts` | `moduleLink`, `resolveModuleView` (`?tab=`) | 2 | links point at `/learn/…`; tab model goes away with the split |
| `lib/platform.ts`, `lib/utils.ts`, `hooks/useReducedMotion.ts` | no importers | 4 | confirm with `tsc` |
| `main.tsx` | wraps `LocalProfileProvider` | 2 | drop it in P4 |

---

## 5. Needed pages and what already exists

So nothing is built twice. "Exists" means a page or component to reuse, not that it is right as it stands.

| Needed page | Existing equivalent | Verdict |
|---|---|---|
| **Public** — Home | `PublicHome` | redesign (P5) |
| Learning / Academy landing | `/paths` | restructure into the landing |
| Career Paths (index, detail) | – | **data model now, UI later** (no content yet) |
| Learning Paths index | `LearningPaths` | restructure |
| Skill Tracks (index, detail) | `skills.json` (25 skills) only | **data model now, UI later** |
| Path Overview | `PathDetail` | redesign |
| Module Overview | `ModuleDetail` overview tab | new page, reuse the overview content |
| Lesson Overview / learning entry | – | new (title, description, objectives, CTA; the designated sample renders its body here) |
| About · Methodology · Resources | `PublicInfo` (About, How it works); `Reference` (public part) | restructure / new |
| Request access / Sign in | `SignupPage`, `LoginPage` | restructure (context + `next`) |
| Account / approval status | `AccountStatusPage` | redesign |
| **Authenticated** — Workspace home | `Dashboard` | redesign |
| Continue learning | next-step logic inside `Dashboard` | new component, reuse the logic |
| My learning paths | – | new |
| Lesson experience | `ModuleDetail` theory tab | extract |
| Labs | `Labs` + lab components | split, then reuse components |
| Scenarios | `DecisionPractice` inside modules; 47 scenarios in data | new hub |
| Assessments | route exists, renders `Engagement` | new hub |
| Progress | `Analytics`, `useServerProgress` | replace |
| Skills / competencies | `skills.json` | new (P7) |
| Evidence / records | `EvidenceVault`, `Reports` | restructure, account-backed |
| Account | `Profile` + `Settings` + `Account` | merge |

---

## 6. Content data and static assets

| Asset | Today | Target |
|---|---|---|
| `modules.json` (71 KB), `learning-paths.json`, `skills.json`, `platform.json`, `labs.json` (metadata only), `stats.ts`, `module-ordinal.ts`, `legacy-module-map.ts` | bundled; public | **Public catalogue projection.** Keep, validated against a whitelist schema; add `maturity` and a `sample` flag |
| `lessons/*.md`: 99 files, 848 KB | in the client source tree and the **public repository**; served by the API to approved accounts | **Private.** Only the designated samples stay public |
| `quizData.ts` (84 KB, **bundled with `correct` + `explanation`**), `quizzes.json` (96 KB, API) | answer keys public | **Private; server-graded** |
| `challenges.json` (60 KB: tasks, `flag`, `answer_basis`, bundled by 6 files) | public | split: public metadata / private tasks and keys |
| `scenarios.json` (84 KB: options, `best`, `rationale`, bundled) | public | private; public counts only |
| `engagements.json`, `androidCases.json` (feedback) | public | private |
| `lab-artifacts.json` | public manifest | private manifest |
| `reference/*.json` (29 KB) | public | *decision:* public Resources vs private |
| `achievements.ts` | gamification | remove (P4) |
| `public/wireless-practice` (97 files, 649 KB), `wireless-foundations` (11), `lab-data` (18), `pcaps` (20), `android-*` (12) | **served statically, no auth**; the gated `/artifacts` endpoint exists but the UI never calls it | private object storage, served through the authenticated API; only the wireless sample's four scope-exercise files (plus a reduced zip) stay public |
| `public/` icons, manifest, `sw.js` | – | keep |
| `docs/instructors/ENG-01_answer_key.md` | **an instructor answer key in the public repository** | private (key class) |
| `android-labs/notes-boundary/` (10 files) and `public/android-demos/*.zip` | intentionally vulnerable demo app, source and built zip, public | private artifact source and builds; `android-demo.yml` moves with it |
| `content/` (lab configs, README) | public | private (artifacts) |
| `tools/android-triage/`, `tools/wireless-qa/` | learner toolkit source; capture verification | private (content tooling) |

All private content totals about **2.3 MB** (lessons 0.85 MB, structured items 0.35 MB, artifacts 1.1 MB): Postgres for text and structured items plus object storage for binaries is more than enough, with no CDN or search service.

**Where it is coupled:** 38 of the 59 files in `scripts/` (generators, packagers, verifiers, the lesson-reading QA runners) are content tooling that reads `frontend/src/content` or `frontend/public/…`, and CI makes 22 `verify-*` invocations against them. Moving content to a private location moves that tooling with it ([`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md) §2.4).

---

## 7. Backend

| Item | Today | Class | Phase |
|---|---|---|---|
| `api/v1`: `accounts`, `admin`, `feedback`, `dependencies` | account states, owner approval, feedback | 1 | – |
| `api/v1/content.py` | public catalogue endpoints + authenticated lessons / quizzes / labs / artifacts | 2 | P3: `quizzes` currently returns the `correct` index and `explanation` to approved learners, so items and keys must separate |
| `api/v1/attempts.py` | stores a digest, `grading_status = "unverified"`, no score; the frontend never calls it | 2 | P3: server graders |
| `api/v1/progress.py` | `GET /progress`; **writes only via import of local progress** | 2 | P4: direct write endpoint; remove import |
| `services/rewards.py`, `XpEvent`, `AchievementAward` | server XP ledger | 4 | P4 / P6 |
| Legacy `/api` routers `content`, `learning_paths`, `pcaps` | `/api/modules`, `/api/learning-paths`, `/api/platform` (catalogue, duplicates `/api/v1/content/*`); `/api/pcaps/*` serve capture analysis **anonymously** | 2 / 4 | consolidate the catalogue routes; move captures behind authentication (P3) |
| Legacy `GET /api/content/{module}/{lesson}` | **returned full lesson text with no authentication** | 4 | **Removed on this branch**, with a regression test |
| Unmounted routers `auth`, `enterprise`, `labs`, `progress` | dead files | 4 | P3 cleanup |
| Models `UserProfile`, `PlatformAdmin`, `PlatformSettings`, `AdminAuditEvent`, `ProgressRecord` | – | 1 / 1 / 1 / 1 / 2 | `ProgressRecord` extends |
| Migrations `…_02_account_table_rls`, `…_03_feedback` | enable RLS with no `anon`/`authenticated` policies; `…_03` also revokes the default grants | 1 | the pattern to reuse for content tables |
| New | content schema, assessment items with keys, competency states, evidence | 5 | P3–P7 |

### Anonymous API surface, measured

All 25 `GET` routes in the OpenAPI schema, requested with no credentials (sample ids filled in):

| Result | Routes |
|---|---|
| **200, catalogue metadata (intended)** | `/api/modules`, `/api/modules/{id}`, `/api/learning-paths`, `/api/learning-paths/{id}`, `/api/platform`, `/api/v1/content/catalog`, `/api/v1/content/paths/{id}`, `/api/v1/content/modules/{id}/overview` |
| **200, practice captures (to move behind auth)** | `/api/pcaps`, `/api/pcaps/{id}/analyze`, `/api/pcaps/{id}/frames` |
| **200, lesson text — fixed on this branch** | `/api/content/{module_id}/{lesson_id}` (5 KB per lesson) |
| 401 | all of `/api/v1/account`, `/admin/*`, `/attempts`, `/progress`, and `/content/lessons`, `/quizzes`, `/labs`, `/artifacts` |

---

## 8. Tests, QA and CI

| Item | Impact | Phase |
|---|---|---|
| `access-matrix.test.mjs` (201 lines) | pinned the old tier model (modules 01–06, "not a security boundary", `Preview Curriculum` labels). **Rewritten in P1.** It also had a harness bug: a root-level `after` called `process.exit(0)` before the last test ran, so that test never executed and could not fail CI | P1 (done) |
| `account-states.test.mjs` (509 lines) | renders each state and asserts per-state copy: **copy rewritten in P1; the states themselves change in P4** | P1 (done), P4 |
| `learning-journey`, `secondary-pages` (12 progress-store references each) | adapt to server progress | P4 |
| `api-resilience` | keep; extend for new endpoints | P3–P4 |
| `admin-console`, `feedback-reliability`, `dense-workflows`, `motion-system`, `responsive-foundations`, `shared-controls`, `tour-contract` | keep (tour contract updates with the tour) | – |
| 22 browser scripts | per-script API stubs; nearly all open guest routes; 9 assert local progress. `scripts/lib/ui-audit-fixtures.mjs` (approved-learner lesson fixture) is a stopgap | P4: authenticated end-to-end stack |
| 38 of 59 `scripts/` files, 22 `verify-*` CI invocations | content tooling that reads content under `frontend/` | P3.5: retarget to the protected authoring area in this same repository |
| CI | `frontend`, `backend`, `secrets`, 3 × browser, `postgres-concurrency` | add leak check, content verification, end-to-end stack |

---

## 9. Repository structure and open decisions

The repository-level split, with every top-level path and all 59 scripts assigned, is in [`CONTENT_PIPELINE.md`](CONTENT_PIPELINE.md) §2. In summary:

| Destination | What |
|---|---|
| **Application repository** | frontend and backend code, the importer and schemas, the generated public catalogue and the two samples, fixtures, 21 scripts, platform docs, `tools/browser-qa`, `assets/`, deployment files |
| **Protected authoring area (inside this existing repository after it becomes private)** | 99 lessons, items and answer keys, lab instructions, reviewed protected artifacts, `content/`, `android-labs/`, the instructor key, content-aware scripts, `tools/android-triage`, `tools/wireless-qa`, and the Android demo workflow; exact migration scope is governed by `content/migration/CONTENT_MIGRATION_MANIFEST.json` |
| **Decide** | `reference/*.json`, the report template, the local lab stack under `docker/` |
| **Housekeeping** | `NextTaskForYou`, `VisualUpdates`, `requirement.md`, `mobile/README.md` |

The open decisions that change these classifications are in the plan §12.

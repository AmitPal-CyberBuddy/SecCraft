# SecCraft — Product, access model, and frontend UX redesign

> **Status:** analysis + implementation record for the static-first → backend-enhanced frontend evolution.
> **Scope:** frontend, information architecture, access model, account/profile/settings structure, navigation, dashboards, landing page, visual system.
> **Out of scope (unchanged by design):** FastAPI service, Supabase Auth configuration, PostgreSQL schema/migrations, Alembic head, RLS, deployment.
> **Repository is the source of truth.** Where documentation and code disagreed, the code won and the disagreement is noted.

---

## 0. Audit of the existing implementation (what is actually there)

### Routing (`frontend/src/App.tsx`)

| Route | Layout | Notes |
|---|---|---|
| `/` | `PublicLayout` | Public homepage |
| `/about`, `/how-it-works` | `PublicLayout` | |
| `/login`, `/signup`, `/account`, `/reset-password`, `/update-password` | `PublicLayout` | Supabase email redirect target is `/account` — **must keep this path stable** |
| `/app` (+ `/dashboard` → redirect) | `Shell` | Guest workspace / dashboard |
| `/paths`, `/paths/:pathId`, `/modules`, `/modules/:id`, `/labs`, `/challenges`, `/engagement`, `/reference`, `/reports`, `/settings`, `/progress`, `/achievements`, `/daily` | `Shell` | Learning surface |
| `/admin` | `Shell` | **Owner console rendered inside learner chrome** — a finding, see §16 |
| `*` | `Shell` | 404 |

Findings: no `/profile` route exists; there is no auth-aware route guard anywhere; `publicRoutes` is a hard-coded `Set` of paths (not prefix-aware, so `/account?x=1` is compared against `location.pathname` only — acceptable but brittle).

### Authentication state — the central gap

`frontend/src/lib/supabase.ts` exports a lazily-created client and `supabaseConfigured`. **`frontend/src/lib/api.ts` attaches a bearer token for account routes.** But there is **no reactive session store anywhere in the app**. Consequences found in the real code:

- `pages/Account.tsx` performs a one-shot `getSession()` + `GET /api/v1/account` on mount, inside a `useEffect`. It is the only place account state is ever read.
- `components/layout/Topbar.tsx` hardcodes an identity chip: the literal text `Operator`, a `ACTIVE` badge, and `guest-first • sync optional`. It is **always** shown, regardless of whether anyone is signed in. This is the single most misleading element in the product.
- `components/layout/Sidebar.tsx` is a static list. It contains **no Profile entry, no Account entry, and no sign-out**.
- No component anywhere reacts to `onAuthStateChange`.

### Local persistence

- `store/useProgressStore.ts` — Zustand + `persist`, key `platform-progress`, schema version 5, with a normalization/migration path from `wififorge-progress`. XP, level, streak, achievements, and per-module/path percentages are all **derived locally**.
- `components/profile/LocalProfile.tsx` — a guest **display name** in `localStorage` under `platform-profile`. It is explicitly documented as *not* an identity and *not* a role (it discards any legacy self-declared role on read). This is correct and must be preserved.
- `components/security/LocalDataPanel.tsx` — measures real `localStorage` usage against a known key list. Honest.

### Backend surface (read from `backend/app/api/v1/`)

| Route | Who may call it |
|---|---|
| `GET /api/v1/public-config` | public |
| `POST /api/v1/auth/signup` | public, gated by owner `signup_enabled` + rate limit |
| `GET /api/v1/account` | any verified token; returns `user_id, email, account_status, is_admin, created_at, reviewed_at` |
| `GET /api/v1/progress` | `active_profile` (active, or admin) |
| `POST /api/v1/progress/import/preview` and `/import` | `active_profile`; imported rows are always `verified=false` and award 0 XP |
| `GET/POST /api/v1/attempts` | `active_profile`; always `grading_status=unverified` |
| `/api/v1/admin/settings`, `/admin/users`, `/admin/users/{id}/status`, `/admin/audit` | `admin_identity` — the server `platform_admins` allowlist |

Server enforcement that the frontend must respect and must never re-implement: `current_identity` (JWT + issuer/audience/expiry/subject, and a live email-confirmation check), `active_profile` (403 unless active/admin), `admin_identity` (403 unless allowlisted), the PostgreSQL settings-row lock that caps approvals, and the `imported_records_are_verified: false` guarantee.

### Screen inventory vs. the brief

Present: Home, About, How It Works, Login, Signup, Account Status, Reset Password, Update Password, Dashboard, Learning Paths, Path Detail, Modules, Module Detail, Labs, Challenges, Challenge Detail, Engagement/Assessments, Reports, Progress/Analytics, Achievements, Daily, Reference, Settings, Admin, 404.
**Missing:** a Profile screen, a dedicated Progress Sync/Import screen (the panel is buried inside Settings), a Local Data screen (also buried in Settings), an Account State screen (a fragment of `/account`).

### Documentation vs. code discrepancies

1. The brief calls `/app` "Dashboard". It exists; `/dashboard` merely redirects. Fine.
2. `/admin` shares learner chrome — contradicts "admin experience is separate".
3. `pages/Account.tsx` labels the "Guest profile" concept nowhere; the guest display name is presented inside **Settings**, which is the wrong home for it.
4. `components/offline/OfflineIndicator.tsx` asserts *"Back online — nothing to sync (all progress is local)"* — inaccurate once an approved account exists.

---

## A. Access matrix

`LOCAL` = browser only. `SERVER` = PostgreSQL via the API. `DERIVED` = computed in the browser. `IMPORTED` = transferred from another device/file and never trusted.

| Surface | A Public | B Guest | C Pending | D Approved | E Rejected | F Suspended | G Owner | Data source |
|---|---|---|---|---|---|---|---|---|
| Homepage | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | static |
| About / How it works | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | static |
| Learning paths / Path detail | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | static (API w/ static fallback) |
| Modules / Lessons / Knowledge checks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | static |
| Labs / Challenges / Engagement | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | static + bundled captures |
| Reports / Reference / Achievements / Daily | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `LOCAL` + `DERIVED` |
| Progress / Analytics | ✅ | ✅ | ✅ | ✅ (account tier shown alongside) | ✅ | ✅ | ✅ | `DERIVED` (+ `SERVER` for D/G) |
| Guest workspace `/app` | ✅ via CTA | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `LOCAL` |
| Local progress / XP / level / streak | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `LOCAL` + `DERIVED` |
| Profile (guest display name) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `LOCAL` |
| Settings (appearance, a11y, local data) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `LOCAL` |
| Progress import/export (file) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `LOCAL` ↔ file |
| Account status `/account` | sign-in prompt | sign-in prompt | ✅ | ✅ | ✅ | ✅ | ✅ | `SERVER` |
| Password recovery | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Supabase |
| **Server progress (`GET /progress`)** | ❌ | ❌ | ❌ 403 `account_pending` | ✅ | ❌ 403 | ❌ 403 | ✅ | `SERVER` |
| **Progress merge into account** | ❌ | ❌ | ❌ 403 | ✅ | ❌ 403 | ❌ 403 | ✅ | `SERVER` (rows stay `verified=false`) |
| **Assessment attempt record** | ❌ | ❌ | ❌ 403 | ✅ (unverified) | ❌ 403 | ❌ 403 | ✅ (unverified) | `SERVER` (always unverified) |
| Admin console | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `SERVER` |

**Purpose of restriction:** the only true restrictions are the ones the **server** already enforces. Everything else is open. Account creation is never required to learn.

## B. User-state journeys

```
PUBLIC ──"Explore as guest"──▶ GUEST ──"Request account"──▶ (email verify) ──▶ PENDING
   │                            │                                                        │
   │                            │◀────── full guest learning, always ───────────────┐      │
   │                            │                                                      │   ▼
   └──"Log in"──────────────────────────────────────────────────────────▶ PENDING ──owner──▶ APPROVED
                                                                                          │
                                                                    APPROVED ──import──▶ (rows stay unverified)
```

- **Public visitor** — sees Home/About/How it works, reads path and module detail, opens the guest workspace. Primary CTA: **Explore as guest**. Account CTAs are present but equal-weight, never blocking.
- **Guest** — everything above plus local progress, XP, streaks, notes, evidence vault, checklists, reports, export/import of a local progress file. Account value stated in one line: *an approved account keeps a server-side copy and a real approval state.* Nothing is removed.
- **Pending** — full guest learning retained. Banner: "Email verified — waiting for owner approval." Next action: *nothing to do; keep learning / export progress.* Sync panel shows the server's 403 in plain language, not a stack trace.
- **Approved** — gains `GET /progress`, import/merge, attempt records. Dashboard gains a server snapshot (verified vs. unverified counts, server XP ledger) *beside* the local numbers, never replacing them. Cross-device restoration is **not** automatic and is not claimed.
- **Rejected** — full guest learning retained. Banner explains the request was not approved and that public learning is unaffected.
- **Suspended** — full guest learning retained. Banner explains the account is suspended; account-backed sync is unavailable.
- **Owner** — a separate console with its own chrome, reachable only from the account screen. Non-owners get an explanatory "owner access required" state, never a broken table.

## C. Navigation model

**Public chrome** (`PublicLayout`): SecCraft · Learning Paths · How it works · About → *Log in* · *Request access* · **Explore as guest**. When a session already exists the two account buttons collapse into **Open workspace** + an account state chip, so a signed-in owner is never asked to sign in.

**Learner chrome** (`Shell` → `Sidebar`), state-aware:
- Guest: Dashboard, Learning Paths, Modules, Labs, Challenges, Daily, Achievements, Progress, Engagements, Reference, Reports — then an **Account** group (Profile, Settings, Progress sync) and, when signed in, **Account status** and **Sign out**.
- Approved: same, with the Account group showing the real status and a sync state chip.
- Pending / Rejected / Suspended: same learning groups (unchanged), with the account entry carrying a warning-toned state chip, plus **Continue as guest** and **Sign out**.
- Owner: an additional, visually separated **Owner** group with a single *Owner console* link. Owner controls never appear inline in the learner list.

Sections collapse to a single flat list on mobile. No duplicated or contradictory entries — in particular, Profile and Settings are distinct, and the owner console has exactly one entry point.

## D. Profile / account model

Deliberate separation. The guest display name is **not** renamed into an account.

**Profile** (`/profile`, inside the learner shell):
- *Guest branch*: local display name + an explicit statement that it is browser-only, is not an identity, and grants nothing.
- *Account branch*: email, account status, member since, review date, account id, sync state, verified vs. imported record counts, and the honest statement that the account does not currently receive XP or certificate credit.
- Both branches: sign in / sign out, password recovery link, link to Progress sync.

**Settings** (`/settings`): appearance (theme), accessibility, keyboard shortcuts, runtime/storage facts, local-data management (measure, export, reset), progress import/export file controls, and account links (change password, sign out) — but **not** the display name and **not** the account status narrative.

## E. Settings model

1. Appearance — dark / light / system.
2. Accessibility — preserved `AccessibilityPanel`, lazy-loaded.
3. Local data — preserved `LocalDataPanel` (real measurements, no invented audit trail).
4. Progress file — export/import of the browser record (moved to `/sync` as the primary surface; a summary link remains here).
5. Account — only when signed in: email, status, change password, sign out.
6. Runtime facts + reset progress.

## F. Guest dashboard model

Priority order: **continue learning** → current module progress → recent local activity (real timestamps only, with a designed empty state) → current path → labs/challenges/reports quick actions → local progress metrics, each labelled `Local`. An account prompt appears **once**, as a single quiet card, never as a banner across the top.

## G. Approved dashboard model

Same skeleton, plus:
- an **Account snapshot** card: server record count split into verified / imported-unverified, server XP ledger total, achievement awards, last check time;
- a **Sync state** indicator that reflects the true model: *"Manual — nothing is sent automatically. Export a file and import it on the other device."*
- a **next action** derived only from real data: the first incomplete lesson of the current module, else the first incomplete lab, else the module list.

## H. Progress / sync model

| State | Meaning | UI |
|---|---|---|
| Local | browser-only record | `Local` chip, always |
| Server-synced | rows the account holds | `Account` chip, with verified/unverified split |
| Imported / unverified | rows that arrived via `POST /progress/import` | `Imported` chip, never counted as proof |
| Verified activity | `verified=true` rows only | `Verified` chip, the only one allowed to read as server-confirmed |

Explicitly: **no automatic background sync, no automatic cross-device restore, no push of local completions.** The merge flow keeps the existing preview → confirm contract, including the `0 XP` guarantee and verified-row preservation. `/sync` becomes a first-class screen; the same component still mounts in Settings as a compact summary so nothing is lost.

## I. Landing page structure

1. Hero — what SecCraft is, the current path, guest-first CTA, second CTA, two trust facts (no account needed · local by default).
2. Journey rail — Public → Guest → Pending → Approved, each with what it unlocks and what it does not.
3. What hands-on means here — modules / labs / challenges / assessments, with real counts from `content/stats.ts`.
4. The current path — Wireless Pentesting, with honest status: available now; the other catalogue entries are shown as *planned, not yet authored*.
5. Optional accounts — what an account adds (approval state, server-side record, multi-device transfer) and what it does not (no certification, no accreditation, no leaderboard, no live range).
6. Close — Explore as guest, and Request access as the quieter option.

## J. Screen-by-screen redesign plan

| Screen | State | Purpose | Primary CTA | Redesign |
|---|---|---|---|---|
| Home | public | explain + route | Explore as guest | full rewrite |
| About / How it works | public | explain model | Start as guest | refreshed, journey added |
| Login / Signup | public | account entry | submit / send verification | reworded states, honest error copy |
| Account status | any signed-in | state of record | continue learning / owner console | full rewrite |
| Reset / Update password | any | recovery | send / update | minor copy |
| Dashboard | all | what next | continue | state-aware rewrite |
| Learning paths, path, modules, module, lessons | all | learn | continue | unchanged (content is correct) |
| Labs / Challenges / Engagement | all | practise | run | unchanged |
| Reports / Reference / Achievements / Daily / Analytics | all | reflect | — | unchanged; `Local` labelling added where XP is shown |
| Profile | all | identity | sign in | **new** |
| Progress sync | all | local ↔ account | preview merge | **new route**, existing panel preserved |
| Settings | all | preferences | save | restructured |
| Local data | all | browser record | export / reset | kept, moved out of the settings header |
| Admin | owner | approve / cap / audit | approve | separate chrome + full status filter |

## K. Data ownership map

| Datum | Class | Source |
|---|---|---|
| Guest display name | `LOCAL` | `localStorage: platform-profile` |
| Lesson/lab/quiz/challenge completions | `LOCAL` | `localStorage: platform-progress` |
| XP, level, streak | `DERIVED` | computed from the local store |
| Module/path/overall percentages | `DERIVED` | computed from local + `content/` denominators |
| Notes, bookmarks, evidence vault, checklists | `LOCAL` | `localStorage` |
| Account email / id / status / `is_admin` | `SERVER` | `GET /api/v1/account` |
| Account progress rows | `SERVER` | `GET /api/v1/progress` |
| Server XP ledger, achievement awards | `SERVER` | `GET /api/v1/progress` |
| Assessment attempts | `SERVER` | `GET /api/v1/attempts` (always `unverified`) |
| Rows merged from a file | `IMPORTED` | `source = local_import`, `verified = false` |
| Signup availability | `SERVER` | `GET /api/v1/public-config` |
| Approved count / capacity / audit | `SERVER` | `/api/v1/admin/*` |

**One source per fact.** Local numbers are never restated as account numbers. No screen invents activity, achievements, or "live" statistics.

## L. Backend-aware interactions

- `GET /public-config` on load → drives "Request access" availability and the signup form. Failure degrades to a quiet "unavailable, continue as guest" note; it never blocks the app.
- `GET /account` on session change → drives the state chip, banner, and account surfaces. Failure degrades to a *transient* state that still allows learning.
- `GET /progress` only for approved/owner → the dashboard's account snapshot. Failure is contained to that card.
- Admin endpoints only ever run on the admin route.

Every one of these is strictly presentational. `is_admin` from the client is used **only** to decide which console link to render; the API independently rejects every non-owner call.

## M. Visual design direction

The existing identity (deep navy field, cyan/violet/emerald signal colours, instrument-panel cards, restrained grid canvas) is good and is **kept**. It evolves along four axes:

1. **State as a visual channel.** A new `--state-*` token set (public, guest, pending, active, rejected, suspended, owner) drives a single `StateChip` component, so account state is legible by colour *and* by label, never by colour alone.
2. **A progression rail.** The journey (public → guest → pending → approved) is a recurring visual device on the landing page, the account screen, and the pending/rejected/suspended banner, giving the product a continuous spine instead of a login bolt-on.
3. **Provenance chips.** `Local` / `Derived` / `Imported` / `Account` chips appear next to any number whose source could otherwise be misread.
4. **Purposeful motion.** The existing `layoutId` active-nav indicator, `AnimatedCard` reveal, `ProgressRing`, `PointsToast`, and page transitions are preserved. New motion is limited to: state-chip transitions, banner reveal, sync-status pulse while a request is in flight, and landing-page scroll reveal. Reduced-motion continues to be honoured by the existing global rule plus `MotionConfig reducedMotion="user"`.

Explicitly avoided: matrix rain, hooded figures, random neon, particle fields, gratuitous glow, and animated counters for their own sake.

## N. Components / files affected

**New**
- `frontend/src/lib/access.ts` — user states, capability matrix, provenance tokens, copy blocks (pure, no React)
- `frontend/src/lib/session.tsx` — reactive auth + account + API-reachability store
- `frontend/src/components/account/StateChip.tsx`
- `frontend/src/components/account/AccountBanner.tsx`
- `frontend/src/components/account/AccountSummaryCard.tsx`
- `frontend/src/components/layout/AdminShell.tsx`
- `frontend/src/pages/Profile.tsx`
- `frontend/src/pages/Sync.tsx`
- `docs/PRODUCT_UX_REDESIGN.md` (this file)

**Modified**
- `frontend/src/main.tsx`, `frontend/src/App.tsx`
- `frontend/src/components/layout/Sidebar.tsx`, `Topbar.tsx`
- `frontend/src/components/public/PublicLayout.tsx`
- `frontend/src/components/offline/OfflineIndicator.tsx`
- `frontend/src/pages/PublicHome.tsx`, `PublicInfo.tsx`, `Account.tsx`, `Dashboard.tsx`, `Settings.tsx`, `Admin.tsx`
- `frontend/src/components/progress/ProgressSyncPanel.tsx` (compact variant)
- `frontend/src/index.css` (state tokens + a few utility classes)

## O. What remains unchanged

Learning content and its files; `store/useProgressStore.ts`; `AnimatedCard`, `SubtleEffects`, `ProgressRing`, `ContinueCard`, `LoadingPanel`, `ErrorBoundary`, `OfflineIndicator` behaviour, `LocalDataPanel`, `AccessibilityPanel`, `SecurityPosture`, `GlobalSearch`, `KeyboardShortcuts`, `GuidedTour` targets; every lab, challenge, engagement, report, evidence, certificate, terminal, PDF, and reference component; `lib/api.ts` request semantics and timeouts; the whole backend.

## P. Priorities

**Critical (Phase A)** — user-state model, access-aware navigation, profile/account structure, settings responsibilities, public/guest/account distinction.
**Important (Phase B)** — landing page, dashboard, account pages, progress/sync screen, admin separation.
**Later (Phase C)** — visual polish, micro-interactions, exhaustive empty/loading states, responsive edge cases.

## Security boundary (re-confirmed)

The frontend is not an authorization boundary and is not made one. No gate added here hides or grants data: the API independently validates the JWT, email confirmation, profile status, and owner allowlist on every call. `is_admin` from `/api/v1/account` only selects which link is rendered. No role, classroom, or instructor concept is introduced. No `VITE_*` value other than the public Supabase URL/anon key and the API origin is required, and no real secret is committed.

## Known limitations, stated honestly in the UI

- Progress is not synchronized automatically and is not restored automatically across devices. The UI says so.
- Imported rows are never verified and never award XP or a certificate. The UI says so.
- Assessment attempts are recorded but not graded by any trusted server rubric. The UI says so.
- Cross-device restore is a manual export → import step.

---

# Implementation record

## What was built

### Foundation (Phase A)

- **`src/lib/access.ts`** — the whole product model in one pure module: the seven user states, the capability matrix, state→presentation metadata, the data-provenance table, and the reusable copy. No network calls, no authorization.
- **`src/lib/session.tsx`** — `SessionProvider`, the missing piece. Subscribes to `onAuthStateChange`, reads `/api/v1/account` and `/api/v1/public-config`, tracks API reachability, and exposes `can()`. Every lookup is bounded by a timeout and degrades to guest rather than breaking the page.
- **`src/components/account/StateChip.tsx`** — `StateChip` and `ProvenanceChip`, both always carrying a text label.
- **`src/components/account/AccountBanner.tsx`** — the state banner, plus the owner notice.
- **`src/components/layout/navModel.ts`** — navigation as data, so the sidebar and search cannot drift apart.

### Core UX (Phase B)

- **Navigation** — `Sidebar` and `Topbar` are state-aware. The hardcoded `Operator / ACTIVE / guest-first • sync optional` identity chip is gone; identity is now derived from the real session. The topbar has a single, keyboard-operable account menu. `PublicLayout` collapses its account CTAs into a state chip plus "Open workspace" when a session exists.
- **Dashboard** — rewritten around one question, *what should I do next?* The recommendation is derived from real data: first unfinished lesson → first unfinished lab → next challenge → next module. Added a real next-step card, an account snapshot for approved users, `Local`/`Derived`/`Imported`/`Account` chips on every figure whose source could be misread, and one quiet account-value card instead of a banner.
- **Landing page** — rewritten: hero, journey rail (visitor → guest → approved → account-backed), the four practice surfaces, the current path with an honest "not built yet" list, and an explicit "what an account adds / does not add" section.
- **Profile (`/profile`)** — new. Guest branch (local display name, explicitly not an identity) and account branch (email, status, member since, sync summary), kept deliberately separate.
- **Progress sync (`/sync`)** — new first-class screen. Separates Local / Account / Imported before showing any control. The existing `ProgressSyncPanel` is reused unchanged as the import/export/merge surface.
- **Account status (`/account`)** — rewritten on the shared session, so sign-in/out and owner approval are reflected immediately. Every state states what happened, what you can do, and what still works. `/account` is preserved as the Supabase email callback target.
- **Settings** — restructured. The guest display name moved to Profile; import/export moved to Sync; Settings keeps appearance, accessibility, local data, and account links.
- **Admin** — moved into its own `AdminShell` chrome with a non-owner explanation screen, plus capacity reporting and full status filtering (pending / active / rejected / suspended / all) with reactivate.

### Polish (Phase C)

- `--state-*` design tokens in `index.css`, flipped for light mode.
- Offline notice rewritten — it previously asserted "nothing to sync (all progress is local)" unconditionally, which is false for an account.
- `GlobalSearch`: "Dashboard" pointed at `/` (the public homepage) instead of `/app`; fixed, and Profile / Progress sync / Account status added.
- The new pages are route-split, so most sessions never download them.

## Bugs found and fixed

1. **Infinite render loop in `Settings`** (pre-existing). `useProgressStore(s => s.getXpToNextLevel())` returns a fresh object on every call; Zustand compares snapshots by identity, so the page re-rendered until React threw *"Maximum update depth exceeded"*. Fixed by deriving from the two stable primitives, exactly as `Topbar` already did. This was caught by the new render test, not by the type checker or the build.
2. **Misleading identity chip** (pre-existing). The topbar always rendered `Operator` and an `ACTIVE` badge regardless of session state.
3. **Wrong search destination** (pre-existing). "Dashboard" navigated to `/` rather than `/app`.
4. **False offline claim** (pre-existing). The notice stated nothing was ever synchronized, regardless of account state.

## Verification performed

| Check | Result |
|---|---|
| `npm test` | 16/16 pass (was 1) |
| `tsc -b` | clean |
| `npm run build` | passes |
| `oxlint` on changed files | 0 errors |
| Main bundle | 527 kB → 559 kB (+32 kB) for the whole product layer; Profile 16 kB, Sync 21 kB, Admin 15 kB split out |
| All 11 redesigned/new pages render | pass |
| All 7 account states render correct copy | pass |
| Learner nav intact in all 7 states | pass |
| Guest learning with the backend fully down | pass |
| Owner console content not rendered to a non-owner | pass |
| Responsive: 375 / 834 / 1440 / 1920 | pass, with the correct drawer/sidebar switch at the 1024 px breakpoint |
| Backend files modified | none (`git diff backend/` is empty) |
| New `VITE_*` variables or secrets | none |

The access-matrix and account-state suites are negative-tested: inverting an assertion makes them fail, so they are not vacuous.


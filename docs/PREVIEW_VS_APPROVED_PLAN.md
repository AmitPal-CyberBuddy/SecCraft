# Preview vs Approved Learner — revised access model

> **Superseded (2 October 2026).** This Preview/Full model is replaced by the public-catalogue /
> authenticated-learning model in [`ACCESS_AND_LEARNING_MODEL.md`](ACCESS_AND_LEARNING_MODEL.md).
> *Preview* is no longer an access tier (it is a content-maturity label), and lesson text is no longer
> public. Kept as a record of the earlier decision and of what was built for it.

Supersedes the "guest is a first-class learner, only profile/sync differs" model in
`PRODUCT_UX_REDESIGN.md`. The plan is in §1–§8 below; §9 records what was implemented.

---

# 9. Implementation record

## Decisions taken

- **Cut line:** modules `01`–`06` are the Preview Curriculum (phase 1–2). `07`–`20` are the Full
  Curriculum. Derived from the existing `phase` field — **no content JSON was edited**, and a
  regression test pins the derived set to exactly those six ids.
- **Practice gamification:** kept, labelled. `Practice — unverified` chips, never `Account record`
  on a browser-local number. No reset of existing local progress.
- **Rejected / suspended:** treated as preview users. They keep public learning and a local practice
  record; account-backed functionality stays unavailable.
- **Certificates:** disabled for every state. The `certificate` capability is `[]` in the matrix.
- **No backend change.**

## Terminology enforced

The product uses **Preview Curriculum**, **Full Curriculum**, and **Continue with an approved
account**. A test asserts the string `CONTENT_TIER_NOTE` contains none of *securely locked*,
*protected content*, *cannot be accessed*, *encrypted*, and that it *does* say "not a security
boundary". `CONTENT_NOT_ENFORCED_NOTE` is shown wherever the boundary appears.

## What changed

**New**

- `src/lib/contentAccess.ts` — tiers, the `01`–`06` derivation, `TIER_COUNTS`, and the two honesty
  notes. An unparseable `phase` resolves to `full`, so a bad record can never widen the preview.
- `src/components/account/PracticeStanding.tsx` — `StandingChip` and `PracticeStandingNotice`.
- `src/pages/Modules.tsx` — curriculum-tier panel, per-card `PREVIEW` / `FULL` markers, and the
  "Continue with an approved account" CTA. The existing unused `locked` prop was deliberately
  **not** reused: a lock overlay would claim protection that does not exist.
- `src/components/certificate/Certificate.tsx` — split into `Certificate` (capability check) and
  `CertificateDocument` (the original, now unreachable). Re-enabling is a one-line matrix change.

**Reworked** — `Dashboard` (tier chip, practice-vs-record split, the 0-awarded ledger note),
`Profile` (preview identity, "what an approved account changes"), `Account` (curriculum row),
`PublicHome` + `PublicInfo` (preview CTAs, practice labelling), `PublicLayout`/`Topbar`/`Sidebar`
("Preview learner", "Continue with an account"), `Sync` (practice vs server XP side by side),
`OfflineIndicator`, `Reports`, `LevelBadge`, `KeyboardShortcuts`, `Achievements`, `Analytics`,
`Daily`.

**Unchanged** — all content JSON, all backend code, `useProgressStore` (still the local practice
cache), reference material, labs, challenges.

## Two bugs the new tests caught

1. **Local XP was labelled "Account record" for approved users.** `standingFor(state)` describes
   whether the *account* holds a record, not the provenance of a browser-local number. Using it on
   the local XP card produced a false claim for exactly the users it mattered most to. A local
   figure is now hard-coded `standing="practice"`.
2. **The approved Achievements page showed a bare "0 XP" with no marker at all**, because
   `PracticeStandingNotice` returned `null` for approved states. It now renders for every state:
   the local figures are practice whether or not an account exists.

## Verification

| Check | Result |
|---|---|
| `npm test` | 9/9 (rewritten for the reversed model) |
| `tsc -b` / `npm run build` | clean |
| `oxlint` | 99 warnings, 0 errors (was 100) |
| Modules / Dashboard / Profile / Achievements / Certificate / Sync | render in both guest and approved states |
| Banned-claim sweep across `src/` | clean (hits are pre-existing security *content*) |
| `git diff backend/` | empty |
| Content JSON modified | none |

The access-matrix suite now also asserts the cut line is still `01`–`06`, that `phase` may be a
string, that an unparseable phase resolves to `full`, that the learner set is exactly the six
non-owner states, and that no state's summary mentions a certificate.

## Still outstanding (documented, not built)

1. **Content entitlement** — the real gate. Needs an entitlement field, authenticated content
   endpoints, and content served from the API. Out of scope; see §6.
2. **A trusted grader** — nothing awards verified XP, so every account ledger reads 0. The UI says
   this plainly rather than showing a misleading 0.
3. **Browser/assistive-technology testing** — still not possible here (Playwright Chromium will not
   install). Structure and responsive layout are verified via JSDOM; paint and real AT behaviour
   are not.

---

## 1. What I verified before proposing anything

These are facts from the current tree, not assumptions.

| Question | Finding |
|---|---|
| Is there an entitlement/tier/premium concept? | **No.** Not in the backend, not in the content JSON. |
| Is content served publicly? | **Yes.** `/api/modules`, `/api/learning-paths`, `/api/platform`, `/api/pcaps` are mounted at `/api` with **no auth dependency** (`backend/app/main.py`, explicitly commented "read-only public static/catalogue routes"). |
| Is content in the public JS bundle? | **Yes.** `frontend/src/content/modules.json` is imported directly by the Vite build. All 20 modules and 27 lessons are in `index-*.js`. |
| Is there a server gate today? | **Yes, and it is good.** Every `/api/v1/progress/*` and `/api/v1/attempts/*` route depends on `active_profile`, which 403s unless `account_status == 'active'` (`backend/app/api/v1/dependencies.py:164`). |
| Can a client forge XP or achievements? | **No.** `ProgressItem` is `extra="forbid"` and accepts no points, no timestamps, no `verified` flag, no `source` — only `state: started\|completed`. The code comment says so. XP is returned as `{"source": "server ledger"}`. |
| **Does anything actually award verified XP?** | **No.** `award_verified_xp` / `award_achievement` are called **only from `backend/tests/test_api_contract.py`**. No live endpoint awards them. So `GET /progress` returns `xp.total = 0` for every user today. |

### The load-bearing consequence

**`GET /api/v1/progress` already enforces "approved only" and already returns a
server-owned XP figure — but that figure is always 0, because nothing awards it yet.**

So if I simply made XP account-gated in the UI, every approved learner would see
**0 XP**, because their real XP has been living in `localStorage` the whole time.
That would be a visible regression and a dishonest screen. The UI must show both
figures, clearly separated, until a trusted grader ships.

---

## 2. Revised access matrix

| Surface | Public visitor | Guest / local | Pending | **Approved** | Rejected / Suspended | Owner |
|---|---|---|---|---|---|---|
| Landing, About, How it works | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Learning path catalogue (titles, descriptions, objectives) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Module + lesson **preview** (objectives, skills, structure) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Preview curriculum** — a defined subset, full reading | ❌ | ✅ preview | ✅ preview | ✅ **full** | ✅ preview | ✅ full |
| Practice in preview subset (labs/challenges, unscored) | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Progress written to an account | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Server-authoritative records** | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| **Verified XP ledger** | ❌ | ❌ | ❌ | ✅ *(structurally; 0 until a grader ships)* | ❌ | ✅ |
| Account-backed achievements | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Assessment attempts | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Import / export / merge | ❌ | ✅ local only | ❌ | ✅ | ❌ | ✅ |
| Entitlement / premium surface | ❌ | ❌ | ❌ | ✅ *(read-only display)* | ❌ | ✅ |
| Owner console | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Rejected and suspended** keep the preview experience deliberately. Revoking
learning on suspension would be a product decision, not a technical one, and the
API already declines their progress calls.

---

## 3. What remains public

Deliberately unchanged — this is the discovery surface that converts.

- Landing, About, How it works
- Full learning-path catalogue: titles, difficulty, estimated hours, objectives, skills
- Module list with structure, lesson titles, and prerequisites
- One defined **preview curriculum**, fully readable
- Selected labs and challenges, playable but unscored and unattributed
- Public reference material (commands, filters, checklist, methodology)
- The entire account/approval story, so a visitor can understand what they'd be joining

## 4. What becomes account-gated

**Tier 1 — enforced by the backend today, frontend only reflects the result:**

- All progress reads and writes → `active_profile` already 403s
- Assessment attempts → already 403s
- Import / merge → already 403s
- Account-backed achievements → already server-owned

**Tier 2 — product framing only, NOT enforcement (must be labelled as such):**

- The difference between the preview subset and the full curriculum
- Entitlement / premium badges

Tier 2 is a **product boundary, not a security boundary.** I will not present it as
one, and the UI will say so. See §6.

## 5. What must become server-authoritative

Ordered by what already exists:

1. ✅ **Progress records** — enforced today
2. ✅ **Verified XP ledger** — the *read* path is enforced and returns a server figure; the *write* path has no live caller
3. ✅ **Achievements** — server-owned table, enforced
4. ✅ **Assessment attempts + grading status** — enforced, no live grader
5. ⬜ **Content entitlement** — does not exist. Requires backend work (see §6)
6. ⬜ **Certificates** — the frontend has a certificate component driven by local XP. It must be disabled for everyone until the XP ledger and a verifier exist

**Local state is downgraded, not deleted.** `localStorage`/Zustand persists as a
*practice cache* — it keeps a visitor's place across sessions and offline. It is
never presented as XP, achievement, unlock, or completion of record.

## 6. The constraint I cannot engineer around

**No amount of frontend work makes bundled content ungated.** All 20 modules ship
inside `index-*.js` today, and `/api/modules` is unauthenticated. Hiding a lesson
behind a client-side check would be exactly the "hidden with client-side checks"
pattern that must not happen.

Real content gating requires backend work, which this task excludes:

- an `entitlement` / `content_visibility` field on content
- authenticated content endpoints, with the public ones serving only the preview subset
- the full catalog served from the API rather than bundled

**What I propose instead:** ship the Preview/Approved *product model* now, mark the
content boundary as non-enforcing in the code and the UI, and land the gating in
the same later pass that moves content server-side. I would rather under-claim than
ship a lock icon that a visitor can defeat with the browser console.

## 7. Screens and components affected

**New / rewritten**

- `lib/access.ts` — add a **content tier** (`preview` | `full`) orthogonal to user state, plus a `CONTENT_GATED_HONESTY` note reused wherever the boundary is shown
- `lib/contentAccess.ts` — new: which modules/lessons are preview, derived from existing `content_status` / `difficulty` / `phase` fields. **No content JSON changes.**
- `pages/PublicHome.tsx` — preview CTA becomes "Explore the preview curriculum", not "Start learning"
- `pages/Dashboard.tsx` — split semantics: guest sees a *practice* score; approved sees the account record and the server ledger side by side
- `pages/Profile.tsx` — preview vs approved identity
- `pages/Account.tsx` — pending state explains the preview they're in and what approval unlocks
- `components/account/AccountBanner.tsx` — pending shows the unlock list

**Adjusted**

- `layout/navModel.ts`, `Sidebar`, `Topbar` — gate entitlement-gated destinations
- `components/gamification/*`, `pages/Achievements.tsx`, `Analytics.tsx`, `Daily.tsx`, `certificate/Certificate.tsx`, `pdf/ReportPdfExport.tsx` — these 17 files read local XP/level/streak and currently present it as the user's real standing
- `pages/Modules.tsx` — preview/full marking
- `offline/OfflineIndicator.tsx` — local cache wording
- `lib/useServerProgress.ts` — surface the "0 awarded" reality rather than a blank

**Unchanged:** content JSON, all backend code, `stores/useProgressStore.ts` (still
the local practice cache), reference material, labs, challenges, scenarios.

**Tests:** `tests/access-matrix.test.mjs` and `tests/account-states.test.mjs` need
rewriting — they currently assert the "guest learns everything" model, which this
change deliberately reverses.

---

## 8. Decisions needed

1. **Where is the preview cut line?** My recommendation is below.
2. **Certificates and achievements** for non-approved users: hide entirely, or show as
   clearly-labelled practice milestones with no award? I recommend show-as-practice,
   because hiding the gamification entirely removes most of the preview's appeal.
3. **Does a rejected/suspended user keep the preview experience?** I recommend yes.

### Recommended cut line

Using fields that already exist, no content edits:

| Tier | Modules | Basis |
|---|---|---|
| Preview | `01`–`06` (6 of 20) | Phase 1–2, `content_status: brief` |
| Full | `07`–`20` (14 of 20) | Phase 3–6, authored and assessment material |

Plus: all public reference material, and 3–4 labs/challenges as unscored preview
practice.

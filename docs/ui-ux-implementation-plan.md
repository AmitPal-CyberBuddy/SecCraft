# UI/UX implementation tracker

Approved scope: [responsive review](ui-ux-responsive-review.md).

## Phase 1 — Foundations
Status: implemented; automated checks passed; visual/device validation pending.

- [x] Theme-paired filled-action foreground for workspace, public homepage, sync, recovery and tour controls. Declared foreground/background contrast covered by regression tests.
- [x] Remove duplicate dashboard account banner; shell remains the single owner. Preserve account-state and record-provenance messaging.
- [x] Measure global header height with ResizeObserver and a resize fallback; disconnect on unmount. Resolve the sticky offset on the shell where the measured height is set.
- [x] Move lab scoring, reference search and reading rails off fixed 64/80px offsets; use shared anchor margins.
- [x] Disable workspace header/rail stickiness on short landscape viewports.
- [x] Increase shared navigation and action touch sizing; use 16px mobile workspace/account input text and a 16px minimum lesson text base.
- [x] Derive About-page availability statements from the curriculum catalogue.
- [x] Add responsive-foundation regression tests to the normal test command.
- [ ] Browser checks: 320–1920px, short landscape, zoom, both themes, wrapped experience header and banner-eligible account states.

Validation on 2026-09-30:
- `npm run build --prefix frontend`: passed.
- `npm test --prefix frontend`: 26 passed, zero failures.
- `npm run lint --prefix frontend`: zero errors, 95 warnings (not a warning-free baseline).
- `git diff --check`: passed.
- No browser executable installed; previous Chromium download failed. Source-contract and contrast tests are not a substitute for rendered layout checks.

## Phase 2 — Shared design system
Status: shared foundation and first page migrations implemented; automated checks passed; visual/device validation pending.

- [x] Shared `ViewSwitcher`: full labels, wrapping layout, 44px controls, visible focus and `aria-pressed` state. Ordinary button-group semantics intentionally preserve native Tab/Enter/Space behavior rather than claiming ARIA tab semantics without tabpanel wiring.
- [x] Adopt view selector in Reports, Labs and Reference, retaining available tools and path-specific visibility/counts.
- [x] Shared `TextField`: visible associated label, hint/error IDs, preserved external descriptions, invalid and disabled states. Adopted for Reference search.
- [x] Shared `Notice`: theme-aware info/success/warning/error surfaces; static guidance remains a note, asynchronous feedback explicitly announces status/errors. Adopted for Account feedback and Reports guidance.
- [x] Extend Panel with an opt-in surfaced variant and EmptyState with a recovery action. Reference empty results now provide a working clear-search-and-filters action.
- [x] Adopt shared headers in Analytics, Achievements, Daily, Reports and Reference; surfaced panels in Analytics, Achievements and Daily.
- [x] Migrate summary-page surface/text colors directly to semantic tokens and increase small summary text. Deeper embedded tools remain scheduled for their workflow phases.
- [x] Search dialog uses dynamic viewport sizing and safe-area padding; activity drawer gets safe-area padding. Existing focus handling retained; overlay interaction validation remains pending.
- [x] Shared animation wrappers bypass animation under reduced motion; lesson and back-to-top programmatic scrolling read the current OS preference at action time. Existing MotionConfig remains in place for other animations.
- [x] Add real rendered-component tests for view selection, labels/descriptions, validation states, notices, panel/empty-state composition and scroll motion preference.

Validation on 2026-09-30:
- Production build passed.
- Full test suite: 27 passed, zero failures.
- Lint: zero errors, 88 warnings. This is not a warning-free baseline.
- `git diff --check`: passed.
- Browser screenshots, actual keyboard/touch behavior and device layouts remain unverified. JSDOM assertions do not measure CSS layout.

Remaining page-specific adoption follows Phases 3–5; this phase establishes and exercises the shared components rather than mechanically restyling every tool at once.

## Phase 3 — Core learning journey
Status: core implementation complete; automated checks passed; visual/device validation pending.

- [x] Compact dashboard introduction preserves Preview/Full state presentation and provenance without repeating the longer account explanation.
- [x] Next actions link directly to the authored lesson, exact lab or challenge. Next-module recommendations remain within the selected path and react to lesson completion.
- [x] Recent activity uses authored titles instead of internal identifiers.
- [x] Path start/resume action precedes extended context, distinguishes first-time learning and highlights the current phase.
- [x] Module and challenge catalogue search/filter state lives in URL parameters; clear-all preserves unrelated parameters. Search edits replace the current history entry; discrete filters create navigable entries.
- [x] Module tabs and lesson selection are URL-driven and validate requested values against available content. Invalid items fall back safely without recording completion.
- [x] Exact lab links select only the requested available module lab, with a Show all module labs escape action. Android source-clinic links remain supported.
- [x] Opening a module updates both current module and learning path; dashboard no longer pairs an unrelated stored module with the selected path.
- [x] Consolidated reading-width controls, visible lesson titles, current-lesson state, explicit complete-and-continue labels, and a next-section fallback when a module has no labs.
- [x] Associated all 12 wireless lab-answer labels with unique input IDs. Cancel stale markdown loads and delayed lesson-anchor scrolling on navigation.
- [x] Lab catalogue/search precedes an expandable artifact/download inventory; existing PCAP query links keep that inventory open.
- [x] Challenge draft-save/error feedback is visible. Challenge sessions are keyed by ID so moving to another challenge cannot write the previous challenge’s answers into its draft.
- [x] Added rendered route tests for an Android exact-lab link and back/forward, catalogue query restoration and clearing; helper tests cover lesson links for both paths, invalid targets and preservation of unrelated URL parameters. Source contract covers lab label associations.

Validation on 2026-09-30:
- Production build passed.
- Full test suite: 28 passed, zero failures.
- Lint: zero errors, 84 warnings (existing and remaining hook/style cleanup; not a warning-free baseline).
- Guest-tier regression caught by tests was corrected without weakening the test.
- Rendered tests use JSDOM/MemoryRouter: they verify state and DOM, not real browser layout, scroll positioning or device behavior. Some lazy-resource completions produce React act warnings; assertions still pass.
- Optional completed-phase collapsing and further mobile filter disclosures are deferred to the final responsive refinement pass, not claimed implemented here.

## Phase 4 — Dense workflows
Status: implemented; automated checks passed; rendered browser/device validation pending.

- [x] Shared technical-content primitives: copy with success/failure feedback, labeled locally scrolling code/table regions, and explicit workflow steps.
- [x] Reference commands/filters retain exact copyable text and scroll locally instead of breaking every character; supporting copy is larger.
- [x] Reports use explicit Edit/Preview controls and rendered Markdown preview. Editor stays mounted when another reporting tool is selected, preserving unsaved edits. Instructional cards moved into expandable help; existing Save/export feedback retained.
- [x] Report inputs, action groups, surfaces and preview content use readable sizing and theme tokens. Preview changes do not wait on an exit animation.
- [x] Progress sync shows Choose source → Review changes → Confirm transfer. Confirmation is inline and cancelable; source controls are disabled while reading/transferring; existing signature checks and server provenance rules remain unchanged. Successful transfer time is labeled as session-only.
- [x] Capture intake validates extension, non-empty files and a 50 MB per-file limit for both picker/drop. File read failures are visible, duplicate filenames have independent IDs, removal buttons are labeled, and hashes can be copied.
- [x] Evidence vault has visible text-field labels, storage/copy/read failure feedback, a file-size bound and named delete confirmation. Saved records initialize before persistence, avoiding the initial empty-state write. Only record metadata, not original files, is saved.
- [x] Terminal labels explicitly identify simulation, command entry and transcript. Output is viewport-bounded and scrolling stays inside it; copy failures are explained. Transcript uses an intentional dark surface.
- [x] PCAP inspector provides expandable frame cards below 680px and a labeled scrollable desktop table. Frame numbers are native inspection buttons with selection state; values are no longer truncated in the desktop table.
- [x] Assessment sections use URL state, shared view controls, next/previous navigation and focus/scroll to the new section. Collapsible sections expose expanded state. Wide assessment tables scroll locally. Section position is explicitly not a completion grade.
- [x] Added rendered workflow tests: clipboard success/denial; edit/preview and cross-tool draft retention; source preview/cancel/confirmed import payload; invalid/oversized/unreadable captures; same-name file removal; saved evidence retention and labels; frame selection; and terminal control semantics.

Validation on 2026-09-30:
- Production build passed.
- Full test suite: 29 passed, zero failures.
- Lint: zero errors, 80 warnings; warning-free cleanup is not claimed.
- `git diff --check`: passed.
- Tests use JSDOM and API fixtures. They do not verify actual mobile layout, viewport/keyboard behavior, downloads in real browsers or live account-service integration. These remain on the Phase 5 validation checklist.

## Phase 5 — Secondary pages and responsive QA
Status: implementation and automated browser QA complete; real-device/live-service release validation remains open.

- [x] Public entry/recovery copy, mobile-first account form order, readable form surfaces and retained security disclosures.
- [x] Single analytics summary, current-path module rows, readable weekday chart values and future-date filtering.
- [x] Readable earned/upcoming milestones and daily tasks before metrics, with useful destinations and missed-day reassurance.
- [x] Profile/supporting preferences use semantic surfaces and readable copy.
- [x] Settings sections, accessible theme selection, separated destructive actions and cancelable reset confirmation preserving unrelated data.
- [x] Reading controls have meaningful states, apply globally and restore from browser-local preferences. Removed unsupported certification and screen-reader-toggle claims.
- [x] Owner loaded-record search, no-results recovery and visible approval-disabled reasons. Server/API authorization and limits unchanged.
- [x] Real-browser findings fixed: narrow dashboard header, lab wrapping, light/dark contrast, bookmark naming, keyboard handshake selection, local code/table scrolling and skip-link focus.
- [x] Repeatable optional Playwright layout/axe and keyboard/theme smoke scripts, without new application dependencies.
- [x] Secondary-page regressions and expanded owner/skip-link assertions.
- [ ] Real mobile devices, actual browser zoom, assistive-technology review and live account/service states. See the explicit backlog in `ui-ux-phase5-validation.md`.

Validation on 2026-09-30:
- Production build passed; 31 regression tests passed; lint 0 errors / 75 warnings; diff whitespace check passed.
- Broad browser geometry pass: 348 route/width/theme checks across six widths. Final narrow pass after contrast fixes: 58 route/theme checks, no detected overflow, page errors or axe violations. Additional intermediate-width pass: 32 checks, no geometry/page errors.
- Keyboard/theme smoke passed, including landscape report switching, skip-link focus, menu focus return, search focus, reset cancellation, system-theme changes and 640px CSS reflow.
- Screenshots were captured and representative samples inspected. This is headless Chromium with offline API fixtures, not physical-device or full accessibility certification.
- Reproduction instructions, scope, chronology and release-validation limitations: `docs/ui-ux-phase5-validation.md`.

Execution policy: complete focused implementation slices, run regression checks, and update this tracker. No reapproval required for the approved scope. Do not claim later phases or device verification complete until actually performed.

## Phase 6 — Reliability and feedback (approved extension)
Status: feedback implementation, report/motion hardening and CI configuration delivered; deployment validation and broader lint cleanup remain open.

Implemented on 2026-10-01:
- [x] `/feedback`: guest/optional-auth submission, category, subject/message, optional reply email/path, sensitive-data guidance and security-reporting link.
- [x] Session-only drafts, retry-stable UUIDs, receipt validation and rate-limit countdown without clearing entered text.
- [x] Shared database hour/day account and network quotas, IPv6 /64 normalization, HMAC keys, atomic rollback, concurrent retry deduplication and strict request/body limits. No device fingerprinting.
- [x] Owner-only `/admin/feedback` inbox: keyset pagination, filters, safe plain text, internal notes, four review statuses, optimistic version checks and private-text-free audit events.
- [x] SQL migration, PostgreSQL RLS/no-public-role access, configurable retention purge command and deployment documentation in `docs/FEEDBACK.md`. Purge scheduling is an operator responsibility.
- [x] Data-router navigation guard for unsaved reports and owner reviews, including Back/Forward and programmatic navigation; native hard-exit protection retained.
- [x] Worked-example fetch cancellation and stale-edit protection, verified with delayed-response regressions.
- [x] Local reduced-motion preference governs Framer Motion configuration and JavaScript scrolling, including scroll helpers that previously hard-coded smooth behavior.
- [x] Pinned optional browser tooling, responsive/axe, keyboard, feedback and owner-fixture CI smoke jobs with report/screenshot artifacts.
- [x] Disposable-schema PostgreSQL CI migration/RLS/concurrency job extended to feedback quotas. Configured, not locally executed.

Validation:
- TypeScript/Vite production build passed.
- Frontend: 32 tests passed. Backend: 31 passed, 1 skipped (PostgreSQL requires a separately configured test service). Backend concurrency tests ran on SQLite; they are not proof of PostgreSQL execution.
- SQLite Alembic upgrade → downgrade → upgrade passed.
- Browser route/theme matrix: 32 checks across 320/1440 and dark/light; no detected overflow, page errors or axe violations after fixing a desktop public-header contrast finding.
- Real Chromium feedback flow: failed request, 429, reload/draft recovery, retry receipt; delayed worked-example race; Back cancellation and saved exit; persisted local motion preference all passed.
- Owner inbox browser fixture: 320/1440 × dark/light passed plain-text safety, stale-save preservation, review success, geometry and axe checks. The fixture intercepts identity/API responses; no live owner privileges were granted.
- Existing keyboard/theme/landscape smoke passed. Route verifier: 70 internal destinations checked against 48 SPA routes.
- Lint: zero errors, 78 warnings, including remaining effect-pattern warnings. Broad lint remediation is not claimed complete.
- `git diff --check` passed. GitHub-hosted CI and live PostgreSQL/provider integration have not run in this workspace.

Release prerequisites: migrate the deployed database, configure `FEEDBACK_HMAC_SECRET` consistently across workers, verify trusted proxy client addresses and edge abuse controls, schedule the retention command, and exercise live guest/account/owner flows. Real-device and assistive-technology limitations from Phase 5 still apply.

## Approved color direction — Graphite + Teal pilot
Status: shared foundation and representative-page preview implemented; exhaustive legacy component migration remains a follow-up.

- Neutral graphite/slate surfaces and text; theme-paired teal actions.
- Explicit action/hover/pressed, link, control-border and semantic-status roles.
- Stronger functional outlines, restrained decorative separators and theme-aware lesson syntax colors; intentional terminal dark palette preserved.
- Build and 33 frontend tests passed. Final pilot browser matrix: 32 checks with no overflow/page-error/axe findings; populated owner fixture: four checks passed. Rendered color-state smoke passed in both themes.
- Actual screenshot comparison: `docs/design/graphite-teal-preview.png`. Scope and validation: `docs/color-system-pilot.md`.
- No claim of full removal of the hard-coded-color inventory or accessibility certification.

## Full-platform color migration — completed 2026-10-01

Expanded the approved Graphite + Teal pilot across the remaining source consumers. Replaced 2,347 literal color utility uses across 55 TSX files, removed obsolete palette/light overrides, added semantic status/data roles and a regression guard. Rendered testing also fixed mobile quiz radio shrinkage, keyboard access for cards and scroll regions, and activity-drawer clipping; recon provenance is labeled accurately.

Validation: build passed, frontend 34/34, lint 0 errors/78 warnings; 124 default-route combinations, 52 populated component/state combinations and 4 owner-inbox combinations passed. Rendered action-state and keyboard smoke passed. Full scope, reproduction, deliberate exceptions and limits: [full audit](color-system-full-audit.md). CI configured, remote run not claimed.

## Purposeful motion — Phase 1 completed 2026-10-01

Implemented live motion policy and bounded shared recipes, responsive control feedback, scoped desktop navigation continuity, wrapped view indicators, contextual search/activity entrances and success-only copy feedback. Removed result/entry stagger from search and Activity, kept dismissal immediate for focus safety, and added independent OS/local reduction plus capability-aware behavior.

Validation: build passed; 36 frontend tests; lint 0 errors/78 warnings; 14 motion-enabled screen/theme cases, 36 representative reduced-motion route combinations and 52 populated component/state checks passed. Action-state contrast and keyboard smoke passed. CI configured, remote run not claimed.

This is the first motion phase, not a completed platform-wide animation redesign. See [motion plan](motion-system-plan.md) for implementation, explicit limits and the learning → technical tools → secondary-surface rollout.

## Purposeful motion — Phase 2 completed 2026-10-01

Completed learning continuity: stationary lesson/quiz content, persistent flashcard focus and immediate answer reveals, real-value-only progress, new-completion-only acknowledgement, inline quiz validation and a focused summary clear of the sticky header. Mobile lesson choice transfers focus into reading; reading controls are scoped to lessons.

Final validation: production build; 37 frontend tests; lint 0 errors/76 warnings; 84 learning-state checks across 28 screen/theme/motion cases; 14 shared-motion regression cases; 24 representative route combinations; keyboard smoke. The existing 52-state component runner also passed during the phase. Remote CI not run; physical-device and comprehensive accessibility certification not claimed.

Details and known independent test flake: [learning motion report](motion-learning-phase2.md). Next planned phase: technical tools and evidence/data transitions.


### Motion phase 3 — technical tools and evidence (completed 2026-10-01)

Purposeful selection markers replace whole-panel/text movement in recon, packet inspection, handshake/configuration, terminal, evidence and report tools. Packet filters retain controls/focus and distinguish pending, applied and previous data, with cancellation/stale-response guards. Report preview preserves the editor's DOM and selection; evidence deletion restores focus. Technical forms reflow without the file-input intrinsic-width overflow found during this phase.

Validation: 39 frontend tests/build pass; lint 0 errors/73 warnings; 140 technical-state checks across 28 combinations, 84 learning-state checks, 14 shared-motion cases, 52 populated component cases, 24 route combinations and keyboard smoke pass. CI runner configured; remote CI unexecuted. See [full implementation and limits](motion-technical-phase3.md). Next is motion phase 4 for secondary/public and owner surfaces.


### Motion phase 4 — public, secondary and owner surfaces (completed 2026-10-01)

Completed the four planned motion phases. Public/overview content is stationary, progress reflects actual values without count-up introductions, and newly recorded local events receive a short checkmark. Account, owner and error states update immediately. Added paused/identity-safe toast expiry, fixed connectivity expiry and shortcut focus/typing behavior, and retired generic looping/stagger effects.

Validation: build + 41 tests pass; lint 0 errors/70 warnings. Secondary 84, technical 140 and learning 84 state checks; shared motion 14; populated components 52; routes 80; mocked owner feedback 4; keyboard smoke all pass. See [implementation, reproduction and limits](motion-secondary-phase4.md). Remote CI and physical-device/assistive-technology/performance certification remain unverified.

### Product polish pass 1 — 2026-10-01

Implemented local pattern-aware password estimation and consistent suggestions; refined pointer/keyboard input focus; removed the redundant reading panel and replaced three width modes with an explained Focus reading toggle. Simplified optional accessibility settings. The homepage now leads with both available paths, 22 challenge titles are task-based, and selected public/account implementation notes were removed without hiding account failures or practice provenance.

Build/41 tests pass; lint 0 errors/70 warnings; 64 new product states, 84 learning states, 40 route combinations, keyboard and color-state checks pass. See [implementation and remaining scope](product-polish-pass1.md). Next: path-neutral workspace/context defaults and the remaining learner-facing copy audit; the entire repositioning is not yet complete.

### Product polish pass 2 — completed

Delivered shared multi-path scope across the workspace and catalogues, neutral first visits and reset, version-7 choice migration, consistent sidebar/reference context, scoped lab initialization, and targeted selection/result/destination feedback. No blanket page fades or reading/tool motion. See `docs/product-polish-pass2.md` for exact scope and limitations.

Verified: production build; 41 frontend tests; 66 path-scope/browser check groups; 84 learning checks; 64 product-polish checks; keyboard/theme/reflow smoke; lint 0 errors / 70 pre-existing warnings; diff whitespace check. New scope runner added to CI; remote CI and external preview reachability not asserted.

### Formal motion-system consolidation — completed

Adopted `docs/motion-interaction-system.md` as the component/workflow standard. One authored token JSON now drives generated CSS and JS recipes with freshness tests. Removed conflicting duration overrides and legacy glow naming, normalized compact progress timings, reused LearningProgress for workspace meters, added a bounded earned-toast entrance with immediate dismissal, removed pulsing route-loading dots, and exposed real busy states on asynchronous actions. Reading/evidence/forms remain stationary; no artificial processing states, ambient loops or blanket page transitions.

Verification: build; 43 frontend tests; 16 new motion-contract combinations; 14 shared cases; 84 secondary, 84 learning, 140 technical and 66 path-scope check groups; keyboard smoke. Lint 0 errors / 70 existing warnings. Browser scope and evidence limitations are recorded in the motion-system document.

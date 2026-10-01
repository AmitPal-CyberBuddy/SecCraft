# Motion phase 4 — public, overview and owner surfaces

Completed 2026-10-01. This implements the fourth planned [motion-system phase](motion-system-plan.md), with regression checks across the earlier learning and technical work. It is not a claim of exhaustive device or accessibility certification.

## Behavior by area

### Public entry, paths, dashboards and account state

- Public copy/curriculum remain stationary. Contextual public links gain a short underline-color response on hover/focus; primary actions retain the shared fine-pointer-only feedback. No hero loops, drifting backgrounds or count-up totals.
- Removed whole-section fades, list stagger, travelling cards and large hover scales from overview, settings, account, path, lab/challenge, reference, assessment and related secondary components.
- Account state/provenance information updates immediately. Removed the keyed status-chip entrance; authentication and approval semantics are unchanged.
- Legacy page-transition/stagger exports remain compatible composition wrappers, without replayed introductions on navigation/history. Removed the unused perpetual float/ping/shimmer helper module, custom Tailwind animation recipes and unused skeleton animation.
- Final inventory leaves Framer at the shared policy, destination marker, progress component, search, activity and shortcut dialog—not across every content card.

### Progress, analytics and achievement feedback

- Level, compact XP, curriculum, checklist and module-progress indicators reuse `LearningProgress`: correct on first render, transform-only when the actual value changes, immediate in reduced/paused modes. Numeric labels never count up.
- Weekly history bars render their actual existing geometry immediately rather than growing from zero with a stagger. Local provenance remains visible.
- Corrected “modules not started” to use the selected path's module count, not the platform-wide total. No scoring rules changed.
- LevelBadge now uses decorative Lucide icons rather than depending on platform emoji fonts. Visual review found missing emoji glyphs in the audit browser.
- XP feedback uses one small checkmark, not a bouncing/scaling card. The live region exists before text arrives and explicitly labels progress browser-local/unverified. The toast is bounded on short screens and dismisses immediately.
- An eight-second dismissal pauses while hovered, focused or the document is hidden. Restarting after interaction gives a fresh reading interval. Expiry is tied to the exact event so a stale callback cannot clear a newer one. Explicit dismissal restores focus when the toast held it.
- Existing persisted-state normalization clears transient earned events on hydration; it is tested rather than replaying celebrations from old records. Certificate issuance remains disabled.

### Activity, connectivity and keyboard help

- Removed the recurring unread-dot pulse; activity still uses the bounded shared panel behavior from phase 1.
- Connectivity notices are immediate. Reconnect timers are cleaned up on offline/unmount, preventing an old reconnect notice from dismissing a newer offline warning. A browser `online` event no longer claims the account service has been verified reachable or that progress was uploaded.
- Keyboard help uses a native modal dialog for background inertness/focus containment and the shared opaque, bounded entrance recipe. Escape/dismissal are immediate; focus and body scrolling restore on close. The scrollable reference is keyboard-focusable.
- Navigation shortcut prefixes no longer run inside inputs, textareas, selects, editable content or other dialogs. Composition/modifier/repeat keys are ignored; a single listener uses an expiring prefix rather than orphaned next-key listeners.
- Removed advertised single-letter shortcuts that were not implemented. The shortcut launcher no longer overlaps the scroll-to-top control and has a 44 px target.

### Owner and authoring workflows

- Kept owner tables, policy/save/error status and conflict notices stationary. Added only background/border feedback to owner action/confirmation controls. Real request spinners remain; no fake approval/connection animation.
- Removed residual decorative authoring effects. Existing stale-save handling, unsaved data, policy limits, authorization gates and public/private feedback boundaries are unchanged.
- Audited remaining `transition-all` usages in source and replaced them with scoped background/border feedback. Disclosure chevrons use shared timing for their meaningful open/closed rotation.

## Validation

| Check | Final result |
|---|---|
| Production TypeScript/Vite build | Passed |
| Frontend tests | **41 passed** |
| Lint | **0 errors; 70 warnings remain** |
| Whitespace check | Passed |
| New secondary interaction matrix | **84 state checks / 28 screen-theme-motion combinations passed** |
| Technical interaction regression | **140 state checks / 28 combinations passed** |
| Learning interaction regression | **84 state checks / 28 combinations passed** |
| Shared-motion regression | **14 cases passed** |
| Existing populated component runner | **52 combinations passed** |
| Representative routes | **80 combinations; no detected overflow/runtime/axe issues** |
| Mocked owner-feedback workflow | **4 screen/theme combinations passed** |
| Keyboard/theme/short-screen regression | Passed |

The secondary matrix uses 320×740, 390×844, 768×1024, 844×390, 1024×768, 1440×900 and 1920×1080, each in dark/light and normal/OS-reduced motion. Captured states are populated local progress/XP feedback, public entry and the shortcut dialog. Additional assertions cover duplicate completion, stable toast DOM, hydration without replay, browser history, typing without navigation, native modal focus/escape and return focus. A real browser clock checks focused-toast expiry and rapid online→offline events.

A deterministic frontend test additionally invokes an old expiry callback after a newer event: the new event survives. It tests focus-paused expiry and immediate dismissal/focus return. Source contracts guard against decorative stagger, fake state pulses, zero-to-total progress introductions and unsupported connectivity claims.

### Problems found during validation

- The shortcut launcher was covered by scroll-to-top after scrolling: separated their placement.
- The shortcut reference could scroll without a keyboard target: added a named, focusable region.
- A test originally recorded non-catalog lesson IDs; normalization correctly discarded those records on reload. The fixture now records existing authored lesson IDs and waits for the actual achievement event before asserting hydrated values. No production normalization was weakened.
- Narrow and desktop screenshots were reviewed. The selected-path count mismatch and missing emoji glyphs were corrected as described above.

Results/screenshots are ignored under `.cache/ui-audit/secondary-motion`, `secondary-routes` and `secondary-owner`. The new matrix runs in browser CI; the job timeout is now 35 minutes. Remote CI has **not** been run.

## Reproduce

Start a root-base preview:

```sh
VITE_BASE=/ npm run dev --prefix frontend -- --host 0.0.0.0
```

Then:

```sh
npm run build --prefix frontend
npm test --prefix frontend
npm run lint --prefix frontend
export UI_AUDIT_MODULES="$PWD/tools/browser-qa/node_modules"
node scripts/ui-secondary-motion-smoke.mjs
node scripts/ui-technical-motion-smoke.mjs
node scripts/ui-learning-motion-smoke.mjs
node scripts/ui-motion-smoke.mjs
node scripts/ui-keyboard-smoke.mjs
node scripts/ui-color-components-smoke.mjs
UI_AUDIT_OUTPUT=.cache/ui-audit/secondary-owner node scripts/ui-feedback-owner-smoke.mjs
UI_AUDIT_ROUTES='/,/about,/how-it-works,/login,/signup,/app,/paths,/paths/wireless-pentesting,/paths/android-pentesting,/modules,/labs,/reference,/engagement,/reports,/settings,/profile,/analytics,/achievements,/daily,/admin' \
  UI_AUDIT_WIDTHS=320,1440 UI_AUDIT_AXE=1 \
  UI_AUDIT_OUTPUT=.cache/ui-audit/secondary-routes node scripts/ui-responsive-audit.mjs
```

This sandbox used external Chromium (`UI_AUDIT_EXECUTABLE=/tmp/chromium`, `LD_LIBRARY_PATH=/tmp/al2023/lib`). No application runtime dependency was added. The `secondary` fixture is dev-only and records test activity in its isolated browser context, not a remote account.

## Limits

The four implementation phases are complete with the representative cross-phase checks above. Physical devices, assistive-technology usability, real browser zoom, GPU/FPS/energy profiling, live identity/provider behavior and comprehensive WCAG certification remain unverified. Owner-browser tests mock identity/API responses and do not prove production authorization; existing backend controls were not changed. PostgreSQL, live parsers, actual PDF exports and remote CI were not rerun for this UI phase. Existing unrelated lint warnings and the previously documented randomized password-strength test mismatch remain outside this work; the final test suite passed.

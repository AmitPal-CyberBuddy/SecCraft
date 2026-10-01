# Purposeful motion system

2026-10-01 · Graphite + Teal continuation · **Phases 1–4 implemented; representative cross-phase validation complete**

## Direction

Premium means predictable, responsive and specific to the job. Motion should explain **where something came from**, **what changed**, or **whether an action completed**. It must not make a learner wait, move reading content underneath them, imply live data, or turn every surface into a competing focal point.

Use existing Framer Motion for shared-layout continuity and contextual panel positioning; use CSS for small interaction feedback. No new runtime animation dependency was added. More sophisticated machinery is appropriate only when it improves continuity or comprehension—not because it looks expensive.

### Rules

- Reading text, evidence and numeric labels are immediately available. Do not fade or count them up to suggest progress.
- Animate transform/translation for spatial continuity. A small background/border transition may acknowledge interaction; focus outlines and text colors update immediately.
- No blanket page entrance, scroll hijacking, parallax on lessons, tilt on technical cards, cursor-following lights, persistent particle canvases, ornamental loading loops or success confetti across the product.
- No animation gates a request, route change, focus transfer or action availability.
- Default timings: control 140ms, selection 180ms, panel 220ms. Compact/short screens shorten CSS controls to 100ms, selection to 140ms and panels to 160ms. Curves settle without spring overshoot.
- Use live capabilities, not device-brand or user-agent detection. Hybrid devices should get the conservative behavior of their primary pointer.
- Either OS **or** local reduced-motion preference disables the new positional animations. Turning local reduction off never overrides OS reduction.

## Phase 1 — foundation, controls and navigation (implemented)

| Area | Treatment | Why / responsive choice |
|---|---|---|
| Desktop main destinations | Scoped Framer shared-layout underline, 180ms | Tracks selection without moving text. No travelling marker for coarse input, compact/short screens or reduced motion. No initial entrance. |
| Shared view controls | Local underline transition | Works across wrapped button rows. Avoids a floating pill travelling diagonally over unrelated controls. Selected styling/semantics update immediately. |
| Primary actions | At most 1px upward hover feedback; no scale | Only fine-pointer, hover-capable, noncompact screens. Touch remains stationary with ordinary press/color feedback. Disabled controls cannot lift. |
| Inputs | Border response only | Text and focus rings remain sharp and immediate. |
| Navigation drawer | Bounded edge slide | Existing origin retained; 220ms desktop/160ms compact. Hidden navigation remains inert. |
| Search | Small vertical placement transition; dimming backdrop | 8px desktop/4px compact. Opaque content; search results have no entrance stagger or per-keystroke fade. Dismissal is immediate to match focus restoration. |
| Activity | Small horizontal placement transition | 16px desktop/4px compact; the panel stays within the viewport. Entries appear immediately. No exiting focusable subtree after dismissal. |
| Account menu | 4px placement transition | Top-right origin follows its trigger. Instant on compact/short screens. |
| Copy confirmation | Brief checkmark stroke after success | Does not announce success before the clipboard promise resolves. The existing text live region remains authoritative. Icon space is reserved inside the button. |
| Preferences | Shared live motion policy | Listens to OS motion, pointer capability, viewport/short-screen queries, local preference class and document visibility; subscriptions clean up. CSS animations pause when hidden. Adopted panel recipes become stationary when paused. |

`MotionPreferences` provides `useMotionPolicy` through `components/animations/motionPolicy.ts`. Recipes/timings live in `lib/motion.ts`; `styles/motion.css` is loaded after component/color styles. Consumers without a provider use a stationary fallback. LoadingPanel remains deliberately motion-free.

### Validation for this phase

- Production TypeScript/Vite build passed; **36 frontend tests passed**.
- Lint: **0 errors, 78 existing warnings**; whitespace check passed.
- **14 motion-enabled browser cases**: both themes × 320×740, 390×844, 768×1024, 844×390, 1024×768, 1440×900, 1920×1080. Includes emulated fine/coarse input, rapid destination changes, navigation/search focus, live OS/local reduction, resizing an open Activity panel, wrapped view indicators and copy-success feedback. Search receives axe checks in these cases. Clipboard success is mocked for deterministic UI validation, not proof of device permissions.
- **36 reduced-motion route combinations**: six representative routes (`/`, `/app`, module theory, `/reports`, `/settings`, `/feedback`) × 320/768/1440 × both themes; no detected overflow, runtime errors or axe violations.
- **52 populated component/state combinations** rerun successfully using the color QA runner.
- Existing rendered action-state/contrast and keyboard smoke checks passed.
- New unit/source contracts verify bounded panel recipes, quiet-mode behavior, capability guards, lifecycle cleanup and no result staggering.
- CI includes the new runner; a remote GitHub run was not executed here.

Reproduce with the same browser setup documented in `color-system-full-audit.md`:

```sh
npm test --prefix frontend
npm run build --prefix frontend
npm run lint --prefix frontend
node scripts/ui-motion-smoke.mjs
node scripts/ui-color-components-smoke.mjs
node scripts/ui-color-states-smoke.mjs
node scripts/ui-keyboard-smoke.mjs
UI_AUDIT_AXE=1 UI_AUDIT_WIDTHS=320,768,1440 \
UI_AUDIT_ROUTES='/,/app,/modules/08-wpa-wpa2?tab=theory,/reports,/settings,/feedback' \
node scripts/ui-responsive-audit.mjs
```

### Limits

This is a foundation and selected shared-surface rollout, **not a claim that all legacy animation has been redesigned**. Existing components with explicit animation settings can override shared defaults; they need individual review in the phases below. Background CSS pausing is implemented, but all legacy JavaScript animation loops have not been migrated or energy-profiled. Browser emulation is not physical-device, screenreader, battery, GPU or frames-per-second certification. Short-screen resize coverage is not a complete virtual-keyboard/device-safe-area test.

## Remaining inventory and planned phases

Post-phase-1 source inventory: 129 Framer element declarations in 46 TSX files, 17 `whileHover` declarations in 12 files, 9 `whileTap` declarations in six files, and 98 `transition-all` utilities in 23 files. The three explicit infinite repeats are in the currently unreferenced `SubtleEffects.tsx` exports; do not adopt those as the new system. Counts are review candidates, not proven defects or all runtime animations (CSS and data-driven variants also need inspection).

### Phase 2 — learning continuity (completed)

Review lesson navigation, reading preferences, completion acknowledgements, quizzes, flashcards and local progress together.

- Keep lesson prose and question text stable. Prefer selection continuity over fading the entire content panel.
- Tie completion feedback to the actual saved local result, with its unverified/local meaning intact.
- Review existing 3D flashcard flips against a short cross-state change on compact screens; respect local as well as OS reduction.
- Avoid large card scales, sticky hover transforms on touch and animated counters that disguise real totals.
- Check unanswered/submitted/retry states, keyboard traversal, rapid repeated actions and reflow with larger text.

### Phase 3 — technical tools and data (completed)

Review recon/AP selection, handshake steps, packet filters/details, configuration suggestions, evidence and report workflows.

- Use selection continuity and short detail reveals to connect an action to its evidence.
- Only animate chart/progress geometry when underlying data genuinely changes; labels update immediately. No pretend live network traffic or fake progress.
- Technical tables and code must not shift while being read or copied. Preserve scroll/focus and reduced-motion behavior.
- Test dense populated data, empty/loading/error outcomes, desktop tables versus mobile cards, and interrupted transitions.

### Phase 4 — public, secondary and achievement surfaces (completed)

Review public entry, path exploration, dashboards, profile/achievements, notifications/toasts and owner workflows.

- At most one intentional focal transition per area; do not cascade every card into view.
- A recorded achievement may get one short acknowledgement, not recurring glow or confetti. Errors must be immediate and calm, never a shake animation.
- Retire redundant float/shimmer/glow utilities and replace broad `transition-all` usage where the affected properties have been audited.
- Verify that scroll position, hydration, browser history and real authentication states do not replay inappropriate introductions.

### Final acceptance

For each phase: normal and reduced motion; dark/light; compact, tablet, desktop and short landscape; pointer and keyboard; genuine populated/error states; rapid repeat/interruption; no page overflow or focus regression. Add animation only when its communication benefit is clear, and remove it when the stationary version is better.


## Phase 2 implementation and validation — 2026-10-01

See [learning-motion implementation report](motion-learning-phase2.md). Lesson/quiz content no longer waits for outgoing panel fades or per-question stagger. Flashcards retain a single focused button, completion and deck progress reflect actual state, and quiz results use inline feedback and a visible focused summary. Later technical-tool and secondary-surface work remains outstanding.


## Phase 3 implementation and validation — 2026-10-01

See [technical-tools implementation report](motion-technical-phase3.md). Technical evidence now stays stationary; small selection rules connect actions to details. Packet refreshes preserve controls and identify previous/applied results, cancel superseded requests and ignore stale responses. Report previews preserve the editor DOM, evidence removal restores focus, templates use native selection controls, and method prompts no longer conceal readable text with blur.

Validation: 39 frontend tests and production build pass; lint has 0 errors/73 warnings; 140 technical checks across 28 combinations, 84 learning checks, 14 shared-motion cases, 52 populated component combinations, 24 representative routes and keyboard smoke pass. Phase 4 remains outstanding; this is not platform-wide motion completion.


## Phase 4 implementation and cross-phase validation — 2026-10-01

See [secondary/public implementation report](motion-secondary-phase4.md). Overview/account/owner content stays stationary; real progress changes use the shared transform-only indicator, new local events get one bounded checkmark, and public links retain contextual control feedback. Retired recurring decoration and blanket card/page entrances. Fixed notification dismissal races, connectivity-notice expiry, and shortcut modal/typing/focus issues.

Final checks: production build and 41 frontend tests pass; lint 0 errors/70 warnings; 84 secondary, 140 technical and 84 learning state checks, 14 shared-motion cases, 52 populated component combinations, 80 route combinations, four mocked owner-feedback combinations and keyboard smoke pass. All four planned implementation phases are now delivered. These are representative checks, not exhaustive device, performance, live-backend or WCAG certification; see the report's explicit limits.

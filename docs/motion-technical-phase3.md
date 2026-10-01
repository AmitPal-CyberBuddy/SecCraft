# Motion phase 3 — technical tools and evidence continuity

Completed 2026-10-01. Builds on the [shared motion system](motion-system-plan.md) and [learning phase](motion-learning-phase2.md). This finishes the technical-tools phase, not the platform-wide rollout.

## Design decisions

Evidence should be immediately readable, selectable and copyable. Movement belongs on a small selection indicator, not on packet rows, configuration text, terminal output or finding drafts.

- Replaced whole-panel fades, entrance staggers, detail scales, exit waits, large hover scales and decorative status pulses in the audited technical components with native, stationary content.
- Added a shared decorative selection rule. Only this small element is keyed to the selection; handshake/configuration detail containers stay mounted. Static borders, text and native `aria-pressed` states carry meaning independently.
- Reused the existing 140 ms control / 180 ms selection timing, with shorter compact timings. Decorative detail rules are stationary on compact/short screens, OS or local reduced motion, and paused documents. No new runtime effects dependency.
- Kept real work indicators, such as capture hashing and PDF generation. Did not introduce simulated scans, live traffic, progress estimates or animated totals.

## Implemented

### Packet inspection and recon

- Filter inputs and prior results stay mounted during a refresh. A polite status identifies the in-flight filter and the previously applied filter. Editing a draft does not relabel an already-running request.
- Previous frame results are inert and marked busy during refresh. Changing a filter clears selection; subsequent results cannot retain an unrelated selected frame.
- Cancel superseded requests and guard publication/finally against late responses. Recon requests also cancel on capture changes. Capture identity changes reset the component's state rather than briefly attaching old evidence to a new capture label.
- API and bundled-data failure after a successful result keeps the prior evidence, explicitly labels it unchanged, and offers retry. Initial loading/error states remain separate.
- An unsupported offline display filter explicitly says the bundled dataset is showing all frames. The applied-filter status and selected preset now say **All**, not that an unsupported filter was applied.
- Desktop frame selection retains trigger focus. An explicit **Go to selected frame details** control focuses/places the detail region; selecting a row alone does not scroll the reader. Closing details returns focus to the originating inspect button.
- Mobile native details track the current selection and clear when filtering. AP selection and frame details use only a small decorative rule, not animated evidence text.

### Handshake, configuration, method prompts and terminal

- Handshake steps use persistent detail content, native pressed states, an explicit control/detail relationship and a concise selection announcement. Removed the keyed whole-detail remount and outgoing-content wait.
- Configuration code stays in the same focusable element when toggling the original and illustrative suggestions. Selection is exposed with `aria-pressed` and `aria-controls`; the no-runtime-validation disclaimer remains.
- Method prompts use explicit collapsed text and expanded semantics instead of blurred answer text that remained accessible before reveal. Revealing a prompt is immediate, retains button focus and does not animate the surrounding content.
- Terminal history appears immediately; removed the simulated-ready status pulse. Existing simulation wording and command behavior are unchanged.
- Removed decorative motion from attack/defense/retest cards and lab completion wrappers. Did not change lab grading, timers, XP or evidence claims.

### Evidence and report workflows

- Evidence insertion/removal is immediate, with a concise list-change announcement separate from storage status. Confirmed deletion focuses the adjacent record's delete action, or the named empty list; capture removal/clearing returns focus to file selection.
- Narrow-screen testing found intrinsic file-input sizing expanding the evidence form. Explicit shrinkable grid tracks and bounded file inputs fix that overflow.
- Switching finding preview/edit preserves the editor DOM, text selection and draft. The inactive editor is hidden/inert. Code and data tables in the preview are keyboard-focusable; save and unsaved-change protection remain intact.
- Report templates are native keyboard-operable selection buttons. Closing a preview restores trigger focus. Removed the inactive “Use Template” button; these are still reference outlines, not automatically populated findings.
- Report pages, timeline and PDF result panels no longer fade/stagger their content. Existing local-storage, hash and unverified-draft wording is retained.

## Validation

| Check | Result |
|---|---|
| Production TypeScript/Vite build | Passed |
| Frontend tests | **39 passed** |
| Lint | **0 errors; 73 warnings remain** |
| Whitespace check | Passed |
| Technical interaction matrix | **140 state checks / 28 viewport-theme-motion combinations passed** |
| Learning regression | **84 state checks / 28 combinations passed** |
| Shared-motion regression | **14 cases passed** |
| Populated component regression | **52 combinations passed** |
| Representative routes | **24 combinations; no detected overflow, runtime or axe issues** |
| Keyboard/theme/short-screen smoke | Passed |

The technical matrix covers 320×740, 390×844, 768×1024, 844×390, 1024×768, 1440×900 and 1920×1080, each in dark/light and normal/OS-reduced motion. It checks five captured states per combination: pending filter, selected frame, technical selection, populated report preview and template selection. Additional assertions cover draft-versus-pending filters, empty filtered results, unsupported offline filters, local quiet styling, stable DOM/focus, evidence deletion and report selection/save preservation.

Added a deterministic frontend test with a fetch mock that deliberately ignores abort: a newer filter response wins even after an older request resolves. The same test checks API-plus-bundle failure and preservation of the previous result. Source contracts prevent reintroducing blanket fades, hover scales and decorative status pulses in these components.

Screenshots/results are ignored under `.cache/ui-audit/technical-motion`; representative screenshots were visually reviewed, including desktop packet selection and narrow technical/report states. The technical runner is included in the browser CI job, with its timeout increased to 30 minutes. Remote CI has **not** been run.

### Reproduce

Start the frontend with `VITE_BASE=/ npm run dev --prefix frontend -- --host 0.0.0.0`, then:

```sh
npm test --prefix frontend
npm run build --prefix frontend
npm run lint --prefix frontend

export UI_AUDIT_MODULES="$PWD/tools/browser-qa/node_modules"
node scripts/ui-technical-motion-smoke.mjs
node scripts/ui-learning-motion-smoke.mjs
node scripts/ui-motion-smoke.mjs
node scripts/ui-keyboard-smoke.mjs
node scripts/ui-color-components-smoke.mjs
UI_AUDIT_ROUTES='/modules/08-wpa-wpa2?tab=theory,/modules/08-wpa-wpa2?tab=lab&lab=lab-08-rsn,/modules/07-wep?tab=lab,/reports,/labs,/reference' \
  UI_AUDIT_WIDTHS=320,1440 UI_AUDIT_AXE=1 \
  UI_AUDIT_OUTPUT=.cache/ui-audit/technical-routes node scripts/ui-responsive-audit.mjs
```

This sandbox used externally installed Chromium with `UI_AUDIT_EXECUTABLE=/tmp/chromium` and `LD_LIBRARY_PATH=/tmp/al2023/lib`. Browser binaries are not repository dependencies. The new `packet` and `workflow` fixtures are dev-only entries outside the production build.

## Limits and next phase

- Browser checks use deliberate unavailable-API fixtures and bundled evidence, not production identities or a live parser. The hash-upload fixture tests synthetic bytes, not capture parsing. No backend or authorization behavior was changed.
- Real PDF downloads, PostgreSQL, live providers and remote GitHub checks were not integration-tested in this phase.
- Axe/viewport checks and screenshot review are not comprehensive WCAG certification. Physical devices, assistive-technology usability, browser zoom and GPU/FPS/energy profiling remain unverified.
- The earlier independent password-strength randomized-test mismatch is not resolved by this work; the final frontend suite passed.
- **Next: phase 4 — public/secondary pages, dashboards, paths, achievements and owner workflows**, followed by the cross-platform motion review. Preserve the restrained technical reading behavior established here.

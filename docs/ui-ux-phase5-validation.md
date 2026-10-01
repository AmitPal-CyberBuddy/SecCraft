# Phase 5 — implementation and browser validation

Date: 2026-09-30

## Delivery

- Account forms precede supplementary context on phones while retaining the two-column desktop composition. Public entry/recovery copy is shorter; account, provenance and security disclosures remain.
- Analytics has one summary rather than duplicate outer totals, current-path module rows, visible weekday XP values, full weekday labels and future-date exclusion.
- Milestones are grouped into earned and upcoming requirements; locked items remain readable and explicitly unverified. Daily tasks precede summary metrics, offer learning destinations and explain that missing a day does not erase learning.
- Settings has named jump destinations, selected-state theme controls, a separated reset section and cancelable inline confirmation. Reset preserves notes, drafts, local profile and theme. Reading preferences now have meaningful labels and pressed states, restore before rendering, and apply outside Settings. Removed hard-coded accessibility certification claims and the nonfunctional screen-reader-mode toggle; screen readers need no opt-in mode.
- Owner search explicitly covers only loaded accounts. No-results recovery, loaded counts and visible disabled-approval explanations preserve the API's bounded-list and authorization semantics.
- Browser findings corrected: narrow dashboard heading collapse, wrapped lab controls and dataset metadata, dark/light contrast in account notices/badges/forms and supporting tool panels, named bookmark control, keyboard-operable handshake steps, focusable lesson code/tables, and focusable skip-link targets.

## Executed checks

| Check | Result and boundary |
| --- | --- |
| Production TypeScript/Vite build | Passed |
| Node/JSDOM regression suite | 31 tests passed; covers account states, owner API fixtures, learning navigation, dense workflows and secondary-page controls |
| Lint | 0 errors, 75 warnings; not warning-free |
| Patch whitespace | `git diff --check` passed |
| Broad browser layout pass | 29 routes × 6 widths (320, 390, 768, 1024, 1440, 1920) × dark/light = 348 checks. No uncaught page errors or detected page/element overflow after initial layout corrections. This pass preceded the final contrast fixes. |
| Final narrow browser pass | Same 29 routes × 320px × dark/light = 58 checks after final fixes: zero detected overflow, page errors or axe WCAG 2 A/AA + 2.1 AA violations. |
| Intermediate-width regression | Dashboard, login, settings and reports × 360, 430, 820, 1280 × dark/light = 32 checks: no detected overflow/page errors. |
| Browser interaction smoke | Passed: skip-link activation/focus; navigation Escape and focus return; search input focus/Escape; dark/light/system with live device-preference changes; cancelable reset; report Edit/Preview at 844×390; Settings anchors/reflow at 640×450. |
| Screenshot inspection | Captured representative public/account/core/report/secondary routes at 320 and 1440 in both themes; inspected dashboard, account and reporting samples, including the corrected narrow dashboard and light-mode banner. Not a pixel-by-pixel sign-off of every captured page. |

Routes in the broad and final-narrow passes are recorded in `scripts/ui-responsive-audit.mjs`. They include public/account/recovery pages, both path catalogues, module overview/theory/exact lab, reference, reports, secondary pages, the unauthenticated owner gate and a missing route. `/admin` does **not** constitute a browser test of the authenticated owner console.

Browser: headless Chromium, Playwright, reduced motion, offline API responses supplied by the test runner. Browser downloads from the normal Playwright CDN failed in this sandbox; the run used `@sparticuz/chromium` with its bundled shared libraries. None of these optional tools were added to application dependencies. API fixtures never grant production access or change server authorization.

## Reproduce

Start the frontend on a reachable local development URL. Install the optional audit dependencies separately:

```sh
npm install --prefix .cache/ui-audit playwright @axe-core/playwright
.cache/ui-audit/node_modules/.bin/playwright install chromium

UI_AUDIT_MODULES="$PWD/.cache/ui-audit/node_modules" \
  node scripts/ui-responsive-audit.mjs

UI_AUDIT_MODULES="$PWD/.cache/ui-audit/node_modules" \
  UI_AUDIT_WIDTHS=320 UI_AUDIT_AXE=1 \
  node scripts/ui-responsive-audit.mjs

UI_AUDIT_MODULES="$PWD/.cache/ui-audit/node_modules" \
  node scripts/ui-keyboard-smoke.mjs
```

Configuration: `UI_AUDIT_URL` defaults to `http://localhost:3000`; `UI_AUDIT_OUTPUT` defaults to ignored `.cache/ui-audit`; `UI_AUDIT_EXECUTABLE` accepts an alternative Chromium executable. `UI_AUDIT_ROUTES` and `UI_AUDIT_WIDTHS` accept comma-separated lists. Any necessary system shared libraries must be available to the browser. The responsive runner exits nonzero for detected overflow, page exceptions or requested axe violations and writes a JSON report and selected screenshots. Only the `/api/` requests are stubbed; static content is actually loaded.

The tests inspect element geometry, not just document scroll width, because clipping an overflowing page can otherwise hide a layout defect. Intentionally local-scrolling technical regions are excluded from page-overflow findings. Neither this heuristic nor a zero-violation axe report proves complete usability or WCAG conformance.

## Still required before device/release sign-off

- Real iOS Safari and Android Chrome: software keyboards, file selection, copy/download permissions, touch and orientation changes.
- Actual browser-chrome 200%/400% zoom. CSS viewport reflow and a 640px smoke check were exercised; these are not a substitute for real zoom behavior.
- Authenticated browser sessions for pending/active/rejected/suspended/owner states, populated account records and live progress transfers. Existing account-state/owner regressions use safe JSDOM/API fixtures, not live services.
- Every engagement, challenge and Android-case tool state; populated analytics across a date rollover; very large datasets; import-conflict and storage-denial scenarios in real browsers. Existing rendered regressions cover a subset, not every permutation.
- Screen-reader/switch-control assessment and comprehensive contrast/focus/touch-target review, including expanded overlays and high-contrast/maximum-text preferences. Automated checks are supplementary.

All five implementation phases are delivered. The remaining items above are an explicit release-validation backlog, not completed device or accessibility certification.

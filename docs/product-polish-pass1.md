# Product polish — pass 1

2026-10-01. Responds to feedback about password feedback, input focus, unnecessary reading controls, implementation-style copy, unclear challenge titles and a wireless-first platform identity.

## Delivered

### Password feedback

- Replaced the length/character-group heuristic with `@zxcvbn-ts/core` and its common/English dictionaries. Common passwords, repeats, sequences, keyboard patterns and predictable substitutions now influence the estimate. Signup also considers the entered email/name fragment.
- Long unrelated-word passphrases do not need arbitrary uppercase/symbol rules to receive good feedback. The account's existing 8–128-character policy is separate from the advisory estimate; authentication/authorization rules were not relaxed.
- Analysis is local. No password or estimate is sent to a strength or breach service. This is not a breached-password check or a security guarantee, and dictionary coverage has language/cultural limits.
- Both signup and recovery share the same three-step visual feedback and actionable guidance. Removed the character-type checklist and provider/project implementation notes from this guidance.
- Suggestions still use cryptographic randomness and unbiased indexing. A bounded retry now requires the same estimator's Strong result before a suggestion is returned. This addresses the earlier mismatch between the generator and its strength test without weakening the estimate.
- Analysis inputs are bounded. Account routes are now genuinely lazy-loaded, with the estimator in its own chunk instead of the initial learning shell. The full dictionaries are a tradeoff: approximately **848 kB gzip** in the production password-strength chunk. No low-end-device CPU or network performance claim is made.

### Focus and interaction treatment

- Composite account fields have one boundary rather than an input outline inside another outlined container.
- Pointer focus uses a quiet border-color response; Tab navigation retains a clear, immediate keyboard indicator. Field dimensions remain unchanged. Modality is transient, not stored or fingerprinted.
- Kept the shared navigation, dialog and selection cues. Added a small press response to main actions on fine-pointer devices, disabled for reduced/paused motion. No blanket page/text fades or waiting for outgoing content.

### Reading

- Removed the large lesson “Reading experience” panel and its conflicting global font/filter injection, unsupported font claims and certification-style accessibility labels.
- Replaced Default/Focus/Wide with **Focus reading / Exit focus reading**. It hides both lesson navigation and the sidebar, keeps prose at a readable measure and clearly explains how to return. The actual lesson DOM and keyboard focus remain intact.
- Kept comfortable defaults and optional accessibility adjustments. Settings now exposes a compact Reduce Motion control and collapsed **Text and contrast options**, not a “Reading preferences” dashboard or an assistive-technology manual. Existing saved accessibility choices still work.

### Public copy, names and platform identity

- Homepage hero presents **both available learning paths**, rather than a featured wireless syllabus. The general learning/practice language includes source-code exercises as well as captures; unavailable domains remain clearly labelled planned.
- Simplified the Android path display name to **Android Application Security**; IDs and path contents are unchanged.
- Renamed all **22 existing wireless challenges** around their task/outcome. Example: “Beacon Triage — Read the Policy Before You Touch Anything” → “Read Wi-Fi Security Settings from Beacon Frames.” Only titles changed: IDs, exercises, answer data, artifacts, points and saved-progress keys are untouched.
- Removed the public footer's architecture slogan, account-frame security-boundary prose, redundant signup warnings and password provider notes. Retained concise approval, unverified-practice and qualification boundaries.
- Ordinary guests no longer see account-configuration outages before every lesson. Account screens still report unavailable registration/sign-in; signed-in status failures, unverified email and pending/rejected/suspended states still receive their relevant notices.
- Corrected the shared account-benefits sentence so it no longer promises verified XP or automatic cross-device persistence.

## Validation

- Production TypeScript/Vite build: pass.
- Frontend suite: **41 tests pass**, including expanded deterministic pattern/passphrase/personal-information/Unicode/length checks and 25 distinct generated suggestions. Account-state tests still cover approval and provenance semantics with the revised user-facing wording.
- Lint: **0 errors, 70 warnings remain**. Whitespace check passes.
- New product runner: **64 states / 16 viewport-theme-motion combinations**, with axe, reflow, runtime, pointer-versus-keyboard focus, unchanged field geometry, strength changes, two-path homepage, stable focus-reading DOM and optional accessibility controls.
- Learning regression: **84 states / 28 combinations**, including large text, reduced motion, history, focus and quiz behavior.
- Representative routes: **40 combinations**, no detected overflow/runtime/axe issues.
- Keyboard and color-state regressions: pass. The color runner now actually uses Tab before asserting a keyboard ring, rather than programmatically focusing after pointer interaction.
- Earlier in this pass: **14 shared-motion cases**, **84 secondary states** and **52 populated component combinations** passed.
- Screenshots were reviewed, including light-theme account fields and compact focus reading. Ignored artifacts: `.cache/ui-audit/product-polish` and `product-routes`.
- New runner added to CI; browser job timeout 40 minutes. Remote CI, live identity/provider tests and physical-device/assistive-technology certification were not run.

### Reproduce

```sh
npm ci --prefix frontend
npm ci --prefix tools/browser-qa
VITE_BASE=/ npm run dev --prefix frontend -- --host 0.0.0.0
# In another terminal:
npm run build --prefix frontend
npm test --prefix frontend
npm run lint --prefix frontend
export UI_AUDIT_MODULES="$PWD/tools/browser-qa/node_modules"
node scripts/ui-product-polish-smoke.mjs
node scripts/ui-learning-motion-smoke.mjs
node scripts/ui-keyboard-smoke.mjs
node scripts/ui-color-states-smoke.mjs
```

The sandbox used external Chromium with `UI_AUDIT_EXECUTABLE=/tmp/chromium` and `LD_LIBRARY_PATH=/tmp/al2023/lib`. Browser binary/dependencies and generated screenshots are not committed application assets.

## Next pass: finish the platform-wide product-language and structure review

This is the first implementation pass, **not a claim that every public string and workflow has been reviewed**.

1. **Path-neutral workspace entry:** dashboard/catalogue/lab/challenge/reference pages still have legacy `wireless-pentesting` fallbacks. Audit first-visit path selection and route/context consistency together; don't just change a heading while leaving the underlying default wireless-specific.
2. **Catalogue and learner copy:** simplify long path descriptions, technical category slugs, lesson headers, lab introductions, challenge summaries and empty states. Keep accurate technical vocabulary in the teaching material; put explanations near the task rather than replacing terminology with vague marketing text.
3. **Contextual record/access explanations:** consolidate repeated Preview/Full, local/imported and self-review disclaimers. Keep essential truth at the relevant action/result, not repeated architecture notes above every screen. Move operational/developer detail to owner/support documentation.
4. **Cross-path parity:** review Wireless and Android as equal platform domains without inventing labs, challenges, grading or artifacts for a path that does not provide them. Retain route/progress identifiers during naming changes.
5. **Final interaction review:** choose state-change feedback where a real transition needs orientation, not a universal animation applied to every page. Check focus, browser history, small screens and reduced motion after structural changes.

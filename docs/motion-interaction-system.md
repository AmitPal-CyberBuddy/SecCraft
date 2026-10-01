# SecCraft Motion & Interaction System

Status: consolidation implemented. This standard extends the existing system; it does not introduce an animation dependency or replace native controls.

## Purpose and boundaries

Motion explains a changed selection, a completed action, a real progress update or the origin of a temporary surface. It must never imply verified skills, measured results, live backend connectivity or work that has not happened.

Content and actions are immediate. Reading, source code, packet evidence, report editing and assessment questions stay opaque and stationary. No staggered cards, route-wide fade, page remount for animation, spring/bounce, neon glow, pulsing status dot or decorative ambient loop. A small progress/check glyph may change without moving the surrounding text.

Focus indicators are immediate, never delayed until an animation ends. Keyboard focus, draft values and selected evidence must survive unrelated state updates. Native checkbox/select/disclosure semantics take precedence over ornamental custom controls.

## Authoritative tokens

`frontend/src/design/motion-tokens.json` is the authored source. JavaScript recipes import it; `scripts/generate-motion-tokens.mjs` generates `frontend/src/styles/motion-tokens.css`. Tests run its `--check` mode to reject drift. Run the generator after editing tokens.

| Token | Regular | Compact (≤680px wide or ≤500px high) |
|---|---:|---:|
| Control feedback | 140ms | 100ms |
| Selection / result / progress | 180ms | 140ms |
| Temporary panel | 220ms | 160ms |

Easing: non-overshooting `cubic-bezier(.22,1,.36,1)`. Framer transitions explicitly use tween rather than spring physics. Distances: 4px result/toast settle, 8px standard panel, 12px side-origin panel. Compact result/toast travel is disabled; temporary panels may use a bounded 4px offset.

OS reduction, local Reduce Motion, or document-paused state wins over regular timing. A policy change cancels active catalogue animation; restoring motion does not replay the previous event. Components rendered without a policy provider default to stationary behavior. No arbitrary 300ms component duration override alongside the shared utilities.

## Component/workflow policy

| Surface | Approved behaviour | Deliberate limits |
|---|---|---|
| Buttons | Tokenized background/border feedback; 1% fine-pointer press on shared actions | No broad card scaling, delayed clicks or enlarged hover transforms. Native disabled state during real work. |
| Tabs/navigation | Active underline or bounded shared-layout indicator, immediate pressed/current semantics | Wrapping groups use local indicators; labels do not move. |
| Forms/toggles | Immediate native state, clear focus, validation text and semantic status/alert; subtle border/background changes | No shaking fields or animated form reflow. Native checks/selects need no custom thumb animation. |
| Disclosures | Short chevron transition; immediate open/close | Do not interpolate long content height or introduce max-height guesses. No hidden-but-focusable exit content. |
| Toasts/activity | New earned toast enters by 4px once, no text fade; temporary activity panel uses panel recipe | Toast replacement does not replay the whole card. Dismissal is immediate, with focus return. Hover/focus/hidden document pause automatic expiry. |
| Progress | Shared `LearningProgress`, clamped finite values, transform interpolation on actual changes | Initial value renders directly; never zero-to-total on hydration. `aria-valuenow` is truthful immediately. |
| Lessons | Selection rule and one newly-earned completion check | No lesson-to-lesson page transition or remount of reading DOM. Duplicate completion does not replay earned feedback. |
| Labs/challenges | Immediate selection/start navigation, real tool loading, result markers and supported completion feedback | Do not invent a Started/In Progress/Completed lifecycle beyond existing records. Evidence and editors stay stationary. |
| Assessment submission | Immediate result for synchronous local review; real busy/error/success feedback for asynchronous operations | No manufactured processing stage, grading delay or verified-result implication. Preserve current answers. |
| Dialogs | Existing backdrop/panel recipes with bounded translation, native modal/focus handling | No large scale entrance; Escape and focus restoration do not wait for an exit. |
| Top-level navigation | Short heading accent; catalogue filter result settle | No global page fade, no initial result animation, and no animation for search keystrokes. |
| Landing/dashboard | Limited selected-state and real progress feedback | Ambient motion is not enabled: it currently explains nothing the static layout cannot. |

### Loading and status

Route-loading fallbacks use stationary marks and readable status text, not pulsing dots. A spinner is allowed only while genuine indeterminate work is pending and must retain meaningful text when reduced motion stops it. Account submission, feedback, policy saving and PDF generation expose actual `aria-busy` state. Busy account actions also identify the ongoing operation in their labels. No added minimum waiting time.

## Utilities and adoption

- `motionTiming`, `motionDistance`, `motionEaseCSS`, `panelMotion`, `resultMotion`: JS recipes using the shared source.
- `.sc-surface-transition`, `.sc-technical-transition`, shared action/view styles: CSS-first feedback.
- `ResultTransition`: stable wrapper, deliberate identity changes only, WAAPI cancellation; unsupported APIs fall back to immediate rendering.
- `LearningProgress`: used by both learning widgets and workspace `ProgressBar`; one semantic progressbar per meter.
- `MotionPreferences`: live OS/local/viewport/visibility policy. No device sniffing or new dependency.
- Tailwind default duration/easing also point to the tokens. Component duration overrides were removed from 21 files with token-driven styles. Legacy `shadow-glow-*` JSX utilities were renamed to their existing neutral `shadow-soft` meaning; unused glow aliases were removed from Tailwind. This is not a new colored-shadow treatment.

## Verification for this consolidation

- Production build passed. Existing large-chunk advisory remains.
- **43 frontend tests passed**: generated token freshness, bounded recipes, guardrails against competing duration/glow/spring/hover-scale/pulse utilities, plus existing workflow tests.
- **16 new browser combinations** (320, 768, 844 short-landscape, 1440px × dark/light × standard/reduced): token values, direct initial progress, updated progress, focus, stable result DOM/input, local reduction cancellation, paused-document handling, no event replay, unchanged sampled surrounding geometry, axe and horizontal overflow.
- **14 shared-motion cases**, **84 secondary-state checks**, **84 learning checks**, **140 technical-tool checks**, **66 path-scope check groups**, and keyboard/theme/reflow smoke passed. The existing interaction suites cover widths through 1920px.
- Lint: **0 errors; 70 pre-existing warnings**. Diff whitespace check passed.
- New browser runner: `scripts/ui-motion-contract-smoke.mjs`, included in CI. Fixture is dev-only, not a production route or entry. Token freshness is checked by the existing frontend test command.

Local logs: `/home/user/motion-formal-{build,tests,lint,contract,shared,secondary,learning,technical,paths,keyboard}.log`.

These are automated browser/device-size simulations, not physical-device, screen-reader, FPS/energy, or global CLS certification. Layout assertions concern the sampled transitions, not every possible content change. APIs use offline/mocked fixtures; no live provider or backend authorization claim is made. Remote CI and external preview reachability were not verified.

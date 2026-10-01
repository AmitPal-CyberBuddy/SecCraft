# Motion phase 2 — learning continuity

Completed 2026-10-01. Follows the [shared motion foundation](motion-system-plan.md).

## Implemented

### Lessons and reading

- Removed the keyed whole-workspace fade/slide and exit wait. Switching lesson workspace views does not animate text or delay the incoming interface.
- Lesson selection uses a short local rule reveal on larger screens, not a travelling highlight through long/wrapped labels. Compact and reduced-motion modes stay stationary.
- Replaced competing window/content/anchor smooth scrolls with one immediate placement at the reading anchor. Sticky-header clearance is explicit.
- A mobile lesson choice that closes its chooser transfers keyboard focus to the named reading region. Desktop selection keeps its normal control focus. URL/history behavior is unchanged.
- Reading controls appear only in the Lessons view, rather than showing a zero-word reading estimate under a quiz or lab.
- Reading progress follows actual scroll position directly, without an entrance from zero or a trailing animated value. Removed duplicate window scroll registration, added viewport resize recalculation for the general scroll indicator, and protected short-content calculations from nonfinite results.

### Completion and progress

- A newly recorded lesson gets one brief checkmark acknowledgement and a local/unverified text status. Repeated activation explains that no additional practice XP was awarded; it does not replay the new-completion effect. Leaving the lesson/view clears the transient acknowledgement.
- `LearningProgress` uses transform-only interpolation of actual value changes, with `initial={false}`. It never invents a zero-to-total entrance. Accessible values update immediately; reduced/paused motion is instantaneous, compact transitions are shorter.
- Applied to module lesson completion and flashcard deck position. Other dashboard/achievement progress remains part of the later secondary-surface review.

### Flashcards

- Replaced the 3D flip, opacity fade and wait-mode remount with one persistent, keyboard-operable button. The face is fully opaque and immediately available; a small border/underline change distinguishes the revealed answer.
- Both OS and local motion reduction work through the shared system; no separate OS-only hook.
- Category/difficulty labels are in normal flow. Long answers and larger text can grow the card instead of overlapping fixed-position badges.
- Rating controls retain their positions, are disabled until reveal, and return focus to the next question after use. A synchronous reveal guard prevents queued/repeated activation from grading the next unrevealed card.
- Added a readable face description, polite answer/status announcements and actual deck-position semantics. Existing browser-local scheduling/storage behavior remains unchanged; no remote grading or verification was added.

### Quizzes

- Removed question stagger and explanation fades. Choices and feedback render immediately; only backgrounds/borders transition, not text or error messages.
- Incomplete submission uses inline accessible feedback instead of a blocking browser alert, keeps current answers and focuses the first unanswered question.
- Submission focuses a summary that explicitly identifies the result as local practice, not a verified assessment. Sticky-header clearance prevents the summary from being obscured. Placement is immediate instead of a long animated scroll through the answers.
- Existing scoring, pass threshold, retry and perfect-score behavior remain intact.

## Validation

| Check | Final result |
|---|---|
| Production TypeScript/Vite build | Passed |
| Frontend tests | **37 passed** |
| Lint | **0 errors; 76 warnings remain** |
| Whitespace check | Passed |
| Learning interaction matrix | **84 state checks / 28 screen-theme-motion cases passed** |
| Shared-motion regression | **14 screen/theme cases passed** |
| Representative route scan | **24 combinations passed**, no detected overflow/runtime/axe issues |
| Existing populated component runner | **52 combinations passed during this phase** |
| Keyboard smoke | Passed |

Learning matrix: seven sizes (320×740, 390×844, 768×1024, 844×390, 1024×768, 1440×900, 1920×1080) × dark/light × OS motion on/reduced. Three axe/overflow/runtime snapshots per case: revealed flashcard at larger text, completed lesson, submitted quiz. Additional assertions cover persistent keyboard focus, live local reduction, duplicate activation, truthful progress, repeat completion, lesson choice/history, reading-width changes, missing answers, visible result focus and retry when available.

Route scan: module theory, module quiz, daily learning and settings × 320/768/1440 × dark/light. This is representative validation, not another full 31-route audit.

Visual inspection of mobile enlarged-text flashcards and desktop quiz output caught the sticky-header overlap in the first result-summary implementation. Added scroll margins, immediate placement and an explicit visibility assertion; the final 84-state rerun passed.

An early frontend run also hit an existing nondeterministic password-suggestion test (a random generated password can contain a repetition that the separate strength heuristic calls weak). No password/security code was changed in this phase. Subsequent full runs, including the final 37-test run, passed; the random-test/generator mismatch remains a separate follow-up rather than a motion regression.

## Reproduce

With the frontend dev server running at the root base (`VITE_BASE=/ npm run dev --prefix frontend -- --host 0.0.0.0`) and browser dependencies configured as in the color audit:

```sh
npm test --prefix frontend
npm run build --prefix frontend
npm run lint --prefix frontend
node scripts/ui-learning-motion-smoke.mjs
node scripts/ui-motion-smoke.mjs
node scripts/ui-keyboard-smoke.mjs
UI_AUDIT_AXE=1 UI_AUDIT_WIDTHS=320,768,1440 \
UI_AUDIT_ROUTES='/modules/08-wpa-wpa2?tab=theory,/modules/08-wpa-wpa2?tab=quiz,/daily,/settings' \
node scripts/ui-responsive-audit.mjs
```

Optional `UI_AUDIT_MODULES`, `UI_AUDIT_EXECUTABLE`, `UI_AUDIT_URL` and `UI_AUDIT_OUTPUT` follow the other runners. QA screenshots/results stay in ignored `.cache/ui-audit/learning-motion`. The sandbox's standard browser download failed; local checks used externally installed `@sparticuz/chromium` and its bundled NSS libraries, not a new application dependency.

CI now includes the learning runner and allows 25 minutes for the expanded browser job. Remote CI was not run here.

## Scope limits

These are browser emulation, automated accessibility checks and selected visual inspection—not physical-device, screenreader, GPU/FPS or comprehensive WCAG certification. API access was explicitly unavailable in these fixtures; local practice checks do not prove live backend/auth behavior or durable storage in every browser mode. Global XP toasts, technical lab transitions and other legacy explicit animations remain for phases 3–4. No blanket claim of a completed platform-wide motion redesign.

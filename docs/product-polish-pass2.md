# Product polish, pass 2 — path context and restrained interaction feedback

## Delivered

- Dashboard, Modules, Labs, Challenges and Reference share a path scope. First visits offer Wireless and Android equally, rather than silently selecting Wireless. Available content is required; unknown and planned IDs show honest empty states.
- Scope precedence: route path ID, then `?path=`, then the remembered selection. A native, consistently labelled selector changes path without losing keyboard focus. Switching paths clears incompatible catalogue filters and tool selections; browser history restores explicit URL context.
- Browser progress storage is version 7. Empty legacy Wireless defaults are no longer treated as a choice. Explicit choices, non-default context, genuine historical records and their existing validation remain supported. Reset returns to no selection. Module/path setters keep ownership consistent.
- The sidebar offers a path choice instead of fabricated Wireless 0% progress. Analytics without a selection covers the platform rather than defaulting to Wireless.
- Reference no longer maintains a second, contradictory path filter. Android displays shared methodology and an explicit notice that a dedicated command/filter library is not yet supplied; Wireless-only flashcards, checklist and terminal are not presented as Android content.
- Android Labs does not request the Wireless capture catalogue. Lab scoring initializes from the selected path.
- Simplified catalogue, path-detail and dashboard-record copy without promising verified grades, certificates, automatic approval or protected lesson access.

## Motion and interaction decisions

- Existing shared button press, selected-view underline, copy-success, learning-completion and technical-result feedback remain in place. Added a quiet pressed background/border for view buttons.
- Shared page headers gain a small, 24px destination accent, not a page fade or a progress/loading bar. Text stays fully visible.
- Module and challenge results settle by **4px over 180ms** after deliberate filter changes. Search typing does not retrigger it. The wrapper is stable: it does not key/remount results for animation or move filter controls.
- Compact layouts remain stationary. Reduced motion and document-paused states skip/cancel result animations; changing the policy does not replay an old event. Missing Web Animations support falls back to immediate results.
- No global page transition, delays before actions, staggered text, moving code/packet tables, lesson remounts, animated reading layout or perpetual decoration was added.
- Path changes reset only the scoped catalogue/tool content intentionally; lesson readers are not wrapped by the scope or result transition.

## Verification

- Production build passed (existing large-chunk warning remains).
- **41 frontend tests passed**, with expanded scope/reset/migration/planned-route assertions in the learning journey test. Account-state fixtures explicitly select a path to retain their existing dashboard/tier coverage.
- **66 new browser check groups passed**: first visits across five areas, explicit selection, filter/search behavior, stable result DOM and focus, URL precedence, back navigation, Android reference honesty, invalid paths and legacy migration. Matrix: 320/1440px, dark/light, standard/reduced motion. Axe, horizontal overflow and runtime checks passed on the sampled states.
- **84 learning interaction checks passed** across 28 viewport/theme/motion combinations, including focus stability, completion and quiz feedback.
- **64 previous product-polish checks passed** across 16 combinations; keyboard/theme/reflow smoke passed.
- Lint: **0 errors, 70 existing warnings**. `git diff --check` passed.
- New browser runner: `scripts/ui-path-scope-smoke.mjs`, included in CI. Local logs: `/home/user/pass2-{build,tests,lint,browser,learning,product,keyboard}.log`.

## Limits / follow-up

This is not a claim that every public sentence or platform workflow has been re-audited. Backend authorization, live identity providers, real mobile devices, screen readers and rendering/energy performance were not certified. Browser APIs were tested with offline API fixtures. CI configuration was updated; remote CI was not run. The local preview server is running on port 3000, but the external preview URL has not been independently verified.

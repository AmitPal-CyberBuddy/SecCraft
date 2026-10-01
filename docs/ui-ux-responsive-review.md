# SecCraft UI/UX and responsive design review

Date: 2026-09-30

## Scope and confidence

This is a source-based review of the routed page templates in `frontend/src/App.tsx`, their layouts, shared styles, and major interactive components. Wireless/Android and route aliases are grouped where they share a template. Account and owner states were inspected in code, not through a live authenticated session. Browser installation failed because the browser download connection was reset; no screenshot or real-device validation is claimed. Layout risks below need browser confirmation unless described as a direct code observation.

No application implementation was changed. This document is a recommendation backlog.

## Overall recommendation

Keep the current restrained, technical, teal-accented direction. The newer curriculum, dashboard and record layouts are a stronger foundation than a neon-heavy “hacker dashboard.” Improve consistency, reading comfort, navigation and task flow before adding illustrations or effects.

Already good: self-hosted Inter, semantic theme tokens, constrained reading width, responsive catalogue rows, a collapsible mobile lesson index, skip links, navigation focus handling, and clear separation between local practice and verified records. Build on these instead of replacing them.

## 1. Highest-priority findings

### P1 — Fix primary-button contrast in light mode

Evidence: `styles/workspace.css` sets light-mode `--learning: #086b62`, while `.ws-action` retains `color: #0f2927`. The contrast of those declared colors is approximately **2.41:1**. `styles/public-home.css` uses `#102a26` on the same background, approximately **2.38:1**. Both are below the 4.5:1 normal-text target.

Recommendation: introduce paired `--action-bg` / `--action-ink` tokens rather than assuming one foreground works in both themes. White on the existing light-mode teal is approximately 6.38:1. Audit hover, disabled, selected and focus states as well. Other components using hard-coded dark/light colors need computed-style checks; do not assume every legacy color is broken, since compatibility overrides exist.

### P1 — Align sticky elements with the actual header height

Evidence: the current global header has a minimum 65px navigation row plus a minimum 36px experience row and borders. Some children still use `top: 64px` or `top: 80px`: the reference search, lab scoring selector and reading context are examples. Mobile wrapping can make the header taller. Some narrow-screen CSS disables legacy stickiness, but this does not resolve every tablet/desktop combination.

Recommendation: use one shared, measured header offset for sticky panels and anchor scroll margins. Avoid stacking multiple sticky bars on short screens. Test both width and height, including landscape phones and 200% zoom.

### P1 — Remove duplicated account notices and reduce repeated explanations

Evidence: `Shell.tsx` renders `AccountBanner`; `Dashboard.tsx` renders it again. In banner-eligible states, this creates two independently dismissible notices. The dashboard and header also repeat the preview/local-record explanation.

Recommendation: let the shell own the account banner. Use one concise status line plus contextual help. Keep important authorization and unverified-result boundaries visible where they affect an action; do not remove truthful caveats to simplify the design.

### P1 — Stop mixing two presentation systems

Evidence: newer pages use `sc-*` / `ws-*` semantic styles, while Analytics, Daily, Achievements, Reference and tool components retain numerous small pixel fonts, navy backgrounds, violet/cyan accents and animated cards. Reports also has hard-coded navy hover surfaces alongside tokenized surfaces.

Recommendation: standardize page headers, panel headings, tab controls, form fields, status chips, notices and empty states. Use semantic tokens directly, not increasingly broad selectors to patch legacy classes. Keep a deliberately dark terminal if desired, but make that an intentional tool surface rather than a theme accident.

### P1 — Increase text and touch comfort

Evidence: supporting tool text frequently uses 10–13px; reading prose drops to `.94rem` below 600px. Navigation links are 39px high, icon controls 40px, and some actions 36–38px.

Recommendation: default body copy around 16px; reading content 16–18px with 1.65–1.8 line height; secondary UI 14px; reserve 12px for genuinely secondary metadata. Target 44×44px touch controls as a usability standard, with room between them. Use at least 16px input text on phones to avoid common iOS focus-zoom behavior. Do not shrink the interface to fit more content.

### P1 — Put the task before supporting context

Evidence: AccountFrame puts its descriptive aside before the form in mobile DOM order. Labs puts the full wireless artifact index before lab search and the lab list. PathDetail puts a sizable “Before you begin” block before its next-module action.

Recommendation: mobile ordering should expose the useful action earlier: form before extended account explanation; lab search/list before the full artifact inventory; resume/start action before repeated path details. Preserve short scope and safety information before execution.

### P2 — Correct inconsistent public content

Evidence: About says the platform ships one complete path and describes other catalogue entries as planned. PublicHome and LearningPaths describe Wireless and Android as available.

Recommendation: derive availability/count statements from shared curriculum data. Contradictory availability claims undermine trust more than missing decoration does.

## 2. Page-by-page recommendations

### Public website

| Page | Presentation and UX improvement | Responsive behavior |
| --- | --- | --- |
| Home `/` | Keep the strong typographic hero. Shorten the primary label to “Start learning” or “Try the preview”; retain the no-account explanation immediately below. Replace some repeated curriculum/roadmap copy with one authentic example of a lesson or evidence workflow. | Keep existing stacked layout and full-width phone actions. Make the hero compact enough that the CTA appears early. Ensure an example preview remains readable rather than shrinking a desktop screenshot. |
| About `/about` | Fix the one-path/two-path contradiction. Use the same surfaces, headings and accent hierarchy as Home. Separate product purpose from technical architecture and limitations. | Prefer one column on phones, two on mid-sized tablets, three only when cards retain a comfortable text measure. |
| How it works `/how-it-works` | Show a simple path → lesson → lab → record journey, with a real example and a direct start link. Put deeper record/account explanations below the main journey. | Use a vertical numbered sequence on phones, not narrow columns. Make each step understandable without hover. |
| Login `/login` | Give email/password and the primary action first visual priority. Keep guest access available as a quieter alternative. Preserve service-unavailable and recovery feedback. | Move long account context below the form; use a bounded form width and full-width submit button. |
| Signup `/signup` | Present “Create account → Verify email → Await approval” explicitly. Distinguish account request from immediate full access. Keep password guidance close to the field. | Single-column password checks on very narrow screens; stack generated-password/show-password actions without crowding. |
| Reset password `/reset-password` | One task, one field, one clear submission state. Tell users what to do next without implying an email definitely exists. | Reuse the compact form template; keep feedback visible above the keyboard where possible. |
| Update password `/update-password` | Separate invalid/expired-link state, editable form and success state. Offer a clear recovery route. | Keep requirements and submit action together; test long validation messages and keyboard-open height. |
| Account status `/account` | Lead with the current state and one next action. Use a step-based explanation for pending approval rather than several competing notices. | Stack status, explanation and actions; allow long emails and error text to wrap. |

### Curriculum and learning

| Page | Presentation and UX improvement | Responsive behavior |
| --- | --- | --- |
| Dashboard `/app` | Make “Continue learning” the focal point. Remove duplicate banner, reduce introductory repetition, and use readable content titles rather than raw lesson/lab IDs in recent activity. Keep local/account records distinctly labeled. | Put resume action first, progress second, activity third. Avoid a large context card consuming the entire first mobile screen. |
| Learning paths `/paths` | The editorial design is worth keeping. Give each available path a concise outcome, prerequisite summary and clear start/resume action. Keep planned domains visually secondary. | Use a compact summary on phones; prevent counts and long descriptions from dominating the action. |
| Path detail `/paths/:pathId` | Move start/resume nearer the title. Distinguish “Start path” from “Continue learning” at zero progress. Collapse completed phases optionally; highlight the current phase. Avoid repeating the full skills list twice. | Use a vertical curriculum list; place status below long module titles as needed. Collapse additional context rather than just moving a long sidebar to the bottom. |
| Module catalogue `/modules`, `/paths/:pathId/modules` | Keep the scannable rows. Standardize filter labels, result count, active-filter summary and clear-all behavior. Preserve search/filter state in the URL when navigating away and back. | Show search immediately; use an expandable filter section on narrow screens. Wrap titles, put metadata below them, keep one clear action per row. |
| Module detail / overview | Reduce competing top-level context blocks. Lead with expected outcome, prerequisites and the next learning step. Maintain a consistent tab treatment. | Use one compact header and an accessible tab strip or section selector, with a visible indication that more sections exist. |
| Module detail / reading | Preserve readable line length. Consolidate duplicated reading-mode controls. Use authored lesson titles consistently; the lesson index currently formats the slug even though metadata is available. Make completion and next-lesson actions unmistakable. | Phone: lesson chooser + article + next action. Tablet: article with collapsible context. Wide desktop: optional lesson index and contents rail only if the article stays readable. |
| Module detail / labs and quizzes | Make the sequence explicit: objective → artifact → work → check/review → next step. Put error/correctness feedback near the relevant field; distinguish self-review from actual answer checks. Some lab labels and inputs are adjacent but not programmatically associated: add IDs/`htmlFor`. | Keep questions and fields single-column on phones. Avoid side-by-side answer and evidence panes until both have enough width. |

### Practice and tools

| Page | Presentation and UX improvement | Responsive behavior |
| --- | --- | --- |
| Labs `/labs`, path-scoped labs | Lead with searchable labs. Put the full capture inventory behind a separate view or disclosure. Replace implementation-oriented labels such as parser names with concise user-facing descriptions. “Open lab” currently links to the module route: deep-link to the exact lab/tab instead. | Stack filter controls; keep important filenames readable with a detail/copy option. Do not rely on clipped headings or tiny metadata to identify artifacts. |
| Terminal, upload, evidence vault, scoring views | Clearly identify simulation versus real execution. Make upload requirements visible before selection and provide useful processing/error feedback. Give saved evidence a readable name and origin. | Use dynamic-height limits with a keyboard-safe input area. Allow horizontal scrolling inside code/output only, not the whole page. File picker must remain an alternative to drag/drop. |
| PCAP inspector | Keep comparison-friendly table presentation on desktop. Offer row detail for addresses, flags and frame data instead of squeezing every column. | On phone show essential columns with expandable details or a deliberately scrollable table. Label the scroll region and preserve context. |
| Challenges `/challenges`, path-scoped challenges | Guidance levels are useful but should not delay finding a task. Make current filter selection/results obvious. Avoid giving the embedded achievements view equal priority to the challenge task. | Compact guidance selector, stacked result rows, full titles and clear completion labels. |
| Challenge detail | Keep objective/scope visible before work. Group evidence, responses and self-review into a clear sequence. Show draft/save state and distinguish “Save response” from “Submit self-review.” | Place relevant evidence before its question; offer a collapsible evidence panel rather than forcing constant top-to-bottom scrolling. |
| Assessments / engagements | Keep the terminology consistent in navigation and headings. Lead with scope, prerequisites, time estimate and expected deliverable. Use a compact progress indicator through the assessment. | Stack evidence and response sections; put wide tables in local scroll regions and show readable summaries. Keep safety/scope acknowledgments before starting. |
| Reference `/reference` | Increase command and explanatory text size. Add copy actions for commands/filters with confirmation. Simplify long headings and retain searchable categories. | Avoid `break-all` as the default for commands: horizontal code scroll plus copy is usually clearer; offer wrapping where useful. Fix the sticky search offset. |
| Reports `/reports` | Make finding creation, evidence attachment, preview and export a coherent sequence. Put instructional cards in contextual help so they do not push the editor down. Show draft/saved state and explain export outcomes. | Desktop can use editor/preview panes. Phone should use explicit Edit/Preview views, with save/export actions remaining reachable and not covering fields. |

### Progress, account and operations

| Page | Presentation and UX improvement | Responsive behavior |
| --- | --- | --- |
| Analytics `/analytics`, `/progress` | Consolidate overlapping summary metrics between page and embedded dashboard. Prioritize path progress, recent activity and what to revisit, rather than XP alone. Include text summaries for charts. | Two-column stats only when labels fit; stack charts and shorten tick labels without hiding meaning. Support keyboard/tap details, not hover-only values. |
| Achievements `/achievements`, `/badges` | Separate earned and upcoming milestones. Tell learners why each badge was earned and how to work toward the next one. Keep “local/unverified” semantics clear without repeating paragraphs per badge. | Prefer two readable badge columns or a list on small phones instead of dense icon tiles. Keep locked descriptions legible. |
| Daily practice `/daily`, `/streak` | Show one recommended practice action before secondary streak metrics. Use supportive missed-day messaging, not urgency. | Stack long task descriptions; wrap the reset/local-time footer and avoid tiny single-line status text. |
| Profile `/profile` | Separate identity, account state and learning summary. Link to Sync and Settings rather than duplicating all their technical explanations. | Single-column sections with clear headings; wrap long emails and IDs, offering copy for identifiers. |
| Progress sync `/sync` | Keep the existing record-origin distinction. Present transfer as “Choose file → Review differences → Confirm.” Show the last successful transfer and the affected record counts if available. | Stack the local/account/import summaries; convert conflict comparisons to labeled rows. Keep confirmation visible without hiding conflict details. |
| Settings `/settings` | Group into Appearance, Reading & Accessibility, Data, and Account. Put destructive reset in a distinct danger section and offer export before deletion. | Use section disclosures on phones; full-width controls where useful. Avoid long decorative stats/footers competing with settings. |
| Owner console `/admin` | Preserve separate owner chrome and existing confirmations. Improve queue scanning with search, visible capacity reasons and clear action feedback. Retain the existing responsive table-to-row treatment. | Use labeled account cards and comfortably sized action buttons. Show why approval is disabled in text, not only in a tooltip. |
| Not found `*` | The current recovery actions are a good foundation. Use plainer wording such as “Page not found,” retain the attempted address and provide workspace/search links. | Ensure long URLs wrap or scroll locally; stack recovery actions. |

`LearningPath.tsx` and `LearningPaths.tsx` are different files. The current router uses LearningPaths and PathDetail; older `/path` and `/learning-path` URLs redirect. Avoid redesigning unused templates as though they were live pages. Validate route aliases against their shared templates.

## 3. Responsive design contract

Use these as starting layout bands, not rigid device detection. Let available component width and content determine the actual transition.

| Available width | Intended experience |
| --- | --- |
| 320–479px | One main column, 16px-ish gutters, wrapped titles, compact header, 44px touch targets, primary actions full width when appropriate. No required information available only on hover. |
| 480–767px | Single-column tasks; selective two-column summaries. Search visible, filters collapsible. |
| 768–1023px | Tablet-specific layouts: two-column catalogues if readable, collapsible context, no squeezed three-pane readers. Do not treat tablets as small desktops. |
| 1024–1439px | Main task plus optional context rail. Give lesson text priority over navigation width. Editor/preview split where useful. |
| 1440px+ | Center content within existing approximately 1200–1440px bounds. Keep prose around 65–75 characters per line; use extra space for helpful context, not longer text lines. |

Implementation principles:

- Use `minmax(0, 1fr)`, `min-width: 0` and deliberate wrapping within flex/grid children.
- Do not treat `.sc-header-shell { overflow-x: clip; }` as evidence that overflow is solved: it can hide off-screen content. Audit descendants explicitly.
- Keep technical tables/code scrollable inside labeled containers; ordinary content should reflow.
- Use content-aware grids/container queries where reusable cards appear in different-sized panes.
- Use `dvh` for bounded dialogs and panels, account for safe-area insets, and test the virtual keyboard.
- Avoid globally truncating primary headings, task names and selected values. Truncate secondary identifiers only with a way to inspect/copy the full value.
- Use a single overlay/z-index scheme so search, navigation, notifications, tours and toasts do not compete.
- Preserve keyboard focus and return it to the trigger after closing overlays. The existing navigation handling is a useful base, not something to remove.
- Respect reduced motion in Framer Motion and programmatic smooth scroll, not just CSS animations. Shared transition helpers currently specify movement directly.

## 4. Visual system to standardize

- **Typography:** keep Inter; use a consistent monospace stack for technical values. A new display font is optional, not a prerequisite for polish.
- **Colors:** one main learning accent; semantic success, warning, error and owner states. Give filled controls paired foreground/background tokens.
- **Hierarchy:** one page title, one clear primary action, optional subtitle, then task content. Use the same header scale across old and new pages.
- **Spacing:** consistent 4/8/12/16/24/32/48px scale; mobile section gaps smaller than desktop. Remove redundant padding from nested panels.
- **Surfaces:** three deliberate levels—page, panel, inset/tool. Use borders and spacing before shadows. Do not put every paragraph in a card.
- **Controls:** common input, select, checkbox, tab and button sizing; visible focus, error and selected states.
- **Feedback:** consistent loading, empty, offline, saved and error patterns. Every recoverable error should offer a useful next step.
- **Motion:** brief, purposeful state changes. Avoid animated glowing borders, hover scaling across every tile, or staggered entry for long technical lists.

## 5. Delivery order

1. **Foundation fixes:** button contrast; one account banner; sticky-offset system; public availability copy; essential text/target sizes.
2. **Shared component pass:** theme tokens, headers, controls, tabs, status notices, empty states and motion policy.
3. **Core learner journey:** dashboard → path → module → lesson → lab/challenge. Reorder content for phones and improve precise deep links.
4. **Dense workflows:** inspector, terminal, reference, assessments, reports and sync. Design mobile interactions rather than merely shrinking desktop layouts.
5. **Secondary polish:** analytics, badges, daily practice, account pages and owner queue. Add authentic product imagery only if it improves understanding.

## 6. Validation required before calling it responsive

- Check 320, 360/390, 430, 768, 820, 1024, 1280, 1440 and 1920px widths, plus short landscape viewports.
- Test dark/light/system themes, 200% zoom and 320 CSS-pixel reflow (including 400% desktop zoom where applicable).
- Exercise guest, pending, active, rejected, suspended, owner and service-unavailable states using safe fixtures/test accounts.
- Test empty and populated progress, long titles/emails/filenames, no-results filters, validation errors, offline mode and import conflicts.
- Check every major module tab and tool view—not just initial page loads—and both Wireless and Android.
- Confirm no page-level horizontal scrolling or clipped actions; technical regions may scroll locally.
- Check contrast with rendered colors, keyboard traversal, focus visibility, accessible labels, status announcements and touch operation.
- Confirm sticky content never hides headings, fields, focus or anchor targets.
- Test real iOS Safari/Android Chrome keyboard behavior and file picking; browser emulation alone is insufficient.
- Automate representative route/state screenshots and overflow checks. Add accessibility checks, then manually inspect complex interactions.

**Success looks like:** a clear first action on every page, readable technical material without pinching to zoom, consistent light/dark styling, and the same task achievable on a phone without a substantially more confusing workflow.

# SecCraft color-system audit and direction

Date: 2026-10-01. The findings below describe the pre-change audit baseline. After approval, Direction A was implemented as a shared-foundation/pilot pass; see [pilot results](color-system-pilot.md).

## Verdict

The current charcoal/teal palette is a credible, restrained foundation for a cybersecurity learning product. Its primary token pairs are readable in both themes. It does not need to become neon green, pure black, or a cyan/purple gradient-heavy interface to feel technical.

The strongest improvement is consistency: neutralize some of the background tint, distinguish actions from success, strengthen functional control boundaries, and finish replacing legacy literal colors. “Premium” is a design judgment, not an accessibility measurement; a smaller, more disciplined palette is my recommendation.

## Scope and evidence

Inspected the workspace, public-site, shared-control and technical-tool styles; the legacy light-mode overrides; and TSX color usage. Calculated WCAG relative-luminance contrast ratios for exact opaque token pairs. A source scan found hard-coded hex background/text/border utilities in **40 of 90 TSX files**. This is a migration inventory, not 40 confirmed defects: intentional terminal and data-visualization colors can be valid exceptions.

Previous browser checks caught and corrected specific rendered contrast problems. This audit does not claim a new exhaustive screenshot, all-state or assistive-technology pass. Alpha backgrounds, gradients, overlays, disabled opacity, syntax highlighting and hover states require rendered checks; token arithmetic alone cannot certify them.

## Pre-pilot foundation

| Role | Dark | Light |
| --- | --- | --- |
| App background | `#101719` | `#F4F6F2` |
| Panel | `#1A2427` | `#FFFFFF` |
| Raised panel | `#223034` | `#EEF4F0` |
| Main text | `#F0F3EF` | `#1C302D` |
| Secondary text | `#BDC9C7` | `#405952` |
| Muted text | `#91A7A5` | `#576F68` |
| Learning/action accent | `#8AD6CD` | `#086B62` |
| Action foreground | `#0F2927` | `#FFFFFF` |

### Measured contrast

Ratios below use the panel background, except the explicitly paired action foreground/fill.

| Pair | Dark | Light |
| --- | ---: | ---: |
| Main text / panel | 14.16:1 | 13.91:1 |
| Secondary text / panel | 9.31:1 | 7.58:1 |
| Muted text / panel | 6.24:1 | 5.41:1 |
| Action foreground / accent fill | 9.20:1 | 6.38:1 |
| Focus color / panel | 9.97:1 | 6.09:1 |
| Normal border / panel | 1.60:1 | 1.39:1 |
| Strong border / panel | 3.27:1 | 2.25:1 |

The measured text pairs exceed 4.5:1. Low decorative-divider contrast is not automatically a WCAG failure. However, `--line-normal` is also used by inputs and controls: where a boundary is necessary to identify a control or state, it needs separate non-text contrast assessment against adjacent colors. Do not solve this by making every card divider equally dark.

## Findings and recommendations

### 1. Two color systems still coexist — highest priority

Semantic tokens now coexist with older navy/slate utilities and cyan/violet/emerald/amber accents. `index.css` remaps many literal colors in light mode with `!important`; newer stylesheet rules then override selected cases. This is fragile, particularly for opacity variants and states not covered by a remapping rule.

Migrate whole components to role-based tokens, then remove only overrides no longer used. Do not perform a blind global replacement or delete the compatibility layer before checking consumers.

### 2. Background tint is stronger than necessary — design recommendation

Dark backgrounds lean green; light backgrounds and supporting text also lean green. This is cohesive, but it can make the interface feel softer and less crisp than the intended technical/editorial direction.

Keep teal as the identity accent and shift the large surfaces and text toward cool neutral graphite/slate. White cards should remain distinct from the light canvas; dark cards should have a perceptible hierarchy without glows.

### 3. Separate brand, interaction and outcome

Teal navigation/actions and green success are visually close. Purple also appears in several decorative/gamification contexts in addition to owner identity.

Use one primary accent. Reserve green for successful/completed outcomes, amber for caution, red for errors/destructive actions and purple for a clearly defined secondary purpose. Keep labels/icons: local completion is not verification, and hue must not imply a trust level the backend did not establish.

### 4. Add functional boundary and state tokens

Separate quiet separators from control outlines. Define paired tokens for:
- Canvas, surface, raised surface, inset surface and overlay.
- Primary, secondary, muted and disabled text.
- Primary-action fill/foreground/hover/pressed; link/default/hover.
- Decorative border, control border, selected border and focus ring.
- Success/info/warning/danger foreground/background/border.
- Chart series and syntax highlighting.

Even where two roles initially share a value, separate names prevent an action-color change from silently changing every warning, link or focus indicator.

### 5. Technical surfaces need deliberate exceptions

A terminal can stay dark in light mode if its entire internal palette is self-contained. Lesson code should have a real light syntax theme, not inverted dark tokens. Tables should use subtle hover fills plus an explicit selected marker. Charts need distinct series colors and labels/patterns, not only variations of teal.

### 6. Reduce decoration rather than remove color

Avoid full-card accent backgrounds and gradients on routine controls. Spend accent color on the next action, selected navigation and meaningful data. Do not dim locked milestones or essential guidance into unreadability. Disabled controls may be subdued, but adjacent explanations should stay readable.

## Palette directions

| Direction | Character | Trade-off |
| --- | --- | --- |
| **A. Graphite + teal — recommended** | Crisp, calm and technical; evolves the current identity | Needs a clearly distinct green success treatment |
| B. Midnight blue + ice blue | Stronger security-console character | More conventional; can drift into a generic blue SaaS interface |
| C. Neutral charcoal + indigo | Polished software/education character | Requires moving purple out of its existing owner/secondary roles |

Representative identity colors, not complete validated themes:
- A: dark canvas `#0D141E`, dark accent `#5EEAD4`; light canvas `#F5F7FA`, light accent `#0F766E`.
- B: dark canvas `#0B1220`, dark accent `#7DD3FC`; light canvas `#F4F7FB`, light accent `#0369A1`.
- C: dark canvas `#111318`, dark accent `#A5B4FC`; light canvas `#F7F7FA`, light accent `#4338CA`.

## Recommended A: initial foundation

These are proposed values, not applied application tokens or a complete state palette.

| Role | Dark | Light |
| --- | --- | --- |
| Canvas | `#0D141E` | `#F5F7FA` |
| Panel | `#131D2B` | `#FFFFFF` |
| Raised panel | `#1D2A3B` | `#EDF2F7` |
| Primary text | `#E8EEF6` | `#172033` |
| Secondary text | `#B8C4D4` | `#42526B` |
| Muted text | `#93A4BA` | `#5B6B82` |
| Primary accent | `#5EEAD4` | `#0F766E` |
| Primary-action foreground | `#082F2B` | `#FFFFFF` |
| Control outline | `#64748B` | `#8393A8` |

Calculated candidate contrast:
- Main text/panel: **14.53:1 dark**, **16.27:1 light**.
- Secondary text/panel: **9.60:1 dark**, **7.92:1 light**.
- Muted text/panel: **6.67:1 dark**, **5.43:1 light**.
- Primary-action foreground/fill: **9.78:1 dark**, **5.47:1 light**.
- Control outline/panel: **3.56:1 dark**, **3.13:1 light**. Recheck against the actual inset and outside surfaces before adopting everywhere.

The brighter dark-mode teal should be used sparingly, not for long passages. Light mode deliberately uses a much deeper teal; reusing the pale dark-mode accent on white would be the wrong approach.

## Suggested implementation, after choosing a direction

1. Preview the selected direction on the dashboard, lesson reader, lab inspector, feedback form and owner inbox in both themes.
2. Finalize state/background/foreground pairs; separate decorative borders from necessary control outlines.
3. Migrate remaining literal colors component by component, including dialogs, charts, syntax highlighting and loading/error/disabled states.
4. Remove obsolete legacy remapping rules only after checking their consumers.
5. Extend token contrast tests and rendered checks to hover, focus, selected, error, disabled and populated states in both themes. Preserve explicit terminal exceptions.

Recommendation: choose **A** as an evolution of SecCraft, not a wholesale rebrand. The larger quality gain comes from applying it consistently and assigning each color a clear purpose.

## Full migration follow-up

The approved direction has now been applied beyond the pilot. See [full-platform audit, implemented fixes and validation](color-system-full-audit.md); the findings above remain the pre-migration baseline.

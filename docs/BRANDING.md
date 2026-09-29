# SecCraft brand guide

**Status:** Current product identity, updated 2026-09-29. This guide supersedes the older Quench, Anvil, and WiFiForge naming proposals preserved in the decision-history documents.

## Platform identity

- **Name:** SecCraft
- **Full name:** SecCraft — Hands-on Cybersecurity Learning Platform
- **Repository:** `AmitPal-CyberBuddy/SecCraft`
- **GitHub Pages target:** <https://amitpal-cyberbuddy.github.io/SecCraft/>
- **Primary line:** Learn. Practice. Investigate. Improve.
- **Supporting line:** Learn cybersecurity by doing.
- **Purpose:** Practical, safe, evidence-led cybersecurity learning: investigate, test, document evidence, understand impact, remediate, retest, and report.

The platform is domain-agnostic. **Wireless Pentesting** is its first available learning path, not the platform name. The path's supporting line is **Understand the Protocol. Test the Implementation.**

## Visual system

The current frontend uses restrained ink/slate surfaces, brighter cyan-teal interaction accents, clear slate text, and status colors for severity and progress. Avoid describing the current interface as a purple/neon hacker theme.

- **Dark workspace:** ink background (`#080d17` / `#0b111b`), raised slate surfaces, readable brighter muted text, cyan-teal focus and active states.
- **Light workspace:** cool off-white canvas, white primary cards, pale slate inset panels, dark readable text.
- **Typography:** self-hosted Inter Variable for interface and display hierarchy, with system UI fallbacks and a native monospace stack for technical data. The Latin WOFF2 subset is 48 KB, SIL OFL-licensed, and served locally for offline use; no external font service is loaded.
- **Motion:** short state transitions and purposeful route/progress motion; respect `prefers-reduced-motion`.
- **Logo source assets:** `assets/logo/logo.svg`, `assets/logo/favicon.svg`, and the README banner at `assets/branding/hero-banner.png`. The shipped browser/PWA icon is `frontend/public/favicon.svg`; redundant copied logos, the obsolete Quench concept, the old WiFiForge wordmark, and unused starter graphics have been removed.

The implementation source of truth is `frontend/src/styles/refinement.css`, `frontend/src/index.css`, `frontend/tailwind.config.js`, and `frontend/src/content/platform.json`. If the visual tokens change, update `assets/branding/theme.ts` and this guide in the same change.

## Learning-path identity

- **Path ID:** `wireless-pentesting`
- **Title:** Wireless Pentesting
- **Path line:** Understand the Protocol. Test the Implementation.
- **Status:** Available
- **Current scope:** 20 modules, 27 lessons, 20 labs, 16 capture artifacts, 15 challenges, 35 scenarios, 42 checklist items, and `ENG-01`.

Other catalogue entries are planned and should not be described as shipped learning content until they contain authored modules and activities.

## Compatibility and history

`WiFiForge` is the former product/repository identity. It remains in selected compatibility surfaces—legacy environment variables, browser-storage keys, artifact names and labkit identifiers, flag prefixes, and historical documents. These are not current branding. Keep compatibility identifiers unless deliberately performing a separately tested data migration.

The repository rename does not automatically redirect the former GitHub Pages URL. Use the canonical `/SecCraft/` URL for current links. See [`GITHUB_PAGES.md`](GITHUB_PAGES.md) and [`BRANDING_MIGRATION.md`](BRANDING_MIGRATION.md).

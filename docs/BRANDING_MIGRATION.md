# Branding migration — completed

**Updated:** 2026-09-29
**Status:** Repository and product identity are SecCraft. This file is now a completion record, not a pending plan.

## Canonical identity and links

- Product: **SecCraft — Hands-on Cybersecurity Learning Platform**
- Repository: <https://github.com/AmitPal-CyberBuddy/SecCraft>
- GitHub Pages target: <https://amitpal-cyberbuddy.github.io/SecCraft/>
- Local Vite base: `/SecCraft/`; the Pages workflow derives the base from the repository name.
- Current primary line: **Learn. Practice. Investigate. Improve.**
- First available path: **Wireless Pentesting** (`wireless-pentesting`).

GitHub Pages does not automatically redirect the old `/WiFiForge/` Pages address after a repository rename. Current documentation and application links must use `/SecCraft/`. If a redirect for old Pages bookmarks is required, it must be hosted separately; this repository cannot create a redirect at the former project URL just by changing its new site's files.

## Completed updates

- Updated repository remote, README, security contact link, platform metadata, and Pages documentation to `SecCraft`.
- Set Vite's local default base to `/SecCraft/`; the Pages workflow uses `/${{ github.event.repository.name }}/` for published builds.
- Updated app metadata, local preview examples, service-worker messaging, and branding references.
- Kept React Router's basename tied to Vite's `BASE_URL`; public PWA URLs remain relative to the deployment base.
- Documented the current product identity, visual system, available content, local-first model, and planned-path boundaries.

## Compatibility intentionally retained

Legacy identifiers remain where changing them could strand user data or break generated learning artifacts. Examples include `WIFIFORGE_*` environment-variable fallbacks, `wififorge-*` local-storage fallbacks, `WIFIFORGE{}` challenge flags, `wififorge-labkit` artifact metadata, and historical asset/file names. They are compatibility identifiers, not instructions to use the former brand for new UI or links.

## Current content snapshot

The content catalogues currently contain 8 paths (1 available, 7 planned). The available Wireless Pentesting path has 20 modules, 27 lessons, 20 labs, 16 verified capture artifacts, 15 challenges (45 tasks), 35 scenarios, 42 checklist items, and `ENG-01`. Counts shown in the UI are derived from `frontend/src/content/`; update this snapshot when the catalogues change.

## Verification

- `cd frontend && npm ci && npm run build`
- `python3 scripts/verify-lab-artifacts.py`
- `python3 scripts/verify-no-dummy-data.py`
- Check `/SecCraft/` and nested routes in the local Pages emulator.

The old name-selection and migration drafts remain in the repository as historical records. Current identity and implementation details are maintained in [`BRANDING.md`](BRANDING.md), [`GITHUB_PAGES.md`](GITHUB_PAGES.md), and [`README.md`](../README.md).

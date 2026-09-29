# Branding Migration — WiFiForge → Platform

**Date:** 2026-09-28
**Status:** Stage 1-2 implemented (path-aware + dual branding), Stage 3-6 planned

## Current

- Product Name: WiFiForge
- Full Title: WiFiForge — Wireless Pentest Academy
- Tagline: Forge. Break. Fix. Retest.
- Secondary: Understand the Protocol. Test the Implementation.
- Repo: AmitPal-CyberBuddy/WiFiForge
- Base: /WiFiForge/
- Logo: Anvil + Wi-Fi arcs — Forge Mark
- Palette: slate-950 #020617, cyan #22d3ee primary, violet #a78bfa secondary

## Conflict

**Black Hills InfoSec WifiForge** (github.com/blackhillsinfosec/WifiForge, 1.2k stars, 152 forks, Apache-2.0, 9 hands-on labs, mininet-wifi, Docker, zero hardware, safe legal Wi-Fi security training, wififorge.github.io, blackhillsinfosec.com/wififorge, part of BHIS Forge line SDRForge) — directly same niche (wireless security training, hands-on labs, zero hardware). Previous branding doc claimed minor collision, none academy-style — that was inaccurate. BHIS WifiForge *is* academy-style and well-known.

Additional conflicts for obvious Forge names:
- SecForge: secforge.de (German dev lab), secforge.io (DevSecOps immersive platform with interactive challenges, hands-on labs)
- CyberForge: cyberforge-academy.com (autonomous AI cybersecurity university), GW CyberForge, cyberforge.academy
- LabForge: anshu19981/Lab-forge (12+ vulnerable web & API labs), EPHAK/labforge, GemForgeLabs
- BreakForge: breakforge.io (accessible cyber security training, motto “Break to learn, Forge to grow” — very similar to our tagline)
- BreachForge: breachforgelabs.com (hands-on cybersecurity training)
- TraceForge: traceforge.com (session replay), traceforce.ai, multiple GitHub TRACEFORGE SOC platforms
- ScopeForge: LeDoNguyenTu/ScopeForge (open-source app security, evidence-driven workflow Discover->Validate->Explain->Connect->Prepare->Fix->Verify — very close methodology), ScopeForgeX
- Foundry/ForgePath: forgepath.com (cybersecurity services including wireless security assessment), Cisco Foundry Security Spec (May 2026, agentic AI cybersecurity evaluation framework)
- Crucible: CMU SEI Crucible Cyber Platform (open source learning and mission rehearsal platform)
- EvidenceForge: Cisco Talos EvidenceForge (synthetic security logs for threat hunting training)
- RedForge, PurpleForge, SignalForge, VectorForge, VulnForge, HexForge, ByteForge, RootForge, ForgeCore, Exploit-Forge, Forge Institute — all have moderate-strong conflicts (see PLATFORM_REPOSITIONING.md Section D)

## Recommended Platform Names (Shortlist)

1. **Anvil** — anvil silhouette already in logo, preserves Forge philosophy (forge on anvil), short, memorable, domain-neutral, low-moderate conflict (AnvilSec exists but services, not training), high scalability, high technical credibility. Can be `Anvil Academy` or `Anvil Labs` with tagline Forge. Break. Fix. Retest. Wireless path as `Anvil: Wireless Pentesting — WiFiForge Path`.

2. **TemperForge** — tempering hardens metal, reflects Break → Fix → Retest (break, temper/harden, retest), preserves Forge, domain-neutral, low-moderate conflict (Temper And Forge digital agency, TTPForge framework), high scalability, high technical credibility.

3. **Verifex** — verify + ex, evidence-driven verification, reflects differentiator (evidence, verification, retest), domain-neutral, memorable, invented, high technical credibility, low-moderate conflict (Verifex Global anti-counterfeit, Verifex vuln triage module, Veriforce safety LMS).

4. **AttestForge** — attest = provide evidence, proof, core to evidence standard, preserves Forge, domain-neutral, high technical credibility, low-moderate conflict.

5. **MasonForge** — mason builds, crafts, builder metaphor, low conflict, high scalability, moderate-high technical credibility.

6. **ChainForge** — chain of custody, kill chain, attack chain, preserves Forge, moderate conflict (Chainforge Technologies Web3 + cybersecurity).

Ranked recommendation: Anvil (1), TemperForge (2), Verifex (3).

## Migration Stages

### Stage 1 — Architecture path-aware (Done)

- platform.json, learning-paths.json, skills.json, platform.ts types
- modules.json + labs.ts + challenges.json + engagements.json + scenarios.json now include learningPathId
- stats.ts path-aware, useProgressStore path-aware with platform-progress key + wififorge-progress fallback
- backend learning_paths router: /api/learning-paths, /api/platform, /api/modules?path=...
- verify-no-dummy-data.py checks platform files, planned paths have empty modules

No rename yet, but codebase ready.

### Stage 2 — Dual branding (Partially Done)

- platform.json name Anvil (proposed, can be changed after stakeholder decision)
- index.html title Anvil — Hands-on Cybersecurity Learning Platform, description platform + wireless as first path
- manifest.json name Anvil — Hands-on Cybersecurity Learning Platform
- Sidebar.tsx platform brand Anvil + Hands-on Cybersecurity, current path indicator Wireless Pentesting with legacy WiFiForge brand inside, sections Learn/Practice/Assess/Track
- Dashboard.tsx platform hero Learn cybersecurity by doing. + Forge. Break. Fix. Retest. + platform overview + featured path Wireless + all paths grid
- Topbar theme key platform-theme with wififorge-theme fallback

Keep VITE_BASE=/WiFiForge/ for now to not break GitHub Pages.

### Stage 3 — Wireless into Learning Paths structure (Done for list + detail, legacy routes kept)

- New pages: LearningPaths.tsx (list all paths, 1 available, 7 planned), PathDetail.tsx (phases within path)
- App.tsx routing: /paths, /paths/:pathId, /paths/:pathId/modules, /paths/:pathId/modules/:id + legacy /path, /modules, /modules/:id, /labs, /challenges, /engagement with backward compat
- Modules.tsx path-aware filter, effectivePathId from useParams or module.learningPathId
- ModuleDetail.tsx path-aware breadcrumb

### Stage 4 — Docs and repo metadata (Pending full)

- README.md, docs/BRANDING.md, BRANDING_DECISION.md, ARCHITECTURE_AND_ROADMAP.md, GITHUB_PAGES.md, SECURITY.md to be updated to platform-level
- frontend/package.json name wififorge -> anvil (or chosen) with alias
- backend/app/main.py title Anvil API (done)

### Stage 5 — Deployment/domain references (Pending)

- Keep VITE_BASE=/WiFiForge/ until final rename decision
- If repo rename (WiFiForge -> Anvil/TemperForge/Verifex): GitHub auto-redirects, update VITE_BASE to /<new-repo>/, keep old site with redirect page
- Update badges, README links, docs, internal links, nginx.conf, Dockerfile, env vars WIFIFORGE_* -> PLATFORM_* with backward compat, localStorage keys migration, favicon, SEO, OG image, canonical URLs

### Stage 6 — Redirects/compatibility (Partially Done)

- SPA 404.html fallback already handles deep links
- App.tsx has legacy routes, but explicit redirects /path -> /paths/wireless-pentesting, /modules/:id -> /paths/wireless-pentesting/modules/:id to be added
- Backend /api/modules returns all modules (backward compat) + filter ?path=...
- Flag prefix WIFIFORGE{} kept for wireless historical continuity
- Lab artifact names kept
- wififorge-labkit method name kept with platform-labkit alias

## Tagline

Retain Forge. Break. Fix. Retest. as primary platform philosophy.

Supporting:
- Platform secondary: Learn cybersecurity by doing.
- Platform tertiary: Investigate systems, perform security testing, collect evidence, understand impact, remediate, retest, report.
- Wireless path: Understand the Protocol. Test the Implementation.

## Visual Identity

- Keep palette slate-950 #020617 bg, cyan #22d3ee primary, violet #a78bfa secondary, Sora + Inter + JetBrains Mono, Forge Mark anvil silhouette
- Platform logo: anvil without Wi-Fi arcs
- Wireless path logo: anvil with Wi-Fi arcs (legacy WiFiForge mark) inside Wireless path
- Favicon: platform anvil without arcs, wireless path anvil + arcs

## Next Steps

1. Stakeholder decision on final platform name from shortlist (recommend Anvil, TemperForge, Verifex)
2. Implement Stage 4-6 as per plan
3. Verify: npm run build, verify-no-dummy-data.py, verify-lab-artifacts.py, typecheck, npm audit

*Forge. Break. Fix. Retest. — Branding Migration*

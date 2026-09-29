# Branding Decision — Evolution Log

**Date:** 2026-09-28
**Current status (2026-09-29):** The actual selected product/repository name is SecCraft; repository `AmitPal-CyberBuddy/SecCraft`. Earlier Quench/Anvil entries below are historical proposals, superseded by the rename.
**Current branch:** `arena/01a0ebce-seccraft`

## Current Decision — SecCraft

SecCraft is the current platform and repository name. Canonical links are the GitHub repository and Pages URL in [`BRANDING.md`](BRANDING.md). Current taglines and design details are maintained in that guide and `frontend/src/content/platform.json`.

## Decision History

### 2026-09-28 (Original) — WiFiForge Locked (Superseded)

**Product Name:** WiFiForge
**Full Title:** WiFiForge — Wireless Pentest Academy
**Short Name / Package:** wififorge
**Repo Name:** WiFiForge (AmitPal-CyberBuddy/WiFiForge)
**Primary Tagline:** Forge. Break. Fix. Retest.
**Secondary Tagline:** Understand the Protocol. Test the Implementation.
**Tertiary / Hero Sub:** The Wireless Pentest Lab You Control.
**Visual Direction:** Technical Professional — Dark slate + cyan + violet
**Voice:** Senior pentester as mentor

**Palette — Locked Tokens (retained for platform):**
```js
colors: {
  bg: { 950: "#020617", 900: "#0f172a", 800: "#1e293b", 700: "#334155" },
  text: { primary: "#f1f5f9", secondary: "#94a3b8", muted: "#64748b" },
  accent: { cyan: "#22d3ee", violet: "#a78bfa", emerald: "#34d399", amber: "#fbbf24", red: "#f87171", pink: "#f472b6" }
}
fonts: { heading: "Sora", body: "Inter", mono: "JetBrains Mono" }
logo: { concept: "Forge Mark — anvil + Wi-Fi arcs" }
```

**This decision was superseded by platform repositioning assessment.**

### 2026-09-28 (Revised) — Platform Repositioning — Assessment

**Critical Finding:** WiFiForge name collides directly with Black Hills InfoSec WifiForge (github.com/blackhillsinfosec/WifiForge, 1.2k stars, 152 forks, Apache-2.0, 9 labs, mininet-wifi, Docker, zero-hardware, wififorge.github.io) — same niche (wireless security training, hands-on labs). Previous assessment claimed minor collision, none academy-style — inaccurate. BHIS WifiForge IS academy-style and well-known, part of BHIS Forge line (SDRForge).

**Additional Conflicts Found (obvious Forge names):**
- SecForge: secforge.de (German dev lab), secforge.io (DevSecOps immersive platform)
- CyberForge: cyberforge-academy.com (AI cybersecurity university) — user asked about this, rejected due to direct training platform conflict + generic "Cyber" buzzword
- LabForge: 12+ vulnerable labs dashboard
- BreakForge: breakforge.io "Break to learn, Forge to grow" — similar to our tagline
- BreachForge, TraceForge, ScopeForge (evidence-driven workflow very close to our methodology), Foundry/ForgePath, Crucible (CMU), EvidenceForge (Cisco Talos), RedForge, PurpleForge, SignalForge, VectorForge, VulnForge, HexForge, ByteForge, RootForge, ForgeCore, Exploit-Forge — all had moderate-to-strong naming conflicts in the historical shortlist.

**Decision:** Platform brand must change to domain-neutral. WiFiForge becomes Wireless path sub-brand.

### 2026-09-28 — Quench Proposal (Superseded)

This earlier draft recorded **Quench** as a proposed name. The subsequent repository rename and current product metadata establish **SecCraft** as the actual name; retain this section only as planning history.

**Why Quench — evaluation against criteria:**

**Criteria:** domain-neutral, memorable, technically credible, GitHub org/repo usable, website suitable, not confusingly similar, not overly generic, not tied to tool, preserve Forge concept where appropriate.

1. **Concept:** Quenching hardens metal after forging — maps to Fix→Retest loop, our differentiator (quench the attack chain by hardening, retest). In blacksmithing: heat → forge → quench → temper. Quench is the hardening step.
2. **Why fits:** 
   - Preserves Forge concept without using Forge word — avoids BHIS Forge line saturation (WifiForge, SDRForge) and 15+ other Forge conflicts
   - Short, 1 syllable, memorable, verb, distinctive — not buzzword like Cyber
   - Domain-neutral — not tied to Wi-Fi, Web, Android, API, tool
   - Tagline evolution: `Forge. Break. Fix. Quench. Retest.` — adds quench as hardening step, retains original `Forge. Break. Fix. Retest.` as legacy philosophy
   - Visual: Forge Mark anvil + quench droplet/hardening mark — platform anvil without Wi-Fi arcs + quench droplet, wireless path anvil with Wi-Fi arcs (legacy WiFiForge)
3. **Conflicts:** Quench is used as minor tool name, no major hands-on cybersecurity learning platform named Quench Academy found. Low conflict — much lower than CyberForge (cyberforge-academy.com AI university direct competitor) and Anvil (AnvilSec, Anvil Corp ICS range). Search for Quench cybersecurity platform shows no direct training platform.
4. **Scalability:** High — `Quench: Wireless Pentesting (legacy WiFiForge)`, `Quench: Web Application Security`, `Quench: API Security`, `Quench: Android`, `Network`, `AD`, `Cloud`, `AI/LLM` — works as prefix
5. **Technical credibility:** High — metallurgy term quenching = hardening, maps to remediation that breaks attack chain, not generic "Cyber"
6. **Repo:** `AmitPal-CyberBuddy/Quench` or `quench-academy` or `quench-labs` — GitHub auto-redirects old `WiFiForge` → new, `VITE_BASE` `/WiFiForge/` kept for now with redirect page later, package.json name `quench`

**Platform Decision (Final):**

- **Platform Name:** Quench
- **Full Title:** Quench — Hands-on Cybersecurity Learning Platform
- **Short Name / Package:** quench (legacy wififorge kept for backward compat)
- **Legacy Name:** WiFiForge (retained as Wireless path sub-brand)
- **Primary Tagline:** Forge. Break. Fix. Quench. Retest. (evolution from Forge. Break. Fix. Retest. — adds quench hardening step)
- **Secondary Tagline:** Learn cybersecurity by doing.
- **Tertiary:** Investigate systems, perform security testing, collect evidence, understand impact, remediate, quench the attack chain by hardening, retest fixes, and complete realistic assessments.
- **Philosophy:** Learn → Understand → Observe → Enumerate → Test → Validate → Collect Evidence → Understand Impact → Remediate → Quench (Harden) → Retest → Report
- **Philosophy Short:** Learn → Observe → Test → Quench → Report
- **Palette:** Retained slate-950 #020617 bg, cyan #22d3ee primary, violet #a78bfa secondary, Sora + Inter + JetBrains Mono
- **Logo:** Platform anvil without Wi-Fi arcs + quench droplet/hardening mark, Wireless path anvil with Wi-Fi arcs (legacy WiFiForge mark)
- **Why Quench over Anvil:** User chose Quench — both are good, Quench is more distinctive (1 syllable vs 2), more directly maps to Fix→Retest hardening differentiator, even lower conflict than Anvil, still preserves Forge concept (quench is part of forging). Anvil is where forging happens, Quench is how you harden what you forged — both valid, Quench is more active verb.

**Wireless Path Sub-Brand:**

- **Path ID:** wireless-pentesting
- **Title:** Wireless Pentesting
- **Short Title:** Wireless
- **Legacy Brand:** WiFiForge
- **Legacy Flag Prefix:** WIFIFORGE{} retained
- **Tagline:** Understand the Protocol. Test the Implementation.
- **Content:** 20 modules, 27 lessons, 16 verified PCAPs, 15 challenges, 35 scenarios, 42-item checklist, ENG-01 engagement — all preserved

**Repository Naming:**

- Current: AmitPal-CyberBuddy/WiFiForge
- Future: AmitPal-CyberBuddy/Quench or quench-academy or quench-labs (stakeholder decision)
- Migration: GitHub auto-redirects repo renames, VITE_BASE /WiFiForge/ kept for now with redirect page later, package.json name quench, env vars PLATFORM_* with WIFIFORGE_* fallback, localStorage platform-* with wififorge-* fallback

**Visual Identity Evolution:**

- Keep: palette, fonts, anvil silhouette, technical professional aesthetic, senior pentester mentor voice
- Change: platform logo anvil without Wi-Fi arcs + quench droplet (domain-neutral hardening), wireless path logo anvil + Wi-Fi arcs (legacy)
- Evolution: tagline Forge. Break. Fix. Retest. → Forge. Break. Fix. Quench. Retest. (adds hardening step)

**Implementation Status:**

- Stage 1 architecture path-aware: Done
- Stage 2 dual branding Quench: Done (platform.json, index.html, manifest.json, package.json, Sidebar, Dashboard, Topbar, backend main.py)
- Stage 3 wireless into paths structure: Done for LearningPaths list/detail, Modules path-aware, ModuleDetail path-aware, Labs path-aware, Challenges path-aware, Engagement list+detail path-aware, GlobalSearch generic, Reference path-aware, Terminal platform-aware, Certificate path-aware, Modules phaseStats bug fix
- Stage 4 docs: This file + BRANDING.md updated, ARCHITECTURE_AND_ROADMAP.md, GITHUB_PAGES.md updated to Quench
- Stage 5 deployment: VITE_BASE /WiFiForge/ kept, backend config dual env vars done
- Stage 6 compatibility: App.tsx explicit redirects /path → /paths/wireless-pentesting, localStorage dual keys, flag prefix retained, artifact names retained, labkit method alias

**Rejected Alternative — CyberForge:**

- CyberForge was rejected in that historical proposal because the category term was generic and the name conflicted with an existing training product.

For the current identity and migration record, see [`BRANDING.md`](BRANDING.md) and [`BRANDING_MIGRATION.md`](BRANDING_MIGRATION.md). The old stage plan and candidate-name research were retired after completion; this file keeps only the decision rationale.

*Branding decision evolution — current product: SecCraft*

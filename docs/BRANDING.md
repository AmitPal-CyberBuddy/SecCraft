# Branding — Platform vs Path

> **Platform Repositioning Notice (2026-09-28):** This document was originally WiFiForge-only. It is now superseded in part by `docs/PLATFORM_REPOSITIONING.md` (full A-H assessment) and `docs/BRANDING_MIGRATION.md` (staged migration). This file now documents both platform brand (Quench — final) and wireless path sub-brand (WiFiForge retained).

## Platform Brand — Quench Final

**Status:** Final — user chose Quench on 2026-09-28 — see Section D in PLATFORM_REPOSITIONING.md for shortlist evaluation with conflict research, BRANDING_DECISION.md for evolution log.

**Platform Name:** Quench
**Full Title:** Quench — Hands-on Cybersecurity Learning Platform
**Legacy Name:** WiFiForge (retained as Wireless path sub-brand for continuity)
**Primary Tagline:** Forge. Break. Fix. Quench. Retest. (evolution from Forge. Break. Fix. Retest. — adds quench hardening step, maps to VAPT loop)
**Secondary Tagline:** Learn cybersecurity by doing.
**Tertiary:** Investigate systems, perform security testing, collect evidence, understand impact, remediate, quench the attack chain by hardening, retest fixes, and complete realistic assessments.
**Philosophy:** Learn → Understand → Observe → Enumerate → Test → Validate → Collect Evidence → Understand Impact → Remediate → Quench (Harden) → Retest → Report
**Detailed Loop:** Observe → Interpret → Hypothesise → Choose the test → Execute → Evidence → Conclude → Impact → Remediate → Quench → Retest → Report
**Philosophy Short:** Learn → Observe → Test → Quench → Report

**Why Quench:**
- Preserves Forge concept (quenching hardens metal after forging) without using Forge word — avoids BHIS Forge line confusion (WifiForge, SDRForge) and 15+ other Forge conflicts (SecForge, CyberForge, LabForge, BreakForge, etc.)
- Short, 1 syllable, memorable, verb, distinctive, domain-neutral (not tied to Wi-Fi, Web, Android, API, tool) — not generic buzzword like CyberForge
- Visual identity retained: anvil silhouette already in logo, add quench droplet/hardening mark for platform, keep Wi-Fi arcs for wireless path (legacy WiFiForge)
- Low conflict: No major hands-on cybersecurity learning platform named Quench Academy found — much lower than CyberForge (cyberforge-academy.com AI university direct competitor) and Anvil (AnvilSec, Anvil Corp ICS range). Quench used as minor tool name, not training platform.
- High scalability: Quench: Wireless Pentesting (legacy WiFiForge), Quench: Web Application Security, Quench: API Security, Quench: Android, Network, AD, Cloud, AI/LLM — works as prefix
- High technical credibility: quenching = hardening, maps to remediation that breaks attack chain, Fix→Retest differentiator, professional, senior pentester mentor
- Tagline evolution: Forge. Break. Fix. Retest. → Forge. Break. Fix. Quench. Retest. — adds hardening step, still domain-neutral VAPT loop

**Palette — Platform (domain-neutral, retained):**
```js
bg: { 950: "#020617", 900: "#0f172a", 800: "#1e293b", 700: "#334155" }
accent: { cyan: "#22d3ee" primary, violet: "#a78bfa" secondary, emerald: "#34d399" success, amber: "#fbbf24" warning, red: "#f87171" danger, pink: "#f472b6" highlight }
fonts: { heading: "Sora, Space Grotesk", body: "Inter", mono: "JetBrains Mono" }
logo: { platform: "anvil without Wi-Fi arcs + quench droplet", wirelessPath: "anvil with Wi-Fi arcs (legacy WiFiForge mark)" }
```

**Visual Identity:**
- Platform logo: anvil silhouette without Wi-Fi arcs + quench hardening droplet — Forge Mark anvil, hammer, spark, quench
- Wireless path logo: anvil + Wi-Fi arcs (legacy WiFiForge) inside Wireless path
- Favicon: platform anvil without arcs + quench droplet, wireless path anvil + arcs
- OG image: dark bg + platform logo + tagline Forge. Break. Fix. Quench. Retest. + secondary Learn cybersecurity by doing.

**Naming Shortlist (from PLATFORM_REPOSITIONING.md Section D):**
1. Quench — final choice, best balance, preserves Forge Mark visual via quenching, avoids BHIS Forge line, low conflict, hardening differentiator
2. Anvil — previous recommendation, anvil silhouette already in logo, preserves Forge philosophy (forge on anvil), short, memorable, low-moderate conflict
3. TemperForge — preserves Forge, adds hardening concept Break→Fix→Retest, low-moderate conflict (Temper And Forge agency, TTPForge framework)
4. Verifex — evidence-driven verification, domain-neutral, low-moderate conflict
5. AttestForge, MasonForge, ChainForge — also viable
**Avoid:** SecForge, CyberForge (cyberforge-academy.com AI university direct competitor + generic buzzword), LabForge, BreakForge, BreachForge, TraceForge, ScopeForge, EvidenceForge, RedForge, PurpleForge, SignalForge, VectorForge, VulnForge, HexForge, ByteForge, RootForge, ForgePath, Foundry, Crucible, Exploit-Forge — all have strong conflicts with existing cybersecurity training/labs/specs

**Critical Conflict Finding:**
- Black Hills InfoSec WifiForge (github.com/blackhillsinfosec/WifiForge, 1.2k stars, 152 forks, Apache-2.0, 9 labs, mininet-wifi, Docker, zero-hardware, wififorge.github.io) — directly same niche (wireless security training, hands-on labs, zero-hardware). Previous assessment claimed minor collision, none academy-style — inaccurate. BHIS WifiForge IS academy-style and well-known. Platform rename required.
- CyberForge: cyberforge-academy.com AI-operated cybersecurity university — direct training platform conflict, plus generic Cyber buzzword fails not overly generic + technically credible

## Wireless Path Sub-Brand — WiFiForge Retained

**Path ID:** wireless-pentesting
**Title:** Wireless Pentesting
**Short Title:** Wireless
**Legacy Brand:** WiFiForge — retained inside path for continuity
**Legacy Flag Prefix:** WIFIFORGE{} — retained for historical continuity
**Tagline (Path):** Understand the Protocol. Test the Implementation.
**Description:** Hands-on wireless security assessment — from 802.11 fundamentals to enterprise EAP/RADIUS and professional reporting. 20 modules, 27 lessons, 16 verified captures, 15 challenges, 35 decision scenarios, 42-item checklist, ENG-01 engagement.
**Icon:** 📡
**Color:** cyan
**Lab Kit Method:** wififorge-labkit (historical) + platform-labkit alias generic
**Logo:** anvil + Wi-Fi arcs (legacy WiFiForge mark)

## Platform Hierarchy

```
Platform (Quench — domain-neutral, quench hardening after forging)
├── Learning Paths (path-aware)
│   ├── wireless-pentesting (available, 20 mods, reference, legacy WiFiForge)
│   ├── web-application-security (planned)
│   ├── api-security (planned)
│   ├── android-pentesting (planned)
│   ├── network-pentesting (planned)
│   ├── active-directory (planned)
│   ├── cloud-security (planned)
│   └── ai-llm-security (planned)
├── Labs (reusable: PCAP, HTTP, APK, config, logs, IAM, Terraform)
├── Challenges (guided → semi-guided → assessment, path-aware)
├── Assessments / Engagements (scope, RoE, targets, artefacts, tasks, marking guide)
├── Skills (generic + domain-specific)
└── Evidence / Reporting (generic)
```

Do NOT build future paths now — one excellent path preferable to shallow platform with many empty paths.

## Tagline Evaluation

**Forge. Break. Fix. Quench. Retest.** — Final as primary platform philosophy (evolution from Forge. Break. Fix. Retest.)
- Domain-neutral? Yes — applies to any security domain, quench = harden, break attack chain
- Memorable? Yes — 5 verbs, loop, VAPT mindset, quench adds hardening differentiator
- Technically credible? Yes — senior pentester mentor, metallurgy quenching = hardening
- Suitable for broader platform? Yes — maps to generic VAPT loop Remediate → Quench → Retest

Supporting:
- Platform secondary: Learn cybersecurity by doing.
- Platform tertiary: Investigate systems, perform security testing, collect evidence, understand impact, remediate, quench the attack chain by hardening, retest fixes, and complete realistic assessments.
- Wireless path: Understand the Protocol. Test the Implementation.
- Legacy philosophy: Forge. Break. Fix. Retest. retained as historical note

## Product Positioning (Eventual)

> A hands-on cybersecurity learning platform where learners don't just consume security content — they investigate systems, perform security testing, collect evidence, understand impact, remediate vulnerabilities, quench the attack chain by hardening, retest fixes, and complete realistic assessments.

Differentiator: learning through practical VAPT methodology + quench hardening, not just courses. Evidence standard, severity from impact, remediation that breaks attack chain (quench), retest with same test, reporting client can act on.

## Avoid Copying TryHackMe / Hack The Box

Use as conceptual references for learning paths, labs, challenges, progression, assessments, hands-on learning. Do NOT copy branding, visual identity, terminology unnecessarily, IA unnecessarily, gamification without reason, feature sets simply because they exist elsewhere. Own identity: Technical Professional — dark slate + cyan + violet, Sora + Inter + JetBrains Mono, Forge Mark anvil + quench droplet, senior pentester mentor, professional, evidence-driven, local-first, zero-cost, offline-capable.

## Historical — Original WiFiForge Branding (Preserved for Reference)

**Original Repo:** AmitPal-CyberBuddy/WiFiForge
**Original Title:** WiFiForge — Wireless Pentest Academy
**Original Assessment (pre-2026-09-28):**
- Verdict claimed KEEP WiFiForge as core, minor collision with small GitHub projects, none academy-style — **this assessment was inaccurate after discovery of BHIS WifiForge 1.2k stars**
- Options considered: WiFiForge (recommended keep), AirForge Academy, Dot11 Academy, Beacon Academy, Spectrum Lab, AetherSec Academy, WaveLab
- Tagline options: Forge. Break. Fix. Retest. (primary), Learn • Observe • Test • Report, Understand the Protocol. Test the Implementation. (favorite for pro positioning), From Beacons to Reports., The Wireless Pentest Lab You Control.
- Palette, typography, logo concept Forge Mark anvil + Wi-Fi arcs — retained for wireless path, platform logo anvil + quench droplet (Quench)

**Why it changed:** Domain-specific name fails scalability (WiFiForge — Web Application Security confusing), major conflict with BHIS WifiForge same niche + CyberForge Academy direct competitor, platform needs domain-neutral name. Tagline and visual identity (anvil silhouette, palette, fonts) retained, evolved to Forge. Break. Fix. Quench. Retest.

See docs/PLATFORM_REPOSITIONING.md Section C for full reasoning, Section D for naming options with conflict research, docs/BRANDING_MIGRATION.md for staged migration.

*Forge. Break. Fix. Quench. Retest. — Platform vs Path Branding — Final: Quench*

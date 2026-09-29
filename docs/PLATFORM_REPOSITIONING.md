# Platform Repositioning & Branding Review — WiFiForge → Hands-on Cybersecurity Learning Platform

**Date:** 2026-09-28
**Status:** Assessment + Architecture Recommendation + Staged Migration Plan
**Branch:** arena/01a0e917-wififorge
**Goal:** Generalize the platform without losing the depth and identity of the existing Wireless Pentesting experience.

---

## Executive Summary

Today the product is:

> **WiFiForge — Wireless Pentest Academy**
> Tagline: Forge. Break. Fix. Retest.
> 20 modules · 27 lessons · 15 challenges · 16 verified PCAPs · 1 engagement (ENG-01)

Intended long-term:

> **[New Platform Brand] — Hands-on Cybersecurity Learning Platform**
> Learning Paths: Wireless Pentesting (Path #1, mature), Web App Security, API Security, Android Pentesting, Network Pentesting, AD, Cloud Security, AI/LLM Security
> Differentiator: learning through practical VAPT methodology — Observe → Interpret → Hypothesise → Test → Evidence → Impact → Remediate → Retest → Report

**Key finding:** The name **WiFiForge** is not just narrow — it directly collides with an established BHIS tool (Black Hills InfoSec WifiForge, 1.2k stars, Apache-2.0, 9 labs, mininet-wifi, Docker, zero-hardware, safe learning). BHIS WifiForge is documented at wififorge.github.io, 1337skills.com/cheatsheets/wififorge, blackhillsinfosec.com/wififorge, and is part of BHIS Forge line (SDRForge). Our current branding doc claimed “minor collision, none academy-style” — that is no longer accurate. BHIS WifiForge *is* academy-style.

**Recommendation:**
- **Platform brand must change** to a domain-neutral name.
- **WiFiForge becomes the Wireless learning path sub-brand**: `Wireless Pentesting — powered by WiFiForge methodology` or `WiFiForge: Wireless Path` retained inside the Wireless path for continuity.
- **Forge. Break. Fix. Retest.** is retained as platform philosophy, not just wireless tagline. It maps to the generic VAPT loop and is more valuable than the WiFiForge name itself.
- Architecture becomes path-aware in Stage 1 before any rename, so Wireless depth is preserved.

---

## A. Current-State Assessment

### What is Wi-Fi-specific (coupling)?

**Branding / Metadata / Deployment:**
- README.md: Title, hero banner, badges, description, tagline, scope all wireless.
- frontend/index.html: `<title>WiFiForge — Wireless Security Academy</title>`, meta description mentions 20 modules, 27 lessons, 16 verified 802.11 captures, 15 challenges, 35 decision scenarios, 42-item VAPT checklist. `apple-mobile-web-app-title = WiFiForge`.
- frontend/public/manifest.json: name `WiFiForge — Wireless Penetration Testing Academy`.
- frontend/vite.config.ts: DEFAULT_BASE `/WiFiForge/`, plugin name `wififorge:static-hosting`, `wififorge:security-headers`, CSP injected.
- .github/workflows/pages.yml, ci.yml: VITE_BASE `/<repo>/`, artifact paths, repo name WiFiForge.
- Dockerfile, docker-compose.yml, nginx.conf: image names, env `WIFIFORGE_JWT_SECRET`, `WIFIFORGE_ALLOWED_ORIGINS`, volume names.
- assets/logo/*, assets/branding/*: anvil + Wi-Fi arcs — good for wireless path, too narrow for platform.

**UI / Navigation:**
- Sidebar.tsx: Logo `WiFi + Forge`, subtitle `Wireless PT Academy`, nav `Dashboard, Learning Path, Modules (20), Engagement ENG-01, Labs (PCAP count), Challenges, Reference, Reports, Settings`. Methodology box `Learn → Observe → Test → Report` with `Phase 4 • Attack Labs`. Lab Environment box `Zero-cost • Offline` + `PCAPs captures • verified`. Footer `WiFiForge • 20 modules • 20 labs` + `Forge. Break. Fix. Retest. • Local-first`.
- Topbar: shows current module id `02-wifi-fundamentals`, theme toggle, search.
- Dashboard.tsx: Header `Forge. Break. Fix. Retest.` + `Your wireless PT journey • 20 modules • zero-cost`. Stats: XP, Lessons, Labs with `TOTAL_PCAPS verified captures`. VAPT Loop box `Learn → Observe → Enum → Test → Evidence → Remediate → Retest → Report` but skills chips `ssid, bssid, 802.11, wireshark, wpa2, eap` — wireless-specific. Learning Path strip shows 10 of 20 wireless modules. Quick Actions: Browse Modules, Hands-on Labs (Capture • Config • Simulated), Challenges.
- LearningPath.tsx: Currently *phases* of wireless path, not list of paths. Phase names: Foundations (Wireless fundamentals & 802.11), Reconnaissance (Wireless recon & traffic analysis), Wi-Fi Security (WEP, WPA/WPA2, WPS, WPA3), Attack Techniques (Deauth, Rogue AP, Captive Portals), Enterprise Wi-Fi, Professional. Progress uses `modules.filter(m => m.phase === 1)` etc.
- Modules.tsx, ModuleDetail.tsx: Module ids like `01-intro-wireless`, `02-wifi-fundamentals`, etc. Difficulty, lab_requirement SIMULATION/HYBRID/RF_REQUIRED — RF_REQUIRED is wireless-specific (radio hardware). Quiz questions wireless.
- Labs.tsx: `LABS` from content/labs.ts, artifacts from lab-artifacts.json (lab_psk, eap_user, radius_weak_secret), TierBadge `SIMULATION • HYBRID • RF_REQUIRED`, parser info `wififorge-labkit`, PCAPs list `beacon-only, recon-lab, traffic-analysis, wpa2-handshake, pmkid, wps-beacon, wpa3-only, wpa3-transition, deauth, rogue-ap, captive-portal, enterprise, eap, radius, corporate-attacks, methodology`.
- Challenges.tsx, ChallengeDetail.tsx: challenges.json 15 items all wireless: beacon triage, recon, traffic analysis, handshake, etc. Flags `WIFIFORGE{...}`.
- Engagement.tsx: engagements.json ENG-01 Northwind Retail — Flagship Store, 4 SSIDs, RADIUS review, etc. — wireless-specific.
- Reference.tsx: ChecklistPanel 42-item master checklist — `Wireless PT master checklist`, commands.json `airodump-ng, aireplay-ng --deauth, hashcat -m 22000, tshark, iw dev wlan0 scan, hostapd — Rogue AP, wash -i wlan0mon`, filters.json `wlan.fc.type_subtype==8, eapol, wlan.fc.type_subtype==12`.
- Reports.tsx, ReportEditor.tsx, ReportTemplates.tsx: Finding template `Module: Wi-Fi Fundamentals, Type: Wireless Configuration`, evidence example `PCAP: beacon-only.pcapng (SHA-256 in frontend/public/pcaps/MANIFEST.md) Frame X Beacon — SSID, BSSID, Ch`.
- Certificate.tsx: `WiFiForge Certified`, `Wireless Penetration Testing Academy • Professional`, description mastery in 802.11 architecture, recon, traffic analysis, WEP/WPA2/WPA3, WPS, deauth, rogue AP, captive portals, Enterprise 802.1X/EAP/RADIUS.
- EvidenceVault.tsx: Store key `wififorge-evidence-vault`, export `wififorge-evidence-*.json`.
- TerminalEmulator.tsx: `WiFiForge Terminal — simulated Kali-style shell`, prompt `kali@wififorge: ~/labs`, output includes Wi-Fi Protected Setup State.
- PcapInspector.tsx, ReconMap.tsx, HandshakeDiagram.tsx, ConfigViewer.tsx, LabScoring.tsx, AttackDefenseRetest.tsx: all decode 802.11 fields, RSNE, AKM, cipher, MFPC/MFPR, EAPOL, etc.
- GlobalSearch.tsx: search items hard-coded wireless: `Wireshark Filters, WPA2 Handshake Analysis, WPS Exploitation, WPA3 SAE & Transition, Deauth & PMF, Rogue AP & Evil Twin, Enterprise & EAP`, commands `airodump-ng, aireplay-ng --deauth, hashcat -m 22000, tshark, iw dev wlan0 scan, hostapd — Rogue AP, wash`, filters `wlan.fc.type_subtype==8, eapol, wlan.fc.type_subtype==12`.
- LocalProfile.tsx: key `wififorge-profile`, LocalDataPanel: keys `wififorge-progress, wififorge-evidence-vault, wififorge-checklist-*, wififorge-report-draft, wififorge-profile, wififorge-notes, theme`.
- AnalyticsDashboard.tsx, BadgesShowcase.tsx, DailyChallenges.tsx: achievements defs wireless-specific.
- Security: CvssCalculator guidance `AV: Attack vector. A = adjacent network (RF proximity) — this is the normal wireless answer`.

**Content:**
- frontend/src/content/modules.json: 20 modules, all wireless, ids `01-intro-wireless` to `20-final-assessment`, phases 1-6, skills `wireless-basics, attack-surface, methodology, ethics, ssid, bssid, ap, client, channels, bands, frames, information-elements, association, interface-modes, monitor-mode, toolchain, regulatory, recon, ess-mapping, hidden-ssid, pnl, wireshark, tshark, evidence, eapol, wep, rc4, iv-reuse, legacy, wpa2, ccmp, 4-way-handshake, pmf, offline-audit, pmkid, hashcat, wordlist, wps, pin, lockout, pixie-dust, wpa3, sae, dragonfly, owe, transition, deauth, disassoc, availability, sa-query, rogue-ap, evil-twin, wids, client-behaviour, captive-portal, guest, client-isolation, segmentation, 802.1x, radius, supplicant, authenticator, eap, peap, eap-tls, eap-ttls, mschapv2, shared-secret, message-authenticator, dynamic-vlan, kill-chain, segmentation, isolation, detection, methodology, roe, evidence, reporting, retest, assessment, professional`.
- lessons: `frontend/src/content/lessons/01-intro-wireless/01-why-wireless-is-different.md` etc 27 lessons, all wireless.
- labs.ts: LabEntry `id, module, title, type, status, difficulty, pcap, color, description` — 16 labs, all wireless.
- lab-artifacts.json: `lab_psk, lab_psk_weak, eap_user, eap_password, radius_weak_secret` — wireless enterprise creds.
- challenges.json: 15 wireless challenges, flags `WIFIFORGE{...}`.
- engagements.json: ENG-01 Northwind Retail, 4 SSIDs, RADIUS.
- scenarios.json: 35 decision scenarios, all wireless: scope-gap, ess-or-rogue, randomised-client, rsn-decode, pmf-bits, tool-choice, hidden-ssid, clone-or-ess, which-frames, encrypted-or-not, wep-report, handshake-completeness, psk-compromise, pmkid-vs-handshake, cracked-not-owned, wps-locked, transition-downgrade, owe, pmf-value, evidence-for-dos, twin-detection, enterprise-rogue, isolation-vs-segmentation, which-component, msk-to-pmk, method-identification, cert-validation, secret-rotation, radius-log-reading, chain-order, segmentation-evidence, severity-context, retest-fail, triage, no-finding.
- reference: checklist.json 42 items wireless PT master checklist, commands.json, filters.json.
- stats.ts: totals derived from wireless content — `TOTAL_MODULES = modules.length`, `TOTAL_LESSONS = sum lessons`, `TOTAL_CHALLENGES = challenges.length`, `TOTAL_SCENARIOS = scenarios.length`, `TOTAL_PCAPS = artifacts count`, `TOTAL_LABS = LABS.length`, etc.
- achievements.ts: wireless-themed badges.

**Backend:**
- app/main.py: `title="WiFiForge API (optional local parser)"`, health `service="WiFiForge API"`, `message="Forge. Break. Fix. Retest."`.
- core/config.py: `WIFIFORGE_ALLOWED_ORIGINS`, `WIFIFORGE_JWT_SECRET`, `WIFIFORGE_JWT_TTL_SECONDS`, `WIFIFORGE_DEMO_USERS`, `WIFIFORGE_MAX_UPLOAD_BYTES`, `CONTENT_DIR = REPO_ROOT / frontend/src/content`, `OFFLINE_DATA_DIR = frontend/public/lab-data`, `PCAP_DIR = frontend/public/pcaps`, `DATABASE_URL = .../wififorge.db`.
- models/progress.py: LessonProgress, LabProgress, QuizProgress with `user_id default local`, `module_id`, `lesson_id`, etc — generic but table names generic.
- schemas/module.py: Module `id, title, phase, difficulty, estimated_hours, prerequisites, status, skills, description`.
- routers/content.py: serves modules.json, lesson md — expects `frontend/src/content/modules.json`.
- routers/labs.py: catalogue from `OFFLINE_DATA_DIR/*.json`, method `wififorge-labkit`, config_available check for hostapd configs.
- routers/pcaps.py: lists pcaps, maps module from path substring `wifi-fundamentals, beacon, recon, traffic, wpa2, handshake, pmkid, wps, wpa3, deauth, rogue, captive, enterprise, eap, radius, corporate, methodology, final, wep` — wireless-specific mapping. Falls back to offline dataset.
- routers/enterprise.py: cert verify, reports pdf, pcaps upload — generic but messages reference academy.
- routers/auth.py, progress.py: generic.
- services/pcap_parser.py: parses 802.11 frames, offline_frames fallback.

**What is already reusable (platform-level)?**

- **Frontend stack:** Vite + React + TS + Tailwind + Zustand + React Router — domain-agnostic.
- **Content engine:** JSON + Markdown, `lib/api.ts` with fallback to local content, dynamic `import(.../lessons/${moduleId}/${lessonId}.md?raw)` — generic, can support any path if path-aware.
- **Lab engine:** EvidenceVault (SHA-256, claim, filter, frames), ReportEditor, ReportTemplates, TimelineViz, ConfigViewer (could be generic Config Audit), TerminalEmulator (simulated shell, commandCount), PcapInspector (currently 802.11 but pattern is generic Artifact Inspector), ReconMap (Asset Map), HandshakeDiagram (Protocol Flow Diagram), LabScoring, AttackDefenseRetest — all reusable with abstraction: Artifact Inspector, Config Auditor, Protocol Flow, Asset Map, Evidence Chain.
- **Challenge engine:** ChallengeCard, ChallengeDetail — generic.
- **Assessment engine:** Engagement mode, ChecklistPanel, DecisionPractice, Flashcards, NotesBookmarks, ReadingExperience, ReadingProgress, CvssCalculator, AnalyticsDashboard, Certificate, BadgesShowcase, DailyChallenges, PointsToast, LevelBadge — generic.
- **Progress:** useProgressStore, stats.ts — generic, but totals currently wireless-only. XP system `LESSON 10, LAB 25, QUIZ 20, MODULE_COMPLETE 50, PHASE_COMPLETE 100, CHALLENGE 50, FINAL_ASSESSMENT 200` — generic.
- **Search:** GlobalSearch — generic pattern, but keywords wireless.
- **Security:** CSP meta + dist/_headers + nginx.conf + sw.js offline-first, no third-party requests — generic and strong.
- **Backend:** FastAPI + SQLite, content, progress, labs validation, pcap parser, enterprise — generic, but lab/pcap mapping wireless-specific.
- **Deployment:** GitHub Pages SPA with 404.html fallback, .nojekyll, Docker multi-stage, nginx TLS, gzip, cache, rate limit — generic.
- **Methodology:** VAPT loop `Observe → Interpret → Hypothesise → Choose the test → Execute → Evidence → Conclude → Impact → Remediate → Retest → Report` — generic and is the differentiator. Evidence standard (hash, frame numbers, filter, reproducible), severity from impact, reporting, retest — generic.
- **Theming:** palette slate-950 #020617 bg, cyan #22d3ee primary, violet #a78bfa secondary, Sora + Inter + JetBrains Mono — generic, technical professional, not wireless-specific. Logo Forge Mark (anvil + Wi-Fi arcs) — anvil part is generic, Wi-Fi arcs are wireless-specific and should move to wireless path.

---

## B. Product Architecture Recommendation

### Conceptual Hierarchy

```
Platform (domain-neutral)
│
├── Learning Paths (path-aware)
│   ├── wireless-pentesting (Path #1, mature, 20 modules, 27 lessons, 16 PCAPs, 15 challenges, ENG-01)
│   ├── web-application-security (planned)
│   ├── api-security (planned)
│   ├── android-pentesting (planned)
│   ├── network-pentesting (planned)
│   ├── active-directory (planned)
│   ├── cloud-security (planned)
│   └── ai-llm-security (planned)
│
├── Labs (reusable lab engine)
│   ├── Artifact Analysis (PCAP, HTTP, APK, logs, configs)
│   ├── Config Audit (hostapd, nginx, AndroidManifest, IAM)
│   └── Scenario Simulation
│
├── Challenges (reusable)
├── Assessments / Engagements
├── Skills (generic + domain-specific)
├── Evidence / Reporting (generic)
├── Progress / Analytics (path-aware)
└── Certificates (path-aware, local-first)
```

**Do NOT build future paths now.** Keep them as planned expansion with empty content, not placeholder lessons.

### Content Model (Generic)

```typescript
// platform.ts
interface LearningPath {
  id: string // e.g., wireless-pentesting, web-application-security
  title: string
  shortTitle: string
  description: string
  longDescription: string
  category: 'network-security' | 'web-security' | 'api-security' | 'mobile-security' | 'cloud-security' | 'ad-security' | 'ai-security'
  icon: string // emoji or lucide name, domain-specific allowed here
  color: string // cyan, violet, amber, emerald, pink, etc.
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Professional'
  estimatedHours: number
  prerequisites: string[] // path ids
  status: 'available' | 'coming-soon' | 'planned'
  featured: boolean
  modules: string[] // module ids in order
  skills: string[] // generic + domain-specific
  labs: number
  challenges: number
  certificate: boolean
  tagline?: string // path-specific, e.g., "Understand the Protocol. Test the Implementation." for wireless
}

interface Module {
  id: string
  learningPathId: string // NEW: path-aware
  title: string
  phase: number // phase within path
  phaseName: string // e.g., Foundations, Reconnaissance
  difficulty: string
  estimatedHours: number
  prerequisites: string[]
  labRequirement: 'SIMULATION' | 'HYBRID' | 'REAL' // RF_REQUIRED -> REAL for generic
  contentStatus: 'authored' | 'brief' | 'planned'
  skills: string[] // generic: reconnaissance, traffic-analysis, evidence-collection, etc. + domain-specific
  description: string
  objectives: string[]
  artifacts: string[]
  lessons: { id: string; title: string; kind: 'concept' | 'lab' | 'professional' }[]
  status: 'simulated' | 'hardware' | 'locked' // legacy, map to labRequirement
}

interface Lesson {
  id: string
  moduleId: string
  learningPathId: string
  title: string
  kind: string
  contentPath: string // e.g., lessons/02-wifi-fundamentals/01-identity-topology-and-beacons.md
  objectives: string[]
  evidenceFocus: string
  retestFocus: string
}

interface Lab {
  id: string
  learningPathId: string
  moduleId: string
  title: string
  type: 'Artifact Analysis' | 'Config Audit' | 'Scenario' | 'PCAP Analysis' | 'Recon Analysis'
  status: 'SIMULATION' | 'HYBRID' | 'REAL'
  difficulty: string
  artifact: string | null // pcap id, config id, apk id, etc.
  color: string
  description: string
  objectives: string[]
  tasks: { id: string; question: string; answer: string; hint: string }[]
}

interface Challenge {
  id: string
  learningPathId: string
  moduleId: string
  title: string
  difficulty: string
  type: 'artifact_analysis' | 'config_audit' | 'scenario'
  level: 'guided' | 'semi-guided' | 'assessment'
  estimatedTime: string
  points: number
  status: string
  description: string
  objectives: string[]
  artifacts: string[]
  tasks: { id: string; question: string; answer: string; hint: string }[]
  flag: string // path-specific prefix, e.g., WIFIFORGE{} for wireless, WEBFORGE{} for web, etc. or generic PLATFORM{}
  skills: string[]
}

interface Skill {
  id: string
  name: string
  category: 'generic' | 'wireless' | 'web' | 'api' | 'android' | 'network' | 'ad' | 'cloud' | 'ai'
  description: string
  icon?: string
}

interface Evidence {
  id: string
  label: string
  kind: 'capture' | 'config' | 'screenshot' | 'http' | 'log' | 'terminal' | 'android-artifact'
  claim: string
  filter?: string
  frames?: string
  sha256: string
  bytes: number
  createdAt: string
  learningPathId?: string
  moduleId?: string
}
```

**Existing Wireless mapping:**

```yaml
learningPath:
  id: wireless-pentesting
  title: Wireless Pentesting
  shortTitle: Wireless
  description: Hands-on wireless security assessment — from 802.11 fundamentals to enterprise EAP/RADIUS and professional reporting.
  category: network-security
  icon: 📡
  color: cyan
  difficulty: Beginner → Professional
  estimatedHours: 52
  status: available
  featured: true
  modules: [01-intro-wireless, 02-wifi-fundamentals, 03-80211-architecture, ... 20-final-assessment]
  skills: [wireless-basics, reconnaissance, traffic-analysis, evidence-collection, ...]
  tagline: Understand the Protocol. Test the Implementation.

modules:
  - id: 01-intro-wireless
    learningPathId: wireless-pentesting
    phase: 1
    phaseName: Foundations
    ...
```

**Backend:**

- Add `learning-paths.json` alongside `modules.json`.
- `/api/learning-paths` serves learning-paths.json.
- `/api/modules?path=wireless-pentesting` filters by learningPathId.
- `/api/skills` serves generic + domain-specific skills.
- Keep existing `/api/modules` for backward compat, but add path filter.
- Lab catalogue becomes generic: artifact type field, not just pcap.

**Frontend:**

- New `platform.json`: platform name, tagline, description, links — domain-neutral.
- `learning-paths.json`: 1 available (wireless-pentesting), 7 planned (web, api, android, network, ad, cloud, ai) with status planned, no placeholder lessons.
- `skills.json`: generic skills (Reconnaissance, Traffic Analysis, Authentication Testing, Authorization Testing, Input Validation, Cryptography, Configuration Review, Exploitation, Evidence Collection, Risk Analysis, Remediation, Retesting, Reporting) + domain-specific (wireless: ssid, bssid, beacon, rsn, pmf, eap, etc.).
- Update `stats.ts` to be path-aware: `getStatsForPath(pathId)`.
- Update `useProgressStore` to store `currentLearningPathId`, path progress.
- Update routing: `/` Dashboard (platform), `/paths` list of learning paths, `/paths/:id` path detail (phases), `/paths/:id/modules/:moduleId` module detail, `/labs?path=...`, `/challenges?path=...`, etc. Keep legacy `/modules/:id` redirect to `/paths/wireless-pentesting/modules/:id` for backward compat.
- Update Sidebar: platform brand at top, sections Learn (Learning Paths, Modules, Skills), Practice (Labs, Challenges, Practice Scenarios), Assess (Assessments, Engagements), Track (Progress, Achievements, Certificates). Current path indicator.

---

## C. Branding Recommendation

**Should WiFiForge remain, become Wireless path name, or be replaced?**

**Replace platform brand, keep WiFiForge as Wireless path sub-brand.**

**Reasoning:**

1. **Name is domain-specific:** WiFiForge explicitly says Wi-Fi. Platform wants to say “Learn cybersecurity by doing” without explaining why a Wi-Fi brand contains Android or Web Security path. Creates incorrect expectation that entire application is Wi-Fi pentesting website (which current UI does).

2. **Scalability failure:** Does it scale to Web, API, Android, AD, Cloud, AI security? No. `WiFiForge — Web Application Security` is confusing. `WiFiForge — Android Pentesting` is contradictory.

3. **Architectural/product positioning problems:** Every file, localStorage key, env var, package name, base path, logo, manifest, OG image is `wififorge`. That couples platform-level to Wi-Fi. To add a second path, you’d need to either duplicate or rename.

4. **Naming conflicts — major:** 
   - **Black Hills InfoSec WifiForge** (github.com/blackhillsinfosec/WifiForge, 1.2k stars, 152 forks, Apache-2.0, 9 hands-on labs, mininet-wifi, Docker, zero hardware, safe learning, wififorge.github.io, blackhillsinfosec.com/wififorge) — directly same domain (Wi-Fi security training, hands-on labs, zero hardware). This is not a small repo; it’s a well-known tool from a respected security company, part of BHIS Forge line (SDRForge). Our current branding doc said “minor collision, none academy-style” — that assessment was wrong. BHIS WifiForge *is* academy-style and has 9 labs.
   - Minor collisions: many small WiFiForge repos, but BHIS is major.
   - If we keep WiFiForge as platform, we are in direct naming collision with an established security training tool in the exact same niche (wireless security training).

5. **Tagline is more valuable than name:** `Forge. Break. Fix. Retest.` is excellent, maps to VAPT loop, is domain-neutral, and should be retained as platform philosophy. The name WiFiForge is less valuable than the tagline and the Forge Mark anvil concept.

6. **Visual identity can be retained:** Palette slate-950 #020617, cyan #22d3ee, violet #a78bfa, Sora + Inter + JetBrains Mono, anvil silhouette — all generic, technical professional, not wireless-specific. Only Wi-Fi arcs above anvil are wireless-specific and should move to Wireless path branding. So visual identity can stay while name changes.

**Recommendation:**

- **Platform brand:** New domain-neutral name (see Section D).
- **Wireless path brand:** `Wireless Pentesting` as Learning Path #1, with sub-brand `WiFiForge` retained inside path for continuity: e.g., `Wireless Pentesting — WiFiForge Path` or `Wireless Pentesting (WiFiForge Methodology)` or simply keep flag prefix `WIFIFORGE{}` and lab artifact names for historical continuity.
- **Tagline:** Keep `Forge. Break. Fix. Retest.` as platform tagline, plus secondary `Understand the Protocol. Test the Implementation.` for wireless path, and generic secondary for platform: `Learn cybersecurity by doing. Investigate systems, collect evidence, understand impact, remediate, retest, report.`
- **Logo:** Keep Forge Mark anvil silhouette, remove or make optional Wi-Fi arcs for platform logo, keep arcs for wireless path logo.

---

## D. Naming Options

**Naming criteria (from prompt):**

- domain-neutral (no Wi-Fi, Wireless, Web, Android, API, tool name)
- memorable (2-3 syllables, easy to pronounce)
- technically credible (senior pentester mentor, not l33t, not corporate boring)
- usable as GitHub org/repo identity (lowercase, hyphenated, no spaces)
- suitable for future website ( .dev, .academy, .lab, .com)
- not confusingly similar to existing cybersecurity product/project
- not overly generic (not just “Security Lab”)
- not tied to single tool or attack technique

**Research method:** web_search for existing conflicts, plus reasoning about brand scalability.

**Conflict summary of obvious Forge names:**

- SecForge: secforge.de (German dev lab, former Rohde & Schwarz Cybersecurity), secforge.io (DevSecOps immersive platform with interactive challenges, hands-on labs, real-world scenarios) — strong conflict, direct competitor.
- CyberForge: cyberforge-academy.com (autonomous AI cybersecurity university, AI trainers), GW CyberForge (GWU College of Professional Studies), cyberforge.academy (hands-on workshops) — strong conflict, direct competitor.
- LabForge: anshu19981/Lab-forge (lightweight local dashboard to spin up 12+ vulnerable web & API security labs, Juice Shop, crAPI, DVWA, WebGoat), EPHAK/labforge (build and verify vulnerable-VM security training labs), GemForgeLabs (cybersecurity training platform, practical labs, gamified) — strong conflict.
- BreakForge: breakforge.io (accessible and affordable cyber security training, motto “Break to learn, Forge to grow” — very similar to our tagline) — strong conflict.
- BreachForge: breachforgelabs.com (hands-on cybersecurity training, “Forging Security Through Real-World Attacks”) — strong conflict, direct competitor.
- TraceForge: traceforge.com (session replay, heatmaps, funnels, error tracking, TraceForge AI), traceforce.ai (on-device AI security platform), Codewith-Rutuja/TRACEFORGE (SOC-style threat detection and incident investigation platform), mubashiroffical67/TRACEFORGE (AI-powered incident investigation and root cause analysis), khushalp2004/TraceForge (AI-assisted error monitoring) — crowded, strong conflict.
- ScopeForge: LeDoNguyenTu/ScopeForge (open-source application security that helps developers discover security problems, understand the evidence, and verify fixes — Discover -> Validate -> Explain -> Connect -> Prepare -> Fix -> Verify — very close to our methodology), VikashChoudhary-04/ScopeForgeX (cybersecurity assessment framework for authorized security testing, orchestrating reconnaissance, enumeration, vulnerability assessment, evidence collection, finding correlation, structured reporting) — strong conflict, almost identical methodology.
- Foundry / ForgePath: forgepath.com (tailored cybersecurity services, risk evaluations, compliance solutions, wireless security assessment, penetration testing, cloud security, DFIR), Cisco Foundry Security Spec (May 2026, open-source Foundry Security Spec to tackle AI-driven cyber threats, agentic AI cybersecurity evaluation framework) — strong conflict, major new spec.
- Crucible: CMU SEI Crucible Cyber Platform (open source learning and mission rehearsal platform, cyber-readiness ecosystem, open source learning platform) — strong conflict, major.
- EvidenceForge: Cisco Talos EvidenceForge (MIT, Python 3.12+, generate realistic synthetic security logs for cybersecurity threat hunting training and research, multi-format security log datasets, GROUND_TRUTH.md) — strong conflict, recent May 2026 announcement, direct training overlap.
- RedForge: pritpatel2412/RedForge (autonomous security orchestration platform that performs real HTTP probing, 11 parallel detection modules, correlates results into multi-stage attack chains), projectredforge.com (enterprise security engineering) — moderate-strong conflict.
- PurpleForge: purpleforge.net (comprehensive cybersecurity SaaS platform with integrated red team, blue team, purple team tools), purpleforge.pro (collaborative cybersecurity platform, unified simulation arena, MITRE ATT&CK), devpost PurpleForge (next-generation cybersecurity training platform, gamified PvP sparring simulator) — strong conflict, crowded.
- ForgeCore: boberthegr8/Forgecore (Forge construction/LBM software suite backend), Forgecore industrial workforce platform, forGecore.pro backend for live games — moderate conflict.
- SignalForge: r7bb/SignalForge (miniature SIEM/SOC platform that ingests security logs, normalizes, detects, correlates), codewithzhiva/signal-forge (real-time, explainable risk decision platform), souzacef/signalforge (event-driven incident automation) — strong conflict, crowded.
- VectorForge: vectorforge.ai (quantum-resistant AI decisioning platform, quantum-secure), Mehedi26696/VectorForge (educational, end-to-end semantic search system) — moderate conflict.
- VulnForge: apps.ninjatech.ai/solutions/vulnforge (full penetration testing and red team platform, 65,535-port scanning, OWASP Top 10, CVE detection, compliance mapping), yogeshe-lgtm/VulnForge (Web BugBounty Automation Tool, production-grade modular web app security assessment CLI), huzjie/vulnforge (AI-powered autonomous vulnerability research & security audit platform) — strong conflict, crowded.
- HexForge: hexforge.app (free browser-based hex editor & binary analysis tool, NuriLab cybersecurity research company specializing in malware analysis and binary forensics) — moderate conflict.
- ByteForge: ByteForge Labs LLC (California company), yashbhosale2403/lab-for-owasp-top-10-testing DjangoGoat ByteForge storefront edition (intentionally vulnerable Django application), byteforge0 GitHub user (cybersecurity labs using Kali) — moderate conflict.
- RootForge: rootforge.de (IT-Dienstleister seit 2005), akz142857/Rootforge (Find the root. Forge the fix. — open-source, unattended incident investigation and remediation system, early design), Victorious93/rootforge-os (hardened Debian-based distro for Android root module development) — moderate conflict, tagline very similar to ours.
- ForgeCraft: CloudSEK report ForgeCraft: Unmasking a China-Linked Operation Selling Counterfeit IDs Across North America — operation name, not platform, but security-related, moderate confusion.
- WiFiForge: blackhillsinfosec/WifiForge (1.2k stars, 9 labs, mininet-wifi, Docker, zero hardware, safe legal Wi-Fi security training, wififorge.github.io, blackhillsinfosec.com/wififorge, part of BHIS Forge line SDRForge) — strong conflict, direct collision in same niche.
- Exploit-Forge: exploit-forge.com (Offensive Security Services and AppSec Tooling, blends elite pentesting, red teaming, developer-centric AppSec tooling, Web App Testing, Mobile App Testing, API Security Assessment, AD & Internal Testing, Network & Cloud Infra Testing) — strong conflict, covers our future paths.
- Forge Institute: forge.institute (IT/Cyber Fundamentals Bootcamp, Cyber Bootcamp, Forge Academy, Forge Your Future: Cybersecurity Pathway for High School Students) — moderate conflict, education.

**Shortlist — 6 viable platform names after conflict check:**

### 1. Anvil

**Concept:** Anvil is where forging happens. The current logo is already Forge Mark: anvil silhouette + Wi-Fi arcs. Anvil preserves Forge philosophy without using Forge word (avoids BHIS Forge line confusion). Short, 2 syllables, strong visual (anvil + hammer + spark).

**Why it fits:** 
- Preserves Forge concept: you forge skills on anvil. Tagline Forge. Break. Fix. Retest. still works (you forge on anvil, break, fix, retest).
- Domain-neutral: anvil is not tied to Wi-Fi, Web, Android, API, tool.
- Memorable: Anvil is uncommon in cybersecurity training, but familiar (blacksmith).
- Technically credible: forging metaphor, senior pentester as mentor, professional.
- Visual identity retained: anvil silhouette already in logo, just remove Wi-Fi arcs for platform, keep arcs for wireless path.

**Potential conflicts:**
- Anvil Corp (anvilcorp.com) ICS Cybersecurity, Cyber Range Training and Simulation Center (Bellingham, Washington) — specialty services industrial controls systems cybersecurity, consequence-based risk management, cyber-HAZOPs, OT support. Not a hands-on learning platform for multiple domains, but ICS focus.
- Anvil Consulting (anvilteam.com) IT consulting, cybersecurity, IT training — general IT consulting.
- Anvil Ventures (anvilventures.dev) code auditing and penetration testing, SDLC and training services.
- Anvil Protection (anvilprotection.com) commercial and residential security services, armed security, bodyguards — physical security, not cybersecurity training.
- AnvilSec (anvil-sec.com) penetration testing & mobile security, internal/external infrastructure testing including vulnerability analysis, WiFi, VLAN, containment breakout, firewall/router reviews, code reviews, mobile devices. GitHub anvilsecure org (elite information security consulting services, pqcscan, garmin-ciq-app-research). Direct cybersecurity but services, not training platform. Moderate conflict.
- No major hands-on cybersecurity learning platform named Anvil Academy / Anvil Labs found.

**Brand scalability:**
- High: Anvil Academy, Anvil Labs, Anvil Method, Anvil Forge, Anvil Path. Works for any domain: Anvil: Wireless Pentesting, Anvil: Web Application Security, Anvil: API Security, Anvil: Android Pentesting, etc. Tagline “Forge. Break. Fix. Retest.” fits.
- GitHub: anvil, anvil-academy, anvil-labs — anvil org likely taken but anvil-academy, anvil-sec-academy available.
- Website: anvil.academy, anvil.dev, anvilsec.academy, anvil-labs.dev.

**Technical credibility:** High — anvil is forging, hardening, professional, not l33t.

### 2. TemperForge

**Concept:** Tempering is heat treatment that hardens metal after forging — metaphor for hardening systems after breaking them. Directly reflects Break → Fix → Retest loop: break, then temper (harden), then retest.

**Why it fits:**
- Preserves Forge, adds hardening/defense concept (Fix, Remediate).
- Domain-neutral: tempering applies to any system (web, api, android, cloud).
- Memorable: TemperForge is 3 syllables, distinctive, not generic.
- Technically credible: tempering is metallurgy term, implies defense hardening, not just offense, senior pentester mindset (break then harden).

**Potential conflicts:**
- Temper And Forge (temperforge) digital agency (Clutch.co profile, 52 reviews, website revamp & SEO services for biotech research nonprofit, design, build, grow high-performing digital platforms) — not cybersecurity, but similar name, moderate confusion.
- TTPForge (facebookincubator/TTPForge) cybersecurity framework for developing, automating, and executing attacker Tactics, Techniques, and Procedures (TTPs) — Facebook incubator, installation via ttpforge, config.yaml, ForgeArmory. Different spelling (TTP vs Temper) but phonetically similar, moderate.
- No direct training platform named TemperForge found.

**Brand scalability:**
- High: TemperForge Academy, TemperForge Labs, TemperForge Method. Works for any domain: you temper (harden) web apps, APIs, Android, cloud, AI.
- GitHub: temperforge, temperforge-academy.
- Website: temperforge.dev, temperforge.academy, temperforge.lab.

**Technical credibility:** High — tempering is hardening, defense, professional.

### 3. MasonForge / ForgeMason

**Concept:** Mason builds, crafts — builder, craftsman, constructing secure systems. Mason + Forge = building and forging.

**Why it fits:**
- Mason builds, forge crafts — implies building skills, constructing secure systems, methodology.
- Domain-neutral: mason builds any system.
- Memorable: MasonForge is 3 syllables, distinctive, not generic.
- Technically credible: mason is builder, craftsman, professional.

**Potential conflicts:**
- George Mason University cybersecurity programs (Mason) — academic, not direct.
- Mason RIA firms cybersecurity deadlines (Titan Tech) — not direct.
- MasonSec not found as training platform. Low conflict.
- No direct training platform named MasonForge found.

**Brand scalability:**
- High: MasonForge Academy, MasonForge Labs. Works for any domain: you mason (build) secure web apps, APIs, Android, etc.
- GitHub: masonforge, masonforge-academy.
- Website: masonforge.dev, masonforge.academy.

**Technical credibility:** Moderate-High — mason is builder, but less directly security-related than anvil/temper. Could be seen as construction, not security, but still credible as crafting secure systems.

### 4. Verifex

**Concept:** Verify + ex, evidence-driven verification. Platform differentiator is evidence collection, verification, retest — Verifex implies verification, evidence, proof.

**Why it fits:**
- Directly reflects platform differentiator: learning through practical security assessment methodology, evidence, impact, remediation, retest, report.
- Domain-neutral: verification applies to any domain.
- Memorable: Verifex is 3 syllables, short, brandable, invented but with meaning.
- Technically credible: verification is core to VAPT methodology, senior pentester mindset.

**Potential conflicts:**
- Verifex Global (verifexglobal.com) anti-counterfeit & product verification company, cloud platform that links each protected product unit to unique serialized code embedded in QR label — not cybersecurity training, but verification.
- Verifex email verification software (Capterra) — email verification.
- GitHub AhmedBenRahma/Verifex (smart-security-testing-module for vulns triage, AI-assisted triage for web-application scan results, OWASP ZAP, OWASP Benchmark, 2,740 ground-truth-labelled test cases) — moderate conflict, but not training platform, single tool.
- Veriforce (veriforce.com) supply chain risk management, safety and compliance platform, LMS, 400+ training courses, 7,000 instructors — similar sounding (Verifex vs Veriforce), moderate confusion, but different domain (safety/compliance, not cybersecurity hands-on).
- No major hands-on cybersecurity learning platform named Verifex Academy.

**Brand scalability:**
- High: Verifex Academy, Verifex Labs, Verifex Method. Works for any domain: you verify findings with evidence.
- GitHub: verifex, verifex-academy, verifex-labs.
- Website: verifex.dev, verifex.academy, verifex.lab.

**Technical credibility:** High — verification is core to VAPT, evidence standard, professional.

### 5. AttestForge

**Concept:** Attest = provide evidence, proof, certify — core to evidence standard, chain of custody, reporting. Attest + Forge = forging attested evidence.

**Why it fits:**
- Evidence vault, chain of custody, reporting — attest is about providing evidence, certifying findings.
- Preserves Forge.
- Domain-neutral: attestation applies to any domain (web, api, android, cloud, ai).
- Memorable: AttestForge is 3 syllables, distinctive.
- Technically credible: attestation is security term (artifact attestation, certificate attestation, OpenSSF Artifact Attestations).

**Potential conflicts:**
- atsec (atsec.com) Common Criteria, FIPS 140-3, EUCC, NESAS, PCI lab, IT product evaluation & assessment — similar prefix (atsec vs attest), moderate.
- OffSec SEC-100 (offsec.com/courses/sec-100) cybersecurity essentials, OSCC-SEC certification — SEC prefix, moderate.
- OpenSSF Artifact Attestations (public beta, May 2024) — artifact attestations help reduce complexity of deploying PKI, signing document with temporary key pair, tamper-proof guarantee — not a training platform, but attestation concept.
- bpmforge/attest (GitHub) mechanical verification for AI-delegated software development, security find-and-fix, 9-dimension code health — moderate.
- AttestForge itself not found as training platform — low-moderate conflict.

**Brand scalability:**
- High: AttestForge Academy, AttestForge Labs, AttestForge Method. Works for any domain: you attest findings with evidence.
- GitHub: attestforge, attestforge-academy.
- Website: attestforge.dev, attestforge.academy.

**Technical credibility:** High — attestation is security term, evidence standard, professional.

### 6. ChainForge

**Concept:** Chain of custody + forge, chain of attack, kill chain, evidence chain. Chain is central to methodology.

**Why it fits:**
- Evidence chain, attack chain, kill chain — chain is central to VAPT methodology (chain of custody, chain of evidence, kill chain, attack chain).
- Preserves Forge.
- Domain-neutral: chain applies to any domain.
- Memorable: ChainForge is 2 syllables, short, brandable.

**Potential conflicts:**
- Chainforge Technologies (chainforgetechnologies.com) global company, Web3 consulting agency, blockchain, DeFi, NFT, DAO, blockchain bridges, core infrastructure, web design, firewalls, SIEM solutions, cybersecurity — Web3 + cybersecurity, moderate conflict, but not training platform.
- Chain Forge (chainforge.vercel.app) blockchain SDK and API, gateway to decentralized application development, blockchain agnostic, security and reliability — blockchain, not cybersecurity training, moderate.
- No major hands-on cybersecurity learning platform named ChainForge Academy.

**Brand scalability:**
- Moderate-High: ChainForge Academy, ChainForge Labs. Works for any domain: you forge attack chains, evidence chains.
- GitHub: chainforge, chainforge-academy.
- Website: chainforge.dev, chainforge.academy — chainforge.dev likely taken by blockchain, but chainforge.academy maybe available.

**Technical credibility:** High — chain of custody, kill chain, attack chain are security terms.

**My ranked recommendation (not arbitrary scores, but reasoning):**

1. **Anvil** — Best balance: preserves Forge Mark visual (anvil silhouette), avoids BHIS Forge line confusion (WifiForge, SDRForge are Forge suffix; Anvil is distinct but related), short, memorable, domain-neutral, low-moderate conflict (AnvilSec exists but services, not training), high scalability, high technical credibility, strong visual identity. Can be `Anvil Academy` or `Anvil Labs` with tagline `Forge. Break. Fix. Retest.` and Wireless path as `Anvil: Wireless Pentesting — WiFiForge Path` for continuity.

2. **TemperForge** — Second: preserves Forge, adds hardening/defense concept that matches Break → Fix → Retest, domain-neutral, low-moderate conflict (Temper And Forge digital agency, TTPForge framework), high scalability, high technical credibility (tempering = hardening). Good if you want to keep Forge in name.

3. **Verifex** — Third: if you want to move away from Forge word but keep Forge philosophy as tagline. Directly reflects differentiator (evidence, verification, retest), domain-neutral, memorable, invented but with meaning, high technical credibility, low-moderate conflict (Verifex Global anti-counterfeit, Verifex vuln triage module, Veriforce safety LMS). Good for platform that says “Learn cybersecurity by doing — investigate, collect evidence, verify, retest, report.”

**What I would avoid:**

- Any name with SecForge, CyberForge, LabForge, BreakForge, BreachForge, TraceForge, ScopeForge, EvidenceForge, RedForge, PurpleForge, SignalForge, VectorForge, VulnForge, HexForge, ByteForge, RootForge, ForgePath, Foundry, Crucible — all have strong conflicts with existing cybersecurity training, labs, or major specs (Cisco Foundry Security Spec, CMU Crucible Cyber Platform, Cisco Talos EvidenceForge).

---

## E. UI/UX Changes — Platform-level vs Wireless-specific

**Goal:** User should feel they are entering a hands-on cybersecurity learning platform, not a Wi-Fi pentesting website. Wireless visual identity should remain inside Wireless path.

**Navbar / Topbar:**
- Platform-level: Platform logo (new brand, anvil silhouette without Wi-Fi arcs), platform name, search (Cmd+K), theme toggle, profile, offline indicator.
- Path-level: Current learning path indicator (e.g., `📡 Wireless Pentesting` chip), current module breadcrumb `Platform > Learning Paths > Wireless Pentesting > Wi-Fi Fundamentals`.
- Remove: `02-wifi-fundamentals` as default topbar module id — replace with path-aware breadcrumb.

**Sidebar:**
- Current: WiFiForge + Wireless PT Academy, Overall Progress, streak, PCAPs count, nav Dashboard, Learning Path, Modules, Engagement, Labs, Challenges, Reference, Reports, Settings, Methodology box, Lab Environment box, footer WiFiForge.
- Proposed: Platform brand + tagline `Forge. Break. Fix. Retest.` at top, sections:
  ```
  Dashboard
  Learn
    ├── Learning Paths
    ├── Modules
    └── Skills
  Practice
    ├── Labs
    ├── Challenges
    └── Practice Scenarios
  Assess
    ├── Assessments
    └── Engagements
  Track
    ├── Progress
    ├── Achievements
    └── Certificates
  Reference
  Settings
  ```
  - Overall Progress becomes platform progress + current path progress (two bars).
  - Lab Environment box becomes generic `Lab Environment: Zero-cost • Offline • Local-first` + `16 artifacts • verified` (not just PCAPs).
  - Methodology box `Learn → Observe → Test → Report` is generic, keep, but remove `Phase 4 • Attack Labs` wireless-specific.
  - Footer: Platform name + version, not WiFiForge.

**Hero / Dashboard:**
- Current: `Dashboard`, `Forge. Break. Fix. Retest.` + `Your wireless PT journey • 20 modules • zero-cost`, Overall Progress, LevelBadge, VAPT Loop, Skills chips `ssid, bssid, 802.11, wireshark, wpa2, eap`, Learning Path strip 10 wireless modules, Quick Actions Browse Modules, Hands-on Labs, Challenges, DailyChallenges, BadgesShowcase, AnalyticsDashboard.
- Proposed: Platform hero `Learn cybersecurity by doing.` + secondary `Investigate systems, perform security testing, collect evidence, understand impact, remediate, retest, report.` + tagline `Forge. Break. Fix. Retest.` as philosophy. Stats: platform XP, total paths, total modules, total labs, total challenges. Featured Learning Path: `📡 Wireless Pentesting` with 20 modules, 27 lessons, 16 artifacts, 15 challenges, ENG-01, status available, progress. Other paths: `🌐 Web Application Security (planned)`, `🔌 API Security (planned)`, etc. Skills: generic skills `Reconnaissance, Traffic Analysis, Authentication Testing, Authorization Testing, Input Validation, Cryptography, Configuration Review, Exploitation, Evidence Collection, Risk Analysis, Remediation, Retesting, Reporting` + domain-specific chips for current path. Learning Path strip becomes path selector + phase progression for current path.

**Learning Paths page (/paths):**
- Current: /path shows phases of wireless path.
- Proposed: /paths lists all learning paths (1 available, 7 planned). Each card: icon, title, description, category, difficulty, estimated hours, modules count, labs, challenges, status badge `Available / Coming Soon / Planned`, featured flag, progress. Click goes to /paths/:id.

**Path Detail page (/paths/:id):**
- New: Shows phases within path (for wireless: Foundations, Reconnaissance, Wi-Fi Security, Attack Techniques, Enterprise Wi-Fi, Professional), modules per phase, progress, skills, labs, challenges, certificate. For planned paths, shows roadmap, not empty lessons.

**Modules page (/modules):**
- Current: lists 20 wireless modules.
- Proposed: path-aware filter: `All Paths / Wireless Pentesting / Web App Security / ...`, search, difficulty filter, status filter. Module cards show `learningPathId`, phase, phaseName, labRequirement, skills.

**Module Detail (/modules/:id or /paths/:id/modules/:id):**
- Keep existing, but add path breadcrumb, path-specific tagline, generic labRequirement `SIMULATION / HYBRID / REAL` (RF_REQUIRED → REAL for generic, but keep RF_REQUIRED as alias for wireless for backward compat).
- Preserve Attack→Defense→Retest component.

**Labs page (/labs):**
- Current: Labs + PCAPs tabs, TierBadge SIMULATION/HYBRID/RF_REQUIRED, EvidenceVault.
- Proposed: Labs tab generic: Artifact Analysis, Config Audit, Scenario. Filter by path, type, status, difficulty. Artifact count `16 artifacts • verified` not just PCAPs. PCAPs tab becomes Artifacts tab: list artifacts with SHA-256, path, group, frames, bytes, real/synthetic note. TierBadge becomes `SIMULATION (bundled offline dataset) • HYBRID (config audit + offline) • REAL (requires authorized environment)` — generic, but keep RF_REQUIRED alias for wireless.
- EvidenceVault: generic, keep, but store key `platform-evidence-vault` (migrate from `wififorge-evidence-vault` with backward compat).

**Challenges page (/challenges):**
- Current: 15 wireless challenges.
- Proposed: path-aware filter, type filter, level filter. Challenge cards show path, module, skills.

**Engagement / Assessments (/engagement, /assessments):**
- Current: ENG-01 Northwind Retail wireless.
- Proposed: Assessments list: `ENG-01 Wireless (available)`, `ENG-02 Web (planned)`, etc. Each engagement shows scope, RoE, targets, artefacts, tasks, marking guide.

**Reference (/reference):**
- Current: ChecklistPanel `Wireless PT master checklist`, commands.json, filters.json wireless.
- Proposed: Generic checklist + path-specific checklists: `Master VAPT Checklist (generic, 42 items)` + `Wireless PT Checklist (path-specific)` + future `Web App Checklist`, `API Checklist`, etc. Commands and filters become path-specific: `Wireless: airodump-ng, aireplay-ng, wash, hostapd, tshark -Y wlan...` + `Web: curl, Burp, ffuf, sqlmap` (planned). Keep generic reference for evidence standard, CVSS, reporting.

**Reports / Evidence / Certificates:**
- Current: ReportEditor wireless finding template, EvidenceVault wififorge keys, Certificate WiFiForge Certified Wireless PT Academy.
- Proposed: ReportEditor generic finding structure + path-specific templates. EvidenceVault generic. Certificate path-aware: `Platform Certificate` + `Path Certificate: Wireless Pentesting` with skills list per path. Local record id `LOCAL-...` not accredited, keep.

**Search (GlobalSearch):**
- Current: hard-coded wireless items.
- Proposed: search index built from learning-paths.json, modules.json, labs, challenges, skills, commands, filters — generic, path-aware. Keywords include generic + path-specific.

**Page titles, favicon, SEO, OG:**
- Current: `WiFiForge — Dashboard`, favicon anvil + Wi-Fi arcs, OG image dark bg + logo + tagline.
- Proposed: Platform title `Anvil — Dashboard` or `[Platform] — Dashboard`, path-specific title `[Platform] — Wireless Pentesting: Wi-Fi Fundamentals`. Favicon platform anvil without Wi-Fi arcs, wireless path favicon anvil + Wi-Fi arcs. OG image platform dark bg + platform logo + tagline `Forge. Break. Fix. Retest.` + secondary `Learn cybersecurity by doing.`

**Empty states:**
- Current: empty states mention wireless, modules, labs, PCAPs.
- Proposed: empty states generic: `No activity recorded yet`, `No module progress yet`, `No labs completed yet` — already generic, good. For planned paths: `This learning path is planned — architecture ready, content coming soon. Wireless Pentesting is available now as first mature path.`

**Breadcrumbs:**
- Current: minimal.
- Proposed: `Platform > Learning Paths > Wireless Pentesting > Phase 3: Wi-Fi Security > WPA2/RSN: Key Hierarchy`

**Course cards, icons, metadata:**
- Move Wi-Fi-specific icons (📡, Wifi, Radio) into wireless path. Platform icons: generic Shield, Target, FlaskConical, Swords, BookOpen, Award, etc. — already generic, good.
- Metadata: browser title, favicon, SEO, OG, manifest, robots.txt — platform-level, not wireless.

---

## F. Data/Content Architecture — Generic Model + Wireless Mapping

### Current content model (wireless-only)

```json
modules.json: [
  {
    id: "01-intro-wireless",
    title: "Wireless Security Foundations",
    phase: 1,
    difficulty: "Beginner",
    estimated_hours: 2.0,
    prerequisites: [],
    lab_requirement: "SIMULATION",
    content_status: "brief",
    skills: ["wireless-basics", "attack-surface", "methodology", "ethics"],
    lessons: [{ id: "01-why-wireless-is-different", title: "...", kind: "concept" }],
    status: "simulated"
  },
  ...
]
```

No learning path concept. Phases are hard-coded in LearningPath.tsx. Skills are wireless-specific. Labs are wireless PCAPs. Challenges wireless. Engagements wireless.

### Proposed generic model

**File structure:**

```
frontend/src/content/
├── platform.json                # platform metadata (name, tagline, description, links) — domain-neutral
├── learning-paths.json          # list of learning paths (wireless available, 7 planned)
├── modules.json                 # now includes learningPathId, phaseName, generic labRequirement
├── lessons/                     # keep existing wireless lessons, add path subfolder later
│   ├── wireless-pentesting/
│   │   ├── 01-intro-wireless/
│   │   │   └── 01-why-wireless-is-different.md
│   │   └── ...
│   └── web-application-security/ (planned, empty)
├── labs.ts                      # now includes learningPathId, artifact, type, objectives, tasks
├── challenges.json              # now includes learningPathId
├── engagements.json             # now includes learningPathId
├── scenarios.json               # now includes learningPathId
├── skills.json                  # NEW: generic + domain-specific skills
├── reference/
│   ├── checklist.json           # generic VAPT checklist + path-specific checklists
│   ├── checklist-wireless.json  # wireless-specific 42 items (existing)
│   ├── commands.json            # now path-aware: { wireless: [...], web: [...], ... }
│   └── filters.json             # now path-aware
└── stats.ts                     # path-aware totals + platform totals
```

**platform.json:**

```json
{
  "name": "Anvil",
  "fullName": "Anvil — Hands-on Cybersecurity Learning Platform",
  "shortName": "anvil",
  "tagline": "Forge. Break. Fix. Retest.",
  "secondaryTagline": "Learn cybersecurity by doing.",
  "description": "A hands-on cybersecurity learning platform where learners don't just consume security content — they investigate systems, perform security testing, collect evidence, understand impact, remediate vulnerabilities, retest fixes, and complete realistic assessments.",
  "philosophy": "Learn → Understand → Observe → Enumerate → Test → Validate → Collect Evidence → Understand Impact → Remediate → Retest → Report",
  "palette": {
    "bg": { "950": "#020617", "900": "#0f172a", "800": "#1e293b", "700": "#334155" },
    "accent": { "cyan": "#22d3ee", "violet": "#a78bfa", "emerald": "#34d399", "amber": "#fbbf24", "red": "#f87171" }
  },
  "fonts": { "heading": "Sora", "body": "Inter", "mono": "JetBrains Mono" },
  "logo": { "icon": "anvil", "wordmark": "Anvil", "concept": "Forge Mark — anvil silhouette, hammer, spark" },
  "links": { "github": "https://github.com/AmitPal-CyberBuddy/WiFiForge", "docs": "/docs" }
}
```

**learning-paths.json:**

```json
[
  {
    "id": "wireless-pentesting",
    "title": "Wireless Pentesting",
    "shortTitle": "Wireless",
    "description": "Hands-on wireless security assessment — from 802.11 fundamentals to enterprise EAP/RADIUS and professional reporting.",
    "longDescription": "Master wireless VAPT: 802.11 architecture, recon, traffic analysis, WEP/WPA2/WPA3, WPS, deauth, rogue AP, captive portals, Enterprise 802.1X/EAP/RADIUS, corporate kill chains, methodology, evidence, reporting, retest. 20 modules, 27 lessons, 16 verified captures, 15 challenges, ENG-01.",
    "category": "network-security",
    "icon": "📡",
    "color": "cyan",
    "difficulty": "Beginner → Professional",
    "estimatedHours": 52,
    "prerequisites": [],
    "status": "available",
    "featured": true,
    "modules": ["01-intro-wireless", "02-wifi-fundamentals", "03-80211-architecture", "04-kali-wireless-setup", "05-wireless-recon", "06-traffic-analysis", "07-wep-legacy", "08-wpa-wpa2", "09-wpa2-practical", "10-wps", "11-wpa3", "12-deauth-disassoc", "13-rogue-ap", "14-captive-portals", "15-enterprise-fundamentals", "16-eap", "17-radius", "18-corporate-attacks", "19-methodology", "20-final-assessment"],
    "skills": ["wireless-basics", "reconnaissance", "traffic-analysis", "evidence-collection", "wpa2", "wpa3", "eap", "radius", "methodology", "reporting"],
    "labs": 16,
    "challenges": 15,
    "certificate": true,
    "tagline": "Understand the Protocol. Test the Implementation.",
    "legacyBrand": "WiFiForge"
  },
  {
    "id": "web-application-security",
    "title": "Web Application Security",
    "shortTitle": "Web",
    "description": "Hands-on web app pentesting — from recon to exploitation, evidence, and remediation.",
    "category": "web-security",
    "icon": "🌐",
    "color": "violet",
    "difficulty": "Beginner → Advanced",
    "estimatedHours": 40,
    "prerequisites": [],
    "status": "planned",
    "featured": false,
    "modules": [],
    "skills": ["reconnaissance", "input-validation", "authentication-testing", "authorization-testing"],
    "labs": 0,
    "challenges": 0,
    "certificate": false
  },
  {
    "id": "api-security",
    "title": "API Security",
    "shortTitle": "API",
    "description": "Hands-on API security testing — OWASP API Top 10, auth, rate limiting, evidence.",
    "category": "api-security",
    "icon": "🔌",
    "color": "amber",
    "status": "planned",
    "modules": []
  },
  {
    "id": "android-pentesting",
    "title": "Android Pentesting",
    "shortTitle": "Android",
    "description": "Hands-on Android security — static analysis, dynamic testing, evidence.",
    "category": "mobile-security",
    "icon": "📱",
    "color": "emerald",
    "status": "planned",
    "modules": []
  },
  {
    "id": "network-pentesting",
    "title": "Network Pentesting",
    "shortTitle": "Network",
    "description": "Hands-on network pentesting — recon, enumeration, exploitation, evidence.",
    "category": "network-security",
    "icon": "🖥️",
    "color": "cyan",
    "status": "planned",
    "modules": []
  },
  {
    "id": "active-directory",
    "title": "Active Directory",
    "shortTitle": "AD",
    "description": "Hands-on AD security — enumeration, privilege escalation, lateral movement, evidence.",
    "category": "ad-security",
    "icon": "🏢",
    "color": "violet",
    "status": "planned",
    "modules": []
  },
  {
    "id": "cloud-security",
    "title": "Cloud Security",
    "shortTitle": "Cloud",
    "description": "Hands-on cloud security — AWS, Azure, GCP misconfigurations, evidence.",
    "category": "cloud-security",
    "icon": "☁️",
    "color": "amber",
    "status": "planned",
    "modules": []
  },
  {
    "id": "ai-llm-security",
    "title": "AI / LLM Security",
    "shortTitle": "AI",
    "description": "Hands-on AI security — prompt injection, data leakage, model security, evidence.",
    "category": "ai-security",
    "icon": "🤖",
    "color": "pink",
    "status": "planned",
    "modules": []
  }
]
```

**modules.json — add learningPathId, phaseName, generic labRequirement:**

```json
{
  "id": "02-wifi-fundamentals",
  "learningPathId": "wireless-pentesting",
  "title": "Wi-Fi Fundamentals: Identity and Topology",
  "phase": 1,
  "phaseName": "Foundations",
  "difficulty": "Beginner",
  "estimated_hours": 2.0,
  "prerequisites": ["01-intro-wireless"],
  "lab_requirement": "SIMULATION",
  "content_status": "brief",
  "skills": ["ssid", "bssid", "reconnaissance", "evidence-collection"],
  "description": "...",
  "lessons": [...]
}
```

**skills.json — generic + domain-specific:**

```json
[
  { "id": "reconnaissance", "name": "Reconnaissance", "category": "generic", "description": "Enumerate targets, map attack surface, gather information without active exploitation." },
  { "id": "traffic-analysis", "name": "Traffic Analysis", "category": "generic", "description": "Filter, isolate, and extract evidence from captures (PCAP, HTTP, logs)." },
  { "id": "authentication-testing", "name": "Authentication Testing", "category": "generic", "description": "Test authentication mechanisms, credential handling, session management." },
  { "id": "authorization-testing", "name": "Authorization Testing", "category": "generic", "description": "Test access controls, IDOR, privilege escalation." },
  { "id": "input-validation", "name": "Input Validation", "category": "generic", "description": "Test injection, XSS, SSRF, deserialization." },
  { "id": "cryptography", "name": "Cryptography", "category": "generic", "description": "Review crypto usage, key management, TLS, hashing." },
  { "id": "configuration-review", "name": "Configuration Review", "category": "generic", "description": "Audit configs for misconfigurations, weak defaults, exposure." },
  { "id": "exploitation", "name": "Exploitation", "category": "generic", "description": "Validate vulnerabilities with authorized, evidence-driven testing." },
  { "id": "evidence-collection", "name": "Evidence Collection", "category": "generic", "description": "Collect reproducible evidence: artifact hash, filter, frame numbers, chain of custody." },
  { "id": "risk-analysis", "name": "Risk Analysis", "category": "generic", "description": "Derive severity from impact using CVSS as calculation, not label." },
  { "id": "remediation", "name": "Remediation", "category": "generic", "description": "Recommend fixes that break attack chain, not just patch symptoms." },
  { "id": "retesting", "name": "Retesting", "category": "generic", "description": "Verify fix with same test, capture delta as retest evidence." },
  { "id": "reporting", "name": "Reporting", "category": "generic", "description": "Write findings a client can act on: title, impact, evidence, remediation, retest." },
  { "id": "ssid", "name": "SSID/BSSID/ESS", "category": "wireless", "description": "Decode SSID, BSSID, ESS, BSS/DS topology from beacons." },
  { "id": "rsne", "name": "RSNE Decoding", "category": "wireless", "description": "Read RSNE fields: version, group cipher, pairwise, AKM, RSN capabilities." }
]
```

**labs.ts — add learningPathId:**

```typescript
export const LABS: LabEntry[] = [
  { id: 'lab-02-beacon', learningPathId: 'wireless-pentesting', module: '02-wifi-fundamentals', ... }
]
```

**stats.ts — path-aware:**

```typescript
export function getStatsForPath(pathId: string) {
  const pathModules = modules.filter(m => m.learningPathId === pathId)
  const pathLabs = LABS.filter(l => l.learningPathId === pathId)
  ...
}
```

**Progress store — path-aware:**

```typescript
currentLearningPathId: 'wireless-pentesting'
currentModule: '02-wifi-fundamentals'
getPathProgress: (pathId) => number // average of modules in path
getModuleProgress: (moduleId) => number // existing
```

**Backend:**

- New file `backend/app/routers/learning_paths.py` serves `learning-paths.json`.
- Update `content.py` to support `?path=wireless-pentesting` filter.
- Update `labs.py` to include `learningPathId` in catalogue.

---

## G. Migration Plan — Staged, Safe, No Broken Deployment

### Stage 0 — Assessment (Done, this doc)

- [x] Inspect architecture, routing, components, layouts, navigation, content, modules.json, lesson structure, lab structure, challenge structure, progress, certificates, backend APIs, database models, config, deployment, GitHub Pages, branding/assets, metadata.
- [x] Determine platform-level vs domain-specific coupling.
- [x] Branding assessment, naming research with conflict checks.
- [x] Write this doc `docs/PLATFORM_REPOSITIONING.md`.

### Stage 1 — Architecture and terminology become platform-neutral (no rename yet)

**Goal:** Make codebase path-aware without breaking existing deployment.

- [ ] Create `frontend/src/content/platform.json` (platform metadata, domain-neutral).
- [ ] Create `frontend/src/content/learning-paths.json` (wireless available, 7 planned).
- [ ] Create `frontend/src/content/skills.json` (generic + wireless domain-specific).
- [ ] Update `frontend/src/content/modules.json` to add `learningPathId: wireless-pentesting`, `phaseName`, map `RF_REQUIRED` → `REAL` with alias for backward compat.
- [ ] Update `frontend/src/content/labs.ts` to add `learningPathId`.
- [ ] Update `frontend/src/content/challenges.json`, `engagements.json`, `scenarios.json` to add `learningPathId`.
- [ ] Update `frontend/src/content/stats.ts` to add `getStatsForPath`, `getPlatformStats`, keep legacy totals for backward compat.
- [ ] Update `frontend/src/store/useProgressStore.ts` to add `currentLearningPathId`, `getPathProgress`, migrate localStorage keys with backward compat (read old `wififorge-*` keys, write new `platform-*` keys, keep old for fallback).
- [ ] Create `frontend/src/lib/platform.ts` types: LearningPath, Module (generic), Lesson, Lab, Challenge, Assessment, Skill, Evidence, etc.
- [ ] Backend: add `backend/app/routers/learning_paths.py`, include in main.py, add `/api/learning-paths`, update `/api/modules?path=...`.
- [ ] Update `scripts/verify-no-dummy-data.py` to allow `learning-paths.json` with planned paths (no placeholder lessons, just metadata).
- [ ] No UI rename yet — keep WiFiForge branding for now, but add platform abstraction.

**Verification:**
- `npm run build` passes, `verify-no-dummy-data.py` passes, `verify-lab-artifacts.py` passes.
- Existing routes `/`, `/path`, `/modules`, `/modules/:id`, `/labs`, `/challenges`, `/engagement` still work.
- New routes `/paths`, `/paths/:id` work.

### Stage 2 — Introduce new platform identity (dual branding)

**Goal:** Show platform brand + wireless path brand, without breaking existing.

- [ ] Choose final platform name from shortlist (recommend Anvil, TemperForge, or Verifex after stakeholder decision).
- [ ] Update `frontend/src/content/platform.json` with chosen name.
- [ ] Update `frontend/index.html` title to `Anvil — Hands-on Cybersecurity Learning Platform` (or chosen), but keep `WiFiForge` in wireless path.
- [ ] Update `frontend/public/manifest.json` name to platform name, short_name platform, description generic + wireless as first path.
- [ ] Update `frontend/src/components/layout/Sidebar.tsx`: top logo platform brand, subtitle `Hands-on Cybersecurity Learning Platform`, sections Learn/Practice/Assess/Track, current path indicator `📡 Wireless Pentesting`, keep WiFiForge inside wireless path card.
- [ ] Update `frontend/src/pages/Dashboard.tsx`: platform hero `Learn cybersecurity by doing.`, featured path Wireless Pentesting with WiFiForge legacy brand inside.
- [ ] Update `frontend/src/components/layout/Topbar.tsx`: breadcrumb platform > path > module.
- [ ] Update `assets/logo/*`: platform logo anvil without Wi-Fi arcs, wireless path logo anvil + Wi-Fi arcs.
- [ ] Keep old localStorage keys as fallback, add migration.

**Verification:**
- Build passes, no external requests, no dummy data.
- GitHub Pages still serves at `/WiFiForge/` (VITE_BASE unchanged for now).

### Stage 3 — Move Wireless into Learning Paths structure (UI)

**Goal:** Wireless becomes Path #1, not entire platform.

- [ ] Refactor `frontend/src/pages/LearningPath.tsx` into two: `LearningPaths.tsx` (list all paths) and `PathDetail.tsx` (phases within path, existing phase logic moves here).
- [ ] Update `App.tsx` routing:
  ```
  / -> Dashboard (platform)
  /paths -> LearningPaths (list)
  /paths/:pathId -> PathDetail (phases)
  /paths/:pathId/modules/:moduleId -> ModuleDetail
  /modules -> redirect to /paths/wireless-pentesting (or path-aware filter)
  /modules/:id -> redirect to /paths/wireless-pentesting/modules/:id for backward compat
  /labs?path=wireless-pentesting
  /challenges?path=wireless-pentesting
  /engagement -> /assessments/ENG-01 or /paths/wireless-pentesting/engagements/ENG-01
  ```
- [ ] Update `Modules.tsx` to be path-aware filter.
- [ ] Update `Labs.tsx`, `Challenges.tsx`, `Engagement.tsx` to be path-aware.
- [ ] Update `GlobalSearch.tsx` to index learning-paths, modules, labs, challenges, skills.
- [ ] Update `Certificate.tsx` to be path-aware: platform certificate + path certificate.

**Verification:**
- Existing deep links `/WiFiForge/modules/02-wifi-fundamentals` still work via redirect (SPA 404.html fallback).
- New links work.

### Stage 4 — Update documentation and repository metadata (no deployment break)

- [ ] Update `README.md`: title `[Platform] — Hands-on Cybersecurity Learning Platform`, subtitle `Forge. Break. Fix. Retest.`, section `Learning Paths: 📡 Wireless Pentesting (first mature path)`, keep wireless content details.
- [ ] Update `docs/BRANDING.md`, `docs/BRANDING_DECISION.md`: document platform brand, wireless path sub-brand, tagline retention, palette, logo, typography.
- [ ] Update `docs/ARCHITECTURE_AND_ROADMAP.md`: new hierarchy Platform → Learning Paths → Modules → Lessons → Labs → Challenges → Assessments.
- [ ] Update `SECURITY.md`, `AUDIT_AND_ROADMAP.md`, `docs/GITHUB_PAGES.md`: platform-level, not wireless-only.
- [ ] Update `frontend/package.json` name, description, but keep `wififorge` as alias for backward compat.
- [ ] Update `backend/app/main.py` title, description, health message.

### Stage 5 — Update deployment/domain references (staged, with redirects)

**Do NOT break existing deployment.**

- [ ] Keep `VITE_BASE=/WiFiForge/` for GitHub Pages until final rename decision. GitHub Pages URL `https://amitpal-cyberbuddy.github.io/WiFiForge/` remains valid.
- [ ] If repository rename decided (e.g., `WiFiForge` → `Anvil` or `TemperForge`), do:
  1. Create new repo with new name, keep old repo with redirect (GitHub automatically redirects repo renames).
  2. Update `VITE_BASE` to `/<new-repo>/` in new repo, keep old repo's `VITE_BASE` as `/WiFiForge/` with a redirect page to new URL.
  3. Update badges, README links, docs, package metadata, canonical URLs, social previews, favicon, SEO metadata.
  4. Update `nginx.conf`, `Dockerfile`, `docker-compose.yml` env vars: `WIFIFORGE_*` → `PLATFORM_*` with backward compat (read both).
  5. Update localStorage keys: migrate `wififorge-*` → `platform-*` with fallback.
- [ ] If custom domain planned (e.g., anvil.academy), add CNAME, keep GitHub Pages project site.

### Stage 6 — Retain redirects/compatibility where necessary

- [ ] SPA 404.html fallback already handles deep links.
- [ ] Add explicit redirects in `App.tsx`: `/path` → `/paths/wireless-pentesting`, `/modules/:id` → `/paths/wireless-pentesting/modules/:id`, `/engagement` → `/paths/wireless-pentesting/engagements/ENG-01`.
- [ ] Backend: keep `/api/modules` returning all modules (backward compat), add `/api/modules?path=...` filter.
- [ ] Keep flag prefix `WIFIFORGE{}` for wireless challenges for historical continuity, but new challenges use path-specific prefix or generic `PLATFORM{}`.
- [ ] Keep lab artifact names `beacon-only.pcapng`, etc., for wireless path.
- [ ] Keep `wififorge-labkit` method name for offline datasets (historical), but add generic `platform-labkit` alias.

---

## H. Anything Missed — Additional Changes Required for Scalable Platform

1. **Content versioning:** Need content version in `platform.json` + `learning-paths.json` to handle breaking changes in module ids. Add `contentVersion: 2.1`.

2. **Skill taxonomy:** Generic skills should be first-class, with levels (Beginner, Intermediate, Advanced). Current skills are flat strings. Need `skills.json` with `level, category, prerequisites`.

3. **Lab engine generalization:** 
   - Current tiers `SIMULATION • HYBRID • RF_REQUIRED` are wireless-specific. Generic tiers: `SIMULATION (bundled offline dataset) • HYBRID (config audit + offline) • REAL (requires authorized environment)`. Keep `RF_REQUIRED` as alias for wireless for backward compat, but document as `REAL (RF_REQUIRED for wireless)`.
   - Artifact types: currently PCAPNG + configs. Future: HTTP requests/responses, APK, IPA, Docker images, logs, IAM policies, Terraform, CloudFormation, LLM prompts. Need `artifactType` field.
   - Evidence model: currently capture, config, screenshot, http, log, terminal, android-artifact — good, already generic, keep.

4. **Assessment engine:**
   - Current engagement is wireless-only. Need generic assessment model: `Assessment { id, learningPathId, title, type: engagement | ctf | scenario, scope, roe, targets, artefacts, tasks, markingGuide }`.
   - Marking guide currently wireless-specific. Make generic.

5. **Progress model:**
   - Current `useProgressStore` stores `completedLessons, completedLabs, quizScores, currentModule, streak, totalXp, achievements` with `wififorge-progress` key. Need `currentLearningPathId`, `pathProgress`, `skillProgress`.
   - XP ceiling `MAX_XP` derived from shipped content — good, but now per-path + platform. Need `MAX_XP_PER_PATH`.
   - Certificate threshold 60% XP + 60% overall — should be per-path.

6. **Search:**
   - GlobalSearch currently hard-coded wireless items. Should be built from content files: learning-paths, modules, labs, challenges, skills, commands, filters — generic.

7. **Terminal:**
   - TerminalEmulator currently `kali@wififorge` — should be `kali@platform` or `operator@platform` with path-aware prompt `operator@anvil:~/wireless` etc.

8. **Analytics:**
   - AnalyticsDashboard currently module progress only. Should be path-aware: platform progress + path progress + skill progress.

9. **Certificate:**
   - Currently `WiFiForge Certified — Wireless PT Academy`. Should be `Platform Certified — Wireless Pentesting Path` + generic platform certificate. Keep local-first, not accredited, no registry.

10. **Backend database:**
    - Currently SQLite with `lesson_progress, lab_progress, quiz_progress` tables, `user_id default local`. Need `learning_path_id` column for path-aware progress, plus `skill_progress` table.

11. **Configuration:**
    - Env vars `WIFIFORGE_*` should become `PLATFORM_*` or `ANVIL_*` with backward compat. Document migration.

12. **Documentation:**
    - Need `docs/LEARNING_PATHS.md` explaining how to add new path without rewrite.
    - Need `docs/CONTENT_MODEL.md` explaining generic model.
    - Need `docs/BRANDING_MIGRATION.md` explaining staged migration.

13. **Mobile:**
    - mobile/README.md currently claims `20 modules × 80 lessons — 49572 lines offline cached, 16 PCAPs Scapy real, 50+ commands terminal, Evidence vault SHA256, Certificate QR verified, Daily challenges streak, Realtime leaderboard WebSocket, Biometric auth, Offline sync CRDT, Push notifications, PWA offline-first, Workbox cache, Enterprise JWT auth + OAuth, Teams classrooms, Rate limit, Audit logs, Docker production, CI/CD Trivy SARIF, Sentry error tracking PostHog analytics, Tauri desktop Rust system tray global shortcuts auto-update` — many claims are fabricated (previously flagged). Should be cleaned to match actual implementation, not invented.

14. **CI/CD:**
    - ci.yml, pages.yml currently verify lab artifacts and no dummy data — good. Need to update to verify learning-paths.json (planned paths have no placeholder lessons, just metadata) and platform.json.

15. **Security headers:**
    - Already good: CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy no-referrer, Permissions-Policy, Cross-Origin-Opener-Policy same-origin, Cross-Origin-Resource-Policy same-origin, Cache-Control no-store for API, no third-party requests. Keep.

16. **Accessibility:**
    - AccessibilityPanel currently uses `wififorge-a11y-*` keys — migrate to `platform-a11y-*` with fallback.

17. **Theming:**
    - theme.ts already generic, good. Keep.

18. **Future-proofing:**
    - Lab engine should eventually support containerized targets (Docker, KVM) for Web, API, Android, Network, AD, Cloud, AI. Current Docker labs are simulated (hostapd, freeradius, portal) — good pattern, reusable.
    - Assessment engine should support different security domains with same workflow: Recon → Enum → Test → Evidence → Impact → Remediation → Retest → Report.

---

## Tagline Review

**Current:** `Forge. Break. Fix. Retest.`

**Evaluation:**
- Domain-neutral? Yes — forging, breaking, fixing, retesting applies to any security domain (web, api, android, network, ad, cloud, ai).
- Memorable? Yes — 4 verbs, loop, VAPT mindset.
- Technically credible? Yes — senior pentester as mentor, professional, not l33t.
- Suitable for broader platform? Yes — directly maps to generic VAPT loop `Learn → Understand → Observe → Enumerate → Test → Validate → Collect Evidence → Understand Impact → Remediate → Retest → Report` and to `Observe → Interpret → Hypothesise → Choose the test → Execute → Evidence → Conclude → Impact → Remediate → Retest → Report`.

**Recommendation:** Retain as primary platform tagline / philosophy.

**Supporting taglines (proposed, not replacement):**

- Platform secondary: `Learn cybersecurity by doing.` — domain-neutral, hands-on, differentiator vs course platforms.
- Platform tertiary: `Investigate systems, perform security testing, collect evidence, understand impact, remediate, retest, report.` — methodology, professional.
- Wireless path tagline: `Understand the Protocol. Test the Implementation.` — existing secondary, keep for wireless path.
- Alternative: `From Evidence to Impact.` — evidence-driven.
- Alternative: `Test. Evidence. Impact. Remediation. Retest.` — methodology.

**Do NOT replace tagline automatically.** Keep `Forge. Break. Fix. Retest.` as primary.

---

## Product Positioning (Eventual)

> A hands-on cybersecurity learning platform where learners don't just consume security content — they investigate systems, perform security testing, collect evidence, understand impact, remediate vulnerabilities, retest fixes, and complete realistic assessments.

Differentiator: **learning through practical security assessment methodology**, not just courses.

- Not another course/content platform.
- Not just CTF flags — flags are evidence of reproducible extraction (frame numbers, filters, hashes).
- Evidence standard: capture hash, filter, frame numbers, config line, log entry, chain of custody.
- Severity from impact using CVSS as calculation, not label.
- Remediation that breaks attack chain, not just patch symptoms.
- Retest with same test, delta as retest evidence.
- Reporting a client can act on.

---

## Avoid Copying TryHackMe / Hack The Box

Use as conceptual references for learning paths, labs, challenges, progression, assessments, hands-on learning.

Do NOT copy:
- branding, visual identity, terminology unnecessarily, information architecture unnecessarily, gamification patterns without reason, feature sets simply because they exist elsewhere.

Our identity: Technical Professional — Dark slate + cyan + violet, Sora + Inter + JetBrains Mono, Forge Mark anvil, senior pentester as mentor, professional, technical, no l33t, no corporate fluff, evidence-driven, local-first, zero-cost, offline-capable.

---

## Future-Proof Information Architecture (Conceptual, not strict)

```
Dashboard (platform overview, featured path Wireless, other paths planned)

Learn
  ├── Learning Paths (list all paths, 1 available, 7 planned)
  ├── Modules (path-aware filter, search, difficulty)
  └── Skills (generic + domain-specific, progress)

Practice
  ├── Labs (artifact analysis, config audit, scenario, path-aware)
  ├── Challenges (guided → semi-guided → assessment, path-aware)
  └── Practice Scenarios (decision practice, 35 scenarios)

Assess
  ├── Assessments (ENG-01 Wireless available, ENG-02 Web planned, etc.)
  └── Engagements (scope, RoE, targets, artefacts, tasks, marking guide)

Track
  ├── Progress (platform + per-path + per-skill)
  ├── Achievements (badges, streak, XP)
  └── Certificates (platform + per-path, local-first, not accredited)

Reference
  ├── Master VAPT Checklist (generic 42 items)
  ├── Path Checklists (Wireless 42 items, Web planned, etc.)
  ├── Commands (path-aware)
  ├── Filters (path-aware)
  └── Methodology (VAPT loop, evidence standard, severity, reporting)

Settings
  ├── Profile (local, no credentials)
  ├── Theme (dark/light/system)
  ├── Accessibility
  ├── Lab Environment (zero-cost, offline, local-first)
  └── Local Data & Privacy (storage keys, sizes, offline, API reachable)
```

Use existing strengths: Dashboard, Learning Path visual progression, Modules, Labs with PcapInspector + ConfigViewer + ReconMap + HandshakeDiagram + LabScoring + AttackDefenseRetest, Challenges, Engagement, Reference ChecklistPanel + DecisionPractice + Flashcards + NotesBookmarks + ReadingExperience, Reports ReportEditor + TimelineViz + ReportTemplates, EvidenceVault, TerminalEmulator, Certificate, AnalyticsDashboard, BadgesShowcase, DailyChallenges, GlobalSearch, KeyboardShortcuts, GuidedTour, OfflineIndicator.

Cleanest actual navigation rather than blindly implementing exact structure above.

---

## Repository Naming

**Current:** `AmitPal-CyberBuddy/WiFiForge`

**Should it become `[PlatformName]` or `[PlatformName] └── Wireless Pentesting`?**

**Recommendation:** Platform repo becomes `[PlatformName]` (e.g., `Anvil`, `TemperForge`, `Verifex`), with Wireless as first learning path inside, not separate repo.

- If platform name is Anvil: repo `Anvil` or `anvil-academy` or `anvil-labs`.
- If TemperForge: repo `TemperForge` or `temperforge-academy`.
- If Verifex: repo `Verifex` or `verifex-academy`.

**Migration implications:**

- repository URL: `https://github.com/AmitPal-CyberBuddy/WiFiForge` → `https://github.com/AmitPal-CyberBuddy/<new-name>` — GitHub automatically redirects renames, but update README, badges, docs, internal links.
- GitHub Pages URL: `https://amitpal-cyberbuddy.github.io/WiFiForge/` → `https://amitpal-cyberbuddy.github.io/<new-name>/` — need to update `VITE_BASE` in vite.config.ts, keep old site with redirect page for backward compat.
- package metadata: `frontend/package.json` name `wififorge` → `<new-name>`, description generic.
- README: title, badges, live demo link, quick start, web deployment notes.
- badges: Live Demo badge, Stack badge, Cost badge, Mode badge, License badge.
- documentation: `docs/BRANDING.md`, `BRANDING_DECISION.md`, `GITHUB_PAGES.md`, `ARCHITECTURE_AND_ROADMAP.md`, etc.
- internal links: `frontend/src/lib/api.ts` API_BASE, `frontend/src/content/*`, `backend/app/core/config.py` CONTENT_DIR, OFFLINE_DATA_DIR, PCAP_DIR, DATABASE_URL.
- deployment configuration: Dockerfile, docker-compose.yml, nginx.conf, env vars `WIFIFORGE_*` → `PLATFORM_*` with backward compat.
- canonical URLs: OG image, manifest.json, favicon.svg, SEO metadata.
- social previews: hero-banner.png, OG image.
- favicon: anvil without Wi-Fi arcs for platform, anvil + Wi-Fi arcs for wireless path.
- SEO metadata: index.html title, description.

**Do NOT break existing deployment while changing branding.** Stage 1-2 keep `VITE_BASE=/WiFiForge/`, Stage 5 updates with redirect.

---

## Summary of Recommendations

- **Current-state:** Heavily coupled to Wi-Fi in branding, metadata, UI, content, but core engines (content engine, lab engine, challenge engine, assessment engine, evidence model, progress, security headers, deployment) are already reusable and generic — good foundation.
- **Architecture:** Introduce LearningPath as top-level, make modules path-aware, generic content model `LearningPath → Module → Lesson → Lab → Challenge → Assessment`, keep Wireless as first complete path, future paths as planned expansion, not placeholder.
- **Branding:** WiFiForge should become Wireless path sub-brand, not platform brand, due to domain-specificity, scalability failure, and major conflict with BHIS WifiForge (1.2k stars, 9 labs, same niche). Platform needs new domain-neutral name.
- **Naming:** Shortlist Anvil (rank 1, best balance, preserves Forge Mark visual, avoids BHIS Forge line confusion), TemperForge (rank 2, preserves Forge, adds hardening), Verifex (rank 3, evidence-driven, domain-neutral), plus AttestForge, MasonForge, ChainForge with evaluations. Avoid SecForge, CyberForge, LabForge, BreakForge, BreachForge, TraceForge, ScopeForge, EvidenceForge, RedForge, PurpleForge, SignalForge, VectorForge, VulnForge, HexForge, ByteForge, RootForge, ForgePath, Foundry, Crucible, Exploit-Forge — all have strong conflicts.
- **UI/UX:** Move Wi-Fi-specific branding into Wireless path, make platform-level domain-neutral, refactor navigation to Learn/Practice/Assess/Track, keep Forge. Break. Fix. Retest. as platform philosophy.
- **Data/content:** Generic abstractions LearningPath, Module, Lesson, Lab, Challenge, Assessment, Skill, Evidence, Attempt, Progress, Certification, not WiFiModule etc. Existing wireless content maps into generic model without rewrite.
- **Migration:** 6 stages: Stage 1 architecture path-aware (no rename), Stage 2 dual branding (new platform identity + wireless sub-brand), Stage 3 move wireless into learning paths structure (UI), Stage 4 update docs and repo metadata, Stage 5 update deployment/domain with redirects, Stage 6 retain compatibility.
- **Tagline:** Retain Forge. Break. Fix. Retest., add supporting `Learn cybersecurity by doing.` and methodology description.
- **Positioning:** Hands-on cybersecurity learning platform where learners investigate systems, perform security testing, collect evidence, understand impact, remediate, retest, report — not just another course platform. Differentiator remains practical security assessment methodology.

**Most importantly:** Generalize the platform without losing the depth and identity of the existing Wireless Pentesting experience. Wireless remains first mature path, 20 modules, 27 lessons, 16 verified PCAPs, 15 challenges, ENG-01, 35 decision scenarios, 42-item checklist — all preserved, just moved into `Learning Path → Wireless Pentesting`.

---

## Next Steps After This Review

1. Stakeholder decision on final platform name from shortlist (recommend Anvil, TemperForge, or Verifex).
2. Implement Stage 1: create `platform.json`, `learning-paths.json`, `skills.json`, update `modules.json`, `labs.ts`, `stats.ts`, `useProgressStore.ts`, backend learning_paths router.
3. Implement Stage 2: dual branding, update Sidebar, Dashboard, Topbar, index.html, manifest.json, logo.
4. Implement Stage 3: refactor LearningPath into LearningPaths + PathDetail, path-aware routing, path-aware Modules/Labs/Challenges/Engagement.
5. Verify: `npm run build`, `verify-no-dummy-data.py`, `verify-lab-artifacts.py`, `npm audit`, typecheck.
6. Then proceed to Stage 4-6 as per migration plan.

*Forge. Break. Fix. Retest. — Hands-on Cybersecurity Learning Platform*

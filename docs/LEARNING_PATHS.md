# Learning Paths — Architecture

**Date:** 2026-09-28
**Version:** 2.1
**Status:** Stage 1 implemented — path-aware, backward compatible

## Concept

```
Platform
│
├── Learning Paths
│   ├── Wireless / Wi-Fi Pentesting (available, 20 modules, reference)
│   ├── Web Application Security (planned)
│   ├── API Security (planned)
│   ├── Android Pentesting (planned)
│   ├── Network Pentesting (planned)
│   ├── Active Directory (planned)
│   ├── Cloud Security (planned)
│   └── AI / LLM Security (planned)
│
├── Labs (reusable)
├── Challenges (reusable)
├── Assessments (reusable)
├── Skills (generic + domain-specific)
└── Evidence / Reporting (reusable)
```

Do NOT implement all future paths just to demonstrate structure. Make existing Wireless path fit naturally into this model.

## Learning Path Structure

Each learning path is defined in `frontend/src/content/learning-paths.json`:

```json
{
  "id": "wireless-pentesting",
  "title": "Wireless Pentesting",
  "shortTitle": "Wireless",
  "description": "Hands-on wireless security assessment...",
  "category": "network-security",
  "icon": "📡",
  "color": "cyan",
  "difficulty": "Beginner → Professional",
  "estimatedHours": 52,
  "status": "available",
  "featured": true,
  "modules": ["01-intro-wireless", "02-wifi-fundamentals", ...],
  "phases": [
    { "id": 1, "name": "Foundations", "desc": "Wireless fundamentals & 802.11", "color": "cyan", "modules": ["01-intro-wireless", ...] }
  ],
  "skills": ["reconnaissance", "traffic-analysis", ...],
  "labs": 16,
  "challenges": 15,
  "tagline": "Understand the Protocol. Test the Implementation.",
  "legacyBrand": "WiFiForge"
}
```

Future paths are `status: planned` with empty `modules: []` — no placeholder lessons.

## How to Add a New Path (Without Rewrite)

1. **Add entry to learning-paths.json:**

```json
{
  "id": "web-application-security",
  "title": "Web Application Security",
  "shortTitle": "Web",
  "description": "Hands-on web app pentesting...",
  "category": "web-security",
  "icon": "🌐",
  "color": "violet",
  "status": "available",
  "featured": false,
  "modules": ["web-01-intro", "web-02-http", ...],
  "phases": [...],
  "skills": ["reconnaissance", "input-validation", ...],
  "labs": 10,
  "challenges": 12
}
```

2. **Add modules to modules.json with learningPathId:**

```json
{
  "id": "web-01-intro",
  "learningPathId": "web-application-security",
  "title": "Web Security Foundations",
  "phase": 1,
  "phaseName": "Foundations",
  "difficulty": "Beginner",
  "estimated_hours": 2.0,
  "lab_requirement": "SIMULATION",
  "skills": ["web-basics", "http", "methodology"],
  "lessons": [{ "id": "01-why-web-is-different", "title": "Why web changes threat model", "kind": "concept" }]
}
```

3. **Add lessons:**

```
frontend/src/content/lessons/web-application-security/web-01-intro/01-why-web-is-different.md
```

4. **Add labs to labs.ts with learningPathId:**

```typescript
{ learningPathId: 'web-application-security', id: 'lab-web-01-http', module: 'web-01-intro', title: 'HTTP Analysis', type: 'HTTP Analysis', status: 'SIMULATION', pcap: null, artifactType: 'http', description: 'Analyze HTTP request/response' }
```

5. **Add challenges, engagements, scenarios with learningPathId.**

6. **Add skills to skills.json if needed:**

```json
{ "id": "xss", "name": "Cross-Site Scripting", "category": "web", "description": "Test reflected, stored, DOM XSS" }
```

7. **Update stats.ts — automatically derived, no manual totals.**

8. **No changes to platform engine required** — content engine, lab engine, challenge engine, assessment engine, evidence model, progress store already path-aware.

## Routing

```
Platform:
  / -> Dashboard (platform overview, featured path Wireless)
  /paths -> LearningPaths (list all paths, 1 available, 7 planned)
  /paths/:pathId -> PathDetail (phases within path)
  /paths/:pathId/modules -> Modules (path-aware filter)
  /paths/:pathId/modules/:moduleId -> ModuleDetail (path-aware breadcrumb)

Legacy (backward compat):
  /path -> LearningPath (wireless phases, legacy)
  /modules -> Modules (defaults to wireless-pentesting)
  /modules/:id -> ModuleDetail (effectivePathId from module.learningPathId)
  /labs?path=wireless-pentesting
  /challenges?path=wireless-pentesting
  /engagement -> ENG-01 wireless
```

SPA 404.html fallback handles deep links on GitHub Pages.

## Progress — Path-Aware

- `currentLearningPathId` stored in `platform-progress` (legacy fallback `wififorge-progress`)
- `getPathProgress(pathId)` — average of module progresses in path
- `getModuleProgress(moduleId)` — existing, per-module
- `getOverallProgress()` — platform overall (60% XP + 40% completion)

Certificate threshold per-path: 60% XP + 60% overall for that path.

## Skills — Generic + Domain-Specific

Generic (reusable for any path):
- Reconnaissance, Traffic Analysis, Authentication Testing, Authorization Testing, Input Validation, Cryptography, Configuration Review, Exploitation, Evidence Collection, Risk Analysis, Remediation, Retesting, Reporting, VAPT Methodology

Domain-specific (wireless path, preserved):
- Wireless Basics, SSID/BSSID/ESS, Frames, RSNE, WPA2, WPA3, EAP, RADIUS, etc.

Future domain-specific can extend without rewrite.

## Lab Engine — Reusable

Same lab framework should eventually support:
- PCAP analysis (current, 16 verified captures)
- Web applications (future: HTTP, Burp logs)
- API testing (future: OpenAPI, HTTP)
- Android analysis (future: APK, Manifest, logs)
- Network services (future: Nmap, banners)
- Containerized targets (future: Docker, KVM)

Current tiers:
- SIMULATION (bundled offline dataset) — no hardware, no RF, verified captures
- HYBRID (config audit + offline) — config files + offline dataset
- REAL (requires authorized environment) — generic, alias RF_REQUIRED for wireless backward compat

Evidence model already generic: capture, config, screenshot, http, log, terminal, android-artifact — all work.

## Assessment Engine — Reusable

Same workflow for any domain:
- Scope, RoE, Targets, Artefacts, Tasks, Marking Guide
- Current: ENG-01 Northwind Retail (wireless, 4 SSIDs, RADIUS, 6-10h)
- Future: ENG-02 Web (planned), etc.

## UI — Platform vs Path

Platform-level (domain-neutral):
- Dashboard, Search, Progress, User/profile, Labs, Challenges, Assessments, Evidence, Certificates, Analytics, Navigation, Content engine, Routing, Authentication, Learning state
- Logo: SecCraft shield/check/magnifier mark (platform)
- Title: SecCraft — Hands-on Cybersecurity Learning Platform
- Tagline: Learn. Practice. Investigate. Improve. + Learn cybersecurity by doing.

Domain-specific (wireless path):
- Wi-Fi terminology, wireless icons, BSSID/SSID concepts, Wi-Fi-specific commands, PCAP terminology, wireless modules, Wi-Fi attack categories
- Path icon: Wireless radio mark; `WiFiForge` retained only in legacy compatibility data
- Title: Wireless Pentesting — Understand the Protocol. Test the Implementation.
- Flag prefix: WIFIFORGE{} kept for historical continuity
- Skills: ssid, bssid, beacon, rsn, pmf, eap, radius, etc.

## Why One Excellent Path First?

A clean architecture with one excellent path is preferable to shallow platform containing many empty paths.

- Wireless Pentesting: 20 modules, 27 lessons, 16 verified PCAPs, 15 challenges, 35 decision scenarios, 42-item checklist, ENG-01 — mature, reference implementation
- Future paths: planned expansion, architecture ready, content after wireless maturity

*Forge. Break. Fix. Retest. — Learning Paths Architecture*

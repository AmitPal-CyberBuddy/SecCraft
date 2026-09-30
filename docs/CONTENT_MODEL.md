# Content Model — Generic Platform

**Date:** 2026-09-28
**Version:** 2.1
**Status:** Implemented Stage 1 — path-aware, backward compatible

This document describes the generic content model that makes the platform domain-neutral.

## Philosophy

Domain-agnostic core, domain-specific content.

- Platform engine should not assume Wi-Fi
- Wireless terminology belongs inside wireless-pentesting path
- Same lab engine should support PCAP, Web, API, Android, network, containers
- Same assessment engine for different domains
- Same evidence model for all artifact types

## Types

### LearningPath

Top-level abstraction. Previously missing — modules.json was flat list of 20 wireless modules.

```typescript
interface LearningPath {
  id: string // wireless-pentesting, web-application-security, api-security, android-pentesting, network-pentesting, active-directory, cloud-security, ai-llm-security
  title: string
  shortTitle: string
  description: string
  longDescription: string
  category: 'network-security' | 'web-security' | 'api-security' | 'mobile-security' | 'cloud-security' | 'ad-security' | 'ai-security'
  icon: string // emoji, domain-specific allowed here
  color: string // cyan, violet, amber, emerald, pink
  difficulty: string
  estimatedHours: number
  prerequisites: string[] // path ids
  status: 'available' | 'coming-soon' | 'planned'
  featured: boolean
  modules: string[] // ordered module ids
  phases: { id: number; name: string; desc: string; color: string; modules: string[] }[]
  skills: string[] // generic + domain-specific
  labs: number
  challenges: number
  certificate: boolean
  tagline?: string
  legacyBrand?: string // WiFiForge for wireless path
}
```

File: `frontend/src/content/learning-paths.json`

- 1 available: wireless-pentesting (20 modules, 30 lessons, 18 synthetic PCAPs, 22 self-review challenges, 35 scenarios, ENG-01)
- 7 planned: web-application-security, api-security, android-pentesting, network-pentesting, active-directory, cloud-security, ai-llm-security — empty modules, no placeholder lessons, architecture ready

### Module (Generic)

```typescript
interface Module {
  id: string
  learningPathId: string // NEW: path-aware
  title: string
  phase: number
  phaseName: string // Foundations, Reconnaissance, etc.
  difficulty: string
  estimated_hours: number
  prerequisites: string[]
  lab_requirement: 'SIMULATION' | 'HYBRID' | 'REAL' | 'RF_REQUIRED' // RF_REQUIRED kept as alias for wireless backward compat, generic is REAL
  lab_requirement_generic: 'SIMULATION' | 'HYBRID' | 'REAL'
  content_status: 'authored' | 'brief' | 'planned'
  skills: string[] // generic + domain-specific
  description: string
  objectives: string[]
  artifacts: string[]
  lessons: { id: string; title: string; kind: 'concept' | 'lab' | 'professional' }[]
  status: 'simulated' | 'hardware' | 'locked'
}
```

File: `frontend/src/content/modules.json` — now includes learningPathId, phaseName, lab_requirement_generic

### Lesson

```typescript
interface Lesson {
  id: string
  moduleId: string
  learningPathId: string
  title: string
  kind: string
  contentPath: string
}
```

File: `frontend/src/content/lessons/{path}/{module}/{lesson}.md` — currently wireless-pentesting lessons, future paths will follow same pattern

### Lab (Generic)

```typescript
interface LabEntry {
  learningPathId: string
  id: string
  module: string
  title: string
  type: string // PCAP Analysis, Config Analysis, Recon Analysis, etc. — future: HTTP Analysis, APK Analysis, IAM Review
  status: 'SIMULATION' | 'HYBRID' | 'REAL'
  difficulty: string
  pcap: string | null // artifact id, generic: could be http id, apk id, etc.
  color: string
  description: string
  artifactType?: 'pcap' | 'config' | 'http' | 'apk' | 'log' | 'iam'
}
```

File: `frontend/src/content/labs.ts` — now includes learningPathId

### Challenge (Generic)

```typescript
interface Challenge {
  id: string
  learningPathId: string
  module: string
  title: string
  difficulty: string
  type: string
  level: 'guided' | 'semi-guided' | 'assessment'
  estimated_time: string
  points: number
  status: string
  description: string
  objectives: string[]
  artifacts: string[]
  tasks: { id: string; question: string; answer: string; hint: string }[]
  flag: string // WIFIFORGE{} for wireless legacy, future: WEBFORGE{}, APIFORGE{}, etc. or generic PLATFORM{}
  skills: string[]
}
```

File: `frontend/src/content/challenges.json` — now includes learningPathId

### Assessment / Engagement (Generic)

```typescript
interface Engagement {
  id: string
  learningPathId: string
  name: string
  subtitle: string
  tier: string
  time_estimate: string
  summary: string
  objectives: string[]
  scope: { in_scope: string[]; out_of_scope: string[]; prohibited: string[]; windows: string }
  targets: { ssid?: string; band?: string; documented_security?: string; purpose?: string; url?: string; apk?: string }[]
  tasks: { id: string; title: string; detail: string; output: string }[]
  marking_guide: { criterion: string; weight: string; looks_like: string }[]
}
```

File: `frontend/src/content/engagements.json` — now includes learningPathId

### Scenario (Generic)

```typescript
interface Scenario {
  id: string
  learningPathId: string
  module: string
  type: 'choice'
  title: string
  situation: string
  question: string
  options: { id: string; text: string; analysis: string; correct: boolean }[]
  best: string
  rationale: string
}
```

File: `frontend/src/content/scenarios.json` — now includes learningPathId

### Skill (Generic + Domain-Specific)

```typescript
interface Skill {
  id: string
  name: string
  category: 'generic' | 'wireless' | 'web' | 'api' | 'android' | 'network' | 'ad' | 'cloud' | 'ai'
  description: string
  icon?: string
  level?: string
}
```

File: `frontend/src/content/skills.json` — NEW

Generic skills (domain-agnostic, reusable):
- Reconnaissance
- Traffic Analysis
- Authentication Testing
- Authorization Testing
- Input Validation
- Cryptography
- Configuration Review
- Exploitation
- Evidence Collection
- Risk Analysis
- Remediation
- Retesting
- Reporting
- VAPT Methodology
- Attack Surface
- Ethics & Authorization

Domain-specific (wireless path, preserved):
- Wireless Basics, SSID/BSSID/ESS, BSSID Analysis, 802.11 Frames, RSNE Decoding, WPA2/RSN, WPA3/SAE, EAP Methods, RADIUS

Future domain-specific can extend same model without rewrite.

### Evidence (Generic)

```typescript
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

Already generic, works for PCAP, screenshots, HTTP requests/responses, terminal output, logs, config files, Android artifacts, network captures.

### Progress (Path-Aware)

```typescript
interface ProgressState {
  currentLearningPathId: string // NEW: path-aware
  currentModule: string
  completedLessons: { moduleId: string; lessonId: string; completedAt: string; points: number }[]
  completedLabs: { moduleId: string; labId: string; completedAt: string; points: number }[]
  quizScores: { moduleId: string; quizId: string; score: number; total: number; completedAt: string }[]
  totalXp: number
  achievements: Achievement[]
  getPathProgress: (pathId: string) => number // NEW
  getModuleProgress: (moduleId: string) => number
  getOverallProgress: () => number
}
```

File: `frontend/src/store/useProgressStore.ts` — now path-aware, storage key `platform-progress` with legacy `wififorge-progress` fallback

### Platform Config

File: `frontend/src/content/platform.json`

Domain-neutral platform metadata: name, fullName, shortName, legacyName, tagline, secondaryTagline, description, philosophy, palette, fonts, logo concept, links, principles.

## Mapping Existing Wireless Content

```yaml
learningPath:
  id: wireless-pentesting
  title: Wireless Pentesting
  category: network-security
  icon: 📡
  color: cyan
  status: available
  modules: [01-intro-wireless, 02-wifi-fundamentals, ... 20-final-assessment]

module:
  id: 02-wifi-fundamentals
  learningPathId: wireless-pentesting
  phase: 1
  phaseName: Foundations
  lab_requirement: SIMULATION
  lab_requirement_generic: SIMULATION

lab:
  id: lab-02-beacon
  learningPathId: wireless-pentesting
  module: 02-wifi-fundamentals
  type: PCAP Analysis
  pcap: beacon-only
  artifactType: pcap

challenge:
  id: chal-01-beacon
  learningPathId: wireless-pentesting
  flag: WIFIFORGE{BEACON_TRIAGE_RSNE_BITS} # legacy prefix kept for continuity

skill:
  id: reconnaissance
  category: generic
  # reusable for wireless, web, api, android, etc.

  id: ssid
  category: wireless
  # domain-specific, inside wireless path
```

Content engine does not care whether path is `wireless-pentesting` or `android-pentesting` or `web-application-security` unless domain-specific functionality genuinely required.

## Stats (Path-Aware)

File: `frontend/src/content/stats.ts`

- Platform totals: TOTAL_LEARNING_PATHS, AVAILABLE_LEARNING_PATHS, TOTAL_MODULES, TOTAL_LESSONS, TOTAL_LABS, TOTAL_CHALLENGES, etc.
- Per-path: getModulesForPath(pathId), getLabsForPath(pathId), getChallengesForPath(pathId), getStatsForPath(pathId)
- PLATFORM_STATS object for dashboard

## Backend

- New router `learning_paths.py`: `/api/learning-paths`, `/api/learning-paths/{id}`, `/api/platform`
- Updated `content.py`: `/api/modules?path=wireless-pentesting` filter
- Lab catalogue includes learningPathId

## Verification

- `verify-no-dummy-data.py` now checks platform.json, learning-paths.json, skills.json exist, at least 1 available path, planned paths have empty modules (no placeholder content to make platform appear larger)
- `verify-lab-artifacts.py` still verifies 16 PCAPNG artefacts, 206 checks

## Future Paths

Do NOT create placeholder content simply to make platform appear larger.

Instead:
1. Make platform architecture path-aware (done)
2. Make Wireless first complete path (done, preserved)
3. Ensure content engine can support additional paths (done)
4. Keep future paths as planned expansion (learning-paths.json status planned, modules empty)

A clean architecture with one excellent path is preferable to shallow platform containing many empty paths.

## Reusable Lab Engine

Same lab framework should eventually support:
- PCAP analysis (current)
- Web applications (future: HTTP requests/responses, Burp logs)
- API testing (future: OpenAPI specs, HTTP)
- Android analysis (future: APK, AndroidManifest, logs)
- Network services (future: Nmap, service banners)
- Containerized targets (future: Docker)

Evidence model already generic, works for all.

## Reusable Assessment Engine

Assessment workflows should support different security domains with same structure: scope, RoE, targets, artefacts, tasks, marking guide.

## Reusable Skill Model

Generic + domain-specific extensions, not WiFiModule etc.

## Preservation

Do not unnecessarily rewrite functioning systems. Existing systems reused:
- lessons, labs, PCAP analysis, terminal, evidence, challenges, assessments, analytics, certificates, backend APIs, Docker, deployment, security headers, CI/CD, learning progression

Objective: Generalize the platform, not rebuild it.

*Forge. Break. Fix. Retest. — Generic Content Model*

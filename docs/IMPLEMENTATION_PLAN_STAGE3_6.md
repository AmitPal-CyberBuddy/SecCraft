# Implementation Plan — Stage 3-6 — Platform Repositioning Completion

**Date:** 2026-09-28
**Status:** Stage 1-2 done (path-aware architecture + dual branding Anvil), Stage 3 partial (LearningPaths list/detail done, Modules path-aware done), Stage 4-6 pending
**Branch:** arena/01a0e917-wififorge
**Platform name:** Anvil (recommended, pending stakeholder final) — legacy WiFiForge retained as Wireless path sub-brand

---

## 1. Current State Summary (What is Done)

### Stage 1 — Architecture path-aware (Done)
- [x] `frontend/src/content/platform.json` — Anvil metadata, tagline Forge. Break. Fix. Retest., philosophy, palette, legacyName WiFiForge
- [x] `frontend/src/content/learning-paths.json` — 8 paths: wireless-pentesting available (20 mods, 6 phases, 52h), 7 planned empty modules
- [x] `frontend/src/content/skills.json` — generic + wireless domain-specific
- [x] `frontend/src/lib/platform.ts` — generic interfaces LearningPath, Module, LabEntry, Challenge, Skill, PlatformConfig, LAB_REQUIREMENT_MAP
- [x] `frontend/src/content/modules.json` — learningPathId, phaseName, lab_requirement_generic added
- [x] `frontend/src/content/labs.ts` — learningPathId added
- [x] `frontend/src/content/challenges.json`, `engagements.json`, `scenarios.json` — learningPathId tagged
- [x] `frontend/src/content/stats.ts` — path-aware helpers getModulesForPath, getStatsForPath, PLATFORM_STATS, TOTAL_LEARNING_PATHS
- [x] `frontend/src/store/useProgressStore.ts` — currentLearningPathId, getPathProgress, storage platform-progress v3 + legacy wififorge-progress fallback
- [x] Backend `learning_paths.py` — /api/learning-paths, /api/platform, /api/modules?path= filter
- [x] `verify-no-dummy-data.py` checks platform files, planned paths empty
- [x] `verify-lab-artifacts.py` 142/142

### Stage 2 — Dual branding (Done partial)
- [x] `index.html` title Anvil — Hands-on Cybersecurity Learning Platform
- [x] `manifest.json` name Anvil
- [x] `package.json` name anvil v2.1.0
- [x] `Sidebar.tsx` platform brand Anvil + current path indicator Wireless + sections Learn/Practice/Assess/Track
- [x] `Dashboard.tsx` platform overview + featured path + path grid
- [x] `Topbar.tsx` platform-theme fallback
- [x] `EvidenceVault.tsx` dual key platform-evidence-vault + legacy
- [x] `LocalDataPanel.tsx` known keys expanded
- [x] Backend main.py title Anvil API v2.1.0 health includes platform, legacy, learning_paths counts

### Stage 3 — Wireless into Learning Paths (Partial)
- [x] `LearningPaths.tsx` list all paths
- [x] `PathDetail.tsx` phases within path
- [x] `App.tsx` routes /paths, /paths/:pathId, /paths/:pathId/modules + legacy /path, /modules, /modules/:id backward compat
- [x] `Modules.tsx` path-aware filter via useParams pathId
- [x] `ModuleDetail.tsx` effectivePathId from params or module.learningPathId
- [ ] Labs.tsx — still PCAP-focused, not path-aware
- [ ] Challenges.tsx — not path-aware
- [ ] Engagement.tsx — single ENG-01, no list, not path-aware
- [ ] GlobalSearch.tsx — hard-coded wireless items, not generic
- [ ] Reference.tsx — commands.json flat, not path-aware
- [ ] TerminalEmulator.tsx — prompt kali@wififorge hard-coded
- [ ] Certificate.tsx — not path-aware
- [ ] Modules.tsx phaseStats uses global modules not pathModules (bug)

### Stage 4-6 — Pending

---

## 2. Stage 3 Completion — Remaining Implementation

### 3.1 Labs.tsx — Path-aware + Generic Artifact Library
**Priority:** High — user sees Labs as platform feature
**Current coupling:** Title "PCAP Library", badge "PCAPs", parser info wififorge-labkit, tier mapping uses modules global, no path filter
**Changes:**
- Read `?path=` from `useSearchParams` and `useParams pathId`
- Effective path: query param > pathId param > currentLearningPathId > wireless-pentesting
- Filter LABS by learningPathId == effectivePathId
- Filter pcaps by module group belonging to pathModules
- Rename tab "PCAP Library" -> "Artifact Library" generic, subtitle "16 verified artifacts • offline • local-first" for wireless, "0 artifacts • planned" for planned
- Keep PCAP terminology inside wireless path cards, but header generic "Capture library → Artifact library"
- Tier mapping: use pathModules not global modules
- Add path indicator chip + link back to PathDetail
- Add empty state for planned paths: "This path is planned — architecture ready, content after Wireless maturity"
- Keep wififorge-labkit method name but add platform-labkit alias in UI note
- Update TierBadge to support generic REAL alias (already in platform.ts normalizeLabRequirement)
- Verify: build passes, Labs page shows 16 for wireless, 0 for planned

### 3.2 Challenges.tsx — Path-aware
**Priority:** High
**Changes:**
- Read ?path= and pathId param, effectivePathId same logic
- Filter challenges by learningPathId
- Add path indicator + link to PathDetail + filter badge "Wireless • 15 challenges"
- Add empty state for planned paths
- Keep WIFIFORGE{} flag prefix for wireless historical continuity
- Update header to show path context

### 3.3 Engagement.tsx — List + Detail Path-aware
**Priority:** High — Assessments are platform-level
**Current:** Single ENG-01 hard-coded, no list
**Changes:**
- If no id param, show list of all engagements from engagements.json
- Each engagement now has learningPathId (add if missing) — already added
- List cards: icon, title, subtitle, tier, time, path chip, status
- Detail view: existing sections but add breadcrumb Platform > Learning Paths > Wireless > Assessments > ENG-01
- Add path filter ?path= support
- Add planned state for future engagements
- Keep marking guide generic

### 3.4 GlobalSearch.tsx — Generic Index
**Priority:** High — search is platform-level
**Current coupling:** Hard-coded wireless lessons (Wireshark Filters, WPA2 Handshake, etc.), commands hard-coded wireless, filters hard-coded
**Changes:**
- Build search index from:
  - learning-paths.json (8 paths)
  - modules.json (20 modules with learningPathId)
  - labs.ts (16 labs)
  - challenges.json (15)
  - skills.json (generic + wireless)
  - commands.json (flat but keep)
  - filters.json
  - scenarios.json (optional)
- Type: path, module, lab, challenge, skill, command, filter, lesson (lesson titles from modules.json lessons array)
- Keywords: include learningPathId, skills, description
- Path field: add path context to result (e.g., "Wireless Pentesting > Wi-Fi Fundamentals")
- Results: max 15, score based on title, id, keywords
- Keep local index, no external requests
- Add path badge in result

### 3.5 Reference.tsx — Path-aware Commands/Filters
**Priority:** Medium
**Current:** commands.json flat list, filters.json flat, no path context
**Changes:**
- Keep flat for now (backward compat) but add grouping by category already exists
- Add path filter tabs: All / Wireless / Web (planned) / etc.
- If commands.json becomes path-aware object { wireless: [...], web: [...] } in future, support both formats: if array, treat as wireless; if object, merge with path key
- Add generic methodology section already exists — keep
- Add note: "Commands are organized by what they prove, not what they do — methodology is generic, examples are path-specific"
- Update header to show path context

### 3.6 TerminalEmulator.tsx — Platform-aware Prompt
**Priority:** Medium — branding
**Current:** "kali@wififorge: ~/labs" hard-coded, help text "WiFiForge Terminal"
**Changes:**
- Import platform.json, use platform.name lowercased for prompt: "kali@anvil" or "operator@anvil"
- Keep legacy "kali@wififorge" as fallback comment in help output for historical continuity
- Update help text: "Anvil Terminal — simulated shell (legacy WiFiForge)" + platform tagline
- Keep commands same (wireless-specific is okay inside wireless path terminal, but terminal is generic)
- Update footer: "Simulated terminal • Zero-cost • Local-first"

### 3.7 Modules.tsx — Bug Fix Phase Stats
**Priority:** Medium
**Current:** phaseStats uses global modules.filter(m => m.phase === p) not pathModules
**Changes:**
- Use pathModules for phaseStats
- Also filterStatus should consider lab_requirement_generic

### 3.8 Certificate.tsx — Path-aware
**Priority:** Medium
**Changes:**
- Read currentLearningPathId, get path progress
- Certificate title: Platform Certificate vs Path Certificate
- Show path-specific skills, modules completed for that path
- Keep local-first, not accredited, LOCAL- id
- Add path badge

### 3.9 ModuleDetail.tsx — Breadcrumb + Path Link
**Priority:** Low (already path-aware effectivePathId)
**Changes:**
- Breadcrumb: Platform > Learning Paths > Wireless > Phase X > Module Title
- Back link to /paths/:pathId/modules
- Show path chip + legacyBrand if present

### 3.10 Reports, Analytics, Badges — Path-aware Check
**Priority:** Low
**Changes:**
- Reports: already generic, add path filter
- AnalyticsDashboard: already path-aware via useProgressStore but ensure per-path stats shown
- BadgesShowcase: achievements already generic, but ensure wireless-specific badges labeled as Wireless path

---

## 3. Stage 4 — Documentation & Repo Metadata (No Deployment Break)

### 4.1 README.md — Final Platform Positioning
**Current:** Already updated to Anvil + legacy WiFiForge note, but still has old Brand section saying name wififorge
**Changes:**
- Title: Anvil — Hands-on Cybersecurity Learning Platform (legacy WiFiForge)
- Keep hero banner but alt text updated
- Section "What is Anvil?" already done — keep
- Brand section: Update to Anvil, palette, fonts, logo concept (anvil without Wi-Fi arcs platform, with arcs wireless path)
- Architecture section: Update hierarchy Platform → Learning Paths → Modules → Lessons → Labs → Challenges → Assessments
- Roadmap: Keep shipped today, add "Platform Repositioning" note with link to PLATFORM_REPOSITIONING.md
- Keep quick start, web deployment, safety, license
- Update badges: keep Live Demo link /WiFiForge/ for now (VITE_BASE unchanged)
- Add note: "Platform brand Anvil recommended, pending stakeholder final — see docs/BRANDING_MIGRATION.md"

### 4.2 docs/ARCHITECTURE_AND_ROADMAP.md — Update Hierarchy
**Changes:**
- Update stack: Frontend Vite + React + TS + Tailwind + Zustand + React Router (domain-agnostic)
- Update content model: LearningPath → Module → Lesson → Lab → Challenge → Assessment
- Update repo structure to include platform.json, learning-paths.json, skills.json, lib/platform.ts
- Update roadmap phases: mention platform repositioning done Stage 1-2, Stage 3-6 in progress
- Keep existing 8-phase roadmap but add path-aware context

### 4.3 docs/BRANDING.md — Update Platform vs Path
**Current:** Says KEEP WiFiForge, outdated, claims minor collision — inaccurate
**Changes:**
- Add deprecation notice: "This doc is superseded by docs/PLATFORM_REPOSITIONING.md and docs/BRANDING_MIGRATION.md for platform repositioning"
- Keep historical WiFiForge branding for Wireless path sub-brand
- Add new platform brand section: Anvil (recommended), TemperForge, Verifex shortlist with evaluation
- Update palette, fonts, logo: platform anvil without arcs, wireless path anvil with arcs
- Update tagline: retain Forge. Break. Fix. Retest. as platform philosophy
- Update repo naming: platform repo becomes Anvil etc.

### 4.4 docs/BRANDING_DECISION.md — Update Decision Log
**Changes:**
- Add entry 2026-09-28: Platform repositioning assessment, BHIS WifiForge collision major, need domain-neutral platform brand
- Document shortlist Anvil rank 1, TemperForge rank 2, Verifex rank 3 with conflicts
- Document decision: platform brand Anvil recommended, WiFiForge becomes wireless path sub-brand
- Keep existing decision history

### 4.5 docs/GITHUB_PAGES.md — Update Base Path
**Changes:**
- Note VITE_BASE=/WiFiForge/ kept for backward compat until final rename
- Explain future rename to /Anvil/ or /<new-repo>/ with redirect page
- Keep 404.html SPA fallback notes

### 4.6 docs/ — New Docs Already Created
- [x] docs/PLATFORM_REPOSITIONING.md — full A-H assessment
- [x] docs/CONTENT_MODEL.md — generic model
- [x] docs/LEARNING_PATHS.md — how to add new path
- [x] docs/BRANDING_MIGRATION.md — staged migration
- [ ] This file docs/IMPLEMENTATION_PLAN_STAGE3_6.md — this plan

### 4.7 frontend/package.json — Already anvil
- Keep name anvil, version 2.1.0, description platform + legacy

### 4.8 backend/app/main.py — Already Anvil
- Keep title Anvil API, health includes platform, legacy, learning_paths

---

## 4. Stage 5 — Deployment / Domain References (Staged, No Break)

### 5.1 Keep VITE_BASE=/WiFiForge/ for Now
**Reason:** GitHub Pages URL https://amitpal-cyberbuddy.github.io/WiFiForge/ remains valid, no broken deployment
**Future:** When repo rename decided (e.g., WiFiForge → Anvil), GitHub auto-redirects, update VITE_BASE to /<new-repo>/, keep old site with redirect page
**Changes now:**
- Ensure vite.config.ts DEFAULT_BASE remains /WiFiForge/ with comment explaining future rename
- Add comment in frontend/src/lib/api.ts about base

### 5.2 Backend Config — Dual Env Vars
**Current:** Only WIFIFORGE_* env vars
**Changes:**
- Support both PLATFORM_* and WIFIFORGE_* with PLATFORM_* preferred, WIFIFORGE_* fallback for backward compat
- Vars: PLATFORM_ALLOWED_ORIGINS / WIFIFORGE_ALLOWED_ORIGINS, PLATFORM_JWT_SECRET / WIFIFORGE_JWT_SECRET, PLATFORM_DEMO_USERS / WIFIFORGE_DEMO_USERS, PLATFORM_MAX_UPLOAD_BYTES / WIFIFORGE_MAX_UPLOAD_BYTES, PLATFORM_DATABASE_URL / DATABASE_URL
- Document in config.py and SECURITY.md
- Update docker-compose.yml to show both

### 5.3 Docker, nginx, Dockerfile
**Current:** Image names, env vars wififorge-specific
**Changes:**
- Keep existing for now, add comment about future PLATFORM_* migration
- nginx.conf already generic — keep

### 5.4 Verify Build
- `npm run build` must pass
- `vite build` outputs to dist/ with base /WiFiForge/
- No external requests, CSP intact

---

## 5. Stage 6 — Redirects / Compatibility (Retain Where Necessary)

### 6.1 App.tsx Explicit Redirects
**Current:** Legacy routes /path, /modules, /modules/:id exist but not redirect to /paths/wireless-pentesting
**Changes:**
- Add Navigate components:
  - /path → /paths/wireless-pentesting (replace)
  - /learning-path → /paths/wireless-pentesting (if exists)
  - /modules → /paths/wireless-pentesting/modules? Actually keep /modules as path-aware default wireless for backward compat, but add redirect /path to /paths/wireless-pentesting
  - /engagement → /assessments/ENG-01 or /engagement/ENG-01
- Keep SPA 404.html fallback

### 6.2 Backend Backward Compat
- [x] /api/modules returns all modules (backward compat) + filter ?path=
- [ ] Add /api/learning-paths fallback to 8 paths if file missing (already)
- Keep flag prefix WIFIFORGE{} for wireless historical continuity
- Keep lab artifact names beacon-only.pcapng etc.
- Keep wififorge-labkit method name with platform-labkit alias

### 6.3 localStorage Migration
- [x] platform-progress with wififorge-progress fallback
- [x] platform-evidence-vault with wififorge-evidence-vault fallback
- [x] platform-theme with wififorge-theme fallback
- [ ] platform-a11y-* with wififorge-a11y-* fallback (check AccessibilityPanel)
- [ ] platform-profile with wififorge-profile fallback (check LocalProfile)

### 6.4 Package Metadata
- Keep wififorge as alias in description for SEO/discoverability
- Keep flag prefix, labkit method, artifact names

---

## 6. Additional Changes Required for Scalable Platform (From Section H)

### 6.1 Content Versioning
- [x] platform.json contentVersion 2.1
- [ ] Add contentVersion check in App.tsx or stats.ts

### 6.2 Skill Taxonomy
- [x] skills.json generic + wireless
- [ ] Add level, category, prerequisites already present

### 6.3 Lab Engine Generalization
- Tiers: SIMULATION (bundled offline dataset) • HYBRID (config audit + offline) • REAL (requires authorized environment) — generic, RF_REQUIRED alias for wireless backward compat
- [x] LAB_REQUIREMENT_MAP in platform.ts
- [ ] Update TierBadge to show generic description on hover
- Artifact types: pcap, config, http, apk, log, iam, terraform — [x] artifactType field added

### 6.4 Assessment Engine
- Generic Assessment { id, learningPathId, title, type, scope, roe, targets, artefacts, tasks, markingGuide } — already generic
- [ ] Engagement list view (3.3)

### 6.5 Progress Model
- [x] currentLearningPathId, pathProgress, skillProgress planned
- [x] MAX_XP per path? Currently global — future: per-path MAX_XP derived from pathModules
- Certificate threshold per-path 60% XP + 60% overall — already generic but ensure path-aware

### 6.6 Search
- [ ] Generic index (3.4)

### 6.7 Terminal
- [ ] Platform-aware prompt (3.6)

### 6.8 Analytics
- [ ] Path-aware: platform progress + path progress + skill progress — check AnalyticsDashboard

### 6.9 Certificate
- [ ] Path-aware (3.8)

### 6.10 Backend DB
- Currently SQLite lesson_progress, lab_progress, quiz_progress with user_id default local — generic
- [ ] Add learning_path_id column for path-aware progress (future, not breaking)

### 6.11 Configuration
- [ ] Env vars PLATFORM_* with backward compat (5.2)

### 6.12 Documentation
- [x] LEARNING_PATHS.md, CONTENT_MODEL.md, BRANDING_MIGRATION.md
- [ ] Update ARCHITECTURE_AND_ROADMAP.md, BRANDING.md, BRANDING_DECISION.md

### 6.13 Mobile
- mobile/README.md already cleaned fabricated claims — keep

### 6.14 CI/CD
- ci.yml, pages.yml verify lab artifacts and no dummy data — [x] updated to check platform files
- [ ] Ensure verify-no-dummy-data.py allows planned paths empty modules (already)

### 6.15 Security Headers
- Already good: CSP, X-Frame-Options DENY, etc. — keep

### 6.16 Accessibility
- AccessibilityPanel uses wififorge-a11y-* keys — [ ] migrate to platform-a11y-* with fallback

### 6.17 Theming
- Already generic — keep

### 6.18 Future-proofing
- Lab engine should support containerized targets (Docker, KVM) for Web, API, Android, Network, AD, Cloud, AI — architecture ready

---

## 7. Implementation Order (Priority)

### Phase 1 — High Impact, Low Risk (Do Now)
1. Fix Modules.tsx phaseStats bug (pathModules)
2. Labs.tsx path-aware + generic artifact library
3. Challenges.tsx path-aware
4. GlobalSearch.tsx generic index
5. TerminalEmulator.tsx platform-aware prompt
6. App.tsx explicit redirects /path → /paths/wireless-pentesting

### Phase 2 — Medium Impact (Next)
7. Engagement.tsx list + detail path-aware
8. Reference.tsx path-aware filter
9. Certificate.tsx path-aware
10. Backend config.py dual env vars PLATFORM_* + WIFIFORGE_*
11. LocalDataPanel, AccessibilityPanel, LocalProfile dual keys

### Phase 3 — Docs & Verification (Final)
12. Update docs/ARCHITECTURE_AND_ROADMAP.md, BRANDING.md, BRANDING_DECISION.md, GITHUB_PAGES.md
13. Update README.md final brand section
14. Run verification: tsc --noEmit, vite build, verify-no-dummy-data.py, verify-lab-artifacts.py, npm audit
15. Commit + push

---

## 8. Verification Checklist

- [ ] `cd frontend && ./node_modules/.bin/tsc -p tsconfig.app.json --noEmit` passes
- [ ] `cd frontend && npm run build` passes (2839+ modules)
- [ ] `python scripts/verify-no-dummy-data.py` passes (warn only ReportPdfExport placeholder dataset)
- [ ] `python scripts/verify-lab-artifacts.py` 142/142 passes
- [ ] No external requests (CSP, no CDN fonts, no analytics)
- [ ] Routes: / (platform dashboard), /paths (list), /paths/wireless-pentesting (detail), /paths/wireless-pentesting/modules, /paths/wireless-pentesting/modules/:id, legacy /path → /paths/wireless-pentesting, /modules, /modules/:id backward compat
- [ ] Labs: ?path=wireless-pentesting shows 16 artifacts, ?path=web-application-security shows empty planned state
- [ ] Challenges: ?path=wireless-pentesting shows 15, planned shows empty
- [ ] Search: Cmd+K shows learning paths, modules, labs, challenges, skills
- [ ] Terminal: prompt shows anvil not wififorge, help mentions legacy
- [ ] localStorage: platform-progress with wififorge-progress fallback works
- [ ] Backend: /api/learning-paths returns 8 paths, /api/platform returns Anvil, /api/modules?path=wireless-pentesting filters

---

## 9. Risks & Mitigations

- **Breaking existing deployment:** Keep VITE_BASE=/WiFiForge/ until final rename, keep legacy routes, keep localStorage fallback, keep flag prefix, keep artifact names, keep labkit method
- **Naming conflicts:** Anvil recommended after conflict research (secforge, cyberforge, labforge, etc. all have strong conflicts), Anvil low-moderate conflict (AnvilSec services not training)
- **Placeholder content:** Do NOT create placeholder lessons to make platform appear larger — planned paths have empty modules, architecture ready, content after wireless maturity
- **Copying THM/HTB:** Avoid copying branding, visual identity, terminology, IA, gamification without reason — keep own identity Technical Professional dark slate + cyan + violet, Forge Mark anvil, senior pentester mentor
- **Losing wireless depth:** Preserve existing work — 20 modules, 27 lessons, 16 PCAPs, 15 challenges, 35 scenarios, 42-item checklist, ENG-01 — all preserved as wireless-pentesting path

---

## 10. Deliverables

- Updated frontend pages: Labs.tsx, Challenges.tsx, Engagement.tsx, GlobalSearch.tsx, Reference.tsx, TerminalEmulator.tsx, Modules.tsx (bug fix), Certificate.tsx
- Updated App.tsx with explicit redirects
- Updated backend config.py dual env vars
- Updated docs: ARCHITECTURE_AND_ROADMAP.md, BRANDING.md, BRANDING_DECISION.md, GITHUB_PAGES.md, README.md brand section
- This plan file
- Verification passing

*Forge. Break. Fix. Retest. — Implementation Plan Stage 3-6*

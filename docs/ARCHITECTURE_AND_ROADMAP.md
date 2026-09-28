# WiFiForge — Architecture & Implementation Roadmap
> Technical Architect Response to `requirement.md`

## A. Project Restatement (In My Own Words)

You want to build **WiFiForge (Wireless PT Academy)** — a personal, free, local-first, HTB Academy-style interactive platform that teaches you to *think and operate like a professional Wi-Fi penetration tester*, not just run commands.

Core loop:
```
Learn → Understand → Observe → Enumerate → Test → Exploit/Validate → Evidence → Impact → Remediate → Retest → Report
```

It must run at `http://localhost:3000` on Kali, cost $0, use GitHub only as source control, and work **without physical Wi-Fi hardware at first** by leveraging PCAPs, configs, logs, and simulated challenges. Real RF labs are clearly separated and added later when hardware is available.

The end state is a polished dark-themed web app where you can track progress, follow a skill tree / learning path (20 modules), do artifact-based labs (Wireshark, handshake analysis, config review), solve guided → semi-guided → assessment challenges, and practice professional reporting.

---

## B. Key Technical Constraints & How We Handle Them

| Constraint | Implication | Mitigation |
|---|---|---|
| **$0 cost / No Cloud** | No VPS, SaaS DB, Auth provider, hosting | Local-first: Vite frontend, FastAPI backend, SQLite file, localStorage fallback. Everything runs via `docker compose up` or `npm run dev` |
| **Kali Linux is primary env** | Tools like aircrack-ng, iw, tshark, hcxtools, Wireshark already exist. But VM wireless card can't do monitor/injection reliably | Frontend teaches concepts, backend uses `tshark`/`pyshark` to parse provided PCAPs. Real monitor mode labs are marked `HARDWARE_REQUIRED` and disabled by default |
| **No physical hardware initially** | Cannot claim to emulate RF, beacons, signal, injection | Strict split: `labs/simulated/` vs `labs/hardware/`. UI badge: `SIMULATED` vs `RF_REQUIRED`. Simulated labs = PCAP analysis, config audit, log review, handshake cracking of *self-generated* captures |
| **Interactive labs needed** | Web app can't run `iw dev` against host radio from browser safely | Three lab runtimes: 1) **Artifact Viewer** (PCAP/config viewer + questions), 2) **Local CLI verifier** (user runs command in real Kali terminal, pastes output / file, frontend validates), 3) **Docker labs** (hostapd + wpa_supplicant + freeradius containers for Enterprise) |
| **Progress tracking, no auth** | No user accounts | SQLite + FastAPI for persistent progress, localStorage mirror for offline. `user_id = local`. Future: optional export/import JSON |
| **Content velocity** | 20 modules × lessons × labs = lot of content | Content-as-code: `content/modules/<id>/` with `module.json`, `lessons/*.md`, `labs/*.yaml`, `quizzes/*.json`. Frontend renders markdown. No DB migration needed to add module |
| **Safety / Ethics** | Must not encourage attacking public Wi-Fi | Every lab manifest includes `scope: lab-only`, `authorization: self-generated`. Reporting template enforces evidence/impact/remediation language |

**Honest Limitation Statement we must show in UI:**
> This platform cannot simulate RF propagation, signal strength, or real-time 802.11 state machines. Simulated labs use pre-captured artifacts. Labs requiring monitor mode / injection are marked and require compatible hardware (e.g., ALFA AWUS036ACHM) + Kali bare-metal or USB passthrough.

---

## C. Recommended Technology Stack

### Frontend — Vite + React + TypeScript + Tailwind
**Why not Next.js?** Next.js adds SSR, serverless assumptions, heavier build. We are local-first, no SEO need, want fastest HMR on Kali. Vite is simpler, zero-cost, starts in <1s.

- **Vite + React + TS**: Fast dev, type safety for lab validation
- **Tailwind CSS + shadcn/ui (radix)**: Dark technical aesthetic without generic Bootstrap look. Custom theme: slate-950 bg, cyan-400 accent, terminal mono font
- **React Router v6**: `/dashboard`, `/path`, `/modules/:id`, `/labs/:id`, `/challenges`, `/reference`, `/reports`
- **Zustand**: Minimal global store for progress, no Redux overhead
- **Markdown**: `react-markdown` + `remark-gfm` + `rehype-highlight` for lesson rendering
- **Components**: 
  - `Terminal` (xterm.js style mock, but also real output paste validator)
  - `PcapInspector` (table of frames, filter bar like Wireshark display filter)
  - `ConfigViewer` (hostapd.conf, etc.)
  - `QuizCard`
  - `SkillTree` (SVG + framer-motion)

### Backend — FastAPI (Python)
**Why FastAPI?** You already have Python + Kali tooling. FastAPI integrates easily with tshark, aircrack, hashcat (for validation, not cracking), and serves JSON for frontend. Lightweight vs Django.

- **FastAPI + Uvicorn**
- **SQLite + SQLAlchemy + Alembic**: single file `wififorge.db`, zero config, portable
- **Pydantic**: module/labs schemas
- **Services**:
  - `content_service`: loads `content/modules/**/module.json` + markdown, serves via API, caches
  - `pcap_service`: uses `tshark -T json` to parse PCAPs on demand, extracts beacons, handshakes, EAPOL
  - `lab_service`: validates lab answers (regex, tshark filter result, JSON)
  - `progress_service`: tracks lesson/lab/quiz completion
- **No auth**: `X-Local-User: default` header

### Lab Runtime — Docker Compose (Optional, Phase F+)
- `docker/hostapd/` — simulated AP configs (WPA2-PSK, WPA3, OWE, WPS)
- `docker/freeradius/` — for WPA2-Enterprise labs, with EAP configs and logs
- `docker/supplicant/` — wpa_supplicant client simulation, generates logs
- All produce artifacts (pcaps, configs, radius logs) that are committed to `content/pcaps/` for simulated labs

### Content & Tooling
- **Markdown + Frontmatter** for lessons
- **YAML** for labs: objective, artifacts, tasks, validation, hints, mitigation, retest
- **JSON** for quizzes, progress definitions, skill tree
- **Scripts**: `scripts/generate_pcap.py`, `scripts/validate_lab.py`, `scripts/seed_db.py`

---

## D. Complete Repository Structure

```
WiFiForge/
├── README.md
├── requirement.md
├── docs/
│   ├── ARCHITECTURE_AND_ROADMAP.md  # this file
│   ├── SIMULATION_VS_HARDWARE.md
│   ├── VAPT_METHODOLOGY.md
│   └── UI_MOCKUPS.md
│
├── frontend/                         # Vite + React
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── package.json
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── routes/
│       ├── lib/
│       │   ├── api.ts
│       │   ├── progress.ts  # localStorage + API sync
│       │   └── utils.ts
│       ├── store/
│       │   └── useProgressStore.ts
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Shell.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   └── Topbar.tsx
│       │   ├── ui/            # shadcn
│       │   ├── dashboard/
│       │   │   ├── ProgressRing.tsx
│       │   │   └── ContinueCard.tsx
│       │   ├── learning/
│       │   │   ├── SkillTree.tsx
│       │   │   ├── ModuleCard.tsx
│       │   │   └── LearningPath.tsx
│       │   ├── lab/
│       │   │   ├── Terminal.tsx
│       │   │   ├── PcapInspector.tsx
│       │   │   ├── ConfigViewer.tsx
│       │   │   ├── QuizCard.tsx
│       │   │   └── ReportEditor.tsx
│       │   └── reference/
│       │       └── CommandPalette.tsx
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── LearningPath.tsx
│       │   ├── Modules.tsx
│       │   ├── ModuleDetail.tsx  # Overview | Theory | Lab | Challenge | Quiz | Report
│       │   ├── Labs.tsx
│       │   ├── Challenges.tsx
│       │   ├── Reference.tsx
│       │   └── Settings.tsx
│       └── content/  # symlinked or copied from ../content for dev
│
├── backend/                          # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   ├── models/
│   │   │   ├── progress.py
│   │   │   └── content.py
│   │   ├── schemas/
│   │   │   ├── module.py
│   │   │   ├── lab.py
│   │   │   └── quiz.py
│   │   ├── routers/
│   │   │   ├── content.py
│   │   │   ├── labs.py
│   │   │   ├── pcaps.py
│   │   │   └── progress.py
│   │   └── services/
│   │       ├── content_loader.py
│   │       ├── pcap_parser.py
│   │       ├── lab_validator.py
│   │       └── progress_tracker.py
│   ├── requirements.txt
│   ├── alembic/
│   └── tests/
│
├── content/                          # Source of truth for learning
│   ├── modules/
│   │   ├── 01-intro-wireless/
│   │   │   ├── module.json
│   │   │   ├── lessons/
│   │   │   │   ├── 01-what-is-wireless.md
│   │   │   │   └── 02-methodology.md
│   │   │   ├── labs/
│   │   │   │   └── lab-01-scope.yaml
│   │   │   └── quizzes/
│   │   │       └── q1.json
│   │   ├── 02-wifi-fundamentals/    # REFERENCE MODULE
│   │   │   ├── module.json
│   │   │   ├── lessons/
│   │   │   ├── labs/
│   │   │   └── quizzes/
│   │   └── ... (03-20)
│   ├── pcaps/
│   │   ├── wifi-fundamentals/
│   │   │   ├── beacon-only.pcapng
│   │   │   └── README.md
│   │   └── wpa2/
│   ├── configs/
│   │   ├── hostapd-wpa2.conf
│   │   └── radius/
│   └── reference/
│       ├── commands.json
│       ├── wireshark-filters.json
│       └── terminology.json
│
├── docker/
│   ├── docker-compose.yml
│   ├── hostapd/
│   ├── freeradius/
│   └── supplicant/
│
├── scripts/
│   ├── setup.sh
│   ├── generate_pcap.sh
│   ├── parse_pcap.py
│   └── seed_content.py
│
└── reporting/
    ├── templates/
    │   ├── finding.md
    │   └── wireless-pt-report.md
    └── examples/
```

### Key Data Models

**module.json**
```json
{
  "id": "02-wifi-fundamentals",
  "title": "Wi-Fi Fundamentals",
  "phase": 1,
  "difficulty": "Beginner",
  "estimated_hours": 2,
  "prerequisites": ["01-intro-wireless"],
  "status": "simulated",
  "skills": ["ssid", "bssid", "ap", "channels"],
  "lessons": ["01-ssid-bssid", "02-ap-client", "03-channels-bands"],
  "labs": ["lab-01-beacon-analysis"],
  "quizzes": ["q1", "q2"]
}
```

**lab.yaml**
```yaml
id: lab-02-beacon-analysis
title: Beacon Frame Analysis
type: pcap_analysis
runtime: simulated
artifacts:
  - path: pcaps/wifi-fundamentals/beacon-only.pcapng
    type: pcapng
objectives:
  - Identify SSID, BSSID, channel, security
tasks:
  - id: t1
    question: "What is the BSSID?"
    validator: { type: regex, pattern: "^([0-9A-F]{2}:){5}[0-9A-F]{2}$", answer: "AA:BB:CC:DD:EE:FF" }
attack_defense_retest:
  attack: "Observe open SSID leakage"
  defense: "Disable SSID broadcast? Discuss pros/cons"
  retest: "Verify hidden SSID still leaks via probe responses"
```

---

## E. MVP Definition (Phase A)

**Goal:** Runnable shell at `http://localhost:3000` with dashboard + learning path + 1 placeholder module, progress tracking, no backend required initially (fallback to local JSON).

**MVP Scope (2-3 days work):**

1. **Repo Scaffold**
   - `frontend/` Vite + React + TS + Tailwind + React Router
   - `backend/` FastAPI hello world + `/api/health`
   - `content/modules/` with 02-wifi-fundamentals seed

2. **Frontend Shell**
   - Layout: Sidebar (Dashboard, Learning Path, Modules, Labs, Reference, Settings) + Topbar
   - Pages: Dashboard (mock progress 0%), Learning Path (SVG vertical timeline with locked states), Module List (20 cards from JSON), Module Detail (tabs: Overview, Theory (markdown render), Lab, Quiz)
   - Dark theme: `bg-slate-950`, `text-slate-100`, accent `cyan-400`, mono `JetBrains Mono`

3. **Content Loader**
   - Frontend can load `content/modules/*/module.json` via API or direct fetch
   - Markdown lesson renderer

4. **Progress Tracking v0**
   - Zustand store + localStorage: `{ completedLessons: [], completedLabs: [], quizScores: {} }`
   - API endpoint `/api/progress` ready but not required for MVP

5. **Success Criteria**
   - `npm run dev` → dashboard visible
   - Can click Module 02 → see theory markdown
   - Progress persists on refresh
   - No paid deps, no env secrets

**Out of MVP:** PCAP parser, Docker labs, challenge engine, reporting editor, real quiz validation

---

## F. First Complete Module — Module 02 Wi-Fi Fundamentals (Reference Implementation)

This module sets the pattern for all others.

**Module metadata:**
- ID: `02-wifi-fundamentals`
- Phase: 1 Foundations
- Type: `simulated` (no hardware)
- Skills: `ssid`, `bssid`, `ap`, `client`, `wlan`, `channels`, `bands`, `2.4/5/6GHz`

**Lesson Breakdown:**

1. **Lesson 01 — SSID vs BSSID vs ESSID**
   - Theory: SSID human name, BSSID MAC of radio, ESSID vs ESS
   - Interactive: Diagram (AP with multiple BSSIDs, one ESSID) — SVG with hover
   - Knowledge check: "BSSID identifies?" (Correct: Specific AP/radio)

2. **Lesson 02 — AP, Client, STA, Distribution System**
   - Theory: Infrastructure vs Ad-hoc, roles
   - Interactive: Association flow diagram

3. **Lesson 03 — Channels, Bands, Bandwidth**
   - Theory: 2.4 GHz (1-14, overlap), 5 GHz (UNII), 6 GHz (Wi-Fi 6E), 20/40/80 MHz, regulatory
   - Interactive: Channel overlap visualizer (canvas)
   - Config analysis: Show `hostapd.conf` channel=6, ask to identify overlap risk

4. **Lesson 04 — WLAN Architecture Recap**
   - Summary + mind map

**Labs (Simulated):**

- **Lab 01 — Beacon Analysis (PCAP)**
  - Artifact: `beacon-only.pcapng` (self-generated via scapy or hostapd)
  - Tasks: Extract SSID, BSSID, channel, security (Open), interval, supported rates
  - Validator: Frontend checks answers, backend can cross-check via tshark JSON

- **Lab 02 — Config Audit**
  - Artifact:
    ```
    SSID: LAB-WIFI
    Security: WPA2-PSK
    WPS: ENABLED
    PMF: DISABLED
    Channel: 6 (2.4 GHz, 40MHz)
    Hidden: false
    ```
  - Task: List 3 weaknesses (WPS enabled, PMF disabled, 40MHz in 2.4)
  - Attack→Defense→Retest: Explain why WPS risky, apply mitigation (disable WPS, enable PMF optional→required), retest config

**Quizzes:**
- 5 questions, mix MCQ + short answer, with explanations for wrong answers

**Reporting Exercise:**
- Template: Finding "Insecure Wi-Fi Configuration: WPS Enabled"
- Fields: Title, Severity (Medium), Description, Evidence (config snippet + pcap frame no), Impact, Recommendation, Retest

**Definition of Done for Module 02:**
- All lessons markdown + rendered
- 2 interactive diagrams working
- 2 labs with validation
- Quiz with scoring
- Progress marks module complete at 80% lessons + 1 lab + quiz pass
- Skill `wifi-fundamentals` unlocked in skill tree

This becomes the copy-paste template for Module 03-20.

---

## G. Simulated vs Hardware — Technically Honest Split

| Topic | Simulated (Zero-Cost) ✅ | Hardware Required ⚠️ | Why |
|---|---|---|---|
| 802.11 frame types, beacon/probe/auth/assoc | ✅ PCAP analysis, Wireshark filters | ❌ | Frames are static artifacts |
| SSID/BSSID/channel enumeration | ✅ via PCAP + config | Real live scan needs monitor mode | Live scanning needs radio |
| WPA2 4-way handshake analysis | ✅ Provided handshake pcap, analyze ANonce/SNonce, MIC | Real capture needs monitor + deauth | Deauth & capture need RF |
| Offline password audit | ✅ Use self-generated handshake + wordlist, hashcat/audit in Kali | ❌ | Can be done offline |
| WPS concepts, config review | ✅ Config audit, rate-limit discussion | PIN brute force needs real AP | Real WPS attack needs RF |
| WPA3 SAE, transition mode | ✅ Config + pcap analysis | Real SAE handshake capture needs Wi-Fi 6 hardware | Hardware + driver support |
| Deauth/disassoc behavior | ✅ Explain protocol, PMF mitigation, detection via pcap | Actual injection needs injection-capable card | Injection is hardware/driver |
| Rogue AP / Evil Twin | ✅ Concept, client behavior, detection via config + logs | Real Evil Twin needs 2 radios + hostapd | Must transmit beacons |
| Captive portal | ✅ Simulate portal flow via Docker (web server) | Real portal over Wi-Fi needs AP | Docker can simulate L3 |
| WPA2-Enterprise, 802.1X, EAP, RADIUS | ✅ Docker freeradius + logs + pcap, cert validation | Real EAP requires supplicant + AP | Docker can simulate AAA |
| RF: signal, interference, proximity | ❌ | ✅ Requires radio + spectrum | Cannot simulate physics |

**UI Enforcement:**
- Every lab card shows badge: `SIMULATED` (green) or `RF_REQUIRED` (amber)
- Hardware labs disabled with tooltip: "Requires ALFA AWUS036ACHM + Kali bare-metal"
- Docs page `SIMULATION_VS_HARDWARE.md` linked everywhere

---

## H. Development Roadmap — Phased Milestones

### Phase A — Product Skeleton (Week 1) — MVP
**Goal:** Shell runs locally
- Tasks:
  - Scaffold frontend (Vite+React+TS+Tailwind+Router+Zustand)
  - Scaffold backend (FastAPI + /health + /modules list)
  - Create `content/modules/` structure + seed Module 02 markdown
  - Build Shell layout, Dashboard, Learning Path, Module List/Detail pages
  - localStorage progress
- Deliverable: `http://localhost:3000` shows dashboard, path, modules
- Exit criteria: `npm run dev` + `uvicorn` works, README with setup steps

### Phase B — First Complete Module (Week 1-2)
**Goal:** Module 02 end-to-end as reference
- Tasks:
  - Implement Markdown renderer + lesson navigation
  - Build QuizCard with validation + explanations
  - Build ConfigViewer + PcapInspector (static table first)
  - Implement 2 labs for Module 02 (YAML + validators)
  - Skill tree v0 (unlock on completion)
- Deliverable: Can complete Module 02 fully, progress updates
- Exit criteria: Module 02 DoD met (see section F)

### Phase C — First Real Lab Engine (Week 2-3)
**Goal:** PCAP-based recon
- Tasks:
  - Backend `pcap_parser` service using tshark JSON
  - Frontend PcapInspector with filters (like `wlan.fc.type_subtype==8`)
  - Build Modules 05 (Wireless Recon) + 06 (Traffic Analysis) using PCAPs
  - Generate self-made PCAPs via Scapy: beacons, probes, handshakes
  - Add Wireshark filter reference page
- Deliverable: Real Wireshark-style filtering + artifact labs
- Exit criteria: User can answer "Find BSSID of SSID X" by filtering pcap in UI

### Phase D — Security Modules (Week 3-5)
**Goal:** WPA/WPA2/WPA3/WPS
- Tasks:
  - Modules 07-11: WEP, WPA/WPA2 theory, WPA2 practical, WPS, WPA3
  - Lab: handshake identification, PMKID, offline audit (provide .hc22000 + wordlist)
  - Config analysis labs for WPA3 transition weakness
  - Attack→Defense→Retest component
- Deliverable: 5 modules complete
- Exit criteria: Can demonstrate WPA2 handshake analysis without hardware

### Phase E — Challenge Engine & Reporting (Week 5-6)
**Goal:** Guided → Assessment progression
- Tasks:
  - Challenge types: Knowledge Check, PCAP Analysis, Config Audit, Terminal Paste, Investigation
  - Reporting editor: structured form → markdown export
  - Build Modules 12-14: Deauth/PMF, Rogue AP, Captive Portal (simulated)
  - Quick Reference section
- Deliverable: Challenge system + reporting practice
- Exit criteria: Can write a finding with evidence and export MD

### Phase F — Docker Labs (Week 6-7)
**Goal:** Enterprise Wi-Fi simulation
- Tasks:
  - `docker-compose.yml` with hostapd + dnsmasq + freeradius + web portal
  - Generate RADIUS logs, EAP pcaps
  - Modules 15-18: Enterprise, EAP, RADIUS, Corporate attacks
  - Terminal challenges that interact with Docker logs
- Deliverable: `docker compose up` → enterprise artifacts available
- Exit criteria: Can analyze RADIUS log + EAP failure without physical AP

### Phase G — Professional Assessment & Polish (Week 7-8)
**Goal:** Final assessment + UX polish
- Tasks:
  - Module 19: Methodology page with interactive flow
  - Module 20: Final assessment — provide scope, pcaps, configs, radius logs, ask to produce report (no hints)
  - Dashboard final: skills, activity heatmap, recommended next
  - Settings: export progress, reset, hardware toggle
  - Performance, accessibility, mobile responsive
- Deliverable: Complete learning path 01-20
- Exit criteria: New user can go 01→20 entirely offline

### Phase H — Hardware Extension (Future, Optional)
**Goal:** Real RF when hardware available
- Tasks:
  - Docs for compatible adapters (ALFA, etc.)
  - Scripts: `scripts/enable-monitor.sh`, `scripts/capture-handshake.sh`
  - Hardware labs gated behind `HARDWARE_MODE=true`
  - Real Evil Twin lab guide (lab-only, with safety warnings)
- Deliverable: Clear upgrade path, no breaking simulated path

---

## Immediate Next Steps (What I Need From You)

1. **Approve stack**: Vite+React+TS+Tailwind + FastAPI+SQLite + Content-as-Markdown?
2. **Approve repo structure** above?
3. **Confirm Module 02 as reference** or prefer Module 05 (Recon) first?
4. **Should MVP include backend from day 1 or frontend-only with local JSON first?** Recommendation: frontend-only MVP Day 1, add FastAPI Day 2 to keep iteration fast.

Once approved, I will:
- Scaffold `frontend/` and `backend/`
- Create `content/modules/02-wifi-fundamentals/` with 4 lessons + 2 labs + quiz
- Make `http://localhost:3000` runnable with dashboard + learning path

---

## Appendix — Non-Goals for Now

- No Kubernetes, microservices, cloud DB, auth, payments
- No Bluetooth/BLE/Zigbee until Wi-Fi path solid
- No fake terminal that pretends to run `airmon-ng` — either real Kali terminal paste or clearly mocked UI
- No claiming simulation equals RF reality

> Principle: **Simple → Local → Maintainable → Extensible**

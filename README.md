<p align="center">
  <img src="assets/branding/hero-banner.png" alt="SecCraft — Hands-on Cybersecurity Learning Platform" width="800"/>
</p>

<h1 align="center">SecCraft</h1>
<p align="center"><strong>Hands-on Cybersecurity Learning Platform</strong><br/>
Forge. Break. Fix. SecCraft. Retest.<br/>
<sub>Learn cybersecurity by doing.</sub><br/>
<sub>Understand the Protocol. Test the Implementation. — Wireless Pentesting Path</sub></p>

<p align="center">
  <a href="https://amitpal-cyberbuddy.github.io/WiFiForge/"><img src="https://img.shields.io/badge/Live%20Demo-amitpal--cyberbuddy.github.io%2FWiFiForge-22d3ee?style=flat-square" /></a>
  <img src="https://img.shields.io/badge/Stack-Vite%20%2B%20React%20%2B%20FastAPI-22d3ee?style=flat-square" />
  <img src="https://img.shields.io/badge/Cost-%E2%82%B90%20%2F%20%240-34d399?style=flat-square" />
  <img src="https://img.shields.io/badge/Mode-Local--First-0f172a?style=flat-square" />
  <img src="https://img.shields.io/badge/License-MIT-a78bfa?style=flat-square" />
</p>

<p align="center">
  <a href="https://amitpal-cyberbuddy.github.io/WiFiForge/"><strong>▶ Open the academy in your browser →</strong></a><br/>
  <sub>Deployed automatically from <code>main</code> by GitHub Actions — no server, no cost, works offline after the first visit.</sub>
</p>

---

### 🛡️ What is SecCraft? (Legacy WiFiForge)

**SecCraft** is a free, local-first, hands-on **Cybersecurity Learning Platform** — evolving from **WiFiForge — Wireless Pentest Academy** into a broader platform similar in concept to TryHackMe / Hack The Box, but with own identity and methodology: learning through practical security assessment.

> **Wireless Pentesting is Learning Path #1**, not the identity of entire platform.

**Platform hierarchy:**

```
Platform (SecCraft)
│
├── Learning Paths
│   ├── 📡 Wireless Pentesting (available, 20 modules, reference, legacy WiFiForge)
│   ├── 🌐 Web Application Security (planned)
│   ├── 🔌 API Security (planned)
│   ├── 📱 Android Pentesting (planned)
│   ├── 🖥️ Network Pentesting (planned)
│   ├── 🏢 Active Directory (planned)
│   ├── ☁️ Cloud Security (planned)
│   └── 🤖 AI / LLM Security (planned)
│
├── Labs (reusable: PCAP, HTTP, APK, config, logs)
├── Challenges (guided → assessment)
├── Assessments / Engagements
├── Skills (generic + domain-specific)
└── Evidence / Reporting (generic)
```

Core loop (generic VAPT, not just wireless):

```
Learn → Understand → Observe → Enumerate → Test → Validate → Collect Evidence → Understand Impact → Remediate → Retest → Report
```

Detailed loop:

```
Observe → Interpret → Hypothesise → Choose the test → Execute → Evidence → Conclude → Impact → Remediate → Retest → Report
```

Philosophy retained:

```
Forge. Break. Fix. SecCraft. Retest.
```

**Current content (Wireless Path #1, mature):** **20 modules · 27 authored lessons · 15 artefact challenges (guided → semi-guided → assessment) ·
35 decision scenarios · 42-item master checklist · 16 verified PCAPNG artefacts · 1 full engagement pack (`ENG-01`)** — all preserved as `wireless-pentesting` path.

See `docs/PLATFORM_REPOSITIONING.md` for full assessment, branding recommendation, naming options (SecCraft recommended), architecture, migration plan.
See `docs/CONTENT_MODEL.md` for generic content model.
See `docs/LEARNING_PATHS.md` for how to add new path without rewrite.
See `docs/BRANDING_MIGRATION.md` for staged migration.

**Branding note:** WiFiForge name collides with Black Hills InfoSec WifiForge (1.2k stars, 9 labs, mininet-wifi, same niche) — see Section C in repositioning doc. Platform brand must change to domain-neutral (SecCraft recommended), WiFiForge becomes Wireless path sub-brand for continuity.

- Runs at `http://localhost:3000` on Kali Linux
- **Live in the browser:** <https://amitpal-cyberbuddy.github.io/WiFiForge/> (GitHub Pages, auto-deployed from `main`)
- Zero-cost: Vite + React + FastAPI + SQLite + Docker (optional)
- No physical Wi-Fi hardware required for SIMULATION labs; HYBRID/RF_REQUIRED labs say exactly what they cannot prove
- Lab tiers are explicit everywhere: 🟢 SIMULATION · 🟡 HYBRID · 🔴 RF_REQUIRED (see `docs/SIMULATION_VS_HARDWARE.md`)
- Every capture is generated with real cryptographic material and verified by `scripts/verify-lab-artifacts.py` (142 checks)

### 🎨 Brand — Platform vs Path

- **Platform Name (Recommended):** SecCraft (package: `anvil`, legacy `wififorge` retained for backward compat)
- **Full Title:** SecCraft — Hands-on Cybersecurity Learning Platform (Legacy: WiFiForge — Wireless Pentest Academy)
- **Primary Tagline:** Forge. Break. Fix. SecCraft. Retest. (retained as platform philosophy — domain-neutral, VAPT loop)
- **Secondary Tagline:** Learn cybersecurity by doing.
- **Wireless Path Tagline:** Understand the Protocol. Test the Implementation.
- **Palette:** slate-950 `#020617` bg, cyan `#22d3ee` primary, violet `#a78bfa` secondary — retained
- **Fonts:** Sora (headings) + Inter (body) + JetBrains Mono (terminal) — retained
- **Logo:** Platform anvil without Wi-Fi arcs, Wireless path anvil + Wi-Fi arcs (legacy WiFiForge Forge Mark) — see `assets/logo/`
- **Why SecCraft:** Preserves Forge concept (forge on anvil), tagline still works, domain-neutral, memorable, low-moderate conflict (vs BHIS WifiForge 1.2k stars major conflict with WiFiForge name), high scalability — see Section C/D in `docs/PLATFORM_REPOSITIONING.md`

Full brand guide: [`docs/BRANDING.md`](docs/BRANDING.md) — now platform vs path  
Branding decision evolution: [`docs/BRANDING_DECISION.md`](docs/BRANDING_DECISION.md)  
Platform repositioning A-H: [`docs/PLATFORM_REPOSITIONING.md`](docs/PLATFORM_REPOSITIONING.md)  
Naming shortlist with conflict research: Section D in PLATFORM_REPOSITIONING.md — SecCraft recommended, TemperForge, Verifex, AttestForge, etc. Avoid SecForge, CyberForge, LabForge, BreakForge, etc. (all have conflicts)

### 🏗️ Architecture

```
Frontend: Vite + React + TS + Tailwind + Zustand + React Router
Backend:  FastAPI + SQLite + tshark/scapy (optional — the hosted build is static)
Content:  JSON + Markdown (frontend/src/content, content/)
Labs:     SIMULATION (bundled captures + configs) → HYBRID → RF_REQUIRED (documented, not performed)
```

See [`docs/ARCHITECTURE_AND_ROADMAP.md`](docs/ARCHITECTURE_AND_ROADMAP.md) for full stack, repo structure, and 8-phase roadmap.

### 🗺️ Roadmap

Shipped today (see [`docs/REVIEW_AND_DECISIONS.md`](docs/REVIEW_AND_DECISIONS.md) for the audit trail):

- **Foundations → Enterprise, one path:** 20 modules / 27 authored lessons across 6 phases, with a tier badge on
  every lab (SIMULATION · HYBRID · RF_REQUIRED).
- **Offline lab data:** 16 802.11 captures with configs, decoded datasets and a manifest whose SHA-256 values are
  re-verified by `scripts/verify-lab-artifacts.py` (142 checks) before every deploy.
- **Assessment practice:** 15 challenges (45 tasks with answers derived from the captures), 35 decision scenarios,
  ENG-01 engagement pack + instructor answer key, 42-item VAPT checklist, CVSS 3.1 calculator, evidence vault,
  report editor, PDF export of your own records.
- **Still open:** ENG-02 (a second engagement profile), depth parity for modules 07/10, and an accessibility pass —
  tracked in the roadmap rather than claimed as done.

### 📂 Repo Structure

```
WiFiForge/
├── frontend/          # Vite + React
├── backend/           # FastAPI
├── content/           # modules, pcaps, configs, reference
├── docker/            # hostapd, freeradius, supplicant
├── assets/            # logo, branding, theme.ts
├── docs/              # architecture, branding, methodology
├── scripts/
└── reporting/templates/
```

### 🔐 Security

Local-first is the security model: no account, no third-party requests (no CDN, no external fonts, no analytics),
CSP in the shipped HTML plus `dist/_headers`/`nginx.conf`, and a build that fails if any of that regresses
(`scripts/verify-no-dummy-data.py`). The optional API narrows CORS to an explicit allowlist, needs
`PLATFORM_JWT_SECRET` (legacy `WIFIFORGE_JWT_SECRET`) before it will issue tokens, and returns explicit errors instead of placeholder data.
Platform supports dual env vars: `PLATFORM_*` preferred, `WIFIFORGE_*` fallback — see `backend/app/core/config.py` and `docs/BRANDING_MIGRATION.md` Stage 5.
See [`SECURITY.md`](SECURITY.md) for the guarantees, the non-claims and the reporting route.

### 🚀 Quick Start

```bash
# frontend
cd frontend
npm install
npm run dev # http://localhost:3000/WiFiForge/

# backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 🌐 Web deployment (GitHub Pages)

The SPA is published to <https://amitpal-cyberbuddy.github.io/WiFiForge/> by
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) on every push to `main`.

```bash
# build + serve exactly how Pages will (sub-path, 404.html fallback)
cd frontend
npm run build
npm run preview:pages   # http://localhost:4173/WiFiForge/
```

Notes, custom domains and troubleshooting: [`docs/GITHUB_PAGES.md`](docs/GITHUB_PAGES.md).
First-time setup (one click): **[Settings → Pages → Source: _GitHub Actions_](https://github.com/AmitPal-CyberBuddy/WiFiForge/settings/pages)**,
then re-run the *Deploy Frontend to GitHub Pages* workflow.
The FastAPI backend stays local — Pages serves the bundled lessons, labs and mock data;
live PCAP parsing still needs the local stack.

### 🛡️ Safety

All labs are designed for:
- Local lab environments
- Self-generated captures/configs
- Explicitly authorized targets only

No guidance for attacking public Wi-Fi. Hardware labs include safety warnings.

### 📜 License

MIT — Free for personal learning.

---

<p align="center">
  <sub>Built for learning. Designed for professional VAPT mindset.</sub><br/>
  <sub>Forge. Break. Fix. SecCraft. Retest.</sub>
</p>

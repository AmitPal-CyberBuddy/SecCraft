<p align="center">
  <img src="assets/branding/hero-banner.png" alt="WiFiForge — Wireless Pentest Academy" width="800"/>
</p>

<h1 align="center">WiFiForge</h1>
<p align="center"><strong>Wireless Pentest Academy</strong><br/>
Forge. Break. Fix. Retest.<br/>
<sub>Understand the Protocol. Test the Implementation.</sub></p>

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

### 📡 What is WiFiForge?

**WiFiForge** is a free, local-first, interactive **Wi-Fi Penetration Testing Academy & Lab** — a personal HTB Academy-style platform focused on teaching you to *think like a professional wireless pentester*, not just run commands.

Core loop:

```
Observe → Interpret → Hypothesise → Choose the test → Execute → Evidence → Conclude → Impact → Remediate → Retest → Report
```

Current content: **20 modules · 27 authored lessons · 15 artefact challenges (guided → semi-guided → assessment) ·
35 decision scenarios · 42-item master checklist · 16 verified PCAPNG artefacts · 1 full engagement pack (`ENG-01`)**.

- Runs at `http://localhost:3000` on Kali Linux
- **Live in the browser:** <https://amitpal-cyberbuddy.github.io/WiFiForge/> (GitHub Pages, auto-deployed from `main`)
- Zero-cost: Vite + React + FastAPI + SQLite + Docker (optional)
- No physical Wi-Fi hardware required for SIMULATION labs; HYBRID/RF_REQUIRED labs say exactly what they cannot prove
- Lab tiers are explicit everywhere: 🟢 SIMULATION · 🟡 HYBRID · 🔴 RF_REQUIRED (see `docs/SIMULATION_VS_HARDWARE.md`)
- Every capture is generated with real cryptographic material and verified by `scripts/verify-lab-artifacts.py` (142 checks)

### 🎨 Brand

- **Name:** WiFiForge (package: `wififorge`)
- **Full Title:** WiFiForge — Wireless Pentest Academy
- **Tagline:** Forge. Break. Fix. Retest.
- **Palette:** slate-950 `#020617` bg, cyan `#22d3ee` primary, violet `#a78bfa` secondary
- **Fonts:** Sora (headings) + Inter (body) + JetBrains Mono (terminal)
- **Logo:** Anvil + Wi-Fi arcs — Forge Mark (see `assets/logo/`)

Full brand guide: [`docs/BRANDING.md`](docs/BRANDING.md)  
Locked decision: [`docs/BRANDING_DECISION.md`](docs/BRANDING_DECISION.md)

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
`WIFIFORGE_JWT_SECRET` before it will issue tokens, and returns explicit errors instead of placeholder data.
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
  <sub>Forge. Break. Fix. Retest.</sub>
</p>

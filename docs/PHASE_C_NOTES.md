> **Historical note (superseded).** This file records what an earlier phase did, including the
> former `mock_frames` fallback and the endpoints that returned placeholder data. Those paths were
> removed: decoding now uses tshark → scapy → the verified offline datasets in
> `frontend/public/lab-data/`, and the API returns explicit errors instead of invented values. See
> `docs/REVIEW_AND_DECISIONS.md` §6 and `SECURITY.md`.

# Phase C — First Real Lab Engine (Recon + Traffic Analysis)

**Goal:** PCAP-based recon with real parsing, Wireshark-style filtering

## Completed

### Backend
- **PCAP Parser Service** (`backend/app/services/pcap_parser.py`):
  - Tries `tshark` first (if available on Kali), falls back to Scapy, then mock
  - Supports display filters: `wlan.fc.type_subtype==8` (beacons), `==4` (probe req), `==5` (probe resp), `eapol`
  - Returns frames + summary (SSIDs, BSSIDs, clients, channels, beacons/probes/EAPOL counts)
  - Tested with real Scapy-generated PCAPs

- **PCAP Router** (`backend/app/routers/pcaps.py`):
  - `GET /api/pcaps` — lists available PCAPs from `content/pcaps/` and `frontend/public/pcaps/`, returns parser info (tshark/scapy/mock)
  - `GET /api/pcaps/{id}/analyze?filter=` — full analysis with filter
  - `GET /api/pcaps/{id}/frames?filter=&limit=&offset=` — paginated frames
  - Finds PCAPs via recursive search

- **PCAP Generation** (`scripts/generate_pcap.py`):
  - Uses Scapy Dot11 to generate synthetic 802.11 frames (no RF)
  - `beacon-only.pcapng` (5 frames): 3 beacons + probe req/resp
  - `recon-lab.pcapng` (13 frames): 5 APs (LAB-WIFI ESS with 2 BSSIDs, hidden SSID, Corp-WLAN, Guest-WLAN), 4 probe reqs with PNL leak, hidden reveal via probe resp, auth/assoc
  - `traffic-analysis.pcapng` (12 frames): Full flow Beacon→Probe→Auth→Assoc→EAPOL (4-way handshake placeholder)
  - Generates to both `content/pcaps/` and `frontend/public/pcaps/` for API + static serving

### Frontend
- **PcapInspector Component** (`frontend/src/components/lab/PcapInspector.tsx`):
  - Summary bar: SSIDs, BSSIDs, clients, channels, beacons/probes/EAPOL counts, parser method badge (SCAPY/TSHARK/MOCK)
  - Filter bar: Input + Apply + presets (All, Beacons, Probe Req, Probe Resp, EAPOL, Auth)
  - Frames table: No, Type (badge color), SSID, BSSID/SA, Channel, Summary
  - Frame detail: Click row → shows SSID, BSSID, SA, Channel, summary
  - Fetches from `/api/pcaps/{id}/analyze?filter=`, fallback to mock if API fails
  - Real Wireshark-like UX

- **Modules 05 & 06 Content**:
  - `05-wireless-recon`: 3 lessons (AP enumeration, Client enumeration & PNL, Hidden SSID & Vendor)
  - `06-traffic-analysis`: 2 lessons (Wireshark filters, Association flow)
  - `lessonMap` and `labMap` updated in `ModuleDetail.tsx` to support 05/06
  - Labs: `lab-05-recon` uses `recon-lab.pcapng` with tasks (AP count, hidden SSID reveal, clients PNL, ESS mapping), `lab-06-traffic` uses `traffic-analysis.pcapng` (beacons count, flow mapping, EAPOL count, BSSID/client/channel)
  - Quizzes: 5 Qs each for 05 and 06 (hidden SSID len 0, PNL, OUI, ESS, Wireshark filters)

- **Labs Page** (`frontend/src/pages/Labs.tsx`):
  - Fetches real PCAPs from `/api/pcaps`, shows parser method, size
  - Lists 6 labs with PCAP linkage, links to module detail
  - Updated copy to mention Phase C PcapInspector

- **ModuleDetail**:
  - Dynamic lab rendering with PcapInspector per lab
  - Generic validation for 05/06 labs (checks if tasks filled, marks complete)
  - Overview, Theory, Lab, Quiz, Report tabs work for 02,05,06

### Verification
- `curl /api/pcaps` → 3 PCAPs, method scapy
- `curl /api/pcaps/beacon-only/analyze` → 5 frames, 3 beacons, 2 probes, SSID LAB-WIFI
- `curl /api/pcaps/beacon-only/analyze?filter=wlan.fc.type_subtype==8` → 3 frames filtered
- Frontend build succeeds, HMR updates ModuleDetail and Labs
- Dev servers running: Backend 8000, Frontend 3000 with allowedHosts true

## Next (Phase D)
- Modules 07-11: WEP, WPA/WPA2, WPA2 practical, WPS, WPA3
- Handshake analysis lab: Identify EAPOL M1-M4, PMKID
- Offline audit lab: Provide .hc22000 + wordlist (self-generated)
- Config analysis for WPA3 transition mode weakness
- Attack→Defense→Retest component

## How to Run
```bash
# Generate PCAPs
python3 scripts/generate_pcap.py --all

# Backend
bash scripts/run-backend.sh # http://localhost:8000/docs

# Frontend
cd frontend && npm run dev # http://localhost:3000
```

## Files Added/Modified
- `backend/app/services/pcap_parser.py` (new)
- `backend/app/routers/pcaps.py` (rewritten)
- `scripts/generate_pcap.py` (new, Scapy)
- `content/pcaps/*/*.pcapng` (real PCAPs)
- `frontend/public/pcaps/*/*.pcapng` (real PCAPs)
- `frontend/src/components/lab/PcapInspector.tsx` (new, 400+ lines)
- `frontend/src/content/lessons/05-wireless-recon/*.md` (3 lessons)
- `frontend/src/content/lessons/06-traffic-analysis/*.md` (2 lessons)
- `frontend/src/pages/ModuleDetail.tsx` (major update, supports 05/06 + PcapInspector)
- `frontend/src/pages/Labs.tsx` (fetches real PCAPs)
- `docs/PHASE_C_NOTES.md` (this file)

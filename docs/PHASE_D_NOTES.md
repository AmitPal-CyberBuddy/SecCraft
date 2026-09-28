# Phase D — Wi-Fi Security Modules (WEP, WPA/WPA2, WPS, WPA3)

**Goal:** Complete Phase 3 security modules with real handshake/PMKID/WPS/WPA3 labs

## Completed

### PCAPs Generated (Scapy)
- **wpa2-handshake.pcapng (11 frames):** Beacon LAB-WPA2 WPA2-PSK Ch6 + Probe + Auth seq1/2 + Assoc Req/Resp + EAPOL M1-M4 (ANonce, SNonce, MIC, GTK)
- **pmkid.pcapng (2 frames):** Beacon LAB-PMKID + EAPOL M1 with PMKID KDE (fake PMKID aabbccddeeff00112233445566778899) — clientless attack
- **wps-beacon.pcapng (2 frames):** Beacon LAB-WPS Ch6 WPA2-PSK + WPS IE (221 OUI 00:50:F2:04) + Probe Response with WPS IE
- **wpa3-transition.pcapng (2 frames):** Beacon LAB-WPA3-TRANS Ch36 AKMs PSK(2)+SAE(8) PMF optional (MFPC=1 MFPR=0) + Probe Req
- **wpa3-only.pcapng (1 frame):** Beacon LAB-WPA3 Ch36 AKM SAE only, PMF required (MFPC=1 MFPR=1) — good config

All generated to `content/pcaps/` and `frontend/public/pcaps/`

### Configs Created
- `hostapd-wpa2-bad.conf` — WPS enabled, PMF disabled, 40MHz, weak PSK
- `hostapd-wpa2-good.conf` — CCMP, PMF required, WPS disabled, 20MHz, strong PSK
- `hostapd-wpa3-transition-bad.conf` — PSK+SAE same weak password, PMF disabled
- `hostapd-wpa3-only-good.conf` — SAE only, PMF required, strong SAE password
- `hostapd-wps-enabled.conf` — WPS enabled, PIN 12345670

Copied to `frontend/public/configs/`

### Lessons Created

**07 WEP Legacy (2 lessons):**
- `01-wep-architecture.md` — WEP IV 24-bit, RC4, ICV CRC32, why broken (IV reuse, FMS weak IVs, no replay), PTW 40k frames, finding template Critical
- `02-wep-attacks.md` — FMS, KoreK, PTW, ChopChop, why no lab (requires real WEP AP), mitigation WPA3/WPA2 CCMP PMF required

**08 WPA/WPA2 (2 lessons):**
- `01-wpa-wpa2-architecture.md` — WPA TKIP vs WPA2 CCMP, PSK vs Enterprise, PMK PBKDF2, PTK PRF ANonce+SNonce+MACs, KCK/KEK/TK/GTK, 4-way handshake M1-M4, RSN IE, PMF 802.11w
- `02-handshake-deep-dive.md` — ANonce/SNonce/MIC/Replay, offline audit needs SSID+BSSID+client+nonces+MIC, hcxpcapngtool + hashcat -m 22000, PMKID formula HMAC-SHA1-128(PMK, PMK Name|BSSID|STA), filter wlan_mgt.rsn.pmkid, evidence, defense strong PSK 20+ chars PMF required WPA3

**09 WPA2 Practical (2 lessons):**
- `01-handshake-analysis.md` — Lab objective with wpa2-handshake.pcapng (11 frames), tasks beacon analysis, handshake ID (4 EAPOL, replay counter), evidence collection, offline audit authorized lab only with wordlist containing WiFiForgeLab123!, hashcat and aircrack-ng, PMKID lab, VAPT methodology, safety
- `02-offline-audit.md` — Wordlists, hashcat conversion, aircrack, evidence, defense strong PSK PMF WPA3, retest

**10 WPS (2 lessons):**
- `01-wps-architecture.md` — WPS PIN 8-digit checksum halves flaw 10^4+10^3=11k max, PBC, exchange M1-M8 NACK after M4/M6 reveals half correct, rate limiting lockout, WPS IE 221 OUI 00:50:F2:04 filter wps, wash, reaver/bully (lab-only), enumeration, config audit, finding template High/Medium, recommendation disable
- `02-wps-enumeration.md` — wash enumeration, rate limiting bypass, lab tasks, defense disable

**11 WPA3 (2 lessons):**
- `01-wpa3-architecture.md` — WPA3-Personal SAE Dragonfly commit/confirm, forward secrecy, PMF required, differences vs WPA2, WPA3-Enterprise 192-bit, transition mode PSK+SAE same password PMF optional downgrade risks (force WPA2 + deauth, same password), group downgrade, filters akms.type, capabilities mfpc/mfpr, PCAPs transition and only, good/bad configs, finding template transition weakness Medium
- `02-transition-downgrade.md` — Transition mode details, downgrade attack, defense WPA3-only PMF required, lab tasks

### Frontend Components

**ConfigViewer (`frontend/src/components/lab/ConfigViewer.tsx`):**
- Title, config pre, issues list with severity colors (critical red, high amber, medium amber, low cyan)
- Shows original vs fixed config toggle
- Fixed config auto-generates by replacing weak lines
- Issues: line, severity, message, recommendation
- Used for hostapd.conf audits

**AttackDefenseRetest (`frontend/src/components/lab/AttackDefenseRetest.tsx`):**
- 3 columns: Attack (red, Swords icon, evidence, impact), Defense (emerald, Shield, config), Retest (cyan, RotateCcw, verification)
- VAPT loop footer
- Used for WEP, WPS, WPA3, WPA2 labs

**ModuleDetail.tsx Major Update:**
- Imports ConfigViewer + AttackDefenseRetest
- lessonMap expanded to 07-11 (2 lessons each)
- labMap expanded to 07-11 (7 new labs)
- quizData expanded to 07-11 (5 Qs each, 25 new Qs)
- Lab rendering:
  - PcapInspector for pcap labs
  - ConfigViewer for config labs (02-config, 07-wep, 10-wps, 11-transition, 11-wpa3-only)
  - Tasks per module: 02 beacon, 05 recon (AP count, hidden, clients PNL, ESS), 06 traffic (beacons, flow, EAPOL, BSSID), 07 WEP (why critical, PTW), 08 RSN (group cipher, PMK derivation), 09 handshake (EAPOL count, nonces, audit needs) + PMKID (hex, advantage), 10 WPS (IE present OUI, PIN max), 11 WPA3 (AKMs PMF transition, downgrade defense)
  - VAPT context per module
  - tshark commands per lab
  - AttackDefenseRetest for 07,09,10,11

**Build:** 2394 modules, new lesson chunks, success

### Backend
- pcap_parser already handles new PCAPs (tested)
- /api/pcaps now returns 8 PCAPs (beacon-only, recon-lab, traffic-analysis, wpa2-handshake, pmkid, wps-beacon, wpa3-transition, wpa3-only)
- /api/pcaps/wpa2-handshake/analyze returns 11 frames, beacon + probe + auth + assoc + 4 EAPOL
- Filter wlan.fc.type_subtype==8 returns 3 beacons correctly
- Method scapy (tshark not available in sandbox, but works on Kali)

### Verification
- Frontend dev server HMR updated ModuleDetail and Labs
- Backend API serves new PCAPs
- Frontend build succeeds
- Labs page fetches 8 PCAPs, shows parser method scapy

## Next (Phase E)
- Challenge engine: Guided/Semi-guided/Assessment with scoring
- Reporting editor: structured form → markdown export, evidence upload
- Modules 12-14: Deauth/PMF, Rogue AP/Evil Twin, Captive Portals (simulated + hardware distinction)
- Quick Reference expansion
- Terminal challenges

## How to Run
```bash
python3 scripts/generate_pcap.py --all
python3 scripts/generate_phase_d_pcaps.py
bash scripts/run-backend.sh
cd frontend && npm run dev
```

## Files
- `scripts/generate_phase_d_pcaps.py` (new)
- `content/pcaps/wpa2/*.pcapng`, `wps/*.pcapng`, `wpa3/*.pcapng`
- `frontend/public/pcaps/wpa2/*`, `wps/*`, `wpa3/*`
- `content/configs/*.conf`, `frontend/public/configs/*.conf`
- `frontend/src/content/lessons/07-wep-legacy/*.md` (2)
- `frontend/src/content/lessons/08-wpa-wpa2/*.md` (2)
- `frontend/src/content/lessons/09-wpa2-practical/*.md` (2)
- `frontend/src/content/lessons/10-wps/*.md` (2)
- `frontend/src/content/lessons/11-wpa3/*.md` (2)
- `frontend/src/components/lab/ConfigViewer.tsx` (new)
- `frontend/src/components/lab/AttackDefenseRetest.tsx` (new)
- `frontend/src/pages/ModuleDetail.tsx` (major update, ConfigViewer + AttackDefenseRetest + 07-11)
- `docs/PHASE_D_NOTES.md` (this file)

# WiFiForge — Phased Professional Rebuild Roadmap

**Status:** UI/UX Premium Overhaul ✅ Done (5bc451a)
**Next:** Content Depth — Professional VAPT Academy

## Current Audit (Sep 28, 2026)

- **20 modules** defined in `modules.json`
- **Missing lessons:** 01-intro-wireless (0), 03-80211-architecture (0), 04-kali-wireless-setup (0) → Phase 1 broken
- **Thin lessons:** 02,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20 have 2-4 files each, avg ~80 lines, total 3115 lines → brief notes, not academy depth
- **PCAPs:** 16 real Scapy-generated ✅
- **Configs:** 5 hostapd configs ✅
- **Challenges:** 15 (4 guided, 9 semi-guided, 2 assessment) — objectives exist but tasks thin
- **Reference:** Empty folder, needs commands/filters/terminology
- **Visual components:** None — needs frame viewer, handshake diagram, channel map

**Goal:** Professional VAPT depth — methodology, evidence chain, impact, remediation with config snippets, retest, reporting. Like HTB Academy but Wi-Fi focused.

---

## Phase Plan

### Phase 1 — Foundations (01-04) — PRIORITY 1 — START NOW
**Why first:** Learning path broken, everything builds on this.

**Module 01 — Intro to Wireless Security (MISSING)**
- Lessons: 4
  - 01-what-is-wireless: RF, EM spectrum, wireless vs wired, why wireless is different attack surface
  - 02-wireless-vs-wifi: Bluetooth, Zigbee, Wi-Fi, 802.11 family, Wi-Fi generations (a/b/g/n/ac/ax/be)
  - 03-attack-surface: Confidentiality/Integrity/Availability for wireless, eavesdropping, MitM, DoS, rogue, client attacks, enterprise risks
  - 04-methodology-ethics: VAPT methodology Learn→Report, legal boundaries, ROE, scope, authorized labs only, FCC/regulatory, ethics
- Lab: Scope & ROE analysis + evidence collection exercise
- Quiz: 5 Qs ethics, methodology, attack surface
- Report: Finding template for weak open network

**Module 02 — Wi-Fi Fundamentals (EXISTS BRIEF → EXPAND)**
- Existing 4 lessons 248 lines → expand to 4 professional lessons 400+ lines each
  - 01-ssid-bssid: Deep SSID (32 bytes, charset, hidden SSID not security, ESSID, case sensitivity, beacon IE), BSSID (MAC, OUI vendor, per-radio, locally administered), ESS/BSS, MBSSID
  - 02-ap-client: AP roles, lightweight vs autonomous, controller, client STA, supplicant, association state machine, power save, roaming 802.11r/k/v
  - 03-channels-bands: 2.4 GHz (1-14, 1/6/11 non-overlapping, 40MHz bad), 5 GHz UNII-1/2/2e/3, 6 GHz U-NII-5-8, channel width 20/40/80/160, DFS, interference, regulatory
  - 04-wlan-architecture: Infrastructure vs Ad-hoc vs Mesh, Distribution System, ESS, BSS, DS, Portal, 802.11 architecture diagram, CAPWAP, controller-based
- Lab: beacon-only.pcapng analysis (existing) + config audit
- Quiz: 5 Qs BSSID, channels, ESS, beacons, PNL

**Module 03 — 802.11 Architecture (MISSING)**
- Lessons: 4
  - 01-ieee-80211-standard: IEEE 802.11-2020, amendments (a/b/g/n/ac/ax/be), PHY/MAC, data rates, modulation (DSSS, OFDM, MIMO, OFDMA)
  - 02-frames-management-control-data: Frame format, Frame Control (type/subtype), Management (beacon, probe, auth, assoc, deauth, disassoc), Control (RTS/CTS/ACK), Data (QoS, EAPOL)
  - 03-beacon-probe-auth-assoc: Full flow Beacon→Probe Req/Resp→Auth→Assoc Req/Resp→EAPOL→Data, state machine, reason codes, status codes, IE (SSID, RSN, HT, VHT, HE, WPS)
  - 04-channels-bands-phy: PHY layers, 2.4/5/6 GHz specifics, HT/VHT/HE capabilities, MCS, spatial streams, channel bonding, regulatory domains
- Lab: traffic-analysis.pcapng full flow
- Quiz: 5 Qs frame types, filters, flow order

**Module 04 — Kali Wireless Setup (MISSING)**
- Lessons: 4
  - 01-interfaces-iw-ip: `iw dev`, `ip link`, `iwconfig` vs `iw`, interface naming, `phy#0`, wireless extensions, driver check
  - 02-managed-vs-monitor: Managed, Monitor, AP, Mesh, IBSS modes, monitor mode entry (`iw dev wlan0 set type monitor`), injection test (`aireplay-ng --test`), why monitor needs hardware
  - 03-tools-ecosystem: Kismet, airodump-ng, aircrack-ng, Wireshark, tshark, hcxdumptool, hcxtools, wash, hostapd, wpa_supplicant, Scapy, PcapInspector
  - 04-troubleshooting-lab: Common issues (driver, NetworkManager, rfkill, regdom, USB, VM passthrough), Docker lab, simulated vs hardware decision matrix
- Lab: Simulated interface audit + Docker Kismet
- Quiz: 5 Qs iw, monitor, injection, tools

**Deliverable Phase 1:** 4 modules × 4 lessons = 16 professional lessons (400-600 lines each), 4 labs expanded, 4 quizzes, reporting exercises, Attack→Defense→Retest per module, progress tracking.

---

### Phase 2 — Reconnaissance (05-06) — EXPAND EXISTING
**Current:** 3 + 2 lessons brief
**Target:** 3 + 3 lessons professional + visual recon map component

- Module 05: AP enumeration, client enumeration, hidden SSID reveal (probe resp, assoc req), vendor OUI, PNL leakage, ESS mapping, signal strength, Kismet vs airodump
- Module 06: Wireshark deep dive, display filters, BSSID filters, EAPOL filters, association flow evidence, frame numbers, hash calculation, chain of custody
- New component: Interactive Recon Map — visualize SSIDs/BSSIDs/channels from PCAP, filterable
- Lab: recon-lab.pcapng (5 APs + hidden + clients) expanded tasks

---

### Phase 3 — Wi-Fi Security (07-11) — EXPAND + HARDENING FOCUS
**Current:** 2 lessons each brief
**Target:** 3 lessons each professional

- 07 WEP: RC4, IV 24-bit, FMS/KoreK/PTW, ICV CRC32, why Critical, migration path
- 08 WPA/WPA2: CCMP, TKIP (legacy), RSN IE, PMK via PBKDF2 4096, PTK via PRF, KCK/KEK/TK, GTK, M1-M4 deep dive, PMF 802.11w
- 09 WPA2 Practical: Handshake ID, completeness check, ANonce/SNonce/MIC, PMKID formula HMAC-SHA1-128, hcxpcapngtool, hashcat 22000, wordlists, authorized audit only
- 10 WPS: 8-digit PIN, checksum, halves flaw 11k, WPS IE OUI 00:50:F2:04, wash, reaver, bully, lockout, rate limiting, defense wps_state=0
- 11 WPA3: SAE Dragonfly, forward secrecy, PMF required, transition mode PSK+SAE downgrade risk, WPA3-only good config, OWE
- New component: 4-Way Handshake Interactive Diagram + RSN IE Decoder

---

### Phase 4 — Attack Techniques (12-14) — PROFESSIONAL VAPT
**Current:** 2 lessons each
**Target:** 3 lessons each with Attack→Defense→Retest

- 12 Deauth/Disassoc: Subtype 12/10, reason codes 7/8, unauthenticated without PMF, DoS impact, handshake capture facilitation, Evil Twin facilitation, detection (many deauth short interval), defense PMF required, WIDS, SA Query
- 13 Rogue AP/Evil Twin: ESS vs rogue decision tree, authorized list, BSSID/channel/vendor/signal, PSK mode Evil Twin if PSK known, Enterprise rogue RADIUS credential capture, client behavior auto-connect, defense WIDS + 802.1X cert validation + PMF + strong PSK + WPA3
- 14 Captive Portals: Open + portal architecture, DHCP, HTTP redirect, login POST, session management (MAC-based weakness), MAC spoof bypass (open no encryption), client isolation ap_isolate=1, HTTPS portal, OWE, WPA2-PSK guest alternative
- New component: Deauth Flood Visualizer + Rogue Detection Checklist

---

### Phase 5 — Enterprise (15-18) — DEEP ENTERPRISE
**Current:** 2 lessons each
**Target:** 3-4 lessons each professional

- 15 Enterprise Fundamentals: WPA2-EAP vs Personal, 802.1X roles supplicant/authenticator/AS, RADIUS, dynamic VLAN, PMK from MSK, per-user credentials, accounting, benefits
- 16 EAP: PEAP (TLS outer + MSCHAPv2 inner), EAP-TLS mutual cert most secure, EAP-TTLS, EAP-FAST, cert validation ca_cert + subject_match, rogue RADIUS capture challenge/response hashcat 5500, defense EAP-TLS via MDM
- 17 RADIUS: Ports 1812/1813, shared secret 22+ chars, clients.conf restrict AP IPs not 0.0.0.0/0, users file strong passwords + VLAN, eap.conf certs, RadSec TLS, logs monitoring, brute-force, lockout, SIEM
- 18 Corporate Attacks: 3 SSIDs Enterprise/Guest/IoT, VLANs, segmentation bypass ACL misconfig Corp→Guest, isolation bypass ap_isolate=0 ARP spoof, rogue AP, deauth, credential capture chain Recon→Rogue→Deauth→Client no cert→MSCHAPv2→Crack→Network→Segmentation bypass, defense layered WIDS+cert validation+EAP-TLS+strong secret+RadSec+PMF+VLAN ACL deny+isolation+monitoring
- New component: EAP Flow Diagram + RADIUS Config Auditor

---

### Phase 6 — Professional (19-20) — FINAL ASSESSMENT
**Current:** 2 lessons each
**Target:** 4 lessons each + full methodology

- 19 Methodology: Pre-engagement ROE→Scope→Recon passive→Enum per SSID→Vuln Analysis→Exploitation simulated→Post-Exploitation→Reporting executive summary, findings, risk summary, recommendation summary, retest, references, appendices→Retest, evidence chain custody (PCAP hash SHA256, frame numbers, filters, config hash, logs, screenshots, commands reproducible), tools Kismet/airodump/Wireshark/tshark/Scapy/PcapInspector/ConfigViewer/aircrack/hashcat/hcxpcapngtool/wash/hostapd/FreeRADIUS/ReportEditor
- 20 Final Assessment: Scope 6 APs +1 rogue, 5 clients, 1 hidden, WPS 3 SSIDs, weak PSK, PMF disabled, PEAP no cert, RADIUS weak, open no isolation, captive MAC bypass, rogue, segmentation bypass, 8h assessment, flag WIFIFORGE{FINAL_RECON_ASSESSMENT_COMPLETE}
- New component: Final Report Template Generator + Risk Matrix

---

## Implementation Order

**Week 1-2: Phase 1 Foundations**
- Day 1-2: Module 01 (4 lessons) — STARTING NOW
- Day 3-4: Module 03 (4 lessons)
- Day 5-6: Module 04 (4 lessons)
- Day 7: Module 02 expansion (4 lessons professional)

**Week 3: Phase 2 Recon**
- Module 05 + 06 expansion + Recon Map component

**Week 4: Phase 3 Security**
- Module 07-11 expansion + Handshake Diagram + RSN Decoder

**Week 5: Phase 4 Attacks**
- Module 12-14 expansion + Deauth Visualizer + Rogue Checklist

**Week 6: Phase 5 Enterprise**
- Module 15-18 expansion + EAP Diagram + RADIUS Auditor

**Week 7: Phase 6 Professional**
- Module 19-20 expansion + Report Generator

**Ongoing:**
- Reference section (commands, filters, terminology JSON)
- Skill tree visualization
- Terminal simulation component
- PCAP generation improvements

---

## Content Quality Standard (Professional)

Each lesson must have:
- Learning objectives (3-5)
- Theory: What/Why/How, protocol details, packet structures, hex examples, Wireshark screenshots description
- VAPT relevance: How to test, what evidence to collect, what impact
- Common misconfigurations
- Tools & commands with examples
- Wireshark filters
- Evidence collection checklist
- Attack → Defense → Retest snippet
- Reporting snippet
- Interactive check question
- References (802.11 spec, OWASP, NIST)

Each lab must have:
- Artifact (PCAP/config) — real Scapy-generated
- Tasks with specific evidence (frame numbers, BSSID, channel)
- Validation logic
- VAPT context
- tshark commands
- Reporting practice

---

## Success Criteria

- 20 modules × avg 4 lessons = 80 professional lessons (400-600 lines each) = ~40k lines content
- 16 PCAPs already exist, add 4 more for Phase 1 if needed
- 15 challenges expanded to professional tasks
- Reference section with 50+ commands, 20+ filters, 30+ terms
- 5 interactive visual components
- All modules have Attack→Defense→Retest
- Final assessment doable independently with provided artifacts

---

*Forge. Break. Fix. Retest. — Professional Wireless PT Academy*

# Hidden SSID & Vendor Fingerprinting — De-obfuscation & Attack Surface

## Learning Objectives
- Understand hidden SSID mechanism: beacon empty length 0, why not security
- Master 4 reveal methods: probe response, assoc request, probe request (client side), active waiting vs deauth (authorized only if PMF not required)
- Learn OUI vendor identification, IE/capabilities fingerprinting
- Build complete recon report: APs, clients, channels, vendors, ESS vs rogue, hidden
- Understand VAPT evidence chain for hidden SSID: beacon empty frame number, probe response real SSID frame number, hash, filter

## Theory

### Hidden SSID — Why Hiding Is Not Security

**Admin myth:** Hiding SSID adds security — obscurity. **Reality:** SSID is not secret, must be known by client to connect, client probes for it, AP responds with real SSID in probe response, assoc request contains SSID, easily revealed in 2 frames. Hidden adds management overhead, breaks roaming, complicates troubleshooting, does not prevent enumeration, gives false sense of security. Focus on WPA2/3, PMF, strong PSK, cert validation.

**802.11 spec:**
- Beacon SSID IE ID 0, length 0 to 32, if length 0, empty — hidden. Beacon still sent every ~100ms (beacon interval 100 TU = 102.4ms typical), but SSID field empty. Sniffer sees `SSID=""` or `SSID length 0` — hidden flag.
- Client must know SSID to connect — it sends Probe Request with SSID real (directed probe) — SA client MAC, DA broadcast or BSSID, SSID real — e.g., `HIDDEN-LAB` — PNL contains hidden SSID if previously joined.
- AP responds with Probe Response containing real SSID — SA BSSID, DA client MAC, BSSID BSSID, SSID real `HIDDEN-LAB` — reveal.
- Association Request also contains SSID real — SA client DA BSSID SSID real — reveal even without probe response if client already knows and associates.

**Result:** Hidden SSID revealed in 1-2 frames without any active attack, just passive listening if client probes or associates. Even without client, attacker can wait, or if authorized and PMF not required, deauth client to force re-probe/assoc, but deauth is active, requires ROE, may be DoS, avoid unless explicit authorization and lab.

### How Hidden Works — Frame Flow

```
Hidden AP: AA:BB:CC:11:22:33 Ch1 WPA2-PSK SSID HIDDEN-LAB but beacon hidden
Time →
AP: Beacon SA AA:BB:CC:11:22:33 DA FF:FF:FF:FF:FF:FF BSSID AA:BB:CC:11:22:33 SSID "" length 0 Ch1 RSN CCMP PSK WPS? PMF?
   Sniffer: Sees beacon, SSID empty, flags hidden, BSSID AA:BB:CC:11:22:33 Ch1 WPA2-PSK, but SSID unknown
Client: Probe Req SA 12:34:56:78:9A:BC DA FF:FF:FF:FF:FF:FF BSSID FF:FF:FF:FF:FF:FF SSID HIDDEN-LAB (PNL) Ch1 — client knows hidden SSID from previous join, probes for it — leak
AP: Probe Resp SA AA:BB:CC:11:22:33 DA 12:34:56:78:9A:BC BSSID AA:BB:CC:11:22:33 SSID HIDDEN-LAB Ch1 RSN — REVEAL!
Client: Auth Req SA 12:34:56:78:9A:BC DA AA:BB:CC:11:22:33 BSSID AA:BB:CC:11:22:33 algo 0 seq1
AP: Auth Resp SA AA:BB:CC:11:22:33 DA 12:34:56:78:9A:BC seq2 status0
Client: Assoc Req SA 12:34:56:78:9A:BC DA AA:BB:CC:11:22:33 BSSID AA:BB:CC:11:22:33 SSID HIDDEN-LAB RSN CCMP PSK — REVEAL again!
AP: Assoc Resp SA AA:BB:CC:11:22:33 DA 12:34:56:78:9A:BC status0 AID1
...
```

**For PT:** Hidden beacon empty is indicator, but real SSID revealed via probe response or assoc request — evidence chain: beacon empty frame number + probe response real SSID frame number + assoc request real SSID frame number.

### Detection — How to Find Hidden SSIDs

**Filter for hidden beacons:**
```
wlan_mgt.ssid=="" && wlan.fc.type_subtype==8   # Hidden beacons SSID empty length 0
wlan_mgt.ssid==""                               # Any frame with empty SSID
wlan.fc.type_subtype==8 && wlan_mgt.ssid.length==0  # Alternative if length field available
```
Wireshark shows `SSID=""` or `SSID length 0` or `Tag: SSID parameter set: Broadcast`? Actually broadcast SSID wildcard length 0 is probe req broadcast, but beacon length 0 is hidden. Check frame details: `802.11 Management → Tagged parameters → SSID parameter set: Tag Number 0, Tag length 0, SSID: (empty)` — hidden.

**Airodump-ng:**
- `airodump-ng wlan0mon` shows `ESSID` column empty or `<length: 0>` for hidden, but `BSSID` and `CH` and `ENC` still shown — `PWR`, `#Data`, etc. — hidden APs listed with empty ESSID, but if client probes/assoc, ESSID revealed in top client section `STATION` probing `HIDDEN-LAB`.

**Kismet:**
- Web UI shows APs, SSID empty, flag hidden, but if probe response observed, SSID revealed, Kismet shows real SSID.

**PcapInspector:**
- Summary bar: SSIDs count includes hidden? Shows `""` or `HIDDEN-LAB` if revealed via probe response parsing.
- Filter presets: `Beacons` shows beacons with SSID empty, `Probe Resp` shows probe response with real SSID.

### Reveal Methods — 4 Ways (Passive First)

| Method | Frame Type/Subtype | SA/DA/BSSID | SSID Real | When It Happens | Active? | Filter | Evidence |
|--------|-------------------|-------------|-----------|-----------------|---------|--------|----------|
| **1. Probe Response** | Mgmt subtype 5 Probe Response | SA BSSID (AP), DA Client MAC, BSSID BSSID | SSID real in probe response IE | AP responds to client probe request for hidden SSID — client probes hidden, AP responds with real SSID | Passive — wait for client probe | `wlan.fc.type_subtype==5 && wlan.bssid==AA:BB:CC:11:22:33`, check `wlan_mgt.ssid` | Beacon f? empty, Probe Resp f? real SSID HIDDEN-LAB SA BSSID DA client |
| **2. Association Request** | Mgmt subtype 0 Assoc Request | SA Client MAC, DA BSSID, BSSID BSSID | SSID real in assoc req IE | Client associates to hidden AP, assoc req contains real SSID | Passive — wait for client assoc | `wlan.fc.type_subtype==0 && wlan.bssid==AA:BB:CC:11:22:33`, check `wlan_mgt.ssid` | Beacon empty f?, Assoc Req f? real SSID |
| **3. Probe Request (Client Side)** | Mgmt subtype 4 Probe Request | SA Client MAC, DA Broadcast or BSSID, BSSID Broadcast | SSID real in probe req IE (directed) | Client probes for hidden SSID it knows (PNL contains hidden) — even without AP response, probe req reveals hidden SSID | Passive — client leak | `wlan.fc.type_subtype==4 && wlan_mgt.ssid==HIDDEN-LAB`, check SA client | Probe Req f? SA client SSID HIDDEN-LAB — reveals hidden SSID from client side |
| **4. Active Deauth + Wait (Authorized Only)** | Mgmt subtype 12 Deauth + then probe/assoc | SA BSSID or Client (spoofed), DA Client or BSSID, BSSID BSSID, reason code | After deauth, client re-probes/assoc with real SSID | If PMF disabled and explicit ROE, deauth client to force re-probe/assoc, capture reveal | **Active — DoS, requires explicit authorization, lab only, avoid if PMF required** | Deauth `wlan.fc.type_subtype==12`, then probe/assoc reveal | Deauth f? reason 7, then Probe Req/Resp/Assoc Req reveal — document ROE, frame numbers |

**For PT:** Prefer passive methods 1-3 — wait for client activity — no active attack, no DoS, no authorization issue beyond passive recon. Method 4 active deauth is intrusive, may disrupt, requires explicit ROE, lab only, and fails if PMF required (802.11w=2) — PMF protects deauth/disassoc, client ignores spoofed deauth.

**Example recon-lab.pcapng:**
- Hidden AP: BSSID `AA:BB:CC:11:22:33` Ch1 WPA2-PSK SSID `HIDDEN-LAB` hidden — beacon f? SSID empty
- Client `AA:BB:CC:99:88:77` probes `HIDDEN-LAB` — probe req f? SA client SSID HIDDEN-LAB — reveal method 3
- AP `AA:BB:CC:11:22:33` probe resp to client `AA:BB:CC:99:88:77` SSID `HIDDEN-LAB` — probe resp f? SA BSSID DA client SSID real — reveal method 1
- Client `AA:BB:CC:99:88:77` assoc req to AP `AA:BB:CC:11:22:33` SSID `HIDDEN-LAB` — assoc req f? SA client DA BSSID SSID real — reveal method 2

**Wireshark filters for recon-lab.pcapng:**
```
wlan_mgt.ssid=="" && wlan.fc.type_subtype==8                 # Hidden beacons
wlan.fc.type_subtype==5 && wlan_mgt.ssid==HIDDEN-LAB        # Probe resp reveals HIDDEN-LAB
wlan.fc.type_subtype==0 && wlan_mgt.ssid==HIDDEN-LAB        # Assoc req reveals HIDDEN-LAB
wlan.fc.type_subtype==4 && wlan_mgt.ssid==HIDDEN-LAB        # Probe req from client reveals HIDDEN-LAB (client side)
wlan.bssid==AA:BB:CC:11:22:33                                # All frames for hidden AP BSSID
```

**PcapInspector tasks:**
- Filter `Beacons` → find beacon with SSID empty BSSID `AA:BB:CC:11:22:33` Ch1
- Filter `Probe Resp` → find probe resp SA `AA:BB:CC:11:22:33` DA `AA:BB:CC:99:88:77` SSID `HIDDEN-LAB` — revealed!
- Filter `Assoc Req` → find assoc req SA `AA:BB:CC:99:88:77` DA `AA:BB:CC:11:22:33` SSID `HIDDEN-LAB` — revealed again
- Summary: 5 APs, 1 hidden, 2 clients, etc.

### Vendor Fingerprinting — OUI + IE + Capabilities

**Why vendor matters for PT:**
- Enterprise APs Cisco, Aruba, Meraki, Ruckus, Juniper → likely corporate, may have WLC, CAPWAP, 802.1X, RADIUS, WIDS, stronger security but also misconfig
- Consumer APs Netgear, TP-Link, ASUS → small business, home, maybe WPS, weak PSK, PMF disabled
- IoT chipsets Espressif, etc. → IoT network, maybe weak security, WPS, open
- Client Apple, Samsung, Intel, etc. → user devices, PNL, privacy

**OUI (Organizationally Unique Identifier):**
- First 3 bytes of MAC (BSSID or client MAC) — IEEE assigns OUI to vendor — e.g., `00:11:22` example Cisco, `AA:BB:CC` lab, `DE:AD:BE` custom lab, `12:34:56` Apple (but randomized now), `DC:A6:32` Raspberry Pi, `B8:27:EB` Raspberry Pi, `FC:FB:FB` etc.
- Wireshark shows vendor in Info — e.g., `Cisco_11:22:33`, `Apple_12:34:56`, `Espressif_...`
- Tools: `https://maclookup.app/` OUI lookup, `https://standards-oui.ieee.org/oui/oui.txt` IEEE list, `arp -a`, Kismet manufacturer, `airodump-ng --manufacturer`, `macchanger -l`, `nmap --script broadcast-dhcp-discover` etc.

**IE (Information Element) Fingerprinting:**
- Beacon and probe response contain IEs: SSID, Supported Rates, DS Parameter Set (channel), TIM, RSN, HT Capabilities, VHT Capabilities, HE Capabilities, Extended Capabilities, Vendor Specific (WPS IE OUI 00:50:F2:04, etc.), etc.
- Different vendors/models have different IE order, presence, values — can fingerprint AP model — e.g., Cisco APs have certain vendor IEs, Aruba have others, etc.
- WPS IE: `221 OUI 00:50:F2:04` — indicates WPS enabled — bad
- RSN IE: AKM, pairwise cipher, group cipher, PMF capability — e.g., RSN IE shows CCMP, PSK, PMF capable/required
- HT/VHT/HE: 802.11n/ac/ax capabilities — channel width, MCS, etc.
- For PT: Check RSN IE for CCMP vs TKIP, PMF, AKM PSK vs SAE vs EAP, WPS IE presence, etc.

**Capabilities Fingerprint:**
- Capability Info field: ESS, IBSS, CF Pollable, Privacy (WEP/WPA), Short Preamble, PBCC, Channel Agility, Spectrum Management, QoS, Short Slot Time, APSD, Radio Measurement, DSSS-OFDM, Delayed Block Ack, Immediate Block Ack — e.g., Privacy bit 1 = encryption enabled (WEP/WPA/WPA2/WPA3), ESS 1 = infrastructure BSS (AP), IBSS 0 = not ad-hoc.
- For PT: Privacy 0 = open network, Privacy 1 = encrypted, but need RSN IE for WPA2/3 vs WEP.

**Example:**
```
Beacon SA AA:BB:CC:11:22:33 DA FF:FF:FF:FF:FF:FF BSSID AA:BB:CC:11:22:33 SSID "" length 0 Ch1
Tagged parameters:
- SSID: length 0, SSID "" (hidden)
- Supported Rates: 1,2,5.5,11,6,9,12,18
- DS Parameter Set: Channel 1
- TIM: DTIM count 0, period 1, bitmap control 0x00
- RSN: Version 1, Group Cipher CCMP, Pairwise Cipher CCMP, AKM PSK, RSN Capabilities: PMF capable (not required), etc.
- HT Capabilities: Channel width 20/40, SM Power Save, etc.
- Vendor Specific: OUI 00:50:F2:04 WPS IE — WPS enabled bad
- Vendor Specific: OUI 00:10:18 Broadcom?
- Extended Capabilities: etc.
Capability Info: ESS 1, Privacy 1, etc.
Signal: -45 dBm
Vendor: Lab AA:BB:CC OUI
```

**For PT:** Vendor OUI + IE fingerprint helps prioritize — e.g., if BSSID OUI Cisco and SSID Corp-WLAN, likely corporate, check Enterprise, RADIUS, etc. If OUI Espressif and SSID IoT, likely IoT weak.

### Attack Surface Mapping — Recon Report

After passive recon, you should have:

```
APs:
- LAB-WIFI (00:11:22:33:44:55, Ch6, Open, Cisco? OUI 00:11:22, 2.4GHz, beacon interval 100, rates, HT 20/40, no WPS, PMF disabled, ESS with 00:11:22:33:44:56 same SSID Ch11)
- LAB-WIFI (00:11:22:33:44:56, Ch11, Open, same ESS LAB-WIFI, 2nd AP for roaming, same vendor, etc.)
- HIDDEN-LAB (AA:BB:CC:11:22:33, Ch1, WPA2-PSK CCMP PSK, hidden beacon empty length 0, revealed via probe resp f10 SA BSSID DA AA:BB:CC:99:88:77 SSID HIDDEN-LAB and assoc req f11 SA AA:BB:CC:99:88:77 DA BSSID SSID HIDDEN-LAB and probe req f9 SA AA:BB:CC:99:88:77 SSID HIDDEN-LAB, WPS enabled IE 00:50:F2:04, PMF disabled, vendor Lab AA:BB:CC, signal -50 dBm)
- Corp-WLAN (DE:AD:BE:EF:00:01, Ch36, WPA2-PSK CCMP PSK, 5GHz UNII-1, not hidden, vendor Custom DE:AD:BE, signal -60 dBm)
- Guest-WLAN (DE:AD:BE:EF:00:02, Ch6, Open, vendor Custom DE:AD:BE, signal -70 dBm, ap_isolate? unknown, captive portal?)

Clients:
- 12:34:56:78:9A:BC — PNL: LAB-WIFI, HomeWiFi, Corp-WLAN, probes LAB-WIFI f3, HomeWiFi f4, assoc to AA:BB:CC:DD:EE:FF LAB-WIFI Ch6, vendor Apple? OUI 12:34:56, signal -50 dBm, random MAC? No, real
- AA:BB:CC:99:88:77 — PNL: HIDDEN-LAB, probes HIDDEN-LAB f9, assoc to AA:BB:CC:11:22:33 HIDDEN-LAB, vendor Lab AA:BB:CC

Channels:
- 2.4GHz: 1 (hidden), 6 (LAB-WIFI open + Guest open + Corp-WLAN? Actually Corp Ch36 5GHz), 11 (LAB-WIFI ESS 2nd AP) — overlap check: 1,6,11 non-overlapping good, but 40MHz? Check HT 20/40 — if 40MHz in 2.4 bad
- 5GHz: 36 (Corp-WLAN) — UNII-1, no DFS, 20/40/80?

Security:
- Open: LAB-WIFI (2 BSSIDs) Ch6/11, Guest-WLAN Ch6 — open no encryption, sniffable, no handshake, but captive portal? check
- WPA2-PSK: HIDDEN-LAB Ch1 hidden WPS PMF disabled, Corp-WLAN Ch36 — check weak PSK, PMF, WPS
- WPA3? None in this lab, but check transition
- WPS: HIDDEN-LAB has WPS IE — High finding 11k PIN flaw
- PMF: All PMF disabled — High, deauth possible

ESS vs Rogue:
- LAB-WIFI ESS: BSSIDs 00:11:22:33:44:55 Ch6 and 00:11:22:33:44:56 Ch11 same SSID LAB-WIFI same vendor same security open, likely same network multiple APs for roaming — check authorized list — if authorized list says LAB-WIFI legit BSSIDs 00:11:22:33:44:55 and 00:11:22:33:44:56, then not rogue, ESS
- Rogue detection: Same SSID different BSSID not in authorized list different channel different vendor — e.g., if authorized list only AA:BB:CC:DD:EE:FF for LAB-WIFI, but observed 00:11:22:33:44:55 also LAB-WIFI, could be rogue or ESS — need authorized list to confirm — if not in list, flag potential rogue, investigate signal, vendor, channel

Prioritization:
- Open networks (LAB-WIFI open, Guest-WLAN open) — low-hanging, sniff, no handshake, but captive portal? check ap_isolate, MAC bypass
- Hidden with weak security (HIDDEN-LAB WPA2-PSK hidden WPS PMF disabled) — misconfig, hidden not security, WPS High, PMF High, weak PSK? Check
- Corp with WPA2-PSK (Corp-WLAN Ch36) — maybe weak PSK? Check handshake, offline audit authorized
- Multiple BSSIDs same ESS (LAB-WIFI) — roaming, maybe client isolation issues, check if same VLAN, etc.

This becomes your recon report for methodology.
```

**For PT:** Recon report should be reproducible with PCAP hash, frame numbers, filters, BSSIDs, channels, vendors, security, ESS mapping, hidden reveal, clients PNL, etc.

### Tools

- `airodump-ng wlan0mon` — shows APs BSSID PWR Beacons #Data #/s CH MB ENC CIPHER AUTH ESSID, hidden as `<length: 0>` or empty, clients STATION BSSID PWR Rate Lost Frames Probe
- Kismet — web UI `http://localhost:2501`, devices, APs, clients, SSID, BSSID, channel, signal, manufacturer, hidden flag, probe, assoc, WIDS, alerts, pcap logging
- Wireshark, tshark, Scapy, PcapInspector — filters `wlan_mgt.ssid=="" && wlan.fc.type_subtype==8` hidden beacons, `wlan.fc.type_subtype==5` probe resp reveal, `wlan.fc.type_subtype==0` assoc req reveal, `wlan.fc.type_subtype==4` probe req client reveal, `wlan.bssid`, `wlan.sa`, `wlan.da`, etc.
- OUI lookup — `https://maclookup.app/`, IEEE OUI list, Wireshark vendor column
- `iw dev wlan0 scan` — managed mode scan, shows SSID, BSSID, channel, security, hidden as `SSID: <hidden>`? Actually `iw` shows `SSID: HIDDEN-LAB` even if hidden? No, `iw` passive scan shows SSID if probe response, but beacon empty, `iw` may show empty, but `iw` active scan probes and gets probe response, reveals hidden — `iw dev wlan0 scan` active, will reveal hidden via probe response — evidence hidden not security.

### Evidence Collection

- Hidden AP: Beacon empty frame number, BSSID, channel, security, vendor OUI, signal, PCAP hash, filter `wlan_mgt.ssid=="" && wlan.fc.type_subtype==8`
- Reveal: Probe response frame number SA BSSID DA client SSID real, assoc request frame number SA client DA BSSID SSID real, probe request frame number SA client SSID real, PCAP hash, filters
- Example: `Hidden AP AA:BB:CC:11:22:33 Ch1 WPA2-PSK WPS PMF disabled vendor Lab signal -50 dBm beacon f1 SSID empty length 0, revealed via probe resp f10 SA BSSID DA AA:BB:CC:99:88:77 SSID HIDDEN-LAB and assoc req f11 SA AA:BB:CC:99:88:77 DA BSSID SSID HIDDEN-LAB and probe req f9 SA AA:BB:CC:99:88:77 SSID HIDDEN-LAB, PCAP recon-lab.pcapng SHA256 abc123...`

### VAPT Relevance

- **Recon:** Hidden SSID detection and reveal is first step — hidden not security, but indicates admin may rely on obscurity, check other misconfig WPS, PMF, weak PSK, etc.
- **Evidence:** Beacon empty + probe response real SSID + assoc request real SSID + probe request real SSID — not just SSID — reproducible with PCAP hash, frame numbers, filters, BSSID, channel
- **Report:** "1 hidden AP observed: BSSID AA:BB:CC:11:22:33 Ch1 WPA2-PSK SSID HIDDEN-LAB hidden beacon empty length 0 f1, revealed via probe response f10 SA BSSID DA AA:BB:CC:99:88:77 SSID HIDDEN-LAB and assoc request f11 SA client DA BSSID SSID HIDDEN-LAB, WPS enabled IE 00:50:F2:04 High finding, PMF disabled High, vendor Lab OUI AA:BB:CC, signal -50 dBm, hidden not security, focus on WPA2/3, PMF, strong PSK"
- **Defense:** Don't hide SSID for security, focus on WPA2-PSK CCMP strong PSK 20+ random not in wordlists or WPA3-only SAE PMF required, disable WPS, enable PMF required, WIDS authorized list, training
- **Retest:** Beacon still hidden? But recommendation is not to hide for security, but if hidden still, check WPS disabled, PMF required, strong PSK, etc. — hidden not security, but if still hidden, ensure no WPS, PMF, strong PSK, etc.

### Attack → Defense → Retest

- **Attack:** Observe hidden beacon empty, wait for client probe/assoc, reveal SSID HIDDEN-LAB, enumerate BSSID channel security, check WPS, PMF, weak PSK, etc. If lab and explicit ROE and PMF disabled, deauth client to force re-probe/assoc to capture reveal faster, but avoid if PMF required or no ROE.
- **Defense:** Hidden SSID not security, don't rely on obscurity, focus on WPA2-PSK CCMP strong PSK 20+ or WPA3-only SAE PMF required, disable WPS wps_state=0, enable PMF required ieee80211w=2, WIDS authorized AP list, strong RADIUS secret, cert validation, training, no WPS, no TKIP, no WEP, no open without OWE or isolation.
- **Retest:** New PCAPs show no WPS IE, PMF required, strong PSK audit fails, hidden still but not relied for security, WIDS no rogue, etc. Document new PCAP hash, frame numbers, config hash.

### Interactive Check

> You capture beacon: BSSID `AA:BB:CC:11:22:33` Ch1 SSID `""` length 0 RSN CCMP PSK WPS IE present PMF disabled. Client `AA:BB:CC:99:88:77` probes `HIDDEN-LAB`. What is hidden SSID, how revealed, what are findings?

Answer: Hidden SSID is `HIDDEN-LAB` revealed via probe request f? SA AA:BB:CC:99:88:77 SSID HIDDEN-LAB (client side) and probe response f? SA AA:BB:CC:11:22:33 DA AA:BB:CC:99:88:77 SSID HIDDEN-LAB (AP side) and assoc request f? SA client DA BSSID SSID HIDDEN-LAB. Findings: Hidden beacon empty not security, WPS enabled IE 00:50:F2:04 High (11k PIN flaw), PMF disabled High (deauth possible), WPA2-PSK check weak PSK, vendor Lab OUI AA:BB:CC, channel 1, signal -50 dBm. Recommendation: Disable WPS wps_state=0, enable PMF required ieee80211w=2, strong PSK 20+ random, don't rely on hidden, WIDS authorized list.

## References

- IEEE 802.11-2020 — SSID IE, beacon, probe request/response, assoc request, hidden SSID
- Wireshark 802.11 — SSID IE length 0, probe response, assoc request, OUI
- Kismet, airodump-ng — hidden SSID detection, OUI, manufacturer, recon
- OUI lookup — IEEE, maclookup.app

---

*Next: Wireshark & 802.11 Filtering — 20+ filters, tshark CLI, PcapInspector, evidence chain*

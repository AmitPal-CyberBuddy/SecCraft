# Association Flow & Traffic Analysis — Full State Machine

## Learning Objectives
- Master full association flow: Beacon → Probe → Auth → Assoc → EAPOL → Data
- Understand 802.11 state machine, reason codes, status codes
- Learn RSN IE deep dive: AKM, ciphers, PMF, WPS detection
- Analyze traffic-analysis.pcapng 12 frames with frame numbers and evidence
- Build VAPT evidence: complete flow with frame numbers, filters, BSSID, client, channel

## Theory

### Full Flow — Open + WPA2/WPA3

```
Time →
1. Beacon (AP → Broadcast)
   AP: "I'm LAB-WIFI, BSSID AA:BB:CC:DD:EE:FF, Ch6, WPA2-PSK, RSN IE CCMP PSK PMF capable, HT 20/40, WPS? No, interval 100 TU, rates, etc."
   SA BSSID AA:BB:CC:DD:EE:FF, DA FF:FF:FF:FF:FF:FF (broadcast), BSSID AA:BB:CC:DD:EE:FF, SSID LAB-WIFI, Channel 6 DS Parameter Set, TIM, RSN IE, HT Capabilities, etc.
   Filter: wlan.fc.type_subtype==8
   Frame: f1 in traffic-analysis.pcapng

2. Probe Request (Client → Broadcast or Directed)
   Client: "Anyone LAB-WIFI? PNL leak" or "Any AP?" broadcast
   SA Client MAC 11:22:33:44:55:66, DA FF:FF:FF:FF:FF:FF or BSSID AA:BB:CC:DD:EE:FF, BSSID FF:FF:FF:FF:FF:FF or BSSID, SSID LAB-WIFI or wildcard length 0, Supported Rates, HT, etc.
   Filter: wlan.fc.type_subtype==4
   Frame: f3 in traffic-analysis.pcapng — SA 11:22:33:44:55:66 DA FF:FF:FF:FF:FF:FF SSID LAB-WIFI (PNL)

3. Probe Response (AP → Client) — optional if beacon already heard, but if client probes, AP responds
   AP: "Yes, I'm LAB-WIFI, here's my capabilities, same as beacon but unicast to client"
   SA BSSID AA:BB:CC:DD:EE:FF, DA Client MAC 11:22:33:44:55:66, BSSID AA:BB:CC:DD:EE:FF, SSID LAB-WIFI, Channel 6, RSN, HT, etc.
   Filter: wlan.fc.type_subtype==5
   Frame: f4 in traffic-analysis.pcapng — SA BSSID DA client SSID LAB-WIFI

4. Authentication (Open System) — 2 frames, Open System Authentication (not WPA2 auth, 802.11 auth)
   Client → AP: Auth seq 1, algorithm 0 Open System, SA client DA BSSID BSSID BSSID
   AP → Client: Auth seq 2, status 0 success, SA BSSID DA client BSSID BSSID
   Algorithm: 0 Open System, 1 Shared Key (WEP, deprecated)
   Seq: 1 client → AP, 2 AP → client, for Open System only 2 frames, for Shared Key 4 frames (challenge)
   Status: 0 success, non-zero failure (e.g., 1 unspecified, 13 auth not valid, etc.)
   Filter: wlan.fc.type_subtype==11
   Frames: f5 Auth seq1 SA client DA BSSID, f6 Auth seq2 SA BSSID DA client status0 in traffic-analysis.pcapng

5. Association Request (Client → AP) — client wants to join, includes SSID, rates, RSN, HT, etc.
   Client: "I want to join LAB-WIFI, SSID LAB-WIFI, rates 1,2,5.5,11,6,9,12,18, RSN CCMP PSK, HT capabilities, etc."
   SA Client MAC 11:22:33:44:55:66, DA BSSID AA:BB:CC:DD:EE:FF, BSSID AA:BB:CC:DD:EE:FF, SSID LAB-WIFI, Supported Rates, Extended Rates, RSN IE, HT Capabilities, etc.
   Filter: wlan.fc.type_subtype==0
   Frame: f7 in traffic-analysis.pcapng — SA client DA BSSID SSID LAB-WIFI RSN CCMP PSK

6. Association Response (AP → Client) — AP accepts or rejects, assigns AID
   AP: "OK, AID 1, you are associated, rates, RSN, HT, etc." or status non-zero reject
   SA BSSID AA:BB:CC:DD:EE:FF, DA Client MAC 11:22:33:44:55:66, BSSID AA:BB:CC:DD:EE:FF, Capability Info, Status Code 0 success, AID 1 (Association ID 1-2007), Supported Rates, RSN, HT, etc.
   Status: 0 success, 1 failure, 10 cannot support all requested capabilities, 12 association denied due to outside standard, etc.
   AID: Association ID assigned by AP, 1-2007, used for TIM, PS-Poll, etc.
   Filter: wlan.fc.type_subtype==1
   Frame: f8 in traffic-analysis.pcapng — SA BSSID DA client status0 AID1

7. 4-way Handshake (if WPA2/WPA3) — EAPOL frames, derive PTK, install keys
   M1: AP → Client: ANonce (Authenticator Nonce 32 bytes random), SA BSSID DA client, EAPOL key descriptor, key info, ANonce, replay counter
   M2: Client → AP: SNonce (Supplicant Nonce) + MIC (Message Integrity Code HMAC-SHA1 using KCK), SA client DA BSSID, SNonce, MIC, RSN IE
   M3: AP → Client: GTK (Group Temporal Key) + MIC, SA BSSID DA client, GTK, MIC, RSN IE
   M4: Client → AP: ACK, SA client DA BSSID, MIC
   Filter: eapol
   Frames: f9 M1 ANonce SA BSSID DA client, f10 M2 SNonce+MIC SA client DA BSSID, f11 M3 GTK+MIC SA BSSID DA client, f12 M4 ACK SA client DA BSSID in traffic-analysis.pcapng — complete handshake

8. Data (encrypted) — after handshake, data frames encrypted with PTK (CCMP AES)
   Client → AP: To DS=1, From DS=0, SA client DA BSSID BSSID BSSID? Actually SA client, DA dest (e.g., gateway), BSSID BSSID, encrypted
   AP → Client: To DS=0, From DS=1, SA BSSID DA client BSSID BSSID, encrypted
   Filter: wlan.fc.type==2 && !eapol (data without eapol)
   Not in traffic-analysis.pcapng (12 frames only up to M4), but in real captures after M4

```

**For PT:** Association flow is core for understanding client/AP behavior, evidence collection, handshake capture, deauth, rogue, etc.

### In PCAP: traffic-analysis.pcapng (12 frames) — Detailed

| No | Time | Type/Subtype | SA | DA | BSSID | SSID | Channel | Details | Filter |
|----|------|--------------|----|----|-------|------|---------|---------|--------|
| 1 | 0.000 | Beacon (8) | AA:BB:CC:DD:EE:FF | FF:FF:FF:FF:FF:FF | AA:BB:CC:DD:EE:FF | LAB-WIFI | 6 | RSN CCMP PSK PMF capable, HT 20/40, interval 100, rates, signal -50 dBm, vendor Lab | `wlan.fc.type_subtype==8` |
| 2 | 0.102 | Beacon (8) | AA:BB:CC:DD:EE:FF | FF:FF:FF:FF:FF:FF | AA:BB:CC:DD:EE:FF | LAB-WIFI | 6 | Same as f1, beacon interval 102ms | `wlan.fc.type_subtype==8` |
| 3 | 1.000 | Probe Req (4) | 11:22:33:44:55:66 | FF:FF:FF:FF:FF:FF | FF:FF:FF:FF:FF:FF | LAB-WIFI | 6? Actually probe req channel from DS? Usually same as AP Ch6 | Client 11:22:33:44:55:66 probes LAB-WIFI PNL, rates, HT | `wlan.fc.type_subtype==4` |
| 4 | 1.005 | Probe Resp (5) | AA:BB:CC:DD:EE:FF | 11:22:33:44:55:66 | AA:BB:CC:DD:EE:FF | LAB-WIFI | 6 | AP responds to client probe, same as beacon but unicast | `wlan.fc.type_subtype==5` |
| 5 | 1.010 | Auth (11) seq1 | 11:22:33:44:55:66 | AA:BB:CC:DD:EE:FF | AA:BB:CC:DD:EE:FF | — | — | Auth algo 0 Open seq1 SA client DA BSSID | `wlan.fc.type_subtype==11` |
| 6 | 1.015 | Auth (11) seq2 | AA:BB:CC:DD:EE:FF | 11:22:33:44:55:66 | AA:BB:CC:DD:EE:FF | — | — | Auth seq2 status0 success SA BSSID DA client | `wlan.fc.type_subtype==11` |
| 7 | 1.020 | Assoc Req (0) | 11:22:33:44:55:66 | AA:BB:CC:DD:EE:FF | AA:BB:CC:DD:EE:FF | LAB-WIFI | — | Assoc req SA client DA BSSID SSID LAB-WIFI RSN CCMP PSK HT | `wlan.fc.type_subtype==0` |
| 8 | 1.025 | Assoc Resp (1) | AA:BB:CC:DD:EE:FF | 11:22:33:44:55:66 | AA:BB:CC:DD:EE:FF | — | — | Assoc resp status0 success AID1 SA BSSID DA client | `wlan.fc.type_subtype==1` |
| 9 | 1.030 | EAPOL M1 | AA:BB:CC:DD:EE:FF | 11:22:33:44:55:66 | AA:BB:CC:DD:EE:FF | — | — | M1 ANonce 32 bytes random SA BSSID DA client replay counter 1 | `eapol` |
| 10 | 1.035 | EAPOL M2 | 11:22:33:44:55:66 | AA:BB:CC:DD:EE:FF | AA:BB:CC:DD:EE:FF | — | — | M2 SNonce+MIC SA client DA BSSID SNonce 32 bytes MIC HMAC-SHA1 | `eapol` |
| 11 | 1.040 | EAPOL M3 | AA:BB:CC:DD:EE:FF | 11:22:33:44:55:66 | AA:BB:CC:DD:EE:FF | — | — | M3 GTK+MIC SA BSSID DA client GTK encrypted, MIC | `eapol` |
| 12 | 1.045 | EAPOL M4 | 11:22:33:44:55:66 | AA:BB:CC:DD:EE:FF | AA:BB:CC:DD:EE:FF | — | — | M4 ACK SA client DA BSSID | `eapol` |

**For PT:** This is ideal complete flow — beacon → probe → auth → assoc → 4-way handshake complete — evidence for report.

### Analyzing Each Step — Deep Dive

#### Beacon Analysis — RSN IE, PMF, WPS, HT/VHT/HE

**Beacon fields:**
- **SSID:** LAB-WIFI, length 8, not hidden
- **BSSID:** AA:BB:CC:DD:EE:FF, OUI AA:BB:CC Lab
- **Channel:** DS Parameter Set Channel 6 (2.4GHz), or HT Operation, VHT Operation, HE Operation
- **Beacon Interval:** 100 TU = 102.4ms typical, 100ms
- **Capability Info:** ESS 1, Privacy 1 (encrypted), Short Preamble 1, etc.
- **Supported Rates:** 1,2,5.5,11,6,9,12,18 Mbps
- **Extended Rates:** 24,36,48,54 Mbps
- **RSN IE (Tag 48):** Version 1, Group Cipher Suite CCMP (00-0F-AC-04), Pairwise Cipher Suite List CCMP (00-0F-AC-04), AKM Suite List PSK (00-0F-AC-02), RSN Capabilities: PMF capable (bit 6? Actually RSN Capabilities field: PMF capable, PMF required, etc.), etc.
  - **Group Cipher:** CCMP good, TKIP bad (deprecated)
  - **Pairwise Cipher:** CCMP good, TKIP bad
  - **AKM:** PSK (2) for WPA2-PSK, SAE (8) for WPA3, PSK+SAE (2+8) for transition, EAP (1) for Enterprise
  - **PMF:** RSN Capabilities bit 6 PMF capable, bit 7 PMF required — 0/0 disabled, 1/0 capable optional, 1/1 required — WPA3 requires required, WPA2 should be capable or required
  - **For PT:** Check RSN IE for CCMP vs TKIP, PSK vs SAE, PMF, etc.
- **HT Capabilities (802.11n):** Channel width 20/40, SM Power Save, Greenfield, Short GI 20/40, Tx STBC, Rx STBC, etc.
- **VHT Capabilities (802.11ac):** Channel width 20/40/80/160, MCS, etc.
- **HE Capabilities (802.11ax):** Channel width 20/40/80/160, MCS, OFDMA, etc.
- **WPS IE (Tag 221 OUI 00:50:F2:04):** If present, WPS enabled — High finding, PIN 11k flaw
- **Vendor Specific:** OUI, etc.
- **Signal:** -50 dBm (strong), -70 dBm (weak)

**Example beacon decode:**
```
802.11 Management Beacon
  Frame Control: 0x0080 Type Mgmt Subtype Beacon
  Duration: 0
  DA: FF:FF:FF:FF:FF:FF (Broadcast)
  SA: AA:BB:CC:DD:EE:FF (Lab)
  BSSID: AA:BB:CC:DD:EE:FF
  Seq: 0
  Tagged parameters:
    SSID: LAB-WIFI
    Supported Rates: 1,2,5.5,11,6,9,12,18
    DS Parameter Set: Channel 6
    TIM: DTIM 0/1 bitmap 0x00
    RSN: Version 1
      Group Cipher: CCMP (00-0F-AC-04)
      Pairwise Ciphers: CCMP (00-0F-AC-04)
      AKM Suites: PSK (00-0F-AC-02)
      RSN Capabilities: 0x0000 (PMF capable 0, PMF required 0) — PMF disabled bad
    HT Capabilities: Channel Width 20/40, SM Power Save, etc.
    Vendor Specific: OUI 00:50:F2:04 WPS IE — WPS enabled bad if present
  Signal: -50 dBm
```

**For PT:** Beacon analysis is first step — SSID, BSSID, channel, security, RSN, PMF, WPS, vendor, signal.

#### Probe Analysis — PNL Leak, Hidden Reveal

**Probe Request:**
- SA client MAC, DA broadcast or BSSID, BSSID broadcast or BSSID, SSID real or wildcard length 0
- If SSID real, PNL leak — e.g., LAB-WIFI, HomeWiFi, Corp-WLAN, HIDDEN-LAB — privacy issue + Evil Twin targeting
- If SSID wildcard length 0, broadcast probe — "any AP?" — less leak, but still client MAC, and modern OS random MAC for broadcast probe
- For hidden SSID, client must probe with real SSID — reveal method 3

**Probe Response:**
- SA BSSID, DA client MAC, BSSID BSSID, SSID real — even if beacon hidden empty, probe response contains real SSID — reveal method 1
- Same IEs as beacon but unicast

**For PT:** Probe req PNL is gold for Evil Twin targeting (if authorized) — if client probes Corp-WLAN and Corp-WLAN in scope, enumerate Corp-WLAN beacons, check security, etc.

#### Auth/Assoc Analysis — Status Codes, Reason Codes, AID

**Authentication (Open System):**
- Algo 0 Open, seq 1 client → AP, seq 2 AP → client status 0 success
- Status codes: 0 success, 1 unspecified failure, 10 cannot support all requested capabilities, 11 reassociation denied due to unable to confirm association exists, 12 association denied due to outside standard, 13 authentication algorithm not valid, etc.
- For PT: Status 0 success, non-zero failure — reason for failure

**Association:**
- Assoc Req SA client DA BSSID SSID real RSN HT etc.
- Assoc Resp SA BSSID DA client status 0 success AID 1-2007, or non-zero failure
- Status codes: 0 success, 1 failure, 10 cannot support all requested capabilities, 12 association denied due to outside standard, 17 association denied because AP unable to handle additional associated STAs, etc.
- AID: Association ID 1-2007 assigned by AP, used for TIM, PS-Poll, etc.

**Reason Codes (Deauth/Disassoc):**
- Reason 1 unspecified, 2 previous auth no longer valid, 3 deauth because sending STA leaving IBSS/ESS, 4 disassoc due to inactivity, 5 AP unable to handle all associated STAs, 6 class 2 frame from non-auth STA, 7 class 3 frame from non-assoc STA, 8 disassoc because sending STA leaving BSS, etc.
- For PT: Deauth reason 7 often used for handshake capture — class 3 frame from non-assoc STA — spoofed deauth

**For PT:** Auth/Assoc status codes help troubleshoot — e.g., status 12 association denied due to outside standard — maybe RSN mismatch, etc.

#### EAPOL Analysis (4-way Handshake) — M1-M4, ANonce, SNonce, MIC, Replay Counter, PMKID

**4-way handshake:**
- M1: AP → Client ANonce 32 bytes random, replay counter 1, key info, etc.
- M2: Client → AP SNonce 32 bytes random + MIC (HMAC-SHA1 using KCK derived from PMK+ANonce+SNonce+BSSID+Client MAC), RSN IE, replay counter 1
- M3: AP → Client GTK (Group Temporal Key) + MIC, replay counter 2, etc.
- M4: Client → AP ACK, replay counter 2, MIC

**For offline audit (authorized):**
- Need SSID, BSSID, Client MAC, ANonce, SNonce, MIC — to verify PSK via PBKDF2
- Actually need M1+M2 or M2+M3 — M1 ANonce, M2 SNonce+MIC — enough for hashcat
- PMKID: HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC) — can be in EAPOL M1 key data — clientless, single frame, no deauth needed — better than handshake — filter `wlan_rsna_eapol.pmkid`

**Evidence:**
- Frame numbers M1-M4 — e.g., f9 M1, f10 M2, f11 M3, f12 M4
- ANonce, SNonce, MIC, replay counter, BSSID, Client MAC, SSID
- Complete? 4 frames M1-M4 ideal, but M1+M2 enough for hashcat, M2+M3 also, etc.
- PCAP hash, filter `eapol && wlan.bssid==AA:BB:CC:DD:EE:FF`

**For PT:** Handshake capture is for WPA2-PSK offline audit authorized — need to ensure handshake complete, not truncated, MIC valid, etc.

### State Machine — 802.11

```
State 1: Unauthenticated, Unassociated
  → Auth Req (client → AP) → State 2 if Auth Resp status0
State 2: Authenticated, Unassociated
  → Assoc Req (client → AP) → State 3 if Assoc Resp status0
State 3: Authenticated, Associated
  → 4-way Handshake (if WPA2/3) → Data (encrypted) if handshake success
  → Deauth (AP → client or client → AP or spoofed) → State 1
  → Disassoc (AP → client or client → AP) → State 2
```

**For PT:** Deauth forces State 3 → State 1, client must re-auth, re-assoc, re-handshake — if PMF disabled, spoofed deauth possible for handshake capture — but active, requires ROE, lab only, avoid if PMF required.

### Lab Tasks — traffic-analysis.pcapng (12 frames)

**PCAP:** `traffic-analysis.pcapng` — Scapy-generated, real 802.11 frames, complete flow

**Tasks:**
1. Filter `wlan.fc.type_subtype==8` → How many beacons? What security? SSID? BSSID? Channel? RSN? PMF? WPS? Vendor? Signal?
   - Answer: 2 beacons f1-2 SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK PMF capable (not required) no WPS vendor Lab signal -50 dBm
2. Filter `wlan.fc.type_subtype==4` → What client? What SSID? PNL?
   - Answer: 1 probe req f3 SA 11:22:33:44:55:66 DA FF:FF:FF:FF:FF:FF SSID LAB-WIFI PNL LAB-WIFI
3. Filter `wlan.fc.type_subtype==11` → Auth flow? Seq? Status?
   - Answer: 2 auth f5 seq1 SA client DA BSSID algo 0, f6 seq2 SA BSSID DA client status0 success
4. Filter `wlan.fc.type_subtype==0 || wlan.fc.type_subtype==1` → Assoc flow? SSID? Status? AID?
   - Answer: 1 assoc req f7 SA client DA BSSID SSID LAB-WIFI RSN CCMP PSK, 1 assoc resp f8 SA BSSID DA client status0 AID1
5. Filter `eapol` → How many EAPOL? Complete? M1-M4? Frame numbers? ANonce? SNonce? MIC?
   - Answer: 4 EAPOL f9 M1 ANonce SA BSSID DA client replay 1, f10 M2 SNonce+MIC SA client DA BSSID replay 1, f11 M3 GTK+MIC SA BSSID DA client replay 2, f12 M4 ACK SA client DA BSSID replay 2 — complete handshake
6. Filter `wlan.bssid==AA:BB:CC:DD:EE:FF` → All frames for BSSID? Count?
   - Answer: 12 frames all for BSSID AA:BB:CC:DD:EE:FF
7. Map full flow with frame numbers for report: Beacon f1 → Probe Req f3 → Probe Resp f4 → Auth f5-6 → Assoc f7-8 → EAPOL f9-12 complete

**Wireshark Filters:**
```
wlan.fc.type_subtype==8                          # Beacons
wlan.fc.type_subtype==4                          # Probe req
wlan.fc.type_subtype==5                          # Probe resp
wlan.fc.type_subtype==11                         # Auth
wlan.fc.type_subtype==0                          # Assoc req
wlan.fc.type_subtype==1                          # Assoc resp
eapol                                            # 4-way handshake
wlan.bssid==AA:BB:CC:DD:EE:FF                    # Specific BSSID
wlan.sa==11:22:33:44:55:66                      # Specific client SA
wlan.da==11:22:33:44:55:66                      # Specific client DA
wlan.fc.type_subtype==8 || wlan.fc.type_subtype==4 || wlan.fc.type_subtype==5   # Beacons + probes
eapol && wlan.bssid==AA:BB:CC:DD:EE:FF         # Handshake for BSSID
wlan.bssid==AA:BB:CC:DD:EE:FF && (wlan.fc.type_subtype==0 || wlan.fc.type_subtype==1)  # Assoc for BSSID
```

**PcapInspector:**
- Summary: SSIDs 1, BSSIDs 1, clients 1, beacons 2, probes 2 (1 req 1 resp), auth 2, assoc 2, EAPOL 4, deauth 0
- Filter presets: Beacons, Probe Req, Probe Resp, Auth, Assoc, EAPOL, etc.
- Table: No, Type, SSID, BSSID, SA, DA, Channel, Summary
- Detail: Click frame → SSID, BSSID, SA, DA, channel, RSN, HT, ANonce, SNonce, MIC, etc.

### VAPT Relevance

- **Traffic analysis is core:** Understanding beacon, probe, auth, assoc, EAPOL, data — evidence collection, frame numbers, filters
- **Evidence:** Always note frame numbers for beacon, probe, auth, assoc, handshake — reproducible with PCAP hash, filters
- **Report:** "Complete association flow observed: Beacon f1 SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK PMF capable vendor Lab signal -50 dBm → Probe Req f3 SA 11:22:33:44:55:66 SSID LAB-WIFI PNL LAB-WIFI → Probe Resp f4 SA BSSID DA client → Auth f5 seq1 SA client DA BSSID algo0 → Auth f6 seq2 SA BSSID DA client status0 → Assoc Req f7 SA client DA BSSID SSID LAB-WIFI RSN CCMP PSK → Assoc Resp f8 SA BSSID DA client status0 AID1 → 4-way handshake f9 M1 ANonce SA BSSID DA client replay1 → f10 M2 SNonce+MIC SA client DA BSSID replay1 → f11 M3 GTK+MIC SA BSSID DA client replay2 → f12 M4 ACK SA client DA BSSID replay2 complete, PCAP traffic-analysis.pcapng SHA256..."
- **Next:** In WPA2 module, analyze handshake for offline audit (authorized captures only), PMKID, etc.

### Tools

- Wireshark, tshark, Scapy, PcapInspector — filters, frame numbers, evidence
- `airodump-ng`, Kismet — live association flow, but PCAP analysis via Wireshark
- `iw`, `iwconfig` — managed mode, not monitor, but association via `iw dev wlan0 link`

### Evidence Collection

- Beacon f1-2 SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK PMF capable no WPS vendor Lab signal -50 dBm
- Probe Req f3 SA 11:22:33:44:55:66 SSID LAB-WIFI PNL
- Probe Resp f4 SA BSSID DA client SSID LAB-WIFI
- Auth f5 seq1 SA client DA BSSID algo0, f6 seq2 SA BSSID DA client status0
- Assoc Req f7 SA client DA BSSID SSID LAB-WIFI RSN, Assoc Resp f8 SA BSSID DA client status0 AID1
- EAPOL f9 M1 ANonce SA BSSID DA client replay1, f10 M2 SNonce+MIC SA client DA BSSID replay1, f11 M3 GTK+MIC SA BSSID DA client replay2, f12 M4 ACK SA client DA BSSID replay2 complete
- PCAP hash, filters, BSSID, client, channel, security, etc.

### Attack → Defense → Retest

- **Attack:** Observe association flow, check RSN IE CCMP vs TKIP, PMF, WPS, weak PSK, etc. If handshake captured and weak PSK and authorized, offline audit via hashcat (lab only). If PMF disabled and explicit ROE and lab, deauth to capture handshake, but avoid if PMF required.
- **Defense:** WPA2-PSK CCMP strong PSK 20+ random not in wordlists, PMF required ieee80211w=2, disable WPS wps_state=0, WPA3-only SAE PMF required, strong RADIUS secret, cert validation, WIDS, monitoring.
- **Retest:** New PCAPs show no WPS IE, PMF required, strong PSK audit fails, handshake capture fails if PMF required deauth ignored, WIDS no rogue, etc.

### Interactive Check

> You capture traffic-analysis.pcapng 12 frames. What is BSSID, client MAC, channel, SSID, security, PMF, WPS, handshake complete? Map flow with frame numbers.

Answer: BSSID AA:BB:CC:DD:EE:FF, Client 11:22:33:44:55:66, Channel 6, SSID LAB-WIFI, Security WPA2-PSK CCMP PSK, PMF capable (not required) — should be required, WPS not present, handshake complete M1-M4 f9-12. Flow: Beacon f1-2 SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 → Probe Req f3 SA client SSID LAB-WIFI → Probe Resp f4 SA BSSID DA client → Auth f5 seq1 SA client DA BSSID → Auth f6 seq2 SA BSSID DA client status0 → Assoc Req f7 SA client DA BSSID SSID LAB-WIFI → Assoc Resp f8 SA BSSID DA client status0 AID1 → EAPOL M1 f9 ANonce SA BSSID DA client → M2 f10 SNonce+MIC SA client DA BSSID → M3 f11 GTK+MIC SA BSSID DA client → M4 f12 ACK SA client DA BSSID.

## References

- IEEE 802.11-2020 — Beacon, probe, auth, assoc, EAPOL, state machine, reason/status codes, RSN IE
- Wireshark 802.11 — Display filters, EAPOL, RSN IE, ANonce, SNonce, MIC
- Kismet, airodump-ng — Association flow, handshake

---

*Next: Module 07 WEP Legacy — Architecture, IV reuse, RC4 weaknesses, PTW, evidence, remediation*

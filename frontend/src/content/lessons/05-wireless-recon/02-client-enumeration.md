# Client Enumeration & PNL Leakage — Privacy & Evil Twin

## Learning Objectives
- Master client discovery via probe requests, assoc requests, data frames
- Understand PNL (Preferred Network List) leakage — privacy issue + Evil Twin targeting
- Learn vendor identification via OUI and IE fingerprint, random MAC mitigation
- Understand client ↔ AP relationship mapping
- Learn VAPT evidence: client MAC + PNL + frame numbers + signal

## Theory

### How Clients Leak — Active vs Passive

**Active Scanning (Client TX Probe Requests):**
- Client sends Probe Request for each SSID in PNL (list of networks it has joined before) — e.g., `LAB-WIFI`, `HomeWiFi`, `Corp-WLAN`, `Starbucks`, `Airport_Free_WiFi` — on each channel — broadcast or directed
- **Broadcast probe:** SSID wildcard length 0 — "any AP?" — DA FF:FF:FF:FF:FF:FF, SA Client MAC, SSID empty
- **Directed probe:** SSID specific — "anyone LAB-WIFI?" — DA FF:FF:FF:FF:FF:FF or specific BSSID, SA Client MAC, SSID LAB-WIFI — leaks PNL
- **PNL (Preferred Network List):** List of SSIDs client has connected to — stored in OS — Windows, macOS, iOS, Android, etc. — e.g., `LAB-WIFI`, `HomeWiFi`, `Corp-WLAN`, `Starbucks` — even when not connected, even when Wi-Fi enabled but not actively used, leaks history, location, employer, home, etc.
- **For PT:** PNL is gold for targeted Evil Twin — if you know client probes `Corp-WLAN`, you can create rogue AP with same SSID `Corp-WLAN`, client may auto-connect if stronger signal or after deauth (if PMF disabled) and PSK known or Enterprise no cert validation — but also privacy issue — don't capture PNL without authorization, lab PCAPs only

**Passive (Client RX Beacons, but also Data):**
- Even without probing, if client is associated, data frames reveal client MAC and BSSID — filter `wlan.fc.type==2` data, SA client, BSSID AP, DA dest
- Probe Response reveals AP to client — but also shows client MAC DA
- Auth/Assoc reveals client ↔ AP relationship — Auth Req SA client DA BSSID, Assoc Req SA client DA BSSID SSID

**Example:**
```
Client 12:34:56:78:9A:BC PNL: LAB-WIFI, HomeWiFi, Corp-WLAN
Time →
Client: Probe Req SA 12:34:56:78:9A:BC DA FF:FF:FF:FF:FF:FF SSID LAB-WIFI (PNL leak) Ch6
Client: Probe Req SA 12:34:56:78:9A:BC DA FF:FF:FF:FF:FF:FF SSID HomeWiFi (PNL leak) Ch6
Client: Probe Req SA 12:34:56:78:9A:BC DA FF:FF:FF:FF:FF:FF SSID Corp-WLAN (PNL leak) Ch6
AP: Beacon SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK
AP: Probe Resp DA 12:34:56:78:9A:BC SA AA:BB:CC:DD:EE:FF SSID LAB-WIFI Ch6
Client: Auth Req SA 12:34:56:78:9A:BC DA AA:BB:CC:DD:EE:FF algorithm 0 seq1
AP: Auth Resp SA AA:BB:CC:DD:EE:FF DA 12:34:56:78:9A:BC seq2 status0
Client: Assoc Req SA 12:34:56:78:9A:BC DA AA:BB:CC:DD:EE:FF SSID LAB-WIFI RSN CCMP PSK
AP: Assoc Resp SA AA:BB:CC:DD:EE:FF DA 12:34:56:78:9A:BC status0 AID1
...
Client: Data SA 12:34:56:78:9A:BC DA AA:BB:CC:DD:EE:FF BSSID AA:BB:CC:DD:EE:FF (To DS=1) — client to AP
AP: Data SA AA:BB:CC:DD:EE:FF DA 12:34:56:78:9A:BC BSSID AA:BB:CC:DD:EE:FF (From DS=1) — AP to client
```

### Client Discovery Methods

| Method | Frame Type/Subtype | SA/DA/BSSID | Info Leaked | Filter | VAPT Use |
|--------|-------------------|-------------|-------------|--------|----------|
| **Probe Request** | Mgmt subtype 4 | SA Client MAC, DA Broadcast or BSSID, BSSID Broadcast or BSSID, SSID PNL | Client MAC + SSID PNL (HomeWiFi, Corp-WLAN) — privacy + Evil Twin targeting | `wlan.fc.type_subtype==4`, `wlan.sa==12:34:56:78:9A:BC` | Client enumeration, PNL leakage, targeted Evil Twin |
| **Probe Response** | Mgmt subtype 5 | SA BSSID, DA Client MAC, BSSID BSSID, SSID real (hidden reveal) | AP BSSID + SSID real + client MAC DA — hidden reveal | `wlan.fc.type_subtype==5`, `wlan.da==12:34:56:78:9A:BC` | Hidden SSID reveal, AP enumeration |
| **Authentication** | Mgmt subtype 11 | SA Client or BSSID, DA BSSID or Client, BSSID BSSID, algorithm, seq, status | Client ↔ AP auth, algorithm 0 Open, seq 1/2, status 0 success | `wlan.fc.type_subtype==11` | Client ↔ AP relationship, auth |
| **Association Request** | Mgmt subtype 0 | SA Client, DA BSSID, BSSID BSSID, SSID real, RSN IE, HT/VHT/HE | Client MAC + SSID real (hidden reveal) + BSSID + RSN + HT | `wlan.fc.type_subtype==0` | Client enumeration, hidden reveal, RSN |
| **Association Response** | Mgmt subtype 1 | SA BSSID, DA Client, BSSID BSSID, status, AID | BSSID + client MAC + status 0 success + AID 1-2007 | `wlan.fc.type_subtype==1` | Client ↔ AP assoc, AID |
| **Data** | Type 2 subtype 0 or 8 QoS Data | SA Client or BSSID, DA BSSID or Client or dest, BSSID BSSID, To/From DS | Client ↔ AP data, even if no SSID in data frame, BSSID shows AP, SA/DA shows client/dest | `wlan.fc.type==2`, `wlan.bssid==AA:BB:CC:DD:EE:FF` | Client enumeration, data, even if no SSID |

**For PT:** Client discovery via probe req (PNL) and assoc req and data — even without AP, probe requests reveal clients and PNL — evidence for targeted Evil Twin, privacy issue.

### Vendor Identification & MAC Randomization

**OUI (Organizationally Unique Identifier):** First 3 bytes of MAC — e.g., `00:11:22` Cisco AP, `12:34:56` Apple (but randomized now), `AA:BB:CC` lab

**Tools:**
- Wireshark shows vendor in Info — e.g., `Apple_12:34:56`, `Cisco_11:22:33`
- `https://maclookup.app/` OUI lookup
- IEEE OUI list `https://standards-oui.ieee.org/oui/oui.txt`
- Kismet shows manufacturer

**MAC Randomization (Privacy Mitigation):**
- Modern OS (iOS 8+, Android 6+, Windows 10+, macOS) randomize probe request MACs for privacy — use random MAC for probe requests to reduce tracking — e.g., iOS uses random MAC for probe req with wildcard SSID, but may use real MAC for directed probe (PNL)
- **But still leaks PNL:** Even with random MAC, probe requests contain SSID PNL — e.g., random MAC `02:11:22:33:44:55` probes `Corp-WLAN` — still leaks PNL, useful for Evil Twin targeting (need to know SSID, not necessarily real MAC)
- **Association uses real MAC (or stable random):** After probe, auth/assoc uses real MAC or stable random per SSID — e.g., iOS uses stable random per SSID for assoc, not real MAC, but still consistent per SSID
- **Sequence numbers, IE fingerprint:** Even with random MAC, sequence numbers increment, IE fingerprint (HT/VHT/HE capabilities, vendor IEs, etc.) can still track device across random MACs — advanced tracking
- **For PT:** Random MAC reduces tracking, but PNL still leaks — privacy issue — and for Evil Twin targeting, need SSID, not real MAC — if you know client probes `Corp-WLAN`, you can create rogue AP same SSID, client may connect if stronger signal or after deauth and PSK known or Enterprise no cert validation

**Example:**
```
Real MAC: 12:34:56:78:9A:BC Apple, PNL LAB-WIFI, HomeWiFi, Corp-WLAN
Probe Req with random MAC 02:11:22:33:44:55 DA FF:FF:FF:FF:FF:FF SSID LAB-WIFI (PNL leak) — random MAC, but PNL leak still
Probe Req with real MAC 12:34:56:78:9A:BC DA FF:FF:FF:FF:FF:FF SSID Corp-WLAN (PNL leak) — real MAC for directed probe
Assoc Req SA 12:34:56:78:9A:BC DA AA:BB:CC:DD:EE:FF SSID LAB-WIFI — real MAC or stable random for assoc
```

**For PT:** Client enumeration via probe req — even with random MAC, PNL leak — evidence for targeted Evil Twin, privacy.

### Client ↔ AP Relationship Mapping

**How to map:**
- Probe Request SA client, SSID PNL — client probes for APs it knows
- Probe Response DA client, SA BSSID, SSID real — AP responds to client probe
- Auth Request SA client DA BSSID, Auth Response SA BSSID DA client — client auth to AP
- Assoc Request SA client DA BSSID SSID real, Assoc Response SA BSSID DA client status AID — client assoc to AP
- Data SA client DA BSSID or SA BSSID DA client — client data to/from AP
- EAPOL SA BSSID DA client or SA client DA BSSID — handshake for client and AP

**Example recon-lab.pcapng:**
- Client `12:34:56:78:9A:BC` PNL LAB-WIFI, HomeWiFi, Corp-WLAN — probe req f3 SSID LAB-WIFI, f4 SSID HomeWiFi, etc.
- Client `12:34:56:78:9A:BC` assoc to AP `AA:BB:CC:DD:EE:FF` LAB-WIFI Ch6 — auth req f5 SA client DA BSSID, auth resp f6 SA BSSID DA client, assoc req f7 SA client DA BSSID SSID LAB-WIFI, assoc resp f8 SA BSSID DA client status0 AID1
- Client `22:33:44:55:66:77` PNL LAB-WIFI — probe req f? SSID LAB-WIFI

**For PT:** Map client ↔ AP — which client probes which SSIDs, which client assoc to which BSSID, which BSSID has which clients — evidence for Evil Twin targeting, rogue detection, etc.

### Lab Tasks — recon-lab.pcapng (13 frames, 5 APs, 1 hidden, 2 clients)

**PCAP:** `recon-lab.pcapng` — Scapy-generated, real 802.11 frames

**Tasks:**
1. List all client MACs — filter `wlan.fc.type_subtype==4` probe req, SA client MAC, or `wlan.fc.type_subtype==0` assoc req, SA client — 2 clients: `12:34:56:78:9A:BC` and `22:33:44:55:66:77`
2. For client `12:34:56:78:9A:BC`, what PNL? — filter `wlan.sa==12:34:56:78:9A:BC && wlan.fc.type_subtype==4`, SSID IE — PNL LAB-WIFI, HomeWiFi, Corp-WLAN
3. Which client is probing hidden SSID? — filter `wlan_mgt.ssid==HIDDEN-LAB && wlan.fc.type_subtype==4`, SA client — client `12:34:56:78:9A:BC` probes HIDDEN-LAB
4. Which AP ↔ client association? — filter `wlan.fc.type_subtype==0` assoc req, SA client DA BSSID — client `12:34:56:78:9A:BC` assoc to AP `AA:BB:CC:DD:EE:FF` LAB-WIFI Ch6

**Wireshark Filters:**
```
wlan.fc.type_subtype==4          # Probe requests = clients PNL
wlan.fc.type_subtype==0          # Assoc requests = clients assoc
wlan.sa==12:34:56:78:9A:BC       # Specific client SA
wlan.da==12:34:56:78:9A:BC       # Specific client DA
wlan_mgt.ssid==LAB-WIFI          # Filter SSID LAB-WIFI
wlan_mgt.ssid==HIDDEN-LAB        # Filter hidden SSID
wlan.bssid==AA:BB:CC:DD:EE:FF    # Filter BSSID
```

**PcapInspector:** Summary clients count, SSIDs, BSSIDs, probes, filter presets Probe Req, Assoc Req, etc., frames table with client MAC, SSID PNL, BSSID.

### VAPT Relevance

- **Recon:** Enumerate clients via probe req (PNL) and assoc req and data — even without AP, probe req reveals clients and PNL — first step for targeted Evil Twin
- **Evidence:** Client MAC + PNL (SSIDs) + probe/assoc frame numbers + signal + vendor + random MAC? + IE fingerprint — not just MAC — reproducible with PCAP hash, frame numbers, filters
- **Report:** "2 clients observed, Client 12:34:56:78:9A:BC PNL LAB-WIFI, HomeWiFi, Corp-WLAN, probes hidden HIDDEN-LAB, assoc to AP AA:BB:CC:DD:EE:FF LAB-WIFI Ch6 WPA2-PSK, vendor Apple OUI 12:34:56, signal -50 dBm, random MAC probing enabled but PNL leak still"
- **Privacy:** PNL leakage is privacy issue — client history, location, employer, home — recommend random MAC probing, disable auto-connect to open, use WPA3, etc.
- **Evil Twin targeting:** If client probes Corp-WLAN and Corp-WLAN in scope and authorized, check if WPS, PMF, PSK weak, PEAP no cert, etc., then if lab and explicit ROE, create rogue AP same SSID stronger signal, client may auto-connect if PMF disabled and PSK known or Enterprise no cert validation — evidence client assoc to rogue

## Tools

- `airodump-ng wlan0mon` — STATION (client MAC) and associated BSSID, PWR, #Data, etc.
- Kismet — clients, PNL, probe, assoc, manufacturer, etc., web UI, WIDS
- Wireshark, tshark, Scapy, PcapInspector — filters `wlan.fc.type_subtype==4` probe req, `==0` assoc req, `wlan.sa`, `wlan_mgt.ssid`, etc.
- OUI lookup — vendor

## Evidence Collection

- Client MAC, PNL SSIDs, probe req frame numbers, assoc req frame numbers, BSSID associated, channel, security, vendor OUI, signal, random MAC? IE fingerprint, PCAP hash, filters
- Example: `Client 12:34:56:78:9A:BC PNL LAB-WIFI, HomeWiFi, Corp-WLAN, Probe Req f3 SSID LAB-WIFI DA FF:FF:FF:FF:FF:FF SA client, Probe Req f4 SSID HomeWiFi, Assoc Req f7 SA client DA AA:BB:CC:DD:EE:FF SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF, Data f13 SA client DA BSSID`

## Attack → Defense → Retest

- **Attack:** Observe client probe req PNL leak Corp-WLAN, create rogue AP same SSID Corp-WLAN stronger signal Ch11, client may auto-connect if PMF disabled and PSK known or Enterprise no cert validation, capture handshake or MSCHAPv2
- **Defense:** Random MAC probing (modern OS iOS/Android/Windows), disable auto-connect to open networks, use WPA3, EAP-TLS with cert validation ca_cert+subject_match via MDM/GPO, PMF required ieee80211w=2, strong PSK 20+, WIDS authorized list, training
- **Retest:** Probe req random MAC wildcard SSID no PNL (or minimal), client with ca_cert rejects rogue self-signed cert, PMF required deauth fails, strong PSK audit fails, WIDS no rogue

## Interactive Check

> You capture probe requests: Client `AA:BB:CC:DD:EE:FF` probes `Corp-WLAN`, `HomeWiFi`, `Starbucks`. AP `Corp-WLAN` BSSID `11:22:33:44:55:66` Ch6 WPA2-PSK in scope. What can you infer and next steps (authorized lab)?

Answer: Client PNL includes Corp-WLAN (target if in scope), HomeWiFi (personal), Starbucks (public). If Corp-WLAN in scope and authorized, enumerate beacons for Corp-WLAN BSSID/channel/security, check if WPS, PMF, PSK weak, etc. Check if client currently connected — if probe req but no assoc, client not connected, may be out of range or not auto-connect. If lab and explicit ROE, create rogue AP same SSID Corp-WLAN stronger signal Ch11, client may connect if PSK known and PMF disabled — evidence client assoc to rogue. Don't attack public, own lab only. Evidence: Probe req frame numbers, client MAC, SSIDs PNL, BSSID, channel.

## References

- IEEE 802.11-2020 — Scanning, probe request, PNL
- Wireshark 802.11 — Probe request, SSID IE, SA
- Kismet, airodump-ng — client enumeration, STATION
- Apple, Android, Windows — MAC randomization, PNL

---

*Next: Hidden SSID & Vendor Fingerprinting — Hidden beacon empty, reveal via probe resp/assoc req, OUI vendor, IE fingerprint*

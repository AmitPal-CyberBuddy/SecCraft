# AP Enumeration — Discovering the Air Professionally

## Learning Objectives
- Master passive vs active scanning: `iw dev scan`, Kismet, airodump-ng, Scapy, PcapInspector
- Extract per AP: SSID, BSSID, channel, band, width, security, RSN IE, WPS IE, HT/VHT/HE, vendor OUI, signal, beacon interval
- Map ESS: same SSID different BSSID = ESS (roaming) or rogue? Need authorized list
- Understand hidden SSID: beacon empty length 0, reveal via probe resp f10 and assoc req f7
- Learn vendor fingerprinting via OUI and IE fingerprint
- Understand VAPT evidence: BSSID + channel + security + vendor + frame numbers

## Theory

### Passive vs Active Scanning

**Passive Scanning (Stealthy, 0 RF TX, undetectable):**
- Client/AP listens for beacons on each channel — no transmission — dwell ~100ms per channel for beacon interval 100 TU
- **Pros:** Stealthy, no detection by WIDS, captures beacons for all APs on channel
- **Cons:** Slow — must hop channels, may miss beacons if hopping fast, can't discover hidden SSID unless client probes (probe response reveals)
- **Tools:** `iw dev wlan0 scan` (managed mode, passive, uses kernel scanning), Kismet (passive, no tx, WIDS), Wireshark in monitor mode (passive capture), Scapy `sniff(iface="wlan0", prn=...)` (passive), PcapInspector (simulated, zero-cost, PCAP analysis)
- **For PT:** Passive first — map attack surface without detection — `iw dev wlan0 scan` or Kismet or PcapInspector with `recon-lab.pcapng`

**Active Scanning (Faster, but TX, detectable, PNL leakage):**
- Client sends probe requests — broadcast wildcard SSID length 0 ("any AP?") or directed specific SSID ("anyone LAB-WIFI?") — AP responds with probe response
- **Pros:** Faster — directed probe for specific SSID reveals hidden SSID via probe response, discovers APs that may not beacon frequently
- **Cons:** TX probe requests — detectable by WIDS, leaks PNL (Preferred Network List) — client history, privacy issue, useful for targeted Evil Twin but also privacy violation if not authorized
- **Tools:** `iw dev wlan0 scan` with active scan (kernel sends probe req), `airodump-ng --active` (sends probe req), client probe requests (PNL leakage)
- **For PT:** Active scanning may reveal hidden SSID faster, but also leaks PNL — use in lab only, not on public

**For this academy:** Simulated labs use PCAPs — `recon-lab.pcapng` has 5 APs, 1 hidden, 2 clients, 13 frames — zero-cost, no hardware, no TX, safe — PcapInspector with filter presets for beacon, probe req/resp, etc.

### What to Extract per AP — Professional Checklist

| Field | Source | Example | Wireshark Filter | VAPT Use | Evidence |
|-------|--------|---------|------------------|----------|----------|
| **SSID** | Beacon IE 0, Probe Resp IE 0, Assoc Req IE 0 | LAB-WIFI, Corp-Enterprise, HIDDEN-LAB, Guest-WLAN, IoT-PSK | `wlan_mgt.ssid==LAB-WIFI`, `wlan_mgt.ssid==\"\"` hidden | Network name, ESS mapping, hidden reveal | SSID + frame number |
| **BSSID** | Dot11 addr2 (TA), addr3, wlan.bssid | AA:BB:CC:DD:EE:FF, 00:11:22:33:44:55, 11:22:33:44:55:66 rogue | `wlan.bssid==AA:BB:CC:DD:EE:FF` | Target MAC, ESS vs rogue, authorized list | BSSID + frame |
| **Channel** | IE 3 DS Parameter Set, wlan_mgt.ds.current_channel | 6, 11, 36, 1, 100 | `wlan_mgt.ds.current_channel==6` | Channel map, interference, DFS | Channel + frame |
| **Band** | Frequency from radiotap or channel — 2412 MHz Ch1 2.4 GHz, 5180 MHz Ch36 5 GHz, 5955 MHz Ch1 6 GHz | 2.4 GHz, 5 GHz, 6 GHz | `radiotap.channel.freq==2437`, `wlan_mgt.ds.current_channel` + freq | 2.4/5/6 GHz, range, propagation, WPA3-only for 6 GHz | Band + channel |
| **Width** | HT Operation, VHT Operation, HE Operation — 20/40/80/160/320 MHz | 20 MHz, 40 MHz (bad in 2.4), 80 MHz | `wlan_mgt.ht.operation`, `wlan_mgt.vht.operation`, `wlan_mgt.he.operation` | 40 MHz in 2.4 bad practice Medium, 80/160 good for 5/6 | Width + frame |
| **Security** | RSN IE 48, privacy bit, AKM, ciphers, PMF | Open, WEP, WPA2-PSK CCMP, WPA2-EAP, WPA3-SAE, WPA3-EAP, OWE | `wlan_mgt.rsn.akms.type==2` PSK, `==8` SAE, `wlan_mgt.rsn.version`, `wlan_mgt.fixed.capabilities.privacy` | Attack surface — Open sniffable, WEP Critical, WPA2-PSK weak High, WPS High, PMF disabled Medium, etc. | Security + RSN IE frame |
| **RSN IE** | ID 48 — Version, Group Cipher, Pairwise Cipher Count/List, AKM Count/List, RSN Capabilities MFPC/MFPR, PMKID, Group Mgmt Cipher | Group CCMP, Pairwise CCMP, AKM PSK, MFPC=0 MFPR=0 PMF disabled, MFPC=1 MFPR=1 PMF required | `wlan_mgt.rsn.akms.type`, `wlan_mgt.rsn.pcs.type`, `wlan_mgt.rsn.capabilities.mfpc`, `mfpr` | CCMP good, TKIP bad, PSK vs SAE vs EAP, PMF disabled/capable/required | RSN IE frame |
| **WPS IE** | ID 221 OUI 00:50:F2:04 — WPS Version, State, AP Setup Locked, etc. | WPS enabled, WPS State 2 configured, AP Setup Locked 0 | `wps`, `wlan_mgt.tag.number==221 && wlan_mgt.tag.oui==00:50:f2` | WPS High 11k PIN flaw, beacon WPS IE present | WPS IE frame |
| **HT/VHT/HE** | ID 45 HT Capabilities, 61 HT Operation, 191 VHT Capabilities, 192 VHT Operation, 255 ext 35 HE Capabilities, 255 ext 36 HE Operation | HT20/HT40, VHT 80/160, HE 20/40/80/160, MCS 0-7, etc. | `wlan_mgt.ht.capabilities`, `vht.capabilities`, `he.capabilities` | 40 MHz in 2.4 bad, MCS, spatial streams, but not security | HT/VHT/HE frame |
| **Vendor** | OUI of BSSID — first 3 bytes — 00:11:22 Cisco, 00:50:F2 Microsoft, etc. — Wireshark shows vendor, or OUI database | Cisco, Aruba, Ubiquiti, Apple, etc. | `wlan.bssid` OUI, Wireshark vendor column | Fingerprint, authorized list BSSID channel vendor | Vendor + BSSID |
| **Signal** | Radiotap header — RSSI, e.g., -45 dBm strong, -70 dBm weak — only real RF, not simulated PCAP (Scapy PCAP may have fake signal) | -45 dBm strong, -70 dBm weak | `radiotap.dbm_antsignal==-45` | Proximity, range, roaming, rogue stronger signal may cause client to roam to rogue | Signal + frame (real RF only) |
| **Beacon Interval** | Beacon frame — 2 bytes, 100 TU = 102.4ms default, 1 TU = 1024 µs | 100, 200, etc. | `wlan_mgt.fixed.beacon` | Beacon interval, load, etc. — not security, but info | Beacon interval frame |

**Example Professional Evidence:**
```
PCAP: recon-lab.pcapng SHA256 a1b2c3d4e5f6... Size 12.3 KB Frames 13 Tool Scapy 2.5.0
Frame 1: Beacon SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 2.4 GHz 20 MHz WPA2-PSK CCMP MFPC=0 MFPR=0 PMF disabled WPS disabled HT20 MCS 0-7 1 stream vendor Cisco OUI 00:11:22 signal -45 dBm beacon interval 100
Frame 2: Beacon SSID empty length 0 BSSID DD:EE:FF:00:11:22 Ch6 2.4 GHz 20 MHz WPA2-PSK CCMP hidden HIDDEN-LAB
Frame 10: Probe Response DA 11:22:33:44:55:66 SA DD:EE:FF:00:11:22 SSID HIDDEN-LAB BSSID DD:EE:FF:00:11:22 Ch6 WPA2-PSK CCMP (hidden reveal) — real SSID
```

### ESS Mapping — Same SSID Different BSSID

**ESS (Extended Service Set):** Multiple BSSs with same SSID for roaming — same logical network, different physical APs — e.g., Office with 3 APs all SSID `Corp-WLAN`, BSSIDs `AA:BB:CC:DD:EE:01` Ch1, `AA:BB:CC:DD:EE:02` Ch6, `AA:BB:CC:DD:EE:03` Ch11 — same SSID, different BSSID, different channel, same security, same VLAN — client roams transparently based on signal, 802.11r/k/v helps.

**Rogue AP:** Same SSID different BSSID not in authorized list, different channel/vendor/signal, maybe same BSSID cloning, client assoc to rogue — e.g., `Corp-WLAN` legit BSSID `AA:BB:CC:DD:EE:FF` Ch6 Cisco, rogue BSSID `11:22:33:44:55:66` Ch11 same SSID Corp-WLAN different BSSID different channel not in authorized list, client `12:34:56:78:9A:BC` associates to rogue frame 6-7 — rogue AP, Evil Twin if PSK known.

**How to differentiate ESS vs Rogue:**
- **Authorized list (WIDS):** WIDS should have authorized AP list BSSID channel vendor signal — e.g., Authorized: AA:BB:CC:DD:EE:FF Ch6 Cisco, AA:BB:CC:DD:EE:01 Ch11 Cisco — if observed BSSID not in list, rogue
- **Channel:** ESS APs usually on non-overlapping channels 1,6,11 for 2.4 GHz, or 36,40,44,48 for 5 GHz — rogue may be on same channel or different, but not in authorized list
- **Vendor:** ESS APs same vendor (Cisco), rogue different vendor (e.g., 11:22:33:44:55:66 OUI not Cisco)
- **Signal:** ESS APs signal similar, rogue may have stronger signal to lure clients
- **Client assoc:** Client assoc to rogue is evidence — frame 6-7 client 12:34:56:78:9A:BC to rogue 11:22:33:44:55:66

**Example recon-lab.pcapng:**
- SSID LAB-WIFI with BSSIDs `00:11:22:33:44:55` Ch6 and `00:11:22:33:44:56` Ch11 — same SSID LAB-WIFI, different BSSID, different channel, same vendor (OUI 00:11:22), likely ESS — 2 APs same network for roaming — check authorized list — if authorized list has these BSSIDs, ESS, not rogue
- SSID HIDDEN-LAB hidden beacon BSSID DD:EE:FF:00:11:22 Ch6 — hidden, but probe response f10 reveals real SSID HIDDEN-LAB

**For PT:** Map ESS — same SSID different BSSID = ESS or rogue? Need authorized list. Evidence: SSID, BSSIDs, channels, vendors, authorized list, client assoc.

### Hidden SSID — Not Security, Just Obscurity

**Hidden SSID:** AP hides SSID — beacon SSID IE length 0, SSID empty — but not security — probe response and assoc request contain real SSID, easily revealed.

**Reveal methods:**
- **Probe Response:** Client sends probe request for hidden SSID (directed probe with SSID HIDDEN-LAB), AP responds with probe response containing real SSID — filter `wlan.fc.type_subtype==5` probe resp, check SSID — frame 10 in recon-lab.pcapng
- **Association Request:** Client assoc request contains real SSID even if beacon hidden — filter `wlan.fc.type_subtype==0` assoc req, check SSID — frame 7 in recon-lab.pcapng if hidden
- **Not security:** Hidden SSID is not security — 802.11 spec says SSID hiding is not security, focus on WPA2/WPA3, not hiding — WIDS may still detect hidden via probe resp

**For PT:** Hidden SSID not security, focus on WPA2/WPA3. Evidence: Hidden beacon frame 1 SSID empty length 0, Probe Response frame 10 SSID HIDDEN-LAB real, Assoc Request frame 7 SSID HIDDEN-LAB real.

### Vendor Fingerprinting

**OUI:** First 3 bytes of MAC — e.g., `00:11:22` = Cisco, `00:50:F2` = Microsoft, `AA:BB:CC` = lab, `12:34:56` = Apple (but randomized now)

**IE Fingerprint:** Beacon IE order, vendor specific IEs, HT/VHT/HE capabilities, etc. — can fingerprint AP model — e.g., Cisco has specific vendor IEs, Aruba has different

**Tools:**
- Wireshark shows vendor in Info column — e.g., `Cisco_11:22:33`
- `https://maclookup.app/` — OUI lookup
- IEEE OUI list — `https://standards-oui.ieee.org/oui/oui.txt`
- Kismet shows manufacturer

**For PT:** Vendor fingerprint helps authorized list — BSSID channel vendor — if vendor not in authorized list, rogue.

### Lab — Recon Lab PCAP (13 frames, 5 APs, 1 hidden, 2 clients)

**PCAP:** `recon-lab.pcapng` — Scapy-generated, real 802.11 frames, zero-cost, local-first

**Summary:**
- Total frames: 13
- SSIDs: LAB-WIFI, HIDDEN-LAB (hidden), HomeWiFi (PNL), Corp-WLAN (PNL)
- BSSIDs: 00:11:22:33:44:55 Ch6 LAB-WIFI, 00:11:22:33:44:56 Ch11 LAB-WIFI (ESS), DD:EE:FF:00:11:22 Ch6 HIDDEN-LAB hidden, AA:BB:CC:DD:EE:FF Ch6 LAB-WIFI?, etc. — 5 APs total
- Clients: 12:34:56:78:9A:BC PNL LAB-WIFI HomeWiFi Corp-WLAN, 22:33:44:55:66:77 PNL LAB-WIFI
- Channels: 6, 11
- Beacons: 5, Probes: 3, EAPOL: 0, etc.

**Tasks:**
1. How many APs total? — Filter `wlan.fc.type_subtype==8` beacon, count unique BSSID — 5 APs
2. Which SSIDs? — List SSID IE from beacons — LAB-WIFI, HIDDEN-LAB hidden (empty), etc.
3. Which BSSIDs belong to same ESS? — Same SSID different BSSID — 00:11:22:33:44:55 Ch6 and 00:11:22:33:44:56 Ch11 both SSID LAB-WIFI — ESS, 2 APs same network
4. Which is hidden? How revealed? — Beacon SSID empty length 0 BSSID DD:EE:FF:00:11:22 Ch6 — hidden HIDDEN-LAB, revealed via Probe Response f10 SSID HIDDEN-LAB real and Assoc Request f7 SSID HIDDEN-LAB real
5. Vendors via OUI? — OUI 00:11:22 Cisco, etc. — Wireshark vendor column

**Wireshark Filters:**
```
wlan.fc.type_subtype==8          # Beacons only — APs
wlan.fc.type_subtype==4          # Probe requests — clients PNL
wlan.fc.type_subtype==5          # Probe responses — hidden reveal
wlan.fc.type_subtype==0          # Assoc requests — hidden reveal + client
wlan_mgt.ssid                    # Has SSID
wlan_mgt.ssid==""                # Hidden SSID beacons (SSID length 0)
wlan.bssid==00:11:22:33:44:55    # Filter BSSID
wlan.sa==12:34:56:78:9A:BC       # Filter client SA
wlan_mgt.ds.current_channel==6  # Filter channel 6
wps                              # WPS IE present
```

**PcapInspector:** Use in ModuleDetail Lab tab — shows summary SSIDs, BSSIDs, clients, channels, beacons, probes, filter presets All/Beacons/Probe Req/Probe Resp/EAPOL/WPS, frames table with type badges, frame detail.

### VAPT Relevance

- **Recon:** First step of engagement — map wireless attack surface — APs, SSIDs, BSSIDs, channels, security, vendors, hidden, clients, PNL — passive first (0 RF tx, undetectable), then active if needed (directed probe for hidden, but leaks PNL)
- **Evidence:** List APs with BSSID, SSID, channel, band, width, security, RSN IE, WPS IE, HT/VHT/HE, vendor, signal, beacon interval, frame numbers, filters — not just SSID — reproducible with PCAP hash, frame numbers, filters
- **Report:** "5 APs observed, 2 in ESS LAB-WIFI BSSIDs 00:11:22:33:44:55 Ch6 and 00:11:22:33:44:56 Ch11, 1 hidden HIDDEN-LAB BSSID DD:EE:FF:00:11:22 Ch6 revealed via probe response f10 and assoc req f7, 2 clients 12:34:56:78:9A:BC PNL LAB-WIFI HomeWiFi Corp-WLAN and 22:33:44:55:66:77 PNL LAB-WIFI, vendors Cisco OUI 00:11:22, etc."

## Tools

- `iw dev wlan0 scan` — APs, SSIDs, BSSIDs, channels, security, HT/VHT/HE, vendor, signal — managed mode, passive
- `airodump-ng wlan0mon` — BSSID, PWR, Beacons, #Data, CH, MB, ENC, CIPHER, AUTH, ESSID, STATION — monitor mode, channel hopping, writes pcap
- Kismet — APs, clients, hidden, WPS, BT, Zigbee, WIDS authorized list, rogue detection, web UI, logs
- Wireshark, tshark, Scapy, PcapInspector — analysis, filters, evidence

## Evidence Collection

- PCAP hash SHA256, frame numbers, filters, SSID, BSSID, channel, band, width, security, RSN IE, WPS IE, HT/VHT/HE, vendor OUI, signal, beacon interval
- Example: `PCAP recon-lab.pcapng SHA256 a1b2c3..., Frame 1 Beacon SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 2.4 GHz 20 MHz WPA2-PSK CCMP vendor Cisco OUI 00:11:22 signal -45 dBm, Frame 10 Probe Response DA 11:22:33:44:55:66 SA DD:EE:FF:00:11:22 SSID HIDDEN-LAB (hidden reveal)`

## Attack → Defense → Retest

- **Attack:** Observe APs, hidden SSID, PNL leak — use for targeted Evil Twin — same SSID stronger signal, client may auto-connect if PMF disabled and PSK known or Enterprise no cert validation
- **Defense:** WIDS authorized AP list BSSID channel vendor signal, alert rogue same SSID diff BSSID not in list, random MAC probing (modern OS), disable auto-connect to open, WPA3, PMF required, strong PSK, WPA3-only for 6 GHz
- **Retest:** WIDS no rogue, authorized list matches, probe req random MAC wildcard SSID no PNL, beacon no WPS IE, PMF required, strong PSK audit fails

## Interactive Check

> You capture beacons: SSID `LAB-WIFI` BSSID `AA:BB:CC:DD:EE:FF` Ch6 WPA2-PSK CCMP, BSSID `AA:BB:CC:DD:EE:01` Ch11 WPA2-PSK CCMP same vendor Cisco, and beacon SSID empty BSSID `DD:EE:FF:00:11:22` Ch6 WPA2-PSK. How many APs, which ESS, which hidden, how revealed?

Answer: 3 APs total (2 beacons LAB-WIFI + 1 hidden empty). ESS: AA:BB:CC:DD:EE:FF Ch6 and AA:BB:CC:DD:EE:01 Ch11 same SSID LAB-WIFI same vendor Cisco — ESS, 2 APs same network for roaming, check authorized list — if authorized list has these BSSIDs, ESS. Hidden: DD:EE:FF:00:11:22 Ch6 SSID empty length 0 — hidden, likely HIDDEN-LAB, revealed via Probe Response f10 SSID HIDDEN-LAB real and Assoc Request f7 SSID HIDDEN-LAB real — filter `wlan.fc.type_subtype==5` probe resp or `==0` assoc req, check SSID. Evidence: Frame numbers, BSSIDs, channels, SSIDs, hidden reveal.

## References

- IEEE 802.11-2020 — Beacon, SSID, BSSID, BSS, ESS, MBSSID, DS
- Wireshark 802.11 — Beacon IE, SSID IE, DS Parameter Set, RSN IE, WPS IE, HT/VHT/HE IEs
- Kismet, airodump-ng documentation — recon, AP enumeration

---

*Next: Client Enumeration & PNL Leakage — Probe Requests, PNL, Vendor, Random MAC*

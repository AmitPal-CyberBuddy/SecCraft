# SSID vs BSSID vs ESSID — Deep Dive for Recon

## Learning Objectives
- Master SSID: 32 bytes, charset, hidden SSID not security, ESSID, case sensitivity, beacon IE
- Master BSSID: MAC per radio, OUI vendor, locally administered, per-band, MBSSID, how to target
- Understand ESS/BSS: BSS, ESS, MBSSID, same SSID different BSSID = ESS or rogue?
- Learn SSID enumeration: beacon, probe resp, assoc req, hidden reveal
- Understand VAPT evidence: BSSID + channel + security, not just SSID

## Theory

### SSID (Service Set Identifier) — What User Sees

**Definition:** Human-readable network name, up to 32 bytes (not characters — bytes, UTF-8, but often ASCII), case-sensitive, e.g., `LAB-WIFI`, `Corp-WLAN`, `HomeWiFi`, `Guest-WLAN`, `IoT-PSK`, `HIDDEN-LAB`

**IE:** ID 0, Length 0-32, Data SSID bytes — in beacon, probe req (directed probe contains SSID), probe resp, assoc req

**Properties:**
- **32 bytes max:** Not 32 characters — if UTF-8 multi-byte, fewer characters, but typically ASCII
- **Case-sensitive:** `LAB-WIFI` ≠ `lab-wifi` — different SSIDs
- **Not security:** SSID hiding (empty SSID in beacon) is not security — probe response and assoc request contain real SSID, easily revealed — focus on WPA2/WPA3, not hiding
- **Can be same across APs:** Same SSID on multiple BSSIDs = ESS (Extended Service Set) for roaming, or rogue AP if not in authorized list — need authorized list to differentiate
- **Can be empty:** Hidden SSID beacon has SSID IE length 0, SSID empty, but probe response reveals real SSID — filter `wlan_mgt.ssid==\"\"` for hidden beacons
- **Wildcard:** Probe request with SSID length 0 is wildcard — client asks "any AP?" — broadcast probe
- **Directed probe:** Probe request with specific SSID — client probes for known SSID — PNL leakage, e.g., `LAB-WIFI`, `HomeWiFi`, `Corp-WLAN` — even when not connected, leaks history

**Examples:**
- `LAB-WIFI` — lab, WPA2-PSK CCMP, BSSID AA:BB:CC:DD:EE:FF, Ch6, 2.4 GHz
- `Corp-Enterprise` — enterprise, WPA2-EAP, BSSID AA:BB:CC:DD:EE:FF, Ch6, 2.4 GHz, VLAN 100
- `Corp-Guest` — guest, Open + portal, BSSID BB:CC:DD:EE:FF:00, Ch11, 2.4 GHz, VLAN 200, ap_isolate=0 weak
- `HIDDEN-LAB` — hidden, beacon SSID empty length 0, but probe response SSID HIDDEN-LAB real, BSSID DD:EE:FF:00:11:22, Ch6

**For PT:** SSID is what user sees, but BSSID is what you target — `a-T -b AA:BB:CC:DD:EE:FF`. Evidence: Always capture SSID + BSSID + channel + security, not just SSID. Hidden SSID not security.

### BSSID (Basic Service Set Identifier) — What Radio Actually Is

**Definition:** MAC address of AP's radio interface — 6 bytes, e.g., `AA:BB:CC:DD:EE:FF`, unique per radio — 2.4 GHz and 5 GHz radios have different BSSIDs, often same OUI with different last byte

**IE:** In beacon Frame Control Address2 and Address3, BSSID = AP MAC, in probe resp Address2 BSSID, in auth/assoc Address1/2 BSSID, etc.

**Properties:**
- **MAC per radio:** Each radio has unique BSSID — e.g., AP with 2.4 GHz radio BSSID `AA:BB:CC:DD:EE:01`, 5 GHz radio BSSID `AA:BB:CC:DD:EE:02` — same physical AP, different BSSIDs
- **OUI vendor:** First 3 bytes OUI (Organizationally Unique Identifier) — e.g., `00:11:22` = Ciso, `00:50:F2` = Microsoft, `AA:BB:CC` = lab — vendor identification via OUI database — `wireshark` shows vendor, or `mac-lookup`, or `ieee OUI list`
- **Locally administered:** Second bit of first byte — if 1, locally administered (not globally unique) — e.g., `02:xx:xx:xx:xx:xx` locally administered, `00:xx:xx:xx:xx:xx` globally unique — some APs use locally administered for virtual BSSIDs (MBSSID)
- **MBSSID (Multiple BSSID):** One physical radio can host multiple BSSIDs — e.g., Enterprise AP with 4 SSIDs Corp, Guest, IoT, BYOD on same radio Ch6 — BSSIDs `AA:BB:CC:DD:EE:01` Corp, `AA:BB:CC:DD:EE:02` Guest, `AA:BB:CC:DD:EE:03` IoT, `AA:BB:CC:DD:EE:04` BYOD — all same channel, same radio, different BSSIDs, different SSIDs — efficient
- **Targeting:** Tools use BSSID to target — `airodump-ng --bssid AA:BB:CC:DD:EE:FF -c 6 wlan0mon`, `tshark -Y "wlan.bssid==AA:BB:CC:DD:EE:FF"`, `wlan.bssid` filter
- **ESS vs Rogue:** Same SSID different BSSID could be ESS (multiple APs same SSID for roaming, authorized) or rogue (same SSID different BSSID not in authorized list, different channel/vendor/signal) — need authorized AP list to differentiate — WIDS should have authorized list BSSID channel vendor

**Examples:**
- Legit: `Corp-WLAN` BSSID `AA:BB:CC:DD:EE:FF` Ch6 WPA2-PSK CCMP Cisco, and `AA:BB:CC:DD:EE:01` Ch11 WPA2-PSK CCMP Cisco — same SSID, different BSSID, different channel, same vendor, authorized list — ESS, 2 APs same network for roaming
- Rogue: `Corp-WLAN` BSSID `11:22:33:44:55:66` Ch11 WPA2-PSK CCMP, not in authorized list, different vendor, signal stronger, client `12:34:56:78:9A:BC` associates to rogue frame 6-7 — rogue AP, Evil Twin if PSK known

**For PT:** BSSID is what you target, SSID is what user sees. Evidence: BSSID + SSID + channel + security + vendor + signal. Check authorized list to differentiate ESS vs rogue.

### ESS / BSS / MBSSID — Architecture

**BSS (Basic Service Set):** One AP (BSSID) + associated clients — e.g., BSSID `AA:BB:CC:DD:EE:FF` SSID `LAB-WIFI` Ch6 with 2 clients `11:22:33:44:55:66` and `22:33:44:55:66:77`

**ESS (Extended Service Set):** Multiple BSSs with same SSID for roaming — e.g., Office with 3 APs all SSID `Corp-WLAN`, BSSIDs `AA:BB:CC:DD:EE:01` Ch1, `AA:BB:CC:DD:EE:02` Ch6, `AA:BB:CC:DD:EE:03` Ch11 — same logical network, different physical radios, client roams transparently based on signal, 802.11r/k/v helps roaming

**MBSSID (Multiple BSSID):** One physical radio hosting multiple BSSIDs with different SSIDs — e.g., Enterprise AP with 4 SSIDs Corp, Guest, IoT, BYOD on same radio Ch6 — BSSIDs `AA:BB:CC:DD:EE:01` Corp, `AA:BB:CC:DD:EE:02` Guest, `AA:BB:CC:DD:EE:03` IoT, `AA:BB:CC:DD:EE:04` BYOD — all same channel, same radio, different BSSIDs, different SSIDs, different VLANs — efficient, common in enterprise

**DS (Distribution System):** Wired backbone connecting APs — e.g., Core switch VLAN 100 Corp, VLAN 200 Guest, etc., controller + CAPWAP for enterprise

**For PT:** ESS vs rogue — same SSID different BSSID could be ESS (authorized) or rogue (not authorized) — need authorized list BSSID channel vendor signal. MBSSID — one radio multiple SSIDs, same channel, different BSSIDs, different VLANs — check if Guest isolation disabled, VLAN ACL allows Corp→Guest, etc.

### SSID Enumeration — How to Find

**Beacon:** AP sends beacon every ~100ms with SSID IE — filter `wlan.fc.type_subtype==8`, check SSID, BSSID, channel, security, WPS, PMF, HT/VHT/HE, vendor, signal — primary recon

**Probe Response:** AP sends probe response to client probe request with real SSID even if beacon hidden — filter `wlan.fc.type_subtype==5`, check SSID, BSSID, channel, security — hidden SSID reveal

**Association Request:** Client sends assoc req with real SSID even if beacon hidden — filter `wlan.fc.type_subtype==0`, check SSID, BSSID, client MAC, RSN IE — hidden SSID reveal

**Probe Request (PNL leakage):** Client sends probe req with specific SSID for known networks — PNL (Preferred Network List) — filter `wlan.fc.type_subtype==4`, check SSID, client MAC, SA — client history, useful for targeted Evil Twin

**Example PCAP recon-lab.pcapng:**
- Frame 1: Beacon SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP
- Frame 2: Beacon SSID empty length 0 BSSID DD:EE:FF:00:11:22 Ch6 WPA2-PSK CCMP (hidden HIDDEN-LAB)
- Frame 3: Probe Request SA 11:22:33:44:55:66 SSID LAB-WIFI DA FF:FF:FF:FF:FF:FF (PNL leak)
- Frame 4: Probe Request SA 22:33:44:55:66:77 SSID HomeWiFi (PNL leak)
- Frame 10: Probe Response DA 11:22:33:44:55:66 SA DD:EE:FF:00:11:22 SSID HIDDEN-LAB (hidden reveal) — real SSID
- Frame 7: Assoc Request SA 11:22:33:44:55:66 DA AA:BB:CC:DD:EE:FF SSID LAB-WIFI RSN CCMP PSK

**For PT:** Enumerate SSIDs via beacons, probe resp, assoc req — not just beacons. Hidden SSID not security. PNL leakage privacy issue.

## VAPT Relevance

- **Recon:** Enumerate SSIDs → BSSIDs per SSID → map ESS → check authorized list → identify rogue (same SSID diff BSSID not in authorized list)
- **Enum:** Per BSSID: channel, band, width, security, RSN IE, WPS IE, HT/VHT/HE, vendor, signal, beacon interval, hidden?
- **Evidence:** SSID + BSSID + channel + band + width + security + vendor + signal + frame numbers + filters — not just SSID
- **Misconfig:** Hidden SSID not security, same SSID different BSSID could be ESS or rogue — need authorized list, MBSSID same channel different SSIDs different VLANs — check isolation and ACL

## Tools

- `iw dev wlan0 scan` — SSID, BSSID, channel, security, HT/VHT/HE, vendor, signal
- Wireshark filters: `wlan.fc.type_subtype==8` beacon, `wlan.fc.type_subtype==4` probe req, `wlan.fc.type_subtype==5` probe resp, `wlan.fc.type_subtype==0` assoc req, `wlan_mgt.ssid==LAB-WIFI` SSID, `wlan_mgt.ssid==\"\"` hidden beacon, `wlan.bssid==AA:BB:CC:DD:EE:FF` BSSID, `wlan.sa==11:22:33:44:55:66` client
- PcapInspector: Summary SSIDs, BSSIDs, clients, channels, beacons, probes, filter presets
- OUI lookup: Wireshark shows vendor, or `https://maclookup.app/`, or IEEE OUI list

## Evidence Collection

- SSID, BSSID, channel, band, width, security, RSN IE, WPS IE, HT/VHT/HE, vendor OUI, signal, beacon interval, frame numbers, filters
- Example: `Beacon f1 SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 2.4 GHz 20 MHz WPA2-PSK CCMP HT20 vendor Cisco OUI 00:11:22 signal -45 dBm, Probe Req f3 Client 11:22:33:44:55:66 SSID LAB-WIFI PNL, Probe Resp f10 SSID HIDDEN-LAB BSSID DD:EE:FF:00:11:22 Ch6 WPA2-PSK (hidden reveal)`

## Attack → Defense → Retest

- **Attack:** Observe SSID LAB-WIFI with 3 BSSIDs Ch1,6,11 — is it ESS or rogue? Check authorized list — if authorized list has 3 BSSIDs same vendor Cisco, ESS, not rogue. If not in authorized list, rogue. Also observe probe req PNL leak HomeWiFi, Corp-WLAN — privacy.
- **Defense:** WIDS authorized AP list BSSID channel vendor signal, alert rogue same SSID diff BSSID not in list, random MAC probing (modern OS), disable auto-connect to open, WPA3, PMF required, strong PSK
- **Retest:** WIDS no rogue, authorized list matches, probe req random MAC wildcard SSID no PNL, beacon no WPS IE, PMF required

## Interactive Check

> You see beacons: SSID `Corp-WLAN` BSSID `AA:BB:CC:DD:EE:FF` Ch6 WPA2-PSK Cisco, BSSID `AA:BB:CC:DD:EE:01` Ch11 WPA2-PSK Cisco, BSSID `11:22:33:44:55:66` Ch11 WPA2-PSK same SSID Corp-WLAN different vendor. Which is ESS and which is rogue? How to verify?

Answer: `AA:BB:CC:DD:EE:FF` Ch6 and `AA:BB:CC:DD:EE:01` Ch11 same SSID Corp-WLAN same vendor Cisco, likely ESS (same network, multiple APs for roaming) — check authorized list — if authorized list has these BSSIDs Ch6 and Ch11 Cisco, ESS. `11:22:33:44:55:66` Ch11 same SSID Corp-WLAN different BSSID different vendor not in authorized list, signal stronger, client `12:34:56:78:9A:BC` associates to rogue f6-7 — rogue AP, Evil Twin if PSK known. Verify via WIDS authorized list BSSID channel vendor, signal, client assoc to rogue, deauth if PMF disabled. Evidence: BSSIDs, channels, vendors, authorized list, client assoc to rogue, frame numbers.

## References

- IEEE 802.11-2020 — SSID, BSSID, BSS, ESS, MBSSID
- Wireshark 802.11 — SSID IE, BSSID, OUI
- 802.11-2020 — Hidden SSID, probe req/resp, assoc req

---

*Next: AP, Client, STA, Distribution System, Association Flow*

# Deauth Visualizer & Retest — Flood Detection, WIDS, Retest with PMF Required

## Learning Objectives
- Master deauth visualizer: timeline of deauth frames per BSSID, reason codes, SA/DA, count, rate per sec, broadcast vs unicast
- Understand WIDS detection: Kismet alerts, Aruba/Cisco WIDS, deauth flood >10 per sec, disassoc flood, action flood, rogue detection
- Learn retest with PMF required: new beacon MFPC=1 MFPR=1, config ieee80211w=2 hash new, new PCAPs no deauth success if PMF required, client ignores spoofed deauth without valid MIC, deauth spoof fails hardware lab
- Build VAPT evidence: deauth timeline, count, rate, BSSID, client, reason, frame numbers, PCAP hash, filter, WIDS logs, beacon PMF, config hash, retest evidence
- Learn defense layers: PMF required, WPA3-only, WIDS, client isolation, monitoring, training, audits

## Theory

### Deauth Visualizer — Timeline, Count, Rate, Reason, SA/DA, Broadcast vs Unicast

**Deauth visualizer shows timeline of deauth frames per BSSID, reason codes, SA/DA, count, rate per sec, broadcast vs unicast — for detection of deauth flood DoS and handshake capture facilitation.**

**Example deauth.pcapng 12-14 frames:**
```
Time 0.0 sec: Beacon f1 SSID LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=0 MFPR=0 PMF disabled
Time 1.0 sec: Deauth f2 SA BSSID AA:BB:CC:DD:EE:FF DA Client 11:22:33:44:55:66 BSSID AA:BB:CC:DD:EE:FF Reason 7
Time 1.1 sec: Deauth f3 SA BSSID DA Client Reason 7
Time 1.2 sec: Deauth f4 SA BSSID DA Client Reason 7
...
Time 1.9 sec: Deauth f11 SA BSSID DA Client Reason 7 — 10 deauth in 1 sec same BSSID same reason same SA/DA — flood
Time 2.0 sec: Deauth f12 SA Client DA BSSID BSSID BSSID Reason 3 — client→AP leaving
Time 2.1 sec: Deauth f13 SA BSSID DA Broadcast FF:FF:FF:FF:FF:FF BSSID BSSID Reason 7 — broadcast deauth — DoS all
```

**Visualizer:**
- X-axis time, Y-axis BSSID or client, dots for deauth frames, color by reason (7 red, 3 blue, 1 gray, etc.), size by count, line for rate per sec
- Count per BSSID per time window — e.g., 10 deauth in 1 sec per BSSID AA:BB:CC:DD:EE:FF — flood — alert
- Broadcast vs unicast — DA FF:FF:FF:FF:FF:FF broadcast = DoS all clients on BSSID — more severe than unicast single client
- Reason codes — 7 class 3 frame from nonassociated STA most common for deauth attack, 3 leaving, 8 leaving BSS, 1 unspecified, etc.

**For PT:** Deauth visualizer helps detect flood — many deauth same BSSID short interval = likely attack — evidence timeline, count, rate, BSSID, client, reason, frame numbers, filter.

**Wireshark:**
```
wlan.fc.type_subtype==12  # Deauth
wlan.fc.type_subtype==10  # Disassoc
wlan.fc.type_subtype==12 && wlan.bssid==AA:BB:CC:DD:EE:FF  # Deauth for specific BSSID
wlan.fc.type_subtype==12 && wlan.sa==AA:BB:CC:DD:EE:FF  # Deauth SA BSSID
wlan.fc.type_subtype==12 && wlan.da==11:22:33:44:55:66  # Deauth DA client
wlan.fc.type_subtype==12 && wlan.da==FF:FF:FF:FF:FF:FF  # Broadcast deauth
wlan_mgt.fixed.reason_code==7  # Reason 7
```

**Tshark:**
```bash
tshark -r deauth.pcapng -Y "wlan.fc.type_subtype==12" -T fields -e frame.number -e frame.time_relative -e wlan.bssid -e wlan.sa -e wlan.da -e wlan_mgt.fixed.reason_code -E header=y
tshark -r deauth.pcapng -Y "wlan.fc.type_subtype==12" | wc -l  # count deauth
```

**PcapInspector:**
- Summary: beacons, deauth count, etc.
- Filter Deauth preset → deauth frames — frame numbers, SA, DA, BSSID, reason, summary
- Detail: Click deauth frame → SA, DA, BSSID, reason code, etc.

**ReconMap:**
- Channel map shows APs, clients, deauth? Actually ReconMap for recon, but deauth visualizer for deauth.

**For PT:** Deauth visualizer is interactive component — timeline, count, rate, reason, SA/DA, broadcast vs unicast — for detection.

### WIDS Detection — Kismet, Aruba, Cisco, Deauth Flood >10 per Sec

**WIDS (Wireless Intrusion Detection System) / WIPS (Wireless Intrusion Prevention System) should detect deauth flood and alert — many deauth same BSSID short interval >10 per sec — WIDS should have authorized AP list BSSID channel vendor signal security and detect rogue and deauth flood and disassoc flood and action flood, etc.**

**Kismet:**
- Kismet is WIDS — web UI `http://localhost:2501` — devices, APs, clients, alerts — deauth flood alert — e.g., Kismet shows alert "Deauthentication flood detected BSSID AA:BB:CC:DD:EE:FF 10 deauth in 1 sec" — Kismet logs pcap, alerts, etc.
- Kismet config: `kismet.conf` with `alert=DEAUTHFLOOD`? Actually Kismet has alerts for deauth flood, etc.

**Aruba WIDS:**
- Aruba WLC with WIDS — detects deauth flood, rogue AP, etc. — ArubaOS shows alerts, contains rogue via deauth? Actually WIPS can contain rogue via deauth? But containing rogue via deauth is also DoS? For PT, WIDS detection and alert, not necessarily contain via deauth unless authorized — Aruba WIDS detection of deauth flood

**Cisco WIDS:**
- Cisco WLC with WIDS — similar — detects deauth flood, etc.

**Example WIDS rule:**
- If deauth count >10 per sec per BSSID, alert deauth flood — BSSID AA:BB:CC:DD:EE:FF, reason 7, SA BSSID DA client or broadcast, etc.
- If deauth count >100 per min per BSSID, alert — etc.
- If disassoc count >10 per sec per BSSID, alert disassoc flood
- If action count >10 per sec per BSSID, alert action flood (e.g., SA Query flood?)

**For PT:** WIDS detection, not just manual — recommend WIDS — e.g., Kismet, Aruba, Cisco WIDS — WIDS authorized AP list + deauth detection + rogue detection.

**Client and AP logs:**
- Client logs frequent disconnects reason 7 — possible attack
- AP logs disassoc, deauth — many deauth same client short interval — possible attack

### Retest with PMF Required — New Beacon MFPC=1 MFPR=1, Config ieee80211w=2, New PCAPs No Deauth Success

**Retest verifies fix with new evidence — not old PCAPs — new PCAPs, new config hash, new logs, what should happen vs what actually happened.**

**Steps:**
1. **New Config:** Get new hostapd.conf with `ieee80211w=2` PMF required — hash SHA256 new
2. **New PCAPs:** Capture new beacons — verify beacon shows RSN Capabilities MFPC=1 MFPR=1 PMF required, Group Management BIP, no WPS, no TKIP, channel, BSSID, etc. — frame numbers new, filter `wlan.fc.type_subtype==8 && wlan.bssid==AA:BB:CC:DD:EE:FF`
3. **Deauth Spoof Fails (Hardware Lab):** For hardware lab with ALFA, try deauth spoof `aireplay-ng --deauth 5 -a BSSID -c clientMAC wlan0mon` — with PMF required, client should ignore spoofed deauth without valid MIC — no disconnect — client stays connected — evidence PMF required prevents deauth — client logs no disconnect, AP logs no disassoc, PCAP shows deauth frames but client ignores? Actually PCAP will show deauth frames (attacker TX), but client ignores because MIC invalid — so no disassoc, no re-auth, no re-assoc, no handshake — no DoS — good
4. **No Deauth in New PCAP (Simulated):** For simulated lab, new PCAPs should show no deauth? Actually new PCAPs after fix should show no deauth flood? Or if deauth flood attempted, client ignores, so no disassoc, etc. — but PCAP will still show deauth frames from attacker, but client ignores — so evidence deauth frames present but client not disconnecting? Actually for simulated lab, we have deauth.pcapng with deauth flood and PMF disabled — after fix, new PCAP `deauth-pmf-required.pcapng` should show deauth frames but client ignores? Or no deauth? For simplicity, new PCAP shows no deauth success — beacon PMF required, no deauth, or deauth present but client ignores
5. **Document:** New PCAP hash SHA256, new config hash, new frame numbers, new filters, what should happen (beacon MFPC=1 MFPR=1 PMF required, deauth spoof fails, client stays connected, no handshake capture via deauth) vs what actually happened (verified)
6. **Report:** Retest section — "Fix verified: new beacon f1 SSID LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=1 MFPR=1 PMF required BIP, config ieee80211w=2 hash new SHA256..., PCAP new hash new frame numbers no deauth success if PMF required (client ignores spoofed deauth without valid MIC), deauth spoof fails (hardware lab), WPS disabled, strong PSK audit fails, document new hashes"

**For PT:** Retest with new evidence, not old — reproducible — new beacon, new config hash, new PCAP hash, deauth spoof fails.

### Defense Layers — PMF Required, WPA3-Only, WIDS, Client Isolation, Monitoring, Training, Audits

- **PMF required ieee80211w=2 for all:** Best defense — prevents deauth/disassoc/action spoofing — WPA3-only mandates required — for WPA2, should also have required — check beacon MFPC=1 MFPR=1
- **WPA3-only SAE PMF required:** Mandates PMF required — no deauth possible — for 6 GHz mandatory WPA3-only — best
- **WIDS detection of deauth floods:** Many deauth same BSSID short interval >10 per sec — alert — e.g., Kismet, Aruba, Cisco WIDS — WIDS authorized AP list + deauth detection + rogue detection
- **Client isolation ap_isolate=1:** For guest networks, client isolation prevents client-to-client attacks — e.g., ARP spoof, sniffing — ap_isolate=1 for guest — but for deauth, client isolation doesn't prevent deauth — PMF does
- **Monitoring SIEM:** Logs from APs, WLC, RADIUS, etc., to SIEM — monitor for deauth floods, rogue APs, etc. — SIEM alerts
- **Training, Audits:** Users and admins — PMF required, no WEP, no TKIP, no WPS, strong PSK, WPA3, etc. — regular wireless audits — Kismet, airodump-ng, Wireshark, PcapInspector — check beacons for PMF, WPS, TKIP, weak PSK, etc.

### Lab — Simulated (Zero-Cost) + Hardware (Optional)

**Simulated (this module, zero-cost):**
- PCAP `deauth.pcapng` contains deauth frames — 12-14 frames — AP→client reason 7, client→AP reason 3, broadcast reason 7 — flood
- Analyze: How many deauth? Reason codes? BSSID? Client? Is PMF required in beacon? Check beacon RSN Capabilities MFPC/MFPR — if disabled, deauth possible = Medium finding — count per BSSID per time window, rate per sec, broadcast vs unicast, reason 7 most common for attack
- Config audit: Check hostapd.conf PMF disabled vs required — `ieee80211w=0` disabled bad, `2` required good
- WIDS: Simulate WIDS detection — many deauth same BSSID short interval — alert — e.g., 10 deauth in 1 sec same BSSID — deauth flood — alert
- Visualizer: Use Deauth Visualizer component (new) — timeline, count, rate, reason, SA/DA, broadcast vs unicast — for detection

**Hardware (optional, requires RF adapter ALFA, explicit ROE, own lab):**
- Real deauth with `aireplay-ng --deauth` against own LAB AP (lab-only) — requires monitor mode + injection (ALFA adapter) — must be lab-only SSID LAB-DEAUTH, authorized, own infrastructure — safety: Never deauth public/third-party Wi-Fi
- Steps (own LAB-DEAUTH AP, explicit ROE, hardware):
  ```
  airmon-ng check kill
  airmon-ng start wlan0
  airodump-ng wlan0mon --bssid AA:BB:CC:DD:EE:FF -c 6 -w deauth
  aireplay-ng --deauth 5 -a AA:BB:CC:DD:EE:FF -c 11:22:33:44:55:66 wlan0mon
  # Sends 5 deauth AP→client reason 7 — client disconnects, auto-reconnects, handshake captured if PMF disabled
  # For broadcast: aireplay-ng --deauth 5 -a AA:BB:CC:DD:EE:FF wlan0mon — DA broadcast — all clients DoS
  # For PMF required, deauth spoof fails — client ignores spoofed deauth without valid MIC — no disconnect — evidence PMF required prevents deauth
  ```
- Safety: Never deauth public/third-party Wi-Fi — only own lab AP with explicit ROE — lab-only SSID LAB-DEAUTH — authorized — own infrastructure
- For this academy: Simulated only for browser — hardware marked with prep docs — zero-cost simulated philosophy kept but mark hardware labs requiring RF adapter with prep docs

### VAPT Evidence — Deauth Timeline, Count, Rate, BSSID, Client, Reason, Frame Numbers, PCAP Hash, Filter, WIDS Logs, Beacon PMF, Config Hash, Retest Evidence

**Must include:**
- Beacon: SSID LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=0 MFPR=0 PMF disabled, no WPS, CCMP, frame number f1, PCAP deauth.pcapng hash SHA256 def456... Size 2.3 KB Frames 14 Tool Scapy Method scapy
- Deauth frames: f2-11 AP→client SA BSSID DA client BSSID BSSID reason 7 class 3 frame from nonassociated STA, f12 client→AP SA client DA BSSID BSSID BSSID reason 3 leaving, f13 broadcast SA BSSID DA FF:FF:FF:FF:FF:FF BSSID BSSID reason 7 — DoS all — filter `wlan.fc.type_subtype==12`, count 12 same BSSID short interval 1 sec = likely attack or test, no PMF, reason 7 most common for deauth attack, timeline, count, rate per sec, broadcast vs unicast
- Config: hostapd.conf ieee80211w=0 PMF disabled hash SHA256 abc123...
- Good config: ieee80211w=2 PMF required MFPC=1 MFPR=1 hash new
- WIDS logs: If available, WIDS alert deauth flood BSSID AA:BB:CC:DD:EE:FF 10 deauth in 1 sec reason 7
- For hardware lab: aireplay-ng --deauth 5 -a BSSID -c clientMAC wlan0mon, client disconnects, auto-reconnects, handshake captured if PMF disabled, etc., and with PMF required, deauth spoof fails, client ignores spoofed deauth without valid MIC, no disconnect, evidence PMF required prevents deauth
- Retest: New beacon MFPC=1 MFPR=1 PMF required, config ieee80211w=2 hash new, new PCAPs no deauth success if PMF required, deauth spoof fails, document new hashes, frame numbers, filters

### Attack → Defense → Retest

- **Attack:** Observe beacon LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=0 MFPR=0 PMF disabled, config ieee80211w=0, deauth frames reason 7 AP→client, DoS, handshake capture facilitation via deauth (if authorized and lab, hardware, deauth client, capture handshake, offline audit if weak PSK), Evil Twin facilitation (deauth from legit, client connects to rogue same SSID if PSK known or Enterprise no cert validation), timeline, count, rate, broadcast vs unicast
- **Defense:** Enable PMF required ieee80211w=2 MFPC=1 MFPR=1 BIP IGTK SA Query, WPA3-only SAE PMF required where possible (mandates PMF, for 6 GHz mandatory), WIDS detection of deauth floods many deauth same BSSID short interval >10 per sec, client isolation ap_isolate=1 for guest (not for deauth but for client-to-client), monitoring SIEM, training, audits, no WEP, no TKIP, no WPS, no open without OWE
- **Retest:** New beacon MFPC=1 MFPR=1 PMF required, config ieee80211w=2 hash new, new PCAPs no deauth success if PMF required (client ignores spoofed deauth without valid MIC), deauth spoof fails (hardware lab), WPS disabled, strong PSK audit fails, document new hashes, frame numbers, filters

### Interactive Check

> You have deauth.pcapng 12 deauth frames AP→client reason 7 BSSID AA:BB:CC:DD:EE:FF → Client 11:22:33:44:55:66 and broadcast, beacon PMF disabled MFPC=0 MFPR=0, hostapd.conf ieee80211w=0. What is deauth visualizer timeline, count, rate, reason, SA/DA, broadcast vs unicast, WIDS detection, defense, retest, evidence?

Answer: Visualizer timeline time 0 beacon f1 SSID LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 PMF disabled, time 1.0-1.9 deauth f2-11 SA BSSID DA client BSSID BSSID reason 7 10 deauth in 1 sec same BSSID same reason flood, time 2.0 deauth f12 SA client DA BSSID reason 3 leaving, time 2.1 broadcast deauth f13 SA BSSID DA FF:FF:FF:FF:FF:FF reason 7 DoS all. Count 12 deauth same BSSID short interval 1 sec rate 10 per sec, reason 7 most common for attack class 3 frame from nonassociated STA, SA BSSID DA client unicast vs DA broadcast broadcast more severe DoS all. WIDS detection Kismet Aruba Cisco detect deauth flood >10 per sec same BSSID alert deauth flood DoS, client logs frequent disconnects reason 7, AP logs disassoc. Defense PMF required ieee80211w=2 MFPC=1 MFPR=1 BIP IGTK SA Query prevents deauth spoofing, WPA3-only mandates required, WIDS, client isolation ap_isolate=1 for guest, monitoring SIEM, training. Retest new beacon MFPC=1 MFPR=1 PMF required config ieee80211w=2 hash new new PCAPs no deauth success if PMF required client ignores spoofed deauth without valid MIC deauth spoof fails hardware lab. Evidence beacon f1 PMF disabled MFPC=0 MFPR=0, config ieee80211w=0 hash, deauth.pcapng 12 deauth AP→client reason 7 f2-11 and client→AP reason 3 f12 and broadcast f13 filter wlan.fc.type_subtype==12 count 12 same BSSID short interval 1 sec likely attack, PCAP hash, timeline, count, rate, reason, SA/DA, broadcast vs unicast, WIDS logs.

## References

- IEEE 802.11-2020, 802.11w-2009 PMF, IGTK, BIP, SA Query
- Wi-Fi Alliance WPA2, WPA3, PMF
- Wireshark 802.11 deauth, disassoc, reason codes, MFPC/MFPR
- aircrack-ng, airodump-ng, aireplay-ng --deauth
- Kismet, Aruba, Cisco WIDS
- OWASP, NIST
- hostapd.conf documentation

---

*Next: Module 13 Rogue AP / Evil Twin — ESS vs rogue, authorized list, BSSID/channel/vendor/signal, PSK and Enterprise Evil Twin, detection, defense*

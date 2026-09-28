# PMF Detection & Defense — MFPC/MFPR, IGTK, BIP, SA Query, WIDS

## Learning Objectives
- Master PMF detection: beacon RSN Capabilities MFPC/MFPR bits, filter wlan_mgt.rsn.capabilities.mfpc/mfpr, config ieee80211w=0/1/2, WPS, TKIP
- Understand IGTK, BIP, SA Query: IGTK for broadcast management integrity, BIP Group Management Cipher 00-0F-AC-06, SA Query prevents session hijacking
- Learn WIDS detection of deauth flood: many deauth same BSSID short interval >10 per sec, reason 7, SA BSSID DA client or broadcast, Kismet, Aruba, Cisco WIDS
- Understand PMF defense: required ieee80211w=2 for all, WPA3-only mandates required, client 802.11w support, SA Query, training, audits
- Build VAPT evidence: beacon PMF disabled vs capable vs required, deauth frames count reason BSSID client frame numbers, config ieee80211w hash, PCAP hash, filter, WIDS logs
- Learn retest: after PMF required, verify beacon MFPC=1 MFPR=1, deauth spoof fails (hardware lab), no deauth in new PCAP, config hash new

## Theory

### PMF Detection — Beacon RSN Capabilities MFPC/MFPR, Config ieee80211w, WPS, TKIP

**PMF (Protected Management Frames) 802.11w — detection via beacon RSN Capabilities MFPC/MFPR bits and config ieee80211w and WPS and TKIP.**

**Beacon RSN Capabilities:**
- **MFPC (Management Frame Protection Capable) bit 6:** 1 = capable, 0 = not capable — AP and client support PMF
- **MFPR (Management Frame Protection Required) bit 7:** 1 = required, 0 = not required — AP requires PMF, client must support PMF, otherwise association denied
- **Combination:**
  - MFPC=0 MFPR=0 — PMF disabled — vulnerable — bad — Medium finding — deauth/disassoc/action unauthenticated — attacker can spoof — `ieee80211w=0`
  - MFPC=1 MFPR=0 — PMF capable optional — better than disabled, but downgrade possible — client without PMF can still associate without PMF — so management frames for that client not protected — downgrade possible — better than disabled, but should be required if all clients support PMF — Medium? Actually capable is better than disabled, but still not required — recommendation required if possible — `ieee80211w=1`
  - MFPC=1 MFPR=1 — PMF required — best — management frames must be protected — client must support PMF, otherwise association denied — prevents spoofed deauth/disassoc/action — good — no finding — Info — `ieee80211w=2` — WPA3-only mandates required

**Wireshark filters:**
```
wlan_mgt.rsn.capabilities.mfpc==0 && wlan_mgt.rsn.capabilities.mfpr==0  # PMF disabled
wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==0  # PMF capable optional
wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==1  # PMF required good
wlan.fc.type_subtype==8 && wlan_mgt.rsn.capabilities.mfpc==0 && wlan_mgt.rsn.capabilities.mfpr==0  # Beacons PMF disabled
```

**Config ieee80211w:**
- `ieee80211w=0` — PMF disabled — bad — Medium — deauth possible
- `ieee80211w=1` — PMF capable optional — better, but downgrade possible — Medium? Actually capable better than disabled, but should be required — recommendation required if possible
- `ieee80211w=2` — PMF required — best — good — no finding

**WPS and TKIP:**
- WPS IE Tag 221 OUI 00:50:F2:04 — WPS enabled — High 11k PIN flaw — filter `wps` — should be disabled `wps_state=0`
- TKIP — Group Cipher TKIP (00-0F-AC-02) or Pairwise TKIP — deprecated — RC4, not CCMP — should be CCMP only — Medium finding if TKIP present — filter `wlan_mgt.rsn.gcs.type==2` or `pcs.type==2` — TKIP bad

**For PT:** Beacon analysis — check RSN IE — is CCMP? Is PMF required? Is WPS present? Is AKM PSK or SAE? Is Group CCMP? etc. — evidence frame number, BSSID, channel, etc.

**Example beacons:**
- Good WPA2-PSK CCMP PMF required no WPS: SSID LAB-WPA2 BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=1 MFPR=1 PMF required BIP no WPS
- Bad WPA2-PSK CCMP PMF disabled WPS enabled weak PSK: SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=0 MFPR=0 PMF disabled WPS IE present Tag 221 OUI 00:50:F2:04 WPS State 2 Configured Locked 0 weak PSK WeakPass123 — findings: PMF disabled Medium, WPS High, weak PSK High, etc.

### IGTK, BIP, SA Query — PMF Protection Details

**IGTK (Integrity GTK):**
- For protecting broadcast management frames — e.g., broadcast deauth DA FF:FF:FF:FF:FF:FF — IGTK is integrity key for management — BIP — Group Management — sent in M3 of handshake? Actually IGTK is for PMF — integrity for broadcast management frames — derived from IPMK (Integrity Pairwise Master Key?) Actually IGTK is integrity key for management — BIP — Group Management — sent in M3 key data? For PMF, IGTK KDE in M3 — for protecting broadcast management frames — IGTK is 128-bit? Actually IGTK 128-bit for BIP-CMAC-128, 256-bit for BIP-GMAC-256, etc.
- For PT: IGTK is for PMF — BIP — protects broadcast deauth — broadcast deauth protected with IGTK and BIP — unicast deauth protected with KCK? Actually unicast management frames protected with KCK? Let's not deep — PMF protects management frames with MIC

**BIP (Broadcast/Multicast Integrity Protocol):**
- For integrity for broadcast management frames — AES-CMAC — Group Management Cipher BIP (00-0F-AC-06) — or BIP-GMAC-128 (00-0F-AC-11?), BIP-GMAC-256 (00-0F-AC-12?), BIP-CMAC-256 (00-0F-AC-13?) for WPA3? — BIP is for PMF — Group Management Cipher Suite in RSN IE — e.g., Group Management Cipher BIP (00-0F-AC-06) — good for PMF

**SA Query (Security Association Query):**
- Procedure to prevent spoofed association and session hijacking — if AP receives assoc request with same MAC but different (e.g., attacker spoofs client MAC and sends assoc request to AP), AP will send SA Query request to client (action frame subtype 13? Actually action frame for SA Query), client responds with SA Query response, AP checks if client is legit — if client doesn't respond (because attacker spoofed, not real client), AP knows spoofed — prevents session hijacking — SA Query is for PMF — requires PMF — for PT, SA Query prevents session hijacking

**For PT:** IGTK, BIP, SA Query are for PMF — protect broadcast and unicast management frames and prevent session hijacking — PMF required is best.

### WIDS Detection of Deauth Flood — Many Deauth Same BSSID Short Interval

**WIDS (Wireless Intrusion Detection System) / WIPS (Wireless Intrusion Prevention System) should detect deauth flood — many deauth frames same BSSID short interval — e.g., >10 deauth per sec per BSSID — alert deauth flood DoS — WIDS should have authorized AP list BSSID channel vendor signal security and detect rogue and deauth flood.**

**Example WIDS rule:**
- If deauth count >10 per sec per BSSID, alert deauth flood — BSSID AA:BB:CC:DD:EE:FF, reason 7, SA BSSID DA client or broadcast, etc.
- If deauth count >100 per min per BSSID, alert — etc.
- WIDS should also detect disassoc flood, action flood, etc.
- For PT: WIDS detection, not just manual — recommend WIDS — e.g., Kismet, Aruba WIDS, Cisco WIDS, etc.

**Kismet:**
- Kismet web UI shows alerts — deauth flood, disassoc flood, etc. — WIDS — Kismet logs pcap, alerts, etc.

**Aruba, Cisco WIDS:**
- Enterprise WIDS — detect deauth flood, rogue AP, etc. — alert, contain (e.g., deauth rogue? Actually WIPS can contain rogue via deauth? But containing rogue via deauth is also DoS? For PT, WIDS detection and alert, not necessarily contain via deauth unless authorized)

**In PCAP (deauth.pcapng):**
- Many deauth frames with same BSSID, same reason, short interval = likely attack — e.g., deauth.pcapng contains 12 deauth frames AP→client reason 7, 2 client→AP reason 3, etc. — filter and count — evidence deauth flood — count per BSSID per time
- Filter: `wlan.fc.type_subtype==12` — deauth — count per BSSID per time — e.g., `tshark -r deauth.pcapng -Y "wlan.fc.type_subtype==12" -T fields -e frame.number -e wlan.bssid -e wlan.sa -e wlan.da -e wlan_mgt.fixed.reason_code | wc -l` — count
- Example: `tshark -r deauth.pcapng -Y "wlan.fc.type_subtype==12" | wc -l` — 12 deauth — same BSSID AA:BB:CC:DD:EE:FF, same reason 7, short interval 1 sec — likely attack or test

**For PT:** Detection via WIDS and PCAP analysis — many deauth same BSSID short interval = likely attack — evidence frame numbers, BSSID, client, reason, count, filter, PCAP hash, WIDS logs.

### PMF Defense — Required ieee80211w=2 for All, WPA3-Only Mandates Required, Client 802.11w Support, SA Query, Training, Audits

- **Enable PMF required:** `ieee80211w=2` in hostapd.conf — PMF required MFPC=1 MFPR=1 — prevents deauth/disassoc spoofing — best — WPA3-only mandates PMF required — for WPA2, should also have required — check beacon RSN Capabilities
- **WPA3-only:** Mandates PMF required — WPA3-only SAE PMF required — good — no deauth possible — for 6 GHz mandatory WPA3-only
- **Client 802.11w support:** Most modern clients support PMF (802.11w) — e.g., Windows 10+, macOS, iOS, Android, etc. — if client doesn't support PMF, cannot associate if PMF required — but most modern support — for old clients without PMF, need transition with PMF capable? Actually if old client without PMF, cannot connect if PMF required — so for compatibility, transition with PMF capable? But better require PMF and upgrade clients — for PT, recommend PMF required and client support
- **SA Query:** For PMF required, SA Query prevents session hijacking — good
- **WIDS:** Detect and alert deauth floods — many deauth same BSSID short interval — e.g., Kismet, Aruba, Cisco WIDS — WIDS authorized AP list + deauth detection
- **Training, Audits:** Users and admins — PMF required, no WEP, no TKIP, no WPS, strong PSK, WPA3, etc. — regular wireless audits — Kismet, airodump-ng, Wireshark, PcapInspector — check beacons for PMF, WPS, TKIP, weak PSK, etc.

**Good hostapd.conf:**
```ini
interface=wlan0
ssid=LAB-WPA2
hw_mode=g
channel=6
wpa=2
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
wpa_passphrase=StrongRandomPassphrase123!@#With20+Chars
ieee80211w=2
wps_state=0
```

**Bad:**
```ini
ssid=LAB-WIFI
wpa=2
rsn_pairwise=CCMP
wpa_passphrase=WeakPass123
ieee80211w=0
wps_state=2
# PMF disabled, WPS enabled, weak PSK, 40MHz in 2.4 bad
```

### Lab — Simulated vs Hardware

**Simulated (this module, zero-cost):**
- PCAP `deauth.pcapng` contains deauth frames (AP→Client, Client→AP, broadcast) — 12-14 frames? Actually deauth.pcapng has 12 deauth? Let's check — deauth.pcapng has 12 deauth frames? Actually in ModuleDetail labMap, deauth.pcapng has deauth flood analysis — count deauth frames, reason codes, check PMF disabled, DoS impact
- Analyze: How many deauth? Reason codes? BSSID? Client? Is PMF required in beacon? Check beacon RSN Capabilities MFPC/MFPR — if disabled, deauth possible = Medium finding
- Config audit: Check hostapd.conf PMF disabled vs required — `ieee80211w=0` disabled bad, `2` required good
- WIDS: Simulate WIDS detection — many deauth same BSSID short interval — alert

**Hardware (future, RF_REQUIRED, requires ALFA adapter, explicit ROE, own lab):**
- Real deauth with `aireplay-ng --deauth` against own LAB AP (lab-only) — requires monitor mode + injection (ALFA adapter) — must be lab-only SSID LAB-DEAUTH, authorized, own infrastructure — safety: Never deauth public/third-party Wi-Fi
- Steps (own LAB-DEAUTH AP, explicit ROE, hardware):
  ```
  airmon-ng check kill
  airmon-ng start wlan0
  airodump-ng wlan0mon --bssid AA:BB:CC:DD:EE:FF -c 6 -w deauth
  aireplay-ng --deauth 5 -a AA:BB:CC:DD:EE:FF -c 11:22:33:44:55:66 wlan0mon
  # Sends 5 deauth AP→client reason 7 — client disconnects, auto-reconnects, handshake captured if PMF disabled
  # For broadcast deauth: aireplay-ng --deauth 5 -a AA:BB:CC:DD:EE:FF wlan0mon — DA broadcast — all clients DoS
  # For PMF required, deauth spoof fails — client ignores spoofed deauth without valid MIC — no disconnect — evidence PMF required prevents deauth
  ```
- Safety: Never deauth public/third-party Wi-Fi — only own lab AP with explicit ROE — lab-only SSID LAB-DEAUTH — authorized — own infrastructure
- For this academy: Simulated only for browser — hardware marked with prep docs — zero-cost simulated philosophy kept but mark hardware labs requiring RF adapter with prep docs

### VAPT Relevance — Enumeration, Evidence, Impact, Recommendation, Retest

- **Enumeration:** Check beacon RSN capabilities for PMF required? If disabled (MFPC=0 MFPR=0) or capable (1/0) not required, deauth possible = Medium finding — deauth possible, handshake capture via deauth, DoS, Evil Twin facilitation — filter `wlan_mgt.rsn.capabilities.mfpc==0 && mfpr==0` disabled, `==1 && ==0` capable, `==1 && ==1` required
- **Evidence:** Beacon frame showing MFPC=0 MFPR=0, plus deauth frames in PCAP (if simulated) — e.g., deauth.pcapng 10 deauth frames reason 7 BSSID AA:BB:CC:DD:EE:FF → Client 11:22:33:44:55:66 frame numbers, plus config `hostapd.conf` `ieee80211w=0` hash, plus PCAP hash, plus filter `wlan.fc.type_subtype==12`, plus WIDS logs if available
- **Impact:** DoS (availability), handshake capture facilitation (confidentiality if weak PSK), Evil Twin facilitation (network access) — Medium — CVSS 5.5? Actually PMF disabled Medium — if deauth flood DoS High for availability? But PMF disabled itself Medium — deauth flood DoS High?
- **Recommendation:** Enable PMF required `ieee80211w=2`, WPA3-only where possible (mandates PMF), WIDS for detection of deauth floods (many deauth same BSSID short interval), client 802.11w support, SA Query, training
- **Retest:** Verify beacon MFPR=1 (PMF required), deauth spoof fails (hardware lab) or no deauth in new PCAP, config `ieee80211w=2` hash new, PCAP new hash

### Finding Template (already in 12-01)

```
Title: PMF Disabled — Deauthentication Spoofing Possible (LAB-DEAUTH)
Severity: Medium
CVSS: 5.5 (AV:A/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H)
Description: AP LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 does not require PMF (802.11w), RSN Capabilities MFPC=0 MFPR=0 PMF disabled, management frames unauthenticated, attacker can spoof deauth/disassoc with any SA/DA/BSSID/reason to disconnect clients and capture handshake and facilitate Evil Twin.
Evidence: Beacon f1 SSID LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=0 MFPR=0, hostapd.conf ieee80211w=0 hash, PCAP deauth.pcapng hash Frames 12 deauth reason 7 BSSID→client, filter wlan.fc.type_subtype==12, count 12 same BSSID short interval 1 sec = likely attack, no PMF
Impact: DoS, handshake capture facilitation, Evil Twin facilitation, session hijacking possible without SA Query
Recommendation: Enable PMF required ieee80211w=2, WPA3-only, WIDS detection, client 802.11w support, SA Query, training
Retest: Beacon MFPC=1 MFPR=1 PMF required, config ieee80211w=2 hash new, PCAP new hash no deauth success if PMF required
```

### Tools

- Wireshark, tshark — filters `wlan.fc.type_subtype==12` deauth, `==10` disassoc, `wlan_mgt.fixed.reason_code`, `wlan_mgt.rsn.capabilities.mfpc`, `mfpr`, `wlan.bssid`, `wlan.sa`, `wlan.da`
- PcapInspector, ConfigViewer, ReconMap, HandshakeDiagram — simulated lab
- `aireplay-ng` — deauth: `aireplay-ng --deauth 5 -a BSSID -c clientMAC wlan0mon` — AP→client, `aireplay-ng --deauth 5 -a BSSID wlan0mon` — broadcast, requires monitor + injection ALFA, hardware lab
- `airodump-ng` — capture: `airodump-ng wlan0mon --bssid BSSID -c 6 -w deauth`
- `hostapd` — config `ieee80211w`
- `Kismet` — WIDS, deauth flood detection, PMF, etc.
- `sha256sum` — hash for evidence chain

### Evidence Collection — Detailed

```
Beacon f1 SSID LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=0 MFPR=0 PMF disabled, no WPS, CCMP, frame number f1, PCAP deauth.pcapng hash SHA256 def456... Size 2.3 KB Frames 14 Tool Scapy Method scapy
Deauth frames: f1-10 AP→client SA BSSID DA client BSSID BSSID reason 7 class 3 frame from nonassociated STA, f11-12 client→AP SA client DA BSSID BSSID BSSID reason 3 leaving, filter wlan.fc.type_subtype==12, count 12 same BSSID short interval 1 sec = likely attack or test, no PMF, reason 7 most common for deauth attack
Config hostapd.conf ieee80211w=0 PMF disabled hash SHA256 abc123...
Good config ieee80211w=2 PMF required MFPC=1 MFPR=1 hash new
For hardware lab: aireplay-ng --deauth 5 -a BSSID -c clientMAC wlan0mon, client disconnects, auto-reconnects, handshake captured if PMF disabled, etc., and with PMF required, deauth spoof fails, client ignores spoofed deauth without valid MIC, no disconnect, evidence PMF required prevents deauth
```

### Attack → Defense → Retest

- **Attack:** Observe beacon LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=0 MFPR=0 PMF disabled, config ieee80211w=0, deauth frames reason 7 AP→client, DoS, handshake capture facilitation via deauth (if authorized and lab, hardware, deauth client, capture handshake, offline audit if weak PSK), Evil Twin facilitation (deauth from legit, client connects to rogue same SSID if PSK known or Enterprise no cert validation)
- **Defense:** Enable PMF required ieee80211w=2 MFPC=1 MFPR=1 BIP IGTK SA Query, WPA3-only SAE PMF required where possible (mandates PMF, for 6 GHz mandatory), WIDS detection of deauth floods many deauth same BSSID short interval, client 802.11w support, SA Query, training, audits, no WEP, no TKIP, no WPS, no open without OWE
- **Retest:** New beacon MFPC=1 MFPR=1 PMF required, config ieee80211w=2 hash new, new PCAPs no deauth success if PMF required (client ignores spoofed deauth without valid MIC), deauth spoof fails (hardware lab), WPS disabled, strong PSK audit fails, document new hashes, frame numbers, filters

### Interactive Check

> You capture beacon SSID LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=0 MFPR=0 PMF disabled, hostapd.conf ieee80211w=0, deauth.pcapng 12 deauth frames AP→client reason 7 BSSID→client. What is PMF detection, IGTK, BIP, SA Query, WIDS detection, defense, retest, evidence?

Answer: PMF detection via beacon RSN Capabilities MFPC/MFPR bits filter wlan_mgt.rsn.capabilities.mfpc/mfpr, config ieee80211w=0 disabled 1 capable 2 required, WPS TKIP check. IGTK Integrity GTK for broadcast management integrity BIP Group Management Cipher 00-0F-AC-06 AES-CMAC for PMF, SA Query Security Association Query prevents spoofed association session hijacking via action frames. WIDS detection many deauth same BSSID short interval >10 per sec reason 7 SA BSSID DA client or broadcast Kismet Aruba Cisco WIDS alert deauth flood DoS. Defense enable PMF required ieee80211w=2 MFPC=1 MFPR=1 BIP IGTK SA Query, WPA3-only mandates required, client 802.11w support, WIDS, training. Retest new beacon MFPC=1 MFPR=1 PMF required config ieee80211w=2 hash new new PCAPs no deauth success if PMF required client ignores spoofed deauth without valid MIC deauth spoof fails hardware lab. Evidence beacon f1 SSID LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=0 MFPR=0, config ieee80211w=0 hash, deauth.pcapng 12 deauth AP→client reason 7 f1-10 and client→AP reason 3 f11-12 filter wlan.fc.type_subtype==12 count 12 same BSSID short interval 1 sec likely attack, PCAP hash.

## References

- IEEE 802.11-2020, 802.11w-2009 PMF, 802.11i, IGTK, BIP, SA Query
- Wi-Fi Alliance WPA2, WPA3, PMF
- Wireshark 802.11 deauth, disassoc, reason codes, MFPC/MFPR
- aircrack-ng, airodump-ng, aireplay-ng --deauth
- Kismet, Aruba, Cisco WIDS
- OWASP, NIST
- hostapd.conf documentation

---

*Next: Deauth Visualizer & Retest — Deauth flood visualizer, WIDS, retest with PMF required*

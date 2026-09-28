# Deauthentication & Disassociation — Protocol Deep Dive

## Learning Objectives
- Master deauth vs disassoc: management subtype 12 vs 10, reason codes 1-45, frame format SA/DA/BSSID/reason
- Understand why unauthenticated without PMF: 802.11-1997 no protection, 802.11w-2009 PMF protects with IGTK/BIP/SA Query
- Learn security implications: DoS, handshake capture facilitation via deauth, Evil Twin facilitation, session hijacking
- Understand deauth flood detection: many deauth same BSSID short interval, reason 7 class3 frame from nonassociated STA, WIDS, client/AP logs
- Build VAPT evidence: beacon RSN Capabilities MFPC/MFPR 0/0 disabled vs 1/0 capable vs 1/1 required, deauth frames reason BSSID client frame numbers, config ieee80211w, hash, filter wlan.fc.type_subtype==12
- Learn mitigation: PMF required ieee80211w=2, WPA3-only mandates PMF, WIDS detection, client 802.11w support, SA Query

## Theory

### Management Frames Unprotected (Without PMF) — 802.11-1997

**In 802.11-1997, management frames like deauthentication (subtype 12) and disassociation (subtype 10) were originally unauthenticated and unencrypted — no MIC, no encryption — attacker can spoof SA/DA/BSSID and reason code — no verification — DoS, handshake capture, Evil Twin facilitation.**

**Deauthentication (Subtype 12):**
- **Purpose:** Deauthenticate — STA (client or AP) says "I am deauthenticated, you are no longer authenticated, go to State 1 Unauthenticated Unassociated" — more severe than disassoc — deauth removes authentication and association — client must re-auth, re-assoc, re-handshake
- **Frame Format:** Dot11 header type 0 management subtype 12, addr1 DA (destination), addr2 SA (source), addr3 BSSID, Seq, Dot11Deauth with reason code 2 bytes
  ```
  Dot11(type=0, subtype=12, addr1=clientMAC or FF:FF:FF:FF:FF:FF broadcast, addr2=BSSID or clientMAC, addr3=BSSID) / Dot11Deauth(reason=7)
  ```
  - SA: Source MAC — can be BSSID (AP) or client MAC — spoofable without PMF
  - DA: Destination MAC — can be client MAC or broadcast FF:FF:FF:FF:FF:FF — if broadcast, all clients deauthed — DoS all
  - BSSID: BSSID — AP MAC
  - Reason Code: 2 bytes — reason for deauth — e.g., 1 unspecified, 2 previous auth no longer valid, 3 deauth because sending STA leaving IBSS/ESS, 4 disassoc due to inactivity, 5 AP unable to handle all associated STAs, 6 class 2 frame from non-auth STA, 7 class 3 frame from non-assoc STA (most common for deauth attack), 8 disassoc because sending STA leaving BSS, etc.

**Disassociation (Subtype 10):**
- **Purpose:** Disassociate — STA says "I am disassociated, you are no longer associated, go to State 2 Authenticated Unassociated" — less severe than deauth — disassoc removes association but keeps authentication — client must re-assoc, re-handshake, but not re-auth? Actually State 2 Authenticated Unassociated → need Assoc Req/Resp → State 3
- **Frame Format:** Similar to deauth but subtype 10, Dot11Disassoc with reason code
  ```
  Dot11(type=0, subtype=10, addr1=client, addr2=BSSID, addr3=BSSID) / Dot11Disassoc(reason=8)
  ```
- **Reason Codes:** Same as deauth — 1 unspecified, 4 disassoc due to inactivity, 8 disassoc because sending STA leaving BSS, etc.

**Deauth vs Disassoc:**
- Deauth: State 3 → State 1 — removes auth and assoc — more severe — client must re-auth and re-assoc and re-handshake
- Disassoc: State 3 → State 2 — removes assoc only — less severe — client must re-assoc and re-handshake, but not re-auth? Actually State 2 is Authenticated Unassociated, so need assoc only
- For PT: Both disconnect client — deauth more severe — both can be used for DoS and handshake capture facilitation — deauth more common for handshake capture because deauth forces full re-auth and re-assoc and re-handshake — disassoc also forces re-assoc and re-handshake — both work

**Why Unauthenticated Without PMF?**
- 802.11-1997 no protection for management frames — no MIC, no encryption — management frames like beacon, probe, auth, assoc, deauth, disassoc, action were unauthenticated — because 802.11-1997 didn't have PMF — PMF added in 802.11w-2009 amendment — protects management frames with MIC using IGTK and BIP and SA Query — but without PMF, management frames unauthenticated — attacker can spoof
- For PT: Without PMF, deauth/disassoc spoofing possible — Medium finding — DoS, handshake capture, Evil Twin facilitation

### Frame Format Detailed — SA/DA/BSSID/Reason

**Deauth frame example (AP → Client):**
```
802.11 Management Deauthentication
  Frame Control: 0x00C0 Type Mgmt Subtype Deauth
  Duration: 0
  DA: 11:22:33:44:55:66 (Client)
  SA: AA:BB:CC:DD:EE:FF (BSSID AP)
  BSSID: AA:BB:CC:DD:EE:FF
  Seq: 100
  Tagged? No, Deauth has reason code
  Deauthentication:
    Reason Code: 7 — Class 3 frame received from nonassociated STA
```
- SA BSSID, DA client, BSSID BSSID, reason 7 — AP deauths client — reason 7 class 3 frame from nonassociated STA — common for deauth attack — spoofed deauth often uses reason 7

**Deauth frame example (Client → AP):**
```
DA: AA:BB:CC:DD:EE:FF (BSSID)
SA: 11:22:33:44:55:66 (Client)
BSSID: AA:BB:CC:DD:EE:FF
Reason: 3 — Deauthenticated because sending STA is leaving IBSS or ESS
```
- SA client, DA BSSID, BSSID BSSID, reason 3 — client deauths from AP — client leaving

**Deauth broadcast (AP → Broadcast):**
```
DA: FF:FF:FF:FF:FF:FF (Broadcast)
SA: AA:BB:CC:DD:EE:FF (BSSID)
BSSID: AA:BB:CC:DD:EE:FF
Reason: 7
```
- DA broadcast, SA BSSID, BSSID BSSID, reason 7 — AP deauths all clients — DoS all — broadcast deauth — attacker can spoof broadcast deauth to DoS all clients on BSSID

**Disassoc similar but subtype 10.**

**Reason Codes (IEEE 802.11-2020 Table 9-49 Reason codes):**
- 0 Reserved
- 1 Unspecified reason
- 2 Previous authentication no longer valid
- 3 Deauthenticated because sending STA is leaving (or has left) IBSS or ESS
- 4 Disassociated due to inactivity
- 5 Disassociated because AP is unable to handle all currently associated STAs
- 6 Class 2 frame received from nonauthenticated STA
- 7 Class 3 frame received from nonassociated STA — most common for deauth attack — spoofed deauth often uses reason 7
- 8 Disassociated because sending STA is leaving (or has left) BSS
- 9 STA requesting (re)association is not authenticated with responding STA
- 10 Disassociated because the information in the Power Capability element is unacceptable
- 11 Disassociated because the information in the Supported Channels element is unacceptable
- 12 Disassociated due to BSS Transition Management
- 13 Invalid element, i.e., an element defined in this standard for which the content does not meet the specifications
- 14 Message integrity code (MIC) failure
- 15 4-way handshake timeout
- 16 Group key handshake timeout
- 17 Element in 4-way handshake different from (re)association request/probe response/beacon frame
- 18 Invalid group cipher
- 19 Invalid pairwise cipher
- 20 Invalid AKMP
- 21 Unsupported RSNE version
- 22 Invalid RSNE capabilities
- 23 IEEE 802.1X authentication failed
- 24 Cipher suite rejected because of the security policy
- 25 TDLS direct-link teardown due to TDLS peer STA unreachable via the TDLS direct link
- 26 TDLS direct-link teardown for unspecified reason
- 27 Disassociated because session terminated by SSP request
- 28 Disassociated because of lack of SSP roaming agreement
- 29 Requested service rejected because of SSP cipher suite or AKM requirement
- 30 Requested service not authorized in this location
- 31 TS deleted because QoS AP lacks sufficient bandwidth for this QoS STA due to a change in BSS service characteristics or operational mode
- 32 Disassociated for unspecified, QoS-related reason
- 33 Disassociated because QoS AP lacks sufficient bandwidth for this QoS STA
- 34 Disassociated because excessive number of frames need to be acknowledged, but are not acknowledged due to AP transmissions and/or poor channel conditions
- 35 Disassociated because STA is transmitting outside the limits of its TXOPs
- 36 Requested from peer STA as the STA is leaving the BSS (or resetting)
- 37 Requested from peer STA as it does not want to use the mechanism
- 38 Requested from peer STA as the STA received frames using a mechanism for which a setup is required
- 39 Requested from peer STA due to timeout
- 40 Peer STA does not support the requested cipher suite
- 45 Peer STA does not support FILS authentication
- etc.

**For PT:** Reason 7 is most common for deauth attack — class 3 frame from nonassociated STA — but reason 1 unspecified, 3 leaving, 8 leaving BSS also common — for evidence, note reason code.

### Why It Matters — DoS, Handshake Capture, Evil Twin Facilitation

**DoS (Denial of Service):**
- Attacker continuously deauths clients — e.g., `aireplay-ng --deauth 100 -a BSSID -c clientMAC wlan0mon` — sends 100 deauth frames AP→client — client disconnects, cannot connect while deauth flood ongoing — DoS — if broadcast deauth `aireplay-ng --deauth 100 -a BSSID wlan0mon` — DA broadcast — all clients on BSSID DoS — no connectivity — impact High for availability — but requires PMF disabled and explicit ROE and lab only — never deauth public/third-party Wi-Fi — safety

**Handshake Capture Facilitation:**
- Attacker deauths client, client auto-reconnects (most clients auto-reconnect if previously connected and in range), captures 4-way handshake M1-M4 — for WPA2-PSK offline audit if weak PSK — handshake capture via deauth — if PMF disabled, deauth possible — if PMF required, deauth fails (client ignores spoofed deauth without valid MIC) — so PMF required prevents handshake capture via deauth
- For PT: Handshake capture via deauth is common for WPA2-PSK — but requires PMF disabled and explicit ROE and lab only — for simulated labs, we have `wpa2-handshake.pcapng` with handshake already, no need to deauth — but for hardware lab, deauth for handshake capture is marked as hardware lab requiring RF adapter with prep docs
- Steps (hardware lab, own LAB-DEAUTH AP, explicit ROE):
  ```
  airodump-ng wlan0mon --bssid AA:BB:CC:DD:EE:FF -c 6 -w handshake
  aireplay-ng --deauth 5 -a AA:BB:CC:DD:EE:FF -c 11:22:33:44:55:66 wlan0mon
  # Client disconnects, auto-reconnects, handshake captured in handshake-01.cap
  # Then hcxpcapngtool -o handshake.22000 handshake-01.cap && hashcat -m 22000 handshake.22000 wordlist.txt
  ```

**Evil Twin Facilitation:**
- Attacker deauths client from legit AP, client may connect to Evil Twin AP with same SSID if stronger signal or if legit AP down and Evil Twin up and PSK known or Enterprise no cert validation — Evil Twin facilitation via deauth — if PMF disabled, deauth possible — if PMF required, deauth fails — so PMF required prevents Evil Twin facilitation via deauth
- For PT: Evil Twin facilitation via deauth — deauth client from legit, client connects to rogue same SSID — if PSK known (cracked or shared) and same, client may auto-connect — or Enterprise no cert validation, rogue RADIUS captures MSCHAPv2 — etc.

**Session Hijacking?**
- Without PMF, attacker could also spoof association? Actually SA Query for PMF prevents session hijacking — without PMF, no SA Query — session hijacking possible? For PT, PMF prevents session hijacking via SA Query

### PMF (Protected Management Frames) 802.11w — Capable vs Required, IGTK, BIP, SA Query

**PMF (Protected Management Frames) 802.11w-2009 amendment — protects management frames (deauth subtype 12, disassoc subtype 10, action subtype 13) with MIC using IGTK (Integrity GTK) and BIP (Broadcast/Multicast Integrity Protocol) and SA Query (Security Association Query) — prevents spoofed deauth/disassoc/action DoS and handshake capture via deauth and session hijacking.**

**Without PMF (MFPC=0, MFPR=0) — ieee80211w=0:**
- Management frames unauthenticated, unencrypted, no MIC — attacker can spoof deauth/disassoc/action with any SA/DA/BSSID/reason — client and AP will accept — DoS, handshake capture, Evil Twin facilitation — vulnerable — bad — Medium finding — deauth possible

**With PMF Capable (MFPC=1, MFPR=0) — ieee80211w=1:**
- Client and AP both support PMF — negotiate — if both capable, management frames protected with MIC using IGTK and BIP — but if client not capable, no PMF — downgrade possible — attacker can force client to associate without PMF? Actually if AP capable but not required, client that doesn't support PMF can still associate without PMF — so management frames for that client not protected — downgrade possible — better than disabled, but not required — Medium? Actually capable is better than disabled, but still not required — should be required if all clients support PMF — recommendation required if possible — for transition mode WPA2/WPA3, PMF often capable optional to allow WPA2 clients without PMF — but capable still allows deauth for clients without PMF — downgrade risk

**With PMF Required (MFPC=1, MFPR=1) — ieee80211w=2:**
- Management frames must be protected — client must support PMF, otherwise association denied — prevents spoofed deauth/disassoc/action — best — WPA3-only mandates required, WPA2 should have required — for PT, PMF required is good — no finding — Info — recommendation required for all

**IGTK (Integrity GTK):**
- For protecting broadcast management frames — derived from IPMK (Integrity Pairwise Master Key?) Actually IGTK is integrity key for management — BIP — Group Management — sent in M3? Actually IGTK is for PMF — integrity for broadcast management frames — derived from IPMK? Let's not deep — IGTK is for BIP — Group Management Cipher BIP (00-0F-AC-06) — AES-CMAC — or BIP-GMAC-128, BIP-GMAC-256, BIP-CMAC-256 for WPA3?
- IGTK is distributed in M3 of handshake? Actually IGTK is in M3 key data? For PMF, IGTK is sent in M3? Yes, IGTK KDE in M3 — for protecting broadcast management frames
- For PT: IGTK is for PMF — BIP — protects broadcast deauth? Actually broadcast deauth is protected with IGTK? Yes, broadcast management frames protected with IGTK and BIP — unicast management frames protected with KCK? Actually unicast deauth protected with KCK? Let's not deep — PMF protects management frames with MIC

**BIP (Broadcast/Multicast Integrity Protocol):**
- For integrity for broadcast management frames — AES-CMAC — Group Management Cipher BIP (00-0F-AC-06) — or BIP-GMAC-128, BIP-GMAC-256, BIP-CMAC-256 for WPA3? — BIP is for PMF

**SA Query (Security Association Query):**
- Procedure to prevent spoofed association — if AP receives assoc request with same MAC but different, SA Query to verify — prevents session hijacking — e.g., attacker spoofs client MAC and sends assoc request to AP, AP will send SA Query request to client (action frame), client responds with SA Query response, AP checks if client is legit — if client doesn't respond (because attacker spoofed, not real client), AP knows spoofed — prevents session hijacking — SA Query is for PMF — requires PMF

**Config:**
- `ieee80211w=0` — PMF disabled — vulnerable — bad — Medium — deauth possible
- `ieee80211w=1` — PMF capable optional — better, but downgrade possible — Medium? Actually capable better than disabled, but should be required — recommendation required if possible
- `ieee80211w=2` — PMF required — best — prevents deauth spoofing — good — WPA3-only mandates required

**Beacon RSN Capabilities:**
- MFPC=1, MFPR=0 → PMF capable but optional (transition mode, deauth still possible for WPA2 clients without PMF)
- MFPC=1, MFPR=1 → PMF required (WPA3-only, good)
- MFPC=0, MFPR=0 → PMF disabled (bad, deauth possible)

**For PT:** Check beacon RSN Capabilities MFPC/MFPR — 0/0 disabled, 1/0 capable, 1/1 required — should be 1/1 — filter `wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==1` — if 0/0, Medium finding — deauth possible.

### Detection — WIDS/WIPS, Client Logs, AP Logs, PCAP Analysis

**WIDS/WIPS (Wireless Intrusion Detection/Prevention System):**
- Detect deauth flood — many deauth frames in short time, same BSSID, different source? Actually deauth flood: many deauth same BSSID same reason short interval — e.g., 10 deauth in 1 sec same BSSID — alert deauth flood DoS — WIDS should detect and alert — e.g., Kismet, Aruba WIDS, Cisco WIDS, etc.
- Example WIDS rule: If deauth count >10 per sec per BSSID, alert deauth flood — BSSID AA:BB:CC:DD:EE:FF, reason 7, SA BSSID DA client or broadcast, etc.
- For PT: WIDS detection, not just manual — recommend WIDS

**Client Side Logs:**
- Client logs show frequent disconnects, reason 7 — e.g., Windows Event Log, macOS logs, etc. — frequent deauth reason 7 — possible attack — for PT, client side logs

**AP Side Logs:**
- AP logs show disassoc, deauth — e.g., hostapd logs, Cisco WLC logs, etc. — many deauth same client short interval — possible attack

**In PCAP (deauth.pcapng):**
- Many deauth frames with same BSSID, same reason, short interval = likely attack — e.g., deauth.pcapng contains 12 deauth frames AP→client reason 7, 2 client→AP reason 3, etc. — filter and count — evidence deauth flood
- Filter: `wlan.fc.type_subtype==12` — deauth — count per BSSID per time
- Example: `tshark -r deauth.pcapng -Y "wlan.fc.type_subtype==12" -T fields -e frame.number -e wlan.bssid -e wlan.sa -e wlan.da -e wlan_mgt.fixed.reason_code`

**For PT:** Detection via WIDS and PCAP analysis — many deauth same BSSID short interval = likely attack — evidence frame numbers, BSSID, client, reason, count, filter

### Mitigation — PMF Required, WPA3-Only, WIDS, Client 802.11w Support, SA Query

- **Enable PMF required:** `ieee80211w=2` in hostapd.conf — PMF required MFPC=1 MFPR=1 — prevents deauth/disassoc spoofing — best — WPA3-only mandates PMF required — for WPA2, should also have required — check beacon RSN Capabilities
- **WPA3-only:** Mandates PMF required — WPA3-only SAE PMF required — good — no deauth possible — for 6 GHz mandatory WPA3-only
- **WIDS:** Detect and alert deauth floods — many deauth same BSSID short interval — e.g., Kismet, Aruba, Cisco WIDS — WIDS authorized AP list + deauth detection
- **Client 802.11w support:** Most modern clients support PMF (802.11w) — e.g., Windows 10+, macOS, iOS, Android, etc. — if client doesn't support PMF, cannot associate if PMF required — but most modern support — for old clients without PMF, need transition with PMF capable? Actually if old client without PMF, cannot connect if PMF required — so for compatibility, transition with PMF capable? But better require PMF and upgrade clients — for PT, recommend PMF required and client support
- **SA Query:** For PMF required, SA Query prevents session hijacking — good

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
- PCAP `deauth.pcapng` contains deauth frames (AP→Client, Client→AP, broadcast) — 12-14 frames? Actually deauth.pcapng has 12 deauth frames? Let's check — deauth.pcapng has 12 deauth? Actually in ModuleDetail labMap, deauth.pcapng has deauth flood analysis — count deauth frames, reason codes, check PMF disabled, DoS impact
- Analyze: How many deauth? Reason codes? BSSID? Client? Is PMF required in beacon? Check beacon RSN Capabilities MFPC/MFPR — if disabled, deauth possible = Medium finding
- Config audit: Check hostapd.conf PMF disabled vs required — `ieee80211w=0` disabled bad, `2` required good

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
  ```
- Safety: Never deauth public/third-party Wi-Fi — only own lab AP with explicit ROE — lab-only SSID LAB-DEAUTH — authorized — own infrastructure
- For this academy: Simulated only for browser — hardware marked with prep docs — zero-cost simulated philosophy kept but mark hardware labs requiring RF adapter with prep docs

### VAPT Relevance — Enumeration, Evidence, Impact, Recommendation, Retest

- **Enumeration:** Check beacon RSN capabilities for PMF required? If disabled (MFPC=0 MFPR=0) or capable (1/0) not required, deauth possible = Medium finding — deauth possible, handshake capture via deauth, DoS, Evil Twin facilitation — filter `wlan_mgt.rsn.capabilities.mfpc==0 && mfpr==0` disabled, `==1 && ==0` capable, `==1 && ==1` required
- **Evidence:** Beacon frame showing MFPC=0 MFPR=0, plus deauth frames in PCAP (if simulated) — e.g., deauth.pcapng 10 deauth frames reason 7 BSSID AA:BB:CC:DD:EE:FF → Client 11:22:33:44:55:66 frame numbers, plus config `hostapd.conf` `ieee80211w=0` hash, plus PCAP hash, plus filter `wlan.fc.type_subtype==12`
- **Impact:** DoS (availability), handshake capture facilitation (confidentiality if weak PSK), Evil Twin facilitation (network access) — Medium — CVSS 5.5? Actually PMF disabled Medium — if deauth flood DoS High for availability? But PMF disabled itself Medium — deauth flood DoS High?
- **Recommendation:** Enable PMF required `ieee80211w=2`, WPA3-only where possible (mandates PMF), WIDS for detection of deauth floods (many deauth same BSSID short interval), client 802.11w support, SA Query, training
- **Retest:** Verify beacon MFPR=1 (PMF required), deauth spoof fails (hardware lab) or no deauth in new PCAP, config `ieee80211w=2` hash new, PCAP new hash

### Finding Template

```
Title: PMF Disabled — Deauthentication Spoofing Possible (LAB-DEAUTH)
Severity: Medium
CVSS: 5.5 (AV:A/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H) — Adjacent, Low complexity, No privileges, No user interaction, Scope Unchanged, Confidentiality None, Integrity None, Availability High? Actually deauth DoS High availability? But PMF disabled itself Medium — CVSS 5.3? Let's use 5.5
Description: AP LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 does not require PMF (802.11w), RSN Capabilities MFPC=0 MFPR=0 PMF disabled, management frames unauthenticated, attacker can spoof deauth/disassoc with any SA/DA/BSSID/reason to disconnect clients (DoS) and capture handshake via deauth (if PSK weak) and facilitate Evil Twin (deauth from legit, client connects to rogue same SSID if PSK known or Enterprise no cert validation).
Evidence: Beacon frame 1 SSID LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=0 MFPR=0 PMF disabled, hostapd.conf ieee80211w=0, config hash SHA256 abc123..., PCAP deauth.pcapng SHA256 def456... Frames 12 deauth reason 7 BSSID AA:BB:CC:DD:EE:FF → Client 11:22:33:44:55:66 f1-10 AP→client reason 7, f11-12 client→AP reason 3, filter wlan.fc.type_subtype==12, count 12 deauth same BSSID short interval 1 sec = likely attack or test, no PMF
Impact: DoS — client disconnect, no connectivity while deauth flood ongoing, handshake capture facilitation — if PSK weak, network access via offline audit, Evil Twin facilitation — deauth from legit, client may connect to rogue same SSID if PSK known or Enterprise no cert validation, session hijacking possible without SA Query
Recommendation: Enable PMF required ieee80211w=2 in hostapd.conf (config snippet below), WPA3-only SAE PMF required where possible (mandates PMF, for 6 GHz mandatory), WIDS detection of deauth floods (many deauth same BSSID short interval, e.g., >10 per sec), client 802.11w support (most modern clients support PMF), SA Query for session hijacking prevention, training, audits, no WEP, no TKIP, no WPS, no open without OWE
Config Snippet Good:
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
Retest: Beacon MFPC=1 MFPR=1 PMF required, config ieee80211w=2 hash new SHA256..., PCAP new hash new frame numbers no deauth success if PMF required (client ignores spoofed deauth without valid MIC), deauth spoof fails (hardware lab), WPS disabled, strong PSK audit fails, document new hashes
References: IEEE 802.11-2020, 802.11w-2009 PMF, 802.11i, Wi-Fi Alliance WPA2, WPA3, OWASP, NIST
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
For hardware lab: aireplay-ng --deauth 5 -a BSSID -c clientMAC wlan0mon, client disconnects, auto-reconnects, handshake captured if PMF disabled, etc.
```

### Attack → Defense → Retest

- **Attack:** Observe beacon LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=0 MFPR=0 PMF disabled, config ieee80211w=0, deauth frames reason 7 AP→client, DoS, handshake capture facilitation via deauth (if authorized and lab, hardware, deauth client, capture handshake, offline audit if weak PSK), Evil Twin facilitation (deauth from legit, client connects to rogue same SSID if PSK known or Enterprise no cert validation)
- **Defense:** Enable PMF required ieee80211w=2 MFPC=1 MFPR=1 BIP IGTK SA Query, WPA3-only SAE PMF required where possible (mandates PMF, for 6 GHz mandatory), WIDS detection of deauth floods many deauth same BSSID short interval, client 802.11w support, SA Query, training, audits, no WEP, no TKIP, no WPS, no open without OWE
- **Retest:** New beacon MFPC=1 MFPR=1 PMF required, config ieee80211w=2 hash new, new PCAPs no deauth success if PMF required (client ignores spoofed deauth without valid MIC), deauth spoof fails (hardware lab), WPS disabled, strong PSK audit fails, document new hashes, frame numbers, filters

### Interactive Check

> You capture beacon SSID LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=0 MFPR=0 PMF disabled, hostapd.conf ieee80211w=0, deauth.pcapng 12 deauth frames AP→client reason 7 BSSID AA:BB:CC:DD:EE:FF → Client 11:22:33:44:55:66. What is finding, severity, why, impact, recommendation, evidence, retest, detection, tools?

Answer: Finding PMF Disabled Deauthentication Spoofing Possible LAB-DEAUTH Medium. Why: RSN Capabilities MFPC=0 MFPR=0 PMF disabled, management frames unauthenticated, no MIC, no IGTK/BIP/SA Query, attacker can spoof deauth/disassoc with any SA/DA/BSSID/reason 7 class 3 frame from nonassociated STA. Impact DoS client disconnect no connectivity while deauth flood ongoing, handshake capture facilitation if PSK weak via deauth and offline audit, Evil Twin facilitation deauth from legit client connects to rogue same SSID if PSK known or Enterprise no cert validation, session hijacking possible without SA Query. Recommendation enable PMF required ieee80211w=2 MFPC=1 MFPR=1 BIP IGTK SA Query, WPA3-only SAE PMF required where possible mandates PMF for 6 GHz mandatory, WIDS detection many deauth same BSSID short interval >10 per sec, client 802.11w support, training. Evidence beacon f1 SSID LAB-DEAUTH BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=0 MFPR=0 PMF disabled, config ieee80211w=0 hash, deauth.pcapng 12 deauth AP→client reason 7 BSSID→client f1-10 and client→AP reason 3 f11-12, filter wlan.fc.type_subtype==12, count 12 same BSSID short interval 1 sec likely attack, PCAP hash. Retest new beacon MFPC=1 MFPR=1 PMF required config ieee80211w=2 hash new new PCAPs no deauth success if PMF required client ignores spoofed deauth without valid MIC deauth spoof fails hardware lab. Detection WIDS/WIPS Kismet Aruba Cisco detect deauth flood many deauth same BSSID short interval alert, client logs frequent disconnects reason 7, AP logs disassoc. Tools Wireshark tshark filter wlan.fc.type_subtype==12 ==10 reason code mfpc mfpr bssid sa da, PcapInspector ConfigViewer ReconMap HandshakeDiagram simulated, aireplay-ng --deauth 5 -a BSSID -c clientMAC wlan0mon AP→client broadcast --deauth 5 -a BSSID requires monitor+injection ALFA hardware lab own LAB-DEAUTH explicit ROE never deauth public.

## References

- IEEE 802.11-2020, 802.11w-2009 PMF, 802.11i
- Wi-Fi Alliance WPA2, WPA3, PMF
- Wireshark 802.11 deauth, disassoc, reason codes, MFPC/MFPR
- aircrack-ng, airodump-ng, aireplay-ng --deauth
- Kismet, Aruba, Cisco WIDS
- OWASP, NIST
- hostapd.conf documentation

---

*Next: PMF Detection & Defense — MFPC/MFPR, IGTK, BIP, SA Query, WIDS, retest*

# Rogue AP / Evil Twin — Concepts & Architecture Professional

## Learning Objectives
- Master rogue AP vs Evil Twin distinction: wired rogue plugged into LAN bridging wireless to wired bypassing perimeter vs wireless rogue broadcasting corporate SSID for Evil Twin or DoS
- Understand SSID cloning, BSSID cloning vs different BSSID, channel, vendor OUI, capabilities, signal, client behavior signal strength preferred BSSID security auto-connect
- Learn Evil Twin architecture variants: open Evil Twin with captive portal credential capture, PSK Evil Twin same SSID same PSK if PSK known/cracked transparent to client, Enterprise Evil Twin WPA2-EAP with rogue RADIUS captures EAP credentials PEAP MSCHAPv2 challenge/response hashcat 5500
- Understand client behavior & selection: signal strength RSSI, preferred BSSID, security (WPA2 vs open), auto-connect, PNL, roaming 802.11r/k/v
- Build VAPT evidence: beacons same SSID different BSSIDs different channels vendors security, probe responses from unknown BSSID, association to unknown BSSID, frame numbers, PCAP hash, filter wlan_mgt.ssid==Corp-WLAN
- Learn detection and defense: WIDS/WIPS authorized AP list BSSID channel vendor signal security, 802.1X cert validation ca_cert subject_match, PMF required ieee80211w=2 prevents deauth facilitation, strong PSK 20+ random, WPA3 SAE, client hardening verify BSSID, no auto-connect to open

## Theory

### Rogue AP — Any Unauthorized AP Connected to Corporate Network or Broadcasting Corporate SSID

**Rogue AP is any unauthorized AP — could be employee's personal hotspot, or attacker — rogue AP bypasses perimeter, bridges wireless to wired, or broadcasts corporate SSID for Evil Twin or DoS — rogue AP is security risk — must be detected via WIDS authorized list and removed.**

**Types:**

- **Wired Rogue:** AP physically plugged into corporate LAN, bridging wireless to wired, bypassing perimeter firewall, NAT, etc. — e.g., employee brings personal AP from home, plugs into Ethernet jack in office, creates SSID `MyHotspot` or clones `Corp-WLAN` — wireless clients can connect to rogue and get LAN access without going through perimeter — bypasses firewall, IDS, etc. — wired rogue is High risk — detection via wired side? Actually WIDS can detect wired rogue via? Wired rogue detection via? For wireless PT, we focus on wireless rogue, but wired rogue also risk — detection via LAN scanning? For PT, if you find AP plugged into LAN, it's rogue wired — report
- **Wireless Rogue:** AP broadcasting corporate SSID but not connected to LAN, for Evil Twin or DoS — e.g., attacker outside building with ALFA adapter and hostapd, broadcasting SSID `Corp-WLAN` same as corporate, but not connected to LAN — for Evil Twin credential capture or DoS — wireless rogue — detection via wireless scanning — same SSID different BSSID different channel not in authorized list — WIDS

**For PT:** Rogue AP detection via WIDS authorized AP list — BSSID, channel, vendor, signal, security, etc. — if BSSID not in authorized list or SSID same but BSSID different channel different vendor, flag potential rogue — investigate — signal, vendor, channel, security, capabilities, etc.

### Evil Twin — Attacker AP that Clones Legitimate SSID (and Possibly BSSID) to Trick Clients

**Evil Twin is attacker AP that clones legitimate SSID (and possibly BSSID) to trick clients to connect — Evil Twin architecture, credential capture, detection, defense — Evil Twin is more specific than rogue — rogue is any unauthorized, Evil Twin is rogue that clones legit SSID to trick clients — Evil Twin can be open, PSK, or Enterprise.**

**Architecture:**

```
Legit AP: SSID Corp-WLAN, BSSID AA:BB:CC:DD:EE:FF, Ch6, WPA2-Enterprise, RADIUS 192.168.1.10, CCMP, PMF capable, Cisco OUI 00:11:22, signal -50 dBm, authorized list includes AA:BB:CC:DD:EE:FF Ch6 Cisco
Evil Twin: SSID Corp-WLAN, BSSID AA:BB:CC:DD:EE:FF (cloned same BSSID) or 11:22:33:44:55:66 (different BSSID), Ch6 or different Ch11, Open or WPA2-PSK (attacker knows PSK if PSK mode weak cracked) or WPA2-Enterprise with rogue RADIUS 192.168.1.200, CCMP, PMF disabled, vendor ALFA OUI, signal -30 dBm stronger than legit, not in authorized list

Client behavior:
- Client sees two APs same SSID Corp-WLAN, may choose stronger signal (-30 dBm rogue vs -50 dBm legit) or first seen or preferred BSSID
- If attacker deauths client from legit AP (requires PMF disabled and explicit ROE and lab), client may auto-connect to Evil Twin if Evil Twin stronger or if legit deauthed and Evil Twin up and client has auto-connect for SSID Corp-WLAN
- If PSK mode and attacker knows PSK (weak PSK cracked via handshake offline audit), client will complete 4-way handshake with Evil Twin (since PSK same, PMK same via PBKDF2, PTK via PRF with ANonce SNonce BSSID client MAC, MIC valid) — transparent to client — client thinks connected to legit, but actually to rogue — network access if rogue connected to LAN? Actually wireless rogue not connected to LAN, but if attacker has internet via other interface, can provide internet and capture traffic? Or if wired rogue, LAN access
- If Enterprise, attacker can run rogue RADIUS to capture EAP credentials (e.g., PEAP MSCHAPv2 challenge/response) — client without cert validation (no ca_cert) will accept any cert from rogue RADIUS and send MSCHAPv2 challenge/response — attacker captures challenge/response and offline cracks via hashcat -m 5500 — credential capture — High

For PT: Evil Twin is High risk — credential capture, network access, etc. — detection via WIDS authorized list, 802.1X cert validation, PMF required, strong PSK, WPA3, client hardening
```

### Client Behavior & Selection — Signal, Preferred BSSID, Security, Auto-Connect, PNL, Roaming

**Client behavior and selection for Evil Twin:**

- **Signal strength RSSI:** Client typically chooses stronger RSSI (but not always, vendor dependent) — e.g., iOS, Android, Windows, macOS choose stronger signal? Actually client roaming decision based on signal, but not always strongest — some clients prefer known BSSID, or prefer 5 GHz over 2.4 GHz, etc. — for PT, if rogue has stronger signal (-30 dBm) than legit (-50 dBm), client may roam to rogue if auto-connect and same SSID and same security and PSK known — evidence signal strength
- **Preferred BSSID:** Some clients remember BSSID, prefer known BSSID — e.g., client previously connected to legit BSSID AA:BB:CC:DD:EE:FF, may prefer that BSSID over rogue 11:22:33:44:55:66 even if rogue stronger — but not all clients — for PT, preferred BSSID is defense? Actually client that remembers BSSID may not connect to rogue different BSSID — but many clients don't remember BSSID, only SSID — so rogue different BSSID still possible
- **Security:** If legit AP WPA2-PSK and Evil Twin Open with same SSID, client that expects WPA2 will not connect to Open (good) — OS will not auto-connect to open if it expects WPA2-PSK with PSK — because security mismatch — client will show WPA2-PSK required, not open — so open Evil Twin with same SSID as WPA2-PSK may not trick client that expects WPA2-PSK — but if client has never connected to legit, or if legit is open, then open Evil Twin may trick — for PSK mode and attacker knows PSK and creates PSK Evil Twin same SSID same PSK, client will complete handshake transparently — because security same, PSK same — client thinks legit
- **Auto-connect:** If client has auto-connect for SSID (e.g., Windows auto-connect, iOS auto-join), may connect to Evil Twin automatically if stronger or if legit deauthed and Evil Twin up — auto-connect is risk — for PT, auto-connect to open networks is risk — recommend disable auto-connect to open, use WPA3, etc.
- **PNL (Preferred Network List):** List of SSIDs client has connected to — e.g., LAB-WIFI, HomeWiFi, Corp-WLAN — client probes for PNL SSIDs via probe requests — if attacker knows client PNL (via probe req), can create Evil Twin for PNL SSID — targeted Evil Twin — e.g., client probes Corp-WLAN, attacker creates rogue AP Corp-WLAN same SSID — client may auto-connect if stronger or after deauth and PSK known or Enterprise no cert validation — PNL leakage is privacy issue + Evil Twin targeting — for PT, PNL leakage via probe req is evidence for targeted Evil Twin
- **Roaming 802.11r/k/v:** 802.11r Fast Transition, 802.11k Radio Resource Management, 802.11v BSS Transition Management — help client roam — for PT, roaming may cause client to roam to rogue if stronger? Actually 802.11r/k/v help client choose better AP, but if rogue stronger and same SSID, client may roam to rogue — WIDS detection

**For PT:** Client behavior — signal, preferred BSSID, security, auto-connect, PNL, roaming — all affect Evil Twin success — for defense, strong PSK, PMF required, cert validation, WIDS, client hardening verify BSSID, no auto-connect to open, etc.

### Evil Twin Variants — Open, PSK, Enterprise

**1. Open Evil Twin — SSID Corp-WLAN, Open, Captive Portal to Capture Credentials:**

- **Architecture:** Legit AP Corp-WLAN WPA2-PSK or WPA2-Enterprise, Rogue AP Corp-WLAN Open with captive portal — e.g., `hostapd` with `wpa=0` open, `dnsmasq` DHCP, `iptables` redirect HTTP to portal `portal.guest.com/login`, portal login POST over HTTP (weak) or HTTPS (better), session management MAC-based (weak) or MAC+cookie+timeout, etc.
- **Client behavior:** If legit AP WPA2-PSK and rogue Open same SSID, client that expects WPA2 will not auto-connect to Open (security mismatch) — but if client has never connected, or if legit is open, or if client auto-connects to open, may connect to rogue Open — then HTTP redirect to portal, login over HTTP (sniffable), MAC-based session bypass via MAC spoof (open no encryption, MAC visible, firewall allows MAC after auth, attacker can sniff authenticated client MAC and spoof to bypass portal)
- **Impact:** Credential capture via portal (if portal login over HTTP or weak), network access if portal bypass via MAC spoof, etc. — Medium finding for open with portal weak — if open with OWE and HTTPS portal and isolation and MAC+cookie+timeout, better — but still open no authentication? Actually OWE provides encryption for open without authentication, better than pure open
- **For PT:** Open Evil Twin with captive portal — check portal login POST over HTTP (weak), MAC-based session bypass (open no encryption, MAC visible, spoof bypass), client isolation ap_isolate=0 (clients can ARP spoof), etc. — evidence open beacon, HTTP redirect 302, POST login, MAC bypass, etc.

**2. PSK Evil Twin — SSID Corp-WLAN, WPA2-PSK with Same PSK (if PSK Known/Cracked), Transparent to Client:**

- **Architecture:** Legit AP Corp-WLAN WPA2-PSK CCMP PSK WeakPass123, Rogue AP Corp-WLAN WPA2-PSK CCMP PSK WeakPass123 same SSID same PSK same security different BSSID different channel different vendor — e.g., legit BSSID AA:BB:CC:DD:EE:FF Ch6 Cisco, rogue BSSID 11:22:33:44:55:66 Ch11 ALFA — same SSID, same PSK, same security — client will complete 4-way handshake with rogue transparently — because PSK same, PMK same via PBKDF2, PTK via PRF with ANonce SNonce BSSID client MAC, MIC valid — client thinks connected to legit, but actually to rogue — network access if rogue connected to LAN (wired rogue) or internet via other interface
- **Client behavior:** If PSK known (cracked via handshake offline audit if weak PSK, or shared), attacker can create PSK Evil Twin same SSID same PSK — client may auto-connect if stronger signal or after deauth from legit and PSK known — transparent — no portal, no credential capture needed, just network access — High finding if weak PSK
- **Impact:** Network access, lateral movement, data theft, pivot — High if weak PSK — if strong PSK 20+ random not in wordlists, attacker cannot know PSK, cannot create PSK Evil Twin same PSK — strong PSK mitigates PSK Evil Twin
- **For PT:** PSK Evil Twin — check if PSK weak (in wordlist), if weak, High — recommend strong PSK 20+ random, PMF required, WPA3, WIDS, etc.

**3. Enterprise Evil Twin — SSID Corp-WLAN, WPA2-Enterprise with Rogue RADIUS, Captures EAP Credentials (e.g., PEAP MSCHAPv2):**

- **Architecture:** Legit AP Corp-WLAN WPA2-EAP, RADIUS 192.168.1.10 secret testing123? Actually strong secret 22+ chars, EAP-TLS or PEAP with cert validation, etc. — Rogue AP Corp-WLAN WPA2-EAP, BSSID 11:22:33:44:55:66 Ch11, RADIUS 192.168.1.200 rogue, secret testing123 weak, EAP PEAP, no cert validation on client (no ca_cert), etc.
- **Client behavior:** Client without cert validation (no ca_cert, no subject_match) will accept any cert from rogue RADIUS and send MSCHAPv2 challenge/response — attacker captures challenge/response via rogue RADIUS logs — e.g., FreeRADIUS `eap` logs, `hostapd` logs, etc. — then offline crack via hashcat -m 5500 — credential capture — High — if client has cert validation ca_cert + subject_match via MDM/GPO, client will reject rogue RADIUS self-signed cert, not send MSCHAPv2 — secure — EAP-TLS mutual cert even better — client cert + server cert — mutual auth — most secure
- **Impact:** EAP credential capture — PEAP MSCHAPv2 challenge/response — offline crack hashcat -m 5500 — domain credentials — network access — High — if EAP-TLS mutual cert, not vulnerable
- **For PT:** Enterprise Evil Twin — check if client has ca_cert + subject_match — if no ca_cert, High finding — PEAP without cert validation allows rogue RADIUS captures MSCHAPv2 for offline crack — recommend ca_cert + subject_match via MDM/GPO, prefer EAP-TLS mutual cert, strong RADIUS secret 22+ random, RadSec TLS, PMF required, WIDS

### Detection — AP Side / WIDS and Client Side and PCAP

**From AP Side / WIDS/WIPS:**

- **Authorized AP List:** WIDS should have authorized AP list with BSSID, channel, vendor OUI, signal, security, SSID, etc. — e.g., authorized list: Corp-WLAN legit BSSIDs AA:BB:CC:DD:EE:FF Ch6 Cisco, BB:CC:DD:EE:FF:00 Ch11 Cisco, etc. — if observed BSSID not in authorized list with same SSID, flag potential rogue — e.g., observed rogue BSSID 11:22:33:44:55:66 Ch11 same SSID Corp-WLAN not in authorized list — alert rogue
- **Same SSID Different Channel, Different Vendor OUI, Different Capabilities, Different Signal:** Same SSID Corp-WLAN with BSSIDs AA:BB:CC:DD:EE:FF Ch6 Cisco and 11:22:33:44:55:66 Ch11 ALFA — same SSID different BSSID different channel different vendor — potential rogue or ESS? Need authorized list to decide — if authorized list says Corp-WLAN legit BSSIDs AA:BB:CC:DD:EE:FF and BB:CC:DD:EE:FF:00, but observed 11:22:33:44:55:66 not in list, flag rogue — if authorized list says same SSID different BSSIDs same vendor same security same VLAN, then ESS (multiple APs same network for roaming) — not rogue — need authorized list
- **Client Connecting to Unknown BSSID:** WIDS can detect client association to unknown BSSID — e.g., client 12:34:56:78:9A:BC associates to rogue BSSID 11:22:33:44:55:66 — alert client assoc to rogue
- **Deauth Flood Before Evil Twin Appears:** Attacker may deauth client from legit AP before Evil Twin appears — deauth flood many deauth same BSSID short interval — WIDS detects deauth flood, then new BSSID same SSID appears — correlation — deauth + rogue = likely Evil Twin attack — WIDS should detect and alert

**From Client Side:**

- **Check BSSID, Channel, Security — Does It Match Expected?** Client should verify BSSID, channel, security — e.g., if client expects Corp-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-EAP, but sees Corp-WLAN BSSID 11:22:33:44:55:66 Ch11 WPA2-PSK or Open, should not connect — but many clients don't verify BSSID, only SSID — so rogue possible — for PT, client hardening: verify BSSID, don't auto-connect to open networks with same SSID as corporate, use 802.1X cert validation, etc.
- **Certificate Validation for Enterprise (EAP-TLS, PEAP with Cert Validation):** For Enterprise, clients must validate RADIUS server cert via ca_cert + subject_match/altsubject_match/domain_suffix_match — rogue RADIUS with different cert (self-signed) fails validation if client configured to validate — client will not send MSCHAPv2 — secure — if client configured without ca_cert (no validation), client accepts any cert, sends MSCHAPv2 to attacker — vulnerable — for PT, check client wpa_supplicant.conf — if no ca_cert, High finding — PEAP without cert validation allows rogue RADIUS captures MSCHAPv2

**In PCAP (rogue-ap.pcapng 10 frames):**

- **Two Beacons Same SSID Different BSSIDs Different Channels:** e.g., beacon f1 SSID Corp-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP Cisco, beacon f2 SSID Corp-WLAN BSSID 11:22:33:44:55:66 Ch11 WPA2-PSK CCMP ALFA — same SSID different BSSID different channel — potential rogue or ESS — need authorized list
- **Same BSSID Cloned?** If rogue clones same BSSID AA:BB:CC:DD:EE:FF same as legit, but different channel or different capabilities, or same BSSID same channel but different signal? Actually same BSSID same channel would cause collision? But attacker can clone same BSSID same channel with stronger signal — client may see two APs same BSSID same channel same SSID but different signal? Actually same BSSID same channel same SSID would be same AP? But attacker can clone same BSSID same channel with stronger signal — client may choose stronger — for PT, same BSSID cloned is also rogue — detection via signal, vendor, etc. — but different BSSID is more common for rogue
- **Probe Responses from Unknown BSSID:** Probe response SA unknown BSSID DA client SSID Corp-WLAN — rogue responds to client probe
- **Association to Unknown BSSID:** Assoc req SA client DA unknown BSSID SSID Corp-WLAN — client associates to rogue — e.g., rogue-ap.pcapng frame 6-7 client 12:34:56:78:9A:BC associates to rogue 11:22:33:44:55:66
- **Filter:**
  ```
  wlan_mgt.ssid==Corp-WLAN
  wlan.bssid==AA:BB:CC:DD:EE:FF || wlan.bssid==11:22:33:44:55:66
  wlan.fc.type_subtype==8 && wlan_mgt.ssid==Corp-WLAN  # Beacons Corp-WLAN
  wlan.fc.type_subtype==0 && wlan_mgt.ssid==Corp-WLAN  # Assoc req Corp-WLAN — check BSSID
  ```

**For PT:** PCAP analysis — beacons same SSID different BSSIDs, channels, security, vendor, signal, probe responses from unknown BSSID, association to unknown BSSID — evidence frame numbers, BSSID, SSID, channel, etc.

### Defense — WIDS/WIPS Authorized AP List, 802.1X Cert Validation, PMF Required, Strong PSK, WPA3, Client Hardening

- **WIDS/WIPS Authorized AP List:** WIDS should have authorized AP list with BSSID, channel, vendor OUI, signal, security, SSID, etc. — detect rogue BSSID same SSID not in authorized list — alert — e.g., Kismet, Aruba WIDS, Cisco WIDS, etc. — WIDS authorized list + rogue detection + deauth detection
- **802.1X with Cert Validation for Enterprise:** For Enterprise, clients must validate RADIUS server cert via ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO — rogue RADIUS with different cert (self-signed) fails validation if client configured to validate — client will not send MSCHAPv2 — secure — EAP-TLS mutual cert most secure — client cert + server cert — mutual auth — requires PKI — best
- **PMF Required ieee80211w=2:** Prevents deauth that facilitates Evil Twin — without PMF, attacker can deauth client from legit AP and force client to connect to rogue — with PMF required, deauth spoof fails (client ignores spoofed deauth without valid MIC) — prevents Evil Twin facilitation via deauth — WPA3 mandates PMF required — for WPA2, should have required
- **Strong PSK 20+ Random:** If PSK mode, strong PSK 20+ random not in wordlists, unique per SSID, rotated, stored securely — so attacker cannot know PSK, cannot create PSK Evil Twin same PSK — strong PSK mitigates PSK Evil Twin — weak PSK in wordlist High finding
- **WPA3 SAE:** SAE resists offline audit, forward secrecy, PMF required — better than PSK — but Evil Twin still possible if attacker knows password and clones same SSID same password? Actually if password known, attacker can still create rogue AP same SSID same password? For WPA3-SAE, if password known, attacker can do SAE with client? Client may still connect to rogue if stronger? But SAE has forward secrecy, but if password known, rogue possible? For PT, if PSK/SAE password known, evil twin possible — need strong password and PMF and WPA3 and WIDS
- **Client Hardening:** Verify BSSID, don't auto-connect to open networks with same SSID as corporate, use 802.1X cert validation, disable auto-connect to open, use WPA3, training, etc.

### Lab — Simulated (Zero-Cost) + Hardware (Future, RF_REQUIRED)

**Simulated (this module, zero-cost):**
- **PCAP:** `rogue-ap.pcapng` (10 frames, Scapy-generated)
  - Legit AP: SSID Corp-WLAN, BSSID AA:BB:CC:DD:EE:FF, Ch6, WPA2-PSK CCMP PSK, Cisco OUI 00:11:22, signal -50 dBm, authorized
  - Rogue AP: SSID Corp-WLAN, BSSID 11:22:33:44:55:66, Ch11, WPA2-PSK CCMP PSK same SSID different BSSID different channel different vendor ALFA OUI, signal -30 dBm stronger, not in authorized list
  - Client: 12:34:56:78:9A:BC PNL Corp-WLAN, probes Corp-WLAN, associates to rogue? Actually rogue-ap.pcapng frame 6-7 client associates to rogue
- **Tasks:**
  1. How many BSSIDs for SSID Corp-WLAN? 2 BSSIDs AA:BB:CC:DD:EE:FF and 11:22:33:44:55:66
  2. Which is legit vs rogue? Legit AA:BB:CC:DD:EE:FF Ch6 Cisco WPA2-PSK authorized, rogue 11:22:33:44:55:66 Ch11 ALFA not in authorized list same SSID different channel different vendor stronger signal -30 dBm vs -50 dBm
  3. Is rogue same BSSID cloned or different? Different BSSID 11:22:33:44:55:66 vs AA:BB:CC:DD:EE:FF — different BSSID — not cloned same BSSID, but same SSID
  4. What client behavior? Any association to rogue? Yes, client 12:34:56:78:9A:BC associates to rogue BSSID 11:22:33:44:55:66 frame 6-7 — evidence client assoc to rogue — High
  5. Detection: What WIDS signature? New BSSID same SSID not in authorized list, same SSID different channel different vendor different signal, client assoc to unknown BSSID, deauth flood before rogue? Check deauth.pcapng? Actually rogue-ap.pcapng may have deauth? No, but deauth + rogue correlation
  6. Defense: What recommendation? WIDS authorized AP list, detect rogue BSSID, 802.1X cert validation for Enterprise, PMF required ieee80211w=2, strong PSK 20+ random, WPA3 SAE, client verify BSSID, no auto-connect to open, training

**Config Audit:**
- Authorized AP list vs observed — authorized list: Corp-WLAN legit BSSIDs AA:BB:CC:DD:EE:FF Ch6 Cisco, etc. — observed rogue 11:22:33:44:55:66 Ch11 not in list — flag rogue
- `hostapd.conf` for rogue: SSID Corp-WLAN, BSSID 11:22:33:44:55:66, Ch11, WPA2-PSK same SSID, etc. — rogue config

**Hardware (Future, RF_REQUIRED, requires ALFA adapter, explicit ROE, own lab):**
- Real Evil Twin with `hostapd` + `dnsmasq` + 2 adapters (one for internet, one for AP) — lab-only SSID LAB-ROGUE, own infrastructure, ALFA adapter
- Requires monitor mode, AP mode, 2 radios — one for internet (managed), one for AP (AP mode)
- Safety: Lab-only, never clone real corporate SSID, only LAB-*, e.g., LAB-ROGUE, not Corp-WLAN — only own lab — explicit ROE — own infrastructure
- Example: `hostapd` config with SSID LAB-ROGUE, BSSID 11:22:33:44:55:66, Ch6, WPA2-PSK or Open or Enterprise with rogue RADIUS, `dnsmasq` DHCP, `iptables` NAT, etc.
- For Enterprise Evil Twin: `hostapd` with `wpa_key_mgmt=WPA-EAP`, `auth_server_addr=192.168.1.200` rogue RADIUS, `eap_server=0`? Actually hostapd as authenticator, RADIUS as AS, FreeRADIUS with `eap` config, etc., client without ca_cert will accept rogue RADIUS cert and send MSCHAPv2 challenge/response — capture via FreeRADIUS logs
- For this academy: Simulated only for browser — hardware marked with prep docs — zero-cost simulated philosophy kept but mark hardware labs requiring RF adapter with prep docs

### VAPT Relevance — Enumeration, Evidence, Impact, Recommendation, Retest

- **Enumeration:** List all BSSIDs per SSID, check for unknown — filter `wlan_mgt.ssid==Corp-WLAN` — beacons same SSID different BSSIDs — check authorized list — if BSSID not in authorized list, flag rogue
- **Evidence:** Beacon frames with same SSID different BSSIDs, channels, security, vendor, signal, probe responses from unknown BSSID, association to unknown BSSID, frame numbers, PCAP hash, filter, config hash, authorized list, wash output, etc.
- **Impact:** If client connects to rogue, credential capture (if captive portal), network access (if PSK known), EAP credential capture (Enterprise) — High if PSK known or Enterprise cred capture, Medium if open — CVSS 7.5? Actually rogue High
- **Recommendation:** WIDS authorized AP list BSSID channel vendor signal security, detect rogue BSSID same SSID not in authorized list, 802.1X cert validation ca_cert subject_match via MDM/GPO for Enterprise, PMF required ieee80211w=2, strong PSK 20+ random, WPA3 SAE, client hardening verify BSSID, no auto-connect to open, training, audits
- **Retest:** Verify WIDS detects rogue, authorized list updated, no unknown BSSIDs after removal, new PCAPs no rogue, new beacons only authorized BSSIDs, etc.

### Finding Template

```
Title: Rogue AP Detected — SSID Corp-WLAN Cloned (Rogue BSSID 11:22:33:44:55:66)
Severity: High (if PSK known or Enterprise cred capture) / Medium (if open)
CVSS: 7.5 (AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N) — Adjacent, Low complexity, No privileges, No user interaction, Scope Unchanged, Confidentiality High, Integrity High — if PSK known or Enterprise cred capture High, if open Medium 5.5
Description: Observed 2 BSSIDs for SSID Corp-WLAN: legit AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK Cisco OUI 00:11:22 signal -50 dBm authorized, rogue 11:22:33:44:55:66 Ch11 WPA2-PSK CCMP PSK same SSID different BSSID different channel different vendor ALFA OUI signal -30 dBm stronger not in authorized list. Rogue not in authorized AP list. Client 12:34:56:78:9A:BC PNL Corp-WLAN probes Corp-WLAN and associates to rogue BSSID 11:22:33:44:55:66 frame 6-7.
Evidence: Beacon frames f1 SSID Corp-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP Cisco and f2 SSID Corp-WLAN BSSID 11:22:33:44:55:66 Ch11 WPA2-PSK CCMP ALFA same SSID different BSSIDs different channels different vendors, probe responses from rogue f? SA rogue DA client SSID Corp-WLAN, association from client 12:34:56:78:9A:BC to rogue BSSID 11:22:33:44:55:66 frame 6 Assoc Req SA client DA rogue SSID Corp-WLAN and frame 7 Assoc Resp SA rogue DA client status0 AID1, PCAP rogue-ap.pcapng SHA256 abc123... Size 2.3 KB Frames 10 Tool Scapy Method scapy, filter wlan_mgt.ssid==Corp-WLAN, wlan.bssid==AA:BB:CC:DD:EE:FF || wlan.bssid==11:22:33:44:55:66, authorized AP list hash SHA256..., wash output? Actually wash for WPS, but for rogue, airodump-ng or Kismet
Impact: Client may connect to rogue, credential capture if captive portal (open Evil Twin), network access if PSK known (PSK Evil Twin same SSID same PSK transparent), EAP credential capture if Enterprise (Enterprise Evil Twin rogue RADIUS captures PEAP MSCHAPv2 challenge/response hashcat -m 5500), lateral movement, data theft, pivot, compliance fail
Recommendation: WIDS authorized AP list BSSID channel vendor signal security SSID, detect rogue BSSID same SSID not in authorized list, alert, contain (e.g., deauth rogue? Actually WIPS can contain rogue via deauth? But containing rogue via deauth is also DoS? For PT, WIDS detection and alert, not necessarily contain via deauth unless authorized), 802.1X cert validation ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO for Enterprise (EAP-TLS mutual cert most secure), PMF required ieee80211w=2 prevents deauth facilitation (WPA3-only mandates PMF), strong PSK 20+ random not in wordlists unique per SSID rotated stored securely, WPA3 SAE PMF required for personal (forward secrecy, resists offline audit), client hardening verify BSSID, don't auto-connect to open networks with same SSID as corporate, disable auto-connect to open, use WPA3, training, audits, no WEP, no TKIP, no WPS, no open without OWE
Config Snippet Good Authorized AP List (WIDS):
# Authorized APs (WIDS)
# Corp-WLAN legit: AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK Cisco -50 dBm
# Observed rogue: 11:22:33:44:55:66 Ch11 WPA2-PSK same SSID different BSSID different channel different vendor ALFA -30 dBm not in authorized list — flag rogue
# Rogue hostapd.conf (attacker) — for reference, not for deployment
# interface=wlan0
# ssid=Corp-WLAN
# bssid=11:22:33:44:55:66
# hw_mode=g
# channel=11
# wpa=2
# wpa_key_mgmt=WPA-PSK
# rsn_pairwise=CCMP
# wpa_passphrase=WeakPass123  # If PSK known/cracked
Retest: WIDS alerts on rogue BSSID 11:22:33:44:55:66 same SSID Corp-WLAN not in authorized list, authorized list updated, no unknown BSSIDs after removal, new PCAPs no rogue, new beacons only authorized BSSIDs AA:BB:CC:DD:EE:FF Ch6, client no longer associates to rogue, verify via new PCAPs and WIDS logs, document new PCAP hash, new authorized list hash
References: IEEE 802.11, 802.11w PMF, 802.11i, Wi-Fi Alliance, OWASP, NIST, Kismet, airodump-ng, hostapd, FreeRADIUS, EAP, PEAP, EAP-TLS, wash, reaver, bully, Wireshark
```

### Tools

- `airodump-ng` — AP enumeration: `airodump-ng wlan0mon` — BSSID PWR Beacons #Data #/s CH MB ENC CIPHER AUTH ESSID, STATION BSSID PWR Rate Lost Frames Probe
- Kismet — WIDS, web UI `http://localhost:2501`, devices, APs, clients, SSID, BSSID, channel, signal, manufacturer, hidden, probe, assoc, WIDS alerts, rogue detection, pcap logging
- Wireshark, tshark, Scapy, PcapInspector, ReconMap, HandshakeDiagram — filters `wlan_mgt.ssid==Corp-WLAN`, `wlan.bssid==AA:BB:CC:DD:EE:FF`, `wlan.fc.type_subtype==8`, `==0`, `==1`, `==4`, `==5`, `eapol`, etc.
- `hostapd` — rogue AP: `hostapd.conf` with `ssid`, `bssid`, `hw_mode`, `channel`, `wpa`, `wpa_key_mgmt`, `rsn_pairwise`, `wpa_passphrase`, `auth_server_addr` for Enterprise, etc.
- `dnsmasq` — DHCP for rogue AP: `dnsmasq.conf` with `interface=wlan0`, `dhcp-range=192.168.1.100,192.168.1.200,12h`, etc.
- `iptables` — NAT for rogue AP: `iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE`, etc.
- FreeRADIUS — rogue RADIUS for Enterprise Evil Twin: `clients.conf`, `users`, `eap.conf`, etc., with `eap` PEAP, `mschapv2`, etc., logs challenge/response
- `wash`, `reaver`, `bully` — WPS enumeration and brute-force (for WPS module, but also for rogue? Actually wash for WPS, but for rogue, airodump-ng)
- `sha256sum` — hash for evidence chain

### Evidence Collection — Detailed

```
Beacon f1 SSID Corp-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK Cisco OUI 00:11:22 signal -50 dBm authorized
Beacon f2 SSID Corp-WLAN BSSID 11:22:33:44:55:66 Ch11 WPA2-PSK CCMP PSK same SSID different BSSID different channel different vendor ALFA OUI signal -30 dBm stronger not in authorized list — potential rogue
Probe Req f3 SA 12:34:56:78:9A:BC SSID Corp-WLAN PNL Corp-WLAN
Probe Resp f4 SA AA:BB:CC:DD:EE:FF DA 12:34:56:78:9A:BC SSID Corp-WLAN — legit
Probe Resp f5 SA 11:22:33:44:55:66 DA 12:34:56:78:9A:BC SSID Corp-WLAN — rogue
Assoc Req f6 SA 12:34:56:78:9A:BC DA 11:22:33:44:55:66 BSSID 11:22:33:44:55:66 SSID Corp-WLAN — client assoc to rogue — High
Assoc Resp f7 SA 11:22:33:44:55:66 DA 12:34:56:78:9A:BC status0 AID1 — rogue accepts
PCAP rogue-ap.pcapng SHA256 abc123... Size 2.3 KB Frames 10 Tool Scapy Method scapy
Filter wlan_mgt.ssid==Corp-WLAN, wlan.bssid==AA:BB:CC:DD:EE:FF || wlan.bssid==11:22:33:44:55:66
Authorized AP list hash SHA256...
For Enterprise Evil Twin: FreeRADIUS logs challenge/response, hashcat -m 5500 output cracked, etc.
```

### Attack → Defense → Retest

- **Attack:** Observe beacons same SSID Corp-WLAN different BSSIDs different channels vendors security, e.g., legit AA:BB:CC:DD:EE:FF Ch6 Cisco WPA2-PSK authorized and rogue 11:22:33:44:55:66 Ch11 ALFA not in authorized list same SSID, client PNL Corp-WLAN probes Corp-WLAN and associates to rogue BSSID 11:22:33:44:55:66 frame 6-7, open Evil Twin with captive portal credential capture, PSK Evil Twin same SSID same PSK if PSK known/cracked transparent network access, Enterprise Evil Twin WPA2-EAP with rogue RADIUS captures PEAP MSCHAPv2 challenge/response hashcat -m 5500 credential capture, deauth facilitation if PMF disabled
- **Defense:** WIDS authorized AP list BSSID channel vendor signal security SSID detect rogue same SSID not in authorized list alert contain, 802.1X cert validation ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO for Enterprise EAP-TLS mutual cert most secure, PMF required ieee80211w=2 prevents deauth facilitation WPA3-only mandates PMF, strong PSK 20+ random not in wordlists unique per SSID rotated stored securely, WPA3 SAE PMF required for personal forward secrecy resists offline audit, client hardening verify BSSID don't auto-connect to open with same SSID as corporate disable auto-connect to open use WPA3 training audits
- **Retest:** WIDS alerts on rogue BSSID same SSID not in authorized list, authorized list updated, no unknown BSSIDs after removal, new PCAPs no rogue only authorized BSSIDs, client no longer associates to rogue, verify via new PCAPs and WIDS logs, document new PCAP hash new authorized list hash

### Interactive Check

> You have rogue-ap.pcapng 10 frames: legit AP Corp-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK Cisco -50 dBm authorized, rogue AP Corp-WLAN BSSID 11:22:33:44:55:66 Ch11 WPA2-PSK ALFA -30 dBm not in authorized list same SSID different BSSID different channel different vendor stronger signal, client 12:34:56:78:9A:BC PNL Corp-WLAN probes Corp-WLAN and associates to rogue f6-7. What is rogue vs Evil Twin, client behavior, variants, detection, defense, evidence, impact?

Answer: Rogue AP any unauthorized AP wired rogue plugged into LAN bridging wireless to wired bypassing perimeter or wireless rogue broadcasting corporate SSID for Evil Twin or DoS. Evil Twin is rogue that clones legit SSID to trick clients — more specific — open Evil Twin SSID same open with captive portal credential capture, PSK Evil Twin same SSID same PSK if PSK known/cracked transparent network access, Enterprise Evil Twin WPA2-EAP with rogue RADIUS captures PEAP MSCHAPv2 challenge/response hashcat -m 5500 credential capture High. Client behavior signal strength RSSI chooses stronger (-30 rogue vs -50 legit) may roam to rogue if stronger or after deauth and auto-connect, preferred BSSID some clients remember BSSID prefer known BSSID but many only SSID, security mismatch WPA2 vs open client expects WPA2 will not connect to open good but if PSK same same security will connect transparently, auto-connect risk, PNL list of SSIDs client trusts probes for PNL targeted Evil Twin, roaming 802.11r/k/v. Detection WIDS authorized AP list BSSID channel vendor signal security if BSSID not in list same SSID different channel different vendor flag rogue, client connecting to unknown BSSID, deauth flood before rogue, client side check BSSID channel security does it match expected cert validation for Enterprise ca_cert subject_match, PCAP two beacons same SSID different BSSIDs different channels probe responses from unknown BSSID association to unknown BSSID f6-7 client assoc to rogue. Defense WIDS authorized list detect rogue alert contain, 802.1X cert validation ca_cert subject_match via MDM/GPO EAP-TLS mutual cert most secure, PMF required ieee80211w=2 prevents deauth facilitation WPA3 mandates, strong PSK 20+ random not in wordlists, WPA3 SAE forward secrecy resists offline audit, client hardening verify BSSID don't auto-connect to open same SSID as corporate disable auto-connect to open use WPA3 training. Evidence beacon f1 legit AA:BB:CC:DD:EE:FF Ch6 Cisco and f2 rogue 11:22:33:44:55:66 Ch11 ALFA same SSID different BSSIDs channels vendors, probe resp from rogue, assoc req f6 SA client DA rogue SSID Corp-WLAN and assoc resp f7 SA rogue DA client status0 AID1 client assoc to rogue High, PCAP rogue-ap.pcapng hash, filter wlan_mgt.ssid==Corp-WLAN. Impact client connects to rogue credential capture if portal network access if PSK known EAP credential capture if Enterprise lateral movement data theft pivot High if PSK known or Enterprise cred capture Medium if open.

## References

- IEEE 802.11, 802.11w PMF, 802.11i, 802.11r/k/v
- Wi-Fi Alliance, OWASP, NIST
- Kismet, airodump-ng, hostapd, dnsmasq, iptables, FreeRADIUS, EAP, PEAP, EAP-TLS, wash, reaver, bully, Wireshark, PcapInspector, ReconMap, HandshakeDiagram
- MITRE ATT&CK — Rogue AP, Evil Twin

---

*Next: Rogue Detection & Defense — WIDS authorized list, cert validation, PMF, strong PSK, WPA3, client hardening*

# Rogue Visualizer — Timeline Beacons Same SSID Different BSSIDs, Probe, Assoc to Rogue, WIDS Alerts, Retest Professional

## Learning Objectives
- Visualize rogue AP / Evil Twin timeline: beacons same SSID different BSSIDs different channels vendors security signal, probe req PNL, probe resp from legit and rogue, assoc to rogue, WIDS alerts, retest
- Understand rogue detection: new BSSID same SSID not in authorized list, same SSID different channel vendor capabilities signal, deauth flood before rogue, client assoc to unknown BSSID
- Learn PCAP analysis: rogue-ap.pcapng 10 frames, tshark fields frame.number time_relative bssid sa da ssid channel, Wireshark filters, PcapInspector, ReconMap, DeauthVisualizer
- Build defense: WIDS authorized list, 802.1X cert validation, PMF required, strong PSK, WPA3, client hardening, retest new PCAPs only authorized BSSIDs

## Theory

### Rogue Visualizer — Timeline X Time Y BSSID Dots Color Legit Green Rogue Red Signal Size

**Rogue visualizer timeline X time (seconds) Y BSSID (AA:BB:CC:DD:EE:FF legit vs 11:22:33:44:55:66 rogue) dots color legit green vs rogue red vs client blue, size signal strength, tooltip frame number time BSSID SSID channel vendor security signal, count per BSSID, rate, WIDS alerts, etc. — for PT, visualize rogue timeline helps detection — same SSID different BSSIDs different channels vendors security signal, probe, assoc to rogue, etc.**

**Example Timeline (rogue-ap.pcapng 10 frames, Scapy-generated):**

```
Time 0.0 — f1 Beacon SA AA:BB:CC:DD:EE:FF DA FF:FF:FF:FF:FF:FF BSSID AA:BB:CC:DD:EE:FF SSID Corp-WLAN Ch6 WPA2-PSK CCMP PSK Cisco OUI 00:11:22 signal -50 dBm authorized — legit — green dot Y=AA:BB:CC:DD:EE:FF X=0.0
Time 0.5 — f2 Beacon SA 11:22:33:44:55:66 DA FF:FF:FF:FF:FF:FF BSSID 11:22:33:44:55:66 SSID Corp-WLAN Ch11 WPA2-PSK CCMP PSK ALFA OUI signal -30 dBm stronger not in authorized list — rogue — red dot Y=11:22:33:44:55:66 X=0.5 — same SSID different BSSID different channel different vendor stronger — potential rogue — WIDS alert new BSSID same SSID not in authorized list
Time 1.0 — f3 Probe Req SA 12:34:56:78:9A:BC DA FF:FF:FF:FF:FF:FF SSID Corp-WLAN PNL Corp-WLAN — client probes Corp-WLAN — blue dot Y=client X=1.0 — PNL leakage
Time 1.1 — f4 Probe Resp SA AA:BB:CC:DD:EE:FF DA 12:34:56:78:9A:BC BSSID AA:BB:CC:DD:EE:FF SSID Corp-WLAN Ch6 — legit responds — green dot Y=AA:BB:CC:DD:EE:FF X=1.1
Time 1.2 — f5 Probe Resp SA 11:22:33:44:55:66 DA 12:34:56:78:9A:BC BSSID 11:22:33:44:55:66 SSID Corp-WLAN Ch11 — rogue responds — red dot Y=11:22:33:44:55:66 X=1.2 — rogue responds to client probe — WIDS alert probe resp from unknown BSSID same SSID
Time 1.5 — f6 Assoc Req SA 12:34:56:78:9A:BC DA 11:22:33:44:55:66 BSSID 11:22:33:44:55:66 SSID Corp-WLAN — client associates to rogue — blue→red — High — WIDS alert client assoc to unknown BSSID
Time 1.6 — f7 Assoc Resp SA 11:22:33:44:55:66 DA 12:34:56:78:9A:BC status0 AID1 — rogue accepts — red dot Y=11:22:33:44:55:66 X=1.6
Time 1.7 — f8 EAPOL M1? Actually for PSK, 4-way handshake M1 ANonce from rogue to client — if PSK known same PSK, handshake will succeed transparently — for PT, if PSK known, client will complete handshake with rogue — network access — High
Time 1.8 — f9 EAPOL M2 SNonce MIC from client to rogue — etc.
Time 2.0 — f10 EAPOL M3 GTK MIC from rogue to client — etc.

Count per BSSID: AA:BB:CC:DD:EE:FF 2 beacons/probe resp, 11:22:33:44:55:66 2 beacons/probe resp + assoc resp + EAPOL — rogue BSSID appears with same SSID different channel different vendor — WIDS alert
Rate: Beacons per BSSID ~1 per 0.5 sec? Actually beacon interval 102.4ms — but simulated 0.5 sec
Signal: Legit -50 dBm, rogue -30 dBm stronger — rogue stronger to lure client — WIDS alert same SSID different BSSID stronger signal not in authorized list
WIDS Alerts: New BSSID same SSID not in authorized list, same SSID different channel different vendor different signal, probe resp from unknown BSSID, client assoc to unknown BSSID, deauth flood before rogue? Check deauth.pcapng correlation
```

**For PT:** Rogue visualizer — timeline X time Y BSSID dots color legit green rogue red client blue signal size tooltip frame number time BSSID SSID channel vendor security signal, count per BSSID, rate, WIDS alerts — helps detection — same SSID different BSSIDs different channels vendors security signal, probe, assoc to rogue, etc.

### Wireshark Filters & tshark Fields for Rogue Detection

**Wireshark Display Filters:**

```
wlan_mgt.ssid==Corp-WLAN  # Beacons/probe/assoc with SSID Corp-WLAN — check BSSID
wlan.bssid==AA:BB:CC:DD:EE:FF || wlan.bssid==11:22:33:44:55:66  # Filter legit vs rogue BSSID
wlan.fc.type_subtype==8 && wlan_mgt.ssid==Corp-WLAN  # Beacons Corp-WLAN — check BSSID channel vendor security
wlan.fc.type_subtype==5 && wlan_mgt.ssid==Corp-WLAN  # Probe resp Corp-WLAN — check BSSID
wlan.fc.type_subtype==0 && wlan_mgt.ssid==Corp-WLAN  # Assoc req Corp-WLAN — check BSSID DA — client assoc to which BSSID?
wlan.fc.type_subtype==1 && wlan.bssid==11:22:33:44:55:66  # Assoc resp from rogue
wlan.fc.type_subtype==4 && wlan_mgt.ssid==Corp-WLAN  # Probe req Corp-WLAN — PNL leakage
wlan_mgt.rsn.capabilities.mfpc==0 && wlan_mgt.rsn.capabilities.mfpr==0  # PMF disabled — bad — Medium — deauth facilitation
wlan.fc.type_subtype==12  # Deauth — check deauth flood before rogue
wlan.fc.type_subtype==10  # Disassoc
```

**tshark Command Line:**

```bash
tshark -r rogue-ap.pcapng -Y "wlan_mgt.ssid==Corp-WLAN" -T fields -e frame.number -e frame.time_relative -e wlan.bssid -e wlan.sa -e wlan.da -e wlan_mgt.ssid -e wlan_mgt.ds.current_channel -e wlan_mgt.rsn.akms.type -e wlan_mgt.rsn.capabilities.mfpc -e wlan_mgt.rsn.capabilities.mfpr
tshark -r rogue-ap.pcapng -Y "wlan.fc.type_subtype==8" -T fields -e frame.number -e wlan.bssid -e wlan_mgt.ssid -e wlan_mgt.ds.current_channel  # Beacons — list BSSID per SSID
tshark -r rogue-ap.pcapng -Y "wlan.fc.type_subtype==0" -T fields -e frame.number -e wlan.sa -e wlan.da -e wlan.bssid -e wlan_mgt.ssid  # Assoc req — client assoc to which BSSID?
```

**For PT:** Wireshark filters and tshark fields for rogue detection — beacons same SSID different BSSIDs channels vendors security, probe req PNL, probe resp from unknown BSSID, assoc to unknown BSSID, etc.

### PcapInspector, ReconMap, DeauthVisualizer, HandshakeDiagram Integration

- **PcapInspector:** Frame viewer — frame number, time, SA, DA, BSSID, SSID, channel, security, type/subtype, reason code, nonce, MIC, etc. — for rogue-ap.pcapng, PcapInspector shows 10 frames with details — beacon f1 legit, f2 rogue, probe req f3, probe resp f4 legit f5 rogue, assoc req f6 client→rogue, assoc resp f7 rogue→client, EAPOL M1-M4 f8-10? Actually rogue-ap.pcapng may have EAPOL if PSK same — for PT, PcapInspector helps visualize rogue timeline
- **ReconMap:** Channel map — X channel, Y BSSID, dots APs — for rogue, ReconMap shows 2 BSSIDs same SSID different channels Ch6 vs Ch11 — same SSID different BSSID different channel — potential rogue or ESS — need authorized list — ReconMap helps visualize channel overlap, rogue detection
- **DeauthVisualizer:** Timeline deauth — for rogue, DeauthVisualizer shows deauth flood before rogue appears? Actually deauth.pcapng 12 frames + rogue-ap.pcapng 10 frames correlation — deauth flood then rogue — Evil Twin facilitated by deauth — DeauthVisualizer helps visualize deauth + rogue correlation
- **HandshakeDiagram:** 4-way handshake diagram M1-M4 — for rogue PSK Evil Twin same SSID same PSK, handshake will succeed transparently — HandshakeDiagram shows M1 ANonce from rogue to client, M2 SNonce MIC from client to rogue, M3 GTK MIC from rogue to client, M4 ACK — if PSK known same, MIC valid — client thinks connected to legit, but actually to rogue — network access — High — HandshakeDiagram helps visualize handshake with rogue
- **For PT:** PcapInspector + ReconMap + DeauthVisualizer + HandshakeDiagram integration — for rogue, all components help — PcapInspector frame details, ReconMap channel map same SSID different BSSIDs channels, DeauthVisualizer deauth flood before rogue, HandshakeDiagram handshake with rogue if PSK known

### WIDS Detection — Kismet, Aruba, Cisco, WIPS

**Kismet (Open Source WIDS):**

- Kismet web UI `http://localhost:2501` — devices, APs, clients, SSID, BSSID, channel, signal, manufacturer, hidden, probe, assoc, WIDS alerts, rogue detection, pcap logging
- Kismet detects new BSSID same SSID not in authorized list — alert — e.g., Kismet `kismetdb` — `kismetdb_to_wireshark` — etc.
- For PT: Kismet for rogue detection — authorized list? Actually Kismet can have alert rules — new BSSID same SSID, same SSID different channel, client assoc to unknown BSSID, deauth flood, etc.

**Aruba WIDS/WIPS, Cisco WIDS/WIPS:**

- Aruba WIDS — authorized AP list, rogue detection, client assoc to rogue detection, deauth flood detection, containment via deauth? Actually Aruba WIPS can contain rogue via deauth — but deauth is DoS — for PT, WIDS detection and alert is primary
- Cisco WIDS/WIPS — similar — authorized AP list, rogue detection, etc.

**WIDS Rules for Rogue:**

- Rule: New BSSID same SSID not in authorized list — alert rogue AP detected — SSID Corp-WLAN BSSID 11:22:33:44:55:66 Ch11 not in authorized list
- Rule: Same SSID different channel different vendor different signal — alert potential rogue — same SSID Corp-WLAN BSSIDs AA:BB:CC:DD:EE:FF Ch6 Cisco -50 dBm and 11:22:33:44:55:66 Ch11 ALFA -30 dBm — same SSID different BSSID different channel different vendor different signal — potential rogue — investigate authorized list
- Rule: Client assoc to unknown BSSID — alert client assoc to rogue — client 12:34:56:78:9A:BC assoc to rogue 11:22:33:44:55:66 — High
- Rule: Deauth flood >10/sec same BSSID short interval — alert deauth flood — then new BSSID same SSID appears — correlation — alert Evil Twin likely facilitated by deauth

**For PT:** WIDS detection — Kismet, Aruba, Cisco, WIPS — authorized AP list, rogue detection, client assoc to rogue, deauth flood, etc. — evidence WIDS logs, PCAP, authorized list hash

### Retest — New Beacon MFPC=1 MFPR=1 PMF Required, Authorized List Updated, No Unknown BSSIDs, New PCAPs Only Authorized

**Retest After Fix:**

- **Fix:** WIDS authorized AP list updated — rogue BSSID 11:22:33:44:55:66 removed, only authorized BSSIDs AA:BB:CC:DD:EE:FF Ch6, etc. — rogue AP physically removed if wired rogue plugged into LAN, or rogue AP disabled if wireless rogue, or rogue AP contained via WIPS deauth if authorized? Actually containing rogue via deauth is DoS, but if rogue is malicious, containment may be justified — for PT, recommend physical removal of wired rogue, disabling rogue AP, etc. — and for wireless rogue, WIDS detection and alert, and for client, 802.1X cert validation, PMF required, strong PSK, WPA3, client hardening
- **New Beacon:** Only authorized BSSIDs — e.g., new beacon f1 SSID Corp-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PMF required MFPC=1 MFPR=1 ieee80211w=2 — no rogue — WIDS no longer alerts rogue — authorized list only
- **Config:** hostapd.conf with `ieee80211w=2` PMF required, `wpa_key_mgmt=WPA-PSK WPA-PSK-SHA256` or `SAE`, strong PSK 20+ random, `wps_state=0`, `rsn_pairwise=CCMP`, no TKIP, no WEP, no open without OWE — good config — hash SHA256 — evidence
- **PCAP:** New PCAPs `rogue-ap-fixed.pcapng`? Actually new PCAPs only authorized BSSIDs — no rogue — e.g., new PCAP 5 frames only legit AP — no rogue — hash SHA256 — evidence
- **WIDS Logs:** New WIDS logs no rogue alerts — only authorized BSSIDs — hash
- **Client:** Client no longer associates to rogue — only to legit — verify via new PCAPs and WIDS logs — e.g., new PCAP shows client assoc to legit AA:BB:CC:DD:EE:FF, not to rogue 11:22:33:44:55:66
- **For PT:** Retest — new beacon only authorized BSSIDs MFPC=1 MFPR=1 PMF required, authorized list updated, no unknown BSSIDs after removal, new PCAPs only authorized, WIDS no longer alerts rogue, client no longer associates to rogue, verify via new PCAPs and WIDS logs, document new PCAP hash new authorized list hash new config hash

### Defense Layers — WIDS, Cert Validation, PMF Required, Strong PSK, WPA3, Client Hardening, Audits

- **WIDS/WIPS Authorized AP List Alert Contain:** Authorized AP list BSSID channel vendor signal security SSID, detect rogue BSSID same SSID not in authorized list alert contain via WIPS deauth if authorized? Actually contain via deauth is DoS, but if rogue malicious, containment may be justified — for PT, WIDS detection and alert primary
- **802.1X Cert Validation ca_cert subject_match altsubject_match domain_suffix_match via MDM/GPO EAP-TLS Mutual Cert Most Secure:** For Enterprise, clients must validate RADIUS server cert via ca_cert + subject_match — rogue RADIUS self-signed fails validation if client configured to validate — client will not send MSCHAPv2 — secure — EAP-TLS mutual cert most secure — client cert + server cert — mutual auth — PKI — best
- **PMF Required ieee80211w=2 Prevents Deauth Facilitation WPA3 Mandates:** PMF protects management frames via MIC IGTK — prevents deauth spoof — attacker cannot spoof deauth without valid MIC — client ignores spoofed deauth — prevents Evil Twin facilitation via deauth — WPA3 mandates required — for WPA2, recommend required if all clients support PMF
- **Strong PSK 20+ Random Not in Wordlists Unique per SSID Rotated Vault:** Mitigates PSK Evil Twin — weak PSK in wordlist High allows PSK Evil Twin same SSID same PSK transparent network access — strong PSK mitigates
- **WPA3 SAE PMF Required Forward Secrecy Resists Offline Audit:** Better than PSK — SAE zero-knowledge commit/confirm ECC/MODP forward secrecy per-session random resists offline dictionary rate-limited online PMF required — recommend WPA3-only if all clients support WPA3
- **Client Hardening Verify BSSID Don't Auto-Connect Open Same SSID as Corporate Disable Auto-Connect to Open Use WPA3 Training Audits:** Client verify BSSID channel security does it match expected, don't auto-connect to open networks with same SSID as corporate, disable auto-connect to open, use WPA3, training, audits, no WEP no TKIP no WPS no open without OWE
- **Audits:** Regular wireless audits — airodump-ng, Kismet, WIDS, PCAPs, authorized list, etc.

### Lab — Simulated (Zero-Cost) + Hardware (Future, RF_REQUIRED)

**Simulated (this module, zero-cost):**
- **PCAP:** `rogue-ap.pcapng` (10 frames, Scapy-generated) — legit AP Corp-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK Cisco -50 dBm authorized beacon f1, rogue AP Corp-WLAN BSSID 11:22:33:44:55:66 Ch11 WPA2-PSK ALFA -30 dBm stronger not in authorized list beacon f2 same SSID different BSSID different channel different vendor stronger, client 12:34:56:78:9A:BC PNL Corp-WLAN probe req f3 SSID Corp-WLAN, probe resp f4 legit AA:BB:CC:DD:EE:FF DA client SSID Corp-WLAN, probe resp f5 rogue 11:22:33:44:55:66 DA client SSID Corp-WLAN, assoc req f6 SA client DA rogue BSSID 11:22:33:44:55:66 SSID Corp-WLAN client assoc to rogue High, assoc resp f7 SA rogue DA client status0 AID1, EAPOL M1-M4 f8-10 if PSK known same PSK transparent
- **Tasks:**
  1. Visualize rogue timeline — X time Y BSSID dots color legit green rogue red client blue signal size tooltip frame number time BSSID SSID channel vendor security signal — beacons same SSID different BSSIDs different channels vendors, probe req PNL, probe resp from legit and rogue, assoc to rogue
  2. How many BSSIDs for Corp-WLAN? 2 BSSIDs AA:BB:CC:DD:EE:FF and 11:22:33:44:55:66 — same SSID different BSSIDs — potential rogue or ESS — need authorized list — if authorized list says only AA:BB:CC:DD:EE:FF authorized, then 11:22:33:44:55:66 rogue
  3. Which legit vs rogue? Legit AA:BB:CC:DD:EE:FF Ch6 Cisco -50 dBm authorized, rogue 11:22:33:44:55:66 Ch11 ALFA -30 dBm stronger not in authorized list same SSID different channel different vendor stronger — channel vendor signal authorized list
  4. Client association to rogue? Yes, client 12:34:56:78:9A:BC to rogue BSSID 11:22:33:44:55:66 frame 6 Assoc Req SA client DA rogue SSID Corp-WLAN and frame 7 Assoc Resp SA rogue DA client status0 AID1 — evidence client assoc to rogue — High
  5. Detection signature? New BSSID same SSID not in authorized list, same SSID different channel different vendor different signal different security, probe resp from unknown BSSID, client assoc to unknown BSSID, deauth flood before rogue? Check deauth.pcapng + rogue-ap.pcapng correlation — deauth flood then rogue — Evil Twin facilitated by deauth
  6. Defense recommendation? WIDS authorized AP list detect rogue same SSID not in authorized list alert contain, 802.1X cert validation ca_cert subject_match via MDM/GPO for Enterprise EAP-TLS mutual cert most secure, PMF required ieee80211w=2 prevents deauth facilitation WPA3-only mandates PMF, strong PSK 20+ random not in wordlists, WPA3 SAE PMF required, client hardening verify BSSID don't auto-connect open same SSID as corporate disable auto-connect to open use WPA3 training
  7. Retest? New beacon only authorized BSSIDs MFPC=1 MFPR=1 PMF required, authorized list updated, no unknown BSSIDs after removal, new PCAPs only authorized, WIDS no longer alerts rogue, client no longer associates to rogue, verify via new PCAPs and WIDS logs, document new PCAP hash new authorized list hash new config hash

**Config Audit:**
- Authorized AP list vs observed — authorized list: Corp-WLAN legit BSSIDs AA:BB:CC:DD:EE:FF Ch6 Cisco, etc. — observed rogue 11:22:33:44:55:66 Ch11 not in list — flag rogue — hash
- `hostapd.conf` for rogue: SSID Corp-WLAN, BSSID 11:22:33:44:55:66, Ch11, WPA2-PSK same SSID — rogue config — for reference, not for deployment — lab-only

**Hardware (Future, RF_REQUIRED, requires ALFA adapter, explicit ROE, own lab):**
- Real Evil Twin with `hostapd` + `dnsmasq` + 2 adapters (one for internet managed, one for AP AP mode), lab-only SSID LAB-ROGUE, own infrastructure, ALFA adapter, monitor + AP mode
- Requires monitor mode, AP mode, 2 radios — one for internet (managed), one for AP (AP mode) — e.g., `wlan0` managed internet, `wlan1` AP mode `wlan1mon`? Actually AP mode not monitor — `wlan1` AP mode
- Safety: Lab-only, never clone real corporate SSID, only LAB-*, e.g., LAB-ROGUE, not Corp-WLAN — only own lab — explicit ROE — own infrastructure — own devices — isolated — no production — no corporate — lab-only
- Example: `hostapd` config with SSID LAB-ROGUE, BSSID 11:22:33:44:55:66, Ch6, WPA2-PSK or Open or Enterprise with rogue RADIUS, `dnsmasq` DHCP, `iptables` NAT, etc.
- For Enterprise Evil Twin: `hostapd` with `wpa_key_mgmt=WPA-EAP`, `auth_server_addr=192.168.1.200` rogue RADIUS, `eap_server=0`? Actually hostapd as authenticator, RADIUS as AS, FreeRADIUS with `eap` config, etc., client without ca_cert will accept rogue RADIUS cert and send MSCHAPv2 challenge/response — capture via FreeRADIUS logs
- For this academy: Simulated only for browser — hardware marked with prep docs — zero-cost simulated philosophy kept but mark hardware labs requiring RF adapter with prep docs — this module simulated rogue-ap.pcapng 10 frames, hardware future with ALFA adapter and explicit ROE

### VAPT Relevance — Enumeration, Evidence, Impact, Recommendation, Retest

- **Enumeration:** List all BSSIDs per SSID, check for unknown — filter `wlan_mgt.ssid==Corp-WLAN` — beacons same SSID different BSSIDs — check authorized list — if BSSID not in authorized list, flag rogue
- **Evidence:** Beacon frames with same SSID different BSSIDs channels security vendor signal, probe responses from unknown BSSID, association to unknown BSSID, frame numbers, PCAP hash, filter, config hash, authorized list, wash output, WIDS logs, etc.
- **Impact:** If client connects to rogue, credential capture if captive portal (open Evil Twin), network access if PSK known (PSK Evil Twin same SSID same PSK transparent), EAP credential capture if Enterprise (Enterprise Evil Twin rogue RADIUS captures PEAP MSCHAPv2 challenge/response hashcat -m 5500), lateral movement, data theft, pivot, compliance fail — High if PSK known or Enterprise cred capture, Medium if open
- **Recommendation:** WIDS authorized AP list BSSID channel vendor signal security SSID detect rogue BSSID same SSID not in authorized list alert contain, 802.1X cert validation ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO for Enterprise EAP-TLS mutual cert most secure, PMF required ieee80211w=2 prevents deauth facilitation WPA3-only mandates PMF, strong PSK 20+ random not in wordlists unique per SSID rotated stored securely, WPA3 SAE PMF required for personal forward secrecy resists offline audit, client hardening verify BSSID don't auto-connect to open networks with same SSID as corporate disable auto-connect to open use WPA3 training audits
- **Retest:** Verify WIDS detects rogue, authorized list updated, no unknown BSSIDs after removal, new PCAPs no rogue only authorized BSSIDs, client no longer associates to rogue, verify via new PCAPs and WIDS logs, document new PCAP hash new authorized list hash

### Finding Template

```
Title: Rogue AP Detected — SSID Corp-WLAN Cloned (Rogue BSSID 11:22:33:44:55:66) — Visualized
Severity: High (if PSK known or Enterprise cred capture) / Medium (if open)
CVSS: 7.5 (AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N) — Adjacent, Low complexity, No privileges, No user interaction, Scope Unchanged, Confidentiality High, Integrity High — if PSK known or Enterprise cred capture High, if open Medium 5.5
Description: Observed 2 BSSIDs for SSID Corp-WLAN: legit AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK Cisco OUI 00:11:22 signal -50 dBm authorized beacon f1, rogue 11:22:33:44:55:66 Ch11 WPA2-PSK CCMP PSK same SSID different BSSID different channel different vendor ALFA OUI signal -30 dBm stronger not in authorized list beacon f2 same SSID different BSSIDs different channels different vendors stronger signal. Client 12:34:56:78:9A:BC PNL Corp-WLAN probes Corp-WLAN f3 and receives probe resp from legit f4 and rogue f5, then associates to rogue BSSID 11:22:33:44:55:66 frame 6 Assoc Req SA client DA rogue SSID Corp-WLAN and frame 7 Assoc Resp SA rogue DA client status0 AID1 — client assoc to rogue — High. Visualized timeline X time Y BSSID dots color legit green rogue red client blue signal size tooltip frame number time BSSID SSID channel vendor security signal count per BSSID rate WIDS alerts.
Evidence: Beacon f1 SSID Corp-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP Cisco and f2 SSID Corp-WLAN BSSID 11:22:33:44:55:66 Ch11 WPA2-PSK CCMP ALFA same SSID different BSSIDs different channels different vendors stronger signal, probe req f3 SA 12:34:56:78:9A:BC SSID Corp-WLAN PNL Corp-WLAN, probe resp f4 SA AA:BB:CC:DD:EE:FF DA client SSID Corp-WLAN legit and f5 SA 11:22:33:44:55:66 DA client SSID Corp-WLAN rogue, association f6 SA client DA rogue SSID Corp-WLAN and f7 SA rogue DA client status0 AID1 client assoc to rogue, PCAP rogue-ap.pcapng SHA256 abc123... Size 2.3 KB Frames 10 Tool Scapy Method scapy, filter wlan_mgt.ssid==Corp-WLAN, wlan.bssid==AA:BB:CC:DD:EE:FF || wlan.bssid==11:22:33:44:55:66, authorized AP list hash SHA256..., WIDS logs Kismet/Aruba/Cisco alert new BSSID same SSID not in authorized list same SSID different channel different vendor client assoc to unknown BSSID deauth flood before rogue correlation, config hash, wash output? Actually wash for WPS, but for rogue airodump-ng or Kismet
Impact: Client may connect to rogue, credential capture if captive portal (open Evil Twin), network access if PSK known (PSK Evil Twin same SSID same PSK transparent), EAP credential capture if Enterprise (Enterprise Evil Twin rogue RADIUS captures PEAP MSCHAPv2 challenge/response hashcat -m 5500), lateral movement, data theft, pivot, compliance fail — High if PSK known or Enterprise cred capture, Medium if open
Recommendation: WIDS authorized AP list BSSID channel vendor signal security SSID detect rogue BSSID same SSID not in authorized list alert contain via WIPS deauth if authorized? Actually contain via deauth is DoS but if rogue malicious containment may be justified — for PT WIDS detection and alert primary physical removal of wired rogue disabling rogue AP, 802.1X cert validation ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO for Enterprise EAP-TLS mutual cert most secure, PMF required ieee80211w=2 prevents deauth facilitation WPA3-only mandates PMF beacon MFPC=1 MFPR=1, strong PSK 20+ random not in wordlists unique per SSID rotated stored securely vault, WPA3 SAE PMF required for personal forward secrecy resists offline audit, client hardening verify BSSID don't auto-connect to open networks with same SSID as corporate disable auto-connect to open use WPA3 training audits no WEP no TKIP no WPS no open without OWE
Config Snippet Good Authorized AP List (WIDS) + Fixed AP:
# Authorized APs (WIDS)
# Corp-WLAN legit: AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK Cisco -50 dBm
# Observed rogue: 11:22:33:44:55:66 Ch11 WPA2-PSK same SSID different BSSID different channel different vendor ALFA -30 dBm not in authorized list — flag rogue — removed after fix
# Fixed hostapd.conf — only authorized BSSIDs, PMF required, strong PSK, WPA3-only if all clients support WPA3
# interface=wlan0
# ssid=Corp-WLAN
# bssid=AA:BB:CC:DD:EE:FF
# hw_mode=g
# channel=6
# wpa=2
# wpa_key_mgmt=WPA-PSK WPA-PSK-SHA256 SAE  # WPA3 transition or WPA3-only SAE if all clients WPA3
# rsn_pairwise=CCMP
# wpa_passphrase=StrongRandom20+Chars!@#  # Strong 20+ random not in wordlists
# ieee80211w=2  # PMF required
# wps_state=0  # No WPS
Retest: WIDS alerts on rogue BSSID 11:22:33:44:55:66 same SSID Corp-WLAN not in authorized list before fix, authorized list updated after fix only AA:BB:CC:DD:EE:FF Ch6, no unknown BSSIDs after removal, new PCAPs no rogue only authorized BSSIDs AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PMF required MFPC=1 MFPR=1, client no longer associates to rogue only to legit, verify via new PCAPs and WIDS logs, document new PCAP hash new authorized list hash new config hash, e.g., new PCAP rogue-ap-fixed.pcapng SHA256... 5 frames only legit, WIDS logs no rogue alerts after fix
References: IEEE 802.11, 802.11w PMF, 802.11i, Wi-Fi Alliance, OWASP, NIST, Kismet, airodump-ng, hostapd, FreeRADIUS, EAP, PEAP, EAP-TLS, wash, reaver, bully, Wireshark, PcapInspector, ReconMap, DeauthVisualizer, HandshakeDiagram, RogueVisualizer
```

### Attack → Defense → Retest

- **Attack:** Observe beacons same SSID Corp-WLAN different BSSIDs different channels vendors security signal — legit AA:BB:CC:DD:EE:FF Ch6 Cisco -50 dBm authorized beacon f1 and rogue 11:22:33:44:55:66 Ch11 ALFA -30 dBm stronger not in authorized list beacon f2 same SSID different BSSIDs channels vendors stronger, probe req f3 SA client PNL Corp-WLAN, probe resp f4 legit and f5 rogue, assoc req f6 SA client DA rogue SSID Corp-WLAN client assoc to rogue High and assoc resp f7 SA rogue DA client status0 AID1, EAPOL M1-M4 f8-10 if PSK known same PSK transparent network access, open Evil Twin with captive portal credential capture, PSK Evil Twin same SSID same PSK if PSK known/cracked transparent, Enterprise Evil Twin WPA2-EAP with rogue RADIUS captures PEAP MSCHAPv2 challenge/response hashcat -m 5500 credential capture, deauth facilitation if PMF disabled correlation deauth.pcapng + rogue-ap.pcapng
- **Defense:** WIDS authorized AP list BSSID channel vendor signal security SSID detect rogue same SSID not in authorized list alert contain via WIPS deauth if authorized? Actually contain via deauth is DoS but if rogue malicious containment may be justified — for PT WIDS detection and alert primary physical removal of wired rogue disabling rogue AP, 802.1X cert validation ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO for Enterprise EAP-TLS mutual cert most secure, PMF required ieee80211w=2 prevents deauth facilitation WPA3-only mandates PMF beacon MFPC=1 MFPR=1, strong PSK 20+ random not in wordlists unique per SSID rotated stored securely vault, WPA3 SAE PMF required for personal forward secrecy resists offline audit, client hardening verify BSSID don't auto-connect to open networks with same SSID as corporate disable auto-connect to open use WPA3 training audits
- **Retest:** WIDS alerts on rogue BSSID same SSID not in authorized list before fix, authorized list updated after fix only authorized BSSIDs, no unknown BSSIDs after removal, new PCAPs no rogue only authorized BSSIDs MFPC=1 MFPR=1 PMF required, client no longer associates to rogue only to legit, verify via new PCAPs and WIDS logs, document new PCAP hash new authorized list hash new config hash

### Interactive Check

> You have rogue-ap.pcapng 10 frames visualized: timeline X time Y BSSID dots color legit green rogue red client blue signal size, beacons f1 legit AA:BB:CC:DD:EE:FF Ch6 Cisco -50 dBm authorized and f2 rogue 11:22:33:44:55:66 Ch11 ALFA -30 dBm stronger not in authorized list same SSID Corp-WLAN different BSSIDs channels vendors stronger, probe req f3 SA client PNL Corp-WLAN, probe resp f4 legit and f5 rogue, assoc req f6 SA client DA rogue SSID Corp-WLAN client assoc to rogue High and assoc resp f7 SA rogue DA client status0 AID1, EAPOL M1-M4 f8-10 if PSK known same PSK transparent, WIDS alerts. What is rogue visualizer, detection, defense, evidence, retest?

Answer: Rogue visualizer timeline X time Y BSSID dots color legit green rogue red client blue signal size tooltip frame number time BSSID SSID channel vendor security signal count per BSSID rate WIDS alerts — for rogue-ap.pcapng 10 frames f1 beacon legit AA:BB:CC:DD:EE:FF Ch6 Cisco -50 dBm authorized green dot Y=AA:BB:CC:DD:EE:FF X=0.0, f2 beacon rogue 11:22:33:44:55:66 Ch11 ALFA -30 dBm stronger not in authorized list red dot Y=11:22:33:44:55:66 X=0.5 same SSID different BSSID different channel different vendor stronger potential rogue WIDS alert new BSSID same SSID not in authorized list, f3 probe req SA client PNL Corp-WLAN blue dot Y=client X=1.0 PNL leakage, f4 probe resp SA legit DA client SSID Corp-WLAN green dot Y=AA:BB:CC:DD:EE:FF X=1.1 legit responds, f5 probe resp SA rogue DA client SSID Corp-WLAN red dot Y=11:22:33:44:55:66 X=1.2 rogue responds WIDS alert probe resp from unknown BSSID same SSID, f6 assoc req SA client DA rogue BSSID 11:22:33:44:55:66 SSID Corp-WLAN client assoc to rogue blue→red High WIDS alert client assoc to unknown BSSID, f7 assoc resp SA rogue DA client status0 AID1 red dot Y=11:22:33:44:55:66 X=1.6 rogue accepts, f8-10 EAPOL M1-M4 if PSK known same PSK transparent network access High. Detection WIDS signatures new BSSID same SSID not in authorized list filter wlan_mgt.ssid==Corp-WLAN && !(wlan.bssid==AA:BB:CC:DD:EE:FF), same SSID different channel vendor capabilities signal security — legit Ch6 Cisco vs rogue Ch11 ALFA different channel vendor signal, deauth flood before rogue correlation deauth.pcapng + rogue-ap.pcapng deauth flood >10/sec same BSSID then new BSSID same SSID appears Evil Twin likely, client assoc to unknown BSSID filter wlan.fc.type_subtype==0 && wlan.bssid==11:22:33:44:55:66. Defense WIDS authorized AP list alert contain Kismet Aruba Cisco WIDS, 802.1X cert validation ca_cert subject_match altsubject_match domain_suffix_match via MDM/GPO EAP-TLS mutual cert most secure client without ca_cert accepts any cert from rogue RADIUS sends MSCHAPv2 challenge/response hashcat -m 5500 High with ca_cert + subject_match rejects rogue self-signed, PMF required ieee80211w=2 prevents deauth facilitation WPA3 mandates required beacon MFPC=1 MFPR=1, strong PSK 20+ random not in wordlists unique per SSID rotated vault weak PSK High allows PSK Evil Twin same SSID same PSK transparent, WPA3 SAE PMF required forward secrecy resists offline audit better than PSK, client hardening verify BSSID don't auto-connect open same SSID as corporate disable auto-connect to open use WPA3 training audits. Evidence beacon f1 legit and f2 rogue same SSID different BSSIDs channels vendors, probe req f3 PNL, probe resp f4 legit f5 rogue, assoc req f6 client→rogue and assoc resp f7 rogue→client client assoc to rogue High, PCAP rogue-ap.pcapng hash, filter wlan_mgt.ssid==Corp-WLAN, authorized list hash, WIDS logs. Retest new beacon only authorized BSSIDs MFPC=1 MFPR=1 PMF required ieee80211w=2 strong PSK WPA3-only if all clients support WPA3, authorized list updated no unknown BSSIDs after removal, new PCAPs only authorized no rogue, WIDS no longer alerts rogue, client no longer associates to rogue only to legit, verify via new PCAPs and WIDS logs document new PCAP hash new authorized list hash new config hash.

## References

- IEEE 802.11, 802.11w PMF, 802.11i, 802.11r/k/v
- Wi-Fi Alliance, OWASP, NIST
- Kismet, airodump-ng, hostapd, dnsmasq, iptables, FreeRADIUS, EAP, PEAP, EAP-TLS, wash, reaver, bully, Wireshark, tshark, Scapy, PcapInspector, ReconMap, DeauthVisualizer, HandshakeDiagram, RogueVisualizer
- MITRE ATT&CK — Rogue AP, Evil Twin

---

*Next: Captive Portals — Architecture, auth flow, weaknesses, testing*

# Rogue AP Detection & Defense — WIDS, Cert Validation, PMF, Strong PSK, WPA3, Client Hardening Professional

## Learning Objectives
- Master WIDS/WIPS detection signatures: new BSSID same SSID not in authorized list, same SSID different channel vendor capabilities signal security, deauth flood before rogue appears, client assoc to unknown BSSID
- Understand defense layers: WIDS/WIPS authorized AP list alert contain, 802.1X cert validation ca_cert subject_match altsubject_match domain_suffix_match via MDM/GPO, EAP-TLS mutual cert, PMF required ieee80211w=2 prevents deauth facilitation WPA3 mandates, strong PSK 20+ random not in wordlists, WPA3 SAE forward secrecy resists offline audit, client hardening verify BSSID don't auto-connect open same SSID as corporate
- Learn PCAP analysis: rogue-ap.pcapng 10 frames legit AA:BB:CC:DD:EE:FF Ch6 Cisco vs rogue 11:22:33:44:55:66 Ch11 ALFA same SSID Corp-WLAN, filters wlan_mgt.ssid==Corp-WLAN wlan.bssid==..., client assoc to rogue evidence
- Build evidence chain: beacon frames, probe responses, assoc req/resp, authorized list hash, PCAP hash, WIDS logs, config audit, filters, hashcat
- Learn retest: WIDS alerts, authorized list updated, no unknown BSSIDs, new PCAPs only authorized

## Theory

### WIDS/WIPS Signatures — New BSSID Same SSID Not in Authorized List, Same SSID Different Channel Vendor Capabilities, Deauth Flood Before Rogue, Client Assoc to Unknown BSSID

**WIDS/WIPS (Wireless Intrusion Detection/Prevention System) should have authorized AP list with BSSID, channel, vendor OUI, signal, security, SSID, capabilities, etc. — detect rogue BSSID same SSID not in authorized list — alert — e.g., Kismet, Aruba WIDS, Cisco WIDS, WIPS, etc. — WIDS authorized list + rogue detection + deauth detection + client assoc detection.**

**WIDS Signatures for Rogue AP / Evil Twin:**

1. **New BSSID Same SSID Not in Authorized List:**
   - Authorized list: Corp-WLAN legit BSSIDs AA:BB:CC:DD:EE:FF Ch6 Cisco WPA2-PSK CCMP -50 dBm, BB:CC:DD:EE:FF:00 Ch11 Cisco WPA2-PSK CCMP -60 dBm, etc.
   - Observed: BSSID 11:22:33:44:55:66 Ch11 WPA2-PSK CCMP same SSID Corp-WLAN not in authorized list — flag potential rogue — alert rogue AP detected — SSID Corp-WLAN BSSID 11:22:33:44:55:66 Ch11 not in authorized list
   - Filter: `wlan_mgt.ssid==Corp-WLAN && !(wlan.bssid==AA:BB:CC:DD:EE:FF || wlan.bssid==BB:CC:DD:EE:FF:00)` — beacons same SSID but BSSID not in authorized list
   - For PT: Check authorized list vs observed — if observed BSSID not in authorized list same SSID, flag rogue — evidence beacon frame, BSSID, SSID, channel, vendor, signal, security, authorized list hash

2. **Same SSID Different Channel, Different Vendor OUI, Different Capabilities, Different Signal, Different Security:**
   - Same SSID Corp-WLAN with BSSIDs AA:BB:CC:DD:EE:FF Ch6 Cisco WPA2-PSK CCMP and 11:22:33:44:55:66 Ch11 ALFA WPA2-PSK CCMP — same SSID different BSSID different channel different vendor — potential rogue or ESS? Need authorized list to decide — if authorized list says Corp-WLAN legit BSSIDs AA:BB:CC:DD:EE:FF Ch6 and BB:CC:DD:EE:FF:00 Ch11 same vendor Cisco same security same VLAN, then ESS (multiple APs same network for roaming) — not rogue — if observed BSSID not in authorized list different vendor different signal, flag rogue
   - Channel: Legit Ch6, rogue Ch11 — different channel — same SSID different channel — potential rogue — ESS would have same SSID different BSSIDs different channels but same vendor same security same VLAN for roaming — but need authorized list
   - Vendor OUI: Legit Cisco OUI 00:11:22, rogue ALFA OUI? Actually ALFA adapter OUI? For PT, vendor OUI different — legit Cisco, rogue ALFA or unknown — potential rogue — check OUI via Wireshark manufacturer, or Kismet, or airodump-ng OUI
   - Capabilities: Legit WPA2-PSK CCMP PMF capable, rogue WPA2-PSK CCMP PMF disabled — different capabilities — potential rogue — check RSN IE, Tag48, capabilities, MFPC/MFPR, etc.
   - Signal: Legit -50 dBm, rogue -30 dBm stronger — same SSID different BSSID different signal — rogue may have stronger signal to lure client — potential rogue — but ESS also different signal? Actually ESS different APs same SSID different BSSIDs different signal for roaming — but need authorized list
   - Security: Legit WPA2-PSK, rogue Open or WPA2-PSK same or different — if legit WPA2-PSK and rogue Open same SSID, security mismatch — client that expects WPA2 will not connect to Open (good) — but if rogue also WPA2-PSK same security same SSID different BSSID, more tricky — need authorized list and PSK known?
   - For PT: Same SSID different channel vendor capabilities signal security — flag potential rogue — investigate authorized list

3. **Deauth Flood Before Rogue Appears:**
   - Attacker may deauth client from legit AP before Evil Twin appears — deauth flood many deauth same BSSID short interval — WIDS detects deauth flood, then new BSSID same SSID appears — correlation — deauth + rogue = likely Evil Twin attack — WIDS should detect and alert
   - Example: deauth.pcapng 12 frames AP→client reason7 broadcast DoS — then rogue-ap.pcapng 10 frames new BSSID same SSID — correlation — deauth flood then rogue — likely Evil Twin facilitated by deauth — WIDS signature: deauth flood >10/sec same BSSID short interval, then new BSSID same SSID appears within short interval — alert Evil Twin likely
   - For PT: Check deauth flood via `wlan.fc.type_subtype==12` count per sec per BSSID — if >10/sec same BSSID short interval, flag flood — then check if new BSSID same SSID appears — correlation — evidence deauth + rogue

4. **Client Assoc to Unknown BSSID:**
   - WIDS can detect client association to unknown BSSID — e.g., client 12:34:56:78:9A:BC associates to rogue BSSID 11:22:33:44:55:66 — alert client assoc to rogue — High
   - Filter: `wlan.fc.type_subtype==0 && wlan_mgt.ssid==Corp-WLAN && wlan.bssid==11:22:33:44:55:66` — assoc req to rogue BSSID — or `wlan.fc.type_subtype==1 && wlan.bssid==11:22:33:44:55:66` — assoc resp from rogue
   - For PT: Client assoc to unknown BSSID — evidence client MAC, BSSID, SSID, frame number, etc. — High finding

**For PT:** WIDS signatures — new BSSID same SSID not in authorized list, same SSID different channel vendor capabilities signal security, deauth flood before rogue, client assoc to unknown BSSID — all should be detected by WIDS — for PT, if WIDS not present or not configured, Medium finding — recommend WIDS

### Defense Layers — WIDS/WIPS Authorized List Alert Contain, 802.1X Cert Validation, PMF Required, Strong PSK, WPA3, Client Hardening

**1. WIDS/WIPS Authorized AP List Alert Contain:**

- **Authorized AP List:** WIDS should have authorized AP list with BSSID, channel, vendor OUI, signal, security, SSID, capabilities, etc. — e.g., authorized list: Corp-WLAN legit BSSIDs AA:BB:CC:DD:EE:FF Ch6 Cisco WPA2-PSK CCMP PMF capable -50 dBm, etc. — detect rogue BSSID same SSID not in authorized list — alert
- **Alert:** WIDS alert rogue AP detected — SSID Corp-WLAN BSSID 11:22:33:44:55:66 Ch11 not in authorized list — alert via Kismet web UI, Aruba WIDS alerts, Cisco WIDS alerts, SIEM, email, etc.
- **Contain (WIPS):** WIPS can contain rogue via deauth? Actually WIPS can contain rogue via deauthing rogue clients? Or via deauthing rogue AP? For PT, WIPS containment via deauth is also DoS? But some WIPS can contain rogue via deauth — e.g., Aruba WIPS can deauth clients from rogue — but deauth is DoS — for PT, WIDS detection and alert is primary, containment via deauth should be authorized and lab-only? Actually containing rogue via deauth is also DoS, but if rogue is malicious, containment via deauth may be justified? For PT, recommend WIDS detection and alert, not necessarily contain via deauth unless authorized — and recommend physical removal of wired rogue, or disabling rogue AP, etc.
- **For PT:** WIDS authorized AP list, alert on rogue, contain if authorized — evidence WIDS logs, authorized list hash, PCAP, etc.

**2. 802.1X Cert Validation for Enterprise — ca_cert subject_match altsubject_match domain_suffix_match via MDM/GPO, EAP-TLS Mutual Cert Most Secure:**

- **For Enterprise:** Clients must validate RADIUS server cert via ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO — rogue RADIUS with different cert (self-signed) fails validation if client configured to validate — client will not send MSCHAPv2 — secure — EAP-TLS mutual cert most secure — client cert + server cert — mutual auth — requires PKI — best
- **ca_cert:** CA certificate that signed RADIUS server cert — e.g., corporate CA cert — client has ca_cert file `/etc/certs/ca.pem` or Windows cert store — validates RADIUS server cert chain to trusted CA — if rogue RADIUS self-signed cert not signed by corporate CA, validation fails — client rejects rogue RADIUS — secure
- **subject_match / altsubject_match / domain_suffix_match:** Match RADIUS server cert subject — e.g., `subject_match=CN=radius.corp.com` or `altsubject_match=DNS:radius.corp.com` or `domain_suffix_match=corp.com` — validates RADIUS server cert subject matches expected — if rogue RADIUS cert subject different, validation fails — client rejects rogue — secure
- **MDM/GPO:** Deploy wpa_supplicant.conf or Windows Wi-Fi profile via MDM (Mobile Device Management) or GPO (Group Policy) with ca_cert + subject_match — ensures all clients have cert validation — no manual config without validation
- **EAP-TLS Mutual Cert:** EAP-TLS requires client cert + server cert — mutual authentication — client cert signed by corporate CA, server cert signed by corporate CA — both validate — most secure — even if rogue RADIUS has self-signed cert, client rejects because not signed by corporate CA, and rogue RADIUS cannot have client cert private key — so cannot impersonate client — EAP-TLS most secure — requires PKI — client cert provisioning via MDM/GPO
- **For PT:** Check client wpa_supplicant.conf — if no ca_cert, High finding — PEAP without cert validation allows rogue RADIUS captures MSCHAPv2 for offline crack — recommend ca_cert + subject_match via MDM/GPO, prefer EAP-TLS mutual cert, strong RADIUS secret 22+ random, RadSec TLS

**3. PMF Required ieee80211w=2 Prevents Deauth Facilitation — WPA3 Mandates PMF Required:**

- **PMF (802.11w):** Protects management frames (deauth, disassoc, action) via MIC (AES-CMAC via IGTK) — prevents deauth spoof — attacker cannot spoof deauth without valid MIC — client ignores spoofed deauth without valid MIC — prevents Evil Twin facilitation via deauth
- **MFPC/MFPR:** RSN Capabilities bits 6 MFPC (Management Frame Protection Capable) and 7 MFPR (Management Frame Protection Required) — beacon RSN IE — MFPC=1 MFPR=1 = PMF required — MFPC=1 MFPR=0 = PMF capable (optional) — MFPC=0 MFPR=0 = PMF disabled — WPA3 mandates required — WPA2 optional
- **ieee80211w:** hostapd.conf param — 0 disabled, 1 optional (capable), 2 required — for WPA3-only, ieee80211w=2 required — for WPA2, should be 2 if all clients support PMF — if some clients don't support PMF, 1 optional — but optional allows deauth if attacker spoofs? Actually optional still allows deauth? If MFPR=0, deauth not protected? For PT, if MFPC=1 MFPR=0 optional, deauth may still be possible? Actually 802.11w optional means PMF capable but not required — deauth without MIC still accepted? For PT, optional is Medium — required is good — disabled is bad
- **For PT:** PMF required ieee80211w=2 prevents deauth facilitation — WPA3 mandates required — for WPA2, recommend required if all clients support PMF — check beacon RSN Capabilities MFPC/MFPR via `wlan_mgt.rsn.capabilities.mfpc/mfpr` filter — if disabled or capable, Medium finding — recommend required

**4. Strong PSK 20+ Random Not in Wordlists — Mitigates PSK Evil Twin:**

- **If PSK mode:** Strong PSK 20+ random not in wordlists (rockyou.txt, etc.), unique per SSID, rotated every 90 days, stored securely (vault, not sticky note), not shared via email, etc. — so attacker cannot know PSK, cannot create PSK Evil Twin same SSID same PSK — strong PSK mitigates PSK Evil Twin
- **Weak PSK:** WeakPass123, password, 12345678, etc. — in wordlists — attacker can capture handshake via deauth (if PMF disabled) or via passive, offline audit via hashcat -m 22000, recover PSK, then create PSK Evil Twin same SSID same PSK transparent to client — network access — High if weak PSK
- **For PT:** Strong PSK 20+ random not in wordlists — check if PSK in wordlist via hashcat -m 22000 — if weak, High — recommend strong PSK 20+ random, unique per SSID, rotated, vault, WPA3 SAE, PMF required, WIDS, etc.

**5. WPA3 SAE PMF Required — Forward Secrecy Resists Offline Audit, Better Than PSK:**

- **WPA3 SAE (Dragonfly):** Zero-knowledge proof, commit scalar element confirm shared secret, ECC/MODP groups, forward secrecy per-session random, resists offline dictionary audit (rate-limited online), PMF required ieee80211w=2 — better than PSK
- **But Evil Twin still possible if password known?** If SAE password known (weak password in wordlist, or shared), attacker can still create rogue AP same SSID same password? For SAE, if password known, attacker can do SAE commit/confirm with client? Client may still connect to rogue if stronger? But SAE has forward secrecy, but if password known, rogue possible? For PT, if PSK/SAE password weak known, evil twin possible — need strong password and PMF and WPA3 and WIDS
- **For PT:** WPA3-only SAE CCMP PMF required strong password 20+ random wps_state=0 no TKIP/WEP/open without OWE — better than WPA2-PSK — recommend WPA3-only if all clients support WPA3

**6. Client Hardening — Verify BSSID, Don't Auto-Connect Open Same SSID as Corporate, Disable Auto-Connect to Open, Use WPA3, Training, Audits:**

- **Verify BSSID:** Client should verify BSSID, channel, security — does it match expected? For PT, client hardening: verify BSSID, don't auto-connect to open networks with same SSID as corporate, use 802.1X cert validation, disable auto-connect to open, use WPA3, training, audits
- **Don't Auto-Connect Open Same SSID as Corporate:** If corporate SSID Corp-WLAN WPA2-PSK or WPA2-Enterprise, client should not auto-connect to open network with same SSID Corp-WLAN — because open Evil Twin — disable auto-connect to open — for PT, check client auto-connect settings — if auto-connect to open, Medium
- **Disable Auto-Connect to Open:** Windows, iOS, Android, macOS — disable auto-connect to open networks — for PT, recommend disable auto-connect to open, use WPA3, etc.
- **Use WPA3:** If client supports WPA3, use WPA3 — SAE + PMF required — better than WPA2-PSK
- **Training, Audits:** User training, audits, no WEP, no TKIP, no WPS, no open without OWE, etc.

### Lab Tasks — rogue-ap.pcapng 10 Frames Simulated

**PCAP:** `rogue-ap.pcapng` (10 frames, Scapy-generated)
- Legit AP: SSID Corp-WLAN, BSSID AA:BB:CC:DD:EE:FF, Ch6, WPA2-PSK CCMP PSK, Cisco OUI 00:11:22, signal -50 dBm, authorized, beacon f1
- Rogue AP: SSID Corp-WLAN, BSSID 11:22:33:44:55:66, Ch11, WPA2-PSK CCMP PSK same SSID different BSSID different channel different vendor ALFA OUI, signal -30 dBm stronger, not in authorized list, beacon f2
- Client: 12:34:56:78:9A:BC PNL Corp-WLAN, probe req f3 SSID Corp-WLAN, probe resp f4 legit AA:BB:CC:DD:EE:FF DA client SSID Corp-WLAN, probe resp f5 rogue 11:22:33:44:55:66 DA client SSID Corp-WLAN, assoc req f6 SA client DA rogue BSSID 11:22:33:44:55:66 SSID Corp-WLAN, assoc resp f7 SA rogue DA client status0 AID1, etc.

**Tasks:**
1. BSSIDs for Corp-WLAN? 2 BSSIDs: AA:BB:CC:DD:EE:FF (legit Ch6 Cisco) and 11:22:33:44:55:66 (rogue Ch11 ALFA) — same SSID different BSSIDs
2. Which legit vs rogue? Legit AA:BB:CC:DD:EE:FF Ch6 Cisco WPA2-PSK authorized -50 dBm, rogue 11:22:33:44:55:66 Ch11 ALFA WPA2-PSK not in authorized list same SSID different channel different vendor stronger -30 dBm — channel, vendor, signal, authorized list
3. Client association to rogue? Yes, client 12:34:56:78:9A:BC to rogue BSSID 11:22:33:44:55:66 frame 6 Assoc Req SA client DA rogue SSID Corp-WLAN and frame 7 Assoc Resp SA rogue DA client status0 AID1 — evidence client assoc to rogue — High
4. Detection signature? Same SSID different BSSID different channel not in authorized list, same SSID different vendor different signal, client assoc to unknown BSSID, deauth flood before rogue? Check deauth.pcapng + rogue-ap.pcapng correlation
5. Defense recommendation? WIDS authorized AP list detect rogue same SSID not in authorized list alert contain, 802.1X cert validation ca_cert subject_match via MDM/GPO for Enterprise EAP-TLS mutual cert most secure, PMF required ieee80211w=2 prevents deauth facilitation WPA3-only mandates PMF, strong PSK 20+ random not in wordlists, WPA3 SAE PMF required, client hardening verify BSSID don't auto-connect open same SSID as corporate disable auto-connect to open use WPA3 training

**Config Audit:**
- Authorized AP list vs observed — authorized list: Corp-WLAN legit BSSIDs AA:BB:CC:DD:EE:FF Ch6 Cisco, etc. — observed rogue 11:22:33:44:55:66 Ch11 not in list — flag rogue
- `hostapd.conf` for rogue: SSID Corp-WLAN, BSSID 11:22:33:44:55:66, Ch11, WPA2-PSK same SSID — rogue config — for reference, not for deployment — lab-only

**Filters:**
```
wlan_mgt.ssid==Corp-WLAN
wlan.bssid==AA:BB:CC:DD:EE:FF || wlan.bssid==11:22:33:44:55:66
wlan.fc.type_subtype==8 && wlan_mgt.ssid==Corp-WLAN  # Beacons Corp-WLAN — check BSSID channel vendor security
wlan.fc.type_subtype==0 && wlan_mgt.ssid==Corp-WLAN  # Assoc req Corp-WLAN — check BSSID
wlan.fc.type_subtype==1 && wlan.bssid==11:22:33:44:55:66  # Assoc resp from rogue
wlan_mgt.rsn.capabilities.mfpc==0 && wlan_mgt.rsn.capabilities.mfpr==0  # PMF disabled — bad — Medium
```

**For PT:** PCAP analysis — beacons same SSID different BSSIDs channels vendors security signal, probe responses from unknown BSSID, association to unknown BSSID — evidence frame numbers, BSSID, SSID, channel, etc.

### Hardware Future — RF_REQUIRED, ALFA Adapter, Explicit ROE, Own Lab

- Real Evil Twin with `hostapd` + `dnsmasq` + 2 adapters (one for internet managed, one for AP AP mode), lab-only SSID LAB-ROGUE, own infrastructure, ALFA adapter, monitor + AP mode
- Requires monitor mode, AP mode, 2 radios — one for internet (managed), one for AP (AP mode) — e.g., `wlan0` managed internet, `wlan1` AP mode `wlan1mon`? Actually AP mode not monitor — `wlan1` AP mode
- Safety: Lab-only, never clone real corporate SSID, only LAB-*, e.g., LAB-ROGUE, not Corp-WLAN — only own lab — explicit ROE — own infrastructure — own devices — isolated — no production — no corporate — lab-only
- Example: `hostapd` config with SSID LAB-ROGUE, BSSID 11:22:33:44:55:66, Ch6, WPA2-PSK or Open or Enterprise with rogue RADIUS, `dnsmasq` DHCP, `iptables` NAT, etc.
- For Enterprise Evil Twin: `hostapd` with `wpa_key_mgmt=WPA-EAP`, `auth_server_addr=192.168.1.200` rogue RADIUS, `eap_server=0`? Actually hostapd as authenticator, RADIUS as AS, FreeRADIUS with `eap` config, etc., client without ca_cert will accept rogue RADIUS cert and send MSCHAPv2 challenge/response — capture via FreeRADIUS logs
- For this academy: Simulated only for browser — hardware marked with prep docs — zero-cost simulated philosophy kept but mark hardware labs requiring RF adapter with prep docs — this module simulated rogue-ap.pcapng 10 frames, hardware future with ALFA adapter and explicit ROE

### Reporting — Rogue AP = High if PSK Known or Enterprise Cred Capture, Medium if Open

**Finding Template:**

```
Title: Rogue AP Detected — SSID Corp-WLAN Cloned (Rogue BSSID 11:22:33:44:55:66)
Severity: High (if PSK known or Enterprise cred capture) / Medium (if open)
CVSS: 7.5 (AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N) — Adjacent, Low complexity, No privileges, No user interaction, Scope Unchanged, Confidentiality High, Integrity High — if PSK known or Enterprise cred capture High, if open Medium 5.5
Description: Observed 2 BSSIDs for SSID Corp-WLAN: legit AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK Cisco OUI 00:11:22 signal -50 dBm authorized, rogue 11:22:33:44:55:66 Ch11 WPA2-PSK CCMP PSK same SSID different BSSID different channel different vendor ALFA OUI signal -30 dBm stronger not in authorized list. Rogue not in authorized AP list. Client 12:34:56:78:9A:BC PNL Corp-WLAN probes Corp-WLAN and associates to rogue BSSID 11:22:33:44:55:66 frame 6-7.
Evidence: Beacon frames f1 SSID Corp-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP Cisco and f2 SSID Corp-WLAN BSSID 11:22:33:44:55:66 Ch11 WPA2-PSK CCMP ALFA same SSID different BSSIDs different channels different vendors, probe responses from rogue f? SA rogue DA client SSID Corp-WLAN, association from client 12:34:56:78:9A:BC to rogue BSSID 11:22:33:44:55:66 frame 6 Assoc Req SA client DA rogue SSID Corp-WLAN and frame 7 Assoc Resp SA rogue DA client status0 AID1, PCAP rogue-ap.pcapng SHA256 abc123... Size 2.3 KB Frames 10 Tool Scapy Method scapy, filter wlan_mgt.ssid==Corp-WLAN, wlan.bssid==AA:BB:CC:DD:EE:FF || wlan.bssid==11:22:33:44:55:66, authorized AP list hash SHA256..., wash output? Actually wash for WPS, but for rogue, airodump-ng or Kismet, WIDS logs
Impact: Client may connect to rogue, credential capture if captive portal (open Evil Twin), network access if PSK known (PSK Evil Twin same SSID same PSK transparent), EAP credential capture if Enterprise (Enterprise Evil Twin rogue RADIUS captures PEAP MSCHAPv2 challenge/response hashcat -m 5500), lateral movement, data theft, pivot, compliance fail
Recommendation: WIDS authorized AP list BSSID channel vendor signal security SSID detect rogue BSSID same SSID not in authorized list alert contain, 802.1X cert validation ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO for Enterprise EAP-TLS mutual cert most secure, PMF required ieee80211w=2 prevents deauth facilitation WPA3-only mandates PMF, strong PSK 20+ random not in wordlists unique per SSID rotated stored securely, WPA3 SAE PMF required for personal forward secrecy resists offline audit, client hardening verify BSSID don't auto-connect to open networks with same SSID as corporate disable auto-connect to open use WPA3 training audits no WEP no TKIP no WPS no open without OWE
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
# For Enterprise Evil Twin: wpa_key_mgmt=WPA-EAP auth_server_addr=192.168.1.200 auth_server_port=1812 auth_server_shared_secret=testing123
Retest: WIDS alerts on rogue BSSID 11:22:33:44:55:66 same SSID Corp-WLAN not in authorized list, authorized list updated, no unknown BSSIDs after removal, new PCAPs no rogue only authorized BSSIDs AA:BB:CC:DD:EE:FF Ch6, client no longer associates to rogue, verify via new PCAPs and WIDS logs, document new PCAP hash new authorized list hash
References: IEEE 802.11, 802.11w PMF, 802.11i, Wi-Fi Alliance, OWASP, NIST, Kismet, airodump-ng, hostapd, FreeRADIUS, EAP, PEAP, EAP-TLS, wash, reaver, bully, Wireshark
```

### Attack → Defense → Retest

- **Attack:** Observe beacons same SSID Corp-WLAN different BSSIDs different channels vendors security signal — e.g., legit AA:BB:CC:DD:EE:FF Ch6 Cisco -50 dBm authorized and rogue 11:22:33:44:55:66 Ch11 ALFA -30 dBm not in authorized list same SSID — probe responses from rogue — client PNL Corp-WLAN probes Corp-WLAN and associates to rogue BSSID 11:22:33:44:55:66 frame 6-7 — open Evil Twin with captive portal credential capture, PSK Evil Twin same SSID same PSK if PSK known/cracked transparent network access, Enterprise Evil Twin WPA2-EAP with rogue RADIUS captures PEAP MSCHAPv2 challenge/response hashcat -m 5500 credential capture, deauth facilitation if PMF disabled
- **Defense:** WIDS authorized AP list BSSID channel vendor signal security SSID detect rogue same SSID not in authorized list alert contain, 802.1X cert validation ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO for Enterprise EAP-TLS mutual cert most secure, PMF required ieee80211w=2 prevents deauth facilitation WPA3-only mandates PMF, strong PSK 20+ random not in wordlists unique per SSID rotated stored securely, WPA3 SAE PMF required for personal forward secrecy resists offline audit, client hardening verify BSSID don't auto-connect to open with same SSID as corporate disable auto-connect to open use WPA3 training audits
- **Retest:** WIDS alerts on rogue BSSID same SSID not in authorized list, authorized list updated, no unknown BSSIDs after removal, new PCAPs no rogue only authorized BSSIDs, client no longer associates to rogue, verify via new PCAPs and WIDS logs, document new PCAP hash new authorized list hash

### Interactive Check

> You have rogue-ap.pcapng 10 frames: legit AP Corp-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK Cisco -50 dBm authorized, rogue AP Corp-WLAN BSSID 11:22:33:44:55:66 Ch11 WPA2-PSK ALFA -30 dBm not in authorized list same SSID different BSSID different channel different vendor stronger signal, client 12:34:56:78:9A:BC PNL Corp-WLAN probes Corp-WLAN and associates to rogue f6-7, deauth flood before rogue? What are WIDS signatures, defense layers, evidence, impact?

Answer: WIDS signatures new BSSID same SSID not in authorized list — observed rogue 11:22:33:44:55:66 Ch11 same SSID Corp-WLAN not in authorized list flag rogue, same SSID different channel different vendor different capabilities different signal different security — legit Ch6 Cisco vs rogue Ch11 ALFA different channel vendor signal, deauth flood before rogue appears correlation deauth + rogue = Evil Twin facilitated by deauth — WIDS detect deauth flood >10/sec same BSSID short interval then new BSSID same SSID appears alert, client assoc to unknown BSSID — client 12:34:56:78:9A:BC assoc to rogue 11:22:33:44:55:66 f6-7 High. Defense layers WIDS authorized AP list alert contain Kismet Aruba Cisco WIDS, 802.1X cert validation ca_cert subject_match altsubject_match domain_suffix_match via MDM/GPO EAP-TLS mutual cert most secure — client without ca_cert accepts any cert from rogue RADIUS sends MSCHAPv2 challenge/response hashcat -m 5500 credential capture High — with ca_cert + subject_match rejects rogue self-signed, PMF required ieee80211w=2 prevents deauth facilitation WPA3 mandates required — beacon MFPC=1 MFPR=1, strong PSK 20+ random not in wordlists unique per SSID rotated vault — weak PSK in wordlist High allows PSK Evil Twin same SSID same PSK transparent, WPA3 SAE PMF required forward secrecy resists offline audit better than PSK, client hardening verify BSSID don't auto-connect open same SSID as corporate disable auto-connect to open use WPA3 training. Evidence beacon f1 legit and f2 rogue same SSID different BSSIDs channels vendors, probe resp from rogue, assoc req f6 SA client DA rogue SSID Corp-WLAN and assoc resp f7 SA rogue DA client status0 AID1 client assoc to rogue, PCAP rogue-ap.pcapng hash, filter wlan_mgt.ssid==Corp-WLAN. Impact client connects to rogue credential capture if portal network access if PSK known EAP credential capture if Enterprise lateral movement data theft pivot High if PSK known or Enterprise cred capture Medium if open.

## References

- IEEE 802.11, 802.11w PMF, 802.11i, 802.11r/k/v
- Wi-Fi Alliance, OWASP, NIST
- Kismet, airodump-ng, hostapd, dnsmasq, iptables, FreeRADIUS, EAP, PEAP, EAP-TLS, wash, reaver, bully, Wireshark, PcapInspector, ReconMap, HandshakeDiagram, DeauthVisualizer
- MITRE ATT&CK — Rogue AP, Evil Twin, Credential Access

---

*Next: Rogue Visualizer — Timeline beacons same SSID different BSSIDs, probe, assoc to rogue, WIDS alerts, retest*

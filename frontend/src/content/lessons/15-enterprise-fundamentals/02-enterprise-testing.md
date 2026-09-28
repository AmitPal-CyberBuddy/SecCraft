# Enterprise Testing Methodology — Config Audit, PCAP Analysis, Rogue RADIUS Simulation Professional

## Learning Objectives
- Master how to test Enterprise Wi-Fi in authorized lab: recon Enterprise SSIDs beacon wpa_key_mgmt=WPA-EAP AKM EAP 1 not PSK 2, check vendor channel BSSID ESS, clients probe requests for Enterprise SSID PNL leakage
- Learn config audit hostapd.conf Enterprise wpa_key_mgmt=WPA-EAP ieee8021x=1 auth_server_addr/port/shared_secret secret strength PMF ieee80211w eap_server=1 vs external RADIUS, RADIUS config users file clients.conf secret EAP config eap.conf certs
- Understand client config audit wpa_supplicant.conf ca_cert subject_match altsubject_match domain_suffix_match if missing vulnerable to Evil Twin rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 High
- Learn PCAP analysis enterprise.pcapng 15 frames beacon WPA2-EAP CCMP Ch6 BSSID client assoc open no PSK EAPOL Start EAP Request Identity Response Identity user@corp.com PEAP TLS ClientHello ServerHello cert inner MSCHAPv2 challenge/response EAP Success then 4-way handshake PMK from MSK ANonce SNonce MIC evidence username EAP method cert validation or lack
- Build rogue RADIUS simulation authorized lab only simulated here attacker sets up AP same SSID Corp-Enterprise runs rogue RADIUS hostapd eap_server=1 or FreeRADIUS victim client without cert validation connects to rogue AP sends PEAP rogue RADIUS captures MSCHAPv2 challenge/response offline cracking asleap hashcat mode 5500 evidence rogue AP BSSID different client assoc to rogue RADIUS logs Access-Challenge with MSCHAPv2
- Learn reporting template finding Enterprise Wi-Fi client missing server certificate validation High description wpa_supplicant.conf Corp-Enterprise PEAP without ca_cert vulnerable to Evil Twin rogue RADIUS credential capture technical PEAP TLS tunnel without CA validation attacker can present any cert client will accept inner MSCHAPv2 sent to attacker offline crack affected SSID BSSID clients without ca_cert evidence PCAP frame X EAP Identity config snippet no ca_cert rogue AP simulation logs impact credential capture network access lateral movement recommendation enforce ca_cert + subject_match use EAP-TLS strong RADIUS secret 22+ PMF required WIDS rogue detection user training monitor RADIUS logs references OWASP NIST hostapd FreeRADIUS retest after fix client with ca_cert rejects rogue RADIUS cert connection fails to rogue succeeds to legit with valid cert
- Build retest verify client config has ca_cert subject_match try rogue RADIUS self-signed cert should fail verify PMF required in beacon for WPA3-Enterprise verify RADIUS secret strong not default

## Theory

### Methodology — 7 Steps Enterprise Testing

**Lab SSID:** LAB-ENTERPRISE with FreeRADIUS Docker hostapd Enterprise client wpa_supplicant capture EAP flow test rogue RADIUS authorized lab only lab-only SSID LAB-ENTERPRISE own infrastructure ALFA adapter explicit ROE own lab isolated no production no corporate lab-only

**1. Recon — Find Enterprise SSIDs Beacon wpa_key_mgmt=WPA-EAP AKM EAP Not PSK:**

- `airodump-ng wlan0mon` shows ESSID Corp-Enterprise BSSID AA:BB:CC:DD:EE:FF Ch6 ENC WPA2 EAP CCMP AUTH MGT? Actually airodump-ng shows ENC WPA2 CIPHER CCMP AUTH MGT — EAP — not PSK — for PT, Enterprise SSID beacon wpa_key_mgmt=WPA-EAP AKM EAP 1 not PSK 2 — filter `wlan_mgt.rsn.akms.type==1` — AKM EAP 1 — Enterprise — vs PSK 2 — Personal
- Check vendor channel BSSID ESS — vendor via OUI first 3 bytes MAC — e.g., Cisco OUI 00:11:22, Aruba, etc. — channel 6 2.4 GHz or 36 5 GHz — BSSID AA:BB:CC:DD:EE:FF — ESS if same SSID different BSSIDs same vendor same security same VLAN for roaming — e.g., Corp-Enterprise legit BSSIDs AA:BB:CC:DD:EE:FF Ch6 and BB:CC:DD:EE:FF:00 Ch11 same SSID same vendor Cisco same security WPA2-EAP — ESS — not rogue — need authorized list to decide — if observed BSSID not in authorized list same SSID different channel different vendor, flag rogue
- Clients probe requests for Enterprise SSID? Check probe req SSID Corp-Enterprise — PNL leakage — client PNL Corp-Enterprise — targeted Evil Twin — e.g., client 11:22:33:44:55:66 probe req SSID Corp-Enterprise — PNL Corp-Enterprise — attacker can create Evil Twin same SSID Corp-Enterprise — client may auto-connect if stronger or after deauth and no cert validation — PNL leakage privacy issue + Evil Twin targeting — for PT, PNL leakage via probe req is evidence for targeted Evil Twin
- For PT: Recon Enterprise SSIDs beacon WPA2-EAP AKM EAP 1 not PSK 2 vendor channel BSSID ESS clients probe req PNL leakage — filter `wlan_mgt.ssid==Corp-Enterprise`, `wlan_mgt.rsn.akms.type==1`, `wlan.fc.type_subtype==4` probe req — PNL

**2. Config Audit hostapd.conf Enterprise wpa_key_mgmt=WPA-EAP ieee8021x=1 auth_server_addr/port/shared_secret Secret Strength PMF:**

- Check hostapd.conf Enterprise — `wpa_key_mgmt=WPA-EAP` — Enterprise — not PSK — `ieee8021x=1` — 802.1X enabled — `auth_server_addr=192.168.1.10` — RADIUS IP — `auth_server_port=1812` — RADIUS auth port 1812 — `auth_server_shared_secret=testing123` — weak should be 22+ random per NAS — Medium finding — recommend strong 22+ random per NAS unique if possible not default testing123 secret password RadSec TLS isolated management VLAN
- Check `eap_server=1` vs external RADIUS — eap_server=1 means hostapd internal EAP server — for PT, eap_server=1 may use local users file? Actually hostapd eap_server=1 internal EAP server with eap_user file — for lab, eap_server=1 simpler — but production external RADIUS FreeRADIUS/NPS — for PT, check if eap_server=1 vs external RADIUS — if eap_server=1, check eap_user file
- RADIUS config users file clients.conf secret EAP config eap.conf certs — check users file weak passwords WeakPass — Medium — recommend strong passwords complexity lockout 2FA EAP-TLS monitoring — clients.conf secret testing123 weak 0.0.0.0/0 allows any IP as NAS with weak secret — Medium — restrict to AP IPs strong secret 22+ random per NAS — eap.conf certs ca_cert server_cert private_key valid? For PT, check eap.conf certs valid HSTS? Actually RADIUS server cert valid — for PT, check eap.conf certs
- For PT: Config audit hostapd.conf Enterprise wpa_key_mgmt=WPA-EAP ieee8021x=1 auth_server_addr/port/shared_secret secret strength PMF ieee80211w eap_server=1 vs external RADIUS RADIUS config users file clients.conf secret EAP config — good vs bad configs — hash

**3. Client Config Audit wpa_supplicant.conf ca_cert subject_match altsubject_match domain_suffix_match If Missing Vulnerable to Evil Twin:**

- Check wpa_supplicant.conf — does it have ca_cert? subject_match? altsubject_match? domain_suffix_match? — if missing, vulnerable to Evil Twin rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 High
- Example BAD — No ca_cert:

```ini
network={
  ssid="Corp-Enterprise"
  key_mgmt=WPA-EAP
  eap=PEAP
  identity="user"
  password="pass"
  phase2="auth=MSCHAPV2"
  # NO ca_cert! — High — PEAP without cert validation — client accepts any cert — Evil Twin + rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 — credential capture — High
}
```

- Example GOOD — With ca_cert + subject_match + altsubject_match:

```ini
network={
  ssid="Corp-Enterprise"
  key_mgmt=WPA-EAP
  eap=PEAP
  identity="user@corp.com"
  ca_cert="/etc/certs/ca.pem"  # CA cert that signed RADIUS server cert — validates server cert chain to trusted CA — good
  subject_match="CN=radius.corp.com"  # Match RADIUS server cert subject CN — validates server cert subject matches expected — good
  altsubject_match="DNS:radius.corp.com"  # Alt subject DNS — good
  domain_suffix_match="corp.com"  # Domain suffix match — good — validates server cert domain suffix matches corp.com — good
  phase2="auth=MSCHAPV2"
}
```

- For PT: Client config audit wpa_supplicant.conf ca_cert subject_match altsubject_match domain_suffix_match if missing vulnerable to Evil Twin — evidence config snippet no ca_cert — High finding — PEAP without cert validation allows rogue RADIUS captures MSCHAPv2 for offline crack — recommend ca_cert + subject_match via MDM/GPO prefer EAP-TLS mutual cert

**4. PCAP Analysis enterprise.pcapng 15 Frames Beacon WPA2-EAP CCMP Ch6 BSSID Client Assoc Open No PSK EAPOL Start EAP Request Identity Response Identity user@corp.com PEAP TLS ClientHello ServerHello Cert Inner MSCHAPv2 Challenge/Response EAP Success Then 4-Way Handshake PMK from MSK Evidence Username EAP Method Cert Validation or Lack:**

- Beacon WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF — beacon f1 — filter `wlan.fc.type_subtype==8 && wlan_mgt.ssid==Corp-Enterprise` — RSN IE AKM EAP 1 — Enterprise — not PSK 2 — Personal — beacon shows WPA2-EAP CCMP
- Association open no PSK — assoc req f2 SA client 11:22:33:44:55:66 DA AP BSSID AA:BB:CC:DD:EE:FF SSID Corp-Enterprise open no PSK — assoc resp f3 SA AP DA client status0 AID1 — filter `wlan.fc.type_subtype==0 && wlan_mgt.ssid==Corp-Enterprise` — assoc req Enterprise open no PSK — evidence Enterprise open association
- EAPOL Start f4 SA client DA AP — client EAPOL Start — filter `eapol` — EAPOL Start — EAPOL version type 1 Start
- EAP Request Identity f5 SA AP DA client — AP EAP Request Identity — eap.type==1 Identity — filter `eap.type==1` — EAP Identity Request — AP requests identity
- EAP Response Identity f6 SA client DA AP identity user@corp.com — client EAP Response Identity user@corp.com — filter `eap.type==1` — EAP Identity Response user@corp.com — evidence EAP Identity user@corp.com — for PT, username leakage — user@corp.com — evidence
- PEAP TLS ClientHello ServerHello cert f7-10 — PEAP tunnel TLS — eap.type==25 PEAP — filter `eap.type==25` — PEAP — TLS handshake Client Hello Server Hello Certificate — filter `tls.handshake.type==1` Client Hello — etc. — if you can decode TLS — check cert — if client without ca_cert, client accepts any cert — rogue RADIUS self-signed cert — client sends MSCHAPv2 — credential capture — High
- Inner MSCHAPv2 challenge/response f11-12 — inner MSCHAPv2 challenge from RADIUS via AP to client, response from client to RADIUS — if PEAP without cert validation, rogue RADIUS captures challenge/response — for PT, check if PEAP without ca_cert — if no ca_cert, High — rogue RADIUS captures MSCHAPv2 for offline crack hashcat -m 5500 — credential capture — evidence MSCHAPv2 challenge/response — filter `eap` — inner MSCHAPv2 — actually inner MSCHAPv2 inside PEAP tunnel — may not be visible in PCAP if TLS encrypted — but RADIUS logs show challenge/response — for PT, RADIUS logs show Access-Challenge with MSCHAPv2 challenge/response — evidence
- EAP Success f13 SA AP DA client — EAP Success — filter `eap.code==3` Success — EAP Success — RADIUS Access-Accept with MSK — MSK 512-bit — PMK first 256 bits of MSK — per session random — evidence EAP Success — Access-Accept with MSK
- 4-way handshake PMK from MSK f14-17 — EAPOL M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 — filter `eapol` — EAPOL M1-M4 — ANonce SNonce MIC — evidence 4-way handshake Enterprise PMK from MSK not PBKDF2 — per session random — good — forward secrecy? Actually MSK per session random — good
- Evidence username EAP method cert validation or lack — for PT, evidence beacon Enterprise WPA2-EAP, assoc open no PSK, EAP Identity user@corp.com, PEAP, MSCHAPv2, EAP Success, 4-way handshake, data — PCAP hash — filters eap eapol radius AKM EAP 1 — config audit hostapd.conf Enterprise wpa_supplicant.conf missing ca_cert detection RADIUS users file audit

**Tasks (Lab):**
1. How many Enterprise SSIDs? BSSID, channel, AKM? — e.g., 1 Enterprise SSID Corp-Enterprise BSSID AA:BB:CC:DD:EE:FF Ch6 AKM EAP 1 WPA2-EAP CCMP — filter `wlan_mgt.ssid==Corp-Enterprise && wlan.fc.type_subtype==8` — beacon Enterprise
2. What EAP method? Identity? — e.g., EAP method PEAP eap.type==25 identity user@corp.com — filter `eap.type==1` identity user@corp.com — EAP Identity — PEAP — evidence
3. Is ca_cert present in client config? What risk? — e.g., wpa_supplicant.conf BAD no ca_cert — High — PEAP without cert validation — client accepts any cert — Evil Twin + rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 — credential capture — High — recommend ca_cert + subject_match via MDM/GPO prefer EAP-TLS mutual cert
4. What is RADIUS secret strength? — e.g., auth_server_shared_secret=testing123 weak 11 chars should be 22+ random per NAS — Medium — recommend strong 22+ random per NAS unique if possible not default testing123 secret password RadSec TLS isolated management VLAN — clients.conf 0.0.0.0/0 weak secret — Medium — restrict to AP IPs strong secret 22+ random per NAS — users file WeakPass — Medium — strong passwords complexity lockout 2FA EAP-TLS monitoring

**For PT:** PCAP analysis enterprise.pcapng 15 frames — beacon Enterprise, assoc open no PSK, EAPOL Start, EAP Request Identity Response Identity user@corp.com, PEAP TLS ClientHello ServerHello cert, inner MSCHAPv2 challenge/response, EAP Success Access-Accept with MSK, 4-way handshake PMK from MSK, data — evidence username EAP method cert validation or lack — filters eap eapol radius AKM EAP 1 — config audit

**5. Rogue RADIUS Simulation Authorized Lab Only Simulated Here — Attacker Sets Up AP Same SSID Corp-Enterprise Runs Rogue RADIUS hostapd eap_server=1 or FreeRADIUS Victim Client Without Cert Validation Connects to Rogue AP Sends PEAP Rogue RADIUS Captures MSCHAPv2 Challenge/Response Offline Cracking asleap hashcat mode 5500 Evidence Rogue AP BSSID Different Client Assoc to Rogue RADIUS Logs Access-Challenge with MSCHAPv2:**

- **Attacker Setup:** Attacker sets up AP with same SSID Corp-Enterprise BSSID 11:22:33:44:55:66 Ch11 clones Enterprise same SSID different BSSID different channel not in authorized list — runs rogue RADIUS hostapd with eap_server=1 or FreeRADIUS Docker with clients.conf secret testing123 weak? Actually rogue RADIUS secret can be anything — for lab, rogue RADIUS secret testing123 — but victim client without cert validation connects to rogue AP sends PEAP — rogue RADIUS captures MSCHAPv2 challenge/response — e.g., FreeRADIUS eap logs show MSCHAPv2 challenge 1122334455667788 response 2233445566778899... — etc.
- **Victim Client Without Cert Validation Connects to Rogue AP Sends PEAP:** Victim client wpa_supplicant.conf BAD no ca_cert — client without cert validation — associates to rogue AP BSSID 11:22:33:44:55:66 Ch11 same SSID Corp-Enterprise — accepts any cert from rogue RADIUS self-signed cert — sends PEAP inner MSCHAPv2 challenge/response to attacker — attacker captures challenge/response via rogue RADIUS logs — e.g., FreeRADIUS `eap` module logs challenge/response — hostapd logs — etc.
- **Offline Cracking asleap hashcat mode 5500 NetNTLMv1 Actually MSCHAPv2:** Offline cracking with asleap or hashcat mode 5500 NetNTLMv1? Actually MSCHAPv2 challenge/response hashcat -m 5500 — e.g., `hashcat -m 5500 -a 0 mschapv2.txt rockyou.txt` — recovers password if weak in wordlist — credential capture — network access — High — for PT, rogue RADIUS simulation — evidence rogue AP BSSID different client assoc to rogue RADIUS logs Access-Challenge with MSCHAPv2 challenge/response — hashcat -m 5500 cracked — password recovered — network access — High
- **Evidence:** Rogue AP BSSID different 11:22:33:44:55:66 vs legit AA:BB:CC:DD:EE:FF — client assoc to rogue — RADIUS logs show Access-Challenge with MSCHAPv2 challenge/response — e.g., enterprise.pcapng + rogue-ap.pcapng correlation — rogue BSSID 11:22:33:44:55:66 clones Enterprise — client 11:22:33:44:55:66 assoc to rogue — MSCHAPv2 captured — hashcat -m 5500 cracked — password StrongPass123? Actually if weak WeakPass123 in wordlist, cracked — credential capture — High
- **Defense:** Client cert validation ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO — client must validate RADIUS server cert via ca_cert that signed RADIUS server cert + subject_match CN=radius.corp.com — rogue RADIUS self-signed cert fails validation if client configured to validate — client will not send MSCHAPv2 — secure — prefer EAP-TLS mutual cert auth — client cert + server cert mutual — most secure — requires PKI — client cert provisioning via MDM/GPO — strong private key password — strong RADIUS secret 22+ random per NAS unique if possible not default testing123 secret password — RadSec TLS for encryption — isolated management VLAN — PMF required ieee80211w=2 even Enterprise should have PMF required for WPA3 at least capable for WPA2 — WIDS rogue detection authorized AP list BSSID channel vendor signal — user training monitoring RADIUS logs
- **For PT:** Rogue RADIUS simulation authorized lab only simulated here — attacker sets up AP same SSID Corp-Enterprise runs rogue RADIUS — victim client without cert validation connects to rogue AP sends PEAP — rogue RADIUS captures MSCHAPv2 challenge/response — offline cracking asleap hashcat mode 5500 — evidence rogue AP BSSID different client assoc to rogue RADIUS logs Access-Challenge with MSCHAPv2 — defense client cert validation EAP-TLS strong RADIUS secret PMF required WIDS

**6. Reporting Template — Finding Enterprise Wi-Fi Client Missing Server Certificate Validation High:**

- **Title:** Enterprise Wi-Fi Client Missing Server Certificate Validation (PEAP without ca_cert)
- **Severity:** High — CVSS 7.5 AV:A AC:L PR:N UI:N S:U C:H I:H A:N — Adjacent Low complexity No privileges No user interaction Scope Unchanged Confidentiality High Integrity High — High if credential capture possible via Evil Twin + rogue RADIUS
- **Description:** wpa_supplicant.conf for Corp-Enterprise uses PEAP without ca_cert vulnerable to Evil Twin + rogue RADIUS credential capture — PEAP creates TLS tunnel but without CA validation attacker can present any cert client will accept inner MSCHAPv2 sent to attacker offline crack — affected SSID Corp-Enterprise BSSID AA:BB:CC:DD:EE:FF clients without ca_cert — evidence PCAP enterprise.pcapng frame X EAP Identity user@corp.com config snippet no ca_cert rogue AP simulation logs — impact credential capture network access lateral movement — recommendation enforce ca_cert + subject_match use EAP-TLS strong RADIUS secret 22+ PMF required WIDS rogue detection user training monitor RADIUS logs — references OWASP Wireless NIST SP 800-153 hostapd docs FreeRADIUS docs — retest after fix client with ca_cert rejects rogue RADIUS cert connection fails to rogue succeeds to legit with valid cert
- **For PT:** Reporting template — finding Enterprise Wi-Fi client missing server certificate validation High — description technical PEAP TLS tunnel without CA validation attacker can present any cert client will accept inner MSCHAPv2 sent to attacker offline crack affected SSID BSSID clients without ca_cert evidence PCAP frame X EAP Identity config snippet no ca_cert rogue AP simulation logs impact credential capture network access lateral movement recommendation enforce ca_cert + subject_match use EAP-TLS strong RADIUS secret 22+ PMF required WIDS rogue detection user training monitor RADIUS logs references OWASP NIST hostapd FreeRADIUS retest after fix client with ca_cert rejects rogue RADIUS cert connection fails to rogue succeeds to legit with valid cert

**7. Retest — Verify Client Config Has ca_cert subject_match Try Rogue RADIUS Self-Signed Cert Should Fail Verify PMF Required in Beacon for WPA3-Enterprise Verify RADIUS Secret Strong Not Default:**

- **Retest:** Verify client config has ca_cert subject_match — e.g., new wpa_supplicant.conf with ca_cert=/etc/certs/ca.pem subject_match=CN=radius.corp.com altsubject_match=DNS:radius.corp.com — good — try rogue RADIUS with self-signed cert — should fail — client rejects rogue RADIUS cert — connection fails to rogue — succeeds to legit with valid cert — evidence new PCAPs client with ca_cert rejects rogue — no credential capture — EAP-TLS mutual cert works — RADIUS secret strong 22+ random — PMF required beacon MFPC=1 MFPR=1 ieee80211w=2 — new PCAPs Enterprise with PMF required — verify via new PCAPs and config hash — document new PCAP hash new config hash new RADIUS logs hash
- **For PT:** Retest verify client config has ca_cert subject_match try rogue RADIUS self-signed cert should fail verify PMF required in beacon for WPA3-Enterprise verify RADIUS secret strong not default — new PCAPs client with ca_cert rejects rogue — EAP-TLS works — RADIUS secret strong 22+ random — PMF required — evidence new PCAP hash new config hash

### Lab — Simulated (Zero-Cost) + Hardware (Future, RF_REQUIRED)

**Simulated (this module, zero-cost):**
- **PCAP:** `enterprise.pcapng` (15 frames, Scapy-generated) — beacon Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF, client 11:22:33:44:55:66 assoc open no PSK f2, EAPOL Start f4, EAP Request Identity f5 AP→client, Response Identity f6 client→AP user@corp.com, PEAP f7-8 eap.type==25, TLS handshake f9-10, inner MSCHAPv2 f11-12, EAP Success f13 Access-Accept with MSK, 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK not PBKDF2 per session random, data f18+
- **Tasks:**
  1. How many Enterprise SSIDs? BSSID, channel, AKM? — 1 Enterprise SSID Corp-Enterprise BSSID AA:BB:CC:DD:EE:FF Ch6 AKM EAP 1 WPA2-EAP CCMP — filter `wlan_mgt.ssid==Corp-Enterprise && wlan.fc.type_subtype==8` — beacon Enterprise — AKM EAP 1 vs PSK 2
  2. What EAP method? Identity? — EAP method PEAP eap.type==25 identity user@corp.com — filter `eap.type==1` identity user@corp.com — EAP Identity — PEAP — evidence
  3. Is ca_cert present in client config? What risk? — wpa_supplicant.conf BAD no ca_cert — High — PEAP without cert validation — client accepts any cert — Evil Twin + rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 — credential capture — High — recommend ca_cert + subject_match via MDM/GPO prefer EAP-TLS mutual cert
  4. What is RADIUS secret strength? — auth_server_shared_secret=testing123 weak 11 chars should be 22+ random per NAS — Medium — recommend strong 22+ random per NAS unique if possible not default testing123 secret password RadSec TLS isolated management VLAN — clients.conf 0.0.0.0/0 weak secret — Medium — restrict to AP IPs strong secret 22+ random per NAS — users file WeakPass — Medium — strong passwords complexity lockout 2FA EAP-TLS monitoring
  5. Rogue RADIUS simulation? — attacker sets up AP same SSID Corp-Enterprise BSSID 11:22:33:44:55:66 Ch11 clones Enterprise same SSID different BSSID different channel not in authorized list — runs rogue RADIUS — victim client without cert validation connects to rogue AP sends PEAP — rogue RADIUS captures MSCHAPv2 challenge/response — offline cracking hashcat -m 5500 — credential capture — High — evidence rogue AP BSSID different client assoc to rogue RADIUS logs Access-Challenge with MSCHAPv2 — defense client cert validation ca_cert + subject_match EAP-TLS mutual cert strong RADIUS secret PMF required WIDS
  6. Evidence? Beacon f1 Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF, assoc f2 open no PSK client 11:22:33:44:55:66, EAPOL Start f4, EAP Request Identity f5 AP→client, Response Identity f6 client→AP user@corp.com, PEAP f7-8, TLS handshake f9-10, inner MSCHAPv2 f11-12, EAP Success f13 Access-Accept with MSK, 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK, data f18+, PCAP enterprise.pcapng hash, filter, config hash hostapd.conf wpa_supplicant.conf clients.conf users file

**Config Audit:**
- hostapd.conf Enterprise — ieee8021x=1 auth_server_addr/port/shared_secret testing123 weak — Medium — recommend strong 22+ random per NAS RadSec TLS
- wpa_supplicant.conf BAD no ca_cert — High — PEAP without cert validation — client accepts any cert — Evil Twin + rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 — recommend ca_cert + subject_match via MDM/GPO prefer EAP-TLS mutual cert
- FreeRADIUS clients.conf 0.0.0.0/0 weak secret — Medium — restrict to AP IPs strong secret 22+ random per NAS
- FreeRADIUS users file WeakPass — Medium — strong passwords complexity lockout 2FA EAP-TLS monitoring
- eap.conf certs — ca_cert server_cert private_key — check certs valid

**Hardware (Future, RF_REQUIRED, requires ALFA adapter, explicit ROE, own lab):**
- Full lab with FreeRADIUS Docker hostapd Enterprise client capture EAP flow test rogue RADIUS authorized lab only — lab-only SSID LAB-ENTERPRISE own infrastructure ALFA adapter
- Requires monitor mode AP mode 2 radios? Actually for Enterprise one AP Enterprise for clients and RADIUS server via Ethernet or same host — for PT lab-only SSID LAB-ENTERPRISE own infrastructure ALFA adapter FreeRADIUS Docker hostapd Enterprise client wpa_supplicant capture EAP flow via airodump-ng Wireshark test rogue RADIUS authorized lab only with explicit ROE — rogue RADIUS captures MSCHAPv2 challenge/response if client without ca_cert — offline crack hashcat -m 5500
- Safety: Lab-only never use real corporate SSID only LAB-* e.g., LAB-ENTERPRISE not Corp-Enterprise — only own lab — explicit ROE — own infrastructure — own devices — isolated — no production — no corporate — lab-only
- Example: hostapd config Enterprise SSID LAB-ENTERPRISE BSSID AA:BB:CC:DD:EE:FF Ch6 ieee8021x=1 wpa_key_mgmt=WPA-EAP rsn_pairwise=CCMP auth_server_addr=192.168.1.10 auth_server_port=1812 auth_server_shared_secret=StrongRandomSecret123!@#With22+Chars, FreeRADIUS Docker with clients.conf users file eap.conf certs, client wpa_supplicant.conf with eap=PEAP identity=user@corp.com password=StrongPass123 ca_cert=/etc/certs/ca.pem subject_match=CN=radius.corp.com phase2=auth=MSCHAPV2, etc.
- For this academy: Simulated only for browser — hardware marked with prep docs — zero-cost simulated philosophy kept but mark hardware labs requiring RF adapter with prep docs — this module simulated enterprise.pcapng 15 frames hardware future with ALFA adapter and explicit ROE

### VAPT Relevance — Enumeration, Evidence, Impact, Recommendation, Retest

- **Enumeration:** Find Enterprise SSID Corp-Enterprise check beacon WPA2-EAP AKM EAP 1 association open no PSK EAP Identity user@corp.com EAP method PEAP EAP-TLS check wpa_supplicant.conf ca_cert missing RADIUS secret weak PMF disabled etc — filter `wlan_mgt.ssid==Corp-Enterprise`, `wlan_mgt.rsn.akms.type==1`, `eap`, `eapol`, `radius`
- **Evidence:** Beacon Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF association open no PSK client 11:22:33:44:55:66 EAPOL Start EAP Request Identity AP→client Response Identity client→AP user@corp.com PEAP TLS tunnel inner MSCHAPv2 EAP Success Access-Accept with MSK 4-way handshake M1-M4 ANonce SNonce MIC PMK from MSK not PBKDF2 data PCAP hash filter config hash hostapd.conf wpa_supplicant.conf clients.conf users file RADIUS logs etc
- **Impact:** Credential capture via Evil Twin + rogue RADIUS if PEAP without cert validation — PEAP without ca_cert client accepts any cert rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 credential capture High — network access lateral movement data theft pivot — RADIUS weak secret testing123 Medium brute-force? Actually RADIUS secret weak Medium — PMF disabled Medium deauth facilitation — EAP-TLS without proper cert validation or weak client certs Medium? Actually EAP-TLS mutual cert most secure if configured correctly — but misconfig still risk
- **Recommendation:** Enforce ca_cert validate server cert via ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO prefer EAP-TLS with client certs mutual auth most secure PKI client cert provisioning via MDM/GPO strong private key password strong RADIUS secret 22+ random per NAS unique if possible not default testing123 secret password RadSec TLS for encryption isolated management VLAN PMF required ieee80211w=2 even Enterprise should have PMF required for WPA3 at least capable for WPA2 disable WPS wps_state=0 strong user passwords complexity lockout 2FA EAP-TLS monitoring SIEM RADIUS logs user education audits no WEP no TKIP no open without OWE
- **Retest:** Verify client has ca_cert rogue RADIUS fails cert validation EAP-TLS works — new PCAPs client with ca_cert + subject_match — rogue RADIUS self-signed cert fails validation client rejects rogue does not send MSCHAPv2 — EAP-TLS mutual cert works client cert + server cert mutual auth — RADIUS secret strong 22+ random — PMF required beacon MFPC=1 MFPR=1 — new PCAPs Enterprise with PMF required no PEAP without ca_cert etc — document new PCAP hash new config hash new RADIUS logs hash

### Finding Template

```
Title: Enterprise Wi-Fi Client Missing Server Certificate Validation (PEAP without ca_cert)
Severity: High
CVSS: 7.5 (AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N) — Adjacent Low complexity No privileges No user interaction Scope Unchanged Confidentiality High Integrity High — High if credential capture possible via Evil Twin + rogue RADIUS
Description: SSID Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF — client wpa_supplicant.conf with eap=PEAP identity=user@corp.com password=StrongPass123 phase2=auth=MSCHAPV2 but NO ca_cert — client accepts any cert from rogue RADIUS — vulnerable to Evil Twin with rogue RADIUS capturing MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 — credential capture — network access. RADIUS shared secret testing123 weak 11 chars should be 22+ random per NAS — Medium. PMF disabled ieee80211w=0 — Medium — deauth facilitation — even Enterprise should have PMF required for WPA3.
Evidence: Beacon f1 BSSID AA:BB:CC:DD:EE:FF SSID Corp-Enterprise WPA2-EAP CCMP Ch6 AKM EAP 1 RSN IE, association f2 SA 11:22:33:44:55:66 DA AA:BB:CC:DD:EE:FF BSSID AA:BB:CC:DD:EE:FF SSID Corp-Enterprise open no PSK, EAPOL Start f4 SA client DA AP, EAP Request Identity f5 SA AP DA client, Response Identity f6 SA client DA AP identity user@corp.com, PEAP f7-8 eap.type==25, TLS handshake f9-10, inner MSCHAPv2 f11-12 challenge/response, EAP Success f13 Access-Accept with MSK, 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK not PBKDF2 per session random, data f18+, PCAP enterprise.pcapng SHA256 abc123... Size 3.5 KB Frames 15 Tool Scapy Method scapy, filter wlan_mgt.ssid==Corp-Enterprise, wlan_mgt.rsn.akms.type==1, eap.type==1, eap.type==25, eapol, radius, wlan_mgt.rsn.capabilities.mfpc==0 mfpr==0 PMF disabled, config hash hostapd.conf SHA256... wpa_supplicant.conf SHA256... no ca_cert clients.conf SHA256... secret testing123 weak 0.0.0.0/0 users file SHA256... WeakPass RADIUS logs wash output? Actually wash for WPS but for Enterprise EAP
Impact: Credential capture via Evil Twin + rogue RADIUS — attacker creates rogue AP same SSID Corp-Enterprise BSSID 11:22:33:44:55:66 Ch11 clones Enterprise client without ca_cert associates to rogue accepts any cert from rogue RADIUS sends MSCHAPv2 challenge/response to attacker attacker captures challenge/response via rogue RADIUS logs FreeRADIUS eap logs hostapd logs offline crack via hashcat -m 5500 recovers password StrongPass123 if weak in wordlist or via brute-force network access lateral movement data theft pivot compliance fail RADIUS weak secret testing123 Medium brute-force? Actually RADIUS secret weak Medium PMF disabled Medium deauth facilitation
Recommendation: Enforce ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO — client must validate RADIUS server cert via ca_cert that signed RADIUS server cert + subject_match CN=radius.corp.com — rogue RADIUS self-signed cert fails validation if client configured to validate — client will not send MSCHAPv2 — secure — prefer EAP-TLS mutual cert auth — client cert + server cert mutual — most secure — requires PKI — client cert provisioning via MDM/GPO — strong private key password — strong RADIUS secret 22+ random per NAS unique if possible not default testing123 secret password — RadSec TLS for encryption — isolated management VLAN — PMF required ieee80211w=2 even Enterprise should have PMF required for WPA3 at least capable for WPA2 — disable WPS wps_state=0 — strong user passwords complexity lockout 2FA EAP-TLS monitoring SIEM RADIUS logs user education audits no WEP no TKIP no open without OWE
Config Snippet Good wpa_supplicant.conf with ca_cert + subject_match + EAP-TLS:
# Good PEAP with validation
# network={
#   ssid="Corp-Enterprise"
#   key_mgmt=WPA-EAP
#   eap=PEAP
#   identity="user@corp.com"
#   password="StrongPass123"
#   ca_cert="/etc/certs/ca.pem"
#   subject_match="CN=radius.corp.com"
#   altsubject_match="DNS:radius.corp.com"
#   phase2="auth=MSCHAPV2"
# }
# Good EAP-TLS mutual cert most secure
# network={
#   ssid="Corp-Enterprise"
#   key_mgmt=WPA-EAP
#   eap=TLS
#   identity="user@corp.com"
#   ca_cert="/etc/certs/ca.pem"
#   client_cert="/etc/certs/client.pem"
#   private_key="/etc/certs/client.key"
#   private_key_passwd="StrongPrivateKeyPass123!@#"
#   subject_match="CN=radius.corp.com"
# }
# Good hostapd.conf Enterprise
# interface=wlan0
# ssid=Corp-Enterprise
# bssid=AA:BB:CC:DD:EE:FF
# hw_mode=g
# channel=6
# ieee8021x=1
# wpa=2
# wpa_key_mgmt=WPA-EAP
# rsn_pairwise=CCMP
# auth_server_addr=192.168.1.10
# auth_server_port=1812
# auth_server_shared_secret=StrongRandomSecret123!@#With22+Chars
# ieee80211w=2
# wps_state=0
Retest: Verify client has ca_cert rogue RADIUS fails cert validation — new PCAPs client with ca_cert + subject_match — rogue RADIUS self-signed cert fails validation client rejects rogue does not send MSCHAPv2 — no credential capture — EAP-TLS mutual cert works client cert + server cert mutual auth — RADIUS secret strong 22+ random — PMF required beacon MFPC=1 MFPR=1 ieee80211w=2 — new PCAPs Enterprise with PMF required no PEAP without ca_cert etc — document new PCAP hash new config hash new RADIUS logs hash
References: IEEE 802.11, 802.11i, 802.1X, EAP RFC 3748, PEAP, EAP-TLS RFC 5216, RADIUS RFC 2865 2866, RadSec RFC 6614, OWASP, NIST, Wireshark, PcapInspector, HandshakeDiagram, FreeRADIUS, hostapd, wpa_supplicant, MDM/GPO
```

### Attack → Defense → Retest

- **Attack:** Observe beacon Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF AKM EAP 1 Enterprise not PSK client 11:22:33:44:55:66 assoc open no PSK f2 EAPOL Start f4 EAP Request Identity f5 AP→client Response Identity f6 client→AP user@corp.com PEAP f7-8 eap.type==25 TLS tunnel inner MSCHAPv2 f11-12 challenge/response if client without ca_cert rogue AP same SSID Corp-Enterprise BSSID 11:22:33:44:55:66 Ch11 clones Enterprise client without ca_cert associates to rogue accepts any cert from rogue RADIUS sends MSCHAPv2 challenge/response to attacker attacker captures challenge/response via rogue RADIUS logs FreeRADIUS eap logs offline crack via hashcat -m 5500 recovers password if weak in wordlist credential capture network access High RADIUS secret testing123 weak Medium PMF disabled ieee80211w=0 Medium deauth facilitation
- **Defense:** Enforce ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO client must validate RADIUS server cert via ca_cert that signed RADIUS server cert + subject_match CN=radius.corp.com rogue RADIUS self-signed cert fails validation if client configured to validate client will not send MSCHAPv2 secure prefer EAP-TLS mutual cert auth client cert + server cert mutual most secure requires PKI client cert provisioning via MDM/GPO strong private key password strong RADIUS secret 22+ random per NAS unique if possible not default testing123 secret password RadSec TLS for encryption isolated management VLAN PMF required ieee80211w=2 even Enterprise should have PMF required for WPA3 at least capable for WPA2 disable WPS wps_state=0 strong user passwords complexity lockout 2FA EAP-TLS monitoring SIEM RADIUS logs user education audits
- **Retest:** Verify client has ca_cert rogue RADIUS fails cert validation — new PCAPs client with ca_cert + subject_match — rogue RADIUS self-signed cert fails validation client rejects rogue does not send MSCHAPv2 — no credential capture — EAP-TLS mutual cert works client cert + server cert mutual auth — RADIUS secret strong 22+ random — PMF required beacon MFPC=1 MFPR=1 ieee80211w=2 — new PCAPs Enterprise with PMF required no PEAP without ca_cert etc — document new PCAP hash new config hash new RADIUS logs hash

### Interactive Check

> You have enterprise.pcapng 15 frames: beacon Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF AKM EAP 1, client assoc open no PSK f2, EAPOL Start f4, EAP Request Identity f5 AP→client, Response Identity f6 client→AP user@corp.com, PEAP f7-8 eap.type==25 TLS tunnel, inner MSCHAPv2 f11-12 challenge/response, EAP Success f13 Access-Accept with MSK, 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK not PBKDF2 per session random, data f18+. What is testing methodology, recon, config audit, PCAP analysis, rogue RADIUS, evidence, defense, retest?

Answer: Methodology 7 steps recon find Enterprise SSIDs beacon wpa_key_mgmt=WPA-EAP AKM EAP 1 not PSK 2 check vendor channel BSSID ESS clients probe requests PNL leakage, config audit hostapd.conf Enterprise wpa_key_mgmt=WPA-EAP ieee8021x=1 auth_server_addr/port/shared_secret secret strength PMF ieee80211w eap_server=1 vs external RADIUS RADIUS config users file clients.conf secret EAP config eap.conf certs, client config audit wpa_supplicant.conf ca_cert subject_match altsubject_match domain_suffix_match if missing vulnerable to Evil Twin rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 High, PCAP analysis enterprise.pcapng 15 frames beacon WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF f1 assoc open no PSK f2 client 11:22:33:44:55:66 EAPOL Start f4 EAP Request Identity f5 AP→client Response Identity f6 client→AP user@corp.com PEAP f7-8 eap.type==25 TLS handshake f9-10 inner MSCHAPv2 f11-12 challenge/response EAP Success f13 Access-Accept with MSK 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK not PBKDF2 per session random data f18+ evidence username EAP method cert validation or lack, tasks how many Enterprise SSIDs BSSID channel AKM 1 Enterprise SSID Corp-Enterprise BSSID AA:BB:CC:DD:EE:FF Ch6 AKM EAP 1 WPA2-EAP CCMP filter wlan_mgt.ssid==Corp-Enterprise && wlan.fc.type_subtype==8 beacon Enterprise AKM EAP 1 vs PSK 2, what EAP method identity EAP method PEAP eap.type==25 identity user@corp.com filter eap.type==1 identity user@corp.com EAP Identity PEAP evidence, is ca_cert present in client config what risk wpa_supplicant.conf BAD no ca_cert High PEAP without cert validation client accepts any cert Evil Twin + rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 credential capture High recommend ca_cert + subject_match via MDM/GPO prefer EAP-TLS mutual cert, what is RADIUS secret strength auth_server_shared_secret=testing123 weak 11 chars should be 22+ random per NAS Medium recommend strong 22+ random per NAS unique if possible not default testing123 secret password RadSec TLS isolated management VLAN clients.conf 0.0.0.0/0 weak secret Medium restrict to AP IPs strong secret 22+ random per NAS users file WeakPass Medium strong passwords complexity lockout 2FA EAP-TLS monitoring, rogue RADIUS simulation authorized lab only simulated here attacker sets up AP same SSID Corp-Enterprise BSSID 11:22:33:44:55:66 Ch11 clones Enterprise same SSID different BSSID different channel not in authorized list runs rogue RADIUS hostapd eap_server=1 or FreeRADIUS Docker victim client without cert validation connects to rogue AP sends PEAP rogue RADIUS captures MSCHAPv2 challenge/response offline cracking asleap hashcat mode 5500 NetNTLMv1 Actually MSCHAPv2 hashcat -m 5500 recovers password if weak in wordlist credential capture network access High evidence rogue AP BSSID different client assoc to rogue RADIUS logs Access-Challenge with MSCHAPv2 challenge/response hashcat -m 5500 cracked password StrongPass123 if weak in wordlist or via brute-force network access lateral movement data theft pivot, defense client cert validation ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO client must validate RADIUS server cert via ca_cert that signed RADIUS server cert + subject_match CN=radius.corp.com rogue RADIUS self-signed cert fails validation if client configured to validate client will not send MSCHAPv2 secure prefer EAP-TLS mutual cert auth client cert + server cert mutual most secure requires PKI client cert provisioning via MDM/GPO strong private key password strong RADIUS secret 22+ random per NAS unique if possible not default testing123 secret password RadSec TLS for encryption isolated management VLAN PMF required ieee80211w=2 even Enterprise should have PMF required for WPA3 at least capable for WPA2 WIDS rogue detection authorized AP list BSSID channel vendor signal user training monitoring RADIUS logs, reporting template finding Enterprise Wi-Fi client missing server certificate validation High description wpa_supplicant.conf Corp-Enterprise PEAP without ca_cert vulnerable to Evil Twin + rogue RADIUS credential capture technical PEAP TLS tunnel without CA validation attacker can present any cert client will accept inner MSCHAPv2 sent to attacker offline crack affected SSID BSSID clients without ca_cert evidence PCAP frame X EAP Identity config snippet no ca_cert rogue AP simulation logs impact credential capture network access lateral movement recommendation enforce ca_cert + subject_match use EAP-TLS strong RADIUS secret 22+ PMF required WIDS rogue detection user training monitor RADIUS logs references OWASP Wireless NIST SP 800-153 hostapd docs FreeRADIUS docs retest after fix client with ca_cert rejects rogue RADIUS cert connection fails to rogue succeeds to legit with valid cert, retest verify client config has ca_cert subject_match try rogue RADIUS self-signed cert should fail verify PMF required in beacon for WPA3-Enterprise verify RADIUS secret strong not default new PCAPs client with ca_cert rejects rogue EAP-TLS works RADIUS secret strong 22+ random PMF required beacon MFPC=1 MFPR=1.

## References

- IEEE 802.11, 802.11i, 802.1X, EAP RFC 3748, PEAP, EAP-TLS RFC 5216, RADIUS RFC 2865 2866, RadSec RFC 6614
- OWASP, NIST SP 800-153, Wireshark, PcapInspector, HandshakeDiagram, FreeRADIUS, hostapd, wpa_supplicant, MDM/GPO, Kismet
- MITRE ATT&CK — Enterprise, Credential Access, Rogue AP, Evil Twin

---

*Next: Enterprise Visualizer — Timeline beacon Enterprise, assoc open, EAP Identity, PEAP, MSCHAPv2, EAP Success, 4-way, data, rogue RADIUS, retest*

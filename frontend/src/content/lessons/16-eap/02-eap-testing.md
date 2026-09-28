# EAP Testing — Practical Professional

## Learning Objectives
- Master lab tasks eap.pcapng simulated 8 frames beacon Corp-Enterprise WPA2-EAP Ch6 assoc open EAPOL Start EAP Request Identity Response Identity user@corp.com PEAP TLS ClientHello ServerHello MSCHAPv2 Challenge/Response inside TLS simulated as EAP EAP Success 4-way M1-M4, filters eap eapol wlan.fc.type_subtype==8 && wlan_mgt.ssid==Corp-Enterprise, tasks what EAP method identity how many EAPOL does client config have ca_cert what risk if not what is MSCHAPv2 challenge/response can you crack offline simulated hashcat -m 5500 what is defense EAP-TLS vs PEAP with cert validation, config audit bad wpa_supplicant.conf no ca_cert vulnerable good ca_cert + subject_match + altsubject_match, evidence frame numbers EAP Identity f4-5 PEAP TLS f6-7 EAP Success f8 4-way f9-12 if present config snippet no ca_cert, impact credential capture via rogue RADIUS offline cracking network access, recommendation enforce ca_cert subject_match EAP-TLS strong RADIUS secret PMF WIDS, retest after fix client rejects rogue RADIUS self-signed cert verify EAP-TLS mutual auth works client cert validated
- Understand testing methodology config audit PCAP analysis rogue RADIUS simulation authorized lab only simulated here attacker sets up AP same SSID Corp-Enterprise runs rogue RADIUS hostapd eap_server=1 or FreeRADIUS victim client without cert validation connects to rogue AP sends PEAP rogue RADIUS captures MSCHAPv2 challenge/response offline cracking asleap hashcat mode 5500 evidence rogue AP BSSID different client assoc to rogue RADIUS logs Access-Challenge with MSCHAPv2
- Build evidence chain beacon Enterprise WPA2-EAP CCMP Ch6 BSSID client assoc open no PSK EAPOL Start EAP Request Identity Response Identity user@corp.com PEAP TLS ClientHello ServerHello cert inner MSCHAPv2 challenge/response EAP Success Access-Accept with MSK 4-way handshake PMK from MSK ANonce SNonce MIC data PCAP hash filter config hash wpa_supplicant.conf no ca_cert hostapd.conf ca_cert server_cert private_key RADIUS logs rogue AP simulation logs capturing MSCHAPv2 challenge/response hashcat -m 5500 cracked output
- Learn defense enforce ca_cert + subject_match on all clients via MDM GPO prefer EAP-TLS with client certs auto-enrollment revocation checking strong RADIUS secret monitor logs WIDS rogue AP detection user training don't accept unknown certs report cert warnings PMF required WPA3-Enterprise

## Theory

### Lab Tasks — eap.pcapng (Simulated, 15 Frames, Scapy-Generated)

**PCAP:** `eap.pcapng` (15 frames, Scapy-generated) — beacon Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF, client 11:22:33:44:55:66 assoc open no PSK f2, EAPOL Start f4, EAP Request Identity f5 AP→client, Response Identity f6 client→AP user@corp.com, PEAP f7-8 eap.type==25 TLS tunnel, TLS handshake f9-10 Client Hello Server Hello Certificate, inner MSCHAPv2 f11-12 challenge/response, EAP Success f13 Access-Accept with MSK, 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK not PBKDF2 per session random, data f18+

**Filters:**

```
eap  # EAP — Request Identity Response Identity user@corp.com PEAP EAP-TLS
eap.type==1  # Identity — user@corp.com
eap.type==25  # PEAP
eap.type==13  # EAP-TLS
eap.code==1  # Request
eap.code==2  # Response
eap.code==3  # Success
eap.code==4  # Failure
eapol  # EAPOL — 4-way handshake M1-M4 ANonce SNonce MIC — PMK from MSK
wlan.fc.type_subtype==8 && wlan_mgt.ssid==Corp-Enterprise  # Beacons Corp-Enterprise WPA2-EAP — check BSSID Ch6 AKM EAP 1
wlan.fc.type_subtype==0 && wlan_mgt.ssid==Corp-Enterprise  # Assoc req Corp-Enterprise open no PSK — Enterprise open association
wlan_mgt.rsn.akms.type==1  # AKM EAP 1 — Enterprise — vs PSK 2 — filter Enterprise
```

**Tasks:**

1. **What EAP Method? Identity? How Many EAPOL?** — EAP method PEAP eap.type==25 identity user@corp.com eap.type==1 — EAP Identity — PEAP — evidence — how many EAPOL? EAPOL Start 1 + 4-way 4 = 5 EAPOL? Actually EAPOL Start + 4-way M1-M4 = 5 — filter `eapol` — count — e.g., 5 EAPOL frames — for PT, EAP method PEAP identity user@corp.com how many EAPOL 5 — evidence
2. **Does Client Config Have ca_cert? What Risk if Not?** — wpa_supplicant.conf BAD no ca_cert — High — PEAP without cert validation — client accepts any cert — Evil Twin + rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 — credential capture — High — recommend ca_cert + subject_match via MDM/GPO prefer EAP-TLS mutual cert — GOOD with ca_cert + subject_match + altsubject_match — good — EAP-TLS with client_cert private_key private_key_passwd — good — most secure
3. **What is MSCHAPv2 Challenge/Response? Can You Crack Offline? (Simulated, hashcat -m 5500)** — MSCHAPv2 challenge 1122334455667788 response 2233445566778899... — e.g., FreeRADIUS eap logs show challenge/response — hostapd logs — etc. — offline cracking with asleap or hashcat mode 5500 — e.g., `hashcat -m 5500 -a 0 mschapv2.txt rockyou.txt` — recovers password if weak in wordlist — credential capture — network access — High — even with strong password if MSCHAPv2 weak NTLM hash crackable — NTLM hash weak? Actually NTLM hash crackable via hashcat -m 1000 — but MSCHAPv2 challenge/response hashcat -m 5500 — if password weak in wordlist, cracked — credential capture — High — for PT, rogue RADIUS simulation — evidence rogue AP BSSID different client assoc to rogue RADIUS logs Access-Challenge with MSCHAPv2 challenge/response — hashcat -m 5500 cracked — password recovered — network access — High
4. **What is Defense? EAP-TLS vs PEAP with Cert Validation?** — Defense enforce ca_cert + subject_match on all clients via MDM GPO prefer EAP-TLS with client certs auto-enrollment revocation checking strong RADIUS secret monitor logs WIDS rogue AP detection user training don't accept unknown certs report cert warnings PMF required WPA3-Enterprise — EAP-TLS mutual cert auth client cert + server cert mutual most secure requires PKI client cert provisioning via MDM/GPO strong private key password — EAP-TLS vs PEAP with cert validation — EAP-TLS mutual cert most secure no password cert-based mutual auth resists rogue RADIUS if both validate — PEAP with cert validation client validates server cert via ca_cert + subject_match but server validates client via MSCHAPv2 password — not mutual cert but still server validation — good — if no cert validation, client accepts any cert rogue RADIUS captures MSCHAPv2 — High — for PT, defense EAP-TLS vs PEAP with cert validation — EAP-TLS most secure — PEAP with cert validation good if EAP-TLS not possible — but need ca_cert + subject_match

**Config Audit:**

- **Bad wpa_supplicant.conf:** No ca_cert vulnerable — e.g., BAD no ca_cert — High — PEAP without cert validation — client accepts any cert — Evil Twin + rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 — credential capture — High — config snippet no ca_cert — evidence
- **Good:** ca_cert + subject_match + altsubject_match — good — e.g., GOOD with ca_cert + subject_match + altsubject_match — good — EAP-TLS with client_cert private_key private_key_passwd — good — most secure — config snippet good — evidence

**Evidence:**

- Frame numbers EAP Identity f4-5 PEAP TLS f6-7 EAP Success f8 4-way f9-12 if present — e.g., beacon f1 Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF, assoc f2 open no PSK client 11:22:33:44:55:66, EAPOL Start f4, EAP Request Identity f5 AP→client, Response Identity f6 client→AP user@corp.com, PEAP f7-8 eap.type==25, TLS handshake f9-10 Client Hello Server Hello Certificate, inner MSCHAPv2 f11-12 challenge/response, EAP Success f13 Access-Accept with MSK, 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK not PBKDF2 per session random, data f18+, PCAP eap.pcapng hash, filter, config hash wpa_supplicant.conf no ca_cert hostapd.conf ca_cert server_cert private_key RADIUS logs rogue AP simulation logs capturing MSCHAPv2 challenge/response hashcat -m 5500 cracked output
- Config snippet no ca_cert — evidence — e.g., wpa_supplicant.conf BAD no ca_cert — High — PEAP without cert validation — client accepts any cert — Evil Twin + rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 — credential capture — High

**Impact:** Credential capture via rogue RADIUS offline cracking network access — e.g., PEAP without ca_cert client accepts any cert rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 credential capture High — network access lateral movement data theft pivot — for PT, impact credential capture via rogue RADIUS offline cracking network access — High

**Recommendation:** Enforce ca_cert subject_match EAP-TLS strong RADIUS secret PMF WIDS — e.g., enforce ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO client must validate RADIUS server cert via ca_cert that signed RADIUS server cert + subject_match CN=radius.corp.com rogue RADIUS self-signed cert fails validation if client configured to validate client will not send MSCHAPv2 secure prefer EAP-TLS mutual cert auth client cert + server cert mutual most secure requires PKI client cert provisioning via MDM/GPO strong private key password strong RADIUS secret 22+ random per NAS unique if possible not default testing123 secret password RadSec TLS for encryption isolated management VLAN PMF required ieee80211w=2 even Enterprise should have PMF required for WPA3 at least capable for WPA2 disable WPS wps_state=0 strong user passwords complexity lockout 2FA EAP-TLS monitoring SIEM RADIUS logs user education audits no WEP no TKIP no open without OWE — for PT, recommendation enforce ca_cert subject_match EAP-TLS strong RADIUS secret PMF WIDS

**For PT:** Lab tasks eap.pcapng simulated 8 frames beacon Corp-Enterprise WPA2-EAP Ch6 assoc open EAPOL Start EAP Request Identity Response Identity user@corp.com PEAP TLS ClientHello ServerHello MSCHAPv2 Challenge/Response inside TLS simulated as EAP EAP Success 4-way M1-M4 filters eap eapol wlan.fc.type_subtype==8 && wlan_mgt.ssid==Corp-Enterprise tasks what EAP method identity how many EAPOL does client config have ca_cert what risk if not what is MSCHAPv2 challenge/response can you crack offline simulated hashcat -m 5500 what is defense EAP-TLS vs PEAP with cert validation config audit bad wpa_supplicant.conf no ca_cert vulnerable good ca_cert + subject_match + altsubject_match evidence frame numbers EAP Identity f4-5 PEAP TLS f6-7 EAP Success f8 4-way f9-12 if present config snippet no ca_cert impact credential capture via rogue RADIUS offline cracking network access recommendation enforce ca_cert subject_match EAP-TLS strong RADIUS secret PMF WIDS

### Retest — After Fix Client Rejects Rogue RADIUS Self-Signed Cert Verify EAP-TLS Mutual Auth Works Client Cert Validated

- **Retest:** After fix client rejects rogue RADIUS self-signed cert — new PCAPs client with ca_cert + subject_match — rogue RADIUS self-signed cert fails validation client rejects rogue does not send MSCHAPv2 — no credential capture — secure — verify EAP-TLS mutual auth works client cert validated — new PCAPs EAP-TLS mutual cert — client cert + server cert mutual — most secure — requires PKI — client cert provisioning via MDM/GPO — strong private key password — EAP-TLS works — evidence new PCAPs client with ca_cert rejects rogue — no MSCHAPv2 to rogue — secure — EAP-TLS mutual cert works — client cert validated — RADIUS secret strong 22+ random — PMF required beacon MFPC=1 MFPR=1 ieee80211w=2 — new PCAPs Enterprise with PMF required — verify via new PCAPs and config hash — document new PCAP hash new config hash new RADIUS logs hash
- **For PT:** Retest after fix client rejects rogue RADIUS self-signed cert verify EAP-TLS mutual auth works client cert validated — new PCAPs client with ca_cert rejects rogue — no credential capture — EAP-TLS mutual cert works — client cert validated — RADIUS secret strong 22+ random — PMF required — evidence new PCAP hash new config hash

### VAPT Relevance — Enumeration, Evidence, Impact, Recommendation, Retest

- **Enumeration:** Find Enterprise SSID Corp-Enterprise check beacon WPA2-EAP AKM EAP 1 association open no PSK EAP Identity user@corp.com EAP method PEAP EAP-TLS check wpa_supplicant.conf ca_cert missing RADIUS secret weak PMF disabled etc — filter `wlan_mgt.ssid==Corp-Enterprise`, `wlan_mgt.rsn.akms.type==1`, `eap`, `eapol`, `radius`
- **Evidence:** Beacon Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF association open no PSK client 11:22:33:44:55:66 EAPOL Start EAP Request Identity AP→client Response Identity client→AP user@corp.com PEAP TLS tunnel inner MSCHAPv2 EAP Success Access-Accept with MSK 4-way handshake M1-M4 ANonce SNonce MIC PMK from MSK not PBKDF2 data PCAP hash filter config hash wpa_supplicant.conf no ca_cert hostapd.conf ca_cert server_cert private_key RADIUS logs rogue AP simulation logs capturing MSCHAPv2 challenge/response hashcat -m 5500 cracked output
- **Impact:** Credential capture via Evil Twin + rogue RADIUS if PEAP without cert validation — PEAP without ca_cert client accepts any cert rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 credential capture High — network access lateral movement data theft pivot — RADIUS weak secret testing123 Medium brute-force? Actually RADIUS secret weak Medium — PMF disabled Medium deauth facilitation — EAP-TLS without proper cert validation or weak client certs Medium? Actually EAP-TLS mutual cert most secure if configured correctly — but misconfig still risk
- **Recommendation:** Enforce ca_cert validate server cert via ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO prefer EAP-TLS with client certs mutual auth most secure PKI client cert provisioning via MDM/GPO strong private key password strong RADIUS secret 22+ random per NAS unique if possible not default testing123 secret password RadSec TLS for encryption isolated management VLAN PMF required ieee80211w=2 even Enterprise should have PMF required for WPA3 at least capable for WPA2 disable WPS wps_state=0 strong user passwords complexity lockout 2FA EAP-TLS monitoring SIEM RADIUS logs user education audits no WEP no TKIP no open without OWE
- **Retest:** Verify client has ca_cert rogue RADIUS fails cert validation EAP-TLS works — new PCAPs client with ca_cert + subject_match — rogue RADIUS self-signed cert fails validation client rejects rogue does not send MSCHAPv2 — EAP-TLS mutual cert works client cert + server cert mutual auth — RADIUS secret strong 22+ random — PMF required beacon MFPC=1 MFPR=1 — new PCAPs Enterprise with PMF required no PEAP without ca_cert etc — document new PCAP hash new config hash new RADIUS logs hash

### Finding Template

```
Title: EAP-PEAP Missing Server Certificate Validation → Credential Capture (PEAP without ca_cert) — Practical
Severity: High
CVSS: 7.5 (AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N) — Adjacent Low complexity No privileges No user interaction Scope Unchanged Confidentiality High Integrity High — High if PEAP without validation many users credential capture possible via Evil Twin + rogue RADIUS
Description: SSID Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF — client wpa_supplicant.conf with eap=PEAP identity=user@corp.com password=StrongPass123 phase2=auth=MSCHAPV2 but NO ca_cert — client accepts any cert from rogue RADIUS — vulnerable to Evil Twin with rogue RADIUS capturing MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 — credential capture — network access. EAP-TLS without proper cert validation or weak client certs — similar risk — but EAP-TLS mutual cert most secure if configured correctly.
Evidence: Beacon f1 BSSID AA:BB:CC:DD:EE:FF SSID Corp-Enterprise WPA2-EAP CCMP Ch6 AKM EAP 1 RSN IE, association f2 SA 11:22:33:44:55:66 DA AA:BB:CC:DD:EE:FF BSSID AA:BB:CC:DD:EE:FF SSID Corp-Enterprise open no PSK, EAPOL Start f4 SA client DA AP, EAP Request Identity f5 SA AP DA client, Response Identity f6 SA client DA AP identity user@corp.com, PEAP f7-8 eap.type==25, TLS handshake f9-10 Client Hello Server Hello Certificate, inner MSCHAPv2 f11-12 challenge/response, EAP Success f13 Access-Accept with MSK, 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK not PBKDF2 per session random, data f18+, PCAP eap.pcapng SHA256 abc123... Size 3.5 KB Frames 15 Tool Scapy Method scapy, filter wlan_mgt.ssid==Corp-Enterprise, wlan_mgt.rsn.akms.type==1, eap.type==1, eap.type==25, eapol, radius, config hash wpa_supplicant.conf SHA256... no ca_cert, hostapd.conf SHA256... ca_cert server_cert private_key, RADIUS logs, rogue AP simulation logs capturing MSCHAPv2 challenge/response, hashcat -m 5500 cracked output
Impact: Credential capture via Evil Twin + rogue RADIUS — attacker creates rogue AP same SSID Corp-Enterprise BSSID 11:22:33:44:55:66 Ch11 clones Enterprise, client without ca_cert associates to rogue, accepts any cert from rogue RADIUS, sends MSCHAPv2 challenge/response to attacker, attacker captures challenge/response via rogue RADIUS logs FreeRADIUS eap logs hostapd logs, offline crack via hashcat -m 5500 recovers password StrongPass123 if weak in wordlist or via brute-force, network access lateral movement data theft pivot compliance fail
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

- **Attack:** Observe beacon Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF AKM EAP 1 Enterprise not PSK client 11:22:33:44:55:66 assoc open no PSK f2 EAPOL Start f4 EAP Request Identity f5 AP→client Response Identity f6 client→AP user@corp.com PEAP f7-8 eap.type==25 TLS handshake Client Hello Server Hello Certificate f9-10 inner MSCHAPv2 challenge/response f11-12 if client without ca_cert rogue AP same SSID Corp-Enterprise BSSID 11:22:33:44:55:66 Ch11 clones Enterprise client without ca_cert associates to rogue accepts any cert from rogue RADIUS sends MSCHAPv2 challenge/response to attacker attacker captures challenge/response via rogue RADIUS logs FreeRADIUS eap logs offline crack via hashcat -m 5500 recovers password if weak in wordlist credential capture network access High RADIUS secret testing123 weak Medium PMF disabled ieee80211w=0 Medium deauth facilitation
- **Defense:** Enforce ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO client must validate RADIUS server cert via ca_cert that signed RADIUS server cert + subject_match CN=radius.corp.com rogue RADIUS self-signed cert fails validation if client configured to validate client will not send MSCHAPv2 secure prefer EAP-TLS mutual cert auth client cert + server cert mutual most secure requires PKI client cert provisioning via MDM/GPO strong private key password strong RADIUS secret 22+ random per NAS unique if possible not default testing123 secret password RadSec TLS for encryption isolated management VLAN PMF required ieee80211w=2 even Enterprise should have PMF required for WPA3 at least capable for WPA2 disable WPS wps_state=0 strong user passwords complexity lockout 2FA EAP-TLS monitoring SIEM RADIUS logs user education audits
- **Retest:** Verify client has ca_cert rogue RADIUS fails cert validation — new PCAPs client with ca_cert + subject_match — rogue RADIUS self-signed cert fails validation client rejects rogue does not send MSCHAPv2 — no credential capture — EAP-TLS mutual cert works client cert + server cert mutual auth — RADIUS secret strong 22+ random — PMF required beacon MFPC=1 MFPR=1 ieee80211w=2 — new PCAPs Enterprise with PMF required no PEAP without ca_cert etc — document new PCAP hash new config hash new RADIUS logs hash

### Interactive Check

> You have eap.pcapng 15 frames: beacon Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF AKM EAP 1, client assoc open no PSK f2, EAPOL Start f4, EAP Request Identity f5 AP→client, Response Identity f6 client→AP user@corp.com, PEAP f7-8 eap.type==25 TLS tunnel, inner MSCHAPv2 f11-12 challenge/response, EAP Success f13 Access-Accept with MSK, 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK not PBKDF2 per session random, data f18+. What is EAP method identity how many EAPOL does client config have ca_cert what risk if not what is MSCHAPv2 challenge/response can you crack offline simulated hashcat -m 5500 what is defense EAP-TLS vs PEAP with cert validation config audit bad vs good evidence frame numbers?

Answer: EAP method PEAP eap.type==25 identity user@corp.com eap.type==1 EAP Identity PEAP evidence how many EAPOL EAPOL Start 1 + 4-way 4 = 5 EAPOL filter eapol count 5 e.g., 5 EAPOL frames for PT EAP method PEAP identity user@corp.com how many EAPOL 5 evidence, does client config have ca_cert what risk if not wpa_supplicant.conf BAD no ca_cert High PEAP without cert validation client accepts any cert Evil Twin + rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 credential capture High recommend ca_cert + subject_match via MDM/GPO prefer EAP-TLS mutual cert GOOD with ca_cert + subject_match + altsubject_match good EAP-TLS with client_cert private_key private_key_passwd good most secure, what is MSCHAPv2 challenge/response can you crack offline simulated hashcat -m 5500 MSCHAPv2 challenge 1122334455667788 response 2233445566778899 e.g., FreeRADIUS eap logs show challenge/response hostapd logs etc offline cracking with asleap or hashcat mode 5500 e.g., hashcat -m 5500 -a 0 mschapv2.txt rockyou.txt recovers password if weak in wordlist credential capture network access High even with strong password if MSCHAPv2 weak NTLM hash crackable NTLM hash weak Actually NTLM hash crackable via hashcat -m 1000 but MSCHAPv2 challenge/response hashcat -m 5500 if password weak in wordlist cracked credential capture High for PT rogue RADIUS simulation evidence rogue AP BSSID different client assoc to rogue RADIUS logs Access-Challenge with MSCHAPv2 challenge/response hashcat -m 5500 cracked password recovered network access High, what is defense EAP-TLS vs PEAP with cert validation defense enforce ca_cert + subject_match on all clients via MDM GPO prefer EAP-TLS with client certs auto-enrollment revocation checking strong RADIUS secret monitor logs WIDS rogue AP detection user training don't accept unknown certs report cert warnings PMF required WPA3-Enterprise EAP-TLS mutual cert auth client cert + server cert mutual most secure requires PKI client cert provisioning via MDM/GPO strong private key password EAP-TLS vs PEAP with cert validation EAP-TLS mutual cert most secure no password cert-based mutual auth resists rogue RADIUS if both validate PEAP with cert validation client validates server cert via ca_cert + subject_match but server validates client via MSCHAPv2 password not mutual cert but still server validation good if no cert validation client accepts any cert rogue RADIUS captures MSCHAPv2 High for PT defense EAP-TLS vs PEAP with cert validation EAP-TLS most secure PEAP with cert validation good if EAP-TLS not possible but need ca_cert + subject_match, config audit bad wpa_supplicant.conf no ca_cert vulnerable good ca_cert + subject_match + altsubject_match good EAP-TLS with client_cert private_key private_key_passwd good most secure config snippet bad vs good evidence, frame numbers EAP Identity f4-5 PEAP TLS f6-7 EAP Success f8 4-way f9-12 if present beacon f1 Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF assoc f2 open no PSK client 11:22:33:44:55:66 EAPOL Start f4 EAP Request Identity f5 AP→client Response Identity f6 client→AP user@corp.com PEAP f7-8 eap.type==25 TLS handshake f9-10 Client Hello Server Hello Certificate inner MSCHAPv2 f11-12 challenge/response EAP Success f13 Access-Accept with MSK 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK not PBKDF2 per session random data f18+ PCAP eap.pcapng hash filter config hash wpa_supplicant.conf no ca_cert hostapd.conf ca_cert server_cert private_key RADIUS logs rogue AP simulation logs capturing MSCHAPv2 challenge/response hashcat -m 5500 cracked output, impact credential capture via rogue RADIUS offline cracking network access, recommendation enforce ca_cert subject_match EAP-TLS strong RADIUS secret PMF WIDS, retest after fix client rejects rogue RADIUS self-signed cert verify EAP-TLS mutual auth works client cert validated new PCAPs client with ca_cert rejects rogue no MSCHAPv2 to rogue secure EAP-TLS mutual cert works client cert validated RADIUS secret strong 22+ random PMF required beacon MFPC=1 MFPR=1.

## References

- IEEE 802.11, 802.11i, 802.1X, EAP RFC 3748, PEAP, EAP-TLS RFC 5216, RADIUS RFC 2865 2866, RadSec RFC 6614
- OWASP, NIST, Wireshark, PcapInspector, HandshakeDiagram, FreeRADIUS, hostapd, wpa_supplicant, MDM/GPO, Kismet
- MITRE ATT&CK — Enterprise, Credential Access, Rogue AP, Evil Twin

---

*Next: EAP Visualizer — Timeline beacon Enterprise, assoc open, EAP Identity, PEAP, TLS, MSCHAPv2, EAP Success, 4-way, data, rogue RADIUS, hashcat -m 5500, retest*

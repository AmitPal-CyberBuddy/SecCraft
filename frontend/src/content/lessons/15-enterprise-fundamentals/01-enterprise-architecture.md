# Enterprise Wi-Fi Fundamentals — Architecture Professional

## Learning Objectives
- Master WPA2/WPA3-Enterprise architecture: supplicant (client STA wpa_supplicant), authenticator (AP hostapd ieee8021x=1 auth_server_addr/port/shared_secret controls port uncontrolled EAPOL only before auth controlled data after auth), authentication server (RADIUS FreeRADIUS/NPS LDAP AD local users file validates credentials returns Access-Accept with MSK VLAN)
- Understand 802.1X roles EAP over LAN EAPOL RADIUS EAP Request Identity Response Identity EAP method negotiation PEAP EAP-TLS etc inner authentication MSCHAPv2 cert RADIUS Access-Accept with MSK PMK derived from MSK not PBKDF2 4-way handshake Enterprise also uses 4-way but PMK from MSK 4-way M1 ANonce M2 SNonce MIC M3 GTK MIC M4 ACK
- Learn differences vs Personal PSK: Personal single shared password PMK=PBKDF2 passphrase SSID 4096 iter HMAC-SHA1 if PSK weak leaked all users affected no user differentiation no revocation per user weak PSK in wordlist High; Enterprise per-user credentials username/password cert per-user revocation accounting VLAN assignment per user better logging dynamic VLAN ACL per user mutual auth if cert validation enabled EAP-TLS PEAP with cert validation requires RADIUS server PKI for certs more complex but more secure if configured correctly
- Build security benefits and common misconfigurations: PEAP without cert validation client ca_cert missing eap=PEAP phase2 auth=MSCHAPV2 but no CA validation vulnerable to Evil Twin with rogue RADIUS capturing MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 High if many users, weak RADIUS shared secret testing123 secret short should be strong 22+ chars random per NAS, no PMF required even Enterprise should have PMF required for WPA3 at least capable for WPA2, EAP-TLS without proper cert validation or weak client certs, same SSID for Personal and Enterprise mixed confusing, RADIUS logs not monitored no lockout no rate limiting
- Learn PCAP enterprise.pcapng simulated beacon Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF client 11:22:33:44:55:66 association open no PSK EAPOL Start EAP Request Identity Response Identity user@corp.com PEAP tunnel TLS inner MSCHAPv2 RADIUS Access-Accept simulated as EAP Success 4-way handshake with PMK from MSK ANonce SNonce MIC, filters wlan.fc.type_subtype==8 && wlan_mgt.ssid==Corp-Enterprise eap eapol radius, config audit hostapd.conf Enterprise wpa_supplicant.conf missing ca_cert detection RADIUS users file audit
- Build VAPT evidence chain: beacon Enterprise WPA2-EAP CCMP, association open no PSK, EAP Identity user@corp.com, PEAP without ca_cert, RADIUS secret weak testing123, PMF disabled, PCAP hash, config hash, filters, impact credential capture via Evil Twin rogue RADIUS offline MSCHAPv2 cracking network access lateral movement, recommendation enforce ca_cert validate server cert use EAP-TLS with client certs strong RADIUS secret 22+ PMF required ieee80211w=2 monitor RADIUS logs user education, retest verify client has ca_cert rogue RADIUS fails cert validation EAP-TLS works

## Theory

### Enterprise vs Personal — Single Shared Password vs Per-User Credentials 802.1X RADIUS

**Personal (PSK) — Single Shared Password for All Users:**

- **PMK = PBKDF2(passphrase, SSID, 4096 iterations, HMAC-SHA1, 256-bit)** — e.g., SSID LAB-WIFI passphrase WeakPass123 → PMK = PBKDF2-HMAC-SHA1(passphrase, SSID, 4096) = 256-bit — if passphrase weak in wordlist rockyou.txt, offline audit via handshake capture deauth if PMF disabled or passive, hashcat -m 22000 recovers passphrase, then all users affected because same PSK for all, no user differentiation, no revocation per user without changing PSK for all, no accounting per user, no VLAN per user — for PT, weak PSK in wordlist High finding — recommend strong PSK 20+ random unique per SSID rotated vault
- **Finding:** Weak PSK same for WPA2/WPA3 transition same WeakPass123 for both PSK and SAE same password if weak same works WPA3 via downgrade if PMF optional — High if weak — recommend strong PSK 20+ random not in wordlists, WPA3-only SAE if all clients support WPA3, PMF required ieee80211w=2, WPS disabled wps_state=0
- **For PT:** Personal PSK — check if PSK weak via handshake offline audit — if weak, High — recommend strong PSK 20+ random

**Enterprise (802.1X) — Per-User Credentials Username/Password Cert Per-User Revocation Accounting VLAN Assignment:**

- **Per-User Credentials:** Username/password (PEAP-MSCHAPv2) or client cert + server cert mutual (EAP-TLS) — per-user, not shared — if one user credential leaked, only that user affected, can revoke per user without changing password for all, better logging accounting per user, dynamic VLAN assignment per user via RADIUS Tunnel-Private-Group-Id, ACL per user, etc.
- **802.1X + EAP + RADIUS:** Supplicant (client STA wpa_supplicant) --EAPOL--> Authenticator (AP hostapd ieee8021x=1 auth_server_addr/port/shared_secret controls port uncontrolled vs controlled) --RADIUS/EAP--> Authentication Server (RADIUS FreeRADIUS/NPS LDAP AD local users file validates credentials returns Access-Accept with MSK VLAN)
- **PMK per Session Derived from MSK (Master Session Key) from EAP:** Not PBKDF2 — PMK = first 256 bits of MSK from EAP method — e.g., EAP-TLS MSK 512-bit, first 256-bit PMK — per session random, not static like PSK — better — forward secrecy? Actually MSK per session random — good
- **Requires RADIUS Server, PKI for Certs, More Complex but More Secure if Configured Correctly:** Enterprise requires RADIUS server FreeRADIUS/NPS, PKI for certs for EAP-TLS or PEAP server cert, more complex but more secure if configured correctly — common misconfigurations: PEAP without cert validation client ca_cert missing, weak RADIUS shared secret testing123, no PMF required, EAP-TLS without proper cert validation or weak client certs, same SSID for Personal and Enterprise mixed confusing, RADIUS logs not monitored no lockout no rate limiting — for PT, check misconfigurations
- **For PT:** Enterprise — per-user credentials, revocation, accounting, VLAN per user, mutual auth if cert validation enabled EAP-TLS PEAP with cert validation, requires RADIUS server PKI, more secure if configured correctly, but misconfigurations common — PEAP without cert validation High credential capture via Evil Twin rogue RADIUS

### 802.1X Architecture — Supplicant Authenticator Authentication Server EAPOL RADIUS

```
Supplicant (Client STA 11:22:33:44:55:66) --EAPOL--> Authenticator (AP BSSID AA:BB:CC:DD:EE:FF SSID Corp-Enterprise Ch6) --RADIUS/EAP--> Authentication Server (RADIUS 192.168.1.10 port 1812 secret testing123 weak should be 22+ random)
         |                              |                                    |
    wpa_supplicant                hostapd as authenticator              FreeRADIUS / NPS
    EAP method                    forwards EAP to RADIUS                 validates credentials LDAP AD local users file
    validates server cert         controls port uncontrolled vs controlled returns Access-Accept with MSK VLAN accounting
    ca_cert subject_match         only EAPOL allowed before auth          MSK → PMK → 4-way handshake
    EAP-TLS mutual cert           after auth data allowed                 Tunnel-Private-Group-Id VLAN 100
```

**Roles:**

- **Supplicant:** Client device STA 11:22:33:44:55:66, wpa_supplicant, needs EAP method eap=PEAP or eap=TLS, validates server cert via ca_cert + subject_match/altsubject_match/domain_suffix_match, identity user@corp.com, password or client_cert private_key, phase2 auth=MSCHAPV2 for PEAP, etc. — supplicant config wpa_supplicant.conf — for PT, check if ca_cert missing — if missing, High — PEAP without cert validation vulnerable to Evil Twin rogue RADIUS capturing MSCHAPv2 challenge/response for offline cracking hashcat -m 5500
- **Authenticator:** AP BSSID AA:BB:CC:DD:EE:FF SSID Corp-Enterprise Ch6 WPA2-EAP CCMP, hostapd with ieee8021x=1, auth_server_addr=192.168.1.10, auth_server_port=1812, auth_server_shared_secret=testing123 weak should be 22+ random per NAS, controls port controlled vs uncontrolled — only EAPOL allowed before auth via uncontrolled port, after auth data allowed via controlled port — authenticator forwards EAP to RADIUS via RADIUS/EAP — for PT, check hostapd.conf Enterprise — auth_server_shared_secret weak? If testing123, Medium finding — recommend strong 22+ random per NAS, RadSec TLS, isolated management VLAN
- **Authentication Server:** RADIUS 192.168.1.10 port 1812 auth 1813 accounting, FreeRADIUS/NPS, checks credentials LDAP AD local users file, returns Access-Accept with MSK (Master Session Key 512-bit), VLAN Tunnel-Private-Group-Id 100, etc., accounting start — for PT, check RADIUS users file weak passwords, clients.conf weak secret 0.0.0.0/0, eap.conf certs, logs, lockout, etc.

**Flow (Simplified) — Association Open No PSK, 802.1X EAP Identity, EAP Method Negotiation, Inner Auth, RADIUS Access-Accept with MSK, PMK Derived, 4-Way Handshake:**

1. **Client Associates (Open 802.11 Association, No PSK):** Client 11:22:33:44:55:66 assoc req SA client DA AP BSSID AA:BB:CC:DD:EE:FF SSID Corp-Enterprise — open 802.11 association, no PSK, no 4-way yet — AP assoc resp status0 AID1 — for PT, filter `wlan.fc.type_subtype==0 && wlan_mgt.ssid==Corp-Enterprise` assoc req Enterprise open no PSK — beacon shows WPA2-EAP not PSK — filter `wlan_mgt.rsn.akms.type==1` AKM EAP 1 vs PSK 2
2. **802.1X: EAP-Request Identity from AP, EAP-Response Identity (Username) from Client:** After assoc, AP sends EAPOL Start? Actually client may send EAPOL Start, or AP sends EAP-Request Identity — EAP Request Identity from AP SA AP DA client — client EAP Response Identity username user@corp.com — e.g., enterprise.pcapng f5-6 EAP Request Identity f5 AP→client, f6 Response Identity client→AP identity user@corp.com — for PT, filter `eap` — eap.type==1 Identity — check identity user@corp.com — evidence EAP Identity
3. **EAP Method Negotiation (PEAP, EAP-TLS, etc.):** AP proposes EAP methods, client selects — e.g., EAP Request PEAP, EAP Response PEAP, etc. — PEAP tunnel TLS — for PT, filter `eap.type==25` PEAP, `eap.type==13` EAP-TLS, `eap.type==21` TTLS, etc.
4. **Inside EAP Tunnel, Authentication (MSCHAPv2, Cert):** Inside PEAP TLS tunnel, inner authentication MSCHAPv2 challenge/response — e.g., PEAP inner MSCHAPv2 challenge from RADIUS via AP to client, response from client to RADIUS — if client without cert validation, rogue RADIUS can capture MSCHAPv2 challenge/response — for PT, check if PEAP without ca_cert — if no ca_cert, High — rogue RADIUS captures MSCHAPv2 for offline crack hashcat -m 5500 — credential capture
5. **RADIUS Access-Accept with MSK, PMK Derived, 4-Way Handshake (Enterprise Also Uses 4-Way but PMK from MSK, Not PBKDF2):** RADIUS returns Access-Accept with MSK 512-bit, PMK = first 256 bits of MSK — then 4-way handshake Enterprise M1 ANonce from AP to client replay1 no MIC, M2 SNonce MIC from client to AP replay1 RSN IE, M3 GTK MIC from AP to client replay2 secure1, M4 ACK from client to AP replay2 — same as PSK but PMK from MSK not PBKDF2 — per session random — for PT, filter `eapol` — EAPOL M1-M4 — check ANonce SNonce MIC — evidence 4-way handshake Enterprise — PCAP enterprise.pcapng f10-13 EAPOL M1-M4
6. **Data Allowed, Accounting Start:** After 4-way, data allowed via controlled port, accounting start RADIUS Accounting-Request Start, etc. — for PT, after 4-way data — filter `wlan.fc.type==2` data — check data after EAPOL

**For PT:** 802.1X architecture — supplicant authenticator authentication server — EAPOL RADIUS — flow assoc open no PSK EAP Identity username EAP method negotiation inner auth MSCHAPv2 cert RADIUS Access-Accept with MSK PMK derived 4-way handshake data allowed accounting — evidence beacon Enterprise WPA2-EAP, assoc open, EAP Identity user@corp.com, PEAP, MSCHAPv2, EAP Success, EAPOL M1-M4, data — PCAP hash — filters eap eapol radius

### Key Config (hostapd) + wpa_supplicant.conf + FreeRADIUS

**hostapd.conf Enterprise (Authenticator):**

```ini
interface=wlan0
ssid=Corp-Enterprise
bssid=AA:BB:CC:DD:EE:FF
hw_mode=g
channel=6
ieee8021x=1
wpa=2
wpa_key_mgmt=WPA-EAP
rsn_pairwise=CCMP
auth_server_addr=192.168.1.10
auth_server_port=1812
auth_server_shared_secret=testing123  # Weak — should be 22+ random per NAS — Medium finding — recommend StrongRandomSecret123!@#With22+Chars
# Good
# auth_server_shared_secret=StrongRandomSecret123!@#With22+Chars
# ieee80211w=2  # PMF required — even Enterprise should have PMF required for WPA3, at least capable for WPA2 — good
# wps_state=0  # No WPS — good
```

**Client Config wpa_supplicant.conf BAD — No ca_cert:**

```ini
network={
  ssid="Corp-Enterprise"
  key_mgmt=WPA-EAP
  eap=PEAP
  identity="user@corp.com"
  password="StrongPass123"
  phase2="auth=MSCHAPV2"
  # NO ca_cert! — High — PEAP without cert validation — client accepts any cert — Evil Twin + rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 — credential capture — High
}
```

**Client Config wpa_supplicant.conf GOOD — With ca_cert + subject_match:**

```ini
network={
  ssid="Corp-Enterprise"
  key_mgmt=WPA-EAP
  eap=PEAP
  identity="user@corp.com"
  password="StrongPass123"
  ca_cert="/etc/certs/ca.pem"  # CA cert that signed RADIUS server cert — validates server cert chain to trusted CA — good
  subject_match="CN=radius.corp.com"  # Match RADIUS server cert subject CN — validates server cert subject matches expected — good
  altsubject_match="DNS:radius.corp.com"  # Alt subject DNS — good
  phase2="auth=MSCHAPV2"
}
```

**Client Config wpa_supplicant.conf GOOD — EAP-TLS Mutual Cert Most Secure:**

```ini
network={
  ssid="Corp-Enterprise"
  key_mgmt=WPA-EAP
  eap=TLS
  identity="user@corp.com"
  ca_cert="/etc/certs/ca.pem"  # CA cert
  client_cert="/etc/certs/client.pem"  # Client cert
  private_key="/etc/certs/client.key"  # Client private key
  private_key_passwd="StrongPrivateKeyPass123!@#"
  subject_match="CN=radius.corp.com"
}
# EAP-TLS mutual cert — client cert + server cert — mutual authentication — most secure — requires PKI — client cert provisioning via MDM/GPO — best
```

**FreeRADIUS Config (Authentication Server) — clients.conf BAD:**

```ini
client AP1 {
  ipaddr = 192.168.1.1
  secret = testing123  # Weak — should be 22+ random — Medium
  shortname = AP1
}
client all {
  ipaddr = 0.0.0.0/0  # Allows any IP as NAS with weak secret — bad — Medium — should restrict to AP IPs
  secret = testing123
}
# GOOD
# client AP1 {
#   ipaddr = 192.168.1.1
#   secret = StrongRandomSecret123!@#With22+Chars  # Strong 22+ random per NAS
# }
```

**FreeRADIUS users File:**

```
user1 Cleartext-Password := "WeakPass"  # Weak — should be strong — Medium
  Tunnel-Type = VLAN,
  Tunnel-Medium-Type = IEEE-802,
  Tunnel-Private-Group-Id = 100  # VLAN 100 Corp

# GOOD
# user1 Cleartext-Password := "StrongRandomPassword123!@#With20+Chars"
#   Tunnel-Type = VLAN,
#   Tunnel-Medium-Type = IEEE-802,
#   Tunnel-Private-Group-Id = 100
```

**For PT:** Key configs — hostapd.conf Enterprise ieee8021x=1 auth_server_addr/port/shared_secret, wpa_supplicant.conf BAD no ca_cert vs GOOD ca_cert subject_match altsubject_match EAP-TLS mutual cert, FreeRADIUS clients.conf weak secret 0.0.0.0/0 vs strong 22+ random per NAS restricted IP, users file weak password vs strong, eap.conf certs, etc.

### Security Benefits — Per-User Credentials Revocation No Shared PSK Mutual Auth Dynamic VLAN Accounting

- **Per-User Credentials, Revocation:** Per-user username/password or cert, not shared PSK — if one user credential leaked, only that user affected, can revoke per user without changing password for all — e.g., disable user1 in RADIUS users file or LDAP AD, without affecting other users — better than PSK where if PSK leaked all users affected need to change PSK for all — for PT, Enterprise benefit per-user revocation
- **No Shared PSK to Crack:** No shared PSK to crack via handshake offline audit — PSK Personal single shared password PMK=PBKDF2 if weak in wordlist High — Enterprise PMK from MSK per session random not static — no offline audit of PSK — better — but PEAP without cert validation allows rogue RADIUS captures MSCHAPv2 for offline crack — still risk if no cert validation — need cert validation
- **Mutual Authentication if Cert Validation Enabled (EAP-TLS, PEAP with Cert Validation):** EAP-TLS mutual cert auth client cert + server cert mutual — most secure — client validates server cert via ca_cert + subject_match, server validates client cert via CA — mutual — PEAP with cert validation client validates server cert via ca_cert + subject_match but server validates client via MSCHAPv2 password — not mutual cert but still server validation — good — if no cert validation, client accepts any cert rogue RADIUS captures MSCHAPv2 — High — for PT, cert validation important
- **Dynamic VLAN, ACL per User:** RADIUS returns Tunnel-Private-Group-Id VLAN 100 Corp for user1, VLAN 200 Guest for guest, etc. — dynamic VLAN assignment per user via RADIUS — ACL per user — better than PSK where VLAN static per SSID not per user — for PT, Enterprise benefit dynamic VLAN ACL per user
- **Accounting Logs:** RADIUS accounting logs Accounting-Request Start Stop Interim-Update with username user@corp.com, IP, MAC, VLAN, session time, data usage, etc. — better logging accounting per user — for PT, Enterprise benefit accounting logs
- **For PT:** Security benefits — per-user credentials revocation, no shared PSK to crack, mutual auth if cert validation enabled, dynamic VLAN ACL per user, accounting logs — better than Personal if configured correctly — but misconfigurations common

### Common Misconfigurations (What to Look for) — Detailed

1. **PEAP without Cert Validation (Client):** ca_cert missing or eap=PEAP with phase2 but no CA validation → vulnerable to Evil Twin with rogue RADIUS capturing MSCHAPv2 challenge/response for offline cracking — e.g., wpa_supplicant.conf BAD no ca_cert — client accepts any cert from rogue RADIUS — sends MSCHAPv2 challenge/response to attacker — attacker captures challenge/response via rogue RADIUS logs FreeRADIUS eap logs hostapd logs — then offline crack via hashcat -m 5500 — credential capture — High if many users creds capturable — for PT, check wpa_supplicant.conf — if no ca_cert, High finding — PEAP without cert validation allows rogue RADIUS captures MSCHAPv2 for offline crack — recommend ca_cert + subject_match via MDM/GPO, prefer EAP-TLS mutual cert, strong RADIUS secret, PMF required, WIDS
2. **Weak RADIUS Shared Secret:** testing123 secret short → RADIUS traffic uses MD5 for password obfuscation but secret should be strong 22+ chars random per NAS — if weak, brute-force? Actually RADIUS secret used for MD5 hash of password obfuscation and for Message-Authenticator — if weak, attacker can brute-force? For PT, weak RADIUS secret testing123 Medium finding — recommend strong 22+ chars random per NAS unique if possible not default testing123 secret password, RadSec TLS for encryption, isolated management VLAN
3. **No PMF Required:** Even Enterprise should have PMF required for WPA3 at least capable for WPA2 — e.g., hostapd.conf ieee80211w=0 disabled — bad — Medium — allows deauth facilitation — for PT, check beacon RSN Capabilities MFPC/MFPR — if disabled or capable, Medium — recommend required ieee80211w=2 for WPA3-only at least 1 for WPA2 transition if all clients support PMF — WPA3 mandates required
4. **EAP-TLS without Proper Cert Validation or Weak Client Certs:** EAP-TLS requires client cert + server cert mutual — if client cert weak or private key not protected or ca_cert missing or subject_match missing, risk — for PT, check EAP-TLS config — ca_cert client_cert private_key subject_match — if missing, High? Actually EAP-TLS mutual cert most secure but if misconfigured still risk — recommend proper PKI client cert provisioning via MDM/GPO strong private key password, ca_cert subject_match, etc.
5. **Same SSID for Personal and Enterprise Mixed?** Confusing — e.g., SSID Corp-WLAN with both WPA-PSK and WPA-EAP AKMs? Actually hostapd.conf wpa_key_mgmt=WPA-PSK WPA-EAP mixed? Same SSID for Personal and Enterprise mixed confusing — for PT, same SSID different AKMs PSK and EAP mixed? Actually WPA2/WPA3 transition PSK+SAE same SSID different AKMs but same password? For Enterprise vs Personal same SSID mixed? For PT, if same SSID for Personal and Enterprise mixed, confusing — recommend separate SSIDs — e.g., Corp-Enterprise for Enterprise and Corp-PSK for Personal? Actually better separate SSIDs for different security — for PT, check if same SSID for Personal and Enterprise mixed — if yes, Low? Recommend separate SSIDs
6. **RADIUS Logs Not Monitored, No Lockout, No Rate Limiting:** RADIUS logs not monitored no lockout no rate limiting brute-force user1 password WeakPass — for PT, check RADIUS logs monitoring SIEM, lockout after failed attempts, rate limiting, etc. — if no lockout, Medium? Recommend monitoring SIEM lockout rate limiting strong passwords 2FA EAP-TLS

### PCAP — enterprise.pcapng (Simulated, 15 Frames, Scapy-Generated)

- Beacon Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF — beacon f1 — filter `wlan.fc.type_subtype==8 && wlan_mgt.ssid==Corp-Enterprise` — RSN IE AKM EAP 1 — not PSK 2 — Enterprise
- Client 11:22:33:44:55:66 association open no PSK — assoc req f2 SA client DA AP BSSID AA:BB:CC:DD:EE:FF SSID Corp-Enterprise open no PSK — assoc resp f3 SA AP DA client status0 AID1 — filter `wlan.fc.type_subtype==0 && wlan_mgt.ssid==Corp-Enterprise` assoc req Enterprise open
- EAPOL Start f4 SA client DA AP — client EAPOL Start — filter `eapol` — EAPOL Start
- EAP Request Identity f5 SA AP DA client — AP EAP Request Identity — eap.type==1 Identity — filter `eap.type==1` — EAP Identity Request
- EAP Response Identity f6 SA client DA AP identity user@corp.com — client EAP Response Identity user@corp.com — filter `eap.type==1` — EAP Identity Response user@corp.com — evidence EAP Identity
- EAP Request PEAP f7 SA AP DA client — AP EAP Request PEAP — eap.type==25 PEAP — filter `eap.type==25` — PEAP
- EAP Response PEAP f8 SA client DA AP — client EAP Response PEAP — PEAP tunnel TLS start — filter `eap.type==25`
- TLS Handshake Client Hello Server Hello Certificate etc f9-10? Actually inside PEAP TLS tunnel — TLS Client Hello Server Hello Certificate — filter `tls.handshake.type==1` Client Hello — etc.
- Inner MSCHAPv2 Challenge Response f11-12? Actually inside PEAP tunnel inner MSCHAPv2 — MSCHAPv2 challenge from RADIUS via AP to client, response from client to RADIUS — if client without cert validation rogue RADIUS captures challenge/response — for PT, check if PEAP without ca_cert — if no ca_cert, High — rogue RADIUS captures MSCHAPv2 for offline crack hashcat -m 5500
- RADIUS Access-Accept simulated as EAP Success f13 SA AP DA client — EAP Success — filter `eap.code==3` Success — EAP Success — RADIUS Access-Accept with MSK
- 4-way handshake with PMK from MSK f14-17? Actually EAPOL M1 ANonce AP→client replay1 no MIC, M2 SNonce MIC client→AP replay1 RSN IE, M3 GTK MIC AP→client replay2 secure1, M4 ACK client→AP replay2 — filter `eapol` — EAPOL M1-M4 — ANonce SNonce MIC — evidence 4-way handshake Enterprise PMK from MSK not PBKDF2 — per session random
- Data f18+? Actually after 4-way data allowed — filter `wlan.fc.type==2` data — data after EAPOL

**Filters:**

```
wlan.fc.type_subtype==8 && wlan_mgt.ssid==Corp-Enterprise  # Beacons Corp-Enterprise WPA2-EAP — check BSSID Ch6 AKM EAP 1
wlan.fc.type_subtype==0 && wlan_mgt.ssid==Corp-Enterprise  # Assoc req Corp-Enterprise open no PSK — Enterprise open association
eap  # EAP — Request Identity Response Identity user@corp.com PEAP EAP-TLS
eap.type==1  # Identity — user@corp.com
eap.type==25  # PEAP
eap.type==13  # EAP-TLS
eapol  # EAPOL — 4-way handshake M1-M4 ANonce SNonce MIC — PMK from MSK
radius  # RADIUS — Access-Request Accept Reject Accounting — if captured via port mirroring or RADIUS logs
wlan_mgt.rsn.akms.type==1  # AKM EAP 1 — Enterprise — vs PSK 2 — filter Enterprise
wlan_mgt.rsn.capabilities.mfpc==0 && wlan_mgt.rsn.capabilities.mfpr==0  # PMF disabled — bad — Medium — even Enterprise should have PMF required for WPA3
```

**For PT:** PCAP enterprise.pcapng simulated 15 frames beacon Enterprise WPA2-EAP CCMP, client assoc open no PSK, EAPOL Start, EAP Request Identity Response Identity user@corp.com, PEAP tunnel TLS, inner MSCHAPv2, RADIUS Access-Accept simulated as EAP Success, 4-way handshake with PMK from MSK, data — evidence Enterprise — filters eap eapol radius AKM EAP 1 — config audit hostapd.conf Enterprise wpa_supplicant.conf missing ca_cert detection RADIUS users file audit

### Lab — Simulated (Zero-Cost) + Hardware (Future, RF_REQUIRED)

**Simulated (this module, zero-cost):**
- **PCAP:** `enterprise.pcapng` (15 frames, Scapy-generated) — beacon Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF, client 11:22:33:44:55:66 assoc open no PSK f2, EAPOL Start f4, EAP Request Identity f5 AP→client, Response Identity f6 client→AP user@corp.com, PEAP f7-8, TLS handshake f9-10, inner MSCHAPv2 f11-12, EAP Success f13 Access-Accept with MSK, 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK not PBKDF2, data f18+
- **Tasks:**
  1. Is it Enterprise? Yes, beacon WPA2-EAP AKM 1 EAP not PSK 2 — filter `wlan_mgt.rsn.akms.type==1` — Enterprise — beacon f1 Corp-Enterprise WPA2-EAP CCMP Ch6
  2. Association open no PSK? Yes, assoc req open no PSK — filter `wlan.fc.type_subtype==0 && wlan_mgt.ssid==Corp-Enterprise` — assoc req Enterprise open no PSK — evidence Enterprise open association
  3. EAP Identity? Yes, EAP Request Identity f5 AP→client, Response Identity f6 client→AP user@corp.com — filter `eap.type==1` — identity user@corp.com — evidence EAP Identity
  4. EAP Method? PEAP f7-8 — filter `eap.type==25` — PEAP — TLS tunnel — inner MSCHAPv2 — if client without ca_cert, High — rogue RADIUS captures MSCHAPv2 for offline crack hashcat -m 5500
  5. 4-way handshake? Yes, EAPOL M1-M4 f14-17 — filter `eapol` — ANonce SNonce MIC — PMK from MSK not PBKDF2 — per session random — evidence 4-way handshake Enterprise
  6. Config audit? hostapd.conf Enterprise ieee8021x=1 auth_server_addr/port/shared_secret testing123 weak should be 22+ random — Medium — recommend strong 22+ random per NAS RadSec TLS isolated management VLAN; wpa_supplicant.conf BAD no ca_cert — High — PEAP without cert validation — client accepts any cert — Evil Twin + rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking — recommend ca_cert + subject_match via MDM/GPO prefer EAP-TLS mutual cert; RADIUS clients.conf 0.0.0.0/0 weak secret — Medium — restrict to AP IPs strong secret 22+ random per NAS; users file WeakPass — Medium — strong passwords complexity lockout 2FA EAP-TLS monitoring
  7. Evidence? Beacon f1 Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF, assoc f2 open no PSK client 11:22:33:44:55:66, EAPOL Start f4, EAP Request Identity f5 AP→client, Response Identity f6 client→AP user@corp.com, PEAP f7-8, TLS handshake f9-10, inner MSCHAPv2 f11-12, EAP Success f13 Access-Accept with MSK, 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK, data f18+, PCAP enterprise.pcapng SHA256 abc123... Size 3.5 KB Frames 15 Tool Scapy Method scapy, filter wlan_mgt.ssid==Corp-Enterprise eap eapol radius, config hash hostapd.conf wpa_supplicant.conf clients.conf users file

**Config Audit:**
- hostapd.conf Enterprise — ieee8021x=1 auth_server_addr/port/shared_secret testing123 weak — Medium — recommend strong 22+ random per NAS RadSec TLS
- wpa_supplicant.conf BAD no ca_cert — High — PEAP without cert validation — client accepts any cert — Evil Twin + rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 — recommend ca_cert + subject_match via MDM/GPO prefer EAP-TLS mutual cert
- FreeRADIUS clients.conf 0.0.0.0/0 weak secret — Medium — restrict to AP IPs strong secret 22+ random per NAS
- FreeRADIUS users file WeakPass — Medium — strong passwords complexity lockout 2FA EAP-TLS monitoring
- eap.conf certs — ca_cert server_cert private_key — check certs valid HSTS? Actually RADIUS server cert valid? For PT, check eap.conf certs

**Hardware (Future, RF_REQUIRED, requires ALFA adapter, explicit ROE, own lab):**
- Full lab with FreeRADIUS Docker, hostapd Enterprise, client, capture EAP flow, test rogue RADIUS authorized lab only — lab-only SSID LAB-ENTERPRISE, own infrastructure, ALFA adapter
- Requires monitor mode, AP mode, 2 radios? Actually for Enterprise, one AP Enterprise for clients, and RADIUS server via Ethernet or same host? For PT, lab-only SSID LAB-ENTERPRISE, own infrastructure, ALFA adapter, FreeRADIUS Docker, hostapd Enterprise, client wpa_supplicant, capture EAP flow via airodump-ng Wireshark, test rogue RADIUS authorized lab only with explicit ROE — rogue RADIUS captures MSCHAPv2 challenge/response if client without ca_cert — offline crack hashcat -m 5500
- Safety: Lab-only, never use real corporate SSID, only LAB-*, e.g., LAB-ENTERPRISE, not Corp-Enterprise — only own lab — explicit ROE — own infrastructure — own devices — isolated — no production — no corporate — lab-only
- Example: `hostapd` config Enterprise SSID LAB-ENTERPRISE BSSID AA:BB:CC:DD:EE:FF Ch6 ieee8021x=1 wpa_key_mgmt=WPA-EAP rsn_pairwise=CCMP auth_server_addr=192.168.1.10 auth_server_port=1812 auth_server_shared_secret=StrongRandomSecret123!@#With22+Chars, FreeRADIUS Docker with clients.conf users file eap.conf certs, client wpa_supplicant.conf with eap=PEAP identity=user@corp.com password=StrongPass123 ca_cert=/etc/certs/ca.pem subject_match=CN=radius.corp.com phase2=auth=MSCHAPV2, etc.
- For this academy: Simulated only for browser — hardware marked with prep docs — zero-cost simulated philosophy kept but mark hardware labs requiring RF adapter with prep docs — this module simulated enterprise.pcapng 15 frames, hardware future with ALFA adapter and explicit ROE

### VAPT Relevance — Enumeration, Evidence, Impact, Recommendation, Retest

- **Enumeration:** Find Enterprise SSID Corp-Enterprise, check beacon WPA2-EAP AKM 1, association open no PSK, EAP Identity user@corp.com, EAP method PEAP EAP-TLS, check wpa_supplicant.conf ca_cert missing, RADIUS secret weak, PMF disabled, etc. — filter `wlan_mgt.ssid==Corp-Enterprise`, `wlan_mgt.rsn.akms.type==1`, `eap`, `eapol`, `radius`
- **Evidence:** Beacon Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF, association open no PSK client 11:22:33:44:55:66, EAPOL Start, EAP Request Identity AP→client, Response Identity client→AP user@corp.com, PEAP TLS tunnel inner MSCHAPv2, EAP Success Access-Accept with MSK, 4-way handshake M1-M4 ANonce SNonce MIC PMK from MSK not PBKDF2, data, PCAP hash, filter, config hash hostapd.conf wpa_supplicant.conf clients.conf users file, RADIUS logs, etc.
- **Impact:** Credential capture via Evil Twin + rogue RADIUS if PEAP without cert validation — PEAP without ca_cert client accepts any cert rogue RADIUS captures MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 credential capture High — network access lateral movement data theft pivot — RADIUS weak secret testing123 Medium brute-force? Actually RADIUS secret weak Medium — PMF disabled Medium deauth facilitation — EAP-TLS without proper cert validation or weak client certs Medium? Actually EAP-TLS mutual cert most secure if configured correctly — but misconfig still risk
- **Recommendation:** Enforce ca_cert validate server cert via ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO, prefer EAP-TLS with client certs mutual auth most secure PKI client cert provisioning via MDM/GPO strong private key password, strong RADIUS secret 22+ random per NAS unique if possible not default testing123 secret password RadSec TLS for encryption isolated management VLAN, PMF required ieee80211w=2 even Enterprise should have PMF required for WPA3 at least capable for WPA2, disable WPS wps_state=0, strong user passwords complexity lockout 2FA EAP-TLS monitoring SIEM RADIUS logs, user education, audits, no WEP no TKIP no open without OWE
- **Retest:** Verify client has ca_cert rogue RADIUS fails cert validation EAP-TLS works — new PCAPs client with ca_cert + subject_match — rogue RADIUS self-signed cert fails validation client rejects rogue does not send MSCHAPv2 — EAP-TLS mutual cert works client cert + server cert mutual auth — RADIUS secret strong 22+ random — PMF required beacon MFPC=1 MFPR=1 — new PCAPs Enterprise with PMF required, no PEAP without ca_cert, etc. — document new PCAP hash new config hash

### Finding Template

```
Title: Enterprise Wi-Fi Missing Server Certificate Validation (PEAP without ca_cert)
Severity: High
CVSS: 7.5 (AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N) — Adjacent, Low complexity, No privileges, No user interaction, Scope Unchanged, Confidentiality High, Integrity High — High if credential capture possible via Evil Twin + rogue RADIUS
Description: SSID Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF — client wpa_supplicant.conf with eap=PEAP identity=user@corp.com password=StrongPass123 phase2=auth=MSCHAPV2 but NO ca_cert — client accepts any cert from rogue RADIUS — vulnerable to Evil Twin with rogue RADIUS capturing MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 — credential capture — network access. RADIUS shared secret testing123 weak 11 chars should be 22+ random per NAS — Medium. PMF disabled ieee80211w=0 — Medium — deauth facilitation — even Enterprise should have PMF required for WPA3.
Evidence: Beacon f1 BSSID AA:BB:CC:DD:EE:FF SSID Corp-Enterprise WPA2-EAP CCMP Ch6 AKM EAP 1 RSN IE, association f2 SA 11:22:33:44:55:66 DA AA:BB:CC:DD:EE:FF BSSID AA:BB:CC:DD:EE:FF SSID Corp-Enterprise open no PSK, EAPOL Start f4 SA client DA AP, EAP Request Identity f5 SA AP DA client, Response Identity f6 SA client DA AP identity user@corp.com, PEAP f7-8 eap.type==25, TLS handshake f9-10, inner MSCHAPv2 f11-12 challenge/response, EAP Success f13 Access-Accept with MSK, 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK not PBKDF2 per session random, data f18+, PCAP enterprise.pcapng SHA256 abc123... Size 3.5 KB Frames 15 Tool Scapy Method scapy, filter wlan_mgt.ssid==Corp-Enterprise, wlan_mgt.rsn.akms.type==1, eap.type==1, eap.type==25, eapol, radius, wlan_mgt.rsn.capabilities.mfpc==0 mfpr==0 PMF disabled, config hash hostapd.conf SHA256..., wpa_supplicant.conf SHA256... no ca_cert, clients.conf SHA256... secret testing123 weak 0.0.0.0/0, users file SHA256... WeakPass, RADIUS logs, wash output? Actually wash for WPS but for Enterprise EAP
Impact: Credential capture via Evil Twin + rogue RADIUS — attacker creates rogue AP same SSID Corp-Enterprise BSSID 11:22:33:44:55:66 Ch11 clones Enterprise, client without ca_cert associates to rogue, accepts any cert from rogue RADIUS, sends MSCHAPv2 challenge/response to attacker, attacker captures challenge/response via rogue RADIUS logs FreeRADIUS eap logs hostapd logs, offline crack via hashcat -m 5500 recovers password StrongPass123 if weak in wordlist or via brute-force, network access lateral movement data theft pivot compliance fail, RADIUS weak secret testing123 Medium brute-force? Actually RADIUS secret weak Medium, PMF disabled Medium deauth facilitation
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
# auth_server_shared_secret=StrongRandomSecret123!@#With22+Chars  # Strong 22+ random per NAS
# ieee80211w=2  # PMF required
# wps_state=0
Retest: Verify client has ca_cert rogue RADIUS fails cert validation — new PCAPs client with ca_cert + subject_match — rogue RADIUS self-signed cert fails validation client rejects rogue does not send MSCHAPv2 — no credential capture — EAP-TLS mutual cert works client cert + server cert mutual auth — RADIUS secret strong 22+ random — PMF required beacon MFPC=1 MFPR=1 ieee80211w=2 — new PCAPs Enterprise with PMF required, no PEAP without ca_cert, etc. — document new PCAP hash new config hash new RADIUS logs hash
References: IEEE 802.11, 802.11i, 802.1X, EAP, PEAP, EAP-TLS, RADIUS RFC 2865 2866, RadSec RFC 6614, OWASP, NIST, Wireshark, PcapInspector, HandshakeDiagram, FreeRADIUS, hostapd, wpa_supplicant, MDM/GPO
```

### Attack → Defense → Retest

- **Attack:** Observe beacon Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF AKM EAP 1 — Enterprise — not PSK — client 11:22:33:44:55:66 assoc open no PSK f2 — EAPOL Start f4 — EAP Request Identity f5 AP→client — Response Identity f6 client→AP user@corp.com — PEAP f7-8 eap.type==25 TLS tunnel — inner MSCHAPv2 f11-12 challenge/response — if client without ca_cert, rogue AP same SSID Corp-Enterprise BSSID 11:22:33:44:55:66 Ch11 clones Enterprise — client without ca_cert associates to rogue — accepts any cert from rogue RADIUS — sends MSCHAPv2 challenge/response to attacker — attacker captures challenge/response via rogue RADIUS logs FreeRADIUS eap logs — offline crack via hashcat -m 5500 recovers password if weak in wordlist — credential capture — network access — High — RADIUS secret testing123 weak Medium — PMF disabled ieee80211w=0 Medium deauth facilitation
- **Defense:** Enforce ca_cert + subject_match/altsubject_match/domain_suffix_match via MDM/GPO — client must validate RADIUS server cert via ca_cert that signed RADIUS server cert + subject_match CN=radius.corp.com — rogue RADIUS self-signed cert fails validation if client configured to validate — client will not send MSCHAPv2 — secure — prefer EAP-TLS mutual cert auth — client cert + server cert mutual — most secure — requires PKI — client cert provisioning via MDM/GPO — strong private key password — strong RADIUS secret 22+ random per NAS unique if possible not default testing123 secret password — RadSec TLS for encryption — isolated management VLAN — PMF required ieee80211w=2 even Enterprise should have PMF required for WPA3 at least capable for WPA2 — disable WPS wps_state=0 — strong user passwords complexity lockout 2FA EAP-TLS monitoring SIEM RADIUS logs user education audits
- **Retest:** Verify client has ca_cert rogue RADIUS fails cert validation — new PCAPs client with ca_cert + subject_match — rogue RADIUS self-signed cert fails validation client rejects rogue does not send MSCHAPv2 — no credential capture — EAP-TLS mutual cert works client cert + server cert mutual auth — RADIUS secret strong 22+ random — PMF required beacon MFPC=1 MFPR=1 ieee80211w=2 — new PCAPs Enterprise with PMF required, no PEAP without ca_cert, etc. — document new PCAP hash new config hash new RADIUS logs hash

### Interactive Check

> You have enterprise.pcapng 15 frames: beacon Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF AKM EAP 1, client 11:22:33:44:55:66 assoc open no PSK f2, EAPOL Start f4, EAP Request Identity f5 AP→client, Response Identity f6 client→AP user@corp.com, PEAP f7-8 eap.type==25 TLS tunnel, inner MSCHAPv2 f11-12 challenge/response, EAP Success f13 Access-Accept with MSK, 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK not PBKDF2 per session random, data f18+. What is Enterprise architecture, 802.1X roles, flow, differences vs Personal, benefits, misconfigurations, evidence, defense?

Answer: Enterprise architecture supplicant client STA 11:22:33:44:55:66 wpa_supplicant EAP method validates server cert ca_cert subject_match identity user@corp.com password or client_cert private_key phase2 auth=MSCHAPV2, authenticator AP BSSID AA:BB:CC:DD:EE:FF SSID Corp-Enterprise Ch6 WPA2-EAP CCMP hostapd ieee8021x=1 auth_server_addr=192.168.1.10 auth_server_port=1812 auth_server_shared_secret=testing123 weak should be 22+ random controls port uncontrolled EAPOL only before auth controlled data after auth forwards EAP to RADIUS via RADIUS/EAP, authentication server RADIUS 192.168.1.10 port 1812 auth 1813 accounting FreeRADIUS/NPS LDAP AD local users file validates credentials returns Access-Accept with MSK 512-bit VLAN Tunnel-Private-Group-Id 100 accounting. 802.1X roles supplicant authenticator authentication server EAPOL RADIUS. Flow client associates open 802.11 association no PSK assoc req SA client DA AP BSSID SSID Corp-Enterprise open no PSK assoc resp status0 AID1, 802.1X EAP-Request Identity from AP EAP-Response Identity username user@corp.com from client, EAP method negotiation PEAP EAP-TLS etc, inside EAP tunnel authentication MSCHAPv2 cert, RADIUS Access-Accept with MSK PMK derived from MSK first 256 bits of MSK not PBKDF2 per session random, 4-way handshake Enterprise also uses 4-way but PMK from MSK M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2, data allowed accounting start. Differences vs Personal Personal single shared password PMK=PBKDF2 passphrase SSID 4096 iter HMAC-SHA1 if PSK weak leaked all users affected no user differentiation no revocation per user weak PSK in wordlist High, Enterprise per-user credentials username/password cert per-user revocation accounting VLAN assignment per user better logging dynamic VLAN ACL per user mutual auth if cert validation enabled EAP-TLS PEAP with cert validation requires RADIUS server PKI for certs more complex but more secure if configured correctly. Security benefits per-user credentials revocation no shared PSK to crack mutual auth if cert validation enabled EAP-TLS PEAP with cert validation dynamic VLAN ACL per user accounting logs. Common misconfigurations PEAP without cert validation client ca_cert missing eap=PEAP phase2 auth=MSCHAPV2 but no CA validation vulnerable to Evil Twin with rogue RADIUS capturing MSCHAPv2 challenge/response for offline cracking hashcat -m 5500 High if many users creds capturable, weak RADIUS shared secret testing123 secret short should be strong 22+ chars random per NAS Medium, no PMF required even Enterprise should have PMF required for WPA3 at least capable for WPA2 Medium deauth facilitation, EAP-TLS without proper cert validation or weak client certs, same SSID for Personal and Enterprise mixed confusing, RADIUS logs not monitored no lockout no rate limiting. PCAP enterprise.pcapng 15 frames beacon Corp-Enterprise WPA2-EAP CCMP Ch6 BSSID AA:BB:CC:DD:EE:FF f1, client assoc open no PSK f2, EAPOL Start f4, EAP Request Identity f5 AP→client, Response Identity f6 client→AP user@corp.com, PEAP f7-8 eap.type==25, TLS handshake f9-10, inner MSCHAPv2 f11-12, EAP Success f13 Access-Accept with MSK, 4-way handshake f14-17 M1 ANonce AP→client replay1 no MIC M2 SNonce MIC client→AP replay1 RSN IE M3 GTK MIC AP→client replay2 secure1 M4 ACK client→AP replay2 PMK from MSK not PBKDF2 per session random, data f18+. Filters wlan.fc.type_subtype==8 && wlan_mgt.ssid==Corp-Enterprise beacons Enterprise WPA2-EAP, wlan.fc.type_subtype==0 && wlan_mgt.ssid==Corp-Enterprise assoc req Enterprise open no PSK, eap EAP Request Identity Response Identity user@corp.com PEAP EAP-TLS, eap.type==1 Identity user@corp.com, eap.type==25 PEAP, eap.type==13 EAP-TLS, eapol 4-way handshake M1-M4 ANonce SNonce MIC PMK from MSK, radius Access-Request Accept Reject Accounting if captured via port mirroring or RADIUS logs, wlan_mgt.rsn.akms.type==1 AKM EAP 1 Enterprise vs PSK 2, wlan_mgt.rsn.capabilities.mfpc==0 && mfpr==0 PMF disabled bad Medium even Enterprise should have PMF required for WPA3. Lab simulated PCAP analysis enterprise.pcapng config audit hostapd.conf Enterprise wpa_supplicant.conf missing ca_cert detection RADIUS users file audit, hardware future RF_REQUIRED full lab with FreeRADIUS Docker hostapd Enterprise client capture EAP flow test rogue RADIUS authorized lab only. Evidence beacon Enterprise WPA2-EAP CCMP, association open no PSK, EAP Identity user@corp.com, PEAP without ca_cert, RADIUS secret weak testing123, PMF disabled, PCAP hash, config hash, filters, impact credential capture via Evil Twin rogue RADIUS offline MSCHAPv2 cracking network access lateral movement, recommendation enforce ca_cert validate server cert use EAP-TLS with client certs strong RADIUS secret 22+ PMF required ieee80211w=2 monitor RADIUS logs user education, retest verify client has ca_cert rogue RADIUS fails cert validation EAP-TLS works.

## References

- IEEE 802.11, 802.11i, 802.1X, EAP RFC 3748, PEAP, EAP-TLS RFC 5216, RADIUS RFC 2865 2866, RadSec RFC 6614
- OWASP, NIST, Wireshark, PcapInspector, HandshakeDiagram, FreeRADIUS, hostapd, wpa_supplicant, MDM/GPO, Kismet
- MITRE ATT&CK — Enterprise, Credential Access, Rogue AP, Evil Twin

---

*Next: Enterprise Testing — Config audit, rogue RADIUS, MSCHAPv2 capture, hashcat -m 5500, EAP-TLS*

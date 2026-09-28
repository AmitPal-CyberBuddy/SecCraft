# Captive Portal Testing Methodology — Recon, Enum, Auth, Session, Isolation, Cloning, Evidence Professional

## Learning Objectives
- Master VAPT testing methodology for captive portals: recon open SSID check portal HTTP redirect, enum portal type HTTPS session isolation, test auth weak creds SQLi XSS authorized, test session MAC spoof bypass cookie timeout, test isolation two clients ping ARP spoof, test cloning Evil Twin portal clone credential capture simulated, evidence PCAP open assoc HTTP redirect login MAC spoof, impact cred capture session hijack client attack free internet, recommendation HTTPS strong session isolation OWE/WPA2-PSK for guest WIDS, retest HTTPS session not bypassable isolation enabled
- Understand PCAP captive-portal.pcapng 15 frames: open SSID Guest-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 Open no WPA2 no encryption no 4-way handshake no EAPOL, client 11:22:33:44:55:66 associates open, DHCP DNS HTTP redirect 302 to portal, login POST credentials maybe HTTP weak vs HTTPS good, after auth data sniffable if HTTP, filters wlan.fc.type_subtype==0 http dns
- Build evidence chain: beacon open, assoc open no EAPOL, DHCP IP gateway DNS, DNS query example.com, HTTP GET example.com → 302 redirect to portal.guest.com/login, HTTP GET portal login page, login POST credentials, after auth data HTTP sniffable, MAC spoof bypass, isolation test ping, PCAP hash, filter, config hash hostapd.conf ap_isolate, portal config HTTPS session type
- Learn defense: HTTPS for portal HSTS valid cert, strong session MAC+cookie+IP+token timeout re-auth HttpOnly Secure SameSite, client isolation ap_isolate=1, WIDS rogue portal, OWE AKM 18 open with encryption or WPA2-PSK for guest instead of pure open, rate limiting strong auth voucher 8+ random expiration

## Theory

### Testing Methodology — 10 Steps VAPT

**Lab SSID:** LAB-GUEST-OPEN with captive portal simulation (Docker nginx + portal + hostapd open, lab-only, ALFA adapter, explicit ROE, own lab, isolated, no production)

**Steps (VAPT Methodology, Authorized Lab Only, Zero-Cost Simulated + Hardware Future):**

1. **Recon — Find Open SSID, Check Portal HTTP Redirect:**
   - `airodump-ng wlan0mon` shows ESSID Guest-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 ENC OPN no CIPHER no AUTH Open — open — no WPA2 — no encryption
   - Associate open: `iw dev wlan0 connect Guest-WLAN` or `nmcli dev wifi connect Guest-WLAN` — open no PSK
   - Get IP via DHCP: `dhclient wlan0` or `dhclient -v wlan0` — IP 192.168.1.100 gateway 192.168.1.1 DNS 8.8.8.8
   - Check portal: `curl -v http://example.com` or `curl -v http://connectivitycheck.gstatic.com/generate_204` — 302 Found Location: https://portal.guest.com/login — captive portal present — HTTP redirect 302 to portal — evidence beacon open, assoc open, HTTP redirect 302
   - For PT: Recon open SSID Guest-WLAN, check captive portal HTTP redirect 302 to portal — filter `wlan_mgt.ssid==Guest-WLAN && wlan.fc.type_subtype==8` beacon open, `wlan.fc.type_subtype==0` assoc req open, `http contains 302` or `http contains portal.guest.com`

2. **Enum — Portal Type, HTTPS?, Session, Isolation:**
   - Portal type: Username/password, voucher code, email, SMS OTP, social OAuth, accept terms, etc. — check portal login page https://portal.guest.com/login — form fields username password voucher email SMS etc.
   - HTTPS? Check redirect and login form action — is it https://portal.guest.com/login or http? If http, High credential capture — if https, good — check via `curl -v https://portal.guest.com/login` — valid cert? HSTS? Check cert `openssl s_client -connect portal.guest.com:443 -servername portal.guest.com | openssl x509 -noout -text` — valid cert, HSTS header `Strict-Transport-Security`
   - Session type: MAC-based? Cookie? Timeout? — check firewall rules iptables ebtables nftables — is it MAC-based only? Check via portal config audit — if MAC-based only, Medium bypass via MAC spoof — if MAC+cookie+IP+token timeout, good
   - Client isolation: ap_isolate=1? Check hostapd.conf — if 0, Low clients can ping each other — test via two clients same open can they ping each other? `ping 192.168.1.101` from client1 — if succeeds, isolation disabled — Low — recommend ap_isolate=1
   - For PT: Enum portal type HTTPS session isolation — evidence portal login page, HTTPS, session type, isolation, config hash

3. **Test Auth — Weak Creds, SQLi, XSS (Authorized Lab Only):**
   - Try weak credentials: admin/admin, guest/guest, voucher 1234, etc. — if portal allows weak credentials, Low? Actually for guest portal with voucher, voucher guessable short 4 digits 1234 brute-force — Medium — recommend strong voucher 8+ random alphanumeric expiration rate limiting
   - SQLi: Try `' OR '1'='1` in username field — if authorized, test — if portal has SQLi, High credential bypass — for PT, if authorized lab, test SQLi — evidence POST with SQLi payload, response, etc. — but for guest portal, SQLi may be High
   - XSS: Try `<script>alert(1)</script>` in voucher field — if authorized, test — if portal has XSS, Medium? Actually XSS in portal may allow session hijack, credential capture, etc. — for PT, if authorized, test XSS — evidence POST with XSS payload, response, etc.
   - For PT: Test auth weak creds SQLi XSS authorized lab only — evidence POST, response, etc. — but for this academy simulated, just theory — mark with explicit ROE

4. **Test Session — MAC Spoof Bypass, Cookie, Timeout:**
   - After auth, spoof MAC of authenticated client, see if internet bypass — e.g., client 11:22:33:44:55:66 auth via portal, gets internet, attacker sniffs MAC 11:22:33:44:55:66 via airodump-ng or Wireshark, then `ifconfig wlan0 down && macchanger -m 11:22:33:44:55:66 wlan0 && ifconfig wlan0 up`, then `iw dev wlan0 connect Guest-WLAN`, `dhclient wlan0`, then `curl http://example.com` — if gets internet without portal login, bypass via MAC spoof — Medium finding — evidence PCAP shows client auth, then attacker spoofs MAC and gets internet without portal login — filter `wlan.sa==11:22:33:44:55:66`
   - Cookie: Check cookie flags HttpOnly Secure SameSite — if not HttpOnly Secure, Low? Recommend HttpOnly Secure SameSite
   - Timeout: Check session timeout — if no timeout long session no re-auth, Low? Recommend timeout 1h re-auth
   - For PT: Test session MAC spoof bypass cookie timeout — evidence PCAP client auth then attacker spoofs MAC and gets internet without portal login — Medium

5. **Test Isolation — Two Clients Ping, ARP Spoof:**
   - Two clients on same open, can they ping each other? ARP spoof? — e.g., client1 11:22:33:44:55:66 IP 192.168.1.100 and client2 22:33:44:55:66:77 IP 192.168.1.101 on same open Guest-WLAN, `ping 192.168.1.101` from client1 — if succeeds, isolation disabled ap_isolate=0 — Low finding — recommend ap_isolate=1 — evidence ping, ARP, etc.
   - ARP spoof: If isolation disabled, clients can ARP spoof each other — e.g., `arpspoof -i wlan0 -t 192.168.1.100 192.168.1.1` — for PT, if authorized lab, test ARP spoof — but for this academy simulated, just theory — mark with explicit ROE
   - For PT: Test isolation two clients ping ARP spoof — evidence ping, ARP, etc. — Low if disabled — recommend ap_isolate=1

6. **Test Cloning — Evil Twin + Portal Clone Credential Capture (Simulated):**
   - Clone portal page, see if credential capture possible (simulated) — e.g., attacker creates Evil Twin SSID Guest-WLAN Open BSSID 11:22:33:44:55:66 Ch11, clones portal page https://portal.guest.com/login to local nginx, client connects to rogue Open and sees cloned portal, enters credentials, attacker captures — for PT, simulated only — evidence rogue beacon same SSID different BSSID, portal clone, credential capture — High if portal HTTP no cert validation
   - For PT: Test cloning Evil Twin portal clone credential capture simulated — evidence rogue beacon same SSID different BSSID, portal clone, credential capture — High if portal HTTP

7. **Evidence — PCAP Open Assoc, HTTP Redirect, Login, MAC Spoof:**
   - PCAP showing open association, HTTP redirect, login over HTTP vs HTTPS, MAC spoof, isolation test, etc. — e.g., captive-portal.pcapng open association, HTTP redirect 302, login POST over HTTP weak vs HTTPS good, MAC spoof, isolation test — PCAP hash, filter, config hash, etc.
   - For PT: Evidence beacon open, assoc open no EAPOL, DHCP, DNS, HTTP redirect 302 to portal, login POST over HTTP vs HTTPS, data after auth HTTP sniffable if HTTP, MAC spoof bypass, isolation test ping, PCAP hash SHA256, filter, config hash hostapd.conf ap_isolate, portal config HTTPS session type

8. **Impact — Cred Capture, Session Hijack, Client Attack, Free Internet:**
   - Credential capture, session hijack, client attack, free internet — e.g., open no encryption traffic sniffing Low/Medium, credential handling login over HTTP credential capture High, session management MAC-based spoof bypass Medium free internet, client isolation disabled Low client attack, rogue portal cloning credential capture High, DNS tunneling bypass Medium
   - For PT: Impact — traffic sniffing, credential capture if HTTP, session hijack MAC spoof free internet, client attack if isolation disabled, rogue portal cloning credential capture, DNS tunneling bypass — Low for open guest, Medium for MAC spoof free internet, High for credential capture if HTTP, Low for isolation disabled

9. **Recommendation — HTTPS, Strong Session, Isolation, OWE/WPA2-PSK for Guest, WIDS:**
   - HTTPS for portal HSTS valid cert, strong session MAC+cookie+IP+token timeout re-auth HttpOnly Secure SameSite, client isolation ap_isolate=1, WIDS for rogue portal, OWE AKM 18 open with encryption or WPA2-PSK for guest instead of pure open if possible, rate limiting strong auth for portal voucher 8+ random expiration, no open without OWE, no WEP no TKIP no WPS
   - For PT: Recommendation HTTPS strong session isolation OWE/WPA2-PSK WIDS rate limiting strong auth

10. **Retest — Verify HTTPS, Session Not Bypassable, Isolation Enabled:**
    - Verify HTTPS, session not bypassable via MAC spoof, isolation enabled — e.g., new PCAPs portal HTTPS, MAC spoof fails (session requires cookie+token not just MAC), isolation enabled (two clients cannot ping), etc.
    - For PT: Retest new PCAPs portal HTTPS, MAC spoof fails, isolation enabled, OWE or WPA2-PSK, new beacons OWE AKM 18 or WPA2-PSK, document new PCAP hash new config hash

### Lab Tasks — captive-portal.pcapng 15 Frames Simulated

**PCAP:** `captive-portal.pcapng` (15 frames, Scapy-generated)
- Open SSID Guest-WLAN, BSSID AA:BB:CC:DD:EE:FF, Ch6, Open, no WPA2, no encryption, no 4-way handshake, no EAPOL, beacon f1
- Client 11:22:33:44:55:66 associates open f2 (assoc req open capabilities, assoc resp status0 AID1)
- DHCP Discover Offer Request Ack f3-6 — client gets IP 192.168.1.100, gateway 192.168.1.1, DNS 8.8.8.8, lease 12h
- DNS query f7 example.com → f8 response 93.184.216.34
- HTTP GET http://example.com f9 → 302 redirect to https://portal.guest.com/login f10 — captive portal present
- HTTP GET https://portal.guest.com/login f11 — portal login page — form action https://portal.guest.com/login POST
- Login POST f12 username=guest&password=guest123 over HTTP weak vs HTTPS good — for this module maybe over HTTP weak vs HTTPS good — check filter `http contains password` vs `tls`
- After auth, data traffic f13-15 HTTP GET http://example.com after auth — data sniffable if HTTP — evidence open no encryption
- For MAC spoof bypass: Attacker sniffs MAC 11:22:33:44:55:66, spoofs MAC, gets internet without portal login — evidence

**Tasks:**
1. Is it open? Yes, no EAPOL, association open — beacon f1 BSSID AA:BB:CC:DD:EE:FF SSID Guest-WLAN Open Ch6, association f2 SA 11:22:33:44:55:66 DA AA:BB:CC:DD:EE:FF BSSID AA:BB:CC:DD:EE:FF SSID Guest-WLAN open no EAPOL — filter `wlan_mgt.ssid==Guest-WLAN && wlan.fc.type_subtype==8` beacon open, `wlan.fc.type_subtype==0` assoc req open, no EAPOL
2. Portal? Yes, HTTP 302 redirect to portal.guest.com/login — HTTP GET http://example.com f9 → 302 redirect to https://portal.guest.com/login f10 — captive portal present — filter `http contains portal.guest.com` or `http contains 302`
3. HTTPS? Login POST over HTTP? Weak — check login POST f12 — is it http or https? If http, High credential capture — if https, good — filter `http contains password` vs `tls` — check form action
4. Session? MAC-based, firewall allows MAC after auth — check firewall rules? Actually PCAP cannot show firewall rules, but via portal config audit — if MAC-based only, Medium bypass via MAC spoof — evidence MAC visible open no encryption
5. Isolation? ap_isolate=0 disabled, clients can ping — check hostapd.conf ap_isolate — if 0, Low clients can ping each other — evidence two clients same open can ping — for simulated, config audit
6. Evidence: Frame numbers, BSSID, client, HTTP, etc. — beacon f1 open, assoc f2 open no EAPOL, DHCP f3-6 IP gateway DNS, DNS f7-8 example.com, HTTP redirect f9-10 302 to portal, login POST f12 credentials maybe HTTP weak vs HTTPS good, data after auth f13-15 HTTP sniffable if HTTP, MAC spoof bypass, isolation test ping
7. Defense recommendation? HTTPS for portal HSTS, strong session MAC+cookie+timeout, client isolation ap_isolate=1, WIDS rogue portal, OWE or WPA2-PSK for guest instead of open

**Filters:**

```
wlan.fc.type_subtype==0 && wlan_mgt.ssid==Guest-WLAN  # Open assoc req — client associates open
wlan.fc.type_subtype==1 && wlan_mgt.ssid==Guest-WLAN  # Open assoc resp
wlan.fc.type_subtype==8 && wlan_mgt.ssid==Guest-WLAN  # Beacons Guest-WLAN Open — check BSSID Ch6
http  # HTTP — check redirect 302, login POST over HTTP vs HTTPS
http contains "portal.guest.com"  # Portal redirect
http contains "password"  # Credential handling — if POST over HTTP, credentials sniffable — High
dns  # DNS — check DNS tunneling before auth?
tls  # TLS — check portal HTTPS
wlan.sa==11:22:33:44:55:66  # Client MAC — check MAC-based session bypass
```

**For PT:** Lab tasks — open, portal, HTTPS, session, isolation, evidence, defense — all with filters

### Config Audit — Portal Config, Hostapd Config, Firewall Rules

**Portal Config:**

- Is portal HTTPS? Check redirect and login form action — is it https://portal.guest.com/login or http? If http, High credential capture — recommend HTTPS HSTS valid cert
- Session type: MAC-based? Cookie? Timeout? — check firewall rules iptables ebtables nftables — is it MAC-based only? If MAC-based only, Medium bypass via MAC spoof — recommend MAC+cookie+IP+token timeout re-auth
- Client isolation: ap_isolate=1 in hostapd.conf? Check hostapd.conf — if 0, Low clients can attack each other — recommend 1
- Rate limiting: Portal rate limiting brute-force voucher? Check portal config — if no rate limiting, voucher guessable brute-force — Medium — recommend rate limiting, strong voucher 8+ random expiration

**Good hostapd.conf for Guest (Open with Portal, but with Isolation):**

```ini
interface=wlan0
ssid=Guest-WLAN
bssid=AA:BB:CC:DD:EE:FF
hw_mode=g
channel=6
wpa=0  # Open, but with portal — no WPA2
ap_isolate=1  # Client isolation enabled — good — clients cannot communicate directly
```

**Better: Use WPA2-PSK for Guest with Captive Portal + PSK, or OWE (Opportunistic Wireless Encryption) for Open with Encryption (WPA3 OWE):**

```ini
# Better: WPA2-PSK for guest with portal + PSK — still need portal? Actually WPA2-PSK with portal — PSK for guest, then portal for voucher? Or just WPA2-PSK without portal — PSK shared via voucher? For guest, WPA2-PSK with portal is better than open with portal — encryption for data
# interface=wlan0
# ssid=Guest-WLAN-PSK
# wpa=2
# wpa_key_mgmt=WPA-PSK
# rsn_pairwise=CCMP
# wpa_passphrase=GuestPass123!  # PSK for guest — shared via voucher? Actually guest PSK via voucher
# ap_isolate=1

# Best: OWE (Opportunistic Wireless Encryption) — open with encryption — WPA3 OWE — AKM 00-0F-AC-18 — no authentication, but encryption — prevents sniffing — better than pure open
# interface=wlan0
# ssid=Guest-WLAN-OWE
# wpa=2
# wpa_key_mgmt=OWE
# rsn_pairwise=CCMP
# ieee80211w=2  # PMF required for OWE? Actually OWE requires PMF? For WPA3 OWE, PMF required
# ap_isolate=1
```

**Firewall Rules (iptables) for Portal:**

```bash
# Before auth: Allow DHCP, DNS to portal, HTTP redirect to portal, block all other
# iptables -A FORWARD -i wlan0 -p udp --dport 67 --sport 68 -j ACCEPT  # DHCP
# iptables -A FORWARD -i wlan0 -p udp --dport 53 -j ACCEPT  # DNS — but allows DNS tunneling? Actually should only allow DNS to portal? For PT, DNS tunneling bypass if DNS allowed before auth
# iptables -A FORWARD -i wlan0 -p tcp --dport 80 -d portal.guest.com -j ACCEPT  # HTTP to portal
# iptables -A FORWARD -i wlan0 -p tcp --dport 443 -d portal.guest.com -j ACCEPT  # HTTPS to portal
# iptables -A FORWARD -i wlan0 -j DROP  # Block all other before auth

# After auth: Allow MAC
# iptables -A FORWARD -m mac --mac-source 11:22:33:44:55:66 -j ACCEPT  # MAC-based — weak — bypass via MAC spoof
# Better: Allow only if session valid (check cookie+token via portal? Actually firewall cannot check cookie, but portal can check cookie via HTTP? For PT, recommend portal checks cookie+token not just MAC)
```

**For PT:** Config audit — portal HTTPS, session type, client isolation, hostapd.conf, firewall rules, OWE vs open — good vs bad configs

### Defense — HTTPS, Strong Session, Isolation, OWE/WPA2-PSK, WIDS

- **HTTPS for Portal:** Login over HTTPS, HSTS — portal login form action https://portal.guest.com/login, POST over TLS, valid cert, HSTS header `Strict-Transport-Security: max-age=31536000; includeSubDomains` — prevents downgrade to HTTP — for PT, if portal HTTP, High finding — credential capture — recommend HTTPS HSTS valid cert
- **Strong Session:** MAC + IP + cookie + token, timeout 1h, re-auth after timeout, HttpOnly Secure SameSite cookies, etc. — not just MAC-based — MAC-based only Medium bypass via MAC spoof — recommend MAC+cookie+IP+token timeout re-auth
- **Client Isolation:** ap_isolate=1 — clients cannot communicate directly — AP isolates clients — for guest, should be 1 — for PT, if 0, Low finding — recommend 1
- **WIDS:** Detect rogue portal with same SSID — WIDS authorized AP list, detect rogue BSSID same SSID not in authorized list, alert — e.g., Kismet, Aruba WIDS, Cisco WIDS — for PT, WIDS detection
- **OWE or WPA2-PSK for Guest:** Instead of pure open, use OWE (open with encryption) or WPA2-PSK with portal — OWE provides encryption for open without authentication — better than pure open — for guest, OWE is better than pure open — for PT, if open without OWE, Low finding — recommend OWE — OWE AKM 00-0F-AC-18, DH key exchange, no auth, but encryption
- **Rate Limiting, Strong Auth for Portal:** Rate limiting brute-force voucher, strong voucher 8+ random alphanumeric, expiration, etc.

### Finding Templates

**Open Network No Encryption:**

```
Title: Open Wi-Fi Network — No Encryption (SSID Guest-WLAN)
Severity: Low (guest) / Medium (if sensitive data)
CVSS: 3.5 (AV:A/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N) — Adjacent, Low complexity, No privileges, No user interaction, Scope Unchanged, Confidentiality Low, Integrity None — Low for guest, Medium 5.5 if sensitive data
Description: SSID Guest-WLAN is open, no WPA2/WPA3, no encryption, no 4-way handshake, no EAPOL, traffic sniffable (unless HTTPS), captive portal present but data after auth not encrypted (if HTTP). Beacon frame 1 BSSID AA:BB:CC:DD:EE:FF SSID Guest-WLAN Open Ch6, association frame 2 client 11:22:33:44:55:66 open, no EAPOL, HTTP traffic after auth sniffable.
Evidence: Beacon f1 BSSID AA:BB:CC:DD:EE:FF SSID Guest-WLAN Open Ch6, association f2 SA 11:22:33:44:55:66 DA AA:BB:CC:DD:EE:FF BSSID AA:BB:CC:DD:EE:FF SSID Guest-WLAN open no EAPOL, HTTP GET http://example.com after auth sniffable, PCAP captive-portal.pcapng SHA256 abc123... Size 3.2 KB Frames 15 Tool Scapy Method scapy, filter wlan_mgt.ssid==Guest-WLAN, wlan.fc.type_subtype==0, http
Impact: Traffic sniffing, credential capture if HTTP, client attack if isolation disabled, compliance fail
Recommendation: Use WPA3 OWE for open with encryption AKM 00-0F-AC-18 DH key exchange no auth but encryption prevents sniffing, or WPA2-PSK for guest with portal + PSK, enable client isolation ap_isolate=1, HTTPS for portal HSTS valid cert, strong session management MAC+cookie+IP+token timeout re-auth, WIDS for rogue portal
Config Snippet Good OWE:
# interface=wlan0
# ssid=Guest-WLAN-OWE
# wpa=2
# wpa_key_mgmt=OWE
# rsn_pairwise=CCMP
# ieee80211w=2
# ap_isolate=1
Retest: Verify OWE or WPA2-PSK, isolation enabled ap_isolate=1, portal HTTPS HSTS, session not bypassable via MAC spoof, new PCAPs no open without OWE, new beacons OWE AKM 18 or WPA2-PSK, document new PCAP hash new config hash
References: IEEE 802.11, WPA3 OWE RFC 8110, OWASP, NIST, Wireshark
```

**Session Bypass via MAC Spoofing:**

```
Title: Captive Portal Session Bypass via MAC Spoofing (MAC-Based Session)
Severity: Medium
CVSS: 5.5 (AV:A/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N) — Adjacent, Low complexity, No privileges, No user interaction, Scope Unchanged, Confidentiality Low, Integrity Low — Medium
Description: Portal uses MAC-based session after auth, firewall allows MAC (e.g., iptables -A FORWARD -m mac --mac-source 11:22:33:44:55:66 -j ACCEPT). Attacker can sniff authenticated client MAC (open network no encryption, MAC visible in frames SA TA RA) via airodump-ng or Wireshark and spoof MAC via ifconfig/macchanger to bypass portal and get internet without login.
Evidence: PCAP shows client 11:22:33:44:55:66 auth via portal f? POST login, then firewall allows MAC 11:22:33:44:55:66, attacker sniffs MAC via airodump-ng, spoofs MAC via macchanger -m 11:22:33:44:55:66 wlan0, associates open Guest-WLAN, gets IP via DHCP, curl http://example.com gets internet without portal login — bypass — free internet. PCAP captive-portal.pcapng f? client auth, f? attacker spoof MAC and get internet, filter wlan.sa==11:22:33:44:55:66, http
Impact: Free internet, bypass auth, network access without auth, compliance fail
Recommendation: Use MAC+cookie+IP+token timeout re-auth HttpOnly Secure SameSite cookies, not just MAC-based, client isolation ap_isolate=1, HTTPS for portal HSTS, WIDS for rogue portal, OWE or WPA2-PSK for guest
Config Snippet Good Session (Not Just MAC):
# Portal should use MAC+cookie+IP+token, timeout 1h, re-auth, HttpOnly Secure SameSite
# Example: After auth, set cookie session=abc123 HttpOnly Secure SameSite=Strict, store session in DB with MAC+IP+cookie+token+timeout, firewall allows only if session valid (check cookie+token not just MAC)
# iptables should check not just MAC but also cookie? Actually firewall cannot check cookie, but portal can check cookie via HTTP? For PT, recommend portal checks cookie+token not just MAC
Retest: Verify MAC spoof fails, session requires cookie+token not just MAC, attacker spoofs MAC 11:22:33:44:55:66 but without valid cookie+token cannot get internet, portal requires cookie+token, document new PCAPs MAC spoof fails
References: OWASP Session Management, NIST, Wireshark, hostapd, iptables
```

### Attack → Defense → Retest

- **Attack:** Recon open SSID Guest-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 Open no WPA2 no encryption no 4-way handshake — beacon f1 open — assoc open f2 client 11:22:33:44:55:66 no EAPOL — DHCP f3-6 IP 192.168.1.100 gateway 192.168.1.1 DNS 8.8.8.8 — DNS query f7 example.com → f8 response 93.184.216.34 — HTTP GET http://example.com f9 → 302 redirect to https://portal.guest.com/login f10 portal present — HTTP GET https://portal.guest.com/login f11 portal login page form action https://portal.guest.com/login POST — login POST f12 username=guest&password=guest123 over HTTP weak vs HTTPS good — credential handling login over HTTP not HTTPS sniffable High — after auth data f13-15 HTTP GET http://example.com after auth data sniffable if HTTP Low/Medium — session MAC-based firewall allows MAC after auth attacker can sniff authenticated client MAC via airodump-ng Wireshark and spoof MAC via ifconfig macchanger to bypass portal get internet free internet Medium — client isolation ap_isolate=0 disabled clients can ping each other ARP spoof Low — portal cloning Evil Twin same SSID Guest-WLAN Open clones portal to capture credentials High if portal HTTP — DNS tunneling if portal allows DNS before auth tunnel data via DNS iodine dnscat2 bypass Medium
- **Defense:** HTTPS for portal HSTS valid cert login over HTTPS POST over TLS valid cert HSTS header Strict-Transport-Security max-age=31536000 includeSubDomains prevents downgrade to HTTP — if portal HTTP High credential capture recommend HTTPS HSTS valid cert, strong session MAC+IP+cookie+token timeout 1h re-auth HttpOnly Secure SameSite not just MAC-based — MAC-based only Medium bypass via MAC spoof recommend MAC+cookie+IP+token timeout re-auth, client isolation ap_isolate=1 clients cannot communicate directly AP isolates clients for guest should be 1 if 0 Low recommend 1, WIDS detect rogue portal same SSID WIDS authorized AP list detect rogue BSSID same SSID not in authorized list alert Kismet Aruba Cisco WIDS, OWE AKM 18 open with encryption DH key exchange no auth but encryption prevents sniffing better than pure open or WPA2-PSK for guest with portal + PSK — OWE better than pure open — for guest OWE is better than pure open — for PT if open without OWE Low recommend OWE, rate limiting strong auth for portal voucher 8+ random alphanumeric expiration
- **Retest:** Verify HTTPS portal HTTPS HSTS valid cert login POST over TLS, session not bypassable via MAC spoof MAC spoof fails session requires cookie+token not just MAC attacker spoofs MAC but without valid cookie+token cannot get internet portal requires cookie+token, isolation enabled ap_isolate=1 two clients cannot ping, OWE or WPA2-PSK new beacons OWE AKM 18 or WPA2-PSK, new PCAPs portal HTTPS MAC spoof fails isolation enabled no open without OWE, document new PCAP hash new config hash

### Interactive Check

> You have captive-portal.pcapng 15 frames: open SSID Guest-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 Open no WPA2 no encryption no 4-way handshake no EAPOL, client 11:22:33:44:55:66 associates open f2 no EAPOL, DHCP f3-6 IP 192.168.1.100 gateway 192.168.1.1 DNS 8.8.8.8, DNS query f7 example.com → f8 response 93.184.216.34, HTTP GET http://example.com f9 → 302 redirect to https://portal.guest.com/login f10 portal present, HTTP GET https://portal.guest.com/login f11 portal login page form action https://portal.guest.com/login POST, login POST f12 username=guest&password=guest123 over HTTP weak vs HTTPS good, after auth data f13-15 HTTP GET http://example.com after auth data sniffable if HTTP. What is testing methodology, weaknesses, evidence, defense?

Answer: Testing methodology 10 steps VAPT recon find open SSID Guest-WLAN check portal HTTP redirect via airodump-ng iw connect dhclient curl -v http://example.com 302 redirect to portal, enum portal type username password voucher email SMS social OAuth accept terms HTTPS? Check redirect and login form action is it https://portal.guest.com/login or http if http High credential capture if https good valid cert HSTS, session type MAC-based cookie timeout firewall iptables allow MAC after auth MAC-based only Medium bypass via MAC spoof, client isolation ap_isolate=1 check hostapd.conf if 0 Low clients can ping each other test via two clients same open ping, test auth weak creds admin/admin guest/guest voucher 1234 4 digits guessable Medium recommend strong voucher 8+ random rate limiting expiration SQLi ' OR '1'='1 XSS <script>alert(1)</script> if authorized lab High, test session after auth spoof MAC of authenticated client see if internet bypass via ifconfig down macchanger -m 11:22:33:44:55:66 up iw connect dhclient curl if gets internet without portal login bypass via MAC spoof Medium free internet, cookie flags HttpOnly Secure SameSite if not HttpOnly Secure Low recommend HttpOnly Secure SameSite, timeout no timeout long session no re-auth Low recommend timeout 1h re-auth, test isolation two clients same open can they ping each other ARP spoof via ping arpspoof if succeeds isolation disabled ap_isolate=0 Low recommend ap_isolate=1, test cloning Evil Twin same SSID Guest-WLAN Open clones portal page to capture credentials simulated rogue beacon same SSID different BSSID portal clone credential capture High if portal HTTP no cert validation, evidence PCAP open association HTTP redirect login MAC spoof isolation PCAP hash filter config hash hostapd.conf ap_isolate portal config HTTPS session type, impact credential capture session hijack client attack free internet traffic sniffing open no encryption Low/Medium credential handling login over HTTP High session management MAC-based spoof bypass Medium free internet client isolation disabled Low client attack rogue portal cloning High DNS tunneling bypass Medium, recommendation HTTPS for portal HSTS valid cert strong session MAC+cookie+IP+token timeout re-auth HttpOnly Secure SameSite client isolation ap_isolate=1 WIDS rogue portal OWE AKM 18 open with encryption DH key exchange no auth but encryption prevents sniffing better than pure open or WPA2-PSK for guest with portal + PSK rate limiting strong auth voucher 8+ random expiration no open without OWE no WEP no TKIP no WPS, retest HTTPS portal HTTPS HSTS valid cert login POST over TLS session not bypassable via MAC spoof MAC spoof fails session requires cookie+token not just MAC attacker spoofs MAC but without valid cookie+token cannot get internet portal requires cookie+token isolation enabled ap_isolate=1 two clients cannot ping OWE or WPA2-PSK new beacons OWE AKM 18 or WPA2-PSK new PCAPs portal HTTPS MAC spoof fails isolation enabled no open without OWE document new PCAP hash new config hash. PCAP captive-portal.pcapng 15 frames open SSID Guest-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 Open no WPA2 no encryption no 4-way handshake no EAPOL beacon f1 open assoc f2 open no EAPOL client 11:22:33:44:55:66, DHCP f3-6 IP 192.168.1.100 gateway 192.168.1.1 DNS 8.8.8.8, DNS query f7 example.com → f8 response 93.184.216.34, HTTP GET http://example.com f9 → 302 redirect to https://portal.guest.com/login f10 portal present, HTTP GET https://portal.guest.com/login f11 portal login page form action https://portal.guest.com/login POST, login POST f12 username=guest&password=guest123 over HTTP weak vs HTTPS good credential handling, after auth data f13-15 HTTP GET http://example.com after auth data sniffable if HTTP open no encryption. Filters wlan.fc.type_subtype==0 && wlan_mgt.ssid==Guest-WLAN open assoc, wlan.fc.type_subtype==8 && wlan_mgt.ssid==Guest-WLAN beacons open, http contains portal.guest.com portal redirect, http contains password credential handling if POST over HTTP credentials sniffable High, dns DNS tunneling before auth, tls portal HTTPS, wlan.sa==11:22:33:44:55:66 client MAC MAC-based session bypass.

## References

- IEEE 802.11, WPA3 OWE RFC 8110, OWASP Session Management, NIST
- Kismet, airodump-ng, hostapd, dnsmasq, iptables, nginx, Wireshark, PcapInspector, ReconMap, DeauthVisualizer, HandshakeDiagram, RogueVisualizer
- MITRE ATT&CK — Captive Portal, Credential Access, Network Sniffing, Session Hijacking

---

*Next: Captive Portal Visualizer — Timeline open assoc, DHCP, DNS, HTTP redirect, login, data, MAC spoof, isolation, retest*

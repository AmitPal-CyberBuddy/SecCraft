# Captive Portals — Architecture & Weaknesses Professional

## Learning Objectives
- Master captive portal architecture: open Wi-Fi no WPA2/WPA3 no encryption no 4-way handshake, client associates open gets IP via DHCP HTTP redirect to portal login voucher email SMS social then internet via firewall rule MAC-based session
- Understand auth flow: client associates to open SSID Guest-WLAN, DHCP IP gateway DNS, HTTP GET http://example.com → 302 redirect to https://portal.guest.com/login, login username/password voucher email SMS social, portal validates creates session MAC-based or cookie+token, allows internet via firewall iptables allow MAC/IP, session management MAC IP cookie token timeout re-auth
- Learn common weaknesses: open network no encryption traffic sniffable unless HTTPS, credential handling login over HTTP not HTTPS sniffable weak password policy no rate limiting no 2FA voucher guessable short, session management MAC-based spoof bypass since open no encryption MAC visible sniffable firewall allows MAC after auth attacker spoofs MAC of authenticated client gets internet, cookie not HttpOnly Secure XSS sniffing, no timeout long session no re-auth, client isolation disabled ap_isolate=0 clients can ARP spoof sniff attack each other, rogue portal Evil Twin same SSID Guest-WLAN Open clones portal to capture credentials, DNS tunneling if portal allows DNS before auth tunnel data via DNS
- Build VAPT methodology: recon open SSID Guest-WLAN check captive portal HTTP redirect, enum portal login type HTTPS session type client isolation, test auth weak credentials SQLi XSS if authorized, test session MAC spoof bypass after auth spoof MAC of authenticated client see if internet bypass, test isolation two clients same open can they ping each other ARP spoof, test portal cloning clone portal page credential capture simulated, evidence PCAP open association HTTP redirect login over HTTP vs HTTPS MAC spoof data, impact credential capture session hijack client attack free internet, recommendation HTTPS for portal HSTS strong auth MAC+cookie+timeout client isolation ap_isolate=1 WIDS rogue portal OWE or WPA2-PSK for guest instead of open, retest HTTPS session not bypassable via MAC spoof isolation enabled
- Understand PCAP captive-portal.pcapng simulated: open SSID Guest-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6, client 11:22:33:44:55:66 associates open no 4-way, DHCP DNS HTTP GET http://example.com → 302 redirect to https://portal.guest.com/login, login POST credentials maybe HTTP weak, after auth data traffic, filters wlan.fc.type_subtype==0 && wlan_mgt.ssid==Guest-WLAN http dns
- Learn config audit: portal config HTTPS session type MAC-based cookie timeout, client isolation ap_isolate=1 in hostapd.conf, good hostapd.conf guest ssid=Guest-WLAN wpa=0 ap_isolate=1, better WPA2-PSK for guest with captive portal + PSK or OWE Opportunistic Wireless Encryption WPA3 OWE open with encryption

## Theory

### What is Captive Portal? — Open Wi-Fi No WPA2 with Web Portal for Authentication

**Captive portal is open Wi-Fi (no WPA2/WPA3, no encryption, no 4-way handshake) with web portal for authentication — client connects to open SSID, gets IP via DHCP, HTTP requests redirected to portal, login, then internet access — common in hotels, airports, guest networks, corporate guest — open + portal — no encryption for data unless HTTPS — traffic sniffable — session management MAC-based weak — client isolation should be enabled — rogue portal Evil Twin same SSID Open clones portal to capture credentials.**

**Flow:**

```
1. Client associates to open SSID Guest-WLAN (no encryption, no 4-way handshake, no EAPOL, just assoc req open capabilities, assoc resp status0)
2. DHCP: Gets IP 192.168.1.100, gateway 192.168.1.1, DNS 8.8.8.8, lease 12h — via DHCP Discover Offer Request Ack
3. HTTP request to http://example.com (or http://connectivitycheck.gstatic.com/generate_204) → redirected to https://portal.guest.com/login via HTTP 302 Found Location: https://portal.guest.com/login or via DNS hijack or via iptables REDIRECT to portal
4. Login: Username/password, voucher code, email, SMS OTP, social OAuth, accept terms, etc. — portal form POST to https://portal.guest.com/login with username password voucher email etc.
5. Portal validates (e.g., check voucher DB, check user DB, check SMS OTP, etc.), creates session (MAC-based or cookie+token), allows internet via firewall rule (e.g., iptables -A FORWARD -m mac --mac-source 11:22:33:44:55:66 -j ACCEPT or ebtables or nftables)
6. Session management: MAC, IP, cookie, token, timeout 1h, re-auth after timeout, etc. — firewall allows MAC/IP after auth
7. Client gets internet access — HTTP/HTTPS after auth — but data after auth still open no encryption unless HTTPS — traffic sniffable if HTTP
```

**Architecture:**

```
Client (STA 11:22:33:44:55:66) → AP (Open SSID Guest-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 wpa=0 ap_isolate=1) → Gateway (captive portal + DHCP + DNS + firewall iptables) → Internet
               |
               Portal web server (login https://portal.guest.com/login, nginx + portal app, voucher DB, user DB, SMS gateway, etc.)
               |
               RADIUS? For Enterprise guest? Actually captive portal may use RADIUS for auth? For PT, captive portal may use RADIUS for guest auth — but open + portal — no 802.1X
```

**For PT:** Captive portal architecture — open Wi-Fi no encryption, portal for auth, session MAC-based, firewall allows MAC after auth, client isolation should be enabled, HTTPS for portal, strong session, WIDS rogue portal, OWE or WPA2-PSK for guest instead of open if possible

### Security Implications of Open + Portal — No Encryption, Credential Handling, Session Management, Client Isolation, Rogue Portal

**Security Implications:**

- **No Encryption:** Open Wi-Fi means no data encryption (no TK, no CCMP, no TKIP), traffic sniffable (unless HTTPS) — e.g., client HTTP GET http://example.com after auth sniffable — if portal login over HTTP not HTTPS, credentials sniffable — even if portal HTTPS, data after auth may be HTTP sniffable — for PT, open SSID with captive portal but no encryption for data = Low (guest) / Medium (if sensitive data) — recommend OWE or WPA2-PSK for guest instead of pure open — OWE provides encryption for open without authentication — better than pure open
- **Credential Handling:** Portal may handle credentials over HTTP? Should be HTTPS, but sometimes HTTP — e.g., portal login form action http://portal.guest.com/login not https — credentials POST over HTTP sniffable — weak — for PT, check if portal login over HTTP — if HTTP, High finding — credential capture — recommend HTTPS HSTS
- **Session Management:** MAC-based session can be spoofed (attacker spoofs MAC of authenticated client, gets internet) — because open network no encryption, MAC visible in frames, attacker can sniff authenticated client MAC via airodump-ng or Wireshark, then spoof MAC via `ifconfig wlan0 hw ether 11:22:33:44:55:66` or `macchanger`, and get internet without portal login — bypass auth — free internet — for PT, MAC-based session bypass via MAC spoof = Medium finding — recommend MAC+cookie+IP+token timeout re-auth
- **Client Isolation:** If disabled ap_isolate=0, clients can attack each other on same open network — e.g., ARP spoof, sniff, attack — for guest, client isolation should be enabled ap_isolate=1 — for PT, check hostapd.conf ap_isolate — if 0, Low finding — recommend 1
- **Rogue Portal:** Attacker can clone portal to capture credentials (Evil Twin + captive portal) — e.g., attacker creates Evil Twin SSID Guest-WLAN Open same SSID same BSSID? Actually different BSSID, same SSID, Open, clones portal page https://portal.guest.com/login to http://evil.com/login? Actually clones portal page to capture credentials — client connects to rogue Open and sees cloned portal, enters credentials, attacker captures — for PT, rogue portal detection via WIDS same SSID not in authorized list, BSSID, channel, vendor, signal, etc., and portal cert validation — portal should be HTTPS with valid cert, HSTS, etc.
- **DNS Tunneling:** If portal allows DNS before auth (e.g., firewall allows DNS UDP 53 before auth for portal to work), attacker can tunnel data via DNS — e.g., `iodine`, `dnscat2` — tunnel IP over DNS — bypass portal — for PT, check if DNS allowed before auth — if yes, potential DNS tunneling — Medium? Actually DNS tunneling is common bypass — recommend firewall block DNS before auth? Actually portal needs DNS for portal to work? But should only allow DNS to portal? For PT, check DNS tunneling

**For PT:** Security implications of open + portal — no encryption, credential handling, session management, client isolation, rogue portal, DNS tunneling — all should be tested — evidence PCAP, config, etc.

### Common Weaknesses — Detailed

**1. Open Network, No Encryption:**

- Traffic sniffable, even if portal HTTPS, data after auth may be HTTP — e.g., client HTTP GET http://example.com after auth sniffable via Wireshark — if sensitive data, High? Actually open guest Low if guest, Medium if sensitive data — for corporate guest, Medium? For PT, open SSID with captive portal but no encryption for data = Low (guest) / Medium (if sensitive data) — recommendation OWE or WPA2-PSK for guest instead of pure open
- **OWE (Opportunistic Wireless Encryption, WPA3 OWE, RFC 8110):** Open with encryption — AKM 00-0F-AC-18, DH key exchange, no authentication, but encryption — prevents sniffing — better than pure open — for guest, OWE is better than pure open — for PT, if open without OWE, Low finding — recommend OWE
- **Evidence:** Beacon frame 1 BSSID AA:BB:CC:DD:EE:FF SSID Guest-WLAN Open Ch6, association frame 2 client 11:22:33:44:55:66 open, no EAPOL, HTTP traffic after auth — filter `wlan_mgt.ssid==Guest-WLAN && wlan.fc.type_subtype==8` beacon open, `wlan.fc.type_subtype==0` assoc req open

**2. Credential Handling:**

- Portal login over HTTP (not HTTPS) → credentials sniffable — e.g., portal login form action http://portal.guest.com/login, POST username=admin&password=password123 over HTTP — sniffable via Wireshark `http contains password` — High finding — credential capture
- Weak password policy, no rate limiting, no 2FA — e.g., portal allows weak password `password`, no rate limiting brute-force, no 2FA — for PT, test weak credentials, SQLi, XSS if authorized — but for guest portal, weak password policy may be Low? Actually for guest portal with voucher, voucher guessable short — e.g., voucher 4 digits 1234 guessable — Medium — recommend strong voucher 8+ random, rate limiting, etc.
- Voucher codes guessable, short — e.g., voucher 1234 4 digits, 0000-9999 10000 combos, brute-force via portal — Medium — recommend strong voucher 8+ alphanumeric random, rate limiting, expiration, etc.

**3. Session Management:**

- MAC-based: After auth, firewall allows MAC — e.g., iptables `-A FORWARD -m mac --mac-source 11:22:33:44:55:66 -j ACCEPT` — attacker can sniff authenticated client MAC (open network no encryption, MAC visible in frames SA TA RA), and spoof MAC via `ifconfig wlan0 hw ether 11:22:33:44:55:66` or `macchanger -m 11:22:33:44:55:66 wlan0`, then get internet without portal login — bypass portal — free internet — for PT, MAC-based session bypass via MAC spoof = Medium finding — evidence PCAP shows client 11:22:33:44:55:66 auth, then attacker spoofs MAC 11:22:33:44:55:66 and gets internet without portal login, firewall rule based on MAC — recommend MAC+cookie+IP+token timeout re-auth
- Cookie-based: If cookie not HttpOnly, Secure, SameSite, etc., XSS or sniffing — e.g., portal sets cookie `session=abc123` without HttpOnly Secure — XSS via portal field? Actually portal may have XSS in voucher field? For PT, check cookie flags — if not HttpOnly Secure, Low? Recommend HttpOnly Secure SameSite
- No timeout, long session, no re-auth — e.g., session timeout 24h long, no re-auth — for PT, recommend timeout 1h, re-auth after timeout, etc.

**4. Client Isolation:**

- If disabled ap_isolate=0, clients can ARP spoof, sniff, attack each other on same open network — e.g., client 11:22:33:44:55:66 and client 22:33:44:55:66:77 on same open Guest-WLAN, ap_isolate=0, they can ping each other, ARP spoof, sniff — for guest, client isolation should be enabled ap_isolate=1 — for PT, check hostapd.conf ap_isolate — if 0, Low finding — recommend 1 — evidence two clients same open can ping each other
- **hostapd.conf:** `ap_isolate=1` enables client isolation — clients cannot communicate directly — AP isolates clients — for guest, should be 1 — for corporate, may be 0? Actually for corporate, isolation may be 0 for printer etc., but for guest, 1

**5. Portal Cloning — Evil Twin + Captive Portal:**

- Attacker Evil Twin with same SSID Guest-WLAN Open, clones portal page to capture credentials — e.g., attacker creates hostapd open SSID Guest-WLAN BSSID 11:22:33:44:55:66 Ch11, dnsmasq DHCP, nginx portal clone https://portal.guest.com/login clone to http://evil.com/login, client connects to rogue Open and sees cloned portal, enters credentials, attacker captures — for PT, rogue portal detection via WIDS same SSID not in authorized list, BSSID, channel, vendor, signal, etc., and portal cert validation — portal should be HTTPS with valid cert, HSTS, etc. — if portal HTTP, rogue can clone easily — recommend HTTPS HSTS valid cert
- **Detection:** Check BSSID, cert validation for portal — portal HTTPS with valid cert HSTS — client should validate portal cert — if portal HTTP, no cert validation, rogue can clone — for PT, if portal HTTP, High finding — credential capture

**6. DNS Tunneling — If Portal Allows DNS Before Auth, Attacker Can Tunnel Data via DNS:**

- If portal allows DNS before auth (e.g., firewall allows DNS UDP 53 before auth for portal to work — e.g., iptables `-A FORWARD -p udp --dport 53 -j ACCEPT` before auth), attacker can tunnel data via DNS — e.g., `iodine`, `dnscat2` — tunnel IP over DNS queries — bypass portal — free internet via DNS tunnel — for PT, check if DNS allowed before auth — if yes, potential DNS tunneling — Medium? Actually DNS tunneling is common bypass — recommend firewall block DNS before auth? Actually portal needs DNS for portal to work? But should only allow DNS to portal? For PT, check DNS tunneling — evidence DNS queries before auth, etc.
- **Tools:** `iodine`, `dnscat2`, `dns2tcp`, etc. — for PT, if authorized lab, test DNS tunneling — but for this academy simulated, just theory

### Testing Methodology (Authorized Lab Only, Zero-Cost Simulated + Hardware Future)

**Lab SSID:** LAB-GUEST-OPEN with captive portal simulation (Docker nginx + portal + hostapd open, lab-only, ALFA adapter, explicit ROE, own lab)

**Steps (VAPT Methodology):**

1. **Recon:** Find open SSID Guest-WLAN, check if captive portal (HTTP redirect) — e.g., `airodump-ng wlan0mon` shows ESSID Guest-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 Open, no ENC? Actually `airodump-ng` shows ENC OPN, no CIPHER, no AUTH — open — then associate open via `iw dev wlan0 connect Guest-WLAN`, get IP via `dhclient wlan0`, then `curl -v http://example.com` — 302 redirect to https://portal.guest.com/login — captive portal present — evidence beacon open, assoc open, HTTP redirect 302
2. **Enum:** What portal? Login type? HTTPS? Session type? Client isolation? — e.g., portal login type username/password, voucher, email, SMS, social, etc., HTTPS? Check redirect and login form action — is it HTTPS? Session type MAC-based? Cookie? Timeout? Client isolation ap_isolate=1? Check via two clients same open can they ping each other? If can ping, isolation disabled
3. **Test Auth:** Try weak credentials, SQLi, XSS in portal fields (if authorized) — e.g., portal login POST username=admin&password=password123 — try weak credentials admin/admin, guest/guest, etc., try SQLi `' OR '1'='1`, XSS `<script>alert(1)</script>` in voucher field — if authorized, test — evidence POST, response, etc. — but for guest portal, SQLi XSS may be Low? Actually if portal has SQLi, High — credential bypass, etc.
4. **Test Session:** After auth, spoof MAC of authenticated client, see if internet bypass — e.g., client 11:22:33:44:55:66 auth via portal, gets internet, attacker sniffs MAC 11:22:33:44:55:66 via `airodump-ng` or Wireshark, then `ifconfig wlan0 down && macchanger -m 11:22:33:44:55:66 wlan0 && ifconfig wlan0 up`, then `iw dev wlan0 connect Guest-WLAN`, `dhclient wlan0`, then `curl http://example.com` — if gets internet without portal login, bypass via MAC spoof — Medium finding — evidence PCAP shows client auth, then attacker spoofs MAC and gets internet without portal login
5. **Test Isolation:** Two clients on same open, can they ping each other? ARP spoof? — e.g., client1 11:22:33:44:55:66 IP 192.168.1.100 and client2 22:33:44:55:66:77 IP 192.168.1.101 on same open Guest-WLAN, `ping 192.168.1.101` from client1 — if succeeds, isolation disabled ap_isolate=0 — Low finding — recommend ap_isolate=1 — evidence ping, ARP, etc.
6. **Test Portal Cloning:** Clone portal page, see if credential capture possible (simulated) — e.g., attacker creates Evil Twin SSID Guest-WLAN Open BSSID 11:22:33:44:55:66 Ch11, clones portal page https://portal.guest.com/login to local nginx, client connects to rogue Open and sees cloned portal, enters credentials, attacker captures — for PT, simulated only — evidence rogue beacon same SSID different BSSID, portal clone, credential capture
7. **Evidence:** PCAP showing open association, HTTP redirect, login over HTTP vs HTTPS, MAC spoof, etc. — e.g., captive-portal.pcapng open association, HTTP redirect 302, login POST over HTTP weak vs HTTPS good, MAC spoof, isolation test, etc. — PCAP hash, filter, config hash, etc.
8. **Impact:** Credential capture, session hijack, client attack, free internet — e.g., open no encryption traffic sniffing, credential handling login over HTTP credential capture High, session management MAC-based spoof bypass Medium free internet, client isolation disabled Low client attack, rogue portal cloning credential capture High, DNS tunneling bypass Medium
9. **Recommendation:** HTTPS for portal HSTS strong auth MAC+cookie+timeout session client isolation enabled ap_isolate=1 WIDS for rogue portal OWE or WPA2-PSK for guest instead of open if possible — e.g., use WPA3 OWE for open with encryption or WPA2-PSK for guest with portal + PSK — OWE better than pure open — for PT, recommend HTTPS, strong session, isolation, WIDS, OWE, etc.
10. **Retest:** Verify HTTPS, session not bypassable via MAC spoof, isolation enabled — e.g., new PCAPs portal HTTPS, MAC spoof fails (session requires cookie+token not just MAC), isolation enabled (two clients cannot ping), etc.

**For PT:** Testing methodology — recon, enum, test auth, test session, test isolation, test portal cloning, evidence, impact, recommendation, retest — all with authorized lab, explicit ROE, own lab, LAB-GUEST-OPEN, not production

### PCAP — captive-portal.pcapng (Simulated, 15 Frames, Scapy-Generated)

- Open SSID Guest-WLAN, BSSID AA:BB:CC:DD:EE:FF, Ch6, Open, no WPA2, no encryption, no 4-way handshake, no EAPOL
- Client 11:22:33:44:55:66 associates open (assoc req open capabilities, assoc resp status0 AID1)
- DHCP Discover Offer Request Ack — client gets IP 192.168.1.100, gateway 192.168.1.1, DNS 8.8.8.8
- DNS query for example.com → DNS response 93.184.216.34
- HTTP GET http://example.com → 302 redirect to https://portal.guest.com/login — captive portal present
- HTTP GET https://portal.guest.com/login — portal login page — form action https://portal.guest.com/login POST
- Login POST with credentials username=guest&password=guest123 — over HTTPS? Actually for weak example, over HTTP? For this module, maybe over HTTP weak vs HTTPS good — for PT, check if POST over HTTP or HTTPS — filter `http contains password` vs `tls`
- After auth, firewall allows MAC 11:22:33:44:55:66 — client gets internet — HTTP GET http://example.com after auth — data traffic — but data after auth still open no encryption unless HTTPS — traffic sniffable if HTTP
- For MAC spoof bypass: Attacker sniffs MAC 11:22:33:44:55:66, spoofs MAC, gets internet without portal login — evidence

**Filters:**

```
wlan.fc.type_subtype==0 && wlan_mgt.ssid==Guest-WLAN  # Open assoc req — client associates open
wlan.fc.type_subtype==1 && wlan_mgt.ssid==Guest-WLAN  # Open assoc resp
wlan.fc.type_subtype==8 && wlan_mgt.ssid==Guest-WLAN  # Beacons Guest-WLAN Open — check BSSID Ch6
http  # HTTP — check redirect 302, login POST over HTTP vs HTTPS
http contains "portal.guest.com"  # Portal redirect
dns  # DNS — check DNS tunneling before auth?
tls  # TLS — check portal HTTPS
```

**For PT:** PCAP captive-portal.pcapng — open association, HTTP redirect, login, data — evidence open no encryption, portal present, HTTPS? Session type? Isolation? etc.

### Config Audit — Portal Config, Hostapd Config

**Portal Config:**

- Is portal HTTPS? Check redirect and login form action — is it https://portal.guest.com/login or http? If http, High — credential capture
- Session type: MAC-based? Cookie? Timeout? — check firewall rules iptables ebtables nftables — is it MAC-based only? If MAC-based only, Medium — bypass via MAC spoof — recommend MAC+cookie+IP+token timeout re-auth
- Client isolation: `ap_isolate=1` in hostapd.conf? Check hostapd.conf — if 0, Low — clients can attack each other — recommend 1

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

**For PT:** Config audit — portal HTTPS, session type, client isolation, hostapd.conf, OWE vs open — good vs bad configs

### Defense — HTTPS for Portal HSTS, Strong Session MAC+Cookie+Timeout, Client Isolation ap_isolate=1, WIDS Rogue Portal, OWE or WPA2-PSK for Guest

- **HTTPS for Portal:** Login over HTTPS, HSTS (HTTP Strict Transport Security) — portal login form action https://portal.guest.com/login, POST over TLS, valid cert, HSTS header `Strict-Transport-Security: max-age=31536000; includeSubDomains` — prevents downgrade to HTTP — for PT, if portal HTTP, High finding — credential capture — recommend HTTPS HSTS valid cert
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

### Lab — Simulated (Zero-Cost) + Hardware (Future, RF_REQUIRED)

**Simulated (this module, zero-cost):**
- **PCAP:** `captive-portal.pcapng` (15 frames, Scapy-generated) — open SSID Guest-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 Open no WPA2 no encryption no 4-way handshake no EAPOL, client 11:22:33:44:55:66 associates open f2, DHCP f3-6 Discover Offer Request Ack IP 192.168.1.100 gateway 192.168.1.1 DNS 8.8.8.8, DNS query f7 example.com → f8 response 93.184.216.34, HTTP GET http://example.com f9 → 302 redirect to https://portal.guest.com/login f10, HTTP GET https://portal.guest.com/login f11 portal login page form action https://portal.guest.com/login POST, login POST f12 username=guest&password=guest123 over HTTPS? Actually for weak example over HTTP? For this module maybe over HTTP weak vs HTTPS good, after auth data traffic f13-15 HTTP GET http://example.com after auth data sniffable if HTTP
- **Tasks:**
  1. Is it open? Yes, SSID Guest-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 Open no WPA2 no encryption no 4-way handshake — beacon f1 open — filter `wlan_mgt.ssid==Guest-WLAN && wlan.fc.type_subtype==8` — open
  2. Is there portal? Yes, HTTP GET http://example.com → 302 redirect to https://portal.guest.com/login — captive portal present — filter `http contains portal.guest.com` or `http contains 302`
  3. HTTPS? Check redirect and login form action — is it https://portal.guest.com/login or http? If http, High credential capture — if https, good — filter `http` vs `tls`
  4. Session type? MAC-based? Cookie? Timeout? — check firewall rules? Actually PCAP cannot show firewall rules, but via portal config audit — if MAC-based only, Medium bypass via MAC spoof — evidence MAC visible open no encryption
  5. Client isolation? Check hostapd.conf ap_isolate=0 vs 1 — if 0, Low clients can ping each other — evidence two clients same open can ping — for simulated, config audit
  6. Evidence? Beacon f1 open, assoc f2 open no EAPOL, DHCP f3-6, DNS f7-8, HTTP redirect f9-10 302 to portal, login POST f12 credentials maybe HTTP weak vs HTTPS good, data after auth f13-15 HTTP sniffable if HTTP
  7. Defense recommendation? HTTPS for portal HSTS, strong session MAC+cookie+timeout, client isolation ap_isolate=1, WIDS rogue portal, OWE or WPA2-PSK for guest instead of open

**Config Audit:**
- Portal config: HTTPS? Session type MAC-based? Cookie? Timeout? Client isolation ap_isolate=1? Check hostapd.conf
- Good hostapd.conf guest: ssid=Guest-WLAN wpa=0 ap_isolate=1 — client isolation enabled — good
- Better: WPA2-PSK for guest with portal + PSK or OWE OWE AKM 18 open with encryption — better than pure open — for PT, if open without OWE, Low finding — recommend OWE

**Hardware (Future, RF_REQUIRED, requires ALFA adapter, explicit ROE, own lab):**
- Real captive portal with Docker nginx + portal + hostapd open, lab-only SSID LAB-GUEST-OPEN, ALFA adapter, monitor mode, AP mode, 2 adapters? Actually one for AP open, one for internet? Or one adapter for AP open and internet via Ethernet? For PT, lab-only SSID LAB-GUEST-OPEN, own infrastructure, ALFA adapter
- Requires monitor mode, AP mode, 2 radios? Actually for captive portal, one AP open for clients, and gateway for internet — e.g., wlan0 AP open, eth0 internet, hostapd + dnsmasq DHCP + nginx portal + iptables NAT + firewall rules MAC-based? Actually for portal, need portal web server nginx + portal app, DHCP dnsmasq, DNS, firewall iptables, etc.
- Safety: Lab-only, never use real corporate SSID, only LAB-*, e.g., LAB-GUEST-OPEN, not Guest-WLAN — only own lab — explicit ROE — own infrastructure — own devices — isolated — no production — no corporate — lab-only
- Example: `hostapd` config open SSID LAB-GUEST-OPEN BSSID AA:BB:CC:DD:EE:FF Ch6 wpa=0 ap_isolate=1, `dnsmasq` DHCP, `nginx` portal, `iptables` firewall MAC-based? Actually for portal, firewall allows MAC after auth
- For this academy: Simulated only for browser — hardware marked with prep docs — zero-cost simulated philosophy kept but mark hardware labs requiring RF adapter with prep docs — this module simulated captive-portal.pcapng 15 frames, hardware future with ALFA adapter and explicit ROE

### VAPT Relevance — Enumeration, Evidence, Impact, Recommendation, Retest

- **Enumeration:** Find open SSID Guest-WLAN, check if captive portal HTTP redirect, enum portal login type HTTPS session type client isolation — filter `wlan_mgt.ssid==Guest-WLAN`, `wlan.fc.type_subtype==8`, `http`, `dns`
- **Evidence:** Beacon open, association open no EAPOL, DHCP, DNS, HTTP redirect 302 to portal, login POST over HTTP vs HTTPS, data after auth HTTP sniffable if HTTP, MAC spoof bypass, isolation test, PCAP hash, filter, config hash, hostapd.conf ap_isolate, portal config HTTPS, etc.
- **Impact:** Traffic sniffing, credential capture if HTTP, session hijack MAC spoof free internet, client attack if isolation disabled, rogue portal cloning credential capture, DNS tunneling bypass — Low for open guest, Medium for MAC spoof free internet, High for credential capture if HTTP, Low for isolation disabled
- **Recommendation:** HTTPS for portal HSTS valid cert, strong session MAC+cookie+IP+token timeout re-auth HttpOnly Secure SameSite, client isolation ap_isolate=1, WIDS for rogue portal, OWE or WPA2-PSK for guest instead of open if possible, rate limiting strong auth for portal voucher 8+ random expiration, no open without OWE, no WEP no TKIP no WPS
- **Retest:** Verify HTTPS, session not bypassable via MAC spoof, isolation enabled, OWE or WPA2-PSK, new PCAPs portal HTTPS, MAC spoof fails, isolation enabled two clients cannot ping, new beacons OWE AKM 18 or WPA2-PSK, document new PCAP hash new config hash

### Interactive Check

> You have captive-portal.pcapng 15 frames: open SSID Guest-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 Open no WPA2 no encryption no 4-way handshake, client 11:22:33:44:55:66 associates open f2 no EAPOL, DHCP f3-6 IP 192.168.1.100 gateway 192.168.1.1 DNS 8.8.8.8, DNS query f7 example.com → f8 response 93.184.216.34, HTTP GET http://example.com f9 → 302 redirect to https://portal.guest.com/login f10 portal present, HTTP GET https://portal.guest.com/login f11 portal login page form action https://portal.guest.com/login POST, login POST f12 username=guest&password=guest123 over HTTP weak vs HTTPS good, after auth data f13-15 HTTP GET http://example.com after auth data sniffable if HTTP. What is captive portal architecture, auth flow, weaknesses, testing, evidence, defense?

Answer: Captive portal architecture open Wi-Fi no WPA2/WPA3 no encryption no 4-way handshake no EAPOL client associates open gets IP via DHCP HTTP redirect to portal login voucher email SMS social then internet via firewall rule MAC-based session. Flow client associates to open SSID Guest-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 Open, DHCP Discover Offer Request Ack IP 192.168.1.100 gateway 192.168.1.1 DNS 8.8.8.8, HTTP GET http://example.com → 302 redirect to https://portal.guest.com/login captive portal present, login POST username password voucher email SMS social portal validates creates session MAC-based or cookie+token allows internet via firewall iptables allow MAC/IP, session management MAC IP cookie token timeout 1h re-auth, client gets internet after auth but data after auth still open no encryption unless HTTPS traffic sniffable if HTTP. Security implications no encryption open no TK CCMP traffic sniffable unless HTTPS, credential handling portal login over HTTP not HTTPS sniffable weak password policy no rate limiting no 2FA voucher guessable short 4 digits brute-force, session management MAC-based spoof bypass since open no encryption MAC visible sniffable firewall allows MAC after auth attacker sniffs authenticated client MAC via airodump-ng Wireshark and spoofs MAC via ifconfig macchanger to bypass portal get internet free internet Medium, cookie not HttpOnly Secure XSS sniffing, no timeout long session no re-auth, client isolation disabled ap_isolate=0 clients can ARP spoof sniff attack each other on same open, rogue portal Evil Twin same SSID Guest-WLAN Open clones portal to capture credentials, DNS tunneling if portal allows DNS before auth tunnel data via DNS iodine dnscat2 bypass. Common weaknesses open network no encryption traffic sniffable even if portal HTTPS data after auth may be HTTP Low/Medium depends on data sensitivity recommend OWE or WPA2-PSK for guest instead of pure open OWE AKM 00-0F-AC-18 DH key exchange no auth but encryption prevents sniffing better than pure open, credential handling portal login over HTTP not HTTPS credentials sniffable High weak password policy no rate limiting no 2FA voucher guessable short Medium recommend strong voucher 8+ random rate limiting expiration, session management MAC-based after auth firewall allows MAC attacker can spoof MAC of authenticated client since open no encryption can sniff MAC and spoof to bypass portal get internet Medium recommend MAC+cookie+IP+token timeout re-auth HttpOnly Secure SameSite, cookie-based if cookie not HttpOnly Secure XSS sniffing Low recommend HttpOnly Secure SameSite, no timeout long session no re-auth recommend timeout 1h re-auth, client isolation if disabled ap_isolate=0 clients can ARP spoof sniff attack each other Low recommend ap_isolate=1, portal cloning attacker Evil Twin same SSID Guest-WLAN Open clones portal page to capture credentials detection check BSSID cert validation for portal portal should be HTTPS with valid cert HSTS, DNS tunneling if portal allows DNS before auth attacker can tunnel data via DNS iodine dnscat2 bypass Medium recommend firewall block DNS before auth only allow DNS to portal. Testing methodology authorized lab only recon find open SSID Guest-WLAN check captive portal HTTP redirect via airodump-ng iw connect dhclient curl -v http://example.com 302 redirect to portal, enum portal login type HTTPS session type client isolation, test auth weak credentials SQLi XSS if authorized, test session after auth spoof MAC of authenticated client see if internet bypass via ifconfig macchanger iw connect dhclient curl, test isolation two clients same open can they ping each other ARP spoof via ping, test portal cloning clone portal page credential capture simulated, evidence PCAP open association HTTP redirect login over HTTP vs HTTPS MAC spoof data isolation, impact credential capture session hijack client attack free internet, recommendation HTTPS for portal HSTS strong auth MAC+cookie+timeout client isolation ap_isolate=1 WIDS rogue portal OWE or WPA2-PSK for guest instead of open, retest HTTPS session not bypassable via MAC spoof isolation enabled. PCAP captive-portal.pcapng 15 frames open SSID Guest-WLAN BSSID AA:BB:CC:DD:EE:FF Ch6 Open no WPA2 no encryption no 4-way handshake no EAPOL, client 11:22:33:44:55:66 associates open f2 no EAPOL, DHCP f3-6 IP 192.168.1.100 gateway 192.168.1.1 DNS 8.8.8.8, DNS query f7 example.com → f8 response 93.184.216.34, HTTP GET http://example.com f9 → 302 redirect to https://portal.guest.com/login f10 portal present, HTTP GET https://portal.guest.com/login f11 portal login page form action https://portal.guest.com/login POST, login POST f12 username=guest&password=guest123 over HTTP weak vs HTTPS good, after auth data f13-15 HTTP GET http://example.com after auth data sniffable if HTTP. Filters wlan.fc.type_subtype==0 && wlan_mgt.ssid==Guest-WLAN open assoc, wlan.fc.type_subtype==8 && wlan_mgt.ssid==Guest-WLAN beacons open, http contains portal.guest.com portal redirect, dns, tls. Config audit portal config HTTPS session type MAC-based cookie timeout client isolation ap_isolate=1 hostapd.conf good ssid=Guest-WLAN wpa=0 ap_isolate=1 better WPA2-PSK for guest with portal + PSK or OWE OWE AKM 18 open with encryption. Defense HTTPS for portal HSTS strong session MAC+cookie+IP+token timeout re-auth HttpOnly Secure SameSite client isolation ap_isolate=1 WIDS rogue portal OWE or WPA2-PSK for guest rate limiting strong auth voucher 8+ random expiration. Finding templates open network no encryption Low/Medium traffic sniffing credential capture if HTTP client attack if isolation disabled recommend OWE or WPA2-PSK isolation HTTPS strong session, session bypass via MAC spoofing Medium free internet bypass auth network access without auth recommend MAC+cookie+IP+token timeout re-auth.

## References

- IEEE 802.11, WPA3 OWE RFC 8110, OWASP Session Management, NIST
- Kismet, airodump-ng, hostapd, dnsmasq, iptables, nginx, Wireshark, PcapInspector, ReconMap
- MITRE ATT&CK — Captive Portal, Credential Access, Network Sniffing

---

*Next: Captive Portal Testing & Bypass — MAC spoof, isolation, DNS tunneling, portal cloning*

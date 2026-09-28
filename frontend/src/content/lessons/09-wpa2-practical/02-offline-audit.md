# Offline Audit — Wordlists, Hashcat, Evidence, Defense, Retest

## Learning Objectives
- Master wordlists: rockyou.txt, weak passwords, SSID-based, company name + year, custom, lab wordlist containing WiFiForgeLab123!
- Learn hashcat -m 22000: conversion via hcxpcapngtool to 22000, mask attack, rules, performance, --force
- Understand aircrack-ng -w wordlist older but still works
- Build VAPT evidence: wordlist used, hashcat mode, result crack vs fail, frame numbers, BSSID, SSID, PCAP hash, filters
- Learn defense: strong PSK 20+ random not in wordlists, PMF required, WPA3 SAE resists offline audit, no WPS, monitoring
- Learn retest: after strong PSK, audit should fail with rockyou.txt and custom wordlists, verify PMF required, no WPS, etc.

## Theory

### Wordlists — The Key to Offline Audit

**Offline audit success depends on wordlist containing PSK — if PSK weak (in wordlist), crackable — if strong 20+ random not in wordlists, audit fails — defense.**

**Common wordlists:**
- **rockyou.txt:** 14M passwords from RockYou leak 2009 — contains `password`, `123456`, `12345678`, `qwerty`, `password123`, `letmein`, `admin`, `welcome`, etc. — weak passwords — many WPA2-PSK weak passwords in rockyou.txt — e.g., `WeakPass123`, `Company2023`, `Password123!`, etc. — if PSK in rockyou.txt, crackable in seconds/minutes with GPU
- **Weak passwords:** `password`, `12345678`, `123456789`, `qwerty`, `abc123`, `password1`, `1234567`, `1234567890`, `000000`, `555555`, `lovely`, `654321`, `123123`, `666666`, `welcome`, `admin`, `login`, `princess`, `solo`, `starwars`, etc. — all in rockyou.txt
- **SSID-based:** Many users use SSID-related passwords — e.g., SSID `LAB-WIFI` password `LAB-WIFI123`, `LAB-WIFI2023`, `labwifi`, etc. — custom wordlist with SSID variations — e.g., SSID + year, SSID + 123, etc.
- **Company name + year:** e.g., Company `Acme` password `Acme2023`, `Acme123`, `Acme!2023`, etc. — custom — for PT, if scope is company Acme, try company name + year, etc., but only authorized
- **Custom:** For authorized lab, create custom wordlist with company name, product, etc., plus years, symbols, etc. — e.g., `Acme2023!`, `Acme@123`, etc.
- **For lab, only use lab wordlist containing `WiFiForgeLab123!`:** For this academy, lab PCAPs self-generated with known passphrase `WiFiForgeLab123!` for demo — wordlist `/tmp/lab-wordlist.txt` containing `WiFiForgeLab123!` and `password123` — only for lab, not public

**For PT:** Wordlist selection important — rockyou.txt for weak passwords, custom for company, etc., but only authorized captures, own lab, explicit ROE, not public — ethics.

**Example lab wordlist:**
```
WiFiForgeLab123!
password123
WeakPass123
Company2023
Acme123
12345678
```
- Contains lab passphrase `WiFiForgeLab123!` for demo — crackable — but real strong PSK 20+ random not in wordlists should fail

**Strong PSK generation (defense):**
- `pwgen -s 20 1` — random 20 chars — e.g., `aB3$dE5&gH7!jK9@lM1#`
- `openssl rand -base64 15` — 20 chars base64
- Python secrets — `python3 -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters+string.digits+string.punctuation) for _ in range(20)))"`
- Diceware 6 words — `correct horse battery staple` — 20+ chars with spaces — strong, memorable
- Avoid weak: `password`, `12345678`, `WeakPass123`, `Company2023`, etc. — in rockyou.txt

### Hashcat — -m 22000 — Conversion via hcxpcapngtool, Mask, Rules, Performance

**hashcat is fastest password recovery — GPU accelerated — mode 22000 for WPA2 EAPOL + PMKID — tries PBKDF2 + PRF + MIC verification for each passphrase.**

**Conversion:**
```bash
# Convert PCAP to hashcat 22000 format (WPA2 EAPOL + PMKID) — authorized capture only
hcxpcapngtool -o capture.hc22000 capture.pcapng
# Output: capture.hc22000 contains 22000 hashes — each line: WPA*02*hash*...
# Example: WPA*02*aabbccddeeff00112233445566778899*...*...*...*...*...*...

# Check if handshake or PMKID present
hcxpcapngtool -o lab.hc22000 wpa2-handshake.pcapng
# Output: 1 handshake(s) found, 0 PMKID(s)

hcxpcapngtool -o pmkid.hc22000 pmkid.pcapng
# Output: 0 handshake(s), 1 PMKID(s) found
```

**Audit:**
```bash
# Audit with hashcat (authorized, lab only) — wordlist
hashcat -m 22000 capture.hc22000 wordlist.txt --force
# --force needed if not full handshake? Actually --force for some cases, but use authorized

# Example lab
echo "WiFiForgeLab123!" > /tmp/lab-wordlist.txt
echo "password123" >> /tmp/lab-wordlist.txt

hashcat -m 22000 wpa2-handshake.hc22000 /tmp/lab-wordlist.txt --force
# Should crack: LAB-WPA2:WiFiForgeLab123! if wordlist contains it
# Output: Session... Status... Cracked... LAB-WPA2:WiFiForgeLab123!

# For strong PSK 20+ random not in wordlists, should fail — no crack — good — defense

# Mask attack — if you know pattern — e.g., 8 digits? Actually WPA2 PSK 8-63 chars — mask ?d?d?d?d?d?d?d?d for 8 digits — but PSK should be 20+ random, not 8 digits
hashcat -m 22000 capture.hc22000 ?d?d?d?d?d?d?d?d --increment

# Rules — e.g., best64.rule — apply rules to wordlist — e.g., append year, capitalize, etc.
hashcat -m 22000 capture.hc22000 wordlist.txt -r /usr/share/hashcat/rules/best64.rule

# Performance — GPU — e.g., RTX 4090 ~1M H/s for 22000? Actually 22000 is slow due to PBKDF2 4096 iter — maybe 500k H/s? Depends on GPU
```

**For PT:** Hashcat -m 22000 for WPA2 EAPOL + PMKID — only authorized captures, own lab, explicit ROE, not public — ethics — document wordlist used, hashcat mode, result crack vs fail, frame numbers, BSSID, SSID, PCAP hash, filters.

**Example evidence:**
```
Wordlist: /tmp/lab-wordlist.txt containing WiFiForgeLab123! and password123 — 2 words — for lab demo only
Hashcat mode: 22000
Command: hcxpcapngtool -o wpa2-handshake.hc22000 wpa2-handshake.pcapng && hashcat -m 22000 wpa2-handshake.hc22000 /tmp/lab-wordlist.txt --force
Result: Cracked LAB-WPA2:WiFiForgeLab123! — PSK found — weak? Actually WiFiForgeLab123! is 16 chars with upper lower digits symbols — but for lab demo, it's in wordlist, so crackable — but real strong PSK 20+ random not in wordlists should fail — for PT, if PSK weak like WeakPass123 in rockyou.txt, crackable High finding — if strong 20+ random, audit fails good
PCAP: wpa2-handshake.pcapng SHA256 abc123... Frames M1 f9 ANonce..., M2 f10 SNonce... MIC..., etc.
BSSID: AA:BB:CC:DD:EE:FF
SSID: LAB-WPA2
Channel: 6
```

### Aircrack-ng — Older but Still Works

**aircrack-ng is older tool for WEP and WPA2-PSK — `aircrack-ng -w wordlist.txt capture.cap` — tries PBKDF2 + MIC verification — slower than hashcat, CPU only, but still works — for WEP, `aircrack-ng -z` PTW.**

```bash
aircrack-ng -w /tmp/lab-wordlist.txt wpa2-handshake.pcapng
# Output: KEY FOUND! [ WiFiForgeLab123! ]
# BSSID AA:BB:CC:DD:EE:FF, ESSID LAB-WPA2

# For WEP
aircrack-ng -z wep-01.cap
# PTW
```

**For PT:** aircrack-ng older, but still valid for evidence — hashcat faster with GPU — but aircrack-ng simpler.

### Evidence — Wordlist, Mode, Result, Frame Numbers, BSSID, SSID, PCAP Hash, Filters

**Must include:**
- PCAP file name + SHA256 hash — e.g., `wpa2-handshake.pcapng SHA256 abc123...`
- Frame numbers M1-M4 — e.g., M1 f9, M2 f10, M3 f11, M4 f12
- ANonce, SNonce, MIC, replay, BSSID, client MAC, SSID, channel, security, RSN, PMF, WPS, vendor, signal
- Wordlist used — e.g., `/tmp/lab-wordlist.txt containing WiFiForgeLab123! and password123 — 2 words — for lab demo only` or `rockyou.txt 14M` or `custom company name + year`
- Hashcat mode — 22000
- Command — `hcxpcapngtool -o ... && hashcat -m 22000 ...`
- Result — Cracked LAB-WPA2:WiFiForgeLab123! or Failed — no crack — strong PSK — good
- Filters — `eapol && wlan.bssid==AA:BB:CC:DD:EE:FF`, `wlan_rsna_eapol.pmkid`
- Config hash if applicable
- Ethics — authorized lab only, self-generated PCAP, BSSID AA:BB:CC:DD:EE:FF, SSID LAB-*, etc.

**Example evidence:**
```
PCAP: wpa2-handshake.pcapng SHA256 abc123... Size 2.3 KB Frames 11-12 Tool Scapy 2.5.0 Method scapy
BSSID: AA:BB:CC:DD:EE:FF
Client: 11:22:33:44:55:66
SSID: LAB-WPA2
Channel: 6
Security: WPA2-PSK CCMP PSK PMF capable
Frames: M1 f9 ANonce aabb..., M2 f10 SNonce 1122... MIC valid, M3 f11 GTK, M4 f12 ACK — complete
Filter: eapol && wlan.bssid==AA:BB:CC:DD:EE:FF
Wordlist: /tmp/lab-wordlist.txt containing WiFiForgeLab123! and password123 — for lab demo only
Hashcat: hcxpcapngtool -o wpa2-handshake.hc22000 wpa2-handshake.pcapng && hashcat -m 22000 wpa2-handshake.hc22000 /tmp/lab-wordlist.txt --force
Result: Cracked LAB-WPA2:WiFiForgeLab123! — PSK found — for lab demo, but real strong PSK 20+ random not in wordlists should fail — if PSK weak like WeakPass123 in rockyou.txt, High finding
PMKID: pmkid.pcapng SHA256 def456... Frame 2 PMKID aabb... BSSID AA:BB:CC:DD:EE:FF STA MAC 11:22:33:44:55:66
```

### Defense — Strong PSK, PMF, WPA3, No WPS, Monitoring

- **Strong PSK:** 20+ chars random not in wordlists not SSID-related unique per SSID rotated stored securely via pwgen, openssl, Python secrets, diceware — e.g., `aB3$dE5&gH7!jK9@lM1#qR2%` — audit with rockyou.txt should fail
- **PMF required ieee80211w=2:** Prevents deauth for handshake capture — WPA3 mandates required, WPA2 should have required — check beacon RSN Capabilities MFPC=1 MFPR=1
- **WPA3 where possible SAE:** SAE resists offline audit — forward secrecy — even if handshake captured, offline audit not possible without active attack? Actually SAE has forward secrecy, resists offline dictionary — better than PSK — WPA3-only SAE PMF required
- **No WPS:** wps_state=0 — WPS IE 00:50:F2:04 High 11k PIN flaw
- **Monitor for deauth floods:** WIDS detection — many deauth same BSSID short interval — alert — e.g., 10 deauth in 1 sec same BSSID — deauth flood DoS — PMF required prevents
- **PMKID cache:** If not needed for fast roaming, disable? Actually PMKID cache for fast roaming, but if PMKID present, risk — but strong PSK mitigates — strong PSK is defense

### Retest — After Strong PSK, Audit Should Fail, Verify PMF Required

**Retest verifies fix with new evidence — not old PCAPs — new PCAPs, new config hash, new logs, what should happen vs what actually happened.**

**Steps:**
1. **New Config:** Get new hostapd.conf with strong PSK 20+ random PMF required WPS disabled — hash SHA256 new
2. **New PCAPs:** Capture new beacons — verify beacon shows RSN CCMP PSK/SAE PMF required MFPC=1 MFPR=1, no WPS, no TKIP, channel, BSSID, etc. — frame numbers new, filter `wlan.fc.type_subtype==8 && wlan.bssid==AA:BB:CC:DD:EE:FF`
3. **Handshake Audit Fails:** Try offline audit with rockyou.txt and custom wordlists — should fail for strong PSK 20+ random not in wordlists — evidence audit fails — hashcat no crack — good
4. **PMKID Audit Fails:** If PMKID present, try audit with rockyou.txt — should fail for strong PSK
5. **PMF Required:** Check RSN Capabilities MFPC=1 MFPR=1 — PMF required — filter `wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==1`
6. **WPS Disabled:** Filter `wps` should be empty — no WPS IE
7. **Document:** New PCAP hash SHA256, new config hash, new frame numbers, new filters, what should happen (beacon RSN CCMP PMF required no WPS strong PSK audit fails) vs what actually happened (verified)
8. **Report:** Retest section — "Fix verified: new beacon f1 SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK PMF required MFPC=1 MFPR=1 no WPS, config hash new SHA256..., PCAP hash new..., handshake audit with rockyou.txt fails, WPS filter empty, PMF required"

**For PT:** Retest with new evidence, not old — reproducible.

### Tools Deep Dive

- **hcxpcapngtool:** Convert PCAP to hashcat 22000 — `hcxpcapngtool -o capture.22000 capture.pcapng` — outputs 22000 hashes — check handshake or PMKID count
- **hcxdumptool:** Capture PMKID clientless — `hcxdumptool -i wlan0mon -o capture.pcapng --enable_status=1` — captures PMKID
- **hashcat:** Offline audit — `hashcat -m 22000 capture.22000 wordlist.txt --force` — GPU accelerated — mode 22000 for WPA2 EAPOL + PMKID — mask, rules, etc.
- **aircrack-ng:** Older — `aircrack-ng -w wordlist.txt capture.cap` — CPU — still valid
- **Wireshark, tshark:** Filters `eapol`, `wlan_rsna_eapol.pmkid`, `wlan_mgt.rsn.pmkid`, `wlan.fc.type_subtype==8`, etc.
- **PcapInspector, ConfigViewer, ReconMap:** Simulated lab
- **pwgen, openssl, Python secrets:** Strong PSK generation
- **sha256sum:** Hash for evidence chain

### Evidence Collection — Detailed

```
PCAP: wpa2-handshake.pcapng SHA256 abc123... Size 2.3 KB Frames 11-12 Tool Scapy 2.5.0 Method scapy
BSSID: AA:BB:CC:DD:EE:FF
Client: 11:22:33:44:55:66
SSID: LAB-WPA2
Channel: 6
Security: WPA2-PSK CCMP PSK PMF capable
Frames: M1 f9 ANonce..., M2 f10 SNonce... MIC..., M3 f11 GTK..., M4 f12 ACK... — complete
Filter: eapol && wlan.bssid==AA:BB:CC:DD:EE:FF
Wordlist: /tmp/lab-wordlist.txt containing WiFiForgeLab123! and password123 — for lab demo only — 2 words
Hashcat: hcxpcapngtool -o wpa2-handshake.hc22000 wpa2-handshake.pcapng && hashcat -m 22000 wpa2-handshake.hc22000 /tmp/lab-wordlist.txt --force
Result: Cracked LAB-WPA2:WiFiForgeLab123! — for lab demo, but real strong PSK 20+ random not in wordlists should fail — if PSK weak like WeakPass123 in rockyou.txt, High finding
PMKID: pmkid.pcapng SHA256 def456... Frame 2 PMKID aabb... BSSID AA:BB:CC:DD:EE:FF STA MAC 11:22:33:44:55:66 filter wlan_rsna_eapol.pmkid
Defense: Strong PSK 20+ random not in wordlists, PMF required ieee80211w=2, WPA3 SAE, no WPS, WIDS
Retest: New config hash, new PCAPs beacon RSN CCMP PMF required no WPS, handshake audit with rockyou.txt fails, WPS filter empty, PMF required
```

### Attack → Defense → Retest

- **Attack:** Capture handshake via passive wait for client assoc or active deauth if authorized and PMF not required and lab (hardware), extract ANonce, SNonce, MIC, BSSID, client, SSID, convert to 22000 via hcxpcapngtool, offline audit with wordlist if weak PSK and authorized (lab). Or capture PMKID via hcxdumptool clientless single frame, convert to 22000, offline audit.
- **Defense:** Strong PSK 20+ random not in wordlists, PMF required ieee80211w=2, disable WPS wps_state=0, WPA3-only SAE PMF required for better, strong RADIUS secret for Enterprise, cert validation, WIDS, monitoring
- **Retest:** New PCAPs show no handshake capture if PMF required deauth fails, strong PSK audit fails, PMKID still present but strong PSK audit fails, WPA3-only no handshake capture, etc.

### Interactive Check

> You have wpa2-handshake.pcapng with handshake M1-M4 and pmkid.pcapng with PMKID. What wordlists would you try for offline audit authorized lab, what tools, what evidence, what defense, what retest?

Answer: Wordlists rockyou.txt 14M for weak passwords, custom SSID-based (LAB-WIFI + year), company name + year if authorized, lab wordlist containing WiFiForgeLab123! for demo only. Tools hcxpcapngtool -o capture.22000 capture.pcapng to convert to 22000, hashcat -m 22000 capture.22000 wordlist.txt --force for audit, aircrack-ng -w wordlist.txt capture.cap older. Evidence PCAP hash, frame numbers M1-M4 ANonce SNonce MIC replay BSSID client SSID channel RSN PMF WPS, wordlist used, hashcat mode 22000, command, result crack vs fail, filters eapol && bssid, wlan_rsna_eapol.pmkid, config hash. Defense strong PSK 20+ random via pwgen -s 20 1 not in wordlists, PMF required ieee80211w=2 MFPC=1 MFPR=1, WPA3 SAE resists offline audit forward secrecy, no WPS wps_state=0, WIDS deauth flood detection. Retest new config hash new PCAPs beacon RSN CCMP PMF required no WPS, handshake audit with rockyou.txt fails, WPS filter empty, PMF required, document new hashes.

## References

- hashcat, hcxpcapngtool, hcxdumptool, aircrack-ng
- rockyou.txt, wordlists
- IEEE 802.11i WPA2, 802.11w PMF, 802.11r PMKID
- Wireshark 802.11 EAPOL, PMKID
- OWASP, NIST
- pwgen, openssl, Python secrets

---

*Next: PMKID & Wordlist Mastery — PMKID formula, clientless capture, wordlist generation, mask, rules, evidence*

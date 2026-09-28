# PMKID & Wordlist Mastery — Clientless Capture, Mask, Rules, Evidence

## Learning Objectives
- Master PMKID formula: HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC) 16 bytes, first 128 bits of HMAC-SHA1
- Learn clientless capture via hcxdumptool: association request → M1 with PMKID, no client needed, single frame, no deauth, less detection
- Understand wordlist generation: rockyou.txt, custom company+year, SSID-based, mask attack ?d?d?d?d, rules best64.rule, combinator, etc.
- Build VAPT evidence: PMKID value, BSSID, STA MAC, SSID, frame number, PCAP hash, filter wlan_rsna_eapol.pmkid, wordlist, hashcat mode, result
- Learn defense: strong PSK 20+ random, PMF required, WPA3 SAE resists offline audit, disable PMKID cache if not needed for fast roaming? Actually strong PSK mitigates
- Learn retest: after strong PSK, PMKID audit fails with rockyou.txt and custom, verify PMF required, no WPS

## Theory

### PMKID Formula — HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC)

**PMKID (Pairwise Master Key Identifier):**
- Defined in IEEE 802.11r-2008 Fast Transition and 802.11-2020 — for fast roaming — PMKID cache — AP caches PMKID for client that previously connected, for fast roaming without full 802.1X or 4-way handshake
- Formula: PMKID = HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC)
  - PMK: 32 bytes (256-bit) — from PBKDF2 for PSK or MSK for Enterprise
  - "PMK Name": ASCII string "PMK Name" — 8 bytes — 0x50 0x4D 0x4B 0x20 0x4E 0x61 0x6D 0x65
  - BSSID: 6 bytes — AP MAC — e.g., AA:BB:CC:DD:EE:FF
  - STA MAC: 6 bytes — Client MAC — e.g., 11:22:33:44:55:66
  - Input to HMAC-SHA1: "PMK Name" (8) + BSSID (6) + STA MAC (6) = 20 bytes
  - HMAC-SHA1(PMK, 20 bytes) → 20 bytes output (160-bit)
  - PMKID = first 128 bits (16 bytes) of HMAC-SHA1 output — first 16 bytes
- Example:
  ```
  PMK = PBKDF2("WiFiForgeLab123!", "LAB-WIFI", 4096, 32 bytes) = a1b2c3... 32 bytes
  BSSID = AA:BB:CC:DD:EE:FF
  STA MAC = 11:22:33:44:55:66
  Data = "PMK Name" + BSSID + STA MAC = 50 4D 4B 20 4E 61 6D 65 AA BB CC DD EE FF 11 22 33 44 55 66 (20 bytes)
  HMAC-SHA1(PMK, Data) = 20 bytes — e.g., aabbccddeeff00112233445566778899aabbccdd (20 bytes hex)
  PMKID = first 16 bytes = aabbccddeeff00112233445566778899 (16 bytes, 32 hex chars)
  ```
- PMKID is 16 bytes (32 hex chars) — e.g., `aabbccddeeff00112233445566778899`

**Where PMKID appears:**
- RSN IE PMKID List — Tag 48 RSN IE contains PMKID Count and PMKID List — e.g., PMKID Count 1, PMKID aabb...
- EAPOL M1 key data — EAPOL M1 from AP to client contains key data with RSN IE and PMKID — PMKID in key data — e.g., EAPOL M1 key data length variable, contains RSN IE with PMKID
- For PT: PMKID in EAPOL M1 key data — filter `wlan_rsna_eapol.pmkid` or `wlan_mgt.rsn.pmkid`

**For offline audit:**
- Need PMKID, BSSID, STA MAC, SSID — for PSK mode, PMK from PBKDF2(passphrase, SSID, 4096, 32 bytes), then PMKID via HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC), compare to captured PMKID — if match, passphrase correct — hashcat -m 22000 does this

### Clientless Capture via hcxdumptool — No Client Needed, Single Frame, No Deauth

**Discovery 2018 by Steube and Gristina — `hcxdumptool` — clientless PMKID capture — no need for legitimate client, no need to wait for client, no deauth, single frame — less intrusive than handshake capture which needs client and possibly deauth if PMF not required.**

**How it works:**
- `hcxdumptool` acts as client — sends association request to AP with BSSID AA:BB:CC:DD:EE:FF, SSID LAB-WIFI, etc.
- AP responds with association response status 0 AID, then EAPOL M1 containing ANonce and PMKID in key data (if AP has PMKID cache enabled for fast roaming or for client that previously connected — many APs include PMKID in M1 even for new client? Actually AP may include PMKID in M1 for any client if PMKID cache enabled — but in practice, many APs include PMKID in M1)
- Attacker captures M1 with PMKID — single frame — no need for full handshake M1-M4, no need for client, no deauth
- `hcxdumptool -i wlan0mon -o capture.pcapng --enable_status=1` — captures PMKID — writes pcapng with EAPOL M1 containing PMKID

**Advantage over handshake:**
- Clientless — no need for legitimate client to be present — AP sends M1 with PMKID even if no client? Actually need to associate as client, but `hcxdumptool` associates as client, so no need for legitimate client, no need to wait
- Single frame — M1 with PMKID — vs handshake needs 4 frames M1-M4 or at least M1+M2
- No deauth — no DoS, less detection, more stealth — handshake capture often uses deauth if PMF not required to force client re-handshake — deauth is active, detectable, DoS — PMKID no deauth, less intrusive
- But still requires weak PSK to crack — PMKID offline audit same as handshake — PBKDF2 + HMAC-SHA1-128 — if PSK weak, crackable — strong PSK 20+ random mitigates

**For PT:** PMKID is preferred over handshake if available — clientless, single frame, no deauth, less detection — but not all APs include PMKID in M1 — many do, especially with PMKID cache enabled for fast roaming — if PMKID not present, fallback to handshake capture (with deauth if authorized and PMF not required and lab).

**Hardware lab (requires RF adapter, explicit ROE, own lab):**
- Adapter ALFA AWUS036ACH monitor mode
- `hcxdumptool -i wlan0mon -o pmkid.pcapng --enable_status=1` — capture PMKID — wait for AP beacons, associate, get M1 with PMKID
- `hcxpcapngtool -o pmkid.22000 pmkid.pcapng` — convert to 22000
- `hashcat -m 22000 pmkid.22000 wordlist.txt` — offline audit

**For this academy:** Simulated lab — `pmkid.pcapng` with PMKID — zero-cost — PcapInspector filter `wlan_rsna_eapol.pmkid`

### Wordlist Generation — Rockyou, Custom, SSID-Based, Mask, Rules

**Wordlist selection is key for offline audit success — if PSK weak and in wordlist, crackable — if strong 20+ random not in wordlists, audit fails — defense.**

**Rockyou.txt:**
- 14M passwords from RockYou leak 2009 — contains weak passwords — `password`, `123456`, `12345678`, `qwerty`, `password123`, `letmein`, `admin`, `welcome`, etc.
- Many WPA2-PSK weak passwords in rockyou.txt — e.g., `WeakPass123`, `Company2023`, `Password123!`, etc.
- For PT: Try rockyou.txt first for weak PSK — if PSK weak, High finding — if strong, audit fails — good

**Custom Company + Year:**
- If scope is company Acme, try `Acme2023`, `Acme123`, `Acme!2023`, `Acme@123`, `Acme2023!`, etc. — company name + year + symbols
- For authorized lab only — e.g., scope Acme Corp, SSID Acme-WIFI, try Acme variations — but only authorized, not public
- Example custom wordlist generation:
  ```bash
  echo "Acme2023" > custom.txt
  echo "Acme123" >> custom.txt
  echo "Acme!2023" >> custom.txt
  echo "Acme@123" >> custom.txt
  echo "Acme2023!" >> custom.txt
  ```

**SSID-Based:**
- Many users use SSID-related passwords — e.g., SSID `LAB-WIFI` password `LAB-WIFI123`, `LAB-WIFI2023`, `labwifi`, `LABWIFI`, etc.
- Custom wordlist with SSID variations — SSID + year, SSID + 123, etc.
- Example:
  ```bash
  SSID="LAB-WIFI"
  echo "${SSID}123" > ssid.txt
  echo "${SSID}2023" >> ssid.txt
  echo "${SSID,,}" >> ssid.txt  # lowercase
  echo "${SSID^^}" >> ssid.txt  # uppercase
  ```

**Mask Attack:**
- If you know pattern — e.g., 8 digits? Actually WPA2 PSK 8-63 chars — mask `?d?d?d?d?d?d?d?d` for 8 digits — but PSK should be 20+ random, not 8 digits — mask attack for weak PSK that is 8 digits? But 8 digits is weak, in wordlists? Actually 8 digits 100M possibilities — hashcat mask
- Hashcat mask: `?l` lowercase, `?u` uppercase, `?d` digits, `?s` symbols, `?a` all, etc.
- Example:
  ```bash
  hashcat -m 22000 capture.22000 ?d?d?d?d?d?d?d?d --increment  # 8 digits
  hashcat -m 22000 capture.22000 ?1?1?1?1?1?1?1?1 --custom-charset1=?l?d -1 ?1?1?1?1?1?1?1?1  # lowercase + digits 8 chars
  ```

**Rules:**
- Rules apply transformations to wordlist — e.g., append year, capitalize, leet, etc.
- Hashcat rules: `/usr/share/hashcat/rules/best64.rule`, `d3ad0ne.rule`, etc.
- Example:
  ```bash
  hashcat -m 22000 capture.22000 wordlist.txt -r /usr/share/hashcat/rules/best64.rule
  # best64.rule contains 77 rules — e.g., append 1, append 123, capitalize, etc.
  ```

**Combinator:**
- Combine two wordlists — e.g., company name + year — `Acme` + `2023` = `Acme2023`
- Hashcat combinator attack: `hashcat -m 22000 capture.22000 wordlist1.txt wordlist2.txt -a 1`

**For PT:** Wordlist generation for authorized lab only — rockyou.txt, custom company+year, SSID-based, mask, rules, combinator — but only authorized captures, own lab, explicit ROE, not public — ethics.

**Lab wordlist for this academy:**
- `/tmp/lab-wordlist.txt` containing `WiFiForgeLab123!` and `password123` — 2 words — for demo only — crackable — but real strong PSK 20+ random not in wordlists should fail

### VAPT Evidence — PMKID Value, BSSID, STA MAC, SSID, Frame Number, PCAP Hash, Filter, Wordlist, Hashcat Mode, Result

**Must include:**
- PCAP file name + SHA256 hash — e.g., `pmkid.pcapng SHA256 def456...`
- PMKID value — 32 hex chars — e.g., `aabbccddeeff00112233445566778899`
- BSSID — AA:BB:CC:DD:EE:FF
- STA MAC — 11:22:33:44:55:66
- SSID — LAB-WIFI or LAB-PMKID
- Frame number — f2 M1 with PMKID
- Filter — `wlan_rsna_eapol.pmkid` or `eapol && wlan_mgt.rsn.pmkid`
- Wordlist used — e.g., `/tmp/lab-wordlist.txt containing WiFiForgeLab123!` or `rockyou.txt 14M` or `custom Acme2023`
- Hashcat mode — 22000
- Command — `hcxpcapngtool -o pmkid.22000 pmkid.pcapng && hashcat -m 22000 pmkid.22000 wordlist.txt`
- Result — Cracked or Failed — e.g., `Cracked LAB-WIFI:WiFiForgeLab123!` or `Failed — no crack — strong PSK — good`
- Config hash if applicable
- Ethics — authorized lab only, self-generated PCAP, BSSID AA:BB:CC:DD:EE:FF, SSID LAB-*, etc.

**Example evidence:**
```
PCAP: pmkid.pcapng SHA256 def456... Size 1.2 KB Frames 2 Tool Scapy Method scapy
BSSID: AA:BB:CC:DD:EE:FF
STA MAC: 11:22:33:44:55:66
SSID: LAB-WIFI
Channel: 6
Security: WPA2-PSK CCMP PSK PMF capable
Frame: M1 f2 SA BSSID DA STA MAC PMKID aabbccddeeff00112233445566778899 in key data RSN IE PMKID Count 1 PMKID aabb...
Filter: wlan_rsna_eapol.pmkid
Wordlist: /tmp/lab-wordlist.txt containing WiFiForgeLab123! and password123 — for lab demo only — 2 words
Hashcat: hcxpcapngtool -o pmkid.hc22000 pmkid.pcapng && hashcat -m 22000 pmkid.hc22000 /tmp/lab-wordlist.txt --force
Result: Cracked LAB-WIFI:WiFiForgeLab123! — for lab demo, but real strong PSK 20+ random not in wordlists should fail — if PSK weak like WeakPass123 in rockyou.txt, High finding
```

### Defense — Strong PSK, PMF, WPA3, Disable PMKID Cache?

- **Strong PSK 20+ random not in wordlists:** `pwgen -s 20 1`, `openssl rand -base64 15`, Python secrets, diceware — audit with rockyou.txt should fail
- **PMF required ieee80211w=2:** Prevents deauth for handshake capture — WPA3 mandates required, WPA2 should have required — but PMKID capture doesn't need deauth, so PMF doesn't prevent PMKID capture — PMKID capture is via association, not deauth — so PMF doesn't prevent PMKID — but strong PSK does
- **WPA3 SAE resists offline audit:** Forward secrecy — even if handshake or PMKID captured, offline audit not possible without active attack? Actually SAE has forward secrecy, resists offline dictionary — better than PSK — WPA3-only SAE PMF required
- **Disable PMKID cache if not needed for fast roaming?** PMKID cache is for fast roaming 802.11r — if not needed, disable? Actually PMKID cache is for fast roaming, but if PMKID present, risk — but strong PSK mitigates — strong PSK is defense — if PMKID cache disabled, PMKID not in M1, no clientless capture — but many APs enable PMKID cache by default for fast roaming — check hostapd.conf `pmk_cache`? Actually hostapd has `okc=1` Opportunistic Key Caching, `pmk_cache`? But for PT, strong PSK is defense, not disabling PMKID cache — but if not needed, disable for less info leak
- **No WPS:** wps_state=0
- **WIDS detection of PMKID capture?** WIDS could detect many association requests from same MAC? Actually hcxdumptool sends association requests — WIDS could detect — but PMKID capture is single association, less detection than deauth flood

### Retest — After Strong PSK, PMKID Audit Fails

**Retest verifies fix with new evidence — not old PCAPs — new PCAPs, new config hash, new logs, what should happen vs what actually happened.**

**Steps:**
1. **New Config:** Get new hostapd.conf with strong PSK 20+ random PMF required WPS disabled — hash SHA256 new
2. **New PCAPs:** Capture new beacons — verify beacon shows RSN CCMP PSK/SAE PMF required MFPC=1 MFPR=1, no WPS, no TKIP, channel, BSSID, etc. — frame numbers new, filter `wlan.fc.type_subtype==8 && wlan.bssid==AA:BB:CC:DD:EE:FF`
3. **PMKID Audit Fails:** Try offline audit with rockyou.txt and custom wordlists — should fail for strong PSK 20+ random not in wordlists — evidence audit fails — hashcat no crack — good
4. **Handshake Audit Fails:** Same — strong PSK audit fails
5. **PMF Required:** Check RSN Capabilities MFPC=1 MFPR=1 — PMF required
6. **WPS Disabled:** Filter `wps` should be empty
7. **Document:** New PCAP hash SHA256, new config hash, new frame numbers, new filters, what should happen vs what actually happened
8. **Report:** Retest section — "Fix verified: new beacon f1 SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK PMF required MFPC=1 MFPR=1 no WPS, config hash new SHA256..., PCAP hash new..., PMKID audit with rockyou.txt fails, handshake audit fails, WPS filter empty, PMF required"

### Tools

- Wireshark, tshark — PMKID, `wlan_rsna_eapol.pmkid`, `wlan_mgt.rsn.pmkid`, `eapol`
- PcapInspector, ConfigViewer, ReconMap — simulated lab
- hcxpcapngtool — convert PCAP to 22000: `hcxpcapngtool -o capture.22000 capture.pcapng`
- hcxdumptool — capture PMKID clientless: `hcxdumptool -i wlan0mon -o capture.pcapng --enable_status=1`
- hashcat — offline audit: `hashcat -m 22000 capture.22000 wordlist.txt --force` — mask, rules, combinator
- aircrack-ng — `aircrack-ng -w wordlist.txt capture.cap`
- pwgen, openssl, Python secrets — strong PSK generation, wordlist generation
- `sha256sum` — hash for evidence chain

### Evidence Collection — Detailed

```
PCAP: pmkid.pcapng SHA256 def456... Size 1.2 KB Frames 2 Tool Scapy Method scapy
BSSID: AA:BB:CC:DD:EE:FF
STA MAC: 11:22:33:44:55:66
SSID: LAB-WIFI
Channel: 6
Security: WPA2-PSK CCMP PSK PMF capable
Frame: M1 f2 SA BSSID DA STA MAC PMKID aabbccddeeff00112233445566778899 in key data RSN IE PMKID Count 1 PMKID aabb...
Filter: wlan_rsna_eapol.pmkid
Wordlist: /tmp/lab-wordlist.txt containing WiFiForgeLab123! and password123 — for lab demo only
Hashcat: hcxpcapngtool -o pmkid.hc22000 pmkid.pcapng && hashcat -m 22000 pmkid.hc22000 /tmp/lab-wordlist.txt --force
Result: Cracked LAB-WIFI:WiFiForgeLab123! — for lab demo, but real strong PSK 20+ random not in wordlists should fail — if PSK weak like WeakPass123 in rockyou.txt, High finding
Defense: Strong PSK 20+ random not in wordlists, PMF required, WPA3 SAE, no WPS
Retest: New config hash, new PCAPs beacon RSN CCMP PMF required no WPS, PMKID audit with rockyou.txt fails
```

### Attack → Defense → Retest

- **Attack:** Capture PMKID via hcxdumptool clientless single frame M1 with PMKID, no client needed, no deauth, less detection, extract PMKID, BSSID, STA MAC, SSID, convert to 22000 via hcxpcapngtool, offline audit with wordlist if weak PSK and authorized (lab). Or capture handshake via passive wait or deauth if authorized and PMF not required and lab.
- **Defense:** Strong PSK 20+ random not in wordlists via pwgen, openssl, Python secrets, PMF required ieee80211w=2, disable WPS wps_state=0, WPA3-only SAE PMF required for better (forward secrecy, resists offline audit), strong RADIUS secret for Enterprise, cert validation, WIDS, monitoring, training
- **Retest:** New config hash, new PCAPs beacon RSN CCMP PMF required no WPS, PMKID and handshake audit with rockyou.txt and custom fails for strong PSK, document new hashes, frame numbers, filters

### Interactive Check

> You have pmkid.pcapng with PMKID aabbccddeeff00112233445566778899 BSSID AA:BB:CC:DD:EE:FF STA MAC 11:22:33:44:55:66 SSID LAB-WIFI. What is PMKID formula, how to capture clientless, what wordlists, tools, evidence, defense, retest?

Answer: PMKID = HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC) 16 bytes first 128 bits of HMAC-SHA1, PMK from PBKDF2(passphrase, SSID, 4096, 32 bytes). Capture clientless via hcxdumptool -i wlan0mon -o capture.pcapng --enable_status=1 which associates as client and gets M1 with PMKID, single frame, no client needed, no deauth, less detection than handshake. Wordlists rockyou.txt 14M weak passwords, custom company+year (Acme2023), SSID-based (LAB-WIFI123), mask ?d?d?d?d?d?d?d?d for 8 digits, rules best64.rule, combinator, lab wordlist containing WiFiForgeLab123! for demo only. Tools hcxpcapngtool -o capture.22000 capture.pcapng to convert to 22000, hashcat -m 22000 capture.22000 wordlist.txt --force for audit, aircrack-ng -w wordlist.txt capture.cap older. Evidence PCAP hash, PMKID value, BSSID, STA MAC, SSID, frame number f2 M1 with PMKID, filter wlan_rsna_eapol.pmkid, wordlist used, hashcat mode 22000, command, result crack vs fail. Defense strong PSK 20+ random not in wordlists via pwgen, PMF required ieee80211w=2, WPA3 SAE resists offline audit forward secrecy, no WPS, WIDS. Retest new config hash new PCAPs beacon RSN CCMP PMF required no WPS, PMKID audit with rockyou.txt fails for strong PSK.

## References

- IEEE 802.11r PMKID, 802.11-2020
- Steube and Gristina 2018 PMKID discovery, hcxdumptool
- hashcat, hcxpcapngtool, hcxdumptool, aircrack-ng
- rockyou.txt, wordlists, mask, rules
- Wireshark 802.11 PMKID
- OWASP, NIST

---

*Next: Module 10 WPS — Architecture, PIN, halves flaw, enumeration, exploitation, defense*

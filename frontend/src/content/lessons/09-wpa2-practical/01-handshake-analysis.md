# WPA2 Practical — Handshake Analysis Lab Professional

## Learning Objectives
- Master handshake analysis: beacon RSN, probe, auth, assoc, EAPOL M1-M4 identification, ANonce/SNonce/MIC/replay/GTK
- Learn completeness check: M1-M4 vs M1+M2 vs M2+M3, replay counter 1,1,2,2, BSSID/client consistency, ANonce/SNonce/MIC present
- Understand tshark and PcapInspector for handshake extraction, frame numbers, filters, evidence chain
- Build VAPT evidence: PCAP hash, BSSID, client, SSID, channel, security, RSN, PMF, WPS, M1-M4 frame numbers, ANonce, SNonce, MIC, replay, GTK, PMKID
- Learn offline audit authorized: SSID, BSSID, client, ANonce, SNonce, MIC, EAPOL M2, wordlist, hashcat 22000, ethics
- Understand PMKID lab: clientless single frame, PMKID formula, filter, evidence

## Theory

### Lab Objective — wpa2-handshake.pcapng (11-12 frames, self-generated)

**Artifact:**
- **File:** `wpa2-handshake.pcapng` (11-12 frames, Scapy-generated, real 802.11 frames, zero-cost simulated)
- **Generated:** Scapy, BSSID AA:BB:CC:DD:EE:FF, Client 11:22:33:44:55:66, SSID LAB-WPA2, Channel 6, 2.4 GHz, Security WPA2-PSK CCMP PSK, PMF capable (not required), no WPS, Passphrase `WiFiForgeLab123!` for authorized audit lab only, PCAP hash SHA256, Size ~2.3 KB, Tool Scapy 2.5.0, Method scapy
- **Parser:** Backend `/api/pcaps/wpa2-handshake/analyze` → scapy method (tshark fallback) → frames, summary SSIDs, BSSIDs, clients, beacons, probes, EAPOL, etc.
- **For PT:** Self-generated, BSSID AA:BB:CC:DD:EE:FF, SSID LAB-*, no public Wi-Fi targeting, authorized lab only, wordlist only contains lab passphrase for demo, document as authorized lab

**For this academy:** Simulated labs use PCAPs — zero-cost, no hardware, no monitor mode in browser, safe — PcapInspector with filter presets for beacon, probe, EAPOL, etc., plus ReconMap for channel map — professional VAPT depth.

### Tasks — Detailed

#### 1. Beacon Analysis — RSN IE, Channel, Security, PMF, WPS

**Filter:** `wlan.fc.type_subtype==8` — beacons

**Tasks:**
- SSID? LAB-WPA2 — `wlan_mgt.ssid==LAB-WPA2`
- BSSID? AA:BB:CC:DD:EE:FF — `wlan.bssid==AA:BB:CC:DD:EE:FF`
- Channel? 6 — `wlan_mgt.ds.current_channel==6` — DS Parameter Set Channel 6, 2.4 GHz, 2437 MHz
- Security? WPA2-PSK CCMP PSK — RSN IE Tag 48 Version 1 Group CCMP Pairwise CCMP AKM PSK — `wlan_mgt.rsn.gcs.type==4`, `wlan_mgt.rsn.pcs.type==4`, `wlan_mgt.rsn.akms.type==2`
- PMF? Capable (MFPC=1 MFPR=0) or disabled (0/0)? Check RSN Capabilities — `wlan_mgt.rsn.capabilities.mfpc`, `mfpr` — in wpa2-handshake.pcapng, PMF capable? Actually PMF disabled? Let's check — in many lab PCAPs, PMF disabled (0/0) or capable (1/0) — should be required (1/1) — finding if disabled
- WPS? Present? Check WPS IE Tag 221 OUI 00:50:F2:04 — filter `wps` — in wpa2-handshake.pcapng, no WPS — good
- Vendor? OUI AA:BB:CC Lab — `wlan.bssid` OUI
- Signal? -50 dBm (simulated, not real RF)
- Beacon interval? 100 TU = 102.4ms
- Rates? Supported Rates, Extended Rates
- HT? HT Capabilities Channel Width 20/40, etc.

**PcapInspector:**
- Summary bar: SSIDs 1 LAB-WPA2, BSSIDs 1 AA:BB:CC:DD:EE:FF, clients 1 11:22:33:44:55:66, beacons 2, probes 2, EAPOL 4, etc.
- Filter Beacons preset or `wlan.fc.type_subtype==8` → 2 beacons f1-2 SSID LAB-WPA2 BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK PMF capable? No WPS
- Click beacon f1 → Detail shows SSID, BSSID, channel, RSN IE CCMP PSK, PMF, WPS, vendor, signal, etc.

**Evidence:**
```
Beacon f1 SSID LAB-WPA2 BSSID AA:BB:CC:DD:EE:FF Ch6 2.4 GHz 20 MHz WPA2-PSK CCMP PSK PMF capable (MFPC=1 MFPR=0) no WPS vendor Lab OUI AA:BB:CC signal -50 dBm beacon interval 100
Filter: wlan.fc.type_subtype==8 && wlan.bssid==AA:BB:CC:DD:EE:FF
PCAP: wpa2-handshake.pcapng SHA256 abc123...
```

#### 2. Handshake Identification — M1-M4, ANonce, SNonce, MIC, Replay, GTK, Completeness

**Filter:** `eapol` — EAPOL

**Tasks:**
- How many EAPOL frames? 4 — M1-M4 complete — or 2? Check — in wpa2-handshake.pcapng, 4 EAPOL M1-M4 complete
- Are they complete? Check replay counter pattern: M1 replay 1, M2 replay 1, M3 replay 2, M4 replay 2 — if pattern 1,1,2,2 complete — if only M1+M2 or M2+M3, partial but enough for hashcat — M1+M2 enough, M2+M3 also enough — but full M1-M4 ideal
- BSSID and Client MAC consistent? All 4 EAPOL same BSSID AA:BB:CC:DD:EE:FF and same client 11:22:33:44:55:66 — check SA/DA alternating
- ANonce and SNonce present? M1 ANonce 32 bytes random, M2 SNonce 32 bytes random — check EAPOL keydes nonce field
- MIC present in M2, M3, M4? M1 MIC 0, M2 MIC valid, M3 MIC valid, M4 MIC valid — MIC = HMAC-SHA1(KCK, EAPOL frame)
- GTK present in M3? M3 Key Data contains GTK encrypted with KEK — check
- RSN IE present in M2 and M3? M2 RSN IE client's, M3 RSN IE AP's? Check

**PcapInspector:**
- Filter EAPOL preset or `eapol` → 4 frames f8-11? Actually f8 M1, f9 M2, f10 M3, f11 M4 — or f9-12 depending — check
- Table: No, Type EAPOL M1-M4, SSID, BSSID, SA, DA, Channel, Summary with ANonce, SNonce, MIC, replay
- Click EAPOL M1 f8 → Detail shows ANonce aabbccddeeff... 32 bytes, replay 1, SA BSSID DA client, MIC 0, key data length 0
- Click M2 f9 → SNonce 112233... MIC valid, replay 1, SA client DA BSSID, RSN IE
- Click M3 f10 → GTK encrypted, MIC, replay 2, SA BSSID DA client
- Click M4 f11 → ACK MIC, replay 2, SA client DA BSSID

**Wireshark:**
```
eapol && wlan.bssid==AA:BB:CC:DD:EE:FF
# Look for 4 messages with same BSSID, client, replay counter pattern
# M1: AP→Client, no MIC, ANonce
# M2: Client→AP, MIC, SNonce
# M3: AP→Client, MIC, GTK
# M4: Client→AP, MIC, ACK
```

**Evidence:**
```
PCAP: wpa2-handshake.pcapng SHA256 abc123... Size 2.3 KB Frames 11-12 Tool Scapy 2.5.0
BSSID: AA:BB:CC:DD:EE:FF
Client: 11:22:33:44:55:66
SSID: LAB-WPA2
Channel: 6
Security: WPA2-PSK CCMP PSK PMF capable (MFPC=1 MFPR=0) no WPS
Frames:
  Beacon f1 SSID LAB-WPA2 BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK
  Probe Req f3 SA 11:22:33:44:55:66 SSID LAB-WPA2 PNL
  Probe Resp f4 SA BSSID DA client SSID LAB-WPA2
  Auth f5 seq1 SA client DA BSSID algo 0, f6 seq2 SA BSSID DA client status0
  Assoc Req f7 SA client DA BSSID SSID LAB-WPA2 RSN CCMP PSK
  Assoc Resp f8 SA BSSID DA client status0 AID1
  M1 f9 ANonce aabbccddeeff00112233445566778899... 32 bytes replay 1 SA BSSID DA client MIC 0 key data len 0
  M2 f10 SNonce 112233445566778899aabbccddeeff... MIC valid 123456... replay 1 SA client DA BSSID RSN IE
  M3 f11 GTK encrypted 789abc... MIC valid replay 2 SA BSSID DA client RSN IE
  M4 f12 ACK MIC def012... replay 2 SA client DA BSSID
Complete: Yes M1-M4 complete replay 1,1,2,2 BSSID/client consistent ANonce/SNonce/MIC present GTK present
Filter: eapol && wlan.bssid==AA:BB:CC:DD:EE:FF
Commands: tshark -r wpa2-handshake.pcapng -Y "eapol" -T fields -e frame.number -e wlan.bssid -e wlan.sa -e wlan.da -e eapol.keydes.nonce -e eapol.keydes.mic -e eapol.keydes.replay_counter -E header=y
```

#### 3. Evidence Collection — Chain of Custody

**Must include:**
- PCAP file name + SHA256 hash — e.g., `wpa2-handshake.pcapng SHA256 abc123...`
- Frame numbers M1-M4 — e.g., M1 f9, M2 f10, M3 f11, M4 f12
- ANonce, SNonce, MIC, replay counter, BSSID, client MAC, SSID, channel, security, RSN, PMF, WPS, vendor, signal
- Filters used — e.g., `wlan.fc.type_subtype==8`, `eapol`, `wlan.bssid==AA:BB:CC:DD:EE:FF`
- Commands — e.g., `tshark -r wpa2-handshake.pcapng -Y "eapol" -T fields ...`
- Config hash if applicable — `sha256sum hostapd.conf`
- Screenshots? But text evidence reproducible is better — frame numbers + filters + hash

**For PT:** Evidence must be reproducible — anyone with PCAP and filters should get same frame numbers, BSSID, etc.

#### 4. Offline Audit (Authorized, Lab Only) — Tools, Wordlists, Ethics

**Important:** Only audit captures you generated or have explicit authorization for. Never audit public Wi-Fi. This PCAP is self-generated with known passphrase `WiFiForgeLab123!` for lab demo only.

**Wordlists:**
- Rockyou.txt — 14M passwords — common, but contains weak passwords like `password123`, `12345678`, `WeakPass123`, etc. — not strong PSK 20+ random
- Weak passwords, SSID-based — e.g., company name + year, etc. — custom wordlists
- For lab, only use lab wordlist containing `WiFiForgeLab123!` — e.g., `/tmp/lab-wordlist.txt` with `WiFiForgeLab123!` and `password123`
- For PT: Strong PSK 20+ random not in wordlists — audit should fail for strong PSK — evidence audit fails

**Tools (Kali):**
```bash
# Convert PCAP to hashcat 22000 format (authorized capture)
hcxpcapngtool -o wpa2-handshake.hc22000 wpa2-handshake.pcapng
# Check output: 1 handshake found, 0 PMKID

# Audit with hashcat (authorized, lab only)
hashcat -m 22000 wpa2-handshake.hc22000 /tmp/lab-wordlist.txt --force
# --force needed if not full handshake? Use authorized
# Should crack: LAB-WPA2:WiFiForgeLab123! if wordlist contains it

# Or aircrack-ng older
aircrack-ng -w /tmp/lab-wordlist.txt wpa2-handshake.pcapng
# Should crack: KEY FOUND! [ WiFiForgeLab123! ]

# tshark to extract handshake
tshark -r wpa2-handshake.pcapng -Y "eapol" -T fields -e frame.number -e wlan.bssid -e wlan.sa -e wlan.da -e eapol.keydes.nonce -e eapol.keydes.mic -e eapol.keydes.replay_counter -E header=y

# PMKID
hcxpcapngtool -o pmkid.hc22000 pmkid.pcapng
hashcat -m 22000 pmkid.hc22000 wordlist.txt
```

**Ethics:**
- Only use on lab PCAPs like `wpa2-handshake.pcapng` which we generated with known passphrase `WiFiForgeLab123!`
- Never audit public Wi-Fi, only own lab with explicit ROE
- Document as authorized lab — PCAP self-generated, BSSID AA:BB:CC:DD:EE:FF, SSID LAB-*, etc.
- For PT: Offline audit is for weak PSK detection — if PSK weak (in wordlist), High finding — recommend strong PSK 20+ random not in wordlists

**Evidence for audit:**
```
Wordlist: /tmp/lab-wordlist.txt containing WiFiForgeLab123! and password123
Hashcat mode: 22000
Command: hashcat -m 22000 wpa2-handshake.hc22000 /tmp/lab-wordlist.txt --force
Result: Cracked LAB-WPA2:WiFiForgeLab123! if weak? Actually WiFiForgeLab123! is strong? 16 chars with upper lower digits symbols? But for lab demo, it's in wordlist, so crackable — but real strong PSK 20+ random not in wordlists should fail — for PT, if PSK weak like WeakPass123, crackable, High finding — if strong 20+ random, audit fails, good
```

#### 5. PMKID Lab — Clientless Single Frame

**File:** `pmkid.pcapng` (2 frames, Scapy-generated)

- Frame 1: Beacon LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK
- Frame 2: EAPOL M1 SA BSSID DA Client? Or broadcast? Contains PMKID in EAPOL key data: `aabbccddeeff00112233445566778899` — PMKID = HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC) — 16 bytes

**Filter:**
```
wlan_mgt.rsn.pmkid
eapol && wlan_mgt.rsn.pmkid
wlan_rsna_eapol.pmkid
eapol && wlan_rsna_eapol.pmkid
```

**Evidence:**
```
PCAP: pmkid.pcapng SHA256 def456... Size 1.2 KB Frames 2 Tool Scapy
BSSID: AA:BB:CC:DD:EE:FF
STA MAC: 11:22:33:44:55:66
SSID: LAB-PMKID or LAB-WIFI
Channel: 6
Security: WPA2-PSK CCMP PSK
Frame: M1 f2 SA BSSID DA STA MAC PMKID aabbccddeeff00112233445566778899 in key data RSN IE PMKID Count 1 PMKID aabb...
Filter: wlan_rsna_eapol.pmkid
Commands: tshark -r pmkid.pcapng -Y "wlan_rsna_eapol.pmkid" -T fields -e frame.number -e wlan.bssid -e wlan.sa -e wlan_mgt.rsn.pmkid
```

**Impact:** Same as handshake — network access if weak PSK — but easier to capture — no need for client, no deauth, single frame — clientless — less detection — but still requires weak PSK to crack — strong PSK mitigates

**Defense:** Same as handshake + PMF required + strong PSK + WPA3 — strong PSK 20+ random not in wordlists, PMF required ieee80211w=2, WPA3 where possible SAE resists offline audit

#### 6. Impact & Recommendation

- **If PSK weak (in wordlist, e.g., WeakPass123, password123, Company2023):** Impact = network access, lateral movement, client isolation bypass if ap_isolate=0, data theft, pivot — High finding — CVSS 7.5? Actually weak PSK High — if weak PSK and handshake captured, network access — High
- **If PSK strong 20+ random not in wordlists:** Audit fails — good — no finding for weak PSK, but check PMF, WPS, etc.
- **Recommendation:** Strong PSK 20+ chars random not in wordlists not SSID-related unique per SSID rotated stored securely via pwgen, openssl, Python secrets, PMF required ieee80211w=2, consider WPA3-SAE where possible (forward secrecy, resists offline audit), no WPS wps_state=0, monitor for deauth floods WIDS, training

### VAPT Methodology — Recon → Enum → Test → Validate → Evidence → Impact → Recommendation → Retest

1. **Recon:** Find APs via beacons — `wlan.fc.type_subtype==8` — SSID, BSSID, channel, security, RSN, PMF, WPS, vendor, signal
2. **Enum:** Check RSN IE CCMP vs TKIP, AKM PSK vs SAE vs EAP, PMF MFPC/MFPR, WPS IE 00:50:F2:04, weak PSK? Check config if available, etc.
3. **Test:** Is handshake capturable? Is PMKID present? (Lab: analyze PCAP via PcapInspector filter eapol, wlan_rsna_eapol.pmkid) — for real RF, passive wait for client assoc or active deauth if authorized and PMF not required and lab (hardware lab)
4. **Validate:** Offline audit with authorized wordlist (lab only) — hcxpcapngtool to 22000, hashcat -m 22000 wordlist.txt — only own lab, explicit ROE, not public
5. **Evidence:** Frame numbers M1-M4, ANonce, SNonce, MIC, replay, BSSID, client, SSID, channel, RSN, PMF, WPS, PMKID, PCAP hash, filters, commands
6. **Impact:** Network access if weak PSK, lateral movement, etc. — High if weak PSK
7. **Recommendation:** Strong PSK 20+ random, PMF required, WPA3, no WPS, etc., with config snippets
8. **Retest:** Verify strong PSK fails audit, PMF required, no WPS, etc., with new PCAPs, new config hash

### Safety — Simulated Lab

- All PCAPs self-generated, BSSID AA:BB:CC:DD:EE:FF, SSID LAB-*, no public Wi-Fi targeting
- Wordlists only contain lab passphrase for demo — e.g., `WiFiForgeLab123!`
- Document as authorized lab — PCAP self-generated, etc.
- For hardware lab requiring RF adapter (ALFA), marked with prep docs, explicit ROE, own lab only

### Tools

- Wireshark, tshark — eapol, ANonce, SNonce, MIC, replay, PMKID, RSN
- PcapInspector, ConfigViewer, ReconMap — simulated lab
- hcxpcapngtool — convert PCAP to hashcat 22000: `hcxpcapngtool -o capture.22000 capture.pcapng`
- hcxdumptool — capture PMKID clientless: `hcxdumptool -i wlan0mon -o capture.pcapng --enable_status=1`
- hashcat — offline audit: `hashcat -m 22000 capture.22000 wordlist.txt`
- aircrack-ng — `aircrack-ng -w wordlist.txt capture.cap` older
- Scapy — `EAPOL`, `Dot11`, `Dot11Elt`, etc.
- `iw dev wlan0 scan` — RSN IE in scan

### Evidence Collection — Detailed

```
PCAP: wpa2-handshake.pcapng SHA256 abc123... Size 2.3 KB Frames 11-12 Tool Scapy 2.5.0 Method scapy
BSSID: AA:BB:CC:DD:EE:FF
Client: 11:22:33:44:55:66
SSID: LAB-WPA2
Channel: 6
Band: 2.4 GHz
Security: WPA2-PSK CCMP PSK PMF capable (MFPC=1 MFPR=0) no WPS vendor Lab OUI AA:BB:CC signal -50 dBm beacon interval 100
Frames:
  Beacon f1 SSID LAB-WPA2 BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK
  Beacon f2 same
  Probe Req f3 SA 11:22:33:44:55:66 SSID LAB-WPA2 PNL
  Probe Resp f4 SA BSSID DA client SSID LAB-WPA2
  Auth f5 seq1 SA client DA BSSID algo 0, f6 seq2 SA BSSID DA client status0
  Assoc Req f7 SA client DA BSSID SSID LAB-WPA2 RSN CCMP PSK
  Assoc Resp f8 SA BSSID DA client status0 AID1
  M1 f9 ANonce aabbccddeeff00112233445566778899... 32 bytes replay 1 SA BSSID DA client MIC 0 key data len 0
  M2 f10 SNonce 112233445566778899aabbccddeeff... MIC valid 123456... replay 1 SA client DA BSSID RSN IE
  M3 f11 GTK encrypted 789abc... MIC valid replay 2 SA BSSID DA client RSN IE
  M4 f12 ACK MIC def012... replay 2 SA client DA BSSID
Complete: Yes M1-M4 complete replay 1,1,2,2 BSSID/client consistent ANonce/SNonce/MIC present GTK present
Filter: eapol && wlan.bssid==AA:BB:CC:DD:EE:FF
Commands: tshark -r wpa2-handshake.pcapng -Y "eapol" -T fields -e frame.number -e wlan.bssid -e wlan.sa -e wlan.da -e eapol.keydes.nonce -e eapol.keydes.mic -e eapol.keydes.replay_counter -E header=y
Wordlist: /tmp/lab-wordlist.txt containing WiFiForgeLab123! and password123
Hashcat: hcxpcapngtool -o wpa2-handshake.hc22000 wpa2-handshake.pcapng && hashcat -m 22000 wpa2-handshake.hc22000 /tmp/lab-wordlist.txt --force
Result: Cracked LAB-WPA2:WiFiForgeLab123! if wordlist contains it — for strong PSK 20+ random not in wordlists, audit fails — good
PMKID: pmkid.pcapng SHA256 def456... Frame 2 PMKID aabbccddeeff00112233445566778899 BSSID AA:BB:CC:DD:EE:FF STA MAC 11:22:33:44:55:66 SSID LAB-PMKID filter wlan_rsna_eapol.pmkid
```

### Attack → Defense → Retest

- **Attack:** Capture handshake via passive wait for client assoc or active deauth if authorized and PMF not required and lab (hardware), extract ANonce, SNonce, MIC, BSSID, client, SSID, convert to 22000 via hcxpcapngtool, offline audit with wordlist if weak PSK and authorized (lab). Or capture PMKID via hcxdumptool clientless single frame, convert to 22000, offline audit.
- **Defense:** Strong PSK 20+ random not in wordlists, PMF required ieee80211w=2, disable WPS wps_state=0, WPA3-only SAE PMF required for better, strong RADIUS secret for Enterprise, cert validation, WIDS, monitoring
- **Retest:** New PCAPs show no handshake capture if PMF required deauth fails, strong PSK audit fails, PMKID still present but strong PSK audit fails, WPA3-only no handshake capture, etc.

### Interactive Check

> You have wpa2-handshake.pcapng 11 frames. What are BSSID, client, SSID, channel, security, PMF, WPS, handshake complete? What are ANonce, SNonce, MIC, replay? What is needed for offline audit, tools, ethics? What about pmkid.pcapng?

Answer: BSSID AA:BB:CC:DD:EE:FF, Client 11:22:33:44:55:66, SSID LAB-WPA2, Channel 6, Security WPA2-PSK CCMP PSK, PMF capable (MFPC=1 MFPR=0) not required — should be required — Medium, WPS not present good. Handshake complete M1-M4 f9-12 ANonce f9 SA BSSID DA client replay1 32 bytes, SNonce f10 SA client DA BSSID replay1 MIC, GTK f11 SA BSSID DA client replay2 MIC, ACK f12 SA client DA BSSID replay2 MIC. Need SSID, BSSID, client, ANonce, SNonce, MIC, EAPOL M2, wordlist, tools hcxpcapngtool to 22000 and hashcat -m 22000, ethics only authorized lab PCAPs own lab explicit ROE not public. PMKID pcap 2 frames f2 PMKID aabb... BSSID AA:BB:CC:DD:EE:FF STA MAC 11:22:33:44:55:66 clientless single frame no deauth.

## References

- IEEE 802.11i WPA2, 802.11w PMF, 802.11r PMKID, 802.11-2020
- Wireshark 802.11 EAPOL, RSN, PMKID
- hashcat, hcxpcapngtool, hcxdumptool, aircrack-ng
- Steube and Gristina 2018 PMKID
- OWASP, NIST

---

*Next: Offline Audit — Wordlists, Hashcat, Evidence, Defense, Retest*

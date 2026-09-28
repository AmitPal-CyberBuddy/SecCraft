# PMF & RSN Analysis — MFPC/MFPR, IGTK, BIP, SA Query, Defense

## Learning Objectives
- Master RSN IE deep dive: Version, Group Cipher, Pairwise Cipher, AKM, Capabilities, PMKID, Group Management Cipher
- Understand PMF 802.11w: capable vs required vs disabled, MFPC/MFPR bits, IGTK, BIP, SA Query procedure
- Learn RSN Capabilities: PreAuth, No Pairwise, PTKSA/GTKSA Replay Counter, MFPC/MFPR, Joint Multi-Band, PeerKey, etc.
- Understand PMF defense: prevents spoofed deauth/disassoc/action, SA Query prevents session hijacking, WPA3 mandates required
- Build VAPT evidence: beacon RSN IE CCMP PSK/SAE MFPC/MFPR, filter wlan_mgt.rsn.capabilities.mfpc/mfpr, config ieee80211w, frame numbers, hash
- Learn remediation: PMF required ieee80211w=2 for all, CCMP only, no TKIP, no WPS, WPA3-only, WIDS detection of deauth flood

## Theory

### RSN IE Deep Dive — Tag 48

**RSN IE (Robust Security Network Information Element) Tag 48 Length variable — in Beacon and Probe Response and Assoc Request/Response and EAPOL M2/M3 key data — contains security parameters for RSN (WPA2/WPA3).**

**Structure (IEEE 802.11-2020):**
```
Tag Number: 48 (1 byte)
Tag Length: variable (1 byte)
RSN Version: 1 (2 bytes) — Version 1 for RSN
Group Cipher Suite: OUI + Type (4 bytes) — e.g., 00-0F-AC-04 CCMP, 00-0F-AC-02 TKIP
Pairwise Cipher Suite Count: 2 bytes — number of pairwise ciphers
Pairwise Cipher Suite List: 4 bytes each — e.g., CCMP
AKM Suite Count: 2 bytes — number of AKMs
AKM Suite List: 4 bytes each — e.g., PSK 00-0F-AC-02, SAE 00-0F-AC-08, EAP 00-0F-AC-01
RSN Capabilities: 2 bytes — bit field
PMKID Count: 2 bytes (optional) — number of PMKIDs
PMKID List: 16 bytes each (optional) — PMKID = HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC)
Group Management Cipher Suite: 4 bytes (optional) — for PMF — e.g., BIP 00-0F-AC-06
```

**Group Cipher Suite:**
- CCMP (00-0F-AC-04) — good — AES-CCMP 128-bit — should be CCMP only
- TKIP (00-0F-AC-02) — bad deprecated — RC4, not CCMP — should not be used — Medium finding if present
- WEP40 (00-0F-AC-01) — bad — WEP 40-bit — Critical
- WEP104 (00-0F-AC-05) — bad — WEP 104-bit — Critical
- BIP (00-0F-AC-06) — for Group Management — PMF — BIP
- Group addressed traffic not allowed (00-0F-AC-07)? Actually 00-0F-AC-07 is Group addressed traffic not allowed? Let's not deep.

**Pairwise Cipher Suite:**
- CCMP (00-0F-AC-04) — good — pairwise CCMP — should be CCMP only
- TKIP (00-0F-AC-02) — bad deprecated
- CCMP-256? Actually 00-0F-AC-08 CCMP-256? For WPA3? 00-0F-AC-08 is GCMP-256? Let's check: 00-0F-AC-08 is GCMP-128? Actually for WPA3, GCMP-256? But for PT, CCMP good.

**AKM Suite (Authentication and Key Management):**
- EAP (00-0F-AC-01) — WPA2-EAP Enterprise — 802.1X
- PSK (00-0F-AC-02) — WPA2-PSK Personal — PBKDF2
- FT over EAP (00-0F-AC-03) — Fast Transition over EAP — 802.11r
- FT over PSK (00-0F-AC-04) — FT over PSK
- WPA (00-0F-AC-05) — WPA (not RSN) — old — actually WPA AKM? But RSN IE for WPA2, not WPA
- WPA-PSK (00-0F-AC-06) — WPA-PSK — old
- SAE (00-0F-AC-08) — WPA3-Personal SAE — Dragonfly — good — forward secrecy
- FT over SAE (00-0F-AC-09) — FT over SAE
- AP-PEER-KEY (00-0F-AC-10) — AP Peer Key
- EAP-SHA256 (00-0F-AC-11) — EAP with SHA256
- PSK-SHA256 (00-0F-AC-12) — PSK with SHA256
- TDLS (00-0F-AC-13) — Tunneled Direct Link Setup
- SAE-SHA256? Actually 00-0F-AC-14? Let's not deep.
- FT over EAP-SHA384 (00-0F-AC-15)
- FT over PSK-SHA384 (00-0F-AC-16)
- etc.

**For PT:** Check AKM — PSK (2) for WPA2-PSK, SAE (8) for WPA3-Personal, EAP (1) for Enterprise, PSK+SAE (2+8) for transition mode — transition mode has both PSK and SAE AKMs — PMF optional in transition, downgrade risk.

**RSN Capabilities (2 bytes, bit field):**
- Bit 0: PreAuth — 1 = AP supports pre-authentication for fast roaming — pre-auth via DS? Actually PreAuth via DS or over air?
- Bit 1: No Pairwise — 1 = AP doesn't support pairwise? Actually No Pairwise = 1 means AP doesn't support pairwise? But usually 0.
- Bit 2-3: PTKSA Replay Counter — 00 = 1 replay counter per PTKSA, 01 = 2, 10 = 4, 11 = 16 — number of replay counters for PTKSA
- Bit 4-5: GTKSA Replay Counter — 00 = 1, 01 = 2, 10 = 4, 11 = 16 — for GTKSA
- Bit 6: Management Frame Protection Capable MFPC — 1 = capable, 0 = not capable
- Bit 7: Management Frame Protection Required MFPR — 1 = required, 0 = not required — MFPC=0 MFPR=0 disabled, MFPC=1 MFPR=0 capable optional, MFPC=1 MFPR=1 required
- Bit 8: Joint Multi-Band RSNA — 1 = supported
- Bit 9: PeerKey Enabled — 1 = enabled
- Bit 10: Reserved
- Bit 11: Reserved? Actually bit 11 is? Let's check IEEE: Bit 10-11? Bit 12: Extended Key ID for Individually Addressed Frames? Actually 802.11-2020 added Extended Key ID? But for PT, MFPC/MFPR important.
- Bit 12-15: Reserved

**Example RSN Capabilities 0x0000:**
- MFPC=0 MFPR=0 — PMF disabled — bad — Medium finding — deauth possible

**Example 0x00C0? Actually MFPC bit 6 = 0x40, MFPR bit 7 = 0x80 — so MFPC=1 MFPR=0 = 0x40, MFPC=1 MFPR=1 = 0xC0 (0x40+0x80) — so RSN Capabilities 0x0000 disabled, 0x0040 capable, 0x00C0 required? Actually little endian? RSN Capabilities 2 bytes — e.g., 0x0000, 0x0040, 0x00C0 — but Wireshark shows MFPC/MFPR booleans.

**PMKID Count/List:**
- For fast roaming 802.11r — PMKID = HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC) — 16 bytes — AP may include PMKID in RSN IE or EAPOL M1 key data — clientless capture
- Count 0 = no PMKID, Count 1 = one PMKID, etc.
- For PT: PMKID present — clientless offline audit possible — but requires weak PSK to crack — strong PSK mitigates

**Group Management Cipher Suite:**
- For PMF — integrity for broadcast management frames — BIP (00-0F-AC-06) — Broadcast/Multicast Integrity Protocol — AES-CMAC — or BIP-GMAC-128, BIP-GMAC-256, BIP-CMAC-256 for WPA3?
- Example: Group Management Cipher BIP (00-0F-AC-06) — good for PMF

**For PT:** RSN IE analysis is core for beacon — check Group CCMP, Pairwise CCMP, AKM PSK/SAE/EAP, MFPC/MFPR, PMKID, Group Management BIP, etc.

**Wireshark filters:**
```
wlan_mgt.rsn.version
wlan_mgt.rsn.gcs.type==4  # CCMP group
wlan_mgt.rsn.pcs.type==4  # CCMP pairwise
wlan_mgt.rsn.akms.type==2 # PSK
wlan_mgt.rsn.akms.type==8 # SAE
wlan_mgt.rsn.akms.type==1 # EAP
wlan_mgt.rsn.capabilities.mfpc
wlan_mgt.rsn.capabilities.mfpr
wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==1  # PMF required
wlan_mgt.rsn.capabilities.mfpc==0 && wlan_mgt.rsn.capabilities.mfpr==0  # PMF disabled
wlan_mgt.rsn.pmkid
wlan_mgt.rsn.gmcs.type==6  # BIP
```

### PMF 802.11w — Capable vs Required vs Disabled — IGTK, BIP, SA Query

**PMF (Protected Management Frames) 802.11w-2009 — amendment to 802.11 — protects management frames (deauth subtype 12, disassoc subtype 10, action subtype 13) with MIC — prevents spoofed deauth/disassoc/action DoS and handshake capture via deauth — also prevents session hijacking via SA Query.**

**Without PMF:**
- Management frames unauthenticated — attacker can spoof deauth/disassoc with SA BSSID DA client or SA client DA BSSID BSSID BSSID reason 7 — client will disconnect — DoS — and then client will re-auth, re-assoc, re-handshake — attacker can capture handshake via deauth — if PSK weak, offline audit — also Evil Twin facilitation — deauth client from legit AP, client may auto-connect to rogue AP with same SSID if stronger signal and PSK known or Enterprise no cert validation
- For PT: Without PMF, deauth possible — Medium finding — handshake capture via deauth — DoS — Evil Twin

**With PMF Capable (MFPC=1, MFPR=0) — ieee80211w=1:**
- Client and AP both support PMF — negotiate — if both capable, management frames protected with MIC using IGTK and BIP — but if client not capable, no PMF — downgrade possible — attacker can force client to associate without PMF? Actually if AP capable but not required, client that doesn't support PMF can still associate without PMF — so management frames for that client not protected — downgrade possible — better than disabled, but not required — Medium? Actually capable is better than disabled, but still not required — should be required
- **IGTK (Integrity GTK):** For protecting broadcast management frames — derived from IPMK (Integrity Pairwise Master Key?) Actually IGTK is integrity key for management — BIP — Group Management — sent in M3? Actually IGTK is for PMF — integrity for broadcast management frames — derived from IPMK? Let's not deep — IGTK is for BIP
- **BIP (Broadcast/Multicast Integrity Protocol):** For integrity for broadcast management frames — AES-CMAC — Group Management Cipher BIP (00-0F-AC-06) — or BIP-GMAC-128, etc. for WPA3
- **SA Query (Security Association Query):** Procedure to prevent spoofed association? Actually SA Query is for PMF — if AP receives assoc request with same MAC but different, SA Query to verify — prevents session hijacking — e.g., attacker spoofs client MAC and sends assoc request to AP, AP will send SA Query request to client, client responds with SA Query response, AP checks if client is legit — if client doesn't respond, AP knows spoofed — prevents session hijacking

**With PMF Required (MFPC=1, MFPR=1) — ieee80211w=2:**
- Management frames must be protected — client must support PMF, otherwise association denied — prevents spoofed deauth/disassoc — best — WPA3 mandates required, WPA2 should have required
- **SA Query:** Required for PMF required — prevents session hijacking
- **IGTK and BIP:** Required

**Config:**
- `ieee80211w=0` — PMF disabled — vulnerable — bad — Medium finding — deauth possible
- `ieee80211w=1` — PMF capable optional — better, but downgrade possible — Medium? Actually capable is better than disabled, but still not required — should be required — recommendation required
- `ieee80211w=2` — PMF required — best — prevents deauth spoofing — good — WPA3-only mandates required

**For PT:** Check beacon RSN Capabilities MFPC/MFPR — 0/0 disabled, 1/0 capable, 1/1 required — should be 1/1 — filter `wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==1` — if 0/0, Medium finding — deauth possible, handshake capture via deauth, DoS, Evil Twin facilitation.

**WPA3 requires PMF required — if WPA3 with PMF disabled or capable, misconfig — High? Actually WPA3 mandates PMF required — if WPA3 beacon shows PMF disabled or capable, it's misconfig — should be required — High finding?**

**Deauth flood detection:**
- Without PMF, deauth frames unauthenticated — attacker can flood deauth — many deauth same BSSID short interval — WIDS should detect — e.g., 10 deauth in 1 sec same BSSID — alert deauth flood DoS
- Filter: `wlan.fc.type_subtype==12` — deauth — count per BSSID per time — if many, likely attack

**For PT:** PMF required prevents deauth flood — with PMF required, client ignores spoofed deauth without valid MIC — deauth fails — no DoS, no handshake capture via deauth.

### RSN IE Examples — Good vs Bad

**Good RSN IE WPA2-PSK CCMP PMF required no WPS:**
```
Tag 48 RSN IE Length 20
  Version: 1
  Group Cipher: CCMP (00-0F-AC-04)
  Pairwise Cipher Count: 1
    CCMP (00-0F-AC-04)
  AKM Count: 1
    PSK (00-0F-AC-02)
  RSN Capabilities: 0x00C0 (MFPC=1 MFPR=1 PMF required)
  PMKID Count: 0
  Group Management Cipher: BIP (00-0F-AC-06)
```
- Group CCMP good, Pairwise CCMP good, AKM PSK good (or SAE for WPA3), MFPC=1 MFPR=1 PMF required good, BIP good, no WPS, no TKIP

**Good WPA3-only:**
```
Tag 48 RSN IE Length 20
  Version: 1
  Group Cipher: CCMP (00-0F-AC-04)
  Pairwise Cipher Count: 1
    CCMP (00-0F-AC-04)
  AKM Count: 1
    SAE (00-0F-AC-08)
  RSN Capabilities: 0x00C0 (MFPC=1 MFPR=1 PMF required)
  PMKID Count: 0
  Group Management Cipher: BIP (00-0F-AC-06) or BIP-GMAC-256?
```
- AKM SAE, PMF required, CCMP, BIP — good

**Bad RSN IE WPA2-PSK TKIP PMF disabled WPS enabled:**
```
Tag 48 RSN IE Length 20
  Version: 1
  Group Cipher: TKIP (00-0F-AC-02) — bad deprecated
  Pairwise Cipher Count: 1
    TKIP (00-0F-AC-02) — bad
  AKM Count: 1
    PSK (00-0F-AC-02)
  RSN Capabilities: 0x0000 (MFPC=0 MFPR=0 PMF disabled) — bad Medium
  PMKID Count: 0
  Group Management Cipher: none (no PMF)
Tag 221 Vendor Specific OUI 00:50:F2:04 WPS IE — WPS enabled — bad High 11k PIN flaw
```
- TKIP bad, PMF disabled bad, WPS enabled bad

**Bad Transition mode PSK+SAE PMF optional downgrade risk:**
```
Tag 48 RSN IE Length 24
  Version: 1
  Group Cipher: CCMP
  Pairwise Cipher Count: 1
    CCMP
  AKM Count: 2
    PSK (00-0F-AC-02)
    SAE (00-0F-AC-08) — transition PSK+SAE
  RSN Capabilities: 0x0040 (MFPC=1 MFPR=0 PMF capable optional) — bad, should be required, downgrade risk
  PMKID Count: 0
  Group Management Cipher: BIP
```
- Transition PSK+SAE, same password for WPA2 and WPA3, PMF optional, downgrade to WPA2 + deauth possible, handshake capture, offline audit if weak PSK — Medium finding — recommend WPA3-only

### VAPT Evidence — RSN, PMF, WPS

**Beacon:**
- SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK PMF required MFPC=1 MFPR=1 BIP, no WPS, no TKIP, frame number, PCAP hash, filter `wlan.fc.type_subtype==8 && wlan.bssid==AA:BB:CC:DD:EE:FF`

**Config:**
- hostapd.conf wpa=2 wpa_key_mgmt=WPA-PSK or SAE rsn_pairwise=CCMP wpa_passphrase or sae_password strong 20+ random ieee80211w=2 wps_state=0 hash SHA256

**Deauth:**
- If PMF disabled, deauth frames filter `wlan.fc.type_subtype==12 && wlan.bssid==AA:BB:CC:DD:EE:FF` — count, reason codes, etc. — evidence deauth possible

**WPS:**
- WPS IE Tag 221 OUI 00:50:F2:04 — filter `wps` or `wlan_mgt.tag.oui==00:50:f2:04` — frame number, BSSID, etc.

### Remediation — PMF Required, CCMP Only, No WPS, WPA3-Only

- **PMF required ieee80211w=2 for all — WPA2-PSK, WPA3-SAE, WPA2-EAP, WPA3-EAP — MFPC=1 MFPR=1 — prevents deauth/disassoc spoofing — SA Query**
- **CCMP only — no TKIP — rsn_pairwise=CCMP — Group CCMP — no TKIP — TKIP deprecated**
- **No WPS — wps_state=0 — no WPS IE 00:50:F2:04 — High 11k PIN flaw**
- **Strong PSK 20+ random — not in wordlists — pwgen, openssl, Python secrets**
- **WPA3-only SAE PMF required for personal — forward secrecy, resists offline audit — or WPA3-EAP EAP-TLS for enterprise**
- **WPA3-only for 6 GHz mandatory — no WPA2, no TKIP, no WEP, no open without OWE**
- **WIDS detection of deauth flood — many deauth same BSSID short interval — alert — and WEP, WPS, TKIP, PMF disabled, etc.**

### Tools

- Wireshark, tshark — RSN IE, `wlan_mgt.rsn.*`, `wps`, `wlan.fc.type_subtype==12` deauth
- PcapInspector, ConfigViewer — simulated lab
- `hostapd` — config
- `iw dev wlan0 scan` — RSN IE in scan
- `Kismet` — WIDS, deauth detection, PMF, WPS, etc.

### Evidence Collection

- Beacon: SSID, BSSID, Ch, RSN CCMP PSK/SAE/EAP, MFPC/MFPR, BIP, WPS, TKIP, frame number, PCAP hash, filter
- Config: hostapd.conf wpa, rsn_pairwise, wpa_key_mgmt, wpa_passphrase/sae_password, ieee80211w, wps_state, hash
- Deauth: Deauth frames filter, count, reason, BSSID, etc., if PMF disabled

### Attack → Defense → Retest

- **Attack:** Observe beacon RSN CCMP PSK PMF disabled MFPC=0 MFPR=0, WPS disabled? Actually check — if PMF disabled, deauth possible for handshake capture (if authorized and lab) and DoS and Evil Twin facilitation — if WPS enabled, PIN brute-force 11k — if TKIP, deprecated — if weak PSK, offline audit via hashcat
- **Defense:** CCMP only rsn_pairwise=CCMP, strong PSK 20+ random, PMF required ieee80211w=2 MFPC=1 MFPR=1 BIP, WPS disabled wps_state=0, WPA3-only SAE PMF required for better, WPA3-only for 6 GHz, WIDS detection of deauth flood and WEP/WPS/TKIP/PMF disabled, training
- **Retest:** New beacon RSN CCMP PSK/SAE PMF required MFPC=1 MFPR=1 BIP no WPS no TKIP, config hash new, new PCAPs no deauth success if PMF required (client ignores spoofed deauth), WPS filter empty, handshake audit fails for strong PSK, etc.

### Interactive Check

> You see beacon SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK MFPC=0 MFPR=0 PMF disabled, WPS disabled, TKIP not present, PSK WeakPass123. What are findings, severity, remediation, evidence?

Answer: Findings: WPA2-PSK CCMP good, but PMF disabled Medium (deauth possible, handshake capture via deauth, DoS, Evil Twin facilitation), weak PSK WeakPass123 in wordlist High (offline audit via hashcat if handshake captured), WPS disabled good, TKIP not present good. Remediation: Strong PSK 20+ random via pwgen, PMF required ieee80211w=2 MFPC=1 MFPR=1 BIP, WPS disabled already, WPA3-only SAE for better. Evidence beacon f1 SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK PMF disabled MFPC=0 MFPR=0, config wpa_passphrase=WeakPass123 ieee80211w=0, filter wlan_mgt.rsn.capabilities.mfpc==0 && mfpr==0, PCAP hash.

## References

- IEEE 802.11i-2004 WPA2, 802.11w-2009 PMF, 802.11-2020, 802.11r PMKID
- Wi-Fi Alliance WPA2, WPA3, PMF
- Wireshark 802.11 RSN IE, wlan_mgt.rsn.*
- hostapd.conf documentation
- OWASP, NIST

---

*Next: Module 09 WPA2 Practical — Handshake analysis, PMKID, offline audit authorized, wordlists, evidence*

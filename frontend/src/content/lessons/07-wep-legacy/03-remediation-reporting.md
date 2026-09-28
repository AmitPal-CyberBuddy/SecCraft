# WEP Remediation & Reporting — Migration to WPA3/WPA2

## Learning Objectives
- Master WEP remediation: migration path to WPA3-SAE and WPA2-PSK CCMP
- Learn strong PSK generation: 20+ chars random, not in wordlists, diceware, pwgen
- Understand PMF required ieee80211w=2, WPS disabled wps_state=0, WPA3-only for 6 GHz
- Build VAPT reporting: Critical finding template, CVSS 9.1, evidence chain, impact, recommendation with config snippets
- Learn retest methodology: new PCAPs, new config hash, verify no WEP beacons, no WEP data, RSN IE CCMP, PMF required, strong PSK audit fails
- Understand WIDS detection of WEP, training, audits, compliance

## Theory

### Why WEP Must Be Disabled Immediately — Critical

**WEP is cryptographically broken — not just weak, but broken — key recovery in minutes, confidentiality total loss, integrity loss, network access — Critical severity — must be disabled immediately, no exception, no legacy justification.**

**Compliance:**
- Wi-Fi Alliance: WEP prohibited for certification since 2012 — no new devices with WEP
- PCI DSS: WEP prohibited for cardholder data environment — must migrate
- NIST SP 800-153: WEP deprecated, prohibited
- OWASP: WEP Critical
- For PT: If you see WEP in scope, it's Critical finding, immediate remediation, no risk acceptance.

**Business Impact:**
- Confidentiality: All traffic decryptable with same IV if one plaintext known (ARP, DHCP, etc.) — attacker can sniff and decrypt
- Integrity: ICV CRC32 malleable — attacker can inject packets — ARP spoof, etc.
- Authentication: Shared key auth leaks keystream — keystream recovery without knowing secret
- Network Access: Key recovery PTW 40k frames 10 sec — attacker can recover secret key 12345, join network, lateral movement, data theft, pivot
- Compliance: PCI DSS fail, audit fail, legal risk

**For PT:** WEP is Critical, not High — CVSS 9.1, immediate fix, no workaround.

### Migration Path — WPA3-SAE and WPA2-PSK CCMP

**Option 1: WPA3-Personal SAE (Recommended, Best):**
- **SAE (Simultaneous Authentication of Equals) — Dragonfly:** Password-authenticated key exchange, forward secrecy, resists offline dictionary attack, not vulnerable to handshake capture like WPA2-PSK — even if handshake captured, offline audit not possible without active attack? Actually SAE has forward secrecy, resists offline audit — better than PSK.
- **PMF Required:** WPA3 mandates PMF required ieee80211w=2 — protects management frames (deauth/disassoc) — prevents deauth DoS and handshake capture via deauth
- **CCMP:** AES-CCMP for data encryption — strong
- **Config (hostapd.conf WPA3-only good):**
  ```
  interface=wlan0
  ssid=LAB-WPA3
  hw_mode=a
  channel=36
  wpa=2
  wpa_key_mgmt=SAE
  rsn_pairwise=CCMP
  sae_password=StrongRandomPassphrase123!@#With20+Chars
  ieee80211w=2
  wps_state=0
  ```
  - `wpa=2` — RSN (WPA2/WPA3)
  - `wpa_key_mgmt=SAE` — WPA3-Personal SAE only (not PSK)
  - `rsn_pairwise=CCMP` — CCMP only, no TKIP
  - `sae_password=StrongRandomPassphrase123!@#With20+Chars` — strong 20+ random, not in wordlists
  - `ieee80211w=2` — PMF required
  - `wps_state=0` — WPS disabled
  - `hw_mode=a` — 5 GHz or 6 GHz? For 6 GHz, WPA3-only mandatory, `hw_mode=a` channel 1-233? Actually 6 GHz U-NII-5-8 channels 1,5,9,... 233, WPA3-only, OWE for open
  - For 6 GHz: `hw_mode=a`, `channel=1` (6 GHz channel 1 = 5955 MHz), `wpa_key_mgmt=SAE`, `ieee80211w=2`, etc. — 6 GHz mandates WPA3-only, no WPA2

- **Pros:** Forward secrecy, resists offline audit, PMF required, strong, future-proof, 6 GHz compatible
- **Cons:** Older clients may not support WPA3 — need WPA3-capable clients (most modern 2018+ support)

**Option 2: WPA2-PSK CCMP with Strong PSK and PMF Required (Interim, if WPA3 not possible):**
- **WPA2-PSK CCMP:** RSN IE CCMP, PSK via PBKDF2 4096 iter, PTK via PRF, etc. — much stronger than WEP — but vulnerable to handshake capture and offline audit if PSK weak — need strong PSK 20+ random
- **PMF Required:** ieee80211w=2 — protects deauth/disassoc — should be required even for WPA2, not just WPA3 — prevents deauth DoS and handshake capture via deauth
- **Config (hostapd.conf WPA2-PSK good):**
  ```
  interface=wlan0
  ssid=LAB-WIFI
  hw_mode=g
  channel=6
  wpa=2
  wpa_key_mgmt=WPA-PSK
  rsn_pairwise=CCMP
  wpa_passphrase=StrongRandomPassphrase123!@#With20+Chars
  ieee80211w=2
  wps_state=0
  ht_capab=[HT40-][HT40+][SHORT-GI-20][SHORT-GI-40][DSSS_CCK-40]
  # For 2.4 GHz, use 20 MHz only: ht_capab=[SHORT-GI-20][DSSS_CCK-40] or no HT40
  ```
  - `wpa_key_mgmt=WPA-PSK` — WPA2-PSK
  - `rsn_pairwise=CCMP` — CCMP only
  - `wpa_passphrase=StrongRandom...` — strong 20+ random
  - `ieee80211w=2` — PMF required
  - `wps_state=0` — WPS disabled
  - `ht_capab` — for 2.4 GHz, use 20 MHz only, not 40 MHz (bad practice) — 40 MHz in 2.4 causes overlap

- **Pros:** Compatible with older clients, stronger than WEP, CCMP, PMF required mitigates deauth
- **Cons:** Vulnerable to handshake capture and offline audit if PSK weak — need strong PSK, and still not forward secrecy like SAE

**Option 3: WPA2-EAP / WPA3-EAP Enterprise (Best for Corporate, Per-User, No Shared PSK):**
- **Enterprise:** 802.1X, RADIUS, per-user credentials, dynamic VLAN, accounting, no shared PSK — best for corporate
- **EAP-TLS mutual cert:** Most secure — client cert + server cert — requires PKI
- **PEAP with cert validation:** If EAP-TLS not possible, PEAP with ca_cert + subject_match via MDM/GPO
- **Config:** See Module 15-17 Enterprise
- **Pros:** Per-user, revocation, VLAN, no shared PSK, most secure
- **Cons:** Requires RADIUS, PKI, MDM, complex

**For PT:** Recommend WPA3-SAE PMF required for personal, WPA3-EAP or WPA2-EAP EAP-TLS for enterprise, no WEP, no WPA, no TKIP, no WPS, no open without OWE or isolation.

### Strong PSK Generation — 20+ Chars Random, Not in Wordlists

**WPA2-PSK PMK = PBKDF2-HMAC-SHA1(passphrase, SSID, 4096 iter, 256-bit) — 32 bytes — passphrase 8-63 chars — if passphrase weak (e.g., WeakPass123, password, 12345678), in wordlists (rockyou.txt), offline audit via hashcat succeeds — need strong 20+ random not in wordlists.**

**Generation methods:**
- **pwgen:** `pwgen -s 20 1` — random 20 chars — e.g., `aB3$dE5&gH7!jK9@lM1#`
- **diceware:** 6 words random — e.g., `correct horse battery staple` — but need 20+ chars? Actually diceware 4-6 words ~20+ chars with spaces — strong, memorable
- **openssl:** `openssl rand -base64 15` — 20 chars base64 — e.g., `aB3dE5gH7jK9lM1nO2pQ==`
- **Python:** `python3 -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters+string.digits+string.punctuation) for _ in range(20)))"`
- **Avoid:** Weak passwords like `password`, `12345678`, `WeakPass123`, `CompanyName2023`, etc. — in rockyou.txt, crackable

**For PT:** Strong PSK 20+ random, not in wordlists, unique per SSID, not reused, rotated periodically, stored securely (password manager, vault).

**Example strong PSK:**
```
StrongRandomPassphrase123!@#With20+Chars
aB3$dE5&gH7!jK9@lM1#qR2%
correct-horse-battery-staple-2023!
```
- 20+ chars, upper, lower, digits, symbols, random, not in wordlists

**For WPA3-SAE:** sae_password same requirements — strong 20+ random — SAE resists offline audit better than PSK, but still need strong password for forward secrecy? Actually SAE has forward secrecy, but weak password still risk? SAE resists offline dictionary, but still need strong.

### PMF Required — ieee80211w=2

**PMF (Protected Management Frames) 802.11w:** Protects management frames (deauth, disassoc, action) with MIC — prevents spoofed deauth/disassoc DoS and handshake capture via deauth — WPA3 mandates PMF required, WPA2 should have PMF required or capable.

**Config:**
- `ieee80211w=0` — PMF disabled — vulnerable to deauth/disassoc spoofing — bad
- `ieee80211w=1` — PMF capable optional — client and AP negotiate, if both capable, PMF used, but if client not capable, no PMF — better than disabled, but not required — downgrade possible
- `ieee80211w=2` — PMF required — management frames protected, client must support PMF, otherwise association denied — best — prevents deauth spoofing

**For PT:** PMF required ieee80211w=2 for all — WPA3-only mandates required, WPA2-PSK should also have required — check beacon RSN Capabilities MFPC/MFPR — MFPC=1 MFPR=1 required, MFPC=1 MFPR=0 capable, MFPC=0 MFPR=0 disabled.

**Filter:** `wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==1` — PMF required

**Recommendation:** ieee80211w=2 for all, including WPA2-PSK and WPA3-SAE.

### WPS Disabled — wps_state=0

**WPS (Wi-Fi Protected Setup):** 8-digit PIN, last digit checksum, halves flaw 10^4+10^3=11k max, not 10^8 — PIN brute-force — High finding — beacon has WPS IE Tag 221 OUI 00:50:F2:04.

**Config:**
- `wps_state=2` — WPS enabled configured — bad — High
- `wps_state=0` — WPS disabled — good

**For PT:** WPS disabled wps_state=0 for all — no WPS, no PBC, no PIN — check beacon for WPS IE — filter `wps` or `wlan_mgt.tag.oui==00:50:f2:04`.

### WPA3-Only for 6 GHz — Mandatory

**6 GHz U-NII-5-8 (5955-7115 MHz) — Wi-Fi 6E — mandates WPA3-only — no WPA2, no TKIP, no WEP, no open without OWE — WPA3-SAE or WPA3-EAP or OWE for open.**

**Config for 6 GHz:**
```
interface=wlan0
ssid=LAB-6GHz
hw_mode=a
channel=1  # 6 GHz channel 1 = 5955 MHz
wpa=2
wpa_key_mgmt=SAE
rsn_pairwise=CCMP
sae_password=StrongRandom20+Chars
ieee80211w=2
wps_state=0
he_suites=...
```
- `hw_mode=a` — 5/6 GHz
- `channel=1` — 6 GHz channel 1
- `wpa_key_mgmt=SAE` — WPA3-only
- `ieee80211w=2` — PMF required
- `wps_state=0` — WPS disabled
- For open 6 GHz: OWE — `wpa_key_mgmt=OWE`, `ieee80211w=2`

**For PT:** 6 GHz must be WPA3-only — if you see 6 GHz with WPA2 or open without OWE, it's misconfig.

### Reporting — Critical Finding Template

```
Title: Deprecated Encryption — WEP in Use (LEGACY-WIFI)
Severity: Critical
CVSS: 9.1 (AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N) — Adjacent, Low complexity, No privileges, No user interaction, Scope Unchanged, Confidentiality High, Integrity High
Description: WEP uses 24-bit IV (16M values, reuse fast, birthday 4096 packets 50% collision) and RC4 with weak key scheduling (FMS weak IVs (3,255,x) leak key bytes, KoreK 17 attacks, PTW Klein biases 40k frames 10 sec), ICV CRC32 not cryptographic malleable, no replay protection, shared key auth leaks keystream (plaintext challenge + ciphertext = keystream). Key recovery PTW 40k frames 10 sec with airodump-ng + aireplay-ng --arpreplay + aircrack-ng -z.
Evidence: Beacon f1 SSID LEGACY-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 2.4 GHz Privacy 1 no RSN IE Tag 48 no WPA IE Tag 221 OUI 00:50:F2:01 WEP, WEP Data filter wlan.wep.iv present f2-... IVs, hostapd.conf wep_default_key=0 wep_key0=12345 40-bit 5 ASCII weak in wordlist, config hash SHA256 abc123..., PCAP wep.pcapng 40k frames if hardware lab, aircrack-ng output KEY FOUND 12:34:56:78:90 ASCII 12345
Impact: Confidentiality total loss — attacker can decrypt all traffic with same IV if one plaintext known (ARP 0xAAAA03...), recover secret key via PTW 40k frames 10 sec, join network, lateral movement, data theft, pivot, integrity loss via ICV malleability and ChopChop injection, authentication bypass via shared key auth keystream leak, compliance fail PCI DSS, Wi-Fi Alliance prohibited
Recommendation: Disable WEP immediately, migrate to WPA3-Personal SAE with PMF required ieee80211w=2 and strong sae_password 20+ random not in wordlists and WPS disabled wps_state=0 (config snippet below) or WPA2-PSK CCMP with strong wpa_passphrase 20+ random and PMF required and WPS disabled (interim if WPA3 not possible), or WPA2-EAP/WPA3-EAP EAP-TLS mutual cert for enterprise (best), use WPA3-only for 6 GHz, rotate PSK, unique per SSID, WIDS detection of WEP beacons filter wlan_mgt.fixed.capabilities.privacy==1 && !wlan_mgt.tag.number==48, training, audits, no WEP, no WPA, no TKIP, no WPS, no open without OWE or isolation
Config Snippet Good WPA3-only:
interface=wlan0
ssid=LAB-WPA3
hw_mode=a
channel=36
wpa=2
wpa_key_mgmt=SAE
rsn_pairwise=CCMP
sae_password=StrongRandomPassphrase123!@#With20+Chars
ieee80211w=2
wps_state=0
Config Snippet Good WPA2-PSK interim:
interface=wlan0
ssid=LAB-WIFI
hw_mode=g
channel=6
wpa=2
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
wpa_passphrase=StrongRandomPassphrase123!@#With20+Chars
ieee80211w=2
wps_state=0
Retest: New beacon shows RSN IE CCMP PSK/SAE PMF required MFPC=1 MFPR=1, no WEP, no privacy bit without RSN, config shows wpa=2 wpa_key_mgmt=SAE or WPA-PSK rsn_pairwise=CCMP sae_password or wpa_passphrase strong 20+ random ieee80211w=2 wps_state=0, PCAP new shows no WEP data filter wlan.wep.iv empty, handshake audit with hashcat -m 22000 fails for strong PSK, WPS IE absent filter wps empty, PMF required, config hash new SHA256 def456..., PCAP hash new SHA256...
References: IEEE 802.11-1997 WEP, Fluhrer Mantin Shamir 2001 FMS, KoreK 2004, Pyshkin Tews Weinmann 2007 PTW, Berkeley 2001, OWASP, NIST SP 800-153, Wi-Fi Alliance, PCI DSS
```

**For PT:** Reporting must be actionable with config snippets, not just "fix it" — include good config, strong PSK generation, PMF, WPS disabled, etc.

### Retest Methodology

**Retest verifies fix with new evidence — not old PCAPs — new PCAPs, new config hash, new logs, what should happen vs what actually happened.**

**Steps:**
1. **New Config:** Get new hostapd.conf with WPA3-SAE or WPA2-PSK CCMP strong PSK PMF required WPS disabled — hash SHA256 new
2. **New PCAPs:** Capture new beacons with `airodump-ng` or `iw dev scan` or PcapInspector new PCAP — verify beacon shows RSN IE CCMP PSK/SAE, PMF required MFPC=1 MFPR=1, no WEP, no privacy without RSN, no WPS IE, channel, BSSID, etc. — frame numbers new, filter `wlan.fc.type_subtype==8 && wlan.bssid==AA:BB:CC:DD:EE:FF`
3. **No WEP Data:** Filter `wlan.wep.iv` should be empty — no WEP data
4. **Strong PSK Audit Fails:** If WPA2-PSK, try offline audit with hashcat -m 22000 and rockyou.txt — should fail for strong PSK 20+ random — evidence audit fails
5. **PMF Required:** Check RSN Capabilities MFPC=1 MFPR=1 — PMF required — filter `wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==1`
6. **WPS Disabled:** Filter `wps` should be empty — no WPS IE
7. **Document:** New PCAP hash SHA256, new config hash, new frame numbers, new filters, what should happen (beacon RSN CCMP PMF required no WEP no WPS strong PSK) vs what actually happened (verified)
8. **Report:** Retest section — "Fix verified: new beacon f1 SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK PMF required MFPC=1 MFPR=1 no WEP no WPS, config hash new SHA256..., PCAP hash new..., WEP data filter empty, handshake audit fails, WPS filter empty, PMF required"

**For PT:** Retest with new evidence, not old — reproducible.

### WIDS Detection of WEP

**WIDS (Wireless Intrusion Detection System) should detect WEP beacons and alert — authorized AP list with BSSID channel vendor signal security — if WEP observed, alert Critical.**

**Example WIDS rule:**
- If beacon privacy 1 and no RSN and no WPA — WEP — alert Critical WEP in use BSSID SSID Ch
- If WEP data filter `wlan.wep.iv` present — WEP data — alert
- Authorized list: BSSIDs, channels, vendors, security — if BSSID not in list or security WEP, alert rogue or misconfig

**For PT:** WIDS detection, not just manual.

### Training, Audits, Compliance

**Training:** Users and admins — WEP is Critical, no WEP, strong PSK, PMF, WPS disabled, WPA3, etc.

**Audits:** Regular wireless audits — Kismet, airodump-ng, Wireshark, PcapInspector — check beacons for WEP, WPS, PMF, weak PSK, etc.

**Compliance:** PCI DSS, NIST, OWASP — WEP prohibited — audit fail if WEP.

### Tools

- `hostapd` — AP config — `hostapd.conf` with `wpa=2`, `wpa_key_mgmt=SAE` or `WPA-PSK`, `rsn_pairwise=CCMP`, `sae_password` or `wpa_passphrase` strong, `ieee80211w=2`, `wps_state=0`
- `pwgen`, `openssl rand`, Python secrets — strong PSK generation
- `aircrack-ng`, `airodump-ng`, `aireplay-ng` — WEP cracking (hardware lab)
- Wireshark, tshark — filters `wlan.wep.iv`, `wlan_mgt.fixed.capabilities.privacy==1`, `wps`, `wlan_mgt.rsn.capabilities.mfpc`, `mfpr`
- PcapInspector, ConfigViewer — simulated lab config audit
- `sha256sum` — hash for evidence chain

### Evidence Collection

- Beacon: SSID LEGACY-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 Privacy 1 no RSN frame number, PCAP hash, filter `wlan.fc.type_subtype==8 && wlan_mgt.fixed.capabilities.privacy==1`
- Data: WEP data IV + KeyID + encrypted payload filter `wlan.wep.iv`, frame numbers, IVs
- Config: hostapd.conf wep_default_key=0 wep_key0=12345 hash SHA256
- For hardware lab: PCAP 40k frames, aircrack-ng output key found
- Good config: hostapd.conf WPA3-SAE or WPA2-PSK CCMP strong PSK PMF required WPS disabled hash SHA256 new
- New PCAPs: Beacon RSN CCMP PMF required no WEP no WPS frame numbers, hash, filters

### Attack → Defense → Retest

- **Attack:** Observe beacon LEGACY-WIFI WEP, config wep_key0=12345, IV reuse, RC4 weak, ICV malleable, PTW 40k 10 sec key recovery (hardware lab), ChopChop decrypt without key, injection
- **Defense:** Migrate to WPA3-SAE PMF required strong sae_password 20+ random WPS disabled or WPA2-PSK CCMP strong passphrase PMF required WPS disabled (interim), or WPA2-EAP/WPA3-EAP EAP-TLS for enterprise, WPA3-only for 6 GHz, WIDS detection, training, audits, no WEP
- **Retest:** New config hash, new PCAPs beacon RSN CCMP PMF required no WEP no WPS, WEP data filter empty, handshake audit fails for strong PSK, WPS filter empty, PMF required, document new hashes, frame numbers, filters

### Interactive Check

> You find WEP AP LEGACY-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 wep_key0=12345. What is remediation with config snippets, strong PSK generation, PMF, WPS, 6 GHz, WIDS, training, retest?

Answer: Remediation migrate to WPA3-SAE PMF required ieee80211w=2 strong sae_password 20+ random via pwgen -s 20 1 or openssl rand -base64 15 or Python secrets, WPS disabled wps_state=0, config snippet interface=wlan0 ssid=LAB-WPA3 hw_mode=a channel=36 wpa=2 wpa_key_mgmt=SAE rsn_pairwise=CCMP sae_password=StrongRandom20+Chars ieee80211w=2 wps_state=0, or interim WPA2-PSK CCMP strong passphrase 20+ random ieee80211w=2 wps_state=0, or enterprise EAP-TLS, WPA3-only for 6 GHz channel 1 hw_mode=a wpa_key_mgmt=SAE ieee80211w=2. Strong PSK 20+ random not in wordlists. PMF required ieee80211w=2 MFPC=1 MFPR=1. WPS disabled wps_state=0 no IE 00:50:F2:04. WIDS detect WEP beacons privacy 1 no RSN alert Critical. Training no WEP. Retest new config hash, new PCAPs beacon RSN CCMP PMF required no WEP no WPS, WEP data filter empty, handshake audit fails, WPS filter empty, document new hashes.

## References

- IEEE 802.11-1997 WEP, 802.11i WPA2, 802.11-2020 WPA3
- FMS, KoreK, PTW papers
- OWASP, NIST SP 800-153, PCI DSS, Wi-Fi Alliance
- hostapd.conf documentation
- pwgen, openssl, Python secrets
- Wireshark filters

---

*Next: Module 08 WPA/WPA2 — CCMP, RSN IE, PMK/PTK/GTK, 4-way handshake, PMF*

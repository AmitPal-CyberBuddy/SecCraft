# WPA/WPA2 Architecture — CCMP, RSN, PMK/PTK/GTK, PMF

## Learning Objectives
- Master WPA vs WPA2: TKIP RC4 vs CCMP AES, why TKIP deprecated, RSN IE
- Understand PSK vs Enterprise: PMK source PBKDF2 vs MSK, per-user vs shared, benefits
- Learn key hierarchy: PMK 256-bit, PTK via PRF with ANonce+SNonce+BSSID+Client MAC, KCK/KEK/TK split, GTK for broadcast
- Understand RSN IE: Version, Group Cipher CCMP, Pairwise CCMP, AKM PSK/SAE/EAP, Capabilities MFPC/MFPR, PMKID, Group Mgmt Cipher
- Learn PMF 802.11w: capable vs required, IGTK, SA Query, why WPA3 requires PMF, WPA2 should require
- Build VAPT evidence: beacon RSN IE CCMP PSK PMF, hostapd.conf wpa=2 rsn_pairwise=CCMP wpa_key_mgmt=WPA-PSK ieee80211w=2, frame numbers, hash
- Learn good vs bad config, remediation, retest

## Theory

### WPA (2003) — Interim Fix for WEP — TKIP

**History:** WEP broken 2001 FMS, need quick fix that runs on WEP hardware via firmware update — WPA with TKIP — 2003 Wi-Fi Alliance, 802.11i draft.

**TKIP (Temporal Key Integrity Protocol):**
- Still RC4, but with per-packet key mixing, sequence counter, MIC Michael instead of CRC32, key mixing function, rekeying
- **Per-packet key mixing:** Mix IV, secret, MAC, etc., to generate per-packet key — mitigates weak IVs
- **Sequence counter (TSC):** 48-bit, prevents replay — not just 24-bit IV
- **MIC Michael:** 8-byte MIC, not CRC32 — cryptographic? Actually Michael is weak, but better than CRC32 — still not strong, but better — also has countermeasures: if 2 MIC failures in 60 sec, AP shuts down for 60 sec
- **Still RC4:** Still RC4, not AES — interim, deprecated, should not be used — TKIP is deprecated, prohibited for new devices, only CCMP should be used
- **For PT:** If you see TKIP in beacon RSN IE Group Cipher TKIP or Pairwise TKIP, it's weak — should be CCMP only — TKIP deprecated, no PMF? Actually TKIP doesn't support PMF? TKIP with PMF? TKIP deprecated, no PMF, etc.

**WPA IE:** Tag 221 OUI 00:50:F2:01 — WPA IE (not RSN) — Version 1, Group Cipher TKIP, Pairwise TKIP, AKM PSK, etc. — old, should be RSN IE Tag 48 for WPA2.

**For PT:** WPA TKIP is weak, deprecated — should be WPA2 CCMP only — if you see TKIP, it's Medium finding — migrate to CCMP.

### WPA2 (2004) — Real Fix — CCMP, RSN, 802.11i

**History:** 802.11i-2004, WPA2, RSN (Robust Security Network), CCMP (Counter Mode with CBC-MAC Protocol) AES — real fix, mandated since 2006 for Wi-Fi certification.

**CCMP (Counter Mode with CBC-MAC Protocol):**
- **AES-CTR:** AES in Counter Mode for encryption — 128-bit key, 128-bit block, CTR mode with nonce
- **CBC-MAC:** CBC-MAC for integrity — MIC, not CRC32, not Michael — strong authenticated encryption
- **128-bit TK:** Temporal Key 128-bit for CCMP — part of PTK
- **Nonce:** 48-bit PN (Packet Number) — replay protection — PN increments per packet, not reuse
- **For PT:** CCMP is good — AES, strong, authenticated encryption, replay protection — should be CCMP only, no TKIP

**RSN IE (Robust Security Network Information Element) Tag 48:**
- **Version:** 1
- **Group Cipher Suite:** CCMP (00-0F-AC:04) good, TKIP (00-0F-AC:02) bad deprecated
- **Pairwise Cipher Suite Count/List:** CCMP (00-0F-AC:04) good
- **AKM Suite Count/List:** PSK (00-0F-AC:02) for Personal, SAE (00-0F-AC:08) for WPA3-Personal, EAP (00-0F-AC:01) for Enterprise, etc.
- **RSN Capabilities:** 2 bytes — bit 0 PreAuth, bit 1 No Pairwise, bit 2-3 PTKSA Replay Counter, bit 4-5 GTKSA Replay Counter, bit 6 Management Frame Protection Capable MFPC, bit 7 Management Frame Protection Required MFPR, bit 8 Joint Multi-Band RSNA, bit 9 PeerKey Enabled, bit 12-15 reserved, etc.
  - **MFPC/MFPR:** PMF — Management Frame Protection Capable/Required — 0/0 disabled, 1/0 capable optional, 1/1 required — WPA3 requires 1/1, WPA2 should have 1/1 or at least 1/0
- **PMKID Count/List:** For fast roaming 802.11r, PMKID = HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC) — can be in RSN IE or EAPOL M1 key data — clientless PMKID capture
- **Group Management Cipher Suite:** For PMF — BIP (00-0F-AC:06) — Broadcast/Multicast Integrity Protocol — for protected management frames

**Example RSN IE decode:**
```
RSN IE Tag 48 Length 20
  Version: 1
  Group Cipher: CCMP (00-0F-AC-04)
  Pairwise Cipher Count: 1
    Pairwise Cipher: CCMP (00-0F-AC-04)
  AKM Count: 1
    AKM: PSK (00-0F-AC-02)
  RSN Capabilities: 0x0000
    MFPC: 0 (PMF disabled)
    MFPR: 0 (PMF not required)
    ...
  PMKID Count: 0
  Group Management Cipher: BIP (00-0F-AC-06) if PMF
```
**Good RSN IE:** Group CCMP, Pairwise CCMP, AKM PSK or SAE, MFPC=1 MFPR=1 PMF required, BIP.

**Wireshark filters:**
```
wlan_mgt.rsn.version==1
wlan_mgt.rsn.gcs.type==4  # CCMP group
wlan_mgt.rsn.pcs.type==4  # CCMP pairwise
wlan_mgt.rsn.akms.type==2 # PSK
wlan_mgt.rsn.akms.type==8 # SAE WPA3
wlan_mgt.rsn.capabilities.mfpc==1
wlan_mgt.rsn.capabilities.mfpr==1
wlan_mgt.rsn.pmkid
```

**For PT:** Beacon analysis — check RSN IE — is CCMP? Is PMF required? Is WPS present? Is AKM PSK or SAE? etc.

### PSK vs Enterprise — PMK Source

| Mode | PMK Source | PMK Length | Use | Pros | Cons |
|------|------------|------------|-----|------|------|
| **WPA2-Personal (PSK)** | PMK = PBKDF2-HMAC-SHA1(passphrase, SSID, 4096 iter, 256-bit) — 32 bytes | 256-bit | Home, small office, IoT | Simple, no RADIUS, no cert, easy | Shared PSK for all, no per-user, no revocation, offline audit if weak PSK, no accounting, no dynamic VLAN |
| **WPA2-Enterprise (EAP)** | PMK from MSK (Master Session Key) from EAP exchange — 64 bytes MSK, first 32 bytes PMK? Actually MSK 64 bytes, PMK 32 bytes from MSK | 256-bit | Corporate | Per-user credentials, revocation, dynamic VLAN, accounting, no shared PSK, more secure | Requires RADIUS, PKI or passwords, complex, MDM/GPO, cert validation |

**PMK (Pairwise Master Key):**
- 256-bit (32 bytes), never sent over air — derived from passphrase via PBKDF2 for PSK, or from MSK for Enterprise
- For PSK: PBKDF2-HMAC-SHA1(passphrase, SSID, 4096 iterations, 256-bit output) — passphrase 8-63 ASCII chars, SSID as salt, 4096 iter — computationally expensive to brute-force, but still vulnerable if passphrase weak and in wordlists — hashcat -m 22000
- For Enterprise: MSK from EAP — e.g., EAP-TLS, PEAP-MSCHAPv2 — MSK 64 bytes, PMK first 32 bytes? Actually EAP-TLS MSK 64 bytes, PMK = first 32 bytes of MSK? Or full MSK? Let's check: For EAP, MSK 64 bytes, PMK 32 bytes derived from MSK — but for PT, PMK from MSK, not PBKDF2

**For PT:** PSK mode — if PSK weak, offline audit possible via handshake or PMKID — need strong PSK 20+ random — Enterprise mode — per-user, more secure, but check cert validation, RADIUS secret, etc.

### Key Hierarchy (PSK) — PMK → PTK → KCK/KEK/TK → GTK

```
Passphrase + SSID → PBKDF2-HMAC-SHA1 4096 iter → PMK (256-bit, 32 bytes) — never sent

PMK + ANonce (32 bytes AP random) + SNonce (32 bytes Client random) + BSSID (6 bytes) + Client MAC (6 bytes) → PRF (Pseudo-Random Function) → PTK

PRF for WPA2: PRF-512(PMK, "Pairwise key expansion" | min(BSSID, Client MAC) | max(BSSID, Client MAC) | min(ANonce, SNonce) | max(ANonce, SNonce)) — 512-bit? Actually PTK 384-bit for CCMP? Let's recall: For CCMP, PTK 384-bit (48 bytes) = KCK 128-bit + KEK 128-bit + TK 128-bit = 384-bit. For TKIP, PTK 512-bit? Actually TKIP needs 2 TKs? But for CCMP, PTK 384-bit.

PTK splits into:
- KCK (Key Confirmation Key) 128-bit (16 bytes): For MIC for EAPOL — HMAC-SHA1 using KCK over EAPOL frame — proves sender knows PTK
- KEK (Key Encryption Key) 128-bit (16 bytes): For encrypting GTK in M3 — AES key wrap
- TK (Temporal Key) 128-bit (16 bytes): For encrypting data — CCMP AES key
- For TKIP: Also MIC Tx/Rx keys

GTK (Group Temporal Key): For broadcast/multicast — derived from GMK (Group Master Key) random by AP — 128-bit for CCMP — sent encrypted in M3 of handshake with KEK and MIC with KCK — GTK is shared for all clients for broadcast/multicast — e.g., ARP broadcast, etc.

GMK (Group Master Key): Random by AP, never sent, used to derive GTK

IGTK (Integrity GTK): For PMF — protects management frames — BIP — Group Management — sent in M3? Actually IGTK is for PMF — integrity for broadcast management frames — derived from IPMK? Let's not deep.

For PT: Key hierarchy important for handshake analysis — ANonce, SNonce, BSSID, Client MAC, PMK → PTK → KCK for MIC verification for offline audit.

Example:
PMK = PBKDF2("WiFiForgeLab123!", "LAB-WIFI", 4096, 32 bytes) = a1b2c3... 32 bytes
ANonce = AP random 32 bytes from M1 — e.g., 11:22:33:44:55:66... 32 bytes
SNonce = Client random 32 bytes from M2 — e.g., AA:BB:CC:DD:EE:FF... 32 bytes
BSSID = AA:BB:CC:DD:EE:FF
Client MAC = 11:22:33:44:55:66
PTK = PRF(PMK, "Pairwise key expansion", min(BSSID, Client MAC), max(BSSID, Client MAC), min(ANonce, SNonce), max(ANonce, SNonce)) — 48 bytes for CCMP
KCK = PTK[0:16], KEK = PTK[16:32], TK = PTK[32:48]
MIC in M2 = HMAC-SHA1(KCK, EAPOL M2 frame)
GTK encrypted in M3 with KEK
```

**For PT:** For offline audit, need SSID, BSSID, Client MAC, ANonce, SNonce, MIC — to verify PSK via PBKDF2 and PRF and MIC.

### 4-Way Handshake — M1-M4

```
AP                          Client
|                            |
|  M1: ANonce, Replay Counter 1, Key Info Ack 1, no MIC | → AP sends ANonce 32 bytes random, replay 1, no MIC
|                            |     Client now has ANonce + SNonce (generates) + PMK → derives PTK
|  M2: SNonce, MIC (KCK), Replay 1, RSN IE | ← Client sends SNonce 32 bytes + MIC HMAC-SHA1(KCK) over EAPOL + RSN IE, replay 1
|                            |     AP derives PTK via PRF, verifies MIC via KCK, if MIC valid, client knows PMK
|  M3: GTK (encrypted with KEK), MIC (KCK), Replay 2, RSN IE, Secure 1 | → AP sends GTK encrypted with KEK + MIC with KCK, replay 2, secure 1
|                            |     Client verifies MIC, decrypts GTK with KEK, installs PTK + GTK
|  M4: ACK, MIC (KCK), Replay 2, Secure 1 | ← Client ACK, MIC, replay 2, secure 1, both install keys
|                            |     Data now encrypted with TK CCMP
```

**M1 Details:**
- SA BSSID, DA Client MAC, BSSID BSSID, EAPOL version 2, type 3 Key, Descriptor Type 2 RSN, Key Info: Version, Type Pairwise, Index 0, Install 0, Ack 1, MIC 0, Secure 0, Error 0, Request 0, Encrypted 0, Key Length 16, Replay Counter 1, Nonce ANonce 32 bytes, IV, RSC, ID, MIC 0, Key Data Length 0, Key Data none

**M2 Details:**
- SA Client MAC, DA BSSID, BSSID BSSID, EAPOL, Key Info: MIC 1, Secure 0, etc., Key Length 16, Replay Counter 1 (same as M1), Nonce SNonce 32 bytes, MIC HMAC-SHA1(KCK, EAPOL), Key Data RSN IE, etc.

**M3 Details:**
- SA BSSID, DA Client MAC, BSSID BSSID, EAPOL, Key Info: Ack 1, MIC 1, Secure 1, Encrypted 1, etc., Key Length 16, Replay Counter 2, Nonce ANonce? Actually ANonce same as M1? Or GTK? Key Data GTK encrypted with KEK + RSN IE, MIC, etc.

**M4 Details:**
- SA Client MAC, DA BSSID, BSSID BSSID, EAPOL, Key Info: MIC 1, Secure 1, etc., Replay Counter 2, MIC, no nonce, ACK

**For PT:** Handshake identification — filter `eapol`, check BSSID, Client MAC, replay counter pattern 1,1,2,2, ANonce, SNonce, MIC, etc. — evidence frame numbers.

**Important:** PMK never sent — attacker who captures handshake can try offline PSK audit via PBKDF2 + PRF + MIC verification — only if PSK weak and authorized.

### PMF (Protected Management Frames) 802.11w — SA Query, IGTK, BIP

**Without PMF, management frames (deauth subtype 12, disassoc subtype 10, action subtype 13) are unauthenticated — attacker can spoof deauth/disassoc to disconnect clients (DoS) and capture handshake via deauth — also Evil Twin facilitation — also action frames for SA Query?**

**With PMF:**
- **PMF Capable (MFPC=1, MFPR=0):** Client and AP both support PMF, negotiate, if both capable, management frames protected with MIC using IGTK (Integrity GTK) and BIP (Broadcast/Multicast Integrity Protocol) — but if client not capable, no PMF — downgrade possible — better than disabled, but not required
- **PMF Required (MFPC=1, MFPR=1):** Management frames must be protected — client must support PMF, otherwise association denied — prevents spoofed deauth/disassoc — best — WPA3 mandates required, WPA2 should have required
- **IGTK (Integrity GTK):** For protecting broadcast management frames — derived from IPMK? Actually IGTK is integrity key for management — BIP — Group Management Cipher BIP (00-0F-AC-06) — AES-CMAC
- **SA Query (Security Association Query):** Procedure to prevent spoofed association? Actually SA Query is for PMF — if AP receives assoc request with same MAC but different, SA Query to verify — prevents session hijacking

**Config:**
- `ieee80211w=0` — PMF disabled — vulnerable — bad
- `ieee80211w=1` — PMF capable optional — better, but downgrade possible
- `ieee80211w=2` — PMF required — best — prevents deauth spoofing

**For PT:** Check beacon RSN Capabilities MFPC/MFPR — 0/0 disabled, 1/0 capable, 1/1 required — should be 1/1 — filter `wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==1` — if 0/0, Medium finding — deauth possible.

**WPA3 requires PMF required — if WPA3 with PMF disabled or capable, misconfig — High?**

### Good vs Bad Config

**Good hostapd.conf WPA2-PSK CCMP PMF required WPS disabled:**
```ini
interface=wlan0
ssid=LAB-WPA2
hw_mode=g
channel=6
wpa=2
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
wpa_passphrase=StrongRandomPassphrase123!@#With20+Chars
ieee80211w=2
wps_state=0
ht_capab=[SHORT-GI-20][DSSS_CCK-40]
# For 2.4 GHz, 20 MHz only, no HT40
```

**Good WPA3-only:**
```ini
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

**Bad:**
```ini
ssid=LAB-WIFI
wpa=1
wpa_key_mgmt=WPA-PSK
rsn_pairwise=TKIP
wpa_passphrase=WeakPass123
ieee80211w=0
wps_state=2
ht_capab=[HT40+][HT40-]
# TKIP, PMF disabled, WPS enabled, weak PSK, 40MHz in 2.4 bad
```

**For PT:** Good config has CCMP only, PSK or SAE, strong PSK 20+ random, PMF required, WPS disabled, 20 MHz in 2.4.

### VAPT Relevance

- **Beacon analysis:** Check RSN IE — is CCMP? Is PMF required? Is WPS present? Is AKM PSK or SAE? Is Group CCMP? etc. — evidence frame number, BSSID, channel
- **Handshake analysis:** Is handshake complete M1-M4? What frames? ANonce, SNonce, MIC, replay? etc.
- **Config audit:** `wpa=2`, `rsn_pairwise=CCMP`, `wpa_key_mgmt=WPA-PSK` or `SAE`, `ieee80211w=2`, `wps_state=0` is good. `wpa=1` TKIP or `rsn_pairwise=TKIP` or `ieee80211w=0` or `wps_state=2` or weak PSK is weak
- **Evidence:** Beacon RSN IE CCMP PSK PMF, hostapd.conf, frame numbers, hash, etc.
- **Report:** "WPA2-PSK CCMP with PMF disabled and WPS enabled and weak PSK — Medium/High — recommendation strong PSK 20+ random, PMF required, WPS disabled, WPA3-only"

### Attack → Defense → Retest

- **Attack:** Observe beacon LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK PMF disabled WPS disabled? Actually check — if PMF disabled, deauth possible for handshake capture (if authorized and lab), if WPS enabled, PIN brute-force 11k, if weak PSK, offline audit via hashcat (authorized)
- **Defense:** WPA2-PSK CCMP strong PSK 20+ random not in wordlists, PMF required ieee80211w=2, disable WPS wps_state=0, use WPA3-only SAE PMF required for better, strong RADIUS secret for Enterprise, cert validation, WIDS
- **Retest:** New beacon shows RSN CCMP PSK/SAE PMF required MFPC=1 MFPR=1, no WPS, strong PSK audit fails, PMF required, config hash new, PCAP new

### Tools

- Wireshark, tshark — RSN IE, `wlan_mgt.rsn.*`, `eapol`, `wps`
- PcapInspector, ConfigViewer — simulated lab
- `hostapd` — AP config
- `hcxpcapngtool`, `hashcat` — handshake conversion and offline audit (authorized)
- `iw dev wlan0 scan` — RSN IE in scan results

### Evidence Collection

- Beacon: SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK PMF disabled WPS disabled? Actually check — frame number, RSN IE, PMF, WPS, etc., PCAP hash, filter `wlan.fc.type_subtype==8 && wlan.bssid==AA:BB:CC:DD:EE:FF`
- Config: hostapd.conf wpa=2 rsn_pairwise=CCMP wpa_key_mgmt=WPA-PSK wpa_passphrase strong ieee80211w=2 wps_state=0 hash
- Handshake: M1-M4 frame numbers, ANonce, SNonce, MIC, replay, BSSID, client, SSID, filter `eapol && wlan.bssid==AA:BB:CC:DD:EE:FF`

### Interactive Check

> You see beacon SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 RSN CCMP PSK PMF disabled MFPC=0 MFPR=0 WPS disabled, hostapd.conf wpa=2 rsn_pairwise=CCMP wpa_key_mgmt=WPA-PSK wpa_passphrase=WeakPass123 ieee80211w=0 wps_state=0. What are findings?

Answer: Findings: WPA2-PSK CCMP good, but PMF disabled Medium (deauth possible, handshake capture via deauth), WPS disabled good, but weak PSK WeakPass123 in wordlist High (offline audit via hashcat if handshake captured), 40MHz? Check ht_capab. Recommendation: Strong PSK 20+ random, PMF required ieee80211w=2, WPS disabled already, WPA3-only SAE for better. Evidence beacon f1 RSN CCMP PSK PMF disabled, config weak PSK, hash, filter.

## References

- IEEE 802.11i-2004 WPA2, 802.11-2020, 802.11w PMF
- Wi-Fi Alliance WPA2, WPA3
- Wireshark 802.11 RSN IE
- hostapd.conf documentation
- OWASP, NIST

---

*Next: 4-Way Handshake Deep Dive — M1-M4, ANonce, SNonce, MIC, Replay, GTK, PMKID*

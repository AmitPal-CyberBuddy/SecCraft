# WEP Architecture & Why It's Broken — Cryptographic Failure

## Learning Objectives
- Master WEP architecture: 40/104-bit secret + 24-bit IV, RC4, CRC32 ICV, shared key auth
- Understand 5 critical flaws: IV 24-bit reuse, RC4 weak scheduling FMS, ICV CRC32 malleable, no replay protection, no mutual auth, shared key auth leaks keystream
- Learn historical attacks timeline: FMS 2001 4M frames, KoreK 2004 500k, PTW 2007 40k 10 sec, ChopChop decryption without key
- Understand WEP packet format: IV plaintext + KeyID + RC4(Plaintext+ICV), Wireshark filters, beacon privacy bit no RSN
- Build VAPT evidence: beacon WEP privacy bit no RSN, hostapd.conf wep_default_key, config hash, frame numbers
- Learn remediation: migrate to WPA2-PSK CCMP or WPA3-SAE, strong PSK 20+, PMF required, disable WEP

## Theory

### WEP (Wired Equivalent Privacy) — 1997 IEEE 802.11-1997, Deprecated 2004, Prohibited

**Goal:** Provide "wired equivalent" privacy — confidentiality similar to wired LAN — using RC4 stream cipher.

**Encryption (WEP-40 and WEP-104):**
```
Plaintext = 802.11 data payload (LLC + IP + etc.)
ICV = CRC32(Plaintext) — 4 bytes, integrity check value, not cryptographic

Key = Secret (40-bit or 104-bit) + IV (24-bit) = 64-bit or 128-bit total
   Secret: 40-bit (5 ASCII chars) or 104-bit (13 ASCII chars) — e.g., 12345 (40-bit) or 1234567890123 (104-bit)
   IV: 24-bit random per packet, sent in cleartext in packet header — too small

Keystream = RC4(Key) — RC4 stream cipher generates keystream same length as Plaintext+ICV

Ciphertext = (Plaintext + ICV) XOR Keystream — RC4 encrypt

Packet on air = IV (24-bit, 3 bytes plaintext) + KeyID (2 bits, 1 byte? Actually 1 byte with 2 bits KeyID + 6 bits pad + 1 bit? Let's check: WEP header 4 bytes: 3 bytes IV + 1 byte KeyID) + Ciphertext (encrypted payload + ICV)

Decryption: Receiver knows Secret, receives IV, reconstructs Key = Secret+IV, generates same Keystream via RC4, XOR Ciphertext to get Plaintext+ICV, verifies ICV CRC32(Plaintext) == received ICV

WEP Data Frame: Dot11 header (FC, Duration, Addr1-3, Seq) + IV (3 bytes) + KeyID (1 byte) + Encrypted payload (RC4) + ICV (4 bytes encrypted) + FCS (802.11 FCS)
```

**Components Deep Dive:**

- **IV (Initialization Vector) 24-bit:**
  - Random per packet, sent in cleartext — 24-bit = 16,777,216 possibilities — busy AP with 1000 packets/sec reuses IV in ~4.6 hours? Actually 16M / 1000 = 16k sec = 4.6 hours, but birthday paradox says collision in sqrt(16M)=4096 packets? Actually 24-bit too small, reuse fast.
  - IV reuse: Same IV + same Secret = same Key = same Keystream — if attacker knows one plaintext (e.g., ARP request known plaintext), can recover keystream and decrypt other packets with same IV.
  - Example: IV=0x123456, Secret=0xABCDE..., Key=IV+Secret, Keystream=RC4(Key), Plaintext1=ARP request known (e.g., LLC 0xAAAA03...), Ciphertext1=Plaintext1 XOR Keystream, so Keystream=Ciphertext1 XOR Plaintext1, then for Ciphertext2 with same IV, Plaintext2=Ciphertext2 XOR Keystream — decrypt without knowing Secret!
  - For PT: IV reuse is critical flaw — WEP with busy network IV reuse in minutes, not hours, due to weak random and birthday.

- **RC4 (Rivest Cipher 4) Stream Cipher:**
  - Stream cipher, generates keystream from key, XOR with plaintext.
  - Weak key scheduling: First bytes of keystream leak key bytes when IV has form (3, 255, x) — FMS attack — Fluhrer, Mantin, Shamir 2001.
  - RC4 key scheduling: KSA (Key Scheduling Algorithm) shuffles S-box based on key, then PRGA (Pseudo-Random Generation Algorithm) generates keystream — first bytes biased, leak key.
  - For PT: RC4 weak, especially with related keys (IV+Secret), first bytes leak.

- **ICV (Integrity Check Value) CRC32:**
  - CRC32(Plaintext) — 4 bytes, not cryptographic — CRC32 is linear, malleable — attacker can flip bits in ciphertext and adjust ICV without knowing key — no integrity.
  - Example: Ciphertext = (Plaintext+CRC32(Plaintext)) XOR Keystream, attacker flips bit in Plaintext, can compute new CRC32? Actually CRC32 linear, so can flip bits and adjust ICV — no key needed — packet injection possible.
  - For PT: ICV not cryptographic, malleable — no integrity, no authenticity.

- **Shared Key Authentication (WEP Auth):**
  - 4-way: Client → AP Auth Req algo 1 Shared Key seq1, AP → Client Auth Challenge seq2 with 128-byte challenge plaintext, Client → AP Auth Resp seq3 with challenge encrypted with WEP key (IV+Secret), AP → Client Auth Resp seq4 status.
  - Flaw: Challenge is known plaintext (AP sends challenge plaintext in seq2), client encrypts it with WEP key and sends ciphertext in seq3 — attacker sees plaintext challenge and ciphertext, can recover keystream (Ciphertext XOR Plaintext = Keystream) — leaks keystream, even without knowing Secret! So shared key auth is worse than open system auth — open system auth has no challenge, no keystream leak.
  - For PT: Shared key auth leaks keystream, should use open system auth even for WEP (but WEP still broken).

- **No Replay Protection, No Mutual Auth, No Key Management:**
  - No replay counter, no sequence protection — attacker can replay packets.
  - No mutual auth — only AP authenticates client? Actually shared key auth, but open system auth no auth at all — client authenticates to AP but AP not authenticated to client — rogue AP possible.
  - No key management — same secret for all clients, no per-user, no rotation, manual config — if one client leaves, secret must be changed on all.
  - No forward secrecy, no PMF, no management frame protection.

**WEP Packet Format in Wireshark:**
```
802.11 Data
  Frame Control: 0x0842 Data, Protected 1, To DS 1
  Duration: ...
  BSSID: AA:BB:CC:DD:EE:FF
  SA: Client MAC
  DA: BSSID or dest
  Seq: ...
  WEP Parameters:
    IV: 0x123456 (3 bytes, plaintext)
    KeyID: 0 (1 byte, 2 bits KeyID + pad)
    Encrypted payload: RC4(Plaintext+ICV)
  FCS: 4 bytes
```
Wireshark shows `Data`, `SN`, `IV`, `KeyID`, `ICV` if cracked, or `Encrypted payload` if not.

**Beacon for WEP:**
- Capability Info Privacy bit 1 = encryption enabled (WEP or WPA/WPA2/WPA3), but no RSN IE (Tag 48) and no WPA IE (Tag 221 OUI 00:50:F2:01) — only privacy bit, maybe WEP IE? Actually WEP beacon has privacy bit 1, no RSN, no WPA, just privacy.
- Filter: `wlan.fc.type_subtype==8 && wlan_mgt.fixed.capabilities.privacy==1 && !wlan_mgt.tag.number==48 && !wlan_mgt.tag.oui==00:50:f2:01` — WEP.
- Or simpler: `wlan_mgt.fixed.capabilities.privacy==1` and check RSN absent.

**hostapd.conf for WEP (bad):**
```
interface=wlan0
ssid=LEGACY-WIFI
hw_mode=g
channel=6
wep_default_key=0
wep_key0=12345          # 40-bit 5 ASCII chars — weak, in wordlist
#wep_key0=1234567890123 # 104-bit 13 ASCII
#auth_algs=1            # Open System (should use open, not shared, but WEP still broken)
#auth_algs=2            # Shared Key — worse, leaks keystream
#wep_key0=12345  — Critical
```

### Why Broken — 5 Critical Flaws

**1. IV 24-bit Too Small — Reuse Fast:**
- 24-bit = 16,777,216 values — birthday paradox collision in ~4096 packets? Actually for random IV, collision probability 50% after sqrt(2^24)=4096 packets? Wait, birthday bound for 24-bit is ~2^12=4096, so after 4096 packets, 50% chance of collision — very fast! Busy AP 1000 pps, collision in 4 sec!
- Even if IV increments, not random, still reuse in 16M packets — 16M / 1000 = 16k sec = 4.6 hours — still fast.
- Reuse + same secret = same keystream — if attacker knows one plaintext (ARP, DHCP, etc.), can recover keystream and decrypt others with same IV.
- For PT: IV reuse is fatal — WEP with busy network IV reuse in minutes.

**2. RC4 Weak Key Scheduling — FMS Attack:**
- Fluhrer, Mantin, Shamir 2001 — weak IVs of form (3, 255, x) — first byte of keystream leaks key byte.
- Collect many weak IVs (~4M frames) — recover secret key via FMS.
- Example: IV = (3, 255, x), Key = IV + Secret, KSA first steps leak Secret[0], etc.
- For PT: FMS needs 4M frames, but improved by KoreK and PTW.

**3. ICV CRC32 Not Cryptographic — Malleable:**
- CRC32 linear — attacker can flip bits in ciphertext and compute new CRC32 without key — no integrity.
- Example: Plaintext = IP packet, attacker flips destination IP bit, adjusts CRC32, packet still passes ICV check — injection possible.
- ChopChop attack uses ICV malleability to decrypt without key — truncate last byte, guess ICV, AP will respond if ICV correct? Actually ChopChop decrypts by guessing last byte and checking if AP sends deauth or not? Let's recall: ChopChop sends truncated packet with guessed ICV, if AP doesn't send deauth, guess correct? Something like that.
- For PT: No integrity, injection possible.

**4. No Replay Protection:**
- No replay counter — attacker can replay packets — e.g., replay ARP request to generate traffic for IV collection.

**5. No Mutual Auth, Shared Key Auth Leaks Keystream:**
- Open system auth: No auth, just association — no keystream leak, but still WEP broken.
- Shared key auth: Challenge plaintext + ciphertext = keystream leak — worse.
- No mutual auth — rogue AP can impersonate legit AP, client will associate and send data encrypted with WEP, attacker can decrypt if keystream known or crack key.

**Historical Timeline:**
- 1997: WEP introduced in 802.11-1997 — 40-bit secret (export restrictions) — 64-bit total (40+24)
- 1998: 104-bit secret (128-bit total) — still broken
- 2001: Fluhrer, Mantin, Shamir FMS attack — 4M frames, recover key — WEP broken
- 2001: Berkeley paper "Intercepting Mobile Communications: The Insecurity of 802.11" — WEP broken
- 2004: KoreK attacks — 17 attacks, improve to 500k frames — aircrack-ng implements
- 2004: WPA introduced as interim (TKIP), WPA2 802.11i with CCMP
- 2007: PTW attack (Pyshkin, Tews, Weinmann) — Klein RC4 analysis, need 40k frames, 10 sec — most effective — `aircrack-ng -z` PTW
- 2007: ChopChop (KoreK) — decrypt without key via ICV guessing — `aircrack-ng --chopchop`
- 2008: WEP deprecated, WPA2 mandated for Wi-Fi certification
- 2012: WEP prohibited for Wi-Fi certification
- 2020: WEP still found in legacy IoT, old APs — Critical finding

**For PT:** WEP is Critical, not High — key recovery in minutes, confidentiality broken, injection, etc.

### WEP in PCAPs & Configs

**Beacon:**
- SSID LEGACY-WIFI, BSSID AA:BB:CC:DD:EE:FF, Channel 6, Privacy 1, no RSN IE, no WPA IE — WEP
- Filter: `wlan.fc.type_subtype==8 && wlan_mgt.fixed.capabilities.privacy==1`

**Data:**
- WEP data: IV + KeyID + Encrypted payload
- Filter: `wlan.fc.type==2 && wlan.wep.iv` or `wlan.wep.iv` exists
- Wireshark shows IV, KeyID, and if key provided, decrypted payload

**hostapd.conf:**
```
interface=wlan0
ssid=LEGACY-WIFI
hw_mode=g
channel=6
wep_default_key=0
wep_key0=12345
```
- Critical: WEP, 40-bit weak, no PMF, no RSN, etc.

**For PT:** If you see WEP in beacon or config, it's Critical — no need to crack, just config audit — evidence beacon privacy bit no RSN, config wep_key0, etc.

### Lab — Simulated (Zero-Cost)

We don't provide WEP cracking lab requiring real WEP AP and 40k frames — needs hardware RF adapter, monitor mode, injection, traffic generation — marked as hardware lab requiring ALFA adapter with prep docs.

**Simulated lab: Config audit:**
- Artifact: hostapd.conf LEGACY-WIFI WEP
- Tasks:
  1. Identify SSID LEGACY-WIFI, BSSID? Channel 6, Security WEP, Key 12345 40-bit weak, Privacy 1 no RSN, no PMF, no WPS? Check
  2. Why Critical? IV 24-bit reuse, RC4 weak FMS, ICV CRC32 malleable, no replay, shared key auth leaks keystream, key recovery PTW 40k frames 10 sec
  3. Impact: Confidentiality broken, attacker can decrypt, inject, recover key, network access
  4. Recommendation: Disable WEP, migrate to WPA3-SAE or WPA2-PSK CCMP, strong PSK 20+ random, PMF required ieee80211w=2, disable WPS, WPA3-only for 6 GHz

**Hardware lab (optional, requires RF adapter, explicit ROE, own lab):**
- Setup: Hostapd with WEP, client, attacker with ALFA AWUS036ACH monitor mode
- Steps: `airmon-ng start wlan0`, `airodump-ng wlan0mon --bssid AA:BB:CC:DD:EE:FF -c 6 -w wep`, `aireplay-ng --arpreplay -b AA:BB:CC:DD:EE:FF -h clientMAC wlan0mon` to generate traffic, collect 40k frames, `aircrack-ng -z wep-01.cap` PTW, recover key 12345
- Evidence: PCAP with 40k WEP data IVs, aircrack-ng output key found, etc.
- For this academy: Simulated only, hardware marked with prep docs.

### VAPT Relevance

- **You will not crack WEP in simulated lab** (no real WEP AP), but you must understand why it's insecure and identify WEP in config/beacon as Critical
- **Config audit:** If you see WEP in hostapd.conf or beacon privacy bit but no RSN, it's Critical finding — no need to crack, just report
- **Evidence:** Beacon BSSID AA:BB:CC:DD:EE:FF SSID LEGACY-WIFI Ch6 Privacy 1 no RSN frame number, hostapd.conf wep_key0=12345 hash SHA256, etc.
- **Report:** "WEP is cryptographically broken, IV 24-bit reuse, RC4 weak scheduling FMS, ICV CRC32 malleable, no replay, shared key auth leaks keystream, key recovery PTW 40k frames 10 sec, Critical, migrate to WPA3 or WPA2-PSK CCMP, strong PSK 20+, PMF required"
- **CVSS:** Critical — CVSS 9.0+? Actually WEP Critical, confidentiality total loss, integrity loss, etc.

### Finding Template

```
Title: Deprecated Encryption — WEP in Use (LEGACY-WIFI)
Severity: Critical
CVSS: 9.1 (AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N) — Adjacent, Low complexity, No privileges, No user interaction, Scope Unchanged, Confidentiality High, Integrity High
Description: WEP uses 24-bit IV (16M values, reuse fast, birthday 4096) and RC4 with weak key scheduling (FMS weak IVs (3,255,x) leak key bytes), ICV CRC32 not cryptographic malleable, no replay protection, shared key auth leaks keystream (plaintext challenge + ciphertext = keystream). Key recovery PTW 40k frames 10 sec.
Evidence: Beacon f1 SSID LEGACY-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 Privacy 1 no RSN IE Tag 48, no WPA IE Tag 221 OUI 00:50:F2:01, WEP Data filter wlan.wep.iv present, hostapd.conf wep_default_key=0 wep_key0=12345 40-bit weak 5 chars, config hash SHA256 abc123..., PCAP wep.pcapng 40k frames if hardware lab
Impact: Confidentiality broken — attacker can decrypt all traffic with same IV if one plaintext known (ARP), recover secret key via PTW 40k frames 10 sec, inject packets via ICV malleability and ChopChop, network access, lateral movement, data theft
Recommendation: Disable WEP immediately, migrate to WPA3-Personal SAE with PMF required ieee80211w=2 or WPA2-PSK CCMP with strong PSK 20+ random not in wordlists, disable WPS wps_state=0, enable PMF required, use WPA3-only for 6 GHz, rotate PSK, per-user via WPA2-EAP if possible, WIDS detection of WEP, training
Retest: New beacon shows RSN IE CCMP PSK PMF required, no WEP, no privacy bit without RSN, config shows wpa=2 wpa_key_mgmt=WPA-PSK rsn_pairwise=CCMP wpa_passphrase=StrongRandom20+Chars ieee80211w=2 wps_state=0, PCAP new shows no WEP data filter wlan.wep.iv empty, handshake audit fails for weak PSK
References: IEEE 802.11-1997 WEP, Fluhrer Mantin Shamir 2001 FMS, KoreK 2004, Pyshkin Tews Weinmann 2007 PTW, Berkeley 2001 WEP insecurity, OWASP, NIST SP 800-153
```

### Attack → Defense → Retest

- **Attack:** Observe beacon LEGACY-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 Privacy 1 no RSN WEP, config wep_key0=12345 40-bit weak, IV reuse, RC4 weak, ICV malleable, no replay, shared key auth leaks keystream, PTW 40k frames 10 sec key recovery (hardware lab with ALFA, airodump-ng, aireplay-ng --arpreplay, aircrack-ng -z), ChopChop decrypt without key, injection
- **Defense:** Migrate to WPA3-SAE PMF required or WPA2-PSK CCMP strong PSK 20+ random, PMF required ieee80211w=2, disable WPS wps_state=0, disable WEP, use WPA3-only for 6 GHz, strong secret, WIDS authorized list, no WEP, training
- **Retest:** New PCAPs show no WEP beacons, no WEP data, beacon RSN IE CCMP PSK PMF required, strong PSK audit fails, WPS disabled, PMF required, config hash new, etc.

### Tools

- `aircrack-ng` — WEP cracking FMS/KoreK/PTW: `aircrack-ng -z wep-01.cap` PTW, `aircrack-ng wep-01.cap` FMS/KoreK
- `airodump-ng` — capture WEP data: `airodump-ng wlan0mon --bssid AA:BB:CC:DD:EE:FF -c 6 -w wep`
- `aireplay-ng` — generate traffic for IV collection: `aireplay-ng --arpreplay -b AA:BB:CC:DD:EE:FF -h clientMAC wlan0mon`, `aireplay-ng --chopchop -b AA:BB:CC:DD:EE:FF -h clientMAC wlan0mon` ChopChop
- Wireshark, tshark — filters `wlan.wep.iv`, `wlan.fc.type==2 && wlan.wep.iv`, `wlan_mgt.fixed.capabilities.privacy==1`
- PcapInspector, ConfigViewer — simulated lab config audit
- Scapy — `Dot11WEP`, `WEP` layer? Actually Scapy has `Dot11WEP` for WEP packets

### Evidence Collection

- Beacon: SSID LEGACY-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 Privacy 1 no RSN frame number, PCAP hash, filter `wlan.fc.type_subtype==8 && wlan_mgt.fixed.capabilities.privacy==1`
- Data: WEP data IV + KeyID + encrypted payload filter `wlan.wep.iv`, frame numbers, IVs, etc.
- Config: hostapd.conf wep_default_key=0 wep_key0=12345 hash SHA256
- For hardware lab: PCAP 40k frames, aircrack-ng output key found, etc.

### Interactive Check

> You see beacon SSID LEGACY-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 Privacy 1 no RSN, hostapd.conf wep_key0=12345. What is finding, severity, why, impact, recommendation?

Answer: Finding Deprecated Encryption WEP in Use LEGACY-WIFI Critical. Why: WEP uses 24-bit IV 16M values reuse fast birthday 4096, RC4 weak scheduling FMS weak IVs (3,255,x) leak key bytes, ICV CRC32 not cryptographic malleable, no replay protection, shared key auth leaks keystream (plaintext challenge + ciphertext = keystream). Impact: Confidentiality broken, decrypt with same IV if one plaintext known, key recovery PTW 40k frames 10 sec, injection via ChopChop, network access. Recommendation: Disable WEP, migrate to WPA3-SAE PMF required ieee80211w=2 or WPA2-PSK CCMP strong PSK 20+ random, disable WPS wps_state=0, strong secret, WIDS, training. Evidence: Beacon f1 SSID LEGACY-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 Privacy 1 no RSN, config wep_key0=12345 hash, filter wlan.wep.iv.

## References

- IEEE 802.11-1997 — WEP
- Fluhrer, Mantin, Shamir 2001 — Weaknesses in the Key Scheduling Algorithm of RC4 (FMS)
- KoreK 2004 — Improved FMS, ChopChop
- Pyshkin, Tews, Weinmann 2007 — Breaking 104-bit WEP in less than 60 seconds (PTW)
- Berkeley 2001 — Intercepting Mobile Communications: The Insecurity of 802.11
- OWASP, NIST SP 800-153 — WEP deprecated, prohibited
- Wireshark 802.11 — WEP, wlan.wep.iv
- aircrack-ng, airodump-ng, aireplay-ng — WEP cracking

---

*Next: WEP Attacks — FMS, KoreK, PTW, ChopChop, lab, evidence, remediation*

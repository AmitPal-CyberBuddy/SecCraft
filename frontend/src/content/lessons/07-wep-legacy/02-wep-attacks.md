# WEP Attacks — FMS, KoreK, PTW, ChopChop Deep Dive

## Learning Objectives
- Master FMS attack 2001: weak IVs (3,255,x) leak key bytes, 4M frames, Fluhrer Mantin Shamir
- Understand KoreK 2004: 17 attacks, improved FMS, 500k frames, ChopChop decryption without key
- Deep dive PTW 2007: Klein RC4 analysis, 40k frames 10 sec, most effective, aircrack-ng -z
- Learn ChopChop: decrypt without key via ICV guessing, truncate last byte, AP response
- Understand ARP replay: generate traffic for IV collection, aireplay-ng --arpreplay
- Build VAPT evidence: PCAP 40k WEP data IVs, aircrack-ng output key found, config hash, frame numbers
- Learn remediation: migrate to WPA3/WPA2 CCMP, strong PSK, PMF, no WEP, WIDS

## Theory

### FMS Attack (Fluhrer, Mantin, Shamir 2001) — 4M Frames

**Paper:** "Weaknesses in the Key Scheduling Algorithm of RC4" — FMS 2001.

**Weak IVs:** IV of form (3, 255, x) where x is variable — e.g., IV = 0x03FFxx — first byte of keystream leaks key byte.

**How it works:**
- WEP Key = IV (3 bytes) + Secret (5 or 13 bytes) = 8 or 16 bytes total for RC4
- RC4 KSA: S-box S[0..255] initialized 0..255, j=0, for i=0..255: j = (j + S[i] + Key[i mod KeyLen]) mod 256, swap S[i], S[j] — key scheduling shuffles S based on Key
- For weak IV (3,255,x), after KSA first 3 steps, S[0]=3, S[1]=0, S[2]=255? Actually something like that — S[3] = x + Secret[0]? Let's recall: For IV (3,255,x), after 3 KSA steps, j = 3+... — first PRGA output leaks Secret[0] — first byte of keystream = S[S[1]+S[S[3]]] etc., which depends on Secret[0] + x — if attacker knows first plaintext byte (e.g., LLC header 0xAA), can recover keystream first byte, then derive Secret[0] = keystream - x - S?
- Need many weak IVs for each key byte — collect ~4M frames with weak IVs — recover secret key byte by byte via voting.
- Tool: `aircrack-ng` FMS — `aircrack-ng wep-01.cap` — collects weak IVs, recovers key.

**Example:**
- IV = 03 FF 01, Secret = 12 34 56 78 90 (5 bytes), Key = 03 FF 01 12 34 56 78 90 (8 bytes)
- RC4 KSA first 3 steps: i=0 j=3 S[0]=3 S[3]=0? Actually S[0]=0 initially, j=0+S[0]+Key[0]=3 => swap S[0] and S[3] => S[0]=3 S[3]=0, i=1 j=3+S[1]+Key[1]=3+1+255=259 mod256=3 => swap S[1] and S[3] => S[1]=0 S[3]=1, i=2 j=3+S[2]+Key[2]=3+2+1=6 => swap S[2] and S[6] => etc.
- After KSA, first PRGA byte leaks Secret[0] — if first plaintext byte known (0xAA for LLC), keystream first byte = Ciphertext first byte XOR 0xAA, then Secret[0] = keystream - x - ... — voting.

**For PT:** FMS needs 4M frames, slow, but first break of WEP.

**Filter for weak IVs:**
- WEP data with IV first byte 3, second 255 — `wlan.wep.iv==03:FF:xx`? Actually tshark `wlan.wep.iv` 3 bytes — filter `wlan.wep.iv[0]==3 && wlan.wep.iv[1]==255` — weak IVs.

### KoreK Attacks (2004) — 500k Frames, 17 Attacks, ChopChop

**KoreK:** Improved FMS, 17 different attacks (FMS + KoreK), not just (3,255,x) but other IV forms, plus ChopChop.

**ChopChop (KoreK):**
- Decrypt without key — no need to recover secret, just decrypt packet.
- How: WEP uses CRC32 ICV — linear — attacker can truncate last byte of encrypted payload, guess ICV, send to AP — AP will check ICV, if correct, AP will not send deauth, if incorrect, AP will send deauth? Actually AP will drop packet if ICV incorrect? For ChopChop, attacker truncates last byte of ciphertext, guesses last plaintext byte and ICV, sends to AP — if AP forwards packet (or doesn't send deauth), guess correct? Let's recall: ChopChop sends packet with truncated payload and guessed ICV — AP will check ICV, if ICV correct, AP will accept and maybe forward or respond, if ICV incorrect, AP will drop — attacker can brute-force last byte via AP response.
- Steps: Capture WEP data packet, truncate last byte of encrypted payload (so payload length -1), guess last plaintext byte (0-255) and compute new ICV CRC32, encrypt? Actually need keystream? No, ChopChop doesn't need keystream initially — it guesses plaintext byte and ICV, sends packet to AP — if AP accepts, guess correct, then can recover keystream for that byte (Ciphertext XOR Plaintext = Keystream), then repeat for previous byte, decrypt entire packet byte by byte without knowing secret.
- Tool: `aircrack-ng --chopchop -b AA:BB:CC:DD:EE:FF -h clientMAC wlan0mon` — ChopChop attack — needs AP to be WEP and client to be associated? Actually ChopChop needs to send packets to AP and get response — AP will drop if ICV wrong, but if ICV correct, AP may forward or not? In practice, ChopChop works because AP will not send deauth if ICV correct? Let's check aircrack-ng docs: ChopChop decrypts packet by guessing.
- For PT: ChopChop decrypts without key, then can inject.

**ARP Replay (Traffic Generation):**
- WEP needs many IVs — 4M for FMS, 500k for KoreK, 40k for PTW — need to generate traffic.
- ARP request is good — small, known plaintext (LLC 0xAAAA03..., ARP packet structure known), and AP will rebroadcast ARP request? Actually ARP request is broadcast, AP will forward? For WEP, ARP request from client to AP, AP will broadcast? Or ARP replay attack: Capture ARP request (client → AP), then replay it — AP will rebroadcast? Actually `aireplay-ng --arpreplay` listens for ARP request (from client to AP), then replays it — AP will generate new packet with new IV, thus generating traffic and IVs — quickly collect 40k IVs.
- Tool: `aireplay-ng --arpreplay -b BSSID -h clientMAC wlan0mon` — waits for ARP packet, then replays.

**For PT:** KoreK + ARP replay = 500k frames, faster than FMS.

### PTW Attack (Pyshkin, Tews, Weinmann 2007) — 40k Frames, 10 Sec, Most Effective

**Paper:** "Breaking 104-bit WEP in less than 60 seconds" — PTW 2007.

**Klein RC4 Analysis:**
- Klein 2005: RC4 keystream has biases — second byte biased to 0 with probability 2/256 instead of 1/256, etc. — PTW uses Klein's biases to recover key with fewer frames.
- PTW needs only 40k frames (not 4M) — 10 sec on busy network — recovers key in seconds.
- How: Collect 40k WEP data frames with different IVs, analyze keystream biases, recover secret key via Klein's attack — not just weak IVs (3,255,x) but all IVs.
- Tool: `aircrack-ng -z wep-01.cap` — PTW attack — `-z` for PTW, default FMS/KoreK, but PTW is default now? Actually aircrack-ng uses PTW by default if enough frames? `-z` forces PTW.

**Example:**
- Capture 40k WEP data frames via `airodump-ng` — `airodump-ng wlan0mon --bssid AA:BB:CC:DD:EE:FF -c 6 -w wep`
- Generate traffic via `aireplay-ng --arpreplay` to quickly get 40k
- Crack via `aircrack-ng -z wep-01.cap` — output key found 12345 or 1234567890123

**For PT:** PTW is most effective — 40k frames, 10 sec — WEP broken in minutes.

### WEP Cracking Lab — Hardware (Requires RF Adapter, Explicit ROE, Own Lab)

**This lab requires hardware RF adapter (ALFA AWUS036ACH) with monitor mode and injection, and explicit ROE, own lab — not simulated — marked as hardware lab with prep docs.**

**Prep:**
- Adapter: ALFA AWUS036ACH (MT7612U) or AWUS036NHA (AR9271) — supports monitor, injection
- Driver: `iw`, `ip`, `airmon-ng`, `aireplay-ng --test` injection test
- Hostapd: Setup WEP AP — `hostapd.conf` with `wep_default_key=0`, `wep_key0=12345`, `hw_mode=g`, `channel=6`, `ssid=LEGACY-WIFI`
- Client: Connect to WEP AP — e.g., phone or laptop with WEP key 12345 — generate traffic — ping, etc.
- Attacker: Kali with ALFA

**Steps:**
1. **Monitor mode:** `airmon-ng check kill`, `airmon-ng start wlan0` → `wlan0mon`, `iw dev wlan0mon info` check type monitor, `aireplay-ng --test wlan0mon` injection test success
2. **Capture:** `airodump-ng wlan0mon --bssid AA:BB:CC:DD:EE:FF -c 6 -w wep` — capture WEP data to `wep-01.cap`
3. **Generate traffic:** `aireplay-ng --arpreplay -b AA:BB:CC:DD:EE:FF -h clientMAC wlan0mon` — wait for ARP packet, then replay — quickly get 40k IVs — `airodump-ng` shows #Data increasing fast
4. **Crack:** `aircrack-ng -z wep-01.cap` — PTW — key found `12345` (ASCII) or hex
5. **Evidence:** PCAP `wep-01.cap` 40k frames, aircrack-ng output `KEY FOUND! [ 12:34:56:78:90 ]` or ASCII `12345`, config hash, etc.

**Alternative ChopChop:**
- `aireplay-ng --chopchop -b AA:BB:CC:DD:EE:FF -h clientMAC wlan0mon` — decrypt packet without key — output `decrypted packet` and `keystream`
- Then `packetforge-ng` to forge packet and inject.

**For this academy:** Simulated only — hardware lab marked with prep docs, not executed in browser — zero-cost simulated philosophy kept.

### Simulated Lab — Config Audit (Zero-Cost)

**Artifact:** hostapd.conf LEGACY-WIFI WEP

**Tasks:**
1. Identify SSID LEGACY-WIFI, BSSID? Channel 6, Security WEP, Key 12345 40-bit weak, Privacy 1 no RSN, no PMF, no WPS? Check
2. Why Critical? IV 24-bit reuse birthday 4096, RC4 weak FMS (3,255,x) leak key bytes, ICV CRC32 malleable, no replay, shared key auth leaks keystream (plaintext challenge + ciphertext = keystream), PTW 40k frames 10 sec
3. Impact: Confidentiality broken, decrypt with same IV if one plaintext known (ARP), key recovery PTW 40k frames 10 sec, injection via ChopChop and ICV malleability, network access
4. Recommendation: Disable WEP, migrate to WPA3-SAE PMF required ieee80211w=2 or WPA2-PSK CCMP strong PSK 20+ random, disable WPS wps_state=0, enable PMF required, use WPA3-only for 6 GHz, rotate PSK, per-user via WPA2-EAP if possible, WIDS detection of WEP, training
5. Evidence: Beacon f1 SSID LEGACY-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 Privacy 1 no RSN frame number, config wep_key0=12345 hash SHA256, filter wlan.wep.iv, PCAP wep.pcapng 40k frames if hardware lab

**For PT:** Config audit is enough for simulated lab — no need to crack, just identify Critical and remediation.

### Tools Deep Dive

- **aircrack-ng:** WEP cracking — `aircrack-ng wep-01.cap` (FMS/KoreK), `aircrack-ng -z wep-01.cap` (PTW), `aircrack-ng --help`
- **airodump-ng:** Capture — `airodump-ng wlan0mon --bssid AA:BB:CC:DD:EE:FF -c 6 -w wep` — writes `wep-01.cap`, `wep-01.csv`, etc.
- **aireplay-ng:** Traffic generation and attacks — `--arpreplay` ARP replay to generate IVs, `--chopchop` ChopChop decrypt without key, `--fragment` fragmentation attack, `--test` injection test
- **packetforge-ng:** Forge packets after ChopChop — `packetforge-ng --arp -a BSSID -h clientMAC -k 192.168.1.1 -l 192.168.1.100 -y keystream.xor -w arp-request`
- **Wireshark, tshark:** Filters `wlan.wep.iv`, `wlan.fc.type==2 && wlan.wep.iv`, `wlan_mgt.fixed.capabilities.privacy==1`
- **PcapInspector, ConfigViewer:** Simulated lab
- **Scapy:** `Dot11WEP` layer — `packet = Dot11()/Dot11WEP(iv=0x123456, key_id=0)/LLC()/ARP()` — craft WEP packets

**Example tshark:**
```bash
tshark -r wep.pcapng -Y "wlan.wep.iv" -T fields -e frame.number -e wlan.bssid -e wlan.wep.iv -e wlan.sa -e wlan.da
tshark -r wep.pcapng -Y "wlan.fc.type_subtype==8 && wlan_mgt.fixed.capabilities.privacy==1" -T fields -e frame.number -e wlan_mgt.ssid -e wlan.bssid
sha256sum wep.pcapng
aircrack-ng -z wep-01.cap
```

### VAPT Relevance

- **WEP is Critical, not High — key recovery in minutes, confidentiality total loss, integrity loss, network access**
- **Config audit:** If you see WEP in beacon (privacy bit 1 no RSN) or hostapd.conf wep_key0, it's Critical — no need to crack, just report
- **Evidence:** Beacon BSSID SSID Ch Privacy no RSN frame number, config wep_key0 hash, PCAP 40k WEP data IVs if hardware lab, aircrack-ng output key found
- **Report:** "WEP is cryptographically broken, IV 24-bit reuse birthday 4096, RC4 weak scheduling FMS weak IVs (3,255,x) leak key bytes, ICV CRC32 malleable, no replay, shared key auth leaks keystream, key recovery PTW 40k frames 10 sec, Critical, migrate to WPA3 or WPA2-PSK CCMP, strong PSK 20+, PMF required"
- **CVSS:** Critical 9.1 AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N
- **Remediation:** Disable WEP, WPA3-SAE PMF required or WPA2-PSK CCMP strong PSK 20+ random, disable WPS, PMF required, WPA3-only for 6 GHz, WIDS, training

### Attack → Defense → Retest

- **Attack:** Observe beacon LEGACY-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 Privacy 1 no RSN WEP, config wep_key0=12345 40-bit weak, IV reuse, RC4 weak, ICV malleable, no replay, shared key auth leaks keystream, PTW 40k frames 10 sec key recovery (hardware lab with ALFA, airodump-ng, aireplay-ng --arpreplay, aircrack-ng -z), ChopChop decrypt without key, injection via packetforge-ng
- **Defense:** Migrate to WPA3-SAE PMF required ieee80211w=2 or WPA2-PSK CCMP strong PSK 20+ random not in wordlists, disable WPS wps_state=0, disable WEP, use WPA3-only for 6 GHz, strong secret, WIDS authorized list, no WEP, training, audits
- **Retest:** New PCAPs show no WEP beacons, no WEP data, beacon RSN IE CCMP PSK PMF required, strong PSK audit fails, WPS disabled, PMF required, config hash new, etc.

### Interactive Check

> You capture beacon SSID LEGACY-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 Privacy 1 no RSN, hostapd.conf wep_key0=12345. What are attacks, how many frames needed for each, tools, evidence?

Answer: Attacks FMS 2001 weak IVs (3,255,x) leak key bytes need 4M frames aircrack-ng, KoreK 2004 17 attacks improved 500k frames aircrack-ng, PTW 2007 Klein RC4 biases 40k frames 10 sec most effective aircrack-ng -z, ChopChop decrypt without key via ICV guessing truncate last byte AP response aireplay-ng --chopchop, ARP replay generate traffic aireplay-ng --arpreplay. Evidence beacon f1 SSID LEGACY-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 Privacy 1 no RSN, config wep_key0=12345 hash, PCAP 40k WEP data IVs, aircrack-ng output KEY FOUND. Impact Critical confidentiality broken decrypt with same IV if one plaintext known, key recovery PTW 40k 10 sec, injection. Recommendation migrate to WPA3-SAE PMF required or WPA2-PSK CCMP strong PSK 20+ random.

## References

- Fluhrer, Mantin, Shamir 2001 — FMS
- KoreK 2004 — KoreK attacks, ChopChop
- Pyshkin, Tews, Weinmann 2007 — PTW
- Berkeley 2001 — WEP insecurity
- aircrack-ng, airodump-ng, aireplay-ng — tools
- Wireshark 802.11 — WEP, wlan.wep.iv
- OWASP, NIST SP 800-153 — WEP deprecated

---

*Next: WEP Remediation & Reporting — Migration to WPA3/WPA2, evidence, CVSS, retest*

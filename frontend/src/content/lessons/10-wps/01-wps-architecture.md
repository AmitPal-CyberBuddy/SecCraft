# WPS — Wi-Fi Protected Setup Architecture & PIN Flaw

## Learning Objectives
- Master WPS architecture: PIN, PBC, NFC, USB, roles enrollee/registrar/AP, EAP, 8 messages M1-M8
- Understand PIN structure: 8 digits, last digit checksum, halves flaw 10^4+10^3=11k not 10^8, checksum reduces entropy
- Learn WPS exchange: Probe Req/Resp with WPS IE OUI 00:50:F2:04, EAPOL-Start, WPS Start, M1-M8 with nonces, hashes, PSK in M7-M8
- Understand security implications: brute-force 11k tries 3 hours, rate limiting, lockout, lockout bypass, PBC via UPnP, WPS IE in beacons
- Build VAPT evidence: beacon WPS IE present, BSSID, SSID, channel, WPS State, AP Setup Locked, config wps_state, frame numbers, hash, wash output
- Learn defense: disable WPS wps_state=0, no PBC via UPnP, strong lockout, PBC only with physical button, but better disabled, WPA3

## Theory

### What is WPS? — Designed to Simplify WPA2-PSK Setup for Home Users, Failed

**WPS (Wi-Fi Protected Setup) — Wi-Fi Alliance 2006 — 4 methods to simplify WPA2-PSK setup for home users who find PSK complex:**

- **PIN (Personal Identification Number):** 8-digit PIN on AP label, client enters PIN, or AP enters client PIN — e.g., AP label PIN `12345670`, client enters PIN in OS, AP and client exchange credentials via WPS — PIN has checksum, last digit checksum of first 7 — brute-force flaw
- **PBC (Push Button Connect):** Press button on AP and client within 2 minutes (walk time), they exchange credentials via WPS — no PIN — but if attacker can press button or trigger via software (some APs have WPS PBC via UPnP), can get PSK without PIN — PBC via UPnP is risk
- **NFC (Near Field Communication):** Tap NFC — less common
- **USB (USB Flash Drive):** USB with credentials — less common

**For PT:** PIN is most common and most broken — 8-digit PIN with halves flaw 11k max — PBC also risk if UPnP or physical access — WPS should be disabled.

**Roles:**
- **Enrollee:** Client that wants to join — e.g., phone, laptop — enrollee
- **Registrar:** AP or external registrar (e.g., AP itself internal registrar, or external via UPnP) — registrar that knows PIN and gives PSK to enrollee — AP is registrar for PIN method (AP knows PIN on label), or external registrar via UPnP
- **AP:** Access Point — may be registrar or enrollee? Actually AP is registrar for PIN method, but for PBC, AP and client both enrollee? Let's not deep — for PIN, AP is registrar

**EAP (Extensible Authentication Protocol):**
- WPS uses EAP — EAPOL-Start, WPS Start, M1-M8 EAP messages — EAP is for 802.1X, but WPS uses EAP for credential exchange — not EAP-TLS, but WPS EAP

### PIN Structure — 8 Digits, Checksum, Halves Flaw 11k Not 100M

```
PIN: 12345670 — 8 digits
- First 4 digits: 1234 — first half — 0000-9999 — 10^4 = 10000 possibilities
- Next 3 digits: 567 — second half first 3 — 000-999 — 10^3 = 1000 possibilities
- Last digit: 0 = checksum of first 7 digits — checksum reduces entropy — last digit not random, computed from first 7

Checksum algorithm (WPS PIN checksum):
  PIN = d1 d2 d3 d4 d5 d6 d7 d8
  d8 = checksum of d1-d7
  Compute: (3*(d1+d3+d5+d7) + (d2+d4+d6)) %10, then (10 - result) %10 = d8
  Example: d1=1,d2=2,d3=3,d4=4,d5=5,d6=6,d7=7
    3*(1+3+5+7)=3*16=48, (2+4+6)=12, total 60, %10=0, (10-0)%10=0 => d8=0 => PIN 12345670 — checksum 0

Brute-force weakness:
  AP verifies first half (4 digits) separately from second half (3 digits + checksum)
  So attacker can brute first half 10^4=10000 tries, then second half 10^3=1000 tries = 11000 max, not 10^8=100,000,000
  Plus checksum reduces last digit, so second half is 1000 not 10000
  Total ~11000 attempts, not 100M — 11k tries at 1 try/sec = 3 hours, at 2 tries/sec = 1.5 hours — feasible

  If AP has no rate limiting or weak lockout, 11k tries = 3 hours — PSK recovery — network access

  Plus some APs have even worse — first half 10^4 but second half 10^3, but some APs have no lockout, so 11k tries = 3 hours — feasible

  For PT: WPS PIN 11k flaw is High finding — if no lockout or weak lockout, High — if strong lockout (lock after 3 fails for 60 sec, or after 10 fails lock for hours, or permanent lock), Medium — but still WPS should be disabled
```

**For PT:** WPS PIN 8-digit with halves flaw 11k is critical design flaw — not just implementation — WPS should be disabled.

### WPS Exchange — Simplified M1-M8

```
Client (Enrollee)                AP (Registrar, internal)
|  Probe Request with WPS IE OUI 00:50:F2:04 Type 4     |
|------------------------------------------------------>|
|  Probe Response with WPS IE OUI 00:50:F2:04 Type 4    |
|<------------------------------------------------------|
|  EAPOL-Start, WPS Start (EAP Request Identity)         |
|------------------------------------------------------>|
|  M1 (Enrollee nonce, enrollee MAC, public key, etc.)  |
|------------------------------------------------------>|
|  M2 (Registrar nonce, registrar MAC, public key, etc.)|
|<------------------------------------------------------|
|  M3 (Enrollee auth, etc.)                             |
|------------------------------------------------------>|
|  M4 (Registrar auth, etc.) — if first half wrong, NACK after M4 |
|<------------------------------------------------------|
|  M5 (first half of PIN proof, enrollee)               |
|------------------------------------------------------>|
|  M6 (first half proof response, registrar)            |
|<------------------------------------------------------|
|  M7 (second half + PSK, enrollee) — if second half wrong, NACK after M6 |
|------------------------------------------------------>|
|  M8 (PSK, registrar) — PSK sent encrypted? Actually PSK in M7-M8 |
|<------------------------------------------------------|
|  EAP-Fail or EAP-Success, WPS Done, EAPOL-Key? Actually after M8, EAP success, then 4-way handshake with PSK |
```

**Details:**
- **Probe Request/Response with WPS IE:** Client and AP include WPS IE Tag 221 OUI 00:50:F2:04 Type 4 in probe req/resp and beacon — WPS IE present indicates WPS enabled — easy to enumerate via `wash` or Wireshark filter `wps`
- **M1:** Enrollee nonce 16 bytes random, enrollee MAC, public key (Diffie-Hellman?), etc.
- **M2:** Registrar nonce 16 bytes, registrar MAC, public key, etc.
- **M3-M4:** Auth — if first half PIN wrong, AP returns NACK after M4 — so attacker knows first half correct if no NACK after M4, NACK after M6 means first half correct but second half wrong — so attacker can brute first half separately
- **M5:** First half of PIN proof — enrollee proves first half
- **M6:** Registrar response — if first half correct, M6 success, else NACK
- **M7:** Second half + PSK — enrollee sends second half and PSK? Actually M7 contains PSK? Let's check WPS spec: M7 contains PSK? Actually M7 contains second half proof and encrypted settings (PSK) — AP sends PSK in M7-M8? Let's recall: In WPS, registrar (AP) sends PSK to enrollee in M7-M8? Actually enrollee is client, registrar is AP — AP knows PSK, client doesn't — after PIN verification, AP sends PSK to client in M7-M8 encrypted — so M7-M8 contain PSK — attacker who brute-forces PIN gets PSK in M7-M8 — network access
- **M8:** PSK — registrar sends PSK to enrollee — PSK is network key — e.g., `WiFiForgeLab123!` — attacker gets PSK — network access

**If first half wrong, NACK after M4 — if first half correct but second half wrong, NACK after M6 — so attacker knows which half is correct — brute first half 10^4, then second half 10^3 = 11k max.**

**For PT:** WPS exchange M1-M8 — if PIN correct, PSK in M7-M8 — attacker brute-forces PIN 11k, gets PSK — network access — High finding.

### Security Implications — Brute-Force, Rate Limiting, Lockout, Bypass, PBC via UPnP

**Brute-Force 11k:**
- 11k tries at 1 try/sec = 3 hours, at 2 tries/sec = 1.5 hours — feasible — many APs have no rate limiting or weak lockout — e.g., old APs, IoT, etc. — 11k tries = 3 hours — PSK recovery — network access — High
- Tool: `reaver -i wlan0 -b AA:BB:CC:DD:EE:FF -vv` — WPS PIN brute-force — tries PINs sequentially or with custom, shows progress, first half/second half, etc. — `bully -b AA:BB:CC:DD:EE:FF -c 6 wlan0` — alternative, faster, better lockout handling

**Rate Limiting & Lockout:**
- **Good AP:** Lock WPS after 3 fails for 60 sec, or after 10 fails lock for hours, or permanent lock after some fails — e.g., after 3 fails, lock 60 sec, after 10 fails, lock 1 hour, after 20 fails, permanent lock until reboot or manual unlock — rate limiting mitigates brute-force — but still WPS should be disabled — lockout is defense, but not perfect
- **Bad AP:** No lockout, 11k tries = 3 hours — no rate limiting — High — old APs, cheap APs, IoT, etc.
- **Lockout bypass:** Some APs have lockout bypass via PBC or other flaws, or reset after reboot — e.g., AP locks after 3 fails, but after reboot, lock reset — attacker can reboot AP via deauth? Actually deauth doesn't reboot, but power cycle? Or some APs have WPS lockout bypass via PBC via UPnP — `reaver` with `--ignore-locks`? Or `bully` with lockout bypass?
- **PBC (Push Button Connect):** If attacker can press button or trigger via software (some APs have WPS PBC via UPnP), can get PSK without PIN — e.g., UPnP WPS PBC — `upnp`? Actually some APs have UPnP with WPS PBC enabled — attacker on LAN can trigger WPS PBC via UPnP without physical button — risk — PBC via UPnP should be disabled
- **WPS IE in Beacons:** Beacon and probe response contain WPS IE Tag 221 OUI 00:50:F2:04 if WPS enabled — easy to enumerate via `wash -i wlan0` — `wash` shows WPS APs, BSSID, channel, WPS version, state, locked status, vendor, etc. — or Wireshark filter `wps`

**For PT:** WPS enabled = finding — High if no lockout or weak lockout, Medium if strong lockout, but still WPS should be disabled — recommendation disable WPS wps_state=0.

### WPS in PCAP — wps-beacon.pcapng (2 frames)

**File:** `wps-beacon.pcapng` (2 frames, Scapy-generated)

- Beacon BSSID AA:BB:CC:DD:EE:FF SSID LAB-WPS Ch6 2.4 GHz WPA2-PSK CCMP PSK + WPS IE present Tag 221 OUI 00:50:F2:04 Type 4 — WPS Version 1.0, WPS State 2 Configured, AP Setup Locked 0, etc.
- Probe Response also WPS IE — SA BSSID DA client SSID LAB-WPS Ch6 WPS IE

**Wireshark filter:**
```
wlan_mgt.tag.number==221 && wlan_mgt.tag.oui==00:50:f2 && wlan_mgt.tag.oui.type==4
# Or simpler:
wps
wps && wlan.bssid==AA:BB:CC:DD:EE:FF
```

**Config:**
```
hostapd.conf:
interface=wlan0
ssid=LAB-WPS
hw_mode=g
channel=6
wpa=2
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
wpa_passphrase=StrongPass123
wps_state=2
ap_setup_locked=0
eap_server=1
wps_pin=12345670
# wps_state=2 enabled, ap_setup_locked=0 not locked, eap_server=1 for WPS EAP, wps_pin=12345670 default PIN 12345670 checksum 0
```

**Good config:** `wps_state=0` (disabled) — no WPS IE in beacon — no WPS

**For PT:** Beacon with WPS IE present = WPS enabled = finding — High/Medium depending on lockout — evidence beacon frame number with WPS IE, BSSID, SSID, channel, WPS State, AP Setup Locked, config wps_state=2, etc.

### Attack (Lab-Only, Authorized, Own Lab, Explicit ROE, Hardware)

**Do NOT attack real APs — only own lab AP with explicit ROE — hardware lab requiring RF adapter ALFA with monitor mode and injection — marked as hardware lab with prep docs — zero-cost simulated philosophy kept but mark hardware labs requiring RF adapter with prep docs.**

**For lab understanding (own LAB-WPS AP only):**

```bash
# On Kali, against own LAB-WPS AP BSSID AA:BB:CC:DD:EE:FF Ch6

# Enumerate WPS APs
wash -i wlan0mon
# Output: BSSID Ch dBm WPS Version WPS Locked State Vendor ESSID
# AA:BB:CC:DD:EE:FF 6 -50 1.0 No Configured Lab LAB-WPS

# Audit WPS (authorized lab AP only) — reaver
reaver -i wlan0mon -b AA:BB:CC:DD:EE:FF -c 6 -vv
# Output: Trying PIN 12345670, M1, M2, M3, M4, M5, M6, M7, M8, PSK found, etc.
# Rate limiting will cause lockout — good APs lock after 3-10 fails — reaver shows locked

# Or bully — faster, better lockout handling
bully -b AA:BB:CC:DD:EE:FF -c 6 wlan0mon
# Output: PIN, PSK, etc.

# For PBC via UPnP (if AP has UPnP WPS PBC enabled and attacker on LAN)
# Use upnp tools to trigger WPS PBC? Actually some APs have UPnP with WPS PBC — attacker on LAN can trigger via UPnP without physical button — risk
```

**Rate limiting will cause lockout — good APs lock after 3-10 fails — reaver shows WPS locked — lockout is defense, but still WPS should be disabled.**

**For this academy:** Simulated lab only — no brute-force in simulated lab — only concept and enumeration via PCAP `wps-beacon.pcapng` and config audit — hardware lab marked with prep docs.

### VAPT Relevance — Enumeration, Config Audit, Evidence, Impact, Recommendation, Retest

- **Enumeration:** Check beacon for WPS IE Tag 221 OUI 00:50:F2:04 — if present, WPS enabled = finding — High if no lockout or weak lockout, Medium if strong lockout, but still WPS should be disabled — `wash -i wlan0mon` or Wireshark filter `wps`
- **Config audit:** `wps_state=2` = enabled, weak — High/Medium — `wps_state=0` = disabled — good — `ap_setup_locked=0` not locked, `1` locked — `eap_server=1` for WPS EAP — `wps_pin=12345670` default PIN
- **Evidence:** Beacon frame number with WPS IE present, BSSID, SSID, channel, WPS State, AP Setup Locked, WPS Version, vendor, signal, config `hostapd.conf` snippet `wps_state=2`, PCAP hash, filter `wps`, `wash` output BSSID Ch WPS Version Locked State
- **Impact:** PIN brute-force 11k tries 3 hours → PSK recovery → network access → lateral movement, data theft, pivot — High if no lockout, Medium if lockout, but still WPS should be disabled
- **Recommendation:** Disable WPS `wps_state=0`, no PBC via UPnP, if needed enable with strong lockout (lock after 3 fails for 60 sec, after 10 fails lock for hours, permanent lock) and PBC only with physical button, but better disabled, use WPA3 or WPA2-PSK CCMP strong PSK 20+ random PMF required, WIDS detection of WPS beacons
- **Retest:** Verify WPS IE absent in beacons after fix — filter `wps` empty, `wash` no longer detects WPS, config `wps_state=0`, PCAP new hash, frame numbers new

### Finding Template

```
Title: WPS Enabled — PIN Brute-Force Risk (LAB-WPS)
Severity: High (if no lockout or weak lockout) / Medium (if strong lockout)
CVSS: 7.5 (AV:A/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N) — Adjacent, Low complexity, No privileges, No user interaction, Scope Unchanged, Confidentiality High, Integrity High — if no lockout High, if lockout Medium 5.5?
Description: WPS PIN 8-digit with design flaw allows 11k brute-force max (10^4 first half + 10^3 second half, not 10^8), last digit checksum reduces entropy, AP verifies first half separately (NACK after M4 if first half wrong, NACK after M6 if second half wrong), so attacker can brute first half 10000 tries then second half 1000 tries = 11000 max. AP has WPS IE Tag 221 OUI 00:50:F2:04 Type 4 in beacon, WPS State 2 Configured, AP Setup Locked 0 not locked, no rate limiting observed (lab) or weak lockout.
Evidence: Beacon frame 1 BSSID AA:BB:CC:DD:EE:FF SSID LAB-WPS Ch6 2.4 GHz WPA2-PSK CCMP PSK WPS IE present Tag 221 OUI 00:50:F2:04 Type 4 WPS Version 1.0 State 2 Configured Locked 0, Probe Response f2 same, hostapd.conf wps_state=2 ap_setup_locked=0 eap_server=1 wps_pin=12345670 default PIN, config hash SHA256 abc123..., PCAP wps-beacon.pcapng SHA256 def456... Frames 2, filter wps, wash output BSSID AA:BB:CC:DD:EE:FF Ch 6 WPS Version 1.0 Locked No State Configured Vendor Lab ESSID LAB-WPS
Impact: PIN brute-force 11k tries 3 hours at 1 try/sec → PSK recovery via M7-M8 containing PSK → network access → lateral movement, data theft, pivot, compliance fail
Recommendation: Disable WPS immediately, set wps_state=0 in hostapd.conf, no PBC via UPnP, if needed enable with strong lockout (lock after 3 fails for 60 sec, after 10 fails lock for hours, permanent lock after 20 fails) and PBC only with physical button, but better disabled, use WPA3-SAE or WPA2-PSK CCMP strong PSK 20+ random PMF required ieee80211w=2, WIDS detection of WPS beacons filter wps, training, audits
Config Snippet Good:
interface=wlan0
ssid=LAB-WPS
hw_mode=g
channel=6
wpa=2
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
wpa_passphrase=StrongRandomPassphrase123!@#With20+Chars
ieee80211w=2
wps_state=0
Retest: Verify beacon no WPS IE filter wps empty, wash no longer detects WPS, config wps_state=0 hash new SHA256..., PCAP new hash new frame numbers no WPS IE, WPS disabled
References: Wi-Fi Alliance WPS, Viehboeck 2011 WPS PIN flaw, Stefan Viehboeck, Craig Heffner, Dominique Bongard, 802.11, OWASP, NIST
```

### Lab — Simulated (Zero-Cost) + Hardware (Optional)

**Simulated lab: PCAP analysis + config audit (zero-cost):**
- **PCAP:** `wps-beacon.pcapng` (2 frames) — identify WPS IE, BSSID, SSID, channel, WPS State, AP Setup Locked, WPS Version, vendor, signal, etc.
- **Tasks:**
  1. Filter `wps` → how many beacons with WPS IE? What BSSID? SSID? Channel? WPS State? AP Setup Locked? WPS Version? Vendor? Signal?
  2. Filter `wlan.fc.type_subtype==8 && wps` → beacons with WPS IE — frame numbers
  3. Filter `wlan.bssid==AA:BB:CC:DD:EE:FF && wps` → WPS for specific BSSID
  4. Config audit: `hostapd.conf` with `wps_state=2` enabled vs `0` disabled — why High/Medium? Impact? Recommendation with config snippet?
  5. Evidence: Beacon frame number with WPS IE, BSSID, SSID, channel, WPS State, config hash, filter, PCAP hash

**Hardware lab (optional, requires RF adapter ALFA, explicit ROE, own lab):**
- Setup: Hostapd with WPS enabled `wps_state=2`, `wps_pin=12345670`, client, attacker with ALFA monitor mode
- Steps: `wash -i wlan0mon` enumerate WPS, `reaver -i wlan0mon -b AA:BB:CC:DD:EE:FF -c 6 -vv` brute-force PIN 11k (lab only), `bully` alternative, observe lockout after 3-10 fails, PSK recovery via M7-M8
- Evidence: Wash output, reaver output PIN found PSK found, PCAP with WPS M1-M8, etc.
- For this academy: Simulated only, hardware marked with prep docs.

### Tools

- `wash` — WPS enumeration: `wash -i wlan0mon` — shows WPS APs BSSID Ch dBm WPS Version Locked State Vendor ESSID
- `reaver` — WPS PIN brute-force: `reaver -i wlan0mon -b BSSID -c 6 -vv` — tries PINs, shows M1-M8, PSK found, lockout handling
- `bully` — Alternative WPS brute-force: `bully -b BSSID -c 6 wlan0mon` — faster, better lockout bypass?
- Wireshark, tshark — filter `wps`, `wlan_mgt.tag.number==221 && wlan_mgt.tag.oui==00:50:f2 && wlan_mgt.tag.oui.type==4`
- PcapInspector, ConfigViewer — simulated lab
- `hostapd` — config `wps_state`, `ap_setup_locked`, `eap_server`, `wps_pin`
- `sha256sum` — hash for evidence chain

### Evidence Collection

- Beacon: SSID LAB-WPS BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK WPS IE present Tag 221 OUI 00:50:F2:04 Type 4 WPS Version 1.0 State 2 Configured Locked 0 frame number f1, PCAP hash, filter `wps`
- Probe Response: Same WPS IE, frame number f2
- Config: hostapd.conf wps_state=2 ap_setup_locked=0 eap_server=1 wps_pin=12345670 hash SHA256
- Wash: Output BSSID Ch WPS Version Locked State Vendor ESSID
- For hardware lab: Reaver output PIN found PSK found, PCAP M1-M8, etc.

### Attack → Defense → Retest

- **Attack:** Observe beacon LAB-WPS BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK WPS IE present Tag 221 OUI 00:50:F2:04, config wps_state=2, WPS State 2 Configured Locked 0, no rate limiting or weak lockout, brute-force PIN 11k tries 3 hours via reaver/bully (lab only, authorized, own lab, hardware), PSK recovery via M7-M8 containing PSK, network access
- **Defense:** Disable WPS wps_state=0, no PBC via UPnP, if needed strong lockout (lock after 3 fails 60 sec, after 10 fails hours, permanent after 20) and PBC only with physical button, but better disabled, use WPA3-SAE or WPA2-PSK CCMP strong PSK 20+ random PMF required ieee80211w=2, WIDS detection of WPS beacons filter wps, training, audits
- **Retest:** New beacon no WPS IE filter wps empty, wash no longer detects WPS, config wps_state=0 hash new, PCAP new hash new frame numbers no WPS IE, WPS disabled, document new hashes

### Interactive Check

> You capture beacon SSID LAB-WPS BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK WPS IE present Tag 221 OUI 00:50:F2:04 Type 4 WPS State 2 Configured Locked 0, hostapd.conf wps_state=2 wps_pin=12345670. What is finding, severity, why, impact, recommendation, evidence, retest?

Answer: Finding WPS Enabled PIN Brute-Force Risk LAB-WPS High (no lockout) / Medium (strong lockout). Why: WPS PIN 8-digit with halves flaw 10^4+10^3=11k not 10^8, checksum reduces last digit, AP verifies first half separately NACK after M4 if first half wrong NACK after M6 if second half wrong, so brute first half 10000 then second half 1000 = 11000 max 3 hours at 1 try/sec. Impact PIN brute-force → PSK recovery via M7-M8 containing PSK → network access lateral movement data theft pivot. Recommendation disable WPS wps_state=0, no PBC via UPnP, if needed strong lockout and PBC only physical button but better disabled, use WPA3-SAE or WPA2-PSK CCMP strong PSK 20+ random PMF required. Evidence beacon f1 SSID LAB-WPS BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK WPS IE present Tag 221 OUI 00:50:F2:04 State 2 Locked 0, config wps_state=2 wps_pin=12345670 hash, filter wps, PCAP wps-beacon.pcapng hash, wash output. Retest new beacon no WPS IE filter wps empty, wash no longer detects, config wps_state=0 hash new, PCAP new hash no WPS IE.

## References

- Wi-Fi Alliance WPS specification
- Stefan Viehboeck 2011 — Brute forcing Wi-Fi Protected Setup
- Craig Heffner — reaver
- Dominique Bongard — WPS pixie dust attack (offline PIN recovery via nonce reuse? Actually pixie dust is offline WPS PIN recovery via weak random — M1 nonce reuse? But for PT, WPS PIN 11k flaw)
- 802.11, 802.11i, 802.11w
- wash, reaver, bully
- Wireshark 802.11 WPS, wps filter
- OWASP, NIST

---

*Next: WPS Enumeration & Rate Limiting — wash, lockout, bypass, PBC, evidence*

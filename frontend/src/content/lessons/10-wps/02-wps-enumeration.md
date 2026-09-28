# WPS Enumeration & Rate Limiting — Wash, Lockout, Bypass, PBC

## Learning Objectives
- Master WPS enumeration: wash -i wlan0mon, Wireshark filter wps, beacon and probe response WPS IE Tag 221 OUI 00:50:F2:04 Type 4
- Understand rate limiting & lockout: good AP lock after 3 fails 60 sec, after 10 fails hours, permanent lock after 20, bad AP no lockout 11k tries 3 hours
- Learn lockout bypass: some APs reset after reboot, PBC via UPnP, reaver --ignore-locks, bully lockout bypass, pixie dust offline PIN recovery via weak random nonce reuse
- Understand PBC risks: push button, UPnP WPS PBC trigger without physical button, LAN attacker can trigger via UPnP
- Build VAPT evidence: wash output BSSID Ch dBm WPS Version Locked State Vendor ESSID, beacon WPS IE frame number, config wps_state, hash, filter
- Learn defense: disable WPS wps_state=0, no PBC via UPnP, strong lockout if needed, PBC only physical button, but better disabled, WPA3, WIDS

## Theory

### Enumeration — Beacon with WPS IE, Probe Response with WPS IE, Wash

**WPS IE (Wi-Fi Protected Setup Information Element):**
- Tag Number 221 Vendor Specific, OUI 00:50:F2 (Microsoft), OUI Type 4 WPS, Data contains WPS attributes: Version, State, AP Setup Locked, Selected Registrar, Device Password ID, Selected Registrar Config Methods, Response Type, UUID-E, Manufacturer, Model Name, Model Number, Serial Number, Primary Device Type, Device Name, Config Methods, RF Bands, etc.
- Beacon and probe response contain WPS IE if WPS enabled — easy to enumerate — WPS enabled = finding
- Example WPS IE decode:
  ```
  Tag 221 Vendor Specific OUI 00:50:F2:04 WPS
    Version: 1.0
    State: 2 Configured
    AP Setup Locked: 0 No
    Selected Registrar: 0 No
    Device Password ID: 0x0000 Config Methods Label? Actually Device Password ID 0x0000? For PIN?
    Selected Registrar Config Methods: 0x0000? Actually Config Methods: Label, Display, PBC, Keypad, etc.
    Response Type: 3 AP
    UUID-E: 12345678-1234-1234-1234-123456789012
    Manufacturer: Lab
    Model Name: Lab-WPS
    Model Number: 1.0
    Serial Number: 12345
    Primary Device Type: 6-0050F204-1? Actually Primary Device Type: Category, OUI, Subcategory?
    Device Name: LAB-WPS
    Config Methods: 0x0084? Actually Config Methods: Label (0x0004) + PBC (0x0080) = 0x0084? Or Display, etc.
    RF Bands: 0x01 2.4 GHz? Or 0x03 2.4+5 GHz?
  ```

**Wireshark filters:**
```
wlan_mgt.tag.number==221 && wlan_mgt.tag.oui==00:50:f2 && wlan_mgt.tag.oui.type==4
# Or simpler:
wps
wps && wlan.bssid==AA:BB:CC:DD:EE:FF
wlan.fc.type_subtype==8 && wps  # Beacons with WPS IE
wlan.fc.type_subtype==5 && wps  # Probe responses with WPS IE
```

**Wash — WPS Enumeration Tool (Kali):**
- `wash` is part of reaver package — scans for WPS APs — shows BSSID, channel, dBm, WPS version, WPS locked status, state, vendor, ESSID
- Usage:
  ```bash
  wash -i wlan0mon
  # Output:
  # BSSID              Ch  dBm  WPS  Lck  Vendor    ESSID
  # AA:BB:CC:DD:EE:FF   6  -50  1.0  No   Lab       LAB-WPS
  # BB:CC:DD:EE:FF:00  11  -60  1.0  Yes  Cisco     Corp-WLAN (WPS locked)
  # Columns: BSSID, Ch, dBm signal, WPS version, Lck locked? No/Yes, Vendor, ESSID

  wash -i wlan0mon -c 6  # Channel 6 only
  wash -i wlan0mon --scan  # Active scan? Actually wash passive? Wash uses probe requests? Actually wash sends probe requests with WPS IE? Let's check — wash may be active? But for PT, wash enumeration
  ```

**For PT:** Wash enumeration is first step — if WPS APs found, WPS enabled = finding — High if no lockout, Medium if lockout, but still WPS should be disabled.

**Kismet:**
- Kismet web UI shows WPS APs, WPS IE, WPS State, Locked, etc. — WIDS

**PcapInspector:**
- Filter `wps` preset or custom `wps` → beacons with WPS IE — frame numbers, BSSID, SSID, channel, WPS State, Locked, etc.

### Rate Limiting & Lockout — Good vs Bad AP

**Good AP (with strong lockout):**
- Lock WPS after 3 fails for 60 sec — after 3 incorrect PIN attempts, AP locks WPS for 60 seconds — no response to WPS attempts for 60 sec — slows brute-force — 11k tries at 3 fails per 60 sec = 11k/3*60 sec = 220k sec = 61 hours — not feasible? Actually 3 fails then 60 sec lock, so 3 tries per 60 sec = 0.05 tries/sec — 11k tries = 11k/0.05 = 220k sec = 61 hours — slows but not impossible? Actually 61 hours = 2.5 days — still feasible but slow
- Or lock after 10 fails for 1 hour — 10 tries per hour = 0.0027 tries/sec — 11k tries = 11k/0.0027 = 4M sec = 46 days — not feasible
- Or permanent lock after 20 fails — after 20 fails, WPS permanently locked until reboot or manual unlock — brute-force fails — but still WPS should be disabled — lockout is defense, but not perfect — some APs have permanent lock, but still WPS enabled = finding Medium? Actually permanent lock is good, but still WPS enabled = Medium? But better disabled
- Example good AP: Cisco, Aruba, etc., with strong lockout — WPS enabled but locked after few fails — wash shows Lck Yes

**Bad AP (no lockout or weak lockout):**
- No lockout — 11k tries = 3 hours at 1 try/sec — no rate limiting — High — old APs, cheap APs, IoT, etc. — e.g., TP-Link old, D-Link old, etc.
- Weak lockout — lock after 10 fails for 60 sec — 10 tries per 60 sec = 0.16 tries/sec — 11k tries = 11k/0.16 = 68k sec = 19 hours — still feasible — High?
- No lockout is High finding — WPS enabled no lockout = High — PIN brute-force 11k 3 hours → PSK recovery → network access

**For PT:** Check lockout — wash shows Lck No/Yes — if Lck No and WPS enabled, High — if Lck Yes but WPS enabled, Medium — but still WPS should be disabled — recommendation disable WPS wps_state=0.

**Lockout bypass:**
- Some APs reset lockout after reboot — attacker can reboot AP via deauth? Actually deauth doesn't reboot, but power cycle? Or some APs have WPS lockout bypass via PBC or other flaws, or reset after 60 sec even if permanent? Or some APs have lockout bypass via `reaver --ignore-locks`? Actually `reaver` has `--ignore-locks` to ignore locked state and continue trying? But if AP locked, reaver will fail? `--ignore-locks` ignores locked state and tries anyway — may work if AP lock is not enforced? Or some APs have lockout bypass via PBC via UPnP?
- **Pixie Dust attack (offline WPS PIN recovery via weak random nonce reuse):** Dominique Bongard 2014 — offline WPS PIN recovery without brute-force 11k — uses weak random number generator in some APs (e.g., Broadcom) that reuses nonces — M1 nonce reuse? Actually pixie dust recovers PIN via E-S1, E-S2, etc., without brute-force — needs only M1-M3? Let's not deep — pixie dust is offline WPS PIN recovery via weak random — tool `reaver` with `--pixie-dust` or `bully` with pixie dust — recovers PIN in seconds without 11k tries — even with lockout? Actually pixie dust is offline, no lockout — if AP has weak random (e.g., nonce reuse), pixie dust recovers PIN — High finding — even with lockout, pixie dust bypasses lockout because offline — no brute-force, no lockout — so WPS enabled even with lockout is still High if pixie dust vulnerable — check `wash` with `--pixie-dust`? Actually `reaver` has pixie dust mode
- For PT: WPS enabled = finding — High if no lockout or pixie dust vulnerable, Medium if strong lockout and not pixie dust, but still WPS should be disabled

### PBC Risks — Push Button, UPnP WPS PBC Trigger Without Physical Button

**PBC (Push Button Connect):**
- Press button on AP and client within 2 minutes (walk time) — they exchange credentials via WPS — no PIN — convenient, but if attacker can press button or trigger via software, can get PSK without PIN
- **Physical PBC:** Press button on AP — requires physical access — if attacker has physical access, can press button and get PSK — risk if AP in public area — but physical access is already risk
- **UPnP WPS PBC:** Some APs have WPS PBC via UPnP — UPnP (Universal Plug and Play) allows LAN devices to configure AP via UPnP — e.g., `upnp` with WPS PBC — attacker on LAN (e.g., compromised client on same network) can trigger WPS PBC via UPnP without physical button — gets PSK without PIN and without physical access — risk — UPnP WPS PBC should be disabled
- **For PT:** PBC via UPnP is risk — check if AP has UPnP enabled and WPS PBC via UPnP — if AP has UPnP and WPS PBC, Medium finding — recommend disable UPnP or disable WPS PBC via UPnP, or disable WPS entirely

**Config for PBC:**
- `hostapd.conf` has `wps_state=2`, `ap_setup_locked=0`, `eap_server=1`, `wps_pin=12345670`, and also `upnp_iface`? Actually hostapd has `upnp_iface` for UPnP? And `wps_independent=0`? And `wps_pbc_in_m1=0`? Let's not deep — for PT, WPS PBC via UPnP is risk

### Lab — PCAP and Config Audit (Simulated) + Hardware (Optional)

**Simulated lab: PCAP analysis + config audit (zero-cost):**
- **PCAP:** `wps-beacon.pcapng` (2 frames) — filter `wps` → see WPS IE, BSSID, SSID, channel, WPS State, AP Setup Locked, WPS Version, vendor, signal, etc.
- **Tasks:**
  1. Filter `wps` → how many beacons with WPS IE? What BSSID? SSID? Channel? WPS State? AP Setup Locked? WPS Version? Vendor? Signal? Frame numbers?
  2. Filter `wlan.fc.type_subtype==8 && wps` → beacons with WPS IE — frame numbers f1, etc.
  3. Filter `wlan.bssid==AA:BB:CC:DD:EE:FF && wps` → WPS for specific BSSID
  4. Config audit: `hostapd.conf` with `wps_state=2` enabled vs `0` disabled — why High/Medium? Impact? Recommendation with config snippet? Rate limiting? Lockout? PBC via UPnP?
  5. Evidence: Beacon frame number with WPS IE, BSSID, SSID, channel, WPS State, config hash, filter, PCAP hash, wash output

**Hardware lab (optional, requires RF adapter ALFA, explicit ROE, own lab):**
- Setup: Hostapd with WPS enabled `wps_state=2`, `wps_pin=12345670`, client, attacker with ALFA monitor mode
- Steps: `wash -i wlan0mon` enumerate WPS, check Lck No/Yes, `reaver -i wlan0mon -b AA:BB:CC:DD:EE:FF -c 6 -vv` brute-force PIN 11k (lab only), `bully` alternative, observe lockout after 3-10 fails, PSK recovery via M7-M8, pixie dust `reaver --pixie-dust` if AP vulnerable, PBC via UPnP if AP has UPnP
- Evidence: Wash output, reaver output PIN found PSK found, PCAP with WPS M1-M8, etc.
- For this academy: Simulated only, hardware marked with prep docs.

### Finding — WPS Enabled = Medium/High, Depending on Lockout and Pixie Dust

**WPS enabled = finding — severity depends on lockout and pixie dust vulnerability:**

- **High:** WPS enabled no lockout or weak lockout (lock after 10 fails for 60 sec) or pixie dust vulnerable (weak random nonce reuse) — PIN brute-force 11k 3 hours or pixie dust offline seconds → PSK recovery → network access — High — CVSS 7.5?
- **Medium:** WPS enabled strong lockout (lock after 3 fails for 60 sec, after 10 fails hours, permanent lock after 20) and not pixie dust vulnerable — brute-force not feasible due to lockout, but still WPS should be disabled — Medium — CVSS 5.5? — recommendation disable WPS
- **Low/Info:** WPS disabled `wps_state=0` — no WPS IE — good — no finding — or WPS enabled but PBC only with physical button and strong lockout and not pixie dust? Still Medium? Better disabled

**For PT:** WPS enabled = Medium/High — always recommend disable WPS `wps_state=0` — no WPS IE — good — no finding.

### Recommendation — Disable WPS, No PBC via UPnP, Strong Lockout if Needed, PBC Only Physical Button, But Better Disabled

- **Disable WPS:** `wps_state=0` in hostapd.conf — no WPS IE in beacon — no WPS — good — no finding
- **No PBC via UPnP:** Disable UPnP or disable WPS PBC via UPnP — if AP has UPnP, disable UPnP or disable WPS PBC via UPnP — `upnp_iface`? Actually hostapd has `upnp_iface`? Disable UPnP if not needed
- **Strong lockout if WPS needed (not recommended):** If WPS needed for some reason (e.g., legacy clients), enable strong lockout: lock after 3 fails for 60 sec, after 10 fails for 1 hour, permanent lock after 20 fails — `ap_setup_locked=1` after lock? Actually hostapd has `ap_setup_locked`? And `wps_pin`? But better disabled
- **PBC only with physical button:** If PBC needed, only physical button, not via UPnP — require physical access — but still WPS should be disabled — PBC also risk if physical access
- **Better disabled:** WPS should be disabled entirely — no PIN, no PBC, no NFC, no USB — use WPA3-SAE or WPA2-PSK CCMP strong PSK 20+ random PMF required, not WPS
- **WIDS detection:** WIDS should detect WPS beacons filter `wps` and alert — authorized list — if WPS observed, alert Medium/High

### Tools

- `wash` — WPS enumeration: `wash -i wlan0mon` — BSSID Ch dBm WPS Version Lck Vendor ESSID
- `reaver` — WPS PIN brute-force: `reaver -i wlan0mon -b BSSID -c 6 -vv` — tries PINs, M1-M8, PSK found, lockout, pixie dust `--pixie-dust`
- `bully` — Alternative WPS brute-force: `bully -b BSSID -c 6 wlan0mon` — faster, better lockout bypass, pixie dust
- Wireshark, tshark — filter `wps`, `wlan_mgt.tag.number==221 && wlan_mgt.tag.oui==00:50:f2 && wlan_mgt.tag.oui.type==4`
- PcapInspector, ConfigViewer — simulated lab
- `hostapd` — config `wps_state`, `ap_setup_locked`, `eap_server`, `wps_pin`, `upnp_iface`
- `sha256sum` — hash for evidence chain

### Evidence Collection

- Beacon: SSID LAB-WPS BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK WPS IE present Tag 221 OUI 00:50:F2:04 Type 4 WPS Version 1.0 State 2 Configured Locked 0 frame number f1, PCAP hash, filter `wps`
- Probe Response: Same WPS IE, frame number f2
- Config: hostapd.conf wps_state=2 ap_setup_locked=0 eap_server=1 wps_pin=12345670 hash SHA256
- Wash: Output BSSID Ch dBm WPS Version Lck Vendor ESSID — e.g., AA:BB:CC:DD:EE:FF 6 -50 1.0 No Lab LAB-WPS
- For hardware lab: Reaver output PIN found PSK found, PCAP M1-M8, etc.

### Attack → Defense → Retest

- **Attack:** Observe beacon LAB-WPS BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK WPS IE present Tag 221 OUI 00:50:F2:04, config wps_state=2, WPS State 2 Configured Locked 0, no rate limiting or weak lockout or pixie dust vulnerable, brute-force PIN 11k tries 3 hours via reaver/bully (lab only, authorized, own lab, hardware), PSK recovery via M7-M8 containing PSK, network access, or pixie dust offline PIN recovery via weak random nonce reuse, or PBC via UPnP trigger without physical button
- **Defense:** Disable WPS wps_state=0, no PBC via UPnP, if needed strong lockout (lock after 3 fails 60 sec, after 10 fails hours, permanent after 20) and PBC only physical button, but better disabled, use WPA3-SAE or WPA2-PSK CCMP strong PSK 20+ random PMF required ieee80211w=2, WIDS detection of WPS beacons filter wps, training, audits
- **Retest:** New beacon no WPS IE filter wps empty, wash no longer detects WPS, config wps_state=0 hash new, PCAP new hash new frame numbers no WPS IE, WPS disabled, document new hashes

### Interactive Check

> You capture beacon SSID LAB-WPS BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK WPS IE present Tag 221 OUI 00:50:F2:04 Type 4 WPS State 2 Configured Locked 0, hostapd.conf wps_state=2 wps_pin=12345670, wash shows BSSID Ch 6 WPS 1.0 Lck No. What is finding, severity, why, impact, recommendation, evidence, retest, lockout, PBC, pixie dust?

Answer: Finding WPS Enabled PIN Brute-Force Risk LAB-WPS High (no lockout, Lck No) / Medium (strong lockout). Why: WPS PIN 8-digit halves flaw 10^4+10^3=11k not 10^8, checksum reduces last digit, AP verifies first half separately NACK after M4 if first half wrong NACK after M6 if second half wrong, so brute first half 10000 then second half 1000 = 11000 max 3 hours at 1 try/sec. Impact PIN brute-force → PSK recovery via M7-M8 containing PSK → network access lateral movement data theft pivot. Recommendation disable WPS wps_state=0, no PBC via UPnP, if needed strong lockout and PBC only physical button but better disabled, use WPA3-SAE or WPA2-PSK CCMP strong PSK 20+ random PMF required. Evidence beacon f1 SSID LAB-WPS BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK WPS IE present Tag 221 OUI 00:50:F2:04 State 2 Locked 0, config wps_state=2 wps_pin=12345670 hash, filter wps, PCAP wps-beacon.pcapng hash, wash output BSSID Ch 6 WPS 1.0 Lck No. Retest new beacon no WPS IE filter wps empty, wash no longer detects, config wps_state=0 hash new, PCAP new hash no WPS IE. Lockout good AP lock after 3 fails 60 sec after 10 fails hours permanent after 20, bad AP no lockout 11k 3 hours High. PBC via UPnP risk LAN attacker can trigger WPS PBC via UPnP without physical button, should disable UPnP or WPS PBC via UPnP. Pixie dust offline WPS PIN recovery via weak random nonce reuse in some APs (Broadcom) without brute-force 11k, bypasses lockout because offline, tool reaver --pixie-dust or bully, recovers PIN in seconds, even with lockout High if pixie dust vulnerable.

## References

- Wi-Fi Alliance WPS specification
- Stefan Viehboeck 2011 — Brute forcing Wi-Fi Protected Setup — PIN flaw
- Craig Heffner — reaver
- Dominique Bongard 2014 — Pixie Dust attack — offline WPS PIN recovery via weak random
- 802.11, 802.11i, 802.11w
- wash, reaver, bully
- Wireshark 802.11 WPS, wps filter
- OWASP, NIST

---

*Next: WPS Exploitation & Defense — reaver, bully, pixie dust, PBC, lockout bypass, remediation*

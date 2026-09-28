# WPA3 Architecture — SAE Dragonfly, Forward Secrecy, PMF Required

## Learning Objectives
- Master WPA3-Personal SAE Dragonfly: Simultaneous Authentication of Equals, zero-knowledge proof, commit/confirm, ECC/MODP, forward secrecy, resists offline dictionary
- Understand WPA3 vs WPA2: PMK derivation not directly from password, offline audit not possible without active interaction per guess, forward secrecy, PMF required, SAE vs PSK
- Learn WPA3-Enterprise 192-bit: GCMP-256, etc., high security
- Understand PMF required for WPA3: ieee80211w=2 mandatory, BIP, IGTK, SA Query, why PMF prevents deauth
- Build VAPT evidence: beacon RSN IE AKM SAE, CCMP, PMF required MFPC=1 MFPR=1, BIP, no WPS, no TKIP, channel, BSSID, frame numbers, hash, filter wlan_mgt.rsn.akms.type==8
- Learn good vs bad config, remediation, retest, WIDS

## Theory

### Why WPA3? — WPA2-PSK Weaknesses

**WPA2-PSK has:**
- **Offline dictionary attack if handshake captured and PSK weak:** PMK = PBKDF2(passphrase, SSID, 4096 iter), PTK = PRF(PMK, ANonce, SNonce, BSSID, Client MAC), MIC = HMAC-SHA1(KCK, EAPOL), attacker who captures handshake (M1-M4) can try offline PSK audit via hashcat -m 22000 — if PSK weak (in wordlist like WeakPass123, password123), crackable — High finding — need strong PSK 20+ random
- **No forward secrecy:** If PSK compromised later, past captures decryptable? Actually for WPA2-PSK, if PSK compromised, attacker can derive PMK via PBKDF2, then PTK via PRF with captured ANonce, SNonce, BSSID, Client MAC from past handshake, then TK, then decrypt past data — no forward secrecy — if PSK compromised, past sessions decryptable
- **PMF optional:** Without PMF, deauth/disassoc unauthenticated — attacker can spoof deauth to disconnect clients (DoS) and capture handshake via deauth — also Evil Twin facilitation — WPA2 PMF optional (capable or disabled), not required — Medium finding if PMF disabled
- **No protection against evil twin if PSK known:** Same PSK for all clients — if PSK known (cracked or shared), attacker can create rogue AP same SSID same PSK, client may auto-connect if stronger signal or after deauth and PSK known — Evil Twin possible if PSK known — need strong PSK and PMF and WPA3
- **For PT:** WPA2-PSK weaknesses — offline audit if weak PSK, no forward secrecy, PMF optional, evil twin if PSK known — need strong PSK, PMF required, WPA3

**WPA3 fixes many — SAE Dragonfly, forward secrecy, PMF required, better.**

### WPA3-Personal — SAE (Simultaneous Authentication of Equals) — Dragonfly

**Also called Dragonfly — SAE — Simultaneous Authentication of Equals — password-authenticated key exchange (PAKE) — zero-knowledge proof — forward secrecy — resists offline dictionary — not directly PSK.**

**Not PSK:** Uses password, but not directly as PMK via PBKDF2 — uses zero-knowledge proof — password not directly used as PMK — PMK from SAE exchange, not directly from password — so offline audit much harder (requires active interaction per guess, not offline) — forward secrecy.

**Flow (Simplified):**
```
Client and AP both have password (e.g., StrongRandomPassphrase123!@#With20+Chars).

1. Commit: Both generate random, do ECC (Elliptic Curve Cryptography) or MODP (MODP group) math (dragonfly), exchange commit frames with scalar and element — commit contains scalar (random) and element (ECC point or MODP element) — both generate random, compute scalar and element via dragonfly (hash password to curve/element, etc.)

2. Confirm: Both confirm they derived same shared secret (PMK) via confirm frames with confirm value (hash of shared secret, etc.), without revealing password — zero-knowledge proof — both prove they know password and derived same PMK, without revealing password or PMK

Result: PMK derived from SAE exchange (not directly from password via PBKDF2) — then 4-way handshake still happens but with PMF required, and PMK is not directly from password, so offline audit much harder (requires active SAE per guess, not offline) — forward secrecy.

Forward Secrecy: Each session uses new random scalar and element, so PMK fresh per session — if password later compromised, past sessions not decryptable because past PMK not derived from password directly? Actually forward secrecy means if password compromised later, past captures not decryptable because past PMK was random per session, not directly from password — even if password known later, past PMK not recoverable without past random — forward secrecy.

For PT: SAE resists offline dictionary — attacker who captures SAE commit/confirm cannot offline audit without active interaction per guess — requires active SAE per guess (slow) — not offline like WPA2-PSK — so WPA3-SAE resists offline audit — better than PSK — but still need strong password — weak password still risk? Actually SAE resists offline dictionary, but weak password still risk for active? But SAE better.
```

**Key Differences WPA2-PSK vs WPA3-SAE:**

| WPA2-PSK | WPA3-SAE |
|----------|----------|
| PMK = PBKDF2(passphrase, SSID, 4096 iter) — directly from password | PMK from SAE exchange (commit/confirm), not directly from password — zero-knowledge proof |
| Offline audit possible with handshake (M1-M4) via hashcat -m 22000 if PSK weak — High if weak PSK | Offline audit not possible without active SAE per guess — requires active interaction per guess (slow) — resists offline dictionary — better |
| No forward secrecy — if PSK compromised later, past captures decryptable via PBKDF2 + PRF with ANonce, SNonce, BSSID, Client MAC from past handshake | Forward secrecy — each session new random, PMK fresh per session — if password later compromised, past sessions not decryptable |
| PMF optional (capable or disabled) — deauth possible — Medium | PMF required (802.11w=2) mandatory — deauth protected — prevents deauth DoS and handshake capture via deauth |
| Same PSK for all, no individual — evil twin if PSK known — client may auto-connect to rogue same SSID same PSK if stronger or after deauth | Still same password for all, but SAE resists offline audit and has forward secrecy — still evil twin if PSK known? Actually if PSK known, attacker can still create rogue AP same SSID same PSK? For WPA3-SAE, if password known, attacker can create rogue AP same SSID same password, but SAE exchange still? Actually if password known, attacker can do SAE with client? Client may still connect to rogue if stronger? But SAE has forward secrecy, but if password known, rogue possible? For PT, if PSK/SAE password known, evil twin possible — need strong password and PMF and WPA3 and WIDS |
| No protection against evil twin if PSK known | Still same, but SAE resists offline audit and has forward secrecy — better |

**For PT:** WPA3-SAE is better than WPA2-PSK — forward secrecy, resists offline audit, PMF required — recommend WPA3-only SAE PMF required.

**WPA3-Personal Transition and WPA3-Only:**
- **WPA3-Only (best):** AKM SAE only (00-0F-AC-08), PMF required MFPC=1 MFPR=1, CCMP, BIP — good — no WPA2, no PSK, no TKIP, no WEP, no open without OWE — WPA3-only — for 6 GHz mandatory
- **Transition Mode (WPA2/WPA3):** AKMs PSK (2) + SAE (8), same password for WPA2 and WPA3, PMF optional (capable but not required) to allow WPA2 clients that don't support PMF — for compatibility with old clients — but has downgrade risk — attacker can force WPA2 and capture handshake and offline audit if PSK weak — PMF optional allows deauth — Medium finding — recommend WPA3-only

### WPA3-Enterprise — 192-bit Security Suite, GCMP-256, etc.

**WPA3-Enterprise — 192-bit security — for high security — e.g., government, etc.**

- **192-bit security suite:** GCMP-256 (Galois/Counter Mode Protocol 256-bit), etc. — stronger than CCMP 128-bit
- **For high security:** Requires 192-bit — e.g., `wpa_key_mgmt=WPA-EAP-SHA384`? Actually WPA3-Enterprise 192-bit uses `WPA-EAP-SHA384`? And `GCMP-256`? Let's not deep — for PT, WPA3-Enterprise 192-bit is for high security
- **Config:** See Module 15-18 Enterprise — EAP-TLS, etc.

**For PT:** WPA3-Enterprise 192-bit is best for corporate high security.

### PMF Required for WPA3 — ieee80211w=2 Mandatory, BIP, IGTK, SA Query

**WPA3 mandates PMF (Protected Management Frames) 802.11w required — ieee80211w=2 — so deauth/disassoc/action are protected with MIC using IGTK and BIP — prevents spoofed deauth/disassoc DoS and handshake capture via deauth — also SA Query prevents session hijacking.**

**Without PMF (WPA2 with PMF disabled):**
- Management frames unauthenticated — attacker can spoof deauth/disassoc with SA BSSID DA client or SA client DA BSSID BSSID BSSID reason 7 — client disconnects — DoS — and then re-auth, re-assoc, re-handshake — attacker can capture handshake via deauth — if PSK weak, offline audit — also Evil Twin facilitation
- For PT: Without PMF, deauth possible — Medium finding — handshake capture via deauth — DoS — Evil Twin

**With PMF Required (WPA3 mandates):**
- Management frames protected with MIC using IGTK (Integrity GTK) and BIP (Broadcast/Multicast Integrity Protocol) — Group Management Cipher BIP (00-0F-AC-06) or BIP-GMAC-128, BIP-GMAC-256, BIP-CMAC-256 for WPA3?
- **IGTK (Integrity GTK):** For protecting broadcast management frames — derived from IPMK? Actually IGTK is integrity key for management — BIP — Group Management — sent in M3? Actually IGTK is for PMF — integrity for broadcast management frames — derived from IPMK? Let's not deep — IGTK is for BIP
- **BIP (Broadcast/Multicast Integrity Protocol):** For integrity for broadcast management frames — AES-CMAC — Group Management Cipher BIP
- **SA Query (Security Association Query):** Procedure to prevent spoofed association — if AP receives assoc request with same MAC but different, SA Query to verify — prevents session hijacking — e.g., attacker spoofs client MAC and sends assoc request to AP, AP sends SA Query request to client, client responds with SA Query response, AP checks if client legit — if client doesn't respond, AP knows spoofed — prevents session hijacking

**Config:**
- `ieee80211w=0` — PMF disabled — vulnerable — bad — Medium — deauth possible
- `ieee80211w=1` — PMF capable optional — better, but downgrade possible — client that doesn't support PMF can still associate without PMF — so management frames for that client not protected — downgrade possible — better than disabled, but not required — Medium? Actually capable is better than disabled, but still not required — should be required — recommendation required
- `ieee80211w=2` — PMF required — best — prevents deauth spoofing — good — WPA3-only mandates required

**For PT:** Check beacon RSN Capabilities MFPC/MFPR — 0/0 disabled, 1/0 capable, 1/1 required — should be 1/1 — filter `wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==1` — if 0/0, Medium finding — deauth possible, handshake capture via deauth, DoS, Evil Twin facilitation.

**WPA3 requires PMF required — if WPA3 with PMF disabled or capable, misconfig — High? Actually WPA3 mandates PMF required — if WPA3 beacon shows PMF disabled or capable, it's misconfig — should be required — High finding?**

### PCAPs — wpa3-transition.pcapng (2 frames), wpa3-only.pcapng (1 frame)

**File:** `wpa3-transition.pcapng` (2 frames, Scapy-generated)

- Beacon BSSID EE:FF:00:11:22:33 SSID LAB-WPA3-TRANS Ch36 5 GHz UNII-1 WPA2-PSK + WPA3-SAE AKMs PSK(2)+SAE(8) same password WeakPass123? Actually same password for WPA2 and WPA3, PMF optional MFPC=1 MFPR=0, WPS? No, CCMP, etc.
- Probe Req? Actually 2 frames: beacon and probe req? Or beacon and probe resp? Let's assume beacon and probe req

**File:** `wpa3-only.pcapng` (1 frame)

- Beacon BSSID FF:00:11:22:33:44 SSID LAB-WPA3 Ch36 5 GHz WPA3-SAE AKM SAE only (8), PMF required MFPC=1 MFPR=1, CCMP, BIP, no WPS, good config

**Tasks:**
- Identify AKMs in beacon — PSK(2) vs SAE(8) vs PSK+SAE transition
- Is PMF required or optional? Check RSN Capabilities MFPC/MFPR — 0/0 disabled, 1/0 capable, 1/1 required
- Is transition mode? What risks? Downgrade to WPA2 + deauth possible, handshake capture, offline audit if weak PSK, PMF optional allows deauth
- What would you recommend? WPA3-only with PMF required, strong PSK 20+ random, no WPS, etc.

**Wireshark filters:**
```
wlan_mgt.rsn.akms.type==8  # SAE WPA3
wlan_mgt.rsn.akms.type==2  # PSK WPA2
wlan_mgt.rsn.akms.count>1   # Transition (both PSK+SAE)
wlan_mgt.rsn.capabilities.mfpc
wlan_mgt.rsn.capabilities.mfpr
wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==1  # PMF required
wlan_mgt.rsn.capabilities.mfpc==0 && wlan_mgt.rsn.capabilities.mfpr==0  # PMF disabled
wlan.fc.type_subtype==8 && wlan_mgt.rsn.akms.type==8  # Beacons WPA3 SAE
```

### Good Config — WPA3-Only vs Transition vs Bad

**WPA3-only (best):**
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
# he_suites for 6 GHz? For 5 GHz, ht_capab, vht, he?
```
- `wpa=2` RSN, `wpa_key_mgmt=SAE` WPA3-Personal SAE only, `rsn_pairwise=CCMP` CCMP only, `sae_password=Strong...` strong 20+ random, `ieee80211w=2` PMF required, `wps_state=0` WPS disabled — good

**Transition (if needed for compatibility with old clients that don't support WPA3):**
```ini
interface=wlan0
ssid=LAB-WPA3-TRANS
hw_mode=a
channel=36
wpa=2
wpa_key_mgmt=WPA-PSK SAE
rsn_pairwise=CCMP
wpa_passphrase=StrongRandomPassphrase123!@#With20+Chars
sae_password=StrongRandomPassphrase123!@#With20+Chars
ieee80211w=1
wps_state=0
# Same password for WPA2 and WPA3 — same! — PMF optional to allow WPA2 clients without PMF
```
- `wpa_key_mgmt=WPA-PSK SAE` — transition PSK+SAE, same password for both, `ieee80211w=1` PMF optional (capable) — but better 2 if all clients support PMF — transition has downgrade risk — Medium finding — recommend WPA3-only

**Bad:**
```ini
ssid=LAB-WPA3-TRANS
wpa=2
wpa_key_mgmt=WPA-PSK SAE
rsn_pairwise=CCMP
wpa_passphrase=WeakPass123
sae_password=WeakPass123
ieee80211w=0
wps_state=2
# Same weak password for WPA2 and WPA3, PMF disabled allows deauth, WPS enabled, defeats WPA3 benefit — bad — High? Actually weak PSK High, PMF disabled Medium, WPS High, transition Medium
```

**For PT:** Good config WPA3-only SAE PMF required strong password WPS disabled — transition mode with strong password and PMF capable minimum (1) is interim, but better WPA3-only — bad config with weak password and PMF disabled and WPS enabled is bad.

### VAPT Relevance — Beacon Analysis, Transition Downgrade Risk, Recommendation, Finding Template

- **Beacon analysis:** Check AKMs — SAE only (8) good, PSK+SAE transition with PMF optional Medium downgrade risk, PSK only WPA2 — check PMF required? MFPC=1 MFPR=1 required good, 0/0 disabled Medium, 1/0 capable optional Medium? Actually capable better than disabled but should be required — check WPS IE 00:50:F2:04 — if present High, check CCMP vs TKIP — TKIP deprecated Medium, check strong PSK? Actually PSK strength not in beacon, need config or offline audit authorized
- **Transition mode:** If AKMs PSK+SAE and PMF optional (MFPC=1 MFPR=0) — finding: transition mode with downgrade risk, PMF optional allows deauth, same password for WPA2 and WPA3, if PSK weak, network access via WPA2 handshake audit, same password works for WPA3, deauth DoS possible — Medium — recommendation WPA3-only with PMF required
- **WPA3-only good:** Observation good config — no finding, or Info — WPA3-only with PMF required — good

**Finding Template Transition:**
```
Title: WPA2/WPA3 Transition Mode with PMF Optional — Downgrade Risk (LAB-WPA3-TRANS)
Severity: Medium
CVSS: 5.5 (AV:A/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N) — Adjacent, Low complexity, No privileges, No user interaction, Scope Unchanged, Confidentiality Low, Integrity Low — if weak PSK, High 7.5
Description: AP supports WPA2-PSK and WPA3-SAE with same password WeakPass123, PMF optional MFPC=1 MFPR=0. Attacker can force WPA2 via deauth or downgrade and capture WPA2 handshake, offline audit via hashcat -m 22000 if PSK weak (in wordlist). PMF optional allows deauth DoS. Same password for WPA2 and WPA3, if WPA2 handshake captured and weak, WPA3 also compromised. Group downgrade possible.
Evidence: Beacon frame 1 BSSID EE:FF:00:11:22:33 SSID LAB-WPA3-TRANS Ch36 5 GHz UNII-1 AKMs PSK(2)+SAE(8) same password WeakPass123 PMF optional MFPC=1 MFPR=0, Probe Req f2 SA client SSID LAB-WPA3-TRANS, hostapd.conf wpa_key_mgmt=WPA-PSK SAE wpa_passphrase=WeakPass123 sae_password=WeakPass123 ieee80211w=0 or 1 wps_state=0 or 2, config hash SHA256 abc123..., PCAP wpa3-transition.pcapng SHA256 def456... Frames 2, filter wlan_mgt.rsn.akms.type==2 && akms.type==8, wlan_mgt.rsn.capabilities.mfpc==1 && mfpr==0
Impact: If PSK weak (WeakPass123 in rockyou.txt), network access via WPA2 handshake audit, same password works for WPA3, deauth DoS possible via PMF optional, downgrade to WPA2, group downgrade
Recommendation: Migrate to WPA3-only with PMF required ieee80211w=2 and strong sae_password 20+ random not in wordlists and WPS disabled wps_state=0 (config snippet below) — if transition needed for compatibility, use strong PSK 20+ random unique per SSID, PMF capable (1) minimum (better 2 if all clients support PMF), monitor for downgrade, plan migration to WPA3-only, no TKIP, no WEP, no WPS, no open without OWE, WIDS detection of transition and downgrade
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
Retest: Verify beacon AKM SAE only (8) not PSK+SAE, PMF required MFPC=1 MFPR=1, no WPS, strong PSK audit fails, config hash new, PCAP new hash
References: Wi-Fi Alliance WPA3, 802.11-2020, 802.11w PMF, 802.11 SAE Dragonfly, Vanhoef and Ronen 2020 Dragonblood, OWASP, NIST
```

**WPA3-only good observation:**
```
Observation: WPA3-only with PMF required — good config — no finding — Info
Evidence: Beacon f1 SSID LAB-WPA3 BSSID FF:00:11:22:33:44 Ch36 5 GHz AKM SAE only (8) PMF required MFPC=1 MFPR=1 CCMP BIP no WPS no TKIP
```

### Attack → Defense → Retest

- **Attack:** Observe beacon LAB-WPA3-TRANS BSSID EE:FF:00:11:22:33 Ch36 5 GHz AKMs PSK+SAE same password WeakPass123 PMF optional MFPC=1 MFPR=0, WPS? No, CCMP, etc. — downgrade risk — attacker can deauth client (if PMF optional or disabled and explicit ROE and lab), client may reconnect with WPA2, capture WPA2 handshake, offline audit via hashcat if weak PSK, same password works for WPA3 — group downgrade possible — if PMF disabled, deauth possible
- **Defense:** Prefer WPA3-only SAE PMF required ieee80211w=2 strong sae_password 20+ random WPS disabled, if transition needed strong PSK 20+ random PMF capable (1) minimum better 2 if all clients support PMF, monitor, plan migration to WPA3-only, no TKIP, no WEP, no WPS, no open without OWE, WIDS detection of transition and downgrade, training
- **Retest:** New beacon shows AKM SAE only, PMF required MFPC=1 MFPR=1, no WPS, strong PSK audit fails, config hash new, PCAP new hash, etc.

### Tools

- Wireshark, tshark — RSN IE AKM, PMF, `wlan_mgt.rsn.akms.type`, `wlan_mgt.rsn.capabilities.mfpc`, `mfpr`, `wps`
- PcapInspector, ConfigViewer, ReconMap — simulated lab
- `hostapd` — config `wpa_key_mgmt`, `rsn_pairwise`, `sae_password`, `wpa_passphrase`, `ieee80211w`, `wps_state`
- `iw dev wlan0 scan` — RSN IE in scan
- `Kismet` — WIDS, transition detection, PMF, etc.

### Evidence Collection

- Beacon: SSID LAB-WPA3-TRANS BSSID EE:FF:00:11:22:33 Ch36 5 GHz AKMs PSK+SAE same password WeakPass123 PMF optional MFPC=1 MFPR=0 CCMP BIP? No, frame number f1, PCAP hash, filter `wlan.fc.type_subtype==8 && wlan.bssid==EE:FF:00:11:22:33`
- Config: hostapd.conf wpa_key_mgmt=WPA-PSK SAE wpa_passphrase=WeakPass123 sae_password=WeakPass123 ieee80211w=0 or 1 wps_state=0 or 2 hash SHA256
- Probe: Probe Req SA client SSID LAB-WPA3-TRANS frame number f2
- Good beacon: LAB-WPA3 BSSID FF:00:11:22:33:44 Ch36 AKM SAE only PMF required

### Interactive Check

> You capture beacon SSID LAB-WPA3-TRANS BSSID EE:FF:00:11:22:33 Ch36 5 GHz AKMs PSK(2)+SAE(8) same password WeakPass123 PMF optional MFPC=1 MFPR=0, hostapd.conf wpa_key_mgmt=WPA-PSK SAE wpa_passphrase=WeakPass123 sae_password=WeakPass123 ieee80211w=1 wps_state=0. What are findings, severity, why, impact, recommendation, evidence, retest?

Answer: Findings: WPA2/WPA3 Transition Mode with PMF Optional Downgrade Risk Medium, Weak PSK WeakPass123 in wordlist High, PMF optional Medium (deauth possible). Why: Transition same password for WPA2 and WPA3, AKMs PSK+SAE, PMF optional MFPC=1 MFPR=0 to allow WPA2 clients without PMF, attacker can force WPA2 via deauth or downgrade and capture WPA2 handshake, offline audit via hashcat -m 22000 if weak PSK, same password works for WPA3, PMF optional allows deauth DoS, group downgrade possible. Impact if weak PSK network access via WPA2 handshake audit same password works for WPA3, deauth DoS, downgrade. Recommendation migrate to WPA3-only SAE PMF required ieee80211w=2 strong sae_password 20+ random WPS disabled, if transition needed strong PSK 20+ random PMF capable (1) minimum better 2, monitor, plan WPA3-only, no TKIP, no WEP, no WPS. Evidence beacon f1 SSID LAB-WPA3-TRANS BSSID EE:FF:00:11:22:33 Ch36 AKMs PSK+SAE same WeakPass123 PMF optional MFPC=1 MFPR=0, config wpa_key_mgmt=WPA-PSK SAE wpa_passphrase=WeakPass123 sae_password=WeakPass123 ieee80211w=1, filter wlan_mgt.rsn.akms.type==2 && akms.type==8 and mfpc==1 && mfpr==0, PCAP wpa3-transition.pcapng hash. Retest new beacon AKM SAE only PMF required MFPC=1 MFPR=1 no WPS strong PSK audit fails config hash new PCAP new hash.

## References

- Wi-Fi Alliance WPA3 specification, SAE Dragonfly
- IEEE 802.11-2020, 802.11w PMF, 802.11 SAE, 802.11r
- Vanhoef and Ronen 2020 — Dragonblood — WPA3 SAE side-channel and downgrade attacks — implementation flaws, not protocol? Actually Dragonblood found side-channel and downgrade in WPA3 SAE implementations — for PT, WPA3 implementation should be patched, strong password, PMF required
- Wireshark 802.11 RSN IE, AKM, PMF
- hostapd.conf documentation
- OWASP, NIST
- Kismet, airodump-ng

---

*Next: WPA3 Transition & Downgrade — Transition mode risks, group downgrade, PMF optional, remediation*

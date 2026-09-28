# WPA3-Only Hardening — Config, 6 GHz Mandatory, OWE, Forward Secrecy

## Learning Objectives
- Master WPA3-only hardening: SAE only AKM 8, CCMP only, PMF required ieee80211w=2, BIP, strong sae_password 20+ random, wps_state=0, no TKIP, no WEP, no open without OWE
- Understand 6 GHz mandatory WPA3-only: U-NII-5-8 5955-7115 MHz, Wi-Fi 6E, WPA3-only SAE/EAP/OWE, no WPA2, no TKIP, no WEP, no open without OWE, AFC for standard power
- Learn OWE (Opportunistic Wireless Encryption) for open: WPA3 OWE AKM 18? Actually OWE AKM 18? Or 00-0F-AC-18? OWE provides encryption for open without authentication, prevents sniffing, but no authentication, still captive portal possible with OWE
- Understand forward secrecy: SAE Dragonfly per-session random scalar/element, PMK fresh per session, past captures not decryptable even if password compromised later
- Build VAPT evidence: beacon WPA3-only AKM SAE only PMF required, config wpa_key_mgmt=SAE sae_password strong ieee80211w=2 wps_state=0, frame numbers, hash, filter wlan_mgt.rsn.akms.type==8 and mfpc==1 && mfpr==1
- Learn remediation for transition and weak PSK: migrate to WPA3-only, strong password, PMF required, no WPS, WIDS, training, retest

## Theory

### WPA3-Only Hardening — SAE Only, CCMP Only, PMF Required, Strong Password, No WPS

**WPA3-only is best for personal — SAE only AKM 8, CCMP only Group and Pairwise, PMF required MFPC=1 MFPR=1, BIP Group Management Cipher BIP (00-0F-AC-06) or BIP-GMAC-256 for WPA3, strong sae_password 20+ random not in wordlists, wps_state=0 no WPS IE 00:50:F2:04, no TKIP, no WEP, no open without OWE, for 6 GHz mandatory WPA3-only.**

**Good hostapd.conf WPA3-only (5 GHz example):**
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
# For 5 GHz, ht_capab, vht_capab, he_suites, etc.
# ht_capab=[HT40+][HT40-][SHORT-GI-20][SHORT-GI-40][DSSS_CCK-40]
# vht_capab=[SHORT-GI-80][SHORT-GI-160]
# he_suites for 6 GHz?
```

**Good WPA3-only (6 GHz example, mandatory WPA3-only):**
```ini
interface=wlan0
ssid=LAB-6GHz
hw_mode=a
channel=1
# 6 GHz channel 1 = 5955 MHz, U-NII-5
wpa=2
wpa_key_mgmt=SAE
rsn_pairwise=CCMP
sae_password=StrongRandomPassphrase123!@#With20+Chars
ieee80211w=2
wps_state=0
# he_suites for 6 GHz: he_mu_beamformer, he_su_beamformer, etc.
# For 6 GHz, need HE (802.11ax) — 6 GHz only supports 802.11ax and be?
# op_class for 6 GHz: op_class=131? Actually 6 GHz op class 131 for 20 MHz, 132 for 40, 133 for 80, 134 for 160, etc.
# For 6 GHz, WPA3-only mandatory, no WPA2, no TKIP, no WEP, no open without OWE
```

**For PT:** WPA3-only config — SAE only, CCMP only, PMF required, strong password, no WPS — good — no finding — Info — should be recommended for all new deployments, especially 6 GHz.

**Beacon for WPA3-only:**
```
SSID: LAB-WPA3
BSSID: FF:00:11:22:33:44
Channel: 36 (5 GHz UNII-1) or 1 (6 GHz U-NII-5)
Security: WPA3-SAE — AKM SAE only (00-0F-AC-08), Group CCMP (00-0F-AC-04), Pairwise CCMP, RSN Capabilities MFPC=1 MFPR=1 PMF required, Group Management BIP (00-0F-AC-06), no WPS, no TKIP, no WEP
```

**Wireshark filters:**
```
wlan_mgt.rsn.akms.type==8  # SAE WPA3
wlan_mgt.rsn.akms.count==1 && wlan_mgt.rsn.akms.type==8  # WPA3-only SAE only
wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==1  # PMF required
wlan.fc.type_subtype==8 && wlan_mgt.rsn.akms.type==8  # Beacons WPA3 SAE
wps  # Should be empty for WPA3-only good — no WPS IE
wlan_mgt.rsn.gcs.type==4  # CCMP group good
wlan_mgt.rsn.pcs.type==4  # CCMP pairwise good
```

**For PT:** Beacon analysis — WPA3-only SAE only PMF required CCMP BIP no WPS no TKIP — good — no finding — Info — recommend for all.

### 6 GHz Mandatory WPA3-Only — U-NII-5-8 5955-7115 MHz, Wi-Fi 6E, WPA3-Only

**6 GHz band — U-NII-5 (5925-6425 MHz), U-NII-6 (6425-6525 MHz), U-NII-7 (6525-6875 MHz), U-NII-8 (6875-7125 MHz) — total 1200 MHz — Wi-Fi 6E (802.11ax in 6 GHz) and Wi-Fi 7 (802.11be in 6 GHz) — mandates WPA3-only — no WPA2, no TKIP, no WEP, no open without OWE — for security — 6 GHz is new, so no legacy, mandate WPA3-only from start.**

**Why 6 GHz mandates WPA3-only?**
- 6 GHz is new band — no legacy clients — so can mandate WPA3-only from start — no need for transition — better security — forward secrecy, PMF required, etc.
- For PT: If you see 6 GHz with WPA2 or TKIP or WEP or open without OWE, it's misconfig — High? Actually 6 GHz with WPA2 is not allowed — should be WPA3-only — finding High — misconfig

**6 GHz channels:**
- Channel 1 = 5955 MHz, Channel 5 = 5975 MHz, Channel 9 = 5995 MHz, ... Channel 233 = 7115 MHz — 59 channels 20 MHz, 29 channels 40 MHz, 14 channels 80 MHz, 7 channels 160 MHz, 3 channels 320 MHz (Wi-Fi 7)
- For PT: 6 GHz channels 1,5,9,... 233 — check `wlan_mgt.ds.current_channel` or `he.operation`? Actually 6 GHz uses HE operation, not DS Parameter Set? For 6 GHz, channel via HE Operation? But for PT, channel map 6 GHz

**AFC (Automated Frequency Coordination) for standard power in 6 GHz:**
- 6 GHz has two power modes: Low Power Indoor (LPI) and Standard Power (SP) — LPI for indoor low power, SP for outdoor standard power with AFC — AFC checks if channel used by incumbent (e.g., fixed satellite) and allows/disallows — for PT, AFC is regulatory, not security, but good to know

**For PT:** 6 GHz must be WPA3-only — check beacon — AKM SAE only, PMF required, CCMP, BIP, no WPS, no TKIP, channel 1-233, etc.

**Config for 6 GHz WPA3-only (example):**
```ini
interface=wlan0
ssid=LAB-6GHz
hw_mode=a
channel=1
# op_class for 6 GHz: op_class=131 for 20 MHz? Actually op_class 131 for 6 GHz 20 MHz, 132 for 40, 133 for 80, 134 for 160, 135 for 320? Let's check hostapd docs — op_class for 6 GHz
op_class=131
wpa=2
wpa_key_mgmt=SAE
rsn_pairwise=CCMP
sae_password=StrongRandomPassphrase123!@#With20+Chars
ieee80211w=2
wps_state=0
he_suites=...
# For 6 GHz, need HE — 802.11ax — he_mu_beamformer, he_su_beamformer, etc.
```

**For open 6 GHz: OWE mandatory — no pure open without OWE — OWE provides encryption for open without authentication — prevents sniffing — but no authentication — still captive portal possible with OWE? Actually OWE for open with encryption — better than pure open — for PT, open without OWE in 6 GHz is misconfig — should be OWE**

### OWE (Opportunistic Wireless Encryption) for Open — WPA3 OWE

**OWE (Opportunistic Wireless Encryption) — RFC 8110 — for open networks with encryption without authentication — prevents sniffing on open networks — open networks normally no encryption (privacy 0, no RSN, no handshake, data protected 0, sniffable) — OWE provides encryption for open without authentication — better than pure open — for 6 GHz, open must be OWE, not pure open — for 2.4/5 GHz, open should be OWE or WPA2-PSK with portal + isolation + HTTPS.**

**How OWE works:**
- Client and AP do Diffie-Hellman key exchange in association — similar to SAE? Actually OWE uses Diffie-Hellman — client and AP exchange public keys in assoc req/resp? Actually OWE uses Diffie-Hellman in assoc — client and AP generate ephemeral key pairs, exchange public keys in assoc req/resp, derive PMK, then 4-way handshake? Actually OWE has association with Diffie-Hellman, then 4-way handshake? Let's not deep — OWE provides encryption for open without authentication — data protected 1 encrypted, but no authentication — still open, but encrypted — prevents sniffing
- **AKM OWE:** 00-0F-AC-18? Actually OWE AKM 00-0F-AC-18? Let's check: OWE AKM is 00-0F-AC-18? Or 00-0F-AC-18? For PT, OWE AKM is 18? Actually AKM OWE is 00-0F-AC-18? Let's assume 18
- **For PT:** OWE is better than pure open — open without OWE is Medium finding — sniffable — OWE mitigates sniffing — but still no authentication — captive portal still possible with OWE? Actually OWE with captive portal? Open with OWE + portal? Possible — OWE provides encryption, portal provides authentication? Actually captive portal with OWE? For guest, OWE + portal with HTTPS is better than pure open

**Config for OWE (open with encryption):**
```ini
interface=wlan0
ssid=Guest-OWE
hw_mode=g
channel=6
wpa=2
wpa_key_mgmt=OWE
rsn_pairwise=CCMP
ieee80211w=2
wps_state=0
# For OWE, no passphrase — open with encryption — PMF required? Actually OWE requires PMF? Let's check — OWE requires PMF? Probably yes — ieee80211w=2
```

**For open without OWE (pure open):**
```ini
interface=wlan0
ssid=Guest-Open
hw_mode=g
channel=6
wpa=0
# No encryption — privacy 0 — data protected 0 — sniffable — bad — Medium — should be OWE or WPA2-PSK with portal + isolation + HTTPS
```

**For PT:** Open without OWE is Medium finding — sniffable — recommend OWE or WPA2-PSK with portal + isolation + HTTPS — for 6 GHz, open must be OWE, not pure open — finding High if 6 GHz open without OWE?

### Forward Secrecy — SAE Dragonfly Per-Session Random, Past Captures Not Decryptable

**Forward secrecy (FS) — if long-term secret (password) compromised later, past sessions not decryptable — because past session keys were random per session, not directly from password — even if password known later, past PMK not recoverable without past random.**

**WPA2-PSK no forward secrecy:**
- PMK = PBKDF2(passphrase, SSID, 4096, 32 bytes) — directly from password — if password compromised later, attacker can derive PMK via PBKDF2 with SSID, then PTK via PRF with ANonce, SNonce, BSSID, Client MAC from past handshake capture, then TK, then decrypt past data — no forward secrecy — past captures decryptable if password later compromised

**WPA3-SAE forward secrecy:**
- SAE commit/confirm uses random scalar and element per session — PMK from SAE exchange, not directly from password via PBKDF2 — PMK fresh per session, random — even if password compromised later, past PMK not recoverable without past random scalar/element from past commit — past captures not decryptable — forward secrecy — better
- For PT: Forward secrecy is advantage of WPA3-SAE over WPA2-PSK — even if password compromised later, past sessions not decryptable — better for privacy

**For PT:** Recommend WPA3-SAE for forward secrecy, especially for sensitive data.

### VAPT Evidence — WPA3-Only, 6 GHz, OWE, Forward Secrecy

**Beacon WPA3-only:**
- SSID LAB-WPA3 BSSID FF:00:11:22:33:44 Ch36 5 GHz AKM SAE only (8) PMF required MFPC=1 MFPR=1 CCMP BIP no WPS no TKIP, frame number f1, PCAP hash, filter `wlan.fc.type_subtype==8 && wlan.bssid==FF:00:11:22:33:44 && wlan_mgt.rsn.akms.type==8`

**Config WPA3-only:**
- hostapd.conf wpa=2 wpa_key_mgmt=SAE rsn_pairwise=CCMP sae_password strong 20+ random ieee80211w=2 wps_state=0 hash SHA256

**6 GHz:**
- SSID LAB-6GHz BSSID GG:00:11:22:33:55 Ch1 6 GHz 5955 MHz AKM SAE only PMF required CCMP BIP no WPS, frame number, hash, filter, channel 1-233

**OWE:**
- SSID Guest-OWE BSSID HH:00:11:22:33:66 Ch6 AKM OWE (18) CCMP PMF required, no passphrase, open with encryption, frame number, hash, filter `wlan_mgt.rsn.akms.type==18`

**Forward secrecy:**
- Explanation — SAE per-session random, past captures not decryptable even if password later compromised — vs WPA2-PSK no forward secrecy — past captures decryptable if password compromised

### Remediation for Transition and Weak PSK — Migrate to WPA3-Only, Strong Password, PMF Required, No WPS

- **Transition with same weak password and PMF optional:** Migrate to WPA3-only SAE PMF required strong sae_password 20+ random WPS disabled — config snippet above — if transition needed for compatibility, strong PSK 20+ random PMF capable minimum better required, monitor, plan migration to WPA3-only, no TKIP, no WEP, no WPS
- **Weak PSK:** Strong PSK 20+ random not in wordlists via pwgen, openssl, Python secrets, diceware — audit with rockyou.txt should fail
- **PMF disabled:** PMF required ieee80211w=2 MFPC=1 MFPR=1 BIP — prevents deauth
- **WPS enabled:** WPS disabled wps_state=0 — no WPS IE
- **6 GHz with WPA2 or open without OWE:** Migrate to WPA3-only SAE or OWE — 6 GHz mandatory WPA3-only
- **Open without OWE:** Migrate to OWE or WPA2-PSK with portal + isolation + HTTPS — OWE provides encryption for open without authentication

### Tools

- Wireshark, tshark — RSN IE AKM, PMF, WPS, OWE, `wlan_mgt.rsn.akms.type`, `wlan_mgt.rsn.capabilities.mfpc`, `mfpr`, `wps`
- PcapInspector, ConfigViewer, ReconMap — simulated lab
- `hostapd` — config `wpa_key_mgmt`, `rsn_pairwise`, `sae_password`, `wpa_passphrase`, `ieee80211w`, `wps_state`, `op_class` for 6 GHz
- `iw dev wlan0 scan` — RSN IE in scan
- `Kismet` — WIDS, WPA3, transition, PMF, OWE, etc.

### Evidence Collection

- Beacon WPA3-only: SSID LAB-WPA3 BSSID FF:00:11:22:33:44 Ch36 5 GHz AKM SAE only PMF required MFPC=1 MFPR=1 CCMP BIP no WPS, frame number f1, PCAP hash, filter
- Config WPA3-only: hostapd.conf WPA3-only SAE PMF required strong password WPS disabled hash
- Beacon transition: LAB-WPA3-TRANS BSSID EE:FF:00:11:22:33 Ch36 AKMs PSK+SAE same WeakPass123 PMF optional, frame number, hash, filter
- Config transition: hostapd.conf transition same weak password PMF optional hash
- Beacon 6 GHz: LAB-6GHz BSSID GG:00:11:22:33:55 Ch1 6 GHz AKM SAE only PMF required, frame number, hash, filter
- Beacon OWE: Guest-OWE BSSID HH:00:11:22:33:66 Ch6 AKM OWE CCMP PMF required, frame number, hash, filter

### Attack → Defense → Retest

- **Attack:** Observe beacon LAB-WPA3-TRANS BSSID EE:FF:00:11:22:33 Ch36 AKMs PSK+SAE same WeakPass123 PMF optional, WPS? No, CCMP, etc. — downgrade risk — attacker can deauth client (if PMF optional/disabled and explicit ROE and lab, hardware), client may reconnect with WPA2, capture WPA2 handshake, offline audit via hashcat if weak PSK, same password works for WPA3, group downgrade, PMF optional allows deauth — or 6 GHz with WPA2 or open without OWE misconfig — or open without OWE sniffable
- **Defense:** Prefer WPA3-only SAE PMF required ieee80211w=2 strong sae_password 20+ random WPS disabled wps_state=0, for 6 GHz mandatory WPA3-only SAE/EAP/OWE no WPA2 no TKIP no WEP no open without OWE, OWE for open with encryption, forward secrecy SAE per-session random, strong PSK, PMF required, no WPS, WIDS detection, training
- **Retest:** New beacon shows AKM SAE only, PMF required MFPC=1 MFPR=1, CCMP, BIP, no WPS, no TKIP, strong PSK audit fails, config hash new, PCAP new hash, 6 GHz beacon WPA3-only, OWE beacon AKM OWE, etc.

### Interactive Check

> You have LAB-WPA3-TRANS transition AP BSSID EE:FF:00:11:22:33 Ch36 AKMs PSK+SAE same WeakPass123 PMF optional, and LAB-WPA3 WPA3-only AP BSSID FF:00:11:22:33:44 Ch36 AKM SAE only PMF required, and Guest-Open pure open BSSID II:00:11:22:33:77 Ch6 no encryption, and LAB-6GHz 6 GHz AP BSSID GG:00:11:22:33:55 Ch1 6 GHz AKM SAE only PMF required. What are findings and remediation for each?

Answer: LAB-WPA3-TRANS transition same weak password WeakPass123 PMF optional Medium downgrade risk (deauth possible, force WPA2, handshake capture, offline audit if weak, same password works for WPA3) High if weak PSK (WeakPass123 in rockyou.txt crackable), remediation migrate to WPA3-only SAE PMF required strong password 20+ random. LAB-WPA3 WPA3-only SAE only PMF required CCMP BIP no WPS good Info no finding. Guest-Open pure open no encryption privacy 0 data protected 0 sniffable Medium, remediation OWE AKM 18 CCMP PMF required provides encryption for open without authentication or WPA2-PSK with portal + isolation + HTTPS. LAB-6GHz 6 GHz AKM SAE only PMF required good Info, 6 GHz mandatory WPA3-only, if 6 GHz with WPA2 or open without OWE High misconfig. Forward secrecy SAE per-session random past captures not decryptable even if password later compromised vs WPA2-PSK no forward secrecy past captures decryptable if password compromised. Evidence beacon frame numbers, config hashes, filters wlan_mgt.rsn.akms.type==8, mfpc==1 && mfpr==1, wps empty, PCAP hashes.

## References

- Wi-Fi Alliance WPA3, SAE Dragonfly, OWE, 6 GHz
- IEEE 802.11-2020, 802.11w PMF, 802.11 SAE, 802.11ax 6 GHz, 802.11be
- Vanhoef and Ronen 2020 Dragonblood
- RFC 8110 OWE
- Wireshark 802.11 RSN IE, AKM, PMF, OWE
- hostapd.conf documentation
- OWASP, NIST
- Kismet, airodump-ng

---

*Next: Module 12 Deauth/Disassoc — Subtype 12/10, reason codes, PMF, defense, WIDS*

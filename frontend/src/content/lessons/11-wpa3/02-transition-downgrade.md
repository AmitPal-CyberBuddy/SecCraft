# WPA3 Transition & Downgrade Attacks — Risks, Group Downgrade, PMF Optional

## Learning Objectives
- Master transition mode: same SSID both WPA2-PSK and WPA3-SAE same password, beacon AKMs PSK(2)+SAE(8), PMF optional MFPC=1 MFPR=0 for compatibility
- Understand downgrade risks: attacker deauth client (if PMF optional/disabled and explicit ROE and lab), client may reconnect with WPA2, capture WPA2 handshake, offline audit if weak PSK, same password works for WPA3
- Learn group downgrade: trick client to use weaker group cipher? Actually group downgrade in transition? Or Dragonblood group downgrade?
- Understand PMF optional vs required: transition often PMF optional to support WPA2 clients without PMF, allows deauth, defeats WPA3 benefit, should be required if all clients support PMF
- Build VAPT evidence: beacon transition AKMs PSK+SAE same password, PMF optional, frame numbers, config wpa_key_mgmt=WPA-PSK SAE same password ieee80211w=0/1, hash, filter
- Learn defense: prefer WPA3-only SAE PMF required, if transition needed strong PSK 20+ random PMF capable (1) minimum better 2, monitor, plan migration to WPA3-only, no TKIP, no WEP, no WPS, WIDS

## Theory

### Transition Mode — Same SSID, Both WPA2-PSK and WPA3-SAE, Same Password, For Compatibility

**Transition mode (WPA2/WPA3) for compatibility with old clients that don't support WPA3-SAE — same SSID, both WPA2-PSK and WPA3-SAE, same BSSID, same password, beacon contains AKMs PSK(2)+SAE(8), PMF optional (capable but not required) to allow WPA2 clients that don't support PMF — for compatibility.**

**Why transition?**
- Old clients (e.g., 2015 laptop) support WPA2-PSK but not WPA3-SAE — if AP is WPA3-only SAE, old clients cannot connect — for compatibility, AP offers transition mode — both WPA2-PSK and WPA3-SAE on same SSID same BSSID — old clients use WPA2-PSK, new clients use WPA3-SAE — same password for both — for migration period — eventually migrate to WPA3-only when all clients support WPA3

**Beacon for transition:**
```
SSID: LAB-WPA3-TRANS
BSSID: EE:FF:00:11:22:33
Channel: 36 (5 GHz UNII-1)
Security: WPA2-PSK + WPA3-SAE — AKMs PSK(2) + SAE(8) — same password WeakPass123? Actually same password for both
Group Cipher: CCMP
Pairwise Cipher: CCMP
AKM Count: 2
  AKM: PSK (00-0F-AC-02) — WPA2-PSK
  AKM: SAE (00-0F-AC-08) — WPA3-SAE
RSN Capabilities: MFPC=1 MFPR=0 — PMF optional (capable but not required) — to allow WPA2 clients without PMF — or MFPC=0 MFPR=0 disabled — bad
PMKID Count: 0
Group Management Cipher: BIP (00-0F-AC-06) if PMF capable/required
WPS: No (should be no)
```

**Wireshark filters:**
```
wlan_mgt.rsn.akms.type==2  # PSK
wlan_mgt.rsn.akms.type==8  # SAE
wlan_mgt.rsn.akms.count>1   # Transition — both PSK+SAE
wlan_mgt.rsn.akms.count==2 && wlan_mgt.rsn.akms.type==2 && wlan_mgt.rsn.akms.type==8  # Transition PSK+SAE
wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==0  # PMF optional
wlan_mgt.rsn.capabilities.mfpc==0 && wlan_mgt.rsn.capabilities.mfpr==0  # PMF disabled
wlan.fc.type_subtype==8 && wlan_mgt.rsn.akms.count>1  # Beacons transition
```

**Config for transition (hostapd.conf):**
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
# Same password for WPA2 and WPA3 — same!
# PMF optional (1) to allow WPA2 clients without PMF — but better 2 if all clients support PMF
```

**For PT:** Transition mode has same password for WPA2 and WPA3 — if WPA2 handshake captured and weak PSK, same password works for WPA3 — risk — plus PMF optional allows deauth — downgrade risk — Medium finding — recommend WPA3-only.

### Downgrade Risks — Force WPA2, Capture Handshake, Offline Audit if Weak PSK, Same Password Works for WPA3

**Downgrade attack in transition mode:**

1. **Attacker observes transition AP:** Beacon LAB-WPA3-TRANS BSSID EE:FF:00:11:22:33 Ch36 AKMs PSK+SAE same password WeakPass123 PMF optional MFPC=1 MFPR=0 — transition mode

2. **Attacker deauths client (if PMF optional/disabled and explicit ROE and lab, hardware):** If PMF optional or disabled, management frames unauthenticated — attacker can spoof deauth with SA BSSID DA client or SA client DA BSSID BSSID BSSID reason 7 — client disconnects — DoS — client will re-auth, re-assoc, re-handshake — for transition AP, client may reconnect with WPA2-PSK (if client supports both but AP offers transition, client may choose WPA2? Actually client that supports WPA3 should prefer WPA3, but if attacker can force WPA2? How? Attacker can spoof deauth and also maybe spoof beacon with only PSK? Actually downgrade attack: Attacker can create rogue AP same SSID same BSSID? Or attacker can jam WPA3? Or attacker can force client to use WPA2 by deauth and then client may reconnect with WPA2 if AP offers transition? Let's check Vanhoef and Ronen Dragonblood paper — downgrade attacks in WPA3 transition — attacker can force client to use WPA2 by spoofing deauth and then using rogue AP with only PSK? Or by manipulating RSN IE? For PT, downgrade risk is that client may use WPA2 instead of WPA3 if AP offers transition, and then attacker can capture WPA2 handshake and offline audit if weak PSK.

3. **Capture WPA2 handshake:** When client reconnects with WPA2-PSK (if transition), 4-way handshake M1-M4 occurs — attacker captures handshake via passive wait or via deauth (if authorized and lab) — filter `eapol && wlan.bssid==EE:FF:00:11:22:33`

4. **Offline audit if weak PSK:** If PSK weak (WeakPass123 in rockyou.txt), attacker can offline audit via hashcat -m 22000 — `hcxpcapngtool -o capture.22000 capture.pcapng && hashcat -m 22000 capture.22000 rockyou.txt` — if weak, crackable — High finding — network access — same password works for WPA3 — so WPA3 also compromised if WPA2 handshake captured and weak

5. **Same password works for WPA3:** Transition uses same password for WPA2 and WPA3 — if WPA2 handshake captured and weak PSK cracked, same password works for WPA3 — so WPA3 also compromised — even though WPA3-SAE resists offline audit, if password known via WPA2 handshake audit, attacker can join WPA3 as well — so transition with same weak password is High risk

**For PT:** Transition mode with same weak password and PMF optional — High if weak PSK (because WPA2 handshake capture and offline audit), Medium if strong PSK but PMF optional (deauth possible, downgrade risk) — recommendation WPA3-only with PMF required and strong password.

**Example:**
- AP LAB-WPA3-TRANS BSSID EE:FF:00:11:22:33 Ch36 AKMs PSK+SAE same WeakPass123 PMF optional
- Client 11:22:33:44:55:66 supports WPA3 but also WPA2 — associates with WPA2-PSK (maybe because PMF optional and client chooses WPA2? Or attacker forces WPA2 via rogue?)
- Attacker captures handshake f9-12 M1-M4, ANonce, SNonce, MIC, BSSID, client, SSID
- Offline audit with rockyou.txt contains WeakPass123 — crackable — `hashcat -m 22000` finds WeakPass123 — network access — same password works for WPA3 — WPA3 also compromised

**Defense for downgrade:**
- Prefer WPA3-only SAE PMF required — no WPA2, no downgrade — best
- If transition needed, strong PSK 20+ random not in wordlists — so even if handshake captured, offline audit fails — strong PSK mitigates downgrade
- PMF required if all clients support PMF — prevents deauth — so deauth for handshake capture fails — PMF required mitigates downgrade via deauth
- Monitor for downgrade — WIDS detection of deauth flood and handshake capture

### Group Downgrade — Trick Client to Use Weaker Group Cipher?

**Group downgrade attack — trick client to use weaker group cipher (e.g., TKIP instead of CCMP) — in transition mode or WPA2 with TKIP+CCMP, attacker can manipulate RSN IE to make client use TKIP (weaker) instead of CCMP — but CCMP should be only — no TKIP — so group downgrade is less relevant if CCMP only — but if AP offers TKIP+CCMP, client may use TKIP — TKIP deprecated — Medium finding — should be CCMP only.**

**For PT:** Group downgrade — if AP offers TKIP and CCMP, client may use TKIP — TKIP deprecated, no PMF, etc. — should be CCMP only — check Group Cipher and Pairwise Cipher — should be CCMP only — filter `wlan_mgt.rsn.gcs.type==2` TKIP bad, `==4` CCMP good.

**Dragonblood — WPA3 SAE side-channel and downgrade attacks (Vanhoef and Ronen 2020):**
- Dragonblood paper found side-channel and downgrade attacks in WPA3 SAE implementations — e.g., timing side-channel in SAE commit, group downgrade (force client to use weaker group like MODP instead of ECC), etc. — implementation flaws, not protocol — for PT, WPA3 implementation should be patched, strong password, PMF required — check hostapd version, etc.
- For PT: WPA3 should be patched against Dragonblood — strong password, PMF required, etc.

### PMF Optional vs Required — Transition Often PMF Optional to Support WPA2 Clients Without PMF, Allows Deauth, Defeats WPA3 Benefit

**Transition mode often has PMF optional (MFPC=1, MFPR=0) to support WPA2 clients that don't support PMF — old WPA2 clients without PMF can still associate if PMF optional, but if PMF required, old clients without PMF cannot associate — so for compatibility, transition often PMF optional — but PMF optional allows deauth — defeats WPA3 benefit — because WPA3 mandates PMF required, but transition with PMF optional allows deauth for WPA2 clients and also for WPA3? Actually if PMF optional, management frames for clients without PMF not protected — deauth possible — so deauth for handshake capture possible — downgrade risk — Medium finding — should be required if all clients support PMF.**

**Config:**
- `ieee80211w=0` — PMF disabled — vulnerable — bad — Medium — deauth possible — defeats WPA3 benefit — if transition with PMF disabled, bad — High? Actually PMF disabled + transition + weak PSK = High
- `ieee80211w=1` — PMF capable optional — better, but downgrade possible — client without PMF can still associate without PMF — so deauth possible for that client — better than disabled, but not required — should be required if all clients support PMF — Medium? Actually capable is better than disabled, but still not required — recommendation required if possible
- `ieee80211w=2` — PMF required — best — prevents deauth spoofing — good — WPA3-only mandates required — if transition with PMF required, old WPA2 clients without PMF cannot connect — so for transition, if all clients support PMF, use required — best — prevents deauth

**For PT:** Check beacon RSN Capabilities MFPC/MFPR — 0/0 disabled, 1/0 capable, 1/1 required — should be 1/1 — filter `wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==1` — if 0/0 or 1/0, Medium finding — deauth possible, downgrade risk — recommendation PMF required if all clients support PMF, else capable minimum (1) and plan migration to required.

**WPA3 requires PMF required — if WPA3 with PMF disabled or capable, misconfig — High? Actually WPA3 mandates PMF required — if WPA3 beacon shows PMF disabled or capable, it's misconfig — should be required — High finding?**

### Lab — wpa3-transition.pcapng (2 frames) and wpa3-only.pcapng (1 frame)

**File:** `wpa3-transition.pcapng` (2 frames)

- Beacon f1 BSSID EE:FF:00:11:22:33 SSID LAB-WPA3-TRANS Ch36 5 GHz UNII-1 AKMs PSK(2)+SAE(8) same password WeakPass123 PMF optional MFPC=1 MFPR=0 CCMP BIP? Actually Group Management BIP if PMF capable, no WPS, vendor Lab
- Probe Req f2 SA client MAC SSID LAB-WPA3-TRANS — client probes transition

**File:** `wpa3-only.pcapng` (1 frame)

- Beacon f1 BSSID FF:00:11:22:33:44 SSID LAB-WPA3 Ch36 5 GHz AKM SAE only (8) PMF required MFPC=1 MFPR=1 CCMP BIP no WPS good config

**Tasks:**
- Filter `wlan.fc.type_subtype==8` → beacons — how many? What SSIDs? BSSIDs? Channels? AKMs? PMF?
- Filter `wlan_mgt.rsn.akms.type==8` → SAE beacons — WPA3
- Filter `wlan_mgt.rsn.akms.type==2` → PSK beacons — WPA2
- Filter `wlan_mgt.rsn.akms.count>1` → transition beacons — PSK+SAE
- Filter `wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==0` → PMF optional
- Filter `wlan_mgt.rsn.capabilities.mfpc==1 && wlan_mgt.rsn.capabilities.mfpr==1` → PMF required
- Identify transition mode risks: same password, PMF optional allows deauth, downgrade to WPA2 handshake capture, offline audit if weak PSK, same password works for WPA3, group downgrade
- What would you recommend? WPA3-only with PMF required strong PSK, if transition needed strong PSK 20+ random PMF capable minimum better required, monitor, plan migration to WPA3-only

**PcapInspector:**
- Summary: SSIDs, BSSIDs, channels, beacons, probes, EAPOL, etc.
- Filter Beacons → transition beacon AKMs PSK+SAE PMF optional, WPA3-only beacon AKM SAE only PMF required
- Detail: RSN IE AKM, PMF, CCMP, BIP, etc.

### VAPT Relevance — Transition Downgrade Risk, Evidence, Finding Template, Recommendation

- **Beacon analysis:** Check AKMs — SAE only (8) good, PSK+SAE transition with PMF optional Medium downgrade risk, PSK only WPA2 — check PMF required? MFPC=1 MFPR=1 required good, 0/0 disabled Medium, 1/0 capable optional Medium? — check WPS IE 00:50:F2:04 — if present High, check CCMP vs TKIP — TKIP deprecated Medium, check strong PSK? Actually PSK strength not in beacon, need config or offline audit authorized
- **Transition mode:** If AKMs PSK+SAE and PMF optional (MFPC=1 MFPR=0) — finding: transition mode with downgrade risk, PMF optional allows deauth, same password for WPA2 and WPA3, if PSK weak, network access via WPA2 handshake audit, same password works for WPA3, deauth DoS possible — Medium — if weak PSK, High — recommendation WPA3-only with PMF required
- **WPA3-only good:** Observation good config — no finding, or Info

**Finding Template (already in 11-01):**
```
Title: WPA2/WPA3 Transition Mode with PMF Optional — Downgrade Risk
Severity: Medium (if strong PSK) / High (if weak PSK)
Description: AP supports WPA2-PSK and WPA3-SAE with same password WeakPass123, PMF optional MFPC=1 MFPR=0. Attacker can force WPA2 via deauth or downgrade and capture WPA2 handshake, offline audit via hashcat -m 22000 if PSK weak. PMF optional allows deauth DoS. Same password for WPA2 and WPA3, if WPA2 handshake captured and weak, WPA3 also compromised.
Evidence: Beacon f1 BSSID EE:FF:00:11:22:33 SSID LAB-WPA3-TRANS Ch36 AKMs PSK+SAE same WeakPass123 PMF optional MFPC=1 MFPR=0, hostapd.conf wpa_key_mgmt=WPA-PSK SAE same password ieee80211w=0/1, PCAP wpa3-transition.pcapng hash, filter
Impact: If weak PSK, network access via WPA2 handshake audit same password works for WPA3, deauth DoS, downgrade
Recommendation: Migrate to WPA3-only SAE PMF required strong password, if transition needed strong PSK 20+ random PMF capable minimum better required, monitor, plan WPA3-only
```

### Defense — Prefer WPA3-Only, Strong PSK, PMF Required, No WPS, WIDS

- **Prefer WPA3-only SAE PMF required:** No WPA2, no downgrade, forward secrecy, resists offline audit, PMF required prevents deauth — best — for 6 GHz mandatory
- **If transition needed for compatibility:** Strong PSK 20+ random not in wordlists, PMF capable (1) minimum (better 2 if all clients support PMF), monitor for downgrade, plan migration to WPA3-only, no TKIP, no WEP, no WPS, no open without OWE
- **Strong PSK:** 20+ random via pwgen, openssl, Python secrets — audit with rockyou.txt should fail
- **PMF required if all clients support PMF:** ieee80211w=2 — prevents deauth — best — if transition with PMF required, old WPA2 clients without PMF cannot connect — so if all clients support PMF, use required
- **No WPS:** wps_state=0
- **WIDS detection of transition and downgrade:** WIDS should detect transition beacons (AKMs PSK+SAE) and alert transition mode downgrade risk, and deauth flood (many deauth same BSSID short interval), and handshake capture, etc.

### Retest — Verify WPA3-Only, PMF Required, Strong PSK, No WPS

**Retest verifies fix with new evidence — not old PCAPs — new PCAPs, new config hash, new logs, what should happen vs what actually happened.**

**Steps:**
1. **New Config:** Get new hostapd.conf WPA3-only SAE PMF required strong password WPS disabled — hash SHA256 new
2. **New PCAPs:** Capture new beacons — verify beacon shows AKM SAE only (8) not PSK+SAE, PMF required MFPC=1 MFPR=1, CCMP, BIP, no WPS, no TKIP, channel, BSSID, etc. — frame numbers new, filter `wlan.fc.type_subtype==8 && wlan.bssid==FF:00:11:22:33:44`
3. **Handshake Audit Fails:** Try offline audit with rockyou.txt — should fail for strong PSK 20+ random — evidence audit fails — hashcat no crack — good — for WPA3-SAE, offline audit not possible without active interaction per guess — even better
4. **PMF Required:** Check RSN Capabilities MFPC=1 MFPR=1 — PMF required
5. **WPS Disabled:** Filter `wps` should be empty
6. **Document:** New PCAP hash SHA256, new config hash, new frame numbers, new filters, what should happen vs what actually happened
7. **Report:** Retest section — "Fix verified: new beacon f1 SSID LAB-WPA3 BSSID FF:00:11:22:33:44 Ch36 AKM SAE only PMF required MFPC=1 MFPR=1 CCMP BIP no WPS, config hash new SHA256..., PCAP hash new..., handshake audit with rockyou.txt fails, WPS filter empty, PMF required, WPA3-only"

### Tools

- Wireshark, tshark — RSN IE AKM, PMF, `wlan_mgt.rsn.akms.type`, `wlan_mgt.rsn.capabilities.mfpc`, `mfpr`, `wps`, `wlan.fc.type_subtype==8`
- PcapInspector, ConfigViewer, ReconMap — simulated lab
- `hostapd` — config `wpa_key_mgmt`, `rsn_pairwise`, `sae_password`, `wpa_passphrase`, `ieee80211w`, `wps_state`
- `iw dev wlan0 scan` — RSN IE in scan
- `Kismet` — WIDS, transition detection, PMF, etc.
- `hcxpcapngtool`, `hashcat` — handshake conversion and offline audit (authorized)

### Evidence Collection

- Beacon transition: SSID LAB-WPA3-TRANS BSSID EE:FF:00:11:22:33 Ch36 5 GHz AKMs PSK+SAE same WeakPass123 PMF optional MFPC=1 MFPR=0 CCMP, frame number f1, PCAP hash, filter `wlan.fc.type_subtype==8 && wlan.bssid==EE:FF:00:11:22:33`
- Config transition: hostapd.conf wpa_key_mgmt=WPA-PSK SAE wpa_passphrase=WeakPass123 sae_password=WeakPass123 ieee80211w=0 or 1 wps_state=0 or 2 hash SHA256
- Beacon good: LAB-WPA3 BSSID FF:00:11:22:33:44 Ch36 AKM SAE only PMF required MFPC=1 MFPR=1 CCMP BIP no WPS
- Config good: hostapd.conf WPA3-only SAE PMF required strong password WPS disabled hash

### Attack → Defense → Retest

- **Attack:** Observe beacon LAB-WPA3-TRANS BSSID EE:FF:00:11:22:33 Ch36 AKMs PSK+SAE same WeakPass123 PMF optional, WPS? No, CCMP, etc. — downgrade risk — attacker can deauth client (if PMF optional/disabled and explicit ROE and lab, hardware), client may reconnect with WPA2, capture WPA2 handshake, offline audit via hashcat if weak PSK, same password works for WPA3, group downgrade, PMF optional allows deauth
- **Defense:** Prefer WPA3-only SAE PMF required ieee80211w=2 strong sae_password 20+ random WPS disabled, if transition needed strong PSK 20+ random PMF capable (1) minimum better 2 if all clients support PMF, monitor, plan migration to WPA3-only, no TKIP, no WEP, no WPS, no open without OWE, WIDS detection of transition and downgrade, training
- **Retest:** New beacon shows AKM SAE only, PMF required MFPC=1 MFPR=1, no WPS, strong PSK audit fails, config hash new, PCAP new hash, etc.

### Interactive Check

> You capture beacon SSID LAB-WPA3-TRANS BSSID EE:FF:00:11:22:33 Ch36 AKMs PSK(2)+SAE(8) same WeakPass123 PMF optional MFPC=1 MFPR=0, hostapd.conf wpa_key_mgmt=WPA-PSK SAE same WeakPass123 ieee80211w=1 wps_state=0. What are downgrade risks, group downgrade, PMF optional vs required, evidence, recommendation, retest?

Answer: Downgrade risks: same password for WPA2 and WPA3, AKMs PSK+SAE, PMF optional MFPC=1 MFPR=0 to allow WPA2 clients without PMF, attacker can deauth client (if PMF optional/disabled and explicit ROE and lab) and force WPA2, capture WPA2 handshake M1-M4, offline audit via hashcat -m 22000 if weak PSK WeakPass123 in rockyou.txt crackable High, same password works for WPA3 so WPA3 also compromised, PMF optional allows deauth DoS, group downgrade trick client to use weaker group cipher like TKIP instead of CCMP if AP offers TKIP+CCMP should be CCMP only, Dragonblood side-channel and downgrade in WPA3 SAE implementations need patch. PMF optional vs required: optional allows WPA2 clients without PMF but allows deauth, defeats WPA3 benefit, should be required if all clients support PMF ieee80211w=2 prevents deauth, WPA3 mandates required, if WPA3 with PMF disabled or capable misconfig High. Evidence beacon f1 SSID LAB-WPA3-TRANS BSSID EE:FF:00:11:22:33 Ch36 AKMs PSK+SAE same WeakPass123 PMF optional MFPC=1 MFPR=0, config wpa_key_mgmt=WPA-PSK SAE same WeakPass123 ieee80211w=1, filter wlan_mgt.rsn.akms.count>1 and mfpc==1 && mfpr==0, PCAP wpa3-transition.pcapng hash. Recommendation prefer WPA3-only SAE PMF required ieee80211w=2 strong sae_password 20+ random WPS disabled, if transition needed strong PSK 20+ random PMF capable (1) minimum better 2 if all clients support PMF monitor plan migration to WPA3-only no TKIP no WEP no WPS. Retest new beacon AKM SAE only PMF required MFPC=1 MFPR=1 no WPS strong PSK audit fails config hash new PCAP new hash.

## References

- Wi-Fi Alliance WPA3, SAE Dragonfly, transition mode
- IEEE 802.11-2020, 802.11w PMF, 802.11 SAE, 802.11r
- Vanhoef and Ronen 2020 — Dragonblood — WPA3 SAE side-channel and downgrade attacks
- Wireshark 802.11 RSN IE, AKM, PMF
- hostapd.conf documentation
- OWASP, NIST
- Kismet, airodump-ng

---

*Next: WPA3-Only Hardening — WPA3-only config, 6 GHz mandatory, OWE, forward secrecy, evidence*

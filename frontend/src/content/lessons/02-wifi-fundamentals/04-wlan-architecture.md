# WLAN Architecture — Infrastructure, DS, Controller, CAPWAP

## Learning Objectives
- Understand WLAN architecture: BSS, ESS, DS, Portal, AP, STA, MBSSID, controller
- Learn infrastructure vs ad-hoc vs mesh vs WDS
- Understand enterprise architecture: lightweight AP + WLC + CAPWAP + VLANs + RADIUS
- Learn CAPWAP, controller-based vs autonomous vs cloud-managed
- Map architecture to VAPT: segmentation, isolation, rogue, VLAN ACL

## Theory

### BSS, ESS, DS, Portal — 802.11 Architecture

**BSS (Basic Service Set):** One AP (BSSID) + associated STAs — basic building block

```
BSS:
[AP BSSID AA:BB:CC:DD:EE:FF SSID LAB-WIFI Ch6]
  |
  ├─→ [STA 11:22:33:44:55:66] — associated, State 3, AID 1
  └─→ [STA 22:33:44:55:66:77] — associated, State 3, AID 2

Frame flow:
STA 11:22:33:44:55:66 → AP AA:BB:CC:DD:EE:FF (To DS=1) → DS → AP → STA 22:33:44:55:66:77 (From DS=1)
Or STA → AP → DS → Internet
```

**ESS (Extended Service Set):** Multiple BSSs with same SSID for roaming — same logical network, different physical APs

```
ESS: SSID Corp-WLAN
BSS1: BSSID AA:BB:CC:DD:EE:01 Ch1 2.4 GHz WPA2-PSK Cisco, 2 clients
BSS2: BSSID AA:BB:CC:DD:EE:02 Ch6 2.4 GHz WPA2-PSK Cisco, 3 clients
BSS3: BSSID AA:BB:CC:DD:EE:03 Ch11 2.4 GHz WPA2-PSK Cisco, 1 client
BSS4: BSSID AA:BB:CC:DD:EE:11 Ch36 5 GHz WPA2-PSK Cisco, 4 clients

All same SSID Corp-WLAN, different BSSIDs, different channels, same security, same VLAN — client roams transparently based on signal, 802.11r/k/v helps
```

**DS (Distribution System):** Wired backbone connecting APs — e.g., Ethernet switches, VLANs, controller

```
DS: VLAN 100 Corp, VLAN 200 Guest, VLAN 300 IoT, etc.
APs connected to DS via Ethernet — AP bridges wireless to DS
```

**Portal:** Bridge between DS and non-802.11 LAN — e.g., AP bridges wireless to Ethernet, or router bridges Ethernet to Internet

**MBSSID (Multiple BSSID):** One physical radio hosts multiple BSSIDs with different SSIDs — e.g., Enterprise AP Ch6 with 4 SSIDs Corp, Guest, IoT, BYOD — BSSIDs AA:BB:CC:DD:EE:01 Corp VLAN 100, AA:BB:CC:DD:EE:02 Guest VLAN 200, etc. — same channel, same radio, different BSSIDs, different SSIDs, different VLANs — efficient, common in enterprise

```
MBSSID: Physical AP Cisco 3800, 2 radios, 4 SSIDs per radio = 8 BSSIDs
2.4 GHz Radio Ch6:
  BSSID AA:BB:CC:DD:EE:01 SSID Corp-Enterprise WPA2-EAP VLAN 100
  BSSID AA:BB:CC:DD:EE:02 SSID Corp-Guest Open + Portal VLAN 200 ap_isolate=0 weak
  BSSID AA:BB:CC:DD:EE:03 SSID IoT-PSK WPA2-PSK WeakPass123 VLAN 300 WPS enabled
  BSSID AA:BB:CC:DD:EE:04 SSID HIDDEN-LAB hidden WPA2-PSK VLAN 100
5 GHz Radio Ch36:
  BSSID AA:BB:CC:DD:EE:11 SSID Corp-Enterprise WPA2-EAP VLAN 100
  BSSID AA:BB:CC:DD:EE:12 SSID Corp-Guest Open + Portal VLAN 200
  BSSID AA:BB:CC:DD:EE:13 SSID IoT-PSK WPA2-PSK WeakPass123 VLAN 300
  BSSID AA:BB:CC:DD:EE:14 SSID LAB-WPA3-TRANS WPA2-PSK+SAE Ch36 VLAN 100
```

**For PT:** MBSSID same channel different SSIDs different VLANs — check if Guest isolation disabled (ap_isolate=0), VLAN ACL allows Corp→Guest, WPS enabled, weak PSK, etc. — evidence per BSSID.

### Infrastructure vs Ad-hoc vs Mesh vs WDS

**Infrastructure (Focus of this academy):**
- AP + DS + clients — most common, enterprise, home, etc.
- Client ↔ AP ↔ DS ↔ Internet/Internal
- Security: WPA2-PSK, WPA2-EAP, WPA3-SAE, WPA3-EAP, OWE, etc.
- **For PT:** Focus — recon APs, clients, channels, security, WPS, PMF, PSK, EAP, RADIUS, segmentation, isolation, rogue

**Ad-hoc (IBSS, Independent BSS):**
- No AP, clients directly communicate — STA1 ↔ STA2 — IBSS, e.g., laptop to laptop
- Rare now, but possible — e.g., old Windows ad-hoc, some IoT
- Security: Open or WEP or WPA2-PSK (IBSS RSN)
- **For PT:** Rare, but if seen, check security — often open or weak

**Mesh (802.11s):**
- Multiple APs form mesh, no central controller, APs relay — e.g., outdoor mesh, Google WiFi, Eero, etc.
- 802.11s mesh networking — mesh peering, HWMP routing
- Security: SAE for mesh peering, etc.
- **For PT:** Mesh testing — check mesh security, peering, etc. — advanced, not in Phase 1

**WDS (Wireless Distribution System):**
- AP to AP wireless bridge — To DS=1 From DS=1, 4 addresses — e.g., AP1 ↔ AP2 wirelessly, extend coverage
- Security: Often open or WEP or WPA2-PSK, WDS may have weak security
- **For PT:** WDS — 4 addresses, check security, may be weak

**For PT:** Infrastructure is focus — 99% of enterprise/home Wi-Fi is infrastructure.

### Enterprise Architecture — Lightweight AP + WLC + CAPWAP

**Autonomous (Fat AP):** Standalone, config local — e.g., home router, small office — SSID, BSSID, channel, security, DHCP, NAT, all local — simple, but not scalable for many APs

**Lightweight + WLC (Enterprise, Controller-based):**
- **AP (Thin):** Handles RF — beacons, probe, auth, assoc, data, EAPOL — but config from controller
- **WLC (Wireless LAN Controller):** Manages APs — config, RADIUS, VLAN, roaming, RF management, WIDS, etc. — central, e.g., Cisco WLC 5520, Aruba 7200, etc.
- **CAPWAP (Control and Provisioning of Wireless Access Points):** Tunnel between AP and controller — control tunnel (config, management) and data tunnel (client data) — AP to controller via CAPWAP, controller to DS via Ethernet
- **VLANs:** Per SSID or per user via RADIUS — e.g., Corp-Enterprise VLAN 100, Guest VLAN 200, IoT VLAN 300, BYOD VLAN 400 — dynamic VLAN assignment via RADIUS Tunnel-Private-Group-Id
- **RADIUS:** Authentication server — FreeRADIUS, Cisco ISE, Aruba ClearPass — 802.1X, EAP, users, VLAN, accounting
- **WIDS/WIPS:** Wireless IDS/IPS — authorized AP list BSSID channel vendor signal, rogue detection, alert, contain — e.g., Cisco WIDS, Aruba WIPS, Kismet

**Example Enterprise:**
```
Internet
  |
[Firewall] — ACL, NAT, etc.
  |
[Core Switch] — VLAN 100 Corp, VLAN 200 Guest, VLAN 300 IoT, VLAN 400 BYOD, trunk to WLC and APs
  |
  ├─→ [WLC] — Cisco WLC 5520, 192.168.1.5, manages APs, config, RADIUS 192.168.1.10, VLAN mapping, WIDS authorized list
  │     |
  │     └─→ CAPWAP tunnel to APs
  │
  ├─→ [AP1] — Cisco 3800, 192.168.1.101, 2 radios, 4 SSIDs per radio = 8 BSSIDs, CAPWAP to WLC, VLAN trunk
  │     ├─→ 2.4 GHz Ch6: BSSID AA:BB:CC:DD:EE:01 Corp-Enterprise WPA2-EAP VLAN 100, BSSID AA:BB:CC:DD:EE:02 Guest Open+Portal VLAN 200 ap_isolate=0, BSSID AA:BB:CC:DD:EE:03 IoT-PSK WeakPass123 VLAN 300 WPS, BSSID AA:BB:CC:DD:EE:04 HIDDEN-LAB hidden WPA2-PSK VLAN 100
  │     └─→ 5 GHz Ch36: BSSID AA:BB:CC:DD:EE:11 Corp-Enterprise WPA2-EAP VLAN 100, BSSID AA:BB:CC:DD:EE:12 Guest Open+Portal VLAN 200, BSSID AA:BB:CC:DD:EE:13 IoT-PSK WeakPass123 VLAN 300, BSSID AA:BB:CC:DD:EE:14 LAB-WPA3-TRANS WPA2-PSK+SAE VLAN 100
  │
  ├─→ [AP2] — Cisco 3800, 192.168.1.102, 2 radios, 4 SSIDs per radio = 8 BSSIDs, CAPWAP to WLC, VLAN trunk, Ch11 and Ch40
  │
  ├─→ [RADIUS] — FreeRADIUS 3.0, 192.168.1.10, secret testing123 weak, users WeakPass, clients.conf 0.0.0.0/0 weak, eap.conf certs, VLAN 100
  │
  ├─→ [AD/LDAP] — user@corp.com, identity, groups
  │
  ├─→ [SIEM] — Splunk, etc., logs from WLC, RADIUS, APs, WIDS, etc.
  │
  └─→ [Firewall ACL] — VLAN ACL: Corp VLAN 100 → Guest VLAN 200 should be DENY, but misconfigured ALLOW → segmentation bypass High
```

**Findings in this setup (from methodology.pcapng):**
- WPS enabled on IoT and HIDDEN-LAB — High, 11k flaw, beacon WPS IE
- Weak PSK WeakPass123 on IoT and TRANS — High, in wordlist, same for WPA2 and WPA3, transition downgrade
- PEAP without ca_cert — High, client without cert validation connects to rogue, MSCHAPv2 capture
- RADIUS secret testing123 — Medium, weak, 22+ chars random needed, RadSec TLS
- Guest Open ap_isolate=0 — Medium, client-to-client ARP spoof
- Captive portal MAC-based session, HTTP POST — Medium, sniff MAC spoof bypass
- VLAN ACL allows Corp VLAN 100 → Guest VLAN 200 ping — High, segmentation bypass, should be DENY
- No WIDS authorized list — Medium, rogue AP 11:22:33:44:55:66 clones Enterprise not detected
- PMF disabled/capable not required — Medium, deauth possible

**Overall risk:** High, multiple High, credential capture, network access, lateral movement, segmentation bypass, data breach.

**Cloud-managed:** Meraki, Ubiquiti UniFi — controller in cloud, AP local, management via cloud dashboard — e.g., Meraki MR46, UniFi U6-LR — similar to controller-based but cloud

**For PT:** Enterprise architecture is complex — many components, many misconfigs — high-value findings — this academy Phase 5 Enterprise (15-18) covers Enterprise, EAP, RADIUS, Corporate attacks.

### CAPWAP Deep Dive

**CAPWAP:** Control and Provisioning of Wireless Access Points — RFC 5415, tunnel between AP and controller

- **Control tunnel:** AP to controller — config, management, WIDS, etc. — DTLS encrypted
- **Data tunnel:** Client data — AP encapsulates client data in CAPWAP and sends to controller, controller decapsulates and sends to DS — or local bridging (FlexConnect, etc.)
- **Modes:**
  - **Local mode (Central switching):** All client data via CAPWAP to controller, controller to DS — central, e.g., Corp traffic via controller
  - **FlexConnect (Central switching with local):** Some SSIDs central, some local — e.g., Corp central, Guest local bridging at AP
  - **FlexConnect local switching:** Client data bridged locally at AP to DS, not via controller — e.g., Guest local

**For PT:** CAPWAP not directly RF, but affects segmentation — if local switching, VLAN ACL at AP, if central switching, VLAN ACL at controller — check.

### Controller-based vs Autonomous vs Cloud-managed

| Type | Config | Scalability | Roaming | WIDS | Cost | PT Focus |
|------|--------|-------------|---------|------|------|----------|
| **Autonomous (Fat AP)** | Local per AP | Low (few APs) | Client decides, no 802.11r/k/v | No | Low | Small office, home — WPS, weak PSK, PMF, etc. |
| **Lightweight + WLC** | Central via WLC | High (100s APs) | 802.11r/k/v, controller helps | Yes, authorized list, rogue detection | High | Enterprise — 802.1X, EAP, RADIUS, VLAN, segmentation, rogue, etc. — high-value |
| **Cloud-managed** | Cloud dashboard | High | 802.11r/k/v, cloud helps | Yes, cloud WIDS | Medium | Enterprise — similar to WLC but cloud |

**For PT:** Enterprise (WLC or cloud) has more attack surface — 802.1X, EAP, RADIUS, VLAN, segmentation, rogue, etc. — high-value findings.

## VAPT Relevance

- **Recon:** Map architecture — autonomous vs lightweight+WLC vs cloud, number of APs, bands, channels, SSIDs, BSSIDs, MBSSID, controller, RADIUS, VLANs, WIDS
- **Enum:** Per BSSID: SSID, channel, security, vendor, signal, WPS, PMF, HT/VHT/HE, VLAN (from RADIUS or config), isolation, ACL
- **Evidence:** BSSID, SSID, channel, band, width, security, vendor, signal, VLAN, isolation, ACL, controller, RADIUS, frame numbers, config snippets
- **Misconfig:** MBSSID same channel different SSIDs different VLANs — check isolation and ACL, WPS, weak PSK, PEAP no cert, RADIUS weak, segmentation bypass, rogue not detected

## Tools

- `iw dev wlan0 scan` — APs, SSIDs, BSSIDs, channels, security, HT/VHT/HE, vendor
- Kismet, airodump-ng — APs, clients, channels, WIDS
- Wireshark, PcapInspector — beacons, probes, auth, assoc, EAPOL, etc.
- ConfigViewer — hostapd.conf, wpa_supplicant.conf, FreeRADIUS clients.conf, users
- AttackDefenseRetest — VAPT loop per module

## Evidence Collection

- Architecture: Autonomous vs WLC vs cloud, number of APs, bands, channels, SSIDs, BSSIDs, MBSSID, controller IP, RADIUS IP, VLANs, WIDS authorized list
- Per BSSID: SSID, BSSID, channel, band, width, security, RSN IE, WPS IE, HT/VHT/HE, vendor, signal, VLAN, isolation, ACL, frame numbers
- Example: `Enterprise AP Cisco 3800 2 radios 4 SSIDs per radio = 8 BSSIDs, 2.4 GHz Ch6 BSSID AA:BB:CC:DD:EE:01 Corp-Enterprise WPA2-EAP VLAN 100, BSSID AA:BB:CC:DD:EE:02 Guest Open+Portal VLAN 200 ap_isolate=0, BSSID AA:BB:CC:DD:EE:03 IoT-PSK WeakPass123 VLAN 300 WPS, BSSID AA:BB:CC:DD:EE:04 HIDDEN-LAB hidden WPA2-PSK VLAN 100, 5 GHz Ch36 similar, Controller 192.168.1.5, RADIUS 192.168.1.10 secret testing123 weak, VLAN ACL Corp→Guest ALLOW should be DENY`

## Attack → Defense → Retest

- **Attack:** Observe Enterprise AP with 4 SSIDs same channel different VLANs, Guest ap_isolate=0, VLAN ACL Corp→Guest ALLOW, rogue AP 11:22:33:44:55:66 clones Enterprise not in authorized list, client assoc to rogue, PEAP no cert, MSCHAPv2 capture, segmentation bypass Corp→Guest ping success
- **Defense:** WIDS authorized AP list BSSID channel vendor signal, alert rogue same SSID diff BSSID not in list, contain, 802.1X cert validation ca_cert+subject_match via MDM/GPO, EAP-TLS mutual cert, strong RADIUS secret 22+ chars random per NAS, RadSec TLS, PMF required ieee80211w=2, ap_isolate=1 Guest, VLAN ACL deny inter-VLAN Corp→Guest and Guest→Corp, private VLANs, monitoring SIEM, training, audits, WPA3-only, OWE for Guest
- **Retest:** WIDS no rogue, authorized list matches, client with ca_cert rejects rogue self-signed cert, EAP-TLS works, strong secret, RadSec enabled, PMF required deauth fails, VLAN ping fails ACL deny, isolation enabled clients can't ping, strong PSK audit fails

## Interactive Check

> You see AP with 4 SSIDs on Ch6: Corp-Enterprise WPA2-EAP VLAN 100, Guest Open+Portal VLAN 200 ap_isolate=0, IoT-PSK WeakPass123 VLAN 300 WPS, HIDDEN-LAB hidden WPA2-PSK VLAN 100. All same BSSID prefix AA:BB:CC:DD:EE:0x same channel Ch6. What architecture and findings?

Answer: MBSSID — one physical radio Ch6 hosting 4 BSSIDs with different SSIDs and VLANs — same channel, same radio, different BSSIDs, different SSIDs, different VLANs — enterprise. Findings: WPS enabled on IoT and HIDDEN-LAB High 11k, weak PSK WeakPass123 High in wordlist on IoT, Guest Open ap_isolate=0 Medium client-to-client ARP spoof, Guest Open HTTP redirect captive portal MAC bypass Medium, VLANs — need to check ACL if Corp→Guest allowed (segmentation bypass High if allowed), PEAP without ca_cert if Enterprise client no cert validation High credential capture, RADIUS secret testing123 Medium weak. Evidence: BSSIDs, SSIDs, channels, VLANs, WPS IE, PSK, ap_isolate, ACL, frame numbers.

## References

- IEEE 802.11-2020 — BSS, ESS, DS, Portal, MBSSID
- 802.11-2020 — Infrastructure, Ad-hoc, Mesh, WDS
- CAPWAP RFC 5415
- Cisco WLC, Aruba controller documentation
- FreeRADIUS, hostapd documentation

---

*Phase 1 Foundations Complete — 16 professional lessons (01:4, 02:4 expanded, 03:4, 04:4) — Next: Build and verify*

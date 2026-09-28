# AP, Client, STA, Distribution System — Roles & State Machine

## Learning Objectives
- Understand AP roles: autonomous, lightweight, controller-based, CAPWAP, MBSSID
- Understand STA/client: scanning (passive/active), auth, assoc, power save, roaming 802.11r/k/v
- Learn association flow: Beacon → Probe → Auth → Assoc → EAPOL → Data with state machine
- Understand client enumeration via probe requests PNL leakage
- Map roles to VAPT: AP enumeration, client enumeration, evidence

## Theory

### Access Point (AP) — Central Bridge

**Definition:** AP bridges wireless (802.11) to wired (802.3 Ethernet, Distribution System). Beacons every ~100ms with SSID, BSSID, capabilities, channel.

**Types:**
- **Autonomous (Fat AP):** Standalone, config local, e.g., home router, small office — SSID, BSSID, channel, security, DHCP, NAT, all local
- **Lightweight + Controller (Enterprise):** AP (thin) + WLC (Wireless LAN Controller) — AP handles RF, controller handles config, RADIUS, VLAN, roaming, CAPWAP tunnel — e.g., Cisco WLC + AP, Aruba controller + AP — enterprise, multiple APs managed centrally
- **Cloud-managed:** Meraki, Ubiquiti UniFi — controller in cloud, AP local, management via cloud dashboard
- **MBSSID:** One physical radio hosts multiple BSSIDs with different SSIDs — e.g., Enterprise AP Ch6 with 4 SSIDs Corp (VLAN 100), Guest (VLAN 200), IoT (VLAN 300), BYOD (VLAN 400) — BSSIDs AA:BB:CC:DD:EE:01 Corp, AA:BB:CC:DD:EE:02 Guest, etc. — same channel, same radio, different BSSIDs, different VLANs — efficient, common in enterprise

**AP Capabilities:**
- **Multi-SSID:** Multiple SSIDs per radio — e.g., 4 SSIDs × 2 bands (2.4 + 5 GHz) = 8 BSSIDs per physical AP
- **Bands:** 2.4 GHz, 5 GHz, 6 GHz — each radio per band, different BSSID per radio
- **Channels:** 2.4 GHz Ch1-13, 5 GHz Ch36-165, 6 GHz Ch1-233 — AP on one channel per radio
- **Security:** Open, WEP, WPA2-PSK, WPA2-EAP, WPA3-SAE, WPA3-EAP, OWE, etc. — per SSID
- **Vendor:** Cisco, Aruba, Ubiquiti, etc. — OUI vendor identification
- **Signal:** RSSI, e.g., -45 dBm strong, -70 dBm weak, affects range and roaming

**Example Enterprise AP:**
```
Physical AP: Cisco 3800, 2 radios (2.4 GHz and 5 GHz), 4 SSIDs per radio = 8 BSSIDs
2.4 GHz Radio:
  BSSID AA:BB:CC:DD:EE:01 SSID Corp-Enterprise WPA2-EAP Ch6 VLAN 100
  BSSID AA:BB:CC:DD:EE:02 SSID Corp-Guest Open + Portal Ch6 VLAN 200 ap_isolate=0
  BSSID AA:BB:CC:DD:EE:03 SSID IoT-PSK WPA2-PSK WeakPass123 Ch6 VLAN 300 WPS enabled
  BSSID AA:BB:CC:DD:EE:04 SSID HIDDEN-LAB hidden WPA2-PSK Ch6 VLAN 100
5 GHz Radio:
  BSSID AA:BB:CC:DD:EE:11 SSID Corp-Enterprise WPA2-EAP Ch36 VLAN 100
  BSSID AA:BB:CC:DD:EE:12 SSID Corp-Guest Open + Portal Ch36 VLAN 200
  BSSID AA:BB:CC:DD:EE:13 SSID IoT-PSK WPA2-PSK WeakPass123 Ch36 VLAN 300
  BSSID AA:BB:CC:DD:EE:14 SSID LAB-WPA3-TRANS WPA2-PSK+SAE Ch36 VLAN 100
```

**For PT:** Count BSSIDs per physical AP — vendor behavior — Cisco, Aruba, etc. — MBSSID same channel different SSIDs. Check if Guest isolation disabled, VLAN ACL allows Corp→Guest, WPS enabled, etc.

### Station (STA) / Client — Laptop, Phone, IoT

**Definition:** STA (Station) is 802.11 term for client — laptop, phone, IoT device, etc. — that connects to AP.

**Scanning:**
- **Passive scanning:** Client listens for beacons on all channels — no RF tx, undetectable, slow (must dwell on each channel ~100ms for beacon)
- **Active scanning:** Client sends probe requests (broadcast wildcard SSID length 0 or directed specific SSID) on each channel, AP responds with probe response — faster, but probe requests leak PNL, detectable by WIDS

**PNL (Preferred Network List) Leakage:**
- Client probe requests contain SSIDs client has connected to before — e.g., `LAB-WIFI`, `HomeWiFi`, `Corp-WLAN`, `Starbucks`, `Airport_Free_WiFi` — even when not connected, even when Wi-Fi not actively used (if Wi-Fi enabled)
- **Privacy issue:** Leaks history, location, employer, home, etc.
- **For PT:** Useful for targeted Evil Twin — if you know client probes `Corp-WLAN`, you can create rogue AP with same SSID `Corp-WLAN`, client may auto-connect if stronger signal or after deauth (if PMF disabled)
- **Modern OS mitigation:** Random MAC for probing (iOS, Android, Windows use random MAC for probe requests to reduce tracking), but still leaks PNL, and some OS still use real MAC for directed probes

**Authentication & Association:**
- **Auth:** Open System (algorithm 0, 2 frames: Req seq1, Resp seq2 status0 success) — most common, WPA2/WPA3 — or Shared Key (WEP, 4 frames, insecure)
- **Assoc:** Assoc Req (client→AP, SSID, RSN IE, HT/VHT/HE, listen interval) and Assoc Resp (AP→client, status0 success, AID 1-2007)
- **State Machine:**
  - State 1: Unauthenticated, Unassociated — can send probe, auth
  - State 2: Authenticated, Unassociated — auth success, can send assoc
  - State 3: Authenticated, Associated — auth and assoc success, can send data and EAPOL
  - Deauth → State 1, Disassoc → State 2

**Power Save:**
- Client can go to sleep, tell AP via Power Mgmt bit, AP buffers data, TIM indicates buffered data, client wakes via PS-Poll or Null data
- **For PT:** Power save not security relevant, but shows client behavior

**Roaming:**
- Client decides roaming, not AP — client chooses AP based on signal, vendor, etc.
- **802.11r (Fast Roaming, FT):** Fast BSS Transition, reduces roaming time, PMK-R0/R1, etc.
- **802.11k (Radio Resource Measurement):** AP provides neighbor list, client uses for roaming decision
- **802.11v (BSS Transition Management):** AP can suggest client to roam to better AP
- **For PT:** Roaming affects which AP client connects — if rogue AP stronger signal, client may roam to rogue

**Example Client:**
```
Client: Laptop, MAC 12:34:56:78:9A:BC, Intel AX200, 2.4/5/6 GHz, HT/VHT/HE, random MAC probing enabled
PNL: LAB-WIFI, HomeWiFi, Corp-WLAN, Starbucks
Current: Connected to LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP, signal -45 dBm, TX 72 Mbps, RX 65 Mbps
Probe: Broadcast probe wildcard SSID length 0 with random MAC 02:11:22:33:44:55, directed probe SSID LAB-WIFI with real MAC 12:34:56:78:9A:BC (PNL leak)
```

**For PT:** Client enumeration via probe requests — even without AP, probe requests reveal clients and PNL — evidence for targeted Evil Twin.

### Distribution System (DS) — Wired Backbone

**Definition:** DS is wired network connecting APs — e.g., Ethernet, VLANs, controller, RADIUS, etc.

**Components:**
- **AP:** Bridges wireless to DS
- **DS:** Wired backbone — switches, VLANs, etc.
- **Portal:** Bridge between DS and non-802.11 LAN (e.g., Ethernet)
- **Controller (WLC):** Manages APs, config, RADIUS, VLAN, roaming, CAPWAP tunnel — enterprise
- **CAPWAP:** Control and Provisioning of Wireless Access Points — tunnel between AP and controller

**Infrastructure Mode (Focus of this academy):**
```
Client (STA) <--802.11 RF--> AP (BSSID) <--Ethernet/CAPWAP--> DS (VLANs, Switches, Controller, RADIUS) <---> Internet/Internal
```

**Ad-hoc (IBSS):** No AP, clients directly communicate — STA1 ↔ STA2, rare now

**Mesh (802.11s):** Multiple APs form mesh, no central controller, APs relay — e.g., outdoor mesh

**For PT:** Infrastructure mode is focus — AP + DS + VLANs + RADIUS + segmentation + isolation + rogue detection.

### Association Flow (Full)

```
1. Beacon (AP → Broadcast, 100ms): "I'm LAB-WIFI, BSSID AA:BB:CC:DD:EE:FF, Ch6, WPA2-PSK CCMP, HT20, WPS enabled, PMF disabled"
2. Probe Request (Client → Broadcast or Directed): "Anyone LAB-WIFI?" or wildcard "Any AP?" — SA Client MAC, DA FF:FF:FF:FF:FF:FF or BSSID, SSID IE LAB-WIFI or empty, PNL leak
3. Probe Response (AP → Client): "Yes, I'm LAB-WIFI, BSSID AA:BB:CC:DD:EE:FF, Ch6, WPA2-PSK CCMP" — DA Client MAC, SA BSSID, SSID real even if hidden beacon
4. Authentication Request (Client → AP): algorithm 0 Open, seq1, SA Client, DA BSSID, BSSID BSSID
5. Authentication Response (AP → Client): algorithm 0 Open, seq2, status0 success, SA BSSID, DA Client
6. Association Request (Client → AP): SSID LAB-WIFI, RSN IE CCMP PSK, HT capabilities, listen interval, SA Client, DA BSSID, BSSID BSSID — real SSID even if hidden
7. Association Response (AP → Client): status0 success, AID1, RSN IE, HT capabilities, SA BSSID, DA Client
8. 4-way Handshake (if WPA2/WPA3): EAPOL M1-M4, ANonce, SNonce, MIC, GTK — derive PTK, install keys
9. Data (QoS Data, encrypted): Client ↔ AP, BSSID, SA/DA, Protected bit, LLC IP
```

**State Machine:**
- State 1 Unauthenticated Unassociated → Auth Req → State 2 Authenticated Unassociated → Assoc Req → State 3 Authenticated Associated → Data/EAPOL
- Deauth (any state) → State 1, Disassoc (State 3) → State 2

**Reason Codes:** 1 unspecified, 4 inactivity, 7 class 3 frame from nonassoc STA (common for deauth flood), 8 STA leaving

**Status Codes:** 0 success, 1 failure, etc.

### Client Enumeration — Probe Requests

**Why client enumeration matters:**
- Clients leak PNL via probe requests — even when not connected — privacy + targeted Evil Twin
- Clients may auto-connect to known SSID if stronger signal or after deauth (if PMF disabled)
- Without cert validation (PEAP without ca_cert), client sends MSCHAPv2 to rogue RADIUS

**How to enumerate clients:**
- Monitor mode capture probe requests — filter `wlan.fc.type_subtype==4`, SA client MAC, SSID PNL
- Monitor mode capture association — filter `wlan.fc.type_subtype==0` assoc req, SA client, SSID, BSSID
- airodump-ng shows STATION (client MAC) and associated BSSID
- Kismet shows clients, PNL, probe, etc.
- PcapInspector summary shows clients count, SSIDs, BSSIDs, probes

**Example recon-lab.pcapng:**
- 2 clients: `11:22:33:44:55:66` PNL LAB-WIFI, HomeWiFi, Corp-WLAN and `22:33:44:55:66:77` PNL LAB-WIFI
- Probe Req f3 SA 11:22:33:44:55:66 SSID LAB-WIFI (PNL leak)
- Probe Req f4 SA 22:33:44:55:66:77 SSID HomeWiFi (PNL leak)
- Assoc Req f7 SA 11:22:33:44:55:66 DA AA:BB:CC:DD:EE:FF SSID LAB-WIFI

**For PT:** Client enumeration via probe requests — even without AP, you can find clients and PNL — evidence for targeted Evil Twin, privacy issue.

## VAPT Relevance

- **Recon:** Enumerate APs (beacons) and clients (probe req, assoc req) — both
- **Enum:** Per AP: SSID, BSSID, channel, security, vendor, signal, WPS, PMF, HT/VHT/HE. Per client: MAC, PNL, probe, assoc, EAP identity, signal, vendor
- **Evidence:** AP BSSID + SSID + channel + security + vendor + signal + frame numbers, Client MAC + PNL + probe/assoc frame numbers + signal
- **Misconfig:** Client PNL leakage privacy, auto-connect to open, no cert validation, etc.

## Tools

- `iw dev wlan0 scan` — APs and clients (if associated)
- `airodump-ng wlan0mon` — BSSID, CH, ENC, ESSID, STATION (client MAC)
- Wireshark filters: `wlan.fc.type_subtype==4` probe req, `wlan.fc.type_subtype==0` assoc req, `wlan.sa==11:22:33:44:55:66` client, `wlan_mgt.ssid==LAB-WIFI` SSID
- PcapInspector: Summary clients, SSIDs, BSSIDs, probes, filter presets

## Evidence Collection

- AP: BSSID, SSID, channel, security, vendor, signal, frame numbers
- Client: MAC, PNL, probe/assoc frame numbers, signal, vendor, EAP identity
- Example: `Beacon f1 SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK, Probe Req f3 Client 11:22:33:44:55:66 SSID LAB-WIFI PNL, Assoc Req f7 Client 11:22:33:44:55:66 DA AA:BB:CC:DD:EE:FF SSID LAB-WIFI`

## Attack → Defense → Retest

- **Attack:** Observe client probe req PNL leak `Corp-WLAN`, create rogue AP same SSID `Corp-WLAN` stronger signal, client may auto-connect if PMF disabled and PSK known or Enterprise no cert validation
- **Defense:** Random MAC probing (modern OS), disable auto-connect to open, WPA3, EAP-TLS with cert validation, PMF required, strong PSK, WIDS authorized list
- **Retest:** Probe req random MAC wildcard SSID no PNL, client with ca_cert rejects rogue, PMF required deauth fails, strong PSK audit fails

## Interactive Check

> Client `AA:BB:CC:DD:EE:FF` sends probe req SSID `Corp-WLAN` and `HomeWiFi`. AP `Corp-WLAN` BSSID `11:22:33:44:55:66` Ch6 WPA2-PSK. What can you infer and next steps (authorized)?

Answer: Client PNL includes Corp-WLAN (target if in scope) and HomeWiFi (personal). If Corp-WLAN in scope and authorized, enumerate beacons for Corp-WLAN BSSID/channel/security, check if WPS, PMF, PSK weak, etc. Check if client currently connected — if probe req but no assoc, client not connected, may be out of range or not auto-connect. If you create rogue AP same SSID Corp-WLAN stronger signal Ch11 (lab only, own lab), client may connect if PSK known and PMF disabled. Evidence: Probe req frame numbers, client MAC, SSIDs PNL. Don't attack public, own lab only.

## References

- IEEE 802.11-2020 — AP, STA, BSS, ESS, DS, association flow, state machine
- 802.11-2020 — Scanning, passive/active, PNL
- Wireshark 802.11 — Probe req, assoc req, beacon

---

*Next: Channels, Bands, Bandwidth — 2.4/5/6 GHz, 20/40/80/160 MHz, DFS, regulatory, interference*

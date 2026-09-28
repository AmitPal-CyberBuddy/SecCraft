# Wireshark & 802.11 Filtering — Professional PCAP Analysis

## Learning Objectives
- Master 802.11 frame types/subtypes and display filters (30+ filters)
- Understand tshark CLI for automation and evidence collection
- Learn PcapInspector simulated Wireshark UI for zero-cost labs
- Build evidence chain: PCAP hash, frame numbers, filters, BSSID, channel, security
- Understand combining filters, troubleshooting, and reporting

## Theory

### Why Wireshark for Wi-Fi?

Wireshark (GUI) and tshark (CLI) are primary tools for artifact-based labs — you can't run monitor mode in VM or browser, but you can analyze PCAPs (simulated or real captures from hardware lab). Wireshark decodes 802.11, shows management/control/data, IEs, RSN, HT/VHT/HE, EAPOL, etc., with display filters.

**For PT:** All findings must be reproducible with PCAP hash SHA256, frame numbers, display filters, BSSID, channel, etc. — not just screenshot — evidence chain.

### 802.11 Frame Types Recap — Filter Foundation

IEEE 802.11 MAC header: Frame Control (2 bytes) — Protocol Version (2 bits), Type (2 bits), Subtype (4 bits), To DS, From DS, More Frag, Retry, Power Mgmt, More Data, Protected, +HTC.

- **Type 0 Management (00):** Subtypes — 0 Assoc Req, 1 Assoc Resp, 2 Reassoc Req, 3 Reassoc Resp, 4 Probe Req, 5 Probe Resp, 6 Measurement Pilot, 7 Reserved, 8 Beacon, 9 ATIM, 10 Disassoc, 11 Auth, 12 Deauth, 13 Action, 14 Action No Ack, 15 Reserved
- **Type 1 Control (01):** Subtypes — 0-6 Reserved, 7 Control Wrapper, 8 Block Ack Request, 9 Block Ack, 10 PS-Poll, 11 RTS, 12 CTS, 13 ACK, 14 CF-End, 15 CF-End+CF-Ack
- **Type 2 Data (10):** Subtypes — 0 Data, 1 Data+CF-Ack, 2 Data+CF-Poll, 3 Data+CF-Ack+CF-Poll, 4 Null, 5 CF-Ack, 6 CF-Poll, 7 CF-Ack+CF-Poll, 8 QoS Data, 9 QoS Data+CF-Ack, 10 QoS Data+CF-Poll, 11 QoS Data+CF-Ack+CF-Poll, 12 QoS Null, 13 Reserved, 14 QoS CF-Poll (no data), 15 QoS CF-Ack+CF-Poll (no data)
- **Type 3 Extension (11):** 802.11-2016 extension

**For filtering:** Use `wlan.fc.type` and `wlan.fc.type_subtype` — `type` 0 mgmt, 1 control, 2 data, `type_subtype` decimal 0-15 for mgmt, etc. — e.g., `wlan.fc.type_subtype==8` beacon, `==4` probe req, `==5` probe resp, `==0` assoc req, `==1` assoc resp, `==11` auth, `==12` deauth, `==10` disassoc, `eapol` for 4-way handshake (EAPOL is data subtype but Wireshark dissector `eapol`).

### Essential Display Filters — 30+ Filters

| Filter | What It Shows | Use Case | Example |
|--------|---------------|----------|---------|
| `wlan.fc.type==0` | Management only (all mgmt) | Recon mgmt | `wlan.fc.type==0` |
| `wlan.fc.type==1` | Control only (RTS/CTS/ACK) | Control | `wlan.fc.type==1` |
| `wlan.fc.type==2` | Data only (data, QoS data, EAPOL) | Data, handshake | `wlan.fc.type==2` |
| `wlan.fc.type_subtype==8` | Beacons | AP enumeration, SSID, BSSID, channel, security | `wlan.fc.type_subtype==8` |
| `wlan.fc.type_subtype==4` | Probe Requests | Client PNL, hidden SSID client side | `wlan.fc.type_subtype==4` |
| `wlan.fc.type_subtype==5` | Probe Responses | Hidden SSID reveal AP side, AP capabilities | `wlan.fc.type_subtype==5` |
| `wlan.fc.type_subtype==0` | Assoc Requests | Client → AP, SSID real hidden reveal, RSN, HT | `wlan.fc.type_subtype==0` |
| `wlan.fc.type_subtype==1` | Assoc Responses | AP → Client, status, AID | `wlan.fc.type_subtype==1` |
| `wlan.fc.type_subtype==11` | Authentication | Auth flow, algo, seq, status | `wlan.fc.type_subtype==11` |
| `wlan.fc.type_subtype==12` | Deauthentication | Deauth DoS, PMF check, reason codes | `wlan.fc.type_subtype==12` |
| `wlan.fc.type_subtype==10` | Disassociation | Disassoc, reason codes | `wlan.fc.type_subtype==10` |
| `eapol` | 4-way handshake (EAPOL) | WPA2/WPA3 handshake, PMKID | `eapol` |
| `wlan_mgt.ssid==LAB-WIFI` | Specific SSID | Filter network LAB-WIFI | `wlan_mgt.ssid==LAB-WIFI` |
| `wlan_mgt.ssid==""` | Hidden beacons SSID empty | Hidden SSID detection | `wlan_mgt.ssid=="" && wlan.fc.type_subtype==8` |
| `wlan.bssid==AA:BB:CC:DD:EE:FF` | Specific BSSID | Filter AP BSSID | `wlan.bssid==AA:BB:CC:DD:EE:FF` |
| `wlan.sa==11:22:33:44:55:66` | Source MAC SA | Filter client or AP SA | `wlan.sa==11:22:33:44:55:66` |
| `wlan.da==11:22:33:44:55:66` | Destination MAC DA | Filter client or AP DA | `wlan.da==11:22:33:44:55:66` |
| `wlan.ta==11:22:33:44:55:66` | Transmitter TA | Usually SA for mgmt | `wlan.ta==AA:BB:CC:DD:EE:FF` |
| `wlan.ra==11:22:33:44:55:66` | Receiver RA | Usually DA | `wlan.ra==FF:FF:FF:FF:FF:FF` |
| `wlan_mgt.ds.current_channel` | Channel | Channel map, but filter value `wlan_mgt.ds.current_channel==6` | `wlan_mgt.ds.current_channel==6` |
| `wlan_mgt.fixed.beacon` | Beacon interval | Check interval 100 TU | `wlan_mgt.fixed.beacon` exists |
| `wlan_mgt.fixed.capabilities.privacy` | Privacy bit | 0 open, 1 encrypted | `wlan_mgt.fixed.capabilities.privacy==0` open |
| `wlan_mgt.fixed.capabilities.ess` | ESS bit | 1 infrastructure BSS | `wlan_mgt.fixed.capabilities.ess==1` |
| `wlan_rsna_eapol` | RSN EAPOL | RSN IE in EAPOL? | `wlan_rsna_eapol` |
| `wlan.fc.retry==1` | Retry bit | Retransmissions | `wlan.fc.retry==1` |
| `wlan.fc.protected==1` | Protected (encrypted) | Data encrypted? | `wlan.fc.protected==1` |
| `wlan.fc.tods==1` | To DS | Client to AP data | `wlan.fc.tods==1 && wlan.fc.fromds==0` client to AP |
| `wlan.fc.fromds==1` | From DS | AP to client data | `wlan.fc.fromds==1 && wlan.fc.tods==0` AP to client |
| `wlan.fc.tods==0 && wlan.fc.fromds==0` | Ad-hoc or mgmt | IBSS or mgmt | `wlan.fc.tods==0 && wlan.fc.fromds==0` |
| `wlan.fc.tods==1 && wlan.fc.fromds==1` | WDS | WDS 4-addr | `wlan.fc.tods==1 && wlan.fc.fromds==1` |
| `wlan_mgt.tag.number==48` | RSN IE present | WPA2/WPA3 | `wlan_mgt.tag.number==48` |
| `wlan_mgt.tag.oui==00:50:f2` | Vendor OUI 00:50:F2 Microsoft/WPS | WPS IE `00:50:F2:04` | `wlan_mgt.tag.oui==00:50:f2 && wlan_mgt.tag.number==221` |
| `wlan_mgt.ssid contains LAB` | SSID contains | Fuzzy | `wlan_mgt.ssid contains LAB` |
| `wlan.fc.type_subtype==8 && wlan_mgt.ssid==LAB-WIFI` | Beacon specific SSID | AP LAB-WIFI beacons | `wlan.fc.type_subtype==8 && wlan_mgt.ssid==LAB-WIFI` |
| `eapol && wlan.bssid==AA:BB:CC:DD:EE:FF` | Handshake for specific BSSID | Handshake per AP | `eapol && wlan.bssid==AA:BB:CC:DD:EE:FF` |
| `wlan.fc.type_subtype==4 && wlan.sa==12:34:56:78:9A:BC` | Probe req specific client | Client PNL | `wlan.fc.type_subtype==4 && wlan.sa==12:34:56:78:9A:BC` |

**For PT:** Start with broad, then drill down:
1. `wlan.fc.type_subtype==8` → map APs (BSSID, SSID, channel, security, vendor, signal)
2. `wlan.fc.type_subtype==4` → map clients/PNL (SA client, SSID PNL, hidden reveal client side)
3. `wlan.fc.type_subtype==5` → hidden reveal AP side, probe resp
4. `wlan.fc.type_subtype==0 || wlan.fc.type_subtype==1` → assoc flow
5. `wlan.fc.type_subtype==11` → auth
6. `eapol` → handshake (M1-M4, PMKID)
7. `wlan.fc.type_subtype==12` → deauth (PMF check)
8. Then `wlan.bssid==AA:BB:CC:DD:EE:FF` to filter specific AP
9. `wlan_mgt.ssid==LAB-WIFI` to filter specific SSID
10. Combine: `wlan.bssid==AA:BB:CC:DD:EE:FF && eapol` → handshake for that AP

### Combining Filters — Boolean Logic

Wireshark display filter syntax: `&&` and, `||` or, `!` not, `==`, `!=`, `contains`, `matches`, parentheses.

**Examples:**
```
wlan.fc.type_subtype==8 && wlan_mgt.ssid==LAB-WIFI                    # Beacons for LAB-WIFI only
eapol && wlan.bssid==AA:BB:CC:DD:EE:FF                               # Handshake for specific BSSID
wlan.fc.type_subtype==4 && wlan.sa==12:34:56:78:9A:BC               # Probe req from specific client
wlan.fc.type_subtype==8 || wlan.fc.type_subtype==4 || wlan.fc.type_subtype==5   # Beacons + probes (recon)
wlan.fc.type_subtype==0 || wlan.fc.type_subtype==1                  # Assoc req/resp
wlan.fc.type_subtype==8 && wlan_mgt.ssid==""                         # Hidden beacons
wlan.fc.type_subtype==5 && wlan_mgt.ssid==HIDDEN-LAB                # Probe resp reveals HIDDEN-LAB
wlan.fc.type_subtype==0 && wlan_mgt.ssid==HIDDEN-LAB                # Assoc req reveals HIDDEN-LAB
wlan.fc.type_subtype==12 && wlan.bssid==AA:BB:CC:DD:EE:FF           # Deauth for specific BSSID
wlan.bssid==AA:BB:CC:DD:EE:FF && (wlan.fc.type_subtype==0 || wlan.fc.type_subtype==1 || eapol)  # Assoc + handshake for BSSID
wlan.sa==12:34:56:78:9A:BC || wlan.da==12:34:56:78:9A:BC            # All frames for client (SA or DA)
wlan_mgt.ds.current_channel==6                                       # Channel 6
wlan_mgt.fixed.capabilities.privacy==0                               # Open networks
wlan_mgt.tag.number==48 && wlan_mgt.ssid==LAB-WIFI                  # RSN IE for LAB-WIFI (WPA2/WPA3)
```

**For PT:** Use combining to narrow evidence — e.g., for report: "Beacon f1 BSSID AA:BB:CC:DD:EE:FF SSID LAB-WIFI Ch6 WPA2-PSK filter `wlan.fc.type_subtype==8 && wlan.bssid==AA:BB:CC:DD:EE:FF`"

### tshark CLI — Automation & Evidence

tshark is Wireshark CLI, great for automation, scripting, evidence collection, headless Kali.

**Basic:**
```bash
# List beacons with SSID, BSSID, channel
tshark -r capture.pcapng -Y "wlan.fc.type_subtype==8" -T fields -e frame.number -e wlan_mgt.ssid -e wlan.bssid -e wlan_mgt.ds.current_channel -e wlan_mgt.fixed.capabilities.privacy -E header=y -E separator=,

# Handshakes
tshark -r capture.pcapng -Y "eapol" -T fields -e frame.number -e wlan.bssid -e wlan.sa -e wlan.da -e eapol.keydes.msgnr -E header=y

# Probe requests (PNL) — client SA + SSID
tshark -r capture.pcapng -Y "wlan.fc.type_subtype==4" -T fields -e frame.number -e wlan.sa -e wlan_mgt.ssid -E header=y

# Hidden SSID — beacons empty + probe resp reveal
tshark -r capture.pcapng -Y "wlan_mgt.ssid==\"\" && wlan.fc.type_subtype==8" -T fields -e frame.number -e wlan.bssid -e wlan_mgt.ds.current_channel
tshark -r capture.pcapng -Y "wlan.fc.type_subtype==5" -T fields -e frame.number -e wlan.bssid -e wlan.da -e wlan_mgt.ssid

# Deauth
tshark -r capture.pcapng -Y "wlan.fc.type_subtype==12" -T fields -e frame.number -e wlan.bssid -e wlan.sa -e wlan.da -e wlan_mgt.fixed.reason_code

# Assoc
tshark -r capture.pcapng -Y "wlan.fc.type_subtype==0 || wlan.fc.type_subtype==1" -T fields -e frame.number -e wlan.bssid -e wlan.sa -e wlan.da -e wlan_mgt.ssid -e wlan_mgt.fixed.status_code

# Specific BSSID
tshark -r capture.pcapng -Y "wlan.bssid==AA:BB:CC:DD:EE:FF" -T fields -e frame.number -e wlan.fc.type_subtype -e wlan_mgt.ssid -e wlan.sa -e wlan.da

# Open networks
tshark -r capture.pcapng -Y "wlan.fc.type_subtype==8 && wlan_mgt.fixed.capabilities.privacy==0" -T fields -e frame.number -e wlan_mgt.ssid -e wlan.bssid

# Count frames
tshark -r capture.pcapng -Y "wlan.fc.type_subtype==8" | wc -l   # beacon count
tshark -r capture.pcapng -Y "eapol" | wc -l                      # eapol count

# Hash for evidence
sha256sum capture.pcapng
```

**For PT:** Use tshark to extract evidence for report — frame numbers, BSSID, SSID, channel, etc. — reproducible.

### PcapInspector — Simulated Wireshark UI (Zero-Cost Lab)

We built Wireshark-like UI in WiFiForge for zero-cost labs (no hardware, no monitor mode in browser).

**Features:**
- **Summary bar:** SSIDs count, BSSIDs count, clients count, beacons count, probes count, EAPOL count, deauth count, etc. — at a glance recon
- **Filter bar:** Presets (All, Beacons, Probe Req, Probe Resp, Auth, Assoc, EAPOL, Deauth, Hidden, Open, etc.) + custom filter input — e.g., type `wlan.bssid==AA:BB:CC:DD:EE:FF` or `eapol`
- **Table:** No, Time (relative), Type (Beacon, Probe Req, Probe Resp, Auth, Assoc Req, Assoc Resp, EAPOL M1-M4, Deauth, Data, etc.), SSID, BSSID, SA, DA, Channel, Signal, Summary
- **Detail:** Click frame → shows detailed decode: SSID, BSSID, SA, DA, TA, RA, channel, RSN IE (AKM, cipher, PMF), HT/VHT/HE, WPS IE, vendor, signal, reason code, status code, ANonce, SNonce, MIC, etc.
- **Export:** Evidence copy — frame numbers, filters, etc.

**Lab Tasks — traffic-analysis.pcapng (12 frames):**
1. Summary: How many SSIDs? BSSIDs? Clients? Beacons? EAPOL?
2. Filter `beacon` preset or `wlan.fc.type_subtype==8` → How many beacons? What security? SSID? BSSID? Channel?
3. Filter `probe req` preset or `wlan.fc.type_subtype==4` → What client? What SSID? PNL?
4. Filter `eapol` preset → How many EAPOL? Is it complete 4-way? M1-M4? Frame numbers?
5. Custom filter `wlan.bssid==AA:BB:CC:DD:EE:FF` → All frames for that BSSID
6. Map full flow: Beacon → Probe → Auth → Assoc → EAPOL — frame numbers for report

**Example workflow:**
```
Open PcapInspector traffic-analysis.pcapng
Summary: 1 SSID LAB-WIFI, 1 BSSID AA:BB:CC:DD:EE:FF, 1 client 11:22:33:44:55:66, 2 beacons, 1 probe req, 1 probe resp, 2 auth, 2 assoc, 4 eapol
Filter Beacons: f1 Beacon SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK PMF capable RSN
Filter Probe Req: f3 Probe Req SA 11:22:33:44:55:66 DA FF:FF:FF:FF:FF:FF SSID LAB-WIFI
Filter EAPOL: f9 M1 ANonce, f10 M2 SNonce+MIC, f11 M3 GTK+MIC, f12 M4 ACK — complete handshake
Filter wlan.bssid==AA:BB:CC:DD:EE:FF: Shows all 12 frames for that BSSID
Click f9 EAPOL M1: Detail shows ANonce, key descriptor, etc.
Evidence: Beacon f1, Probe f3, Auth f5-6, Assoc f7-8, EAPOL f9-12 complete, BSSID AA:BB:CC:DD:EE:FF, Client 11:22:33:44:55:66, Ch6, WPA2-PSK, PCAP hash SHA256...
```

**For PT:** PcapInspector simulates Wireshark for zero-cost — use filters, extract evidence, frame numbers, BSSID, etc., for report.

### Evidence Collection — Chain of Custody

**Must include:**
- PCAP file name + SHA256 hash — e.g., `traffic-analysis.pcapng SHA256 abc123...`
- Frame numbers — e.g., `Beacon f1, Probe Req f3, Auth f5-6, Assoc f7-8, EAPOL f9-12`
- Filters used — e.g., `wlan.fc.type_subtype==8`, `eapol`, `wlan.bssid==AA:BB:CC:DD:EE:FF`
- BSSID, SSID, channel, security, vendor, signal, client MAC, PNL, etc.
- Commands — e.g., `tshark -r traffic-analysis.pcapng -Y "eapol" -T fields -e frame.number -e wlan.bssid...`
- Screenshots? But text evidence reproducible is better — frame numbers + filters + hash
- Config hashes if applicable — `sha256sum hostapd.conf`

**Example evidence:**
```
PCAP: traffic-analysis.pcapng SHA256 e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 (example)
Frames: 12 total, 2 beacons f1-2 SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK PMF capable, 1 probe req f3 SA 11:22:33:44:55:66 SSID LAB-WIFI, 1 probe resp f4 SA BSSID DA client, 2 auth f5-6 SA client DA BSSID algo 0 seq1 status0, 2 assoc f7-8 SA client DA BSSID SSID LAB-WIFI status0 AID1, 4 EAPOL f9-12 M1 ANonce f9 SA BSSID DA client, M2 SNonce+MIC f10 SA client DA BSSID, M3 GTK+MIC f11 SA BSSID DA client, M4 ACK f12 SA client DA BSSID — complete handshake
Filters: wlan.fc.type_subtype==8 → beacons, wlan.fc.type_subtype==4 → probe req, eapol → handshake, wlan.bssid==AA:BB:CC:DD:EE:FF → all for BSSID
BSSID: AA:BB:CC:DD:EE:FF, SSID: LAB-WIFI, Ch: 6, Security: WPA2-PSK CCMP PSK, PMF: capable (not required), WPS: not present, Vendor: Lab AA:BB:CC OUI, Signal: -50 dBm
Client: 11:22:33:44:55:66 PNL LAB-WIFI, vendor Lab?
Commands: tshark -r traffic-analysis.pcapng -Y "wlan.fc.type_subtype==8" -T fields -e frame.number -e wlan_mgt.ssid -e wlan.bssid -e wlan_mgt.ds.current_channel
```

**For PT:** Evidence must be reproducible — anyone with PCAP and filters should get same frame numbers, BSSID, etc.

### VAPT Relevance

- **Recon:** Filters are first step — map APs, clients, hidden, handshake, deauth, etc.
- **Evidence:** Frame numbers + filters + hash + BSSID + channel + security + vendor + client + PNL — not just "found AP" — reproducible
- **Report:** "2 beacons observed f1-2 SSID LAB-WIFI BSSID AA:BB:CC:DD:EE:FF Ch6 WPA2-PSK CCMP PSK PMF capable, 1 client 11:22:33:44:55:66 PNL LAB-WIFI probe req f3, complete 4-way handshake f9-12 M1-M4, deauth none, WPS not present, vendor Lab, signal -50 dBm, PCAP traffic-analysis.pcapng SHA256..."
- **Methodology:** Recon → Enum → Vuln Analysis → Exploitation (authorized) → Reporting → Retest — filters used throughout

### Attack → Defense → Retest

- **Attack:** Use filters to enumerate — `wlan.fc.type_subtype==8` APs, `wlan.fc.type_subtype==4` clients PNL, `eapol` handshake, `wlan.fc.type_subtype==12` deauth, `wlan_mgt.ssid==""` hidden, `wlan_mgt.fixed.capabilities.privacy==0` open, `wlan_mgt.tag.oui==00:50:f2` WPS
- **Defense:** Not filter defense, but use filters to verify defense — after fix, new PCAP should show `wlan_mgt.tag.oui==00:50:f2` no WPS, `ieee80211w=2` PMF required, `wlan.fc.type_subtype==12` no deauth success, strong PSK audit fails, etc.
- **Retest:** New PCAPs, new filters, verify fix, document new hash, frame numbers, filters

### Interactive Check

> You have `recon-lab.pcapng` 13 frames 5 APs 1 hidden 2 clients. List filters to find: (1) all beacons, (2) hidden beacons, (3) probe req for client `12:34:56:78:9A:BC`, (4) handshake for BSSID `AA:BB:CC:DD:EE:FF`, (5) deauth.

Answer:
1. Beacons: `wlan.fc.type_subtype==8`
2. Hidden beacons: `wlan_mgt.ssid=="" && wlan.fc.type_subtype==8`
3. Probe req client: `wlan.fc.type_subtype==4 && wlan.sa==12:34:56:78:9A:BC` — shows PNL
4. Handshake BSSID: `eapol && wlan.bssid==AA:BB:CC:DD:EE:FF`
5. Deauth: `wlan.fc.type_subtype==12` — check if any, reason codes, PMF

Then use PcapInspector or tshark to extract frame numbers, SSID, BSSID, channel, etc., for report.

## Tools

- Wireshark GUI — display filters, decode, follow stream, statistics
- tshark CLI — automation, fields, evidence
- PcapInspector (WiFiForge) — simulated Wireshark for zero-cost labs
- Scapy — `rdpcap()`, `packet.show()`, `packet[Dot11].type`, `subtype`, `addr1/2/3`, `Dot11Elt`, etc.
- Kismet, airodump-ng — live recon, but PCAP analysis via Wireshark

## References

- Wireshark Display Filters — 802.11, wlan.fc.type, wlan.fc.type_subtype, wlan_mgt.ssid, wlan.bssid, eapol
- IEEE 802.11-2020 — Frame types/subtypes, management, control, data
- tshark manual — `-r`, `-Y`, `-T fields`, `-e`, `-E header`, `-E separator`

---

*Next: Association Flow — Beacon → Probe → Auth → Assoc → EAPOL → Data, state machine, reason/status codes, RSN IE analysis*

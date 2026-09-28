# Simulated vs Hardware Labs — Technical Honesty

> Core principle: **Never claim simulation equals RF reality.**

## Why This Matters

A normal web app, Docker, or VM cannot perfectly emulate:
- Real RF propagation, signal strength, interference
- Monitor mode on real radio hardware
- Packet injection (deauth, etc.)
- Real AP beaconing with physical timing
- Client/AP association state machines over air
- Physical proximity and roaming

Pretending otherwise is technically dishonest and creates false confidence.

## Two Lab Categories

### ✅ SIMULATED — Zero-Cost, No Hardware

**What we can do:**
- PCAP analysis (beacon, probe, handshake, EAPOL, RADIUS logs)
- 802.11 frame analysis (management/control/data)
- Wireshark filter exercises
- WPA/WPA2 concepts, handshake analysis, PMKID
- Offline password auditing using *self-generated* captures + wordlists
- Wireless config analysis (hostapd.conf, RADIUS configs)
- Enterprise Wi-Fi concepts via Docker logs (FreeRADIUS)
- Network segmentation scenarios
- Reporting, evidence collection, methodology

**How we simulate:**
- Scapy-generated PCAPs (beacons, probes, handshakes)
- hostapd configs (not running AP, just config audit)
- Docker FreeRADIUS that produces logs and EAP PCAPs
- Static artifacts committed to `content/pcaps/` and `content/configs/`

**UI Badge:** `SIMULATED` — green, enabled by default

### ⚠️ HARDWARE_REQUIRED — Real RF

**What genuinely needs hardware:**
- Monitor mode (`iw dev wlan0 set type monitor`)
- Packet injection (deauth, disassoc, etc.)
- Real AP interaction (beacon TX, client assoc)
- Signal strength, channel interference, proximity
- Rogue AP / Evil Twin that actually beacons
- Client isolation testing over air
- WPS PIN brute-force against real AP
- WPA3 SAE capture with Wi-Fi 6 hardware

**Requirements:**
- Compatible adapter: ALFA AWUS036ACHM (MT7610U), AWUS036ACM, or similar
- Kali bare-metal or VM with USB passthrough
- `rfkill unblock wifi`, `iw` capable driver
- Lab-only, authorized, own infrastructure

**UI Badge:** `RF_REQUIRED` — amber, disabled unless `HARDWARE_MODE=true` in Settings

## Lab Manifest Example

```yaml
id: lab-02-beacon-analysis
title: Beacon Frame Analysis
runtime: simulated  # or hardware
artifacts:
  - path: pcaps/wifi-fundamentals/beacon-only.pcapng
    type: pcapng
hardware:
  required: false
  adapters: []
  notes: "No hardware needed, uses pre-captured beacon"

---
id: lab-12-deauth
title: Deauth Behavior Validation
runtime: hardware
hardware:
  required: true
  adapters: ["ALFA AWUS036ACHM"]
  driver: "mt76"
  notes: "Requires monitor mode + injection. Lab-only SSID LAB-DEAUTH"
```

## Safety & Ethics

All hardware labs must:
- Use SSID `LAB-*` or `WIFIFORGE-*`
- Include `scope: lab-only` in manifest
- Warn: "Do not test on public/third-party Wi-Fi"
- Document as VAPT: authorized, evidence-based, remediation-focused

## Roadmap for Hardware

Phase H (Future, Optional):
- Docs for adapter compatibility
- Scripts: `scripts/enable-monitor.sh`, `scripts/capture-handshake.sh`
- Docker won't help here — needs real radio
- UI toggle in Settings to enable hardware labs

## Honest UI Copy

> "This platform cannot simulate RF propagation, signal strength, or real-time 802.11 state machines. Simulated labs use pre-captured artifacts. Labs requiring monitor mode / injection are marked and require compatible hardware."

This copy appears on Labs page, Module detail, and Settings.

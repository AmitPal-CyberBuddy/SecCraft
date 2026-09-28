# WiFiForge VAPT Methodology

> **Understand the Protocol → Enumerate → Test → Validate → Evidence → Impact → Remediate → Retest → Report**

This is the core loop every module reinforces. Not just "run this command".

## Full Engagement Flow

```
Pre-Engagement
    ↓
Scope Definition (authorized SSIDs, BSSIDs, channels, physical area)
    ↓
Reconnaissance
    - What APs? BSSIDs? SSIDs? Channels? Bands? Security? Clients?
    ↓
Enumeration
    - Beacon analysis, probe analysis, client enumeration, vendor ID, hidden SSID
    ↓
Authentication Testing
    - Open? WPA2-PSK? WPA3? Enterprise? WPS? PMF? 802.1X/EAP?
    ↓
Configuration Testing
    - hostapd.conf, RADIUS config, segmentation, guest isolation, management frame protection
    ↓
Attack Validation (lab-only, authorized)
    - Can weakness be exploited? Safest PoC?
    ↓
Network Segmentation
    - Wireless → wired, guest → corporate, IoT → internal
    ↓
Impact Assessment
    - What can attacker do? Credential access? Network access? DoS?
    ↓
Evidence Collection
    - PCAP frame numbers, config snippets, logs, screenshots
    ↓
Reporting
    - Title, Severity, Description, Technical Details, Evidence, Impact, Recommendation, Retest
    ↓
Remediation
    - Apply secure config
    ↓
Retest
    - Repeat test, confirm fix
```

## Per-Finding Structure

```
Title: Weak Wireless Authentication Configuration
Severity: Medium
Description: ...
Technical Details: ...
Affected Component: SSID LAB-WIFI, BSSID AA:BB:CC:DD:EE:FF, Channel 6
Evidence:
  - PCAP: beacon-only.pcapng Frame 1
  - Config: hostapd.conf WPS: ENABLED
  - Log: radius.log EAP failure
Impact: ...
Recommendation: ...
References: ...
Retest Result: ...
```

## Attack → Defense → Retest Example

**Module 02 — Config Audit:**

1. **Attack (Observe):** Identify WPS enabled, PMF disabled, 40MHz in 2.4GHz
2. **Understand:** Why WPS risky (PIN brute), PMF disabled allows deauth
3. **Validate:** Show config snippet, beacon IE analysis
4. **Evidence:** `hostapd.conf` + `beacon.pcapng` frame no
5. **Defense:** Disable WPS, set PMF required, 20MHz only, migrate to WPA3
6. **Retest:** Verify WPS IE absent, PMF required in RSN IE, 20MHz

## Challenge Levels

- **Guided:** Step 1 Run..., Step 2 Observe..., Step 3 Analyze... (for learning)
- **Semi-guided:** Objective + tools, no exact command (for skill building)
- **Assessment:** Only scope + artifacts, you determine methodology (for professional mindset)

Transition: Student → Tester

## Safety

- All labs use `LAB-*` SSIDs, self-generated captures
- No public Wi-Fi targeting
- Hardware labs include warning and require explicit enable in Settings

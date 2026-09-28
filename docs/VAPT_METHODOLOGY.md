# WiFiForge VAPT Methodology

> **Observe → Interpret → Hypothesise → Choose the test → Execute → Evidence → Conclude → Impact → Remediate → Retest → Report**

This is the core loop every module reinforces. Not just "run this command": every test must answer a question you
can state, and every conclusion must be traceable to an artefact.

Companion documents: `docs/WIRELESS_VAPT_CHECKLIST.md` (42-item working checklist), `docs/SIMULATION_VS_HARDWARE.md`
(what each lab tier can and cannot prove), and the engagement pack at `/engagement` (`ENG-01`).

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

## The reasoning loop (use it in every module and every challenge)

| Step | Question you must answer | Where it goes in the report |
| --- | --- | --- |
| 1 Observation | What does the artefact show, exactly? | Evidence |
| 2 Interpretation | What could explain it — including the innocent explanation? | Technical details |
| 3 Hypothesis | Which specific weakness do I believe exists? | Finding title |
| 4 Test choice | Which test falsifies it fastest, and is it authorised? | Method + RoE mapping |
| 5 Execution | Bounded, timed, with a stop condition | Method |
| 6 Evidence | Hash + filter + frames, or config/log excerpt | Evidence appendix |
| 7 Conclusion | What is proved, and what is explicitly **not** | Limits |
| 8 Impact | What does the attacker gain *in this environment*? | Impact |
| 9 Remediation | Which control removes the cause (not the symptom)? | Recommendation |
| 10 Retest | The same test, repeated, compared | Retest result |

## Severity: derived, never assigned

A technique has **no** CVSS score. A finding does — and the score is the *output* of the reasoning, not the
input. Work through:

```
Finding: <claim, scoped to this environment>
Exploitability: from the attacker's position, before the attack (no RF proximity assumptions beyond evidence)
Impact:        what the attacker actually gains — proven, not assumed
Scope:         does the compromise cross a boundary (guest VLAN → corporate, client → wired)?
Environment:   what makes it worse or better here (isolation, NAC, monitoring, data value)
→ Severity:    justified in words first; then, if a number is useful,
               an EXAMPLE vector with every metric justified from the points above.
```

Rules the academy follows (and the `CVSS 3.1` calculator in Reports enforces):

* Quote scores as **example vectors derived from stated assumptions**, never as a property of a technique.
* `AV:A` (adjacent network) is the normal wireless answer for RF-proximity attacks; `AV:P` when a locked
  room must be reached first; `AV:N` only when the path is genuinely remote (e.g. a RADIUS server).
* Severity differences between environments are the interesting part: the same misconfiguration can be Low
  on an isolated POS VLAN and High on the corporate SSID.
* When the environment is unknown, give a range plus the assumptions — never false precision.

## Per-Finding Structure

```
Title: Weak Wireless Authentication Configuration
Severity: High — example vector CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:N (justify each metric)
          (derived from: guest VLAN reachable to server VLAN, demonstrated; PSK shared by all users)
Description: ...
Technical Details: ...
Affected Component: SSID LAB-WIFI, BSSID AA:BB:CC:DD:EE:FF, Channel 6
Evidence:
  - PCAP: beacon-only.pcapng (SHA-256 …), frame 1 — beacon with WPS IE (attributes: version, config methods)
  - Filter: wlan.tag.number == 221 (reproducible)
  - Config: hostapd.conf excerpt — wps_state=2, ap_setup_locked unset
  - Log: radius.log — 4 312 rejects / 1 accept for svc-backup between 09:12 and 09:24
Impact: ...
Limits: what this artefact set does NOT establish (e.g. no PIN attack was attempted; lockout not tested live)
Recommendation: ...
References: ...
Retest Result: FAIL/PASS + the exact test repeated and the observed difference
```

**Evidence ranking** (best first): reproducible capture + hash + filter + frame numbers; configuration or log
excerpt with source and timestamp; tool output with parameters; screenshot (illustrative only — never the
basis of a claim).

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

- All labs use `LAB-*` SSIDs, self-generated captures, and published lab credentials.
- No public Wi-Fi targeting; intrusive techniques (deauth, rogue authenticator, injection) are authorised-only
  and come with a stop condition and a rollback note.
- Hardware labs include a warning and require explicit enable in Settings; regulatory domain is read
  (`iw reg get`) and never spoofed.
- Captures may contain personal data: encrypt at rest, retain per the RoE, delete on schedule.

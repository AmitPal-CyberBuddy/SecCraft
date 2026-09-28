# Wireless Penetration Test — Master Checklist

Generated from `frontend/src/content/reference/checklist.json` (the app renders the same data).
Use it as the working checklist for `ENG-01` and for real engagements; each item names the evidence it needs.

## 1. Scope, authorisation and rules of engagement

| # | Check | Evidence required |
| --- | --- | --- |
| `scope-1` | Named signatory, company, dates and the validity window are recorded. | Signed RoE (reference only; never paste signatures into a report) |
| `scope-2` | In-scope SSIDs/BSSIDs/locations and explicitly out-of-scope targets are enumerated. | Scope table in the report appendix |
| `scope-3` | Authorised and prohibited techniques are listed per target and per time window. | Technique matrix |
| `scope-4` | Data handling: capture storage, encryption, retention and deletion date. | RoE clause + capture inventory |
| `scope-5` | Stop conditions, escalation contact and rollback for intrusive tests are agreed. | Contact sheet; incident notes if triggered |

## 2. Passive reconnaissance

| # | Check | Evidence required |
| --- | --- | --- |
| `recon-1` | AP inventory with BSSID, SSID, channel, band, width, vendor and frame numbers. | tshark field extraction + capture hash |
| `recon-2` | Security policy per BSS: AKM list, ciphers, MFPC/MFPR, WPS state, OWE. | RSNE/WPS IE from beacons |
| `recon-3` | Client inventory: identity (or randomisation flag), probes, association targets. | Probe/association frames |
| `recon-4` | ESS mapping: which BSSIDs share an SSID, and which look like look-alikes. | Inventory grouping + IE fingerprint diff |
| `recon-5` | Explicit limits of the capture (duration, channels, coverage, time reference). | Capture metadata (duration, channel list, clock source) |

## 3. Authentication and key management

| # | Check | Evidence required |
| --- | --- | --- |
| `auth-1` | PSK/WPA2: is a handshake or PMKID obtainable, and is the passphrase auditable offline? | hc22000 file + hashcat output with rate/time |
| `auth-2` | WPA3: is the deployment WPA3-only, transition or mixed? Is SAE enforced? | RSNE AKM list + client association evidence |
| `auth-3` | WPS: state (enabled/disabled, locked, methods) and whether the PIN path is reachable. | WPS IE attributes + any authorised live test result |
| `auth-4` | Legacy/weak configurations (WEP, TKIP, PSK on a WPA3 AP, open BSS) are identified and scoped. | Beacon capability/RSNE evidence |
| `auth-5` | Whether a recovered key/credential grants more than L2 access (reuse, management plane). | Authorised reuse test or the explicit exclusion note |

## 4. Management frames and availability

| # | Check | Evidence required |
| --- | --- | --- |
| `mgmt-1` | PMF state per BSS (capable/required) and per client population (who negotiates it). | RSNE caps + association requests |
| `mgmt-2` | If authorised: whether spoofed deauth/disassoc affects clients, with effect evidence. | Deauth frames + client disconnect log + re-association timeline |
| `mgmt-3` | Reason codes and SA Query behaviour analysed where PMF is present. | Action frames (category 8) + reason codes |
| `mgmt-4` | Availability impact described in business terms and timeboxed. | Impact statement with duration/users |

## 5. Rogue infrastructure and client behaviour

| # | Check | Evidence required |
| --- | --- | --- |
| `rogue-1` | Baseline of authorised BSSIDs/IE fingerprints obtained before testing. | Authorised inventory (from client or previous recon) |
| `rogue-2` | Rogue/twin detection reasoning recorded with the signals that discriminate. | IE/policy/channel diff with frame numbers |
| `rogue-3` | Client behaviour tested where authorised: auto-connect, PNL, certificate validation. | Rogue-authenticator capture or a controlled client test |
| `rogue-4` | Detection coverage: does WIDS/WIPS raise the rogue BSSID, and with what latency? | WIDS alert/log or the documented gap |

## 6. Segmentation, isolation and guest access

| # | Check | Evidence required |
| --- | --- | --- |
| `seg-1` | Client isolation tested explicitly (client-to-client through the AP). | ARP/ICMP capture between two authorised clients |
| `seg-2` | VLAN separation tested (L2 domain boundaries). | Failed/successful ARP for a host on another segment |
| `seg-3` | Inter-VLAN ACL enforcement tested at protocol/port level, not with ping alone. | TCP/UDP reachability results with ports |
| `seg-4` | Guest portal reviewed: transport, token handling, bypass paths, credentials. | HTTP capture + portal configuration |

## 7. Enterprise Wi-Fi (802.1X/EAP/RADIUS)

| # | Check | Evidence required |
| --- | --- | --- |
| `ent-1` | EAP method identified and the inner/outer identity handling reviewed. | EAP frames with types and identities |
| `ent-2` | Client certificate validation tested (ca_cert, domain/subject match). | Rogue-authenticator result + supplicant log |
| `ent-3` | Credential exposure assessed (MS-CHAPv2 exposure, EAP-TLS absence, legacy methods). | Captured material + crack result (lab/authorised) or the control that blocked it |
| `ent-4` | RADIUS integrity reviewed: Message-Authenticator, Response Authenticator, secret strength/scope. | Packet bytes + recomputation with the secret |
| `ent-5` | Dynamic VLAN/ACL assignment verified as actually enforced. | Access-Accept attributes + reachability test |
| `ent-6` | Identity-store controls (lockout, account hygiene, monitoring) reviewed where in scope. | Auth logs + configuration review notes |

## 8. Evidence and integrity

| # | Check | Evidence required |
| --- | --- | --- |
| `ev-1` | Every claim has a capture + hash + filter + frame numbers, or a config/log excerpt. | Evidence appendix |
| `ev-2` | Tools and versions, parameters and time references are recorded per test. | Method section |
| `ev-3` | Limitations and untested areas are stated explicitly. | Coverage/limitations section |
| `ev-4` | Personal data in captures is minimised, stored securely and deleted per the RoE. | Data-handling record |

## 9. Findings, reporting and retest

| # | Check | Evidence required |
| --- | --- | --- |
| `rep-1` | Severity derived from finding context (exploitability, impact, environment), CVSS shown as an example vector. | Severity justification per finding |
| `rep-2` | Remediation is specific, owned and verifiable — not 'enable security'. | Remediation sections |
| `rep-3` | Retest criteria written so a third party can execute them without you. | Retest steps per finding |
| `rep-4` | Executive summary contains no unverifiable claims and no jargon. | Executive summary review |
| `rep-5` | Retest executed against remediated artefacts; result recorded as pass/fail with evidence. | Retest capture hashes + comparison |

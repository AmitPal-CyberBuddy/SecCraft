# Wireless reading guide — use sources to answer a question

Reviewed 2026-10-01. Optional external reading is not required for local completion and is not bundled/offline. External sites can change. Use the deployed tool/vendor documentation for exact versions; do not treat a command collection as authorization or as a lab supplied by SecCraft.

## The two suggested resources

### HackTricks Wi-Fi methodology

https://hacktricks.wiki/en/generic-methodologies-and-resources/pentesting-wifi/

Useful as a broad map organized around discovery, association, keys, authorization and forwarding. SecCraft already teaches the main foundations, capture workflow, WEP limitations, WPA2 handshake/PMKID decisions, WPS, SAE/transition/OWE, PMF/client trust, portals, EAP/certificates, RADIUS and segmentation evidence. The landing page also identifies modern provisioning/discovery/roaming and implementation topics that our core cases do not execute.

Use it to identify questions relevant to an authorized asset—not to run every linked technique. The landing page was reviewed in full; its entire linked site was not audited. A targeted look at the modern-Wi-Fi page also informed the recognition checklist. References are attributed; the lesson explanations and exercises are original, not copied site content.

### Pentest Cheat Sheet — Wireless

https://osodracpt.github.io/Pentest-Cheat-Sheet/wireless.html

A short command reminder for interface setup, capture, password auditing and a look-alike AP/bridge workflow. Most of that conceptual scope already exists here. It is **not recommended as a copy-and-run lesson**:

- One capture example names `airmon-ng` where capture options belong to `airodump-ng`.
- Some deauthentication examples omit an interface or use an indefinite send count; no bounded test plan is supplied.
- Stopping interface-management processes may remove the learner's connectivity.
- A fixed transmit-power value is not a legal or hardware capability check.
- The bridge example uses older tooling and can connect an unintended forwarding domain. An Internet uplink is not a safe default for an isolated test.

The useful takeaway is tool-role recognition and critical command review. We have not imported its attack recipes or treated it as authoritative configuration guidance.

## Coverage and the next reading question

| Topic | Core home | Current practice boundary |
| --- | --- | --- |
| Identity, frames, RF, channel coverage | Modules 01–06 | synthetic captures, inventory and evidence correlation; optional scoped hardware worksheet |
| WEP/WPA/TKIP legacy migration | 07 and 08 | WEP reasoning; no WEP recovery capture or TKIP exploit lab |
| WPA2 keys, EAPOL, PMKID, candidate audit | 08 | packet math and a bounded local candidate exercise; no permission for live joins |
| WPS enrollment/lockout | 10 | advertisements and authored controls; no live PIN test |
| SAE, transition, OWE | 11 | policy/negotiation distinctions; no valid live SAE execution |
| PMF, look-alikes and client selection | 12 | frame interpretation and authored client-policy cases; no RF effect test |
| Portal web sessions versus forwarding | 14 | separate synthetic frames and policy records; no live portal |
| EAP methods, server names, RADIUS and roles | 15 | real local certificate-file checks and synthetic AAA math; no full EAP runtime |
| Segmentation and exact service scope | 18 | two-client stateless model; no real ACL deployment |
| Planning, non-findings, retest and handoff | 20 | public C-20 practice, not a hidden examination |
| k/v/r, MBSSID, 6 GHz and MLO | recognition checklist in 05 | optional version/topology reading; no corresponding packet case |
| DPP, Passpoint/ANQP/OpenRoaming | recognition checklist in 05 | provisioning/provider trust questions; not an implemented lab |
| Mesh/EasyMesh, Wi-Fi Direct and other peer setup | recognition checklist in 05 | scope/backhaul/dual-homing awareness; specialist work deferred |
| KRACK, FragAttacks, SSID Confusion | applicability section in 12 | version/patch and trust-boundary reasoning, no exploit reproduction |
| IPv6, cross-AP isolation and stale roaming roles | scope extension in 18 | explicitly outside WF-BOUND-06 calculation; separate authorization needed |

## Primary references for checking examples

- Aircrack-ng capture usage: https://www.aircrack-ng.org/doku.php?id=airodump-ng
- Wireshark RSNA EAPOL fields: https://www.wireshark.org/docs/dfref/w/wlan_rsna_eapol.html
- Wireshark common EAPOL fields: https://www.wireshark.org/docs/dfref/e/eapol.html
- Wireshark DHCP fields: https://www.wireshark.org/docs/dfref/d/dhcp.html
- wpa_supplicant configuration: https://w1.fi/cgit/hostap/plain/wpa_supplicant/wpa_supplicant.conf
- MS-CHAPv2 definition: https://www.rfc-editor.org/rfc/rfc2759
- OWE definition: https://www.rfc-editor.org/rfc/rfc8110

In current Wireshark, WPA key information, nonce and MIC use `wlan_rsna_eapol.keydes.*`; the common replay counter remains `eapol.keydes.replay_counter`. RADIUS examples here use `-V` to inspect the decoded attribute tree rather than assuming lowercase dictionary field aliases. Check local fields with `tshark -G fields` before adapting an external example. These commands read files only when `-r` supplies the intended capture.

For file-based lessons, bare PCAP filenames assume you downloaded that file and are working in its directory. Paths starting `frontend/` assume the repository root. Run tools locally, not in the browser command simulator. If a tool or compatible field is unavailable, use the supplied browser export and record the method honestly; never invent a successful command run.

## Optional research pointers — not a required exploit sequence

- Modern topology and roaming map: https://hacktricks.wiki/en/generic-methodologies-and-resources/pentesting-wifi/modern-wifi-roaming-6ghz-and-mlo.html
- KRACK research: https://www.krackattacks.com/
- FragAttacks research: https://www.fragattacks.com/
- SSID Confusion paper: https://papers.mathyvanhoef.com/wisec2024.pdf

Before claiming applicability, identify exact vendor, firmware, client build, profile, affected path and advisory status. A paper's affected setup does not establish that your client's deployment is vulnerable. Patch review and a separately approved controlled test answer different questions. No modern-feature or implementation-vulnerability lab is implied by linking these references.

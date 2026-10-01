# WF-FND-01 public self-review rubric

Open after the independent attempt. This key is public practice guidance, not a secured exam or automatic mastery check.

## Evidence anchors

- Baseline frames 1 and 6 concern BSSID `02:00:00:00:10:01`: empty beacon SSID then Aster-Lab in the response. Frame 9 also carries the name. A client probe alone would not identify which AP owns a name; correlate address roles and responses.
- Frames 2 and 12 identify listed AP-B (`…10:02`) advertising Aster-Lab. The **owner inventory**, not name equality, groups AP-A/AP-B in the intended ESS. An administrative inventory does not make transmitted addresses impossible to spoof.
- Frame 3 is an unlisted same-name BSS (`…10:03`). Report “not listed; ownership unconfirmed,” request clarification, and do not authorize an attack yourself. Frame 4 is incidental, different-name infrastructure and should be excluded from active investigation.
- AP-A/AP-C advertise PSK/CCMP with MFPC only (`0x0080`); AP-B advertises MFPR+MFPC (`0x00c0`). Advertisements do not prove the PMF state or user-visible availability of every client.
- Frame 5 is a directed probe from CLIENT-A. Frames 7–8 carry open-system authentication; 9–10 are association request/response with success status. This file has no EAPOL-Key exchange, authorized-port log or application reachability. Do not conclude working WPA access—or assert a real-world failure outside this synthetic file.
- Frame 11 is a wildcard probe using `06:00:00:00:20:02`. Its local bit is set, but physical identity, randomization policy and stored SSID history are unknown. Even the listed synthetic addresses use locally administered space: OUI vendor lookup is inappropriate here.
- Frame 13 contains an unprotected deauthentication with reason 7 and an AP-A source address. It does not authenticate its sender or demonstrate receipt, acceptance or interruption. No client-impact claim passes.
- Radio fields show a fabricated 2437 MHz/-47 dBm observer. There is no noise field; SNR cannot be computed from this case. No width or complete channel survey is supplied. Signal alone cannot place a physical AP.
- Follow-up frames 1–3 show the same three relevant BSSIDs, with AP-A now advertising the name in its beacon. PSK/CCMP and PMF advertisements are unchanged; unlisted AP-C remains. This is a staged visibility comparison, not stronger authentication or a performed mitigation/client retest.

## Rubric (self-review, not an awarded score)

| Dimension | Ready for next phase | Revise before proceeding |
|---|---|---|
| Scope | excludes incidental infrastructure and requests clarification | treats same SSID as permission or proposes unapproved execution |
| Inventory | correlates frame/address/owner sources; marks unknowns | invents vendor, device identity, ESS membership or RF coverage |
| Protocol | separates probing, MAC authentication, association and missing WPA evidence | equates association success with credential acceptance/access |
| Integrity | records hashes, source filenames and numbered frames | cites only screenshots or merges two files' frame numbers |
| Impact | explains what no client logs/key exchange means | claims successful DoS, compromise or failed authentication without evidence |
| Comparison | reports visibility change and unchanged policy | calls a staged capture an executed retest or a visibility change a security fix |
| Next decision | bounded hypothesis, permission, controls, stop/recovery and collection | invents a result or recommends an indiscriminate attack |

Any scope violation or invented-evidence conclusion is a correction gate regardless of other correct answers. Instructor review, if available, should ask the learner to reproduce one claim and defend one decision **not** to test. Marking a lesson complete records participation only; it does not certify passing this rubric.

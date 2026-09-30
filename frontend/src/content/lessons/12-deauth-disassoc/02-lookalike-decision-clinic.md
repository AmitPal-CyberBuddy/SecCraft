# Practice Clinic: PMF, Look-Alike BSS and Client Evidence

> `deauth.pcapng` and `rogue-ap.pcapng` are **separate synthetic exercises**. Do not join their stations or pretend a packet in one caused behavior in the other. No RF delivery, real ownership or user impact is supplied.

## Guided comparison

In `rogue-ap.pcapng`, frames 1–2 advertise the same `Corp-WLAN` name from two BSSIDs with different AKMs and channel/IE profiles. A same-name BSS is a *look-alike observation*, not necessarily an unauthorized device. Frames 3–4 are deauthentication-shaped; frames 5–10 cover the later probe and association to the look-alike. A temporal sequence does not prove the deauth caused that association or that a physical transmitter sent either frame. Check each BSSID against an owner-provided inventory and wired switch record before deciding ownership.

Separately, `deauth.pcapng` has reason-code and SA Query-shaped examples. Use frame source/destination and reason codes to describe **what was recorded**, then ask what the station did. MFPC without MFPR is an AP advertisement of *optional* protection; a specific client needs negotiated-state and log evidence. An unprotected frame in a PCAP is not evidence of receiver acceptance.

## Independent attempt

1. For each fixture, give a hash and frame-numbered observation. State an alternate innocent explanation and one authorized way to distinguish it.
2. Decide which of these claims can be supported: “two same-name BSSs were observed,” “the other BSS was malicious,” “a client was forced offline,” “a simulated client associated to the look-alike.” Explain *why* unsupported claims fail, not just which ones fail.
3. Propose a **passive-first** verification plan on an owned AP with a named test client: owner inventory, AP/controller and client logs, negotiated AKM/PMF, wired correlation, start/stop time. A disruptive test would require separate written authorization and a stop condition; it is not part of this exercise.

## Self-check

Only the observed same-name BSSs and the scripted client association are supported as statements **about this fixture**. Ownership, on-air delivery, causal steering, certificate validation and availability effect remain unknown. If the authorized inventory later confirms the extra BSSID as a managed AP, abandon the rogue hypothesis. If wired correlation confirms an unauthorized transmitter, document that separate evidence; never turn a locally administered MAC or stronger simulated signal into proof by itself.

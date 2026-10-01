# Practice Clinic: PMF, Look-Alike BSS and Client Evidence

> `deauth.pcapng` and `rogue-ap.pcapng` are **separate synthetic exercises**. Do not join their stations or pretend a packet in one caused behavior in the other. No RF delivery, real ownership or user impact is supplied.

## Prepare, then decide independently

Use [Rogue infrastructure analysis](/paths/wireless-pentesting/modules/12-deauth-disassoc?tab=theory&lesson=01-rogue-infrastructure-analysis) for the frame map and [PMF and availability](/paths/wireless-pentesting/modules/12-deauth-disassoc?tab=theory&lesson=01-pmf-and-availability) for protection semantics. This checkpoint combines those skills without repeating their guided decode. Save your decisions before the self-check.

## Independent attempt

1. For each fixture, give a hash and frame-numbered observation. State an alternate innocent explanation and one authorized way to distinguish it.
2. Decide which of these claims can be supported: “two same-name BSSs were observed,” “the other BSS was malicious,” “a client was forced offline,” “a simulated client associated to the look-alike.” Explain *why* unsupported claims fail, not just which ones fail.
3. Propose a **passive-first** verification plan on an owned AP with a named test client: owner inventory, AP/controller and client logs, negotiated AKM/PMF, wired correlation, start/stop time. A disruptive test would require separate written authorization and a stop condition; it is not part of this exercise.

## Self-check

Only the observed same-name BSSs and the scripted client association are supported as statements **about this fixture**. Ownership, on-air delivery, causal steering, certificate validation and availability effect remain unknown. If the authorized inventory later confirms the extra BSSID as a managed AP, abandon the rogue hypothesis. If wired correlation confirms an unauthorized transmitter, document that separate evidence; never turn a locally administered MAC or stronger simulated signal into proof by itself.

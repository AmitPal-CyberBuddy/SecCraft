# Fictional authorization — WF-FND-01

Case owner: Aster training coordinator. Case revision 1.0. This document only authorizes analysis of the supplied fictional artifacts; it grants no permission over any real wireless network.

## Allowed

- Read, hash and filter the supplied files locally.
- Compare observed BSSIDs with the supplied owner inventory.
- Record station-address observations only where needed for the case.
- Write a proposed next test, clearly labelled NOT PERFORMED.
- Compare the supplied follow-up fixture without describing it as your executed retest.

## Targets and exclusions

The owner's inventory lists two managed BSSIDs in one intended ESS, and one permitted training station address. Inventory is an administrative claim dated for this fictional case, not cryptographic authentication of transmitted frames. Spoofing remains possible.

An unlisted BSSID advertising the same SSID is **not automatically an authorized target or proven rogue**. Ask the owner to confirm its status. A different-SSID BSS is incidental/out of scope; record only that it was excluded. Do not build a device profile or attempt to join it.

No live collection, active probing, association, injection, deauthentication, password testing, rogue AP deployment, credential collection or internal enumeration is authorized in this exercise. Do not turn the fictional window/timestamps into real authorization.

## Stop, retain and request

Stop if a task requires absent logs, keys, identity confirmation or real transmission. State the missing evidence and the specific permission needed. Keep original files read-only, record their hashes and separate derived notes. Do not upload unrelated or real-client captures. Your inventory should have a separate excluded-observation note rather than treating incidental infrastructure as a finding.

The proposed test request must name the target, hypothesis, permission, baseline, control, expected observation, stop/rollback condition and evidence handling. Approval is a prerequisite, not an outcome you may invent.

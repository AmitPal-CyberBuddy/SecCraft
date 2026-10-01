# WF-TRUST-04 independent worksheet

Record method, source hashes, frame/record IDs and scope. Supplied model review is not execution. Keep the three packet scenes separate from each other and from all hypothetical sidecars.

## 1. Management-frame evidence
Select an unprotected directed deauth, disassociation and SA Query-shaped observation from deauth.pcapng. Record frame, addresses, reason/category and protection flag. What does each fail to prove? Distinguish observed transmitter/source addresses from authenticated identity. Compare the MFPC-only and MFPC+MFPR advertisements without inferring a particular client's negotiation.

For M0/M1/M2: observation | supported model-level statement | alternative explanation | missing evidence | next authorized step. Is secure rejection a successful control outcome? Can M2's timing isolate the cause? Distinguish pairwise protection for unicast robust management from group BIP integrity and explain why a set bit proves neither.

## 2. Infrastructure and client trust
Use rogue-ap frames 1–2 and owner records O1/O2. Build a scoped inventory with observed AKM/channel, owner assertion and authenticity limits. Explain why “different” and “not in an initial scan” are not equivalent to unauthorized or malicious. Does the filename determine a finding?

For C1–C4, predict only conditional protocol/profile applicability, not actual device behavior. Which information is missing before claiming autojoin, credential capture, a forced move or access? Write a version-specific, bounded controlled-client test plan with positive and secure negative controls. No live actions are required or authorized by this worksheet.

## 3. Portal and guest boundaries
Reconstruct portal frames 10–13 and ARP frames 14–17. For each ARP hop map ToDS/FromDS, receiver, transmitter, BSSID, end-to-end source and destination. Explain why an HTTP cookie is not proof of server-side authorization and why ARP is not application reachability.

Compare every portal policy rule with its model record. Classify as consistent, contradicts policy, or inconclusive; identify which control is implicated and why. Keep an unavailable response distinct from an enforced denial. The matrix is a model, not a real vulnerability report.

## 4. Handoff and retest proposal
Write: one supported observation, one contradicted model policy, one justified no-finding/insufficient-evidence branch, and one rejected overclaim. Include endpoint/clock/ownership limits. Propose bounded remediation/retest with a baseline, secure negative control, positive service-health control, stop rule and restoration plan. Mark RF delivery, client effects, credential capture, real session enforcement and reachability NOT TESTED.

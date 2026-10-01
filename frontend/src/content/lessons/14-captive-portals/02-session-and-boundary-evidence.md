# A Portal Page Is Not an Access-Control Result

> **Available now: offline capture and fictional policy-model review.** No portal server or live account is supplied. Hosted execution is unavailable. Session enforcement, network reachability and client impact remain **NOT TESTED**.

## Keep four questions separate

Use the [WF-TRUST-04 ZIP](/wireless-practice/WF-TRUST-04.zip), [scope](/wireless-practice/WF-TRUST-04/scope.md), [portal capture](/wireless-practice/WF-TRUST-04/captive-portal.pcapng) and [decoded view](/wireless-practice/WF-TRUST-04/captive-portal.json). Do not open URLs or contact addresses merely because they appear in the historical packet bytes. They are not authorized live targets.

| Boundary | Question | Insufficient evidence by itself |
| --- | --- | --- |
| Transport confidentiality | Were application bytes protected on the observed path? | a portal login page or open/OWE label alone |
| Session authorization | Is this subject allowed to use this session for this service now? | a cookie, URL MAC parameter or HTTP 200 |
| Guest-to-guest isolation | Is traffic forwarded between the controlled guests? | no response from an endpoint whose health is unknown |
| Routed service policy | Can this guest reach the particular approved internal service? | IP subnet shape, ARP or a successful unrelated ping |

HTTPS protects an application connection; it does not create client isolation or a guest firewall policy. OWE adds unauthenticated link encryption, not portal identity or session authorization. A VLAN ID/assignment requires administrative or tagged-path evidence; addressing alone is not enough.

## Reconstruct the actual packet records

Frames 10–13 encode a connectivity-check request, redirect, cleartext POST with lab-only values and a response cookie. This exposes bytes in the fixture, not a functioning login service or proven token hijack. Do not infer the server's session key or authorization logic from a MAC in the URL.

For frames 14–17, map each hop. In three-address data:

- **ToDS only:** receiver/BSSID is address 1, transmitter/source is address 2, final destination is address 3.
- **FromDS only:** receiver/destination is address 1, transmitter/BSSID is address 2, original source is address 3.

A forwarded frame need not have the AP as its original source. The corrected fixture keeps the guest AP's BSSID across all four hops and uses a unicast test peer. The ARP exchange encodes L2 forwarding; it does not establish an application response, VLAN assignment or access to corporate services.

If using local Wireshark, inspect both the 802.11 address roles and ARP payload rather than filtering every hop on one source field. JSON supplies the corrected `bssid`, `sa` and `da` alongside raw address fields. Record the method and capture hash; older copies may differ.

## Evaluate a separate policy model

Read the [desired policy](/wireless-practice/WF-TRUST-04/portal-policy.json) and [authored observations](/wireless-practice/WF-TRUST-04/portal-observations.json). These are separate fictional records, not server logs recovered from the capture. Service aliases are planning labels, not endpoints you can contact.

Classify each rule as **consistent with policy**, **contradicts policy**, or **inconclusive**. Keep a supporting record ID and an alternative explanation.

- R1–R4 distinguish the login page, unauthenticated requests, valid sessions and expired sessions.
- R5 asks whether a copied A-session is accepted for B despite the stated policy. Does a contradiction establish the specific implementation cause, such as MAC spoofing?
- R6 has no response but no target-health or route evidence. Is that enough to credit the firewall?
- R7 records modeled peer ARP forwarding. Which layer does it test, and what application claim remains unsupported?

Write your decisions before opening the [public review guide](/wireless-practice/WF-TRUST-04/review-guide.md). A model policy mismatch is not a production vulnerability finding.

## Retest with health and denial controls

Propose an isolated future validation using synthetic accounts and explicitly owner-approved source/target/service pairs. Establish endpoint health and permitted access first. Then compare no session, valid session, expired session and subject-mismatched session using gateway/server decision logs and client responses. Check peer forwarding separately from routed service access, and both directions where policy requires it. Do not scan arbitrary addresses or use real user tokens.

Define request/time limits, stop conditions, cleanup of test sessions/profiles and configuration restoration. Preserve ordinary guest login as a positive control while verifying intended denials. In the [worksheet](/wireless-practice/WF-TRUST-04/worksheet.md), label this a **proposal**, not an executed retest. Completion records local participation; real boundary enforcement still needs a supported environment and independent review.

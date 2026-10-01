# From Permission to a Testable Assessment Decision

**Mode: offline evidence practice.** No radio or account is needed. By the end, you should be able to accept, narrow or defer a proposed action—and explain why—before selecting a wireless tool.

## Start with a question, not an attack

“Assess the office Wi-Fi” is not a test plan. It leaves ownership, clients, location, time, methods and data handling undefined. A useful question is: **does the authorized training client refuse a server certificate that its approved profile should reject?** It identifies a control and an observable outcome. Testing it still requires permission, a baseline, a controlled environment and client-side evidence.

Use this decision loop:

```text
Scope → identify → observe → hypothesize → request/perform an allowed test
      → validate → document → propose a fix → retest within authorization
```

You may stop at “request.” Missing permission or evidence is not a reason to invent a result.

## Worked decision: the second AP name

An owner lists BSSIDs A and B. Your supplied capture contains A, B and C advertising the same SSID.

1. **Observation:** A/B/C advertise the same name. Cite the individual frames.
2. **Administrative evidence:** the owner's inventory lists only A and B. Cite the inventory revision.
3. **Hypothesis:** C may be an unrecorded legitimate AP, an unrelated same-name deployment or unauthorized infrastructure. The name does not choose between them.
4. **Decision:** ask the owner to attribute C. Do not infer permission to join, disrupt or deploy a competing AP.
5. **Conclusion now:** “Additional same-name BSSID observed; ownership unconfirmed.” This is an investigation item, not a proven credential-theft finding.

Even an inventory match does not cryptographically authenticate a transmitted source address. Keep administrative ownership and observed frame identity as separate evidence columns.

## Passive does not mean unrestricted

Passive observation can still collect identifiers or sensitive communications. Authorization and minimization apply to collection as well as active transmission. A stored teaching file is different: this exercise permits local file analysis, not capturing nearby networks.

Active discovery, association, credential testing, injection and availability testing have different risks. Obtain explicit permitted targets/methods, time windows, authorized clients, contact/stop rules and recovery procedures. Local radio rules and privacy requirements must be reviewed for the actual jurisdiction; a command or fictional ROE is not legal authorization.

## Your scope exercise

[Download the complete WF-FND-01 case pack (ZIP)](/wireless-foundations/WF-FND-01.zip). Individual file links also download; extract the ZIP to keep all case files together.

Start the original [WF-FND-01 case brief](/wireless-foundations/WF-FND-01/README.md). Read the [fictional scope](/wireless-foundations/WF-FND-01/scope.md) and [owner inventory](/wireless-foundations/WF-FND-01/authorized-inventory.csv). Save the [worksheet](/wireless-foundations/WF-FND-01/worksheet.md). Module 02 prepares the inventory; Module 03 completes the independent analysis.

Classify these actions as **allowed now**, **needs a new permission/evidence request**, or **excluded**:

- Hash and filter the supplied baseline file.
- Join an unlisted AP because its SSID matches the owner’s.
- Profile the incidental different-name station/network.
- Ask for client/AP logs to determine whether an association reached a usable authenticated state.
- Report a successful disruption because a deauthentication frame exists.
- Compare the supplied follow-up file without calling it your executed retest.

For each, record the scope clause and your reason. A request for evidence is not evidence that the event occurred.

## Write one next-test request

Use this template with a single bounded hypothesis:

```text
Target and ownership reference:
Question / competing explanation:
Evidence already supplied (file, SHA-256, frame or config line):
Missing evidence and permission:
Proposed baseline and negative control:
Expected observation if the hypothesis is supported / not supported:
Stop condition, owner contact and recovery:
Data minimization, storage and deletion:
Current result: NOT PERFORMED
```

A negative control helps you distinguish the claimed cause from an unrelated failure. For example, a trusted certificate must first work before rejecting an untrusted certificate is meaningful. Do not fill the result field with what you expect to happen.

## Self-check and progression

Hashing/filtering and staged comparison are permitted. Unlisted infrastructure requires clarification, not opportunistic association. Incidental infrastructure is excluded. Requesting the missing logs is appropriate; asserting disruption from one frame is not.

Before proceeding, be able to state one supported claim, one plausible alternative and one action you deliberately declined. Completion records local participation; it is not independent approval of your scope judgment.

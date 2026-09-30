# Methodology, Scope and Rules of Engagement

> Use this as the scope-and-safety preparation for the independent C-20 capture case. ENG-01 is an optional scenario brief, not required to finish the technical path.

## 1. From scope document to test plan

A scope document says what is in bounds; a test plan says what you will *do*. Convert one to the other:

| Scope statement | Test plan implication |
| --- | --- |
| "SSIDs `Corp-WLAN`, `Corp-Guest`, `Corp-IoT` on site X" | enumerate only these ESSs; other SSIDs in range are out of scope and must be listed in the exclusions |
| "No disruption of production during business hours" | no deauth/dissociation tests, no rogue infrastructure, no channel interference 08:00–18:00 |
| "Physical: lobbies and meeting rooms only" | no RF testing in restricted areas; document the coverage actually tested |
| "RADIUS server in scope for configuration review only" | no live authentication attempts against production identity stores beyond the test accounts |
| "Credentials provided for the IoT segment" | any controlled result on the IoT VLAN does not extend to corporate |

The plan must state: objectives, in-scope artefacts, out-of-scope artefacts, test windows, authorised
techniques, prohibited techniques, escalation contacts, and stop conditions.

## 2. Rules of Engagement — the clauses that save you

* **Authorisation**: named signatory, company, date, scope, and validity window.
* **Techniques matrix**: what is permitted (passive capture, offline audit, rogue authenticator, deauth)
  and what is not, per SSID and per time window.
* **Safety**: no interference with neighbouring organisations, maximum power/EIRP rules, no use of
  unauthorised regulatory domains, rollback plan for each intrusive test.
* **Data handling**: captures may contain personal data — storage, encryption, retention, deletion date,
  and who may access them.
* **Evidence standard**: what will be delivered (captures + hashes, filters, config excerpts, logs),
  and that raw captures stay with the client.
* **Escalation**: named incident contact and stop rules for unexpected disruption or out-of-scope observations.

## 3. Sequencing that matches evidence

```
1  Kickoff + scope validation + RoE signature
2  Passive recon (no transmission) → inventory
3  Enumeration of policy (SIMULATION where artefacts exist)
4  Non-intrusive checks: RSNE analysis, EAP method identification, portal review
5  Intrusive checks (authorised windows): deauth, rogue AP, credential capture — each with a stop condition
6  Offline audits: handshake/PMKID/MS-CHAPv2 material
7  Post-exploitation reachability tests (segmentation/isolation)
8  Compare observations with scope and alternate explanations
9  Decide what evidence is missing before the next authorized test
```

Passive first is not politeness, it is efficiency: it makes intrusive tests targeted and their impact
foreseeable.

## 4. Apply the sequence to C-20

The case pack authorizes offline analysis only. Which steps above can you actually execute?
Classify the owned BSSID's advertised policy in each file, compare the training handshake
and reconcile the partial inventory. Do not run any intrusive step, call the unlisted BSSID
malicious, or declare a client-policy fix. List the client/AP and wired evidence that a
separate authorized test would need. This is a technical investigation decision, not a
formal report-writing exercise.

## 5. Decision practice

The scoping scenarios ask you to spot a gap in authorization (`scn-01-scope-gap` is the beginner
version) and to decide whether a requested test is even possible under the RoE.

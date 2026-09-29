# Final Engagement (Professional Assessment)

> **Scenario brief `ENG-01` — Northwind Retail.** This is a self-directed capstone prompt, not a graded assessment. The repository does not bundle the Northwind topology, per-SSID captures, RADIUS logs, configuration excerpts, portal rules, or remediated retest artifacts named below. Learners can practice scoping and report structure, but cannot complete or independently verify the scenario from this brief alone. The separate `methodology.pcapng` is a synthetic 29-frame fixture and is not Northwind evidence.

## 1. Client brief

Northwind Retail operates 12 stores and a small data-centre. The engagement covers the *Flagship Store*
(`NW-Flagship`): retail floor, back office and a guest area. Store operations (POS) run on a separate
wired segment; the wireless estate is managed centrally.

**Objectives (as buyers state them, not as a test plan):**

1. Assess the security of the wireless infrastructure in scope.
2. Determine whether an unauthorised party within range can obtain network access.
3. Assess the separation between guest, retail and corporate/operations traffic.
4. Produce a report we can hand to our remediation supplier, including evidence and retest criteria.

## 2. Rules of engagement (extract)

* In scope: the four SSIDs listed in §3, RF testing within the store footprint during the agreed window,
  one RADIUS server configuration review (read-only), provided test accounts.
* Out of scope: other stores, the corporate data centre network, physical attacks on POS hardware,
  denial-of-service against production during trading hours, interference with neighbours.
* Permitted: passive capture, offline audits, rogue authenticator (guest/hostile-AP demonstration),
  targeted deauth on the two test clients provided.
* Prohibited: capturing real customer traffic beyond metadata, using real customer credentials,
  modifying any production configuration.
* Data handling: captures encrypted at rest; deleted 30 days after report acceptance.
* Emergency contact and stop conditions are in the RoE annex.

## 3. Target information

| SSID | Band | Security (as documented) | Purpose |
| --- | --- | --- | --- |
| `NW-Corp` | 5 GHz | WPA2/WPA3-Enterprise (PEAP) | staff laptops |
| `NW-Guest` | 2.4/5 GHz | captive portal, open | customers |
| `NW-Ops` | 2.4 GHz | WPA2-PSK | handheld scanners |
| `NW-Legacy` | 2.4 GHz | WEP (documented as "deprecated") | legacy printers |

Scenario-only artifact list (not present in this repository): topology diagram, AP inventory (BSSID/site/channel plan), per-SSID captures, RADIUS logs, hostapd/wpa_supplicant excerpts, guest-portal redirect rules, test accounts and remediated retest artifacts. Do not fabricate their contents or present findings without them.

## 4. What you deliver

1. **Reconnaissance and attack surface**: inventory with evidence, including what each SSID exposes
   before authentication.
2. **Test plan** derived from §1–§3, with the RoE clauses that authorise each intrusive test.
3. **Findings**: claim, evidence, method, interpretation, impact, severity (with justification and, where
   you quote a score, the vector and metrics), remediation, retest criteria.
4. **Evidence appendix**: capture hashes, filters, frame numbers, config excerpts, log lines, and a
   reproduction step list per finding.
5. **Retest results**: executed against the remediated artefacts supplied at the end of the assessment.
6. **Executive summary**: risk narrative for the store manager — no jargon, no unverifiable claims.

## 5. Marking guide (what "professional" means here)

| Criterion | Weight | Looks like |
| --- | --- | --- |
| Scope discipline | 10% | only in-scope targets tested; prohibited techniques avoided and documented |
| Recon quality | 15% | complete inventory, frame-numbered, with limits stated |
| Technical accuracy | 20% | correct frame/IE/protocol reasoning, correct tools, correct hashcat mode |
| Evidence standard | 20% | every claim traceable; hashes and filters present; screenshots not load-bearing |
| Impact reasoning | 15% | severity derived from this environment, not from a technique list |
| Remediation + retest | 10% | controls with owners/verification; retest that actually re-runs the test |
| Reporting | 10% | structure, prioritisation, executive summary a store manager can act on |

## 6. How to work

* The scenario brief describes expected weaknesses and a possible **red herring**, but the referenced artefacts are not bundled. Treat these as scenario prompts, not verified findings; do not assert which are reachable without the missing evidence.
* Expect to say "no finding" where a control holds — and to justify it with the artefact that shows it.
* Timebox: spend no more than 40% of your time on any single SSID.
* If a test is not authorised or not safe, write *why* you did not perform it, and what you did instead.

## 7. Decision practice

**`scn-20-triage`** — given the first five minutes of capture, what do you investigate first and why?
**`scn-20-no-finding`** — one SSID yields no exploitable weakness. Write the section that proves it.

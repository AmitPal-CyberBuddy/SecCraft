# Wireless Assessment Curriculum Redesign

Date: 2026-10-01. Scope: SecCraft's Wireless path, not a rebranding of the multi-path platform.

## Decision and release model

Adopt the seven competency phases and approximately twenty eventual modules. Do not treat module/lesson count, XP, certificates, or a successful attack as evidence of competence. Reuse existing teaching where it supports the outcome; separate a topic into a module only when it has a distinct practice contract.

Delivery is incremental. Reorganize the **existing fifteen** modules into seven phases now; add new modules only with working teaching and practice. The proposed twenty-module map below is a roadmap, not twenty available modules. Phase 1 is the first implementation slice. Phases 2–7 remain planned until their gates are met.

Baseline reviewed: 15 Wireless modules / 32 lessons; 18 catalogue captures; 19 available Wireless lab entries (three local answer-checked), 22 self-review challenges, 35 decision scenarios; independent C-20 capture exercise; Northwind planning brief. See `WIRELESS_REDESIGN_AUDIT.md` for limitations and defects.

## Design principles

1. Outcome → evidence → assessment rubric → environment → teaching, in that order.
2. Mechanism, recognition, scoped execution (where supported), observation, validation, evidence, remediation and retest for each major attack family.
3. Preserve novice scaffolding: worked example → guided practice → independent case → review and correction. Avoid splitting every glossary topic into a lesson.
4. Negative results, secure configurations, insufficient evidence and stopping for scope are valid successful decisions.
5. Distinguish a supplied observation, learner-performed operation and independently reviewed outcome.
6. Evidence practice, isolated executable labs and physical RF validation are different modes, not access/subscription tiers. Preview/Full and account approval do not grant skill certification.
7. No fake processing, staged progress, automated verified XP or credential claim. The browser terminal is not a real RF environment.
8. Protocol interpretation and field outcomes require versioned tooling, provenance, controls and explicit limits. No technique-only severity scores.

## Target curriculum and migration map

Sequence numbers are presentation. Internal IDs remain stable. **Never reactivate retired IDs** `09-wpa2-practical`, `13-rogue-ap`, `16-eap`, `17-radius`, `19-methodology`; they already redirect and migrate historical records.

| Future sequence | Competency module | Source / future ID strategy | Required exit product |
|---|---|---|---|
| 01 | Wireless Security Foundations | retain `01-intro-wireless` | scope/ROE decision sheet and testable hypothesis |
| 02 | Wi-Fi Identity, Topology & RF | retain `02-wifi-fundamentals` | cited AP/station inventory with RF/privacy limits |
| 03 | Frames, IEs & Association | retain `03-80211-architecture` | independent state reconstruction, not assumed access |
| 04 | Testing Environment | retain `04-kali-wireless-setup` | capability/troubleshooting record and safe reset |
| 05 | Reconnaissance | retain `05-wireless-recon` | wireless attack-surface matrix |
| 06 | Analysis & Evidence | retain `06-traffic-analysis` | reproducible extraction and correlated timeline |
| 07 | WEP & Legacy | retain `07-wep-legacy`; short unit | demonstrated legacy mechanism and migration decision |
| 08 | WPA/WPA2-Personal | retain `08-wpa-wpa2` | key/handshake reasoning and bounded access claim |
| 09 | Password Auditing | new `wireless-password-auditing` after practical gate | justified candidate strategy, resource budget and impact limits |
| 10 | WPS | retain `10-wps` | configuration versus measured exploitability decision |
| 11 | WPA3 & Modern Security | retain `11-wpa3` | negotiated-policy/client compatibility comparison |
| 12 | Management Frames & PMF | retain `12-deauth-disassoc` | measured client effect with negative control, or explicit NOT TESTED |
| 13 | Rogue AP / Client Trust | new `wireless-rogue-client-trust` | ownership/trust hypotheses, controlled association evidence |
| 14 | Client Probing: Karma/MANA | initially advanced unit; new `wireless-client-probing` only if justified | versioned modern-client applicability matrix, including failures |
| 15 | Captive Portals | retain `14-captive-portals` | intended authorization boundary versus observed access |
| 16 | Enterprise / 802.1X | retain `15-enterprise-fundamentals` | supplicant/AP/AAA trust map and method selection |
| 17 | RADIUS & Applied Policy | new `wireless-radius-policy` | linked authentication, returned attributes and enforced policy |
| 18 | Enterprise Rogue Assessment | new `wireless-enterprise-assessment` | client trust decision → exposure → bounded impact → retest |
| 19 | Post-association Boundaries | retain `18-corporate-attacks`, refocus rather than rename ID | guest/internal/management reachability matrix and control evidence |
| 20 | Professional Engagement | retain `20-final-assessment` | independently reviewed report and executed retest where supported |

This produces twenty only if the advanced client-probing unit earns a standalone module. No quota-driven filler. Reuse existing lesson IDs within retained modules; moving lessons later needs an explicit alias/migration contract before publication. Do not simultaneously duplicate the same activity under two parents for XP.

## Phase-wise delivery and gates

### Phase 0 — Repository audit and design contract (this release)
- Review catalogue, lesson objectives/coverage, practice inventories, artifact generation/verification, routes, access, local/account progress, grading and available execution infrastructure.
- Record gaps and preservation contracts. Pin the seven-phase map and publish the scenario contract.
- Gate: all shipped modules mapped; no planned module masquerades as available; current references and progress verifiers pass.

### Phase 1 — Foundations and assessment decisions (first implementation)
Modules 01–03. Keep the networking/tool primer and existing stable lesson/quiz IDs.
- Add scoped decision-making, RF/client observation limits, guided reasoning and one integrated independent foundations case.
- Case WF-FND-01: actual deterministic PCAPNG files plus owner inventory, ROE, observer metadata, learner worksheet and public self-review rubric. Include legitimate multi-BSSID infrastructure, a not-yet-attributed look-alike, a hidden SSID, directed/wildcard probes, partial association evidence and a management-frame observation without measured impact.
- Provide read-only decode exports for learners without packet tools; label them as derived views, not a substitute for operating Wireshark.
- Gate: generator/checksum/independent semantic tests; links work under `/` and `/SecCraft/`; learner can produce scope decisions, inventory, timeline, unsupported claims and a next-test request. Self-review does not become trusted grading.
- Account/history gate: old completions stay, new lessons remain incomplete; existing quizzes are unchanged. Explain any reduction in current completion percentage.

### Phase 2 — Become a Wireless Tester
Modules 04–06. **Before new capture-dependent teaching**, repair and regression-test the historical PCAPNG timestamp encoding, RSN group-cipher decode offset and Extended Supported Rates helper; regenerate affected artifacts, manifests and references as one reviewed change (see audit).
- Reproducible capture/tool installation instructions, expected capability transcripts and deliberately broken offline troubleshooting cases; optional owned-device checks with explicit stop/reset procedure.
- Scenario 01 hidden-network reconnaissance; multi-source inventory; capture vantage/channel coverage; integrity, filters, packet loss and timeline correlation.
- Gate: novice pilot can diagnose unsupported capability versus permission/channel/tool error. External decoder agrees with fixtures. No inference from absent frames without coverage evidence.
- Parallel infrastructure spike: evaluate a local software-radio/AP/supplicant worker, not a hosted production service. A successful spike requires version-pinned client/AP auth logs, network isolation, teardown and a secure negative control.

### Phase 3 — Authentication and Password Audit Decisions
Modules 07–11; preserve a short legacy WEP unit.
- Distinct guided/independent artifact sets and constrained candidate-audit strategy; no GPU requirement for the core lesson.
- Scenarios 02 weak PSK, 03 WPS state, and modern-policy comparisons. Offline success is not proof of association or internal reachability.
- Gate: cryptographic known-answer checks, artifact/tool interoperability, secure/uncracked cases, WPS lockout/time budgets and explicit SAE/transition/implementation distinctions. Actual WPS exploitation requires a supported executable environment; otherwise remain evidence practice.

### Phase 4 — Client Trust, Management Frames and Guest Portals
Modules 12–15. Client-probing material starts as an advanced unit.
- Scenarios 04 PMF, 05 infrastructure attribution, 06 controlled twin and 07 portal boundary.
- Personal/open-client trust first; do not require advanced Enterprise mechanisms before phase 5. Treat Karma/MANA applicability as empirical and version-dependent.
- Gate: controlled supplicant outcomes, baseline/negative control, relevant client/AP logs and measured user-visible effect. A deauth frame or SSID clone alone never passes an impact criterion. Portal session/ACL tests use synthetic credentials and allowlisted services only.

### Phase 5 — Enterprise Trust and Applied Policy
Modules 16–18. Split roles/methods, RADIUS/policy, and integrated assessment rather than repeating certificate theory.
- Scenario 08: full coherent AP/client/AAA session, trusted/untrusted server certificates, expected-name validation, password-method and client-certificate variants.
- Gate: client rejection is a valid successful defensive outcome; no private-key/password claim from mere EAP observation; Access-Accept attributes correlated with actual forwarding policy. EAP-PWD is an EAP method, not synonymous with WPA3-Enterprise.
- First complete execution vertical slice: authorized client trust → observation → actual configuration hardening → repeated test. This is the technical feasibility milestone, not a promise that cloud radio fidelity equals physical RF.

### Phase 6 — Post-association Boundaries
Module 19; Scenario 09 guest-to-internal.
- A guest, corporate and management policy model with specific allowed and prohibited service paths, two test clients and corresponding policy logs.
- Gate: baseline and post-change application-level reachability, route/ACL correlation, negative controls and reset. Do not infer VLAN IDs from client addressing alone; no arbitrary internal scanning or AD curriculum expansion.
- Second execution vertical slice. Together with the Enterprise slice, this validates the future lab platform before wide scenario expansion.

### Phase 7 — Independent Engagement and Professional Review
Module 20; Scenario 10, assembled only after earlier environment gates.
- Unseen practice variants with secure assets, justified no-finding branches, incomplete information, bounded time and scope exclusions.
- Required delivery: plan, prioritized inventory, decision log, reproducible evidence, supported findings/non-findings, remediation, retest and concise client communication.
- Gate: independent human/authoritative review rubric, variant equivalence pilot, replay/retry rules, artifact retention/privacy policy and validated scoring trust boundary. A public static answer pack cannot serve as a secure certification exam.
- C-20 stays an evidence practicum and Northwind stays planning-only until their actual environment/evidence contracts are supplied. No retroactive relabeling.

## Scenario specification (required before authoring each new lab)

ID/version; competency IDs and prerequisites; mode (evidence / executable / physical RF); topology and ground truth; learner-visible assets; scope and stop conditions; initial/reset state; secure and insecure branches; observable outcomes; collection points, clocks and provenance; allowed test actions; expected positive and negative controls; learner deliverables; rubric; remediation variant; retest method; known limits; resource/cost budget; cleanup; supported client/tool versions; verifier and reviewer sign-off.

Scenarios 01–10 map to phases above. WF-FND-01 is a preparatory evidence case, **not** an eleventh executed attack or a replacement for a full rogue/Enterprise lab. Each scenario must support the answer “insufficient evidence” where appropriate, not reward selecting the intended attack.

## Lab architecture and feasibility decisions

A. **Evidence lane — deliverable now:** static, offline-friendly original artifacts, manifests, decoder tests, worksheets and self-review. Hashes establish integrity, not authenticity of a real engagement.

B. **Executable lane — feasibility required:** isolated Linux lab worker using version-pinned AP/supplicant/authentication/portal/network-policy components. Software radio (e.g. mac80211_hwsim) may need kernel support/privileges unavailable in generic containers. Separate this worker from the production API, credentials, owner console and shared user data. Default-deny egress, scoped network namespaces, per-session credentials, CPU/memory/duration limits, quotas, reset/teardown tests and restricted telemetry access. The web UI requests an allowlisted lab lifecycle; it does not receive host/root access. No provisioning/spending in Phase 1.

C. **Physical RF lane — requires equipment and authorization:** owned AP/client/adapter compatibility matrix, local regulatory review, controlled RF exposure, permitted channels, impact stop conditions and recovery verification. Optional evidence work must remain usable without it, but does not confer physical competence.

Before hosted release decide with the owner: supported host/kernel, deployment isolation and security review, cost envelope/concurrency, equipment/client fleet, reviewer availability, retention/deletion and safeguarding. Do not invent a fixed schedule or “zero-cost cloud” claim before the two execution pilots.

## Assessment and record model

Keep practice completion, machine answer checks and independently reviewed performance separate. Future competency records need case/content version, mode, evidence references, reviewer/verifier identity, review status and limitations; browser-supplied scores are not authoritative. An execution event is not a pass. Existing account approval/Preview/Full is orthogonal to this model.

Rubric dimensions: scope; protocol/mechanism; test choice; execution where performed; artifact integrity; claim/evidence correlation; impact and uncertainty; remediation/retest; communication. Critical scope or invented-evidence failures require correction regardless of the numeric total. Phase 1 publishes a self-review rubric with no verified XP.

## Compatibility, release and rollback

- Preserve all current module/lesson/lab/challenge IDs and all legacy redirects in Phase 1. Seven phases change grouping, not identifiers or ownership.
- Keep phases 1–2 as the same six Wireless Preview modules. Leave Android unchanged.
- New lessons have new IDs; no store reset, invented imported credit or silent quiz replacement. Existing local records remain; percentages may decrease because new activities enter the denominator. Historical server rows are not rewritten.
- Later splits must ship a reviewed mapping and migration tests. Never turn old five-question quiz completion into a pass on a new assessment.
- Build/test data and artifacts before public metadata changes. Show only supplied activities. If a release fails, revert its catalogue additions and preserve learner records as historical data; do not delete .git or reset unrelated work.
- Phase completion means shipped content plus its stated tests, not independent field validation. Pilot teaching quality separately from syntactic correctness.

## Verification and sign-off checklist

Per release: source/lesson mapping, prerequisites/order, phase coverage, counts, artifacts and hashes, external decoding where possible, stale answer references, old/new progress migration, access matrix, root/subpath routing/downloads, build/unit tests, keyboard/mobile reading, reduced motion, offline behavior and no new external calls. Live lab releases add isolation/escape, cleanup, failure recovery, privacy and concurrency tests.

Roles: curriculum author maps outcomes; protocol reviewer verifies semantics; lab engineer validates actual environments; independent instructor pilots/scoring; owner approves infrastructure and publication. Repository checks cannot impersonate those human approvals.

## Status

- Phase 0: audit and plan written.
- Phase 1: evidence-mode implementation and automated verification completed; pilot/instructor review remains pending. See `WIRELESS_REDESIGN_PHASE1.md`.
- Phase 2: offline tester-workflow implementation and automated verification completed; see `WIRELESS_REDESIGN_PHASE2.md`. Capture prerequisites repaired; three lessons and WF-OPS-02 supplied. Novice/instructor pilot pending. Runtime preflight found no usable execution environment; no successful software-radio spike or hosted service is claimed (see `WIRELESS_RUNTIME_FEASIBILITY.md`).
- Phase 3: offline authentication-decision release and bounded local PMKID verification implemented and automatically checked; see `WIRELESS_REDESIGN_PHASE3.md`. WEP remains conceptual; WPS/SAE live execution, learner pilot and instructor sign-off remain outstanding.
- Phase 4: offline client-trust/management/portal release implemented and automatically checked; see `WIRELESS_REDESIGN_PHASE4.md`. Directional data addressing and portal forwarding corrected. Owner/profile/policy models include secure rejection and inconclusive branches. Actual supplicant, RF, portal/ACL execution and independent pilot gates remain pending.
- Phase 5: offline Enterprise trust release and actual local certificate-file verification implemented and automatically checked; see `WIRELESS_REDESIGN_PHASE5.md`. RADIUS pairing/authenticators/accounting and domain-qualified MS-CHAPv2 derivation repaired. Full AP/client/AAA execution vertical slice, applied policy, instructor review and learner pilot remain pending; certificate-file checks do not pass those gates.
- Phase 6: offline two-client boundary evidence and deterministic local policy calculation implemented and automatically checked; see `WIRELESS_REDESIGN_PHASE6.md`. Exact scope, rule shadowing, positive controls and inconclusive evidence are supplied. Live application reachability, route/ACL enforcement, reset and the second execution vertical slice remain NOT TESTED; the model does not pass those gates.
- Phase 7: public C-20 evidence-review and professional-handoff release implemented and automatically checked; see `WIRELESS_REDESIGN_PHASE7.md`. Three lessons and WF-REVIEW-07 add initial-attempt preservation, source-cited findings/non-findings, public review and retest/data-handoff planning. This completes the evidence-first content pass, not the executable professional program. Unseen assessment, authoritative grading, variant equivalence, instructor pilot and earlier execution gates remain pending.

## Cross-phase follow-up — 2026-10-01

Content accuracy, sequencing, resource comparison and duplicate-explanation consolidation delivered; see `WIRELESS_CURRICULUM_REVIEW_2026-10-01.md`. All 53 lesson IDs remain; three checkpoint merges are conditional on the prepared learner pilot rather than silently retiring progress. `WIRELESS_LEARNER_PILOT.md` is ready for coordinator/reviewer recruitment, not a completed human study. All 20 published captures (257 packets), 37 lesson TShark examples and 50 challenge hint filters/fields are verified with Wireshark 4.4.5 (libwireshark WASM, 0 malformed frames); native OS tshark CLI formatting and human pilot sessions remain separate.

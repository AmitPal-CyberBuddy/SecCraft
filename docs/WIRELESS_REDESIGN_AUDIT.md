# Wireless redesign — repository review

2026-10-01. This is a repository-level coverage, dependency and feasibility review, not proof of field proficiency or a line-by-line independent standards certification. Historical audit documents remain snapshots; current source wins.

> Phase 2 follow-up (2026-10-01): the timestamp, group-cipher and Extended Supported Rates defects below are now repaired, with coordinated regeneration and independent decoder checks; radio flag masks were also corrected. The tables below retain the initial audit baseline. See `WIRELESS_REDESIGN_PHASE2.md` for current counts, delivered work and still-open runtime/pilot gates.

> Phase 4 follow-up: data-frame BSSID/source/destination aliases now follow ToDS/FromDS; the portal ARP uplink and example peer address are corrected. PMF unicast/group protection and missing-response interpretations were refined. See `WIRELESS_REDESIGN_PHASE4.md`; initial tables below remain historical.

> Phase 5 follow-up: AAA request/reply correlation, response/accounting authenticator verification and domain-qualified MS-CHAPv2 derivation are repaired. New local X.509 checks are not a hosted EAP runtime. See `WIRELESS_REDESIGN_PHASE5.md` for the coordinated four-capture update and remaining live-execution gates.

> Phase 6 follow-up: the two-client boundary case supplies exact service scope, first-match policy calculation and authored control/uncertainty records. Current Wireless catalogue is 50 lessons / 70 hours. Live segmentation and the second execution vertical slice remain NOT TESTED. See `WIRELESS_REDESIGN_PHASE6.md`; the initial audit tables remain historical.

> Phase 7 follow-up: C-20 now has an attempt/review/client-handoff dossier and three follow-on lessons. The current Wireless catalogue is 53 lessons / 73 hours; the seven-phase evidence-first content pass is delivered. This is not completion of the execution/independent-assessment gates. See `WIRELESS_REDESIGN_PHASE7.md`; public references are not a secure exam.

> Cross-phase follow-up: legacy protocol/profile/tool inaccuracies corrected, WPA2/Enterprise lessons resequenced, duplicate walkthroughs consolidated and the two suggested resource sites compared. See `WIRELESS_CURRICULUM_REVIEW_2026-10-01.md` and the unperformed human pilot plan `WIRELESS_LEARNER_PILOT.md`. All 53 lesson IDs remain.

## Reviewed surfaces

`modules.json`, path/phase metadata, all 32 Wireless lesson registrations and their objectives/teaching structure, quiz/lab/challenge/scenario inventories, `lab-artifacts.json`, artifact generation/verification, C-20 and ENG-01 contracts, legacy module mapping, local progress normalization/rewards, account progress version fields, content-tier/access logic, module reader/download rendering, route verification and CI. Backend legacy lab router has no grading routes; API account/attempt storage is not a hosted wireless runtime or trusted lab grader. Existing synthetic-capture helpers and verifiers were inspected, not assumed to reproduce RF.

## Coverage and required next work

| Current module | Keep | Main gap / redesign destination |
|---|---|---|
| 01 Foundations (2 lessons) | primer, threat model, authorization | guided scope decisions and independent evidence/next-test reasoning |
| 02 Identity (1) | beacon/ESS/hidden identity | scaffold RF/SNR limits; complete owner-correlated inventory rather than vendor guessing |
| 03 Frames (2) | state machine and worked RSNE | independent case, failed/partial evidence and ownership controls |
| 04 Setup (2) | capability/permission/regulatory boundaries | troubleshooting transcripts and actual supported adapter/runtime matrix |
| 05 Recon (1) | repeatable inventory/filter exercise | blind variant, channel/vantage coverage, legitimate multi-BSSID counterexample |
| 06 Evidence (1) | hash/filter/frame discipline | interoperable timestamps and correlated capture/client/AP/AAA evidence |
| 07 WEP (1) | mechanism and removal recommendation | no existing supplied key-recovery practicum; keep short and bounded |
| 08 WPA2 (5) | key hierarchy, actual MIC audit and clinic | independent audit-strategy decisions, real client acceptance and limits; split 09 only with new practical value |
| 10 WPS (1) | lockout/configuration versus exploitation | no complete WSC interaction or measured lockout; don't imply enabled means exploitable |
| 11 WPA3 (1) | SAE/OWE and transition comparison | actual client negotiation, version-dependent conditions and negative controls |
| 12 Management/look-alikes (3) | PMF/ownership limits and clinic | separate measured availability and client-trust scenarios; MFPC alone cannot predict disruption |
| 14 Portal (1) | isolation versus segmentation | actual portal/session/backend and two-client control measurements |
| 15 Enterprise (7) | method/cert/AAA detail | separate fixtures do not form one end-to-end session; build linked profiles/certs/logs/policy outcomes |
| 18 Corporate (2) | challenge unsupported chains | actual allowlisted guest/internal/management service matrix, not imagined pivot |
| 20 Final (2) | independent C-20 and scope discipline | no hosted unseen engagement, independent reviewer or performed client retest |

Baseline practice: 19 available Wireless lab catalogue entries (3 local answer-checked), 22 challenges/66 self-review tasks and 35 decision scenarios. Local answer validation is not server-trusted competence. Supplied worked words/keys teach toolchain operation; they cannot establish production password resistance. New case practice must not inflate these lab/challenge counts unless registered and actually integrated.

## Specific compatibility and technical findings

1. Five retired module IDs already alias into current parents. Reusing their old names for proposed standalone modules would misroute old bookmarks/progress. Use new semantic IDs for future splits.
2. Current frontend preview derives from phases 1–2. Moving setup from phase 1 into phase 2 preserves the six Preview modules; moving any of the later modules into those phases would widen the presented preview. Regression-test the exact IDs.
3. `verify-progress-state.mjs` still asserts implicit Wireless defaults, although the current version-7 store intentionally starts/reset with no path. Correct the stale verifier, not the neutral product behavior. Also stop its output calling local records certificate eligibility.
4. Shared artifact helper `write_pcapng` writes EPB timestamp high/low as division/remainder by 1,000,000 instead of splitting the 64-bit tick count at 2^32. Existing byte/crypto tests do not detect that time interpretation bug. **Phase 2 prerequisite:** independently validate timestamps before teaching cross-source time correlation; regenerate affected packs/exports/hashes together, not silently edit one capture. WF-FND-01 uses its own standards-correct writer and an independent binary timestamp check.
5. Shared `parse_rsn()` reads the group-suite type at value[4] (last OUI byte) instead of value[5]. WF-FND-01 uses a narrow independent export parser; Phase 2 must fix/regenerate affected legacy exports and add literal cipher-suite assertions. Shared helper `ie_extended_rates()` uses element ID 35, while the authored frame reference correctly says Extended Supported Rates ID 50. **Phase 2 prerequisite:** audit affected generator callers and repair with a literal-ID regression. The new foundations generator does not use that helper. These findings mean existing integrity/semantic test passes are not comprehensive external-decoder certification.
6. Some catalogue objectives overpromise compared with the actual lessons: e.g. beacon PMF bits predicting spoof success; reconstructing client randomization as fact; monitor/injection capability assumed from interface modes. Refine outcome wording as each phase is authored; Phase 1 fixes the foundation inference boundaries.
7. Markdown download rewriting previously recognizes Android-only asset roots. New Wireless packs need explicit base-path-safe links and root/subpath tests. Implemented in Phase 1; direct case-file navigation also bypasses the service worker’s SPA-shell substitution.
8. Existing quizzes/lesson-complete controls record practice, not assessed execution. Add new self-review lessons without upgrading earlier quizzes or introducing a verified completion claim.
9. Browser tools and static fallback data remain useful analysis aids; no current lab orchestration/isolation/reset fleet supports professional live rogue/portal/Enterprise scenarios. An execution platform is a distinct engineering/security project.
10. Existing six-phase metadata can be regrouped into seven without changing module IDs. Do not publish all proposed modules as available merely to match the future syllabus.

## Review conclusions

Proceed with competency-based redesign and executable scenario investment. First release is a bounded evidence-mode foundations slice. Obtain independent protocol/instructional review and pilot feedback before claiming industry qualification; obtain host/kernel/equipment, isolation and cost decisions before hosted lab implementation. Preserve technical tools, multi-path navigation, Android and account-security behavior.

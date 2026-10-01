# Wireless redesign — Phase 1 release

2026-10-01. **Implemented and automatically verified; learner pilot and independent instructor sign-off pending.** This is an evidence-mode foundations release, not a live wireless lab platform or professional qualification.

## What is available now

- The existing **15 Wireless modules** are grouped into **7 competency phases**; the twenty-module map remains a roadmap. Android and the six Wireless Preview modules are unchanged in scope.
- **35 Wireless lessons** (previously 32), with three new units:
  - `01-intro-wireless/02-scope-and-assessment-decisions`: permission, observations versus hypotheses, explicit next-test request and stop conditions.
  - `02-wifi-fundamentals/02-rf-and-client-observation`: SNR/coverage limits, multi-BSSID ownership, probes/privacy and a guided inventory.
  - `03-80211-architecture/03-foundations-independent-case`: scope → inventory → protocol reconstruction → disputed claims → staged comparison → next safe decision.
- Existing foundation explanations are refined where they overstate BSSID/physical-device identity, probe history, open-system authentication, association or encrypted-payload access.
- Original **WF-FND-01 Aster evidence case**: 13-frame baseline and 3-frame follow-up PCAPNG files, derived read-only JSON views, fictional ROE, administrative inventory, learner worksheet, public answer rubric and SHA-256 manifest. Deterministic ZIP download includes the complete pack.
- This adds **two case-specific captures outside the existing eighteen-capture lab catalogue**. Existing lab/challenge/quiz/scenario inventories remain unchanged; no duplicated or invented lab completion/verified XP.
- Path overview explains the new practice and why retained historical progress may show a lower current percentage.
- New artifact links honor root and `/SecCraft/` hosting. Keyboard activation downloads the actual files. The service worker no longer substitutes the app shell for Wireless case-file navigation; previously fetched case files remain readable offline.

## Scope and evidence boundaries

The frames are encoded files, not measurements from live APs, clients or RF. The follow-up is a staged SSID-visibility comparison, not a security fix or performed retest. Signal, timestamps, addresses and organization are fictional; no noise/width/complete RF coverage is supplied. Same-name BSSIDs need administrative ownership correlation, and administrative correlation does not authenticate a transmitted source address.

No new quiz bank, score, server-side grading, account entitlement or certificate was introduced. The public key intentionally makes this self-review practice, not a secret exam. Completing the lesson records participation, not a passed professional assessment. Optional instructor review is requested, not claimed to have occurred.

## Compatibility

All existing module, lesson, lab and challenge IDs survive, including legacy redirects. No store reset or version bump is needed for additive lesson registrations. The local-progress verifier now checks the existing neutral version-7 defaults instead of erroneously requiring Wireless selection, and tests an old complete foundations record: its two lessons and unchanged quiz retain credit; the new case stays incomplete; no new XP is awarded.

Account records remain untouched. Proposed future split modules will require separate IDs/migration contracts. The full local journey, duplicate-award prevention and retired-record migration still pass. The current estimated path duration is 55 hours, an authoring estimate—not observed learner time.

## Verification

- **337 foundations checks passed:** deterministic bytes, whole-pack hashes, archive contents, independently parsed PCAPNG blocks and absolute timestamps, literal cipher/PMF bits, address roles, hidden-name evidence, state sequence, declared follow-up limits, derived JSON consistency, phase/Preview coverage and lesson links.
- Independent **Scapy 2.7.0** read of both PCAPNG files passed: microsecond timestamps, SSID reveal, CCMP group suite, MFPC/MFPR, authentication sequences, association status, deauthentication reason, radio frequency and follow-up beacons. Scapy is QA-only; no production dependency was added. Wireshark/TShark and physical RF were not run in this environment.
- Learning-data verifier: **27 platform modules, 60 lessons, 27 quizzes/126 questions, 29 lab entries (28 available), 22 challenges/66 tasks and 35 scenarios**. Wireless subset remains 15 modules, now 35 lessons and 7 phases.
- Progress verifier and **68 internal destinations / 48 routes** passed.
- Existing artifact suite: **242/242 checks passed**, but it does not cover all newly identified legacy timestamp/IE/group-decoder defects. See the audit and Phase 2 prerequisite; do not mistake this pass for complete standards certification.
- Production build and **43 frontend tests passed**. Lint **0 errors / 70 pre-existing warnings**. No-dummy/no-external-request check and diff whitespace check passed.
- **64 root-host browser checks** across 320/768/844-short-landscape/1440px, dark/light and regular/reduced motion.
- **33 production project-subpath checks**: path map/three lessons, exact downloaded file bytes, keyboard download, local participation, axe, reflow and one actual service-worker-controlled offline file-navigation check.
- **84 existing learning-state checks / 28 combinations**, and keyboard/theme/reflow smoke passed.

Tests are browser simulations and offline service fixtures, not live-provider, physical-device, full screen-reader or independently graded teaching outcomes. Local production preview was checked; no external preview/GitHub Pages release or remote CI result is asserted.

## Repeatable commands

```sh
python3 scripts/generate-wireless-foundations.py --check
python3 scripts/verify-wireless-foundations.py
node scripts/verify-learning-data.mjs
node scripts/verify-progress-state.mjs
node scripts/verify-frontend-routes.mjs
python3 scripts/verify-lab-artifacts.py
python3 scripts/verify-no-dummy-data.py
npm test --prefix frontend
npm run build --prefix frontend
```

Browser runner: `scripts/ui-wireless-foundations-smoke.mjs`. Use `UI_AUDIT_URL=http://localhost:4173/SecCraft UI_AUDIT_PRODUCTION=1` against the Pages emulator for subpath/offline checks. Both modes and the artifact verifier are included in CI; its dev server now explicitly uses `VITE_BASE=/`. Remote CI was not run.

Local logs: `/home/user/wireless-{foundations-verify,learning-data,progress,routes,legacy-artifacts,build,tests,lint,no-dummy,browser-root,browser-pages,learning-browser,keyboard}.log`. Browser screenshots: `.cache/ui-audit/wireless-foundations/`.

## Next phase, in order

1. Correct legacy capture timestamps, Extended Supported Rates ID and group-cipher decoding **with cross-file regeneration and literal/external checks**, before teaching timeline correlation.
2. Expand Modules 04–06 into capability/troubleshooting, recon inventory and evidence-workflow practice.
3. Run the local executable-lab feasibility spike. Do not provision a hosted service or describe rogue/Enterprise/portal exercises as executed until their environment, isolation, controls and reset gates pass.
4. Pilot the foundations worksheet with actual learners/instructors and adjust scaffolding from observed difficulties.

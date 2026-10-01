# Wireless redesign — Phase 2 release

2026-10-01. **Offline implementation and automated verification complete. Learner/instructor review remains pending; the live-execution spike is blocked at environment preflight, not passed.** This release covers Modules 04–06 without claiming hosted labs or field competence.

## Delivered learning

Wireless remains **15 modules / 7 phases**, now **38 lessons** and **58 estimated hours** (authoring estimate, not observed learner time). The six Preview modules remain the same. Android is unchanged.

Three additive lessons:

| Module | New unit | Practical outcome |
| --- | --- | --- |
| 04 Setup | `03-capability-troubleshooting` | Diagnose attachment, driver, blocking and band/channel evidence; choose a feasible practice route and keep physical outcomes NOT TESTED |
| 05 Recon | `02-coverage-and-inventory` | Owner-correlated BSS/client inventory, minimized incidental data and a bounded collection plan without inventing coverage |
| 06 Evidence | `02-timeline-and-evidence-handoff` | Source-specific timeline, clock offset/uncertainty, unsupported-claim rejection and reproducible handoff/retest proposal |

Existing Module 04 guidance now separates read-only diagnosis from optional interface changes and no longer places an injection test in the readiness command sequence. Generic integrated-versus-USB capability assumptions were removed. Module 05 objectives no longer equate locally administered addresses with proven randomization or disappearance from a capture with remediation.

### WF-OPS-02 workflow case

`frontend/public/wireless-practice/WF-OPS-02/` plus deterministic ZIP: 12 files, including copies of the **existing** repaired recon-lab (17 frames) and traffic-analysis (21 frames), their decoded JSON, scope/owner records, three authored capability cases, fictional client log/clock note, worksheet, public review guide and SHA-256 manifest. This does not add duplicate entries to the lab/challenge catalogue or create a new answer-checked assessment.

The scenes are explicitly separate despite reused addresses/seeded clocks. Recon is not a realistic channel-dwell survey. Traffic has intentionally unprotected post-handshake data; the rubric tests recognition of that simplification rather than inventing accepted plaintext or application access. Client logs are fictional, not collected runtime evidence. L2's corrected interval overlaps frames 13–17; the worksheet must retain ambiguous ordering.

Browser-only learners can complete reasoning from decoded files. Optional TShark/Wireshark commands run on the learner's own computer, not in the browser simulator. Lessons and case files work under root and project-subpath hosting; previously fetched case files remain available through the service worker offline. Files must first be downloaded/cached.

## Honest delivery labels

- Shared disclosure on the Wireless path, module, lab library, challenge library and challenge detail: **offline practice available / hosted live labs unavailable**.
- Details distinguish supplied evidence, real local file tools, optional authorized equipment and absent cloud execution.
- Cards/badges use meaningful evidence/hardware labels while preserving legacy metadata values and IDs.
- Lab tab renamed **Command simulator**; its no-execution warning remains visible even on narrow screens.
- No cloud launch/provisioning, trusted grading, credential change or certificate was introduced. The disclosure is Wireless-specific and does not turn other paths into wireless products.

See `WIRELESS_RUNTIME_FEASIBILITY.md` for actual preflight observations, fidelity limits and future security/reset gates. No successful software-radio execution is claimed.

## Coordinated artifact repairs

- PCAPNG high/low timestamp words now split at 2^32; non-microsecond resolution is rejected instead of mislabeling microsecond inputs.
- Extended Supported Rates uses IE **50**, not 35.
- RSN group-suite decoder reads the suite type, not the OUI byte.
- Radiotap band/modulation masks corrected; no fictitious 6 GHz flag or simultaneous inappropriate GFSK/CCK/OFDM defaults.
- Regenerated **18 captures / 240 packets**, public decoded exports, catalogue/manifest hashes and the authored WPA2 lesson digest. Exports now include `capture_timestamp_us`, `relative_time_ms` and explicit generated provenance.
- Existing challenge content was compared with its pre-repair snapshot and left unchanged; the challenge generator was not blindly rerun. Packet ordering/counts and cryptographic known-answer checks remain valid.

Old capture copies do not match the new hashes and should not be mixed with current timeline evidence. WF-FND-01's separate artifacts remain byte-identical. These targeted interoperability checks are not a complete standards certification of every synthetic protocol field.

## Compatibility and verification

- **74** workflow pack/hash/archive/semantic/clock/link/Preview/availability contracts passed.
- Literal capture regressions plus independent **Scapy 2.7.0** decode passed for all 18 files / 240 packets: absolute timestamps, radio/IE constants, RSN suite/export agreement, archive source hashes; clock rollover and unsupported-resolution rejection covered.
- Existing artifact verifier **242/242** and foundations verifier **337** passed.
- Catalogue: **27 platform modules / 63 lessons / 27 quiz banks / 126 questions / 29 lab entries (28 available, 3 answer-checked) / 22 challenges / 66 self-review tasks / 35 scenarios**.
- Progress tests preserve old Module 04/05/06 lesson records and XP, keep each new lesson incomplete and update the completion denominator without resetting history. Existing IDs, quizzes, redirects and access boundaries remain intact.
- **80 root browser checks**: 320/768/844-short-landscape/1440px × dark/light × normal/reduced motion; path, lessons, exact file bytes, keyboard disclosure/download, local participation, availability labels, simulator and Android separation; axe/reflow/runtime-error checks.
- **41 production subpath checks**, including actual service-worker-controlled offline JSON navigation, passed. Existing foundations production suite **33** passed again.
- Existing learning suite **84 checks / 28 combinations** passed. Its first run hit a 240-second command timeout after 61 passing checks; a full rerun with adequate timeout completed. No partial run is counted as a pass.
- **43 frontend tests**, build, **69 internal destinations / 48 routes**, no-dummy/no-external-request checks and whitespace check passed. Lint remains **0 errors / 70 warnings**; bundle-size warning remains.
- CI includes new artifact/browser checks and independent decoding using the backend's existing pinned Scapy dependency. Browser job budget increased to 50 minutes. Remote CI was not run.

Tests use offline service fixtures, not a live auth provider, physical hardware, full screen-reader validation or an actual learner pilot. Wireshark/TShark were not executed here. Local production behavior was tested; external preview availability or deployed GitHub Pages behavior is not asserted from local HTTP success.

## Reproduce

```sh
python3 scripts/generate-lab-artifacts.py
python3 scripts/package-wireless-practice.py
python3 scripts/verify-labkit-interop.py
# Scapy 2.7.0 is needed only for the additional independent QA pass:
python3 scripts/verify-labkit-interop.py --scapy
python3 scripts/verify-wireless-phase2.py
python3 scripts/verify-lab-artifacts.py
python3 scripts/verify-wireless-foundations.py
node scripts/verify-learning-data.mjs
node scripts/verify-progress-state.mjs
node scripts/verify-frontend-routes.mjs
npm test --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Browser runner: `scripts/ui-wireless-phase2-smoke.mjs`, with the existing `UI_AUDIT_MODULES`, optional `UI_AUDIT_EXECUTABLE`, and `UI_AUDIT_URL` conventions. Set `UI_AUDIT_PRODUCTION=1` and point to the Pages emulator's `/SecCraft` path for production checks. Logs: `/home/user/phase2-*.log`; screenshots: `.cache/ui-audit/wireless-phase2/`.

## Next phase / remaining gates

Phase 3: bounded legacy/WPA2/password/WPS/WPA3 decision practice, independent evidence variants and known-answer checks. Keep WPS execution and real client acceptance explicitly unavailable until supported environments exist. Do not infer cloud capability from offline fixture success.

Human gates remain: novice troubleshooting pilot, instructor review of scope/inventory/timeline deliverables, and the infrastructure owner's environment/security decisions. This release makes offline learning usable now without representing those gates as completed.

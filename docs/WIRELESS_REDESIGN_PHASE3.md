# Wireless redesign — Phase 3 release

2026-10-01. **Offline learning release and bounded local verification implemented and automatically tested. Learner/instructor sign-off and live WPS/SAE/client execution remain outstanding.** No hosted environment or professional certification is claimed.

## Delivered

The Wireless path remains **15 modules / 7 phases**, now **41 lessons / 61 estimated hours**. The twenty-module structure remains a roadmap. The same six Wireless Preview modules, all existing lesson/lab/challenge IDs, quizzes and Android scope are preserved. Account/progress schemas and scoring are unchanged.

| Module | Work | Outcome |
| --- | --- | --- |
| 07 WEP | Kept short; expanded bounded legacy decision | Recommend migration without inventing recovery; plan continuity/rejection controls and mark unperformed tests |
| 08 WPA2 | Added `04-bounded-candidate-audit` | Guided then independent PMKID audit with an explicit three-candidate budget, match/non-recovery, provenance and access limits |
| 10 WPS | Added `02-applicability-lockout-and-budget` | Separate advertisements, applicable mechanism, lockout observations, authorization budgets and measured enforcement |
| 11 WPA3 | Added `02-policy-negotiation-and-negative-controls` | Separate advertised policy, encoded PSK exchange and forced downgrade; propose secure rejection/compatibility controls |

Existing explanations were corrected: tiny-list runtime does not measure overall password strength; a recovered candidate does not automatically grant access; PBC is not limited to a physical-button attacker; WPS disablement depends on actual product paths; optional PMF does not mean every client disables it; SAE groups are not Enterprise 192-bit settings; passive SAE does not expose the ordinary PSK verifier. Removed a stale Module 09 reference.

## WF-AUTH-03

Location: `frontend/public/wireless-practice/WF-AUTH-03/` and matching deterministic ZIP, **16 files**.

- Fresh, explicitly constructed PMKID records: guided G1 and independent I1/I2, with different SSIDs and AP/station identities. These are **not extracted from** the policy captures.
- Standard-library Python `audit.py`: actual local CPU PBKDF2/HMAC verification, exactly three supplied candidates per record; no network I/O, radio or GPU required. The CLI selects bundled exercise modes, not a target host. This is a local file-analysis tool, not a hosted lab or trusted grader.
- G1 matches candidate line 2; I1 matches line 3; I2 matches none. I2's credential is public and deliberately outside the list: it is **not** described as strong or random. Public generator/key means this is self-review, not a secure examination.
- Browser-only alternative: read supplied reference outcomes and explicitly record **reviewed, not independently executed**. No fake execution transcript or benchmark is presented as the learner's work.
- Existing WPS (9 frames), SAE-only (6) and transition (11) captures copied with their decoded views; fictional WPS budget log, scope, worksheet, public review guide and SHA-256 manifest.
- W2 stop conditions: three attempts or lock/impact, 600-second window. Its 900-second hypothetical cooldown cannot justify another attempt inside the window. The log is authored, not hardware evidence.
- SAE/BIP-shaped material remains illustrative, not valid authentication/integrity or live-client acceptance. Policy captures are separate scenes, not a performed remediation/retest.

The new case has a path entry point and follows existing root/subpath-safe downloads and cached-file offline handling. It does not add duplicate catalogue labs, new graded tasks or automatic XP. Missing equipment does not block the offline learning route.

## WPS artifact correction found during review

The shared helper previously used `10 4a` (the Version attribute ID) as a two-byte Version **value**. It now emits the one-byte WSC version `10`. False setup-lock and selected-registrar states are now explicitly encoded instead of omitted, so absence is not silently interpreted as a tested false state.

Regenerated affected **three captures** (`wps-beacon`, `corporate-attacks`, `methodology`), their decoded exports and catalogue/manifest hashes. Frame ordering/counts and existing challenge answers remain unchanged; the challenge generator was not rerun. The new case package uses the corrected bytes. Legacy captures elsewhere still have synthetic simplifications; this is targeted validation, not complete wire-format certification. Older hashes must not be paired with the corrected copies.

## Verification performed

- **94 Phase 3 checks**: deterministic archive/hashes, published PBKDF2 and RFC 2202 HMAC known answers, actual local script outputs, wrong-SSID/wrong-AP/corrupted-verifier negative controls, external OpenSSL PBKDF2/HMAC cross-check of all three records, literal WSC TLVs, advertised policy, budget reasoning, lesson links and Preview boundary.
- **Scapy 2.7.0:** all 18 catalogue captures / 240 packets pass the existing independent decode/clock/RSN checks after WPS regeneration.
- Existing capture suite **242/242**, foundations **337**, and Phase 2 case **74** checks pass. Existing case packages still match their deterministic manifests/archives.
- Learning contract: **27 platform modules / 66 lessons / 27 quiz banks / 126 questions / 29 lab entries (28 available, 3 answer-checked) / 22 challenges / 66 self-review tasks / 35 scenarios**.
- Progress regression now includes Modules 08/10/11: retains old lessons/XP, leaves each new lesson incomplete and updates the denominator without a reset. Historical migration, duplicate rewards and the full local practice journey pass.
- **64 root browser checks** across 320/768/844-short-landscape/1440px, dark/light, regular/reduced motion; new lessons, visible availability, keyboard disclosure/download, exact file bytes, local completion, axe/reflow and runtime-error checks.
- **33 production `/SecCraft/` checks**, including actual service-worker-controlled cached JSON navigation while offline, passed. No claim that uncached files are available offline.
- Build and **43 frontend tests** pass; **70 internal destinations / 48 routes** pass. Lint: **0 errors / 70 warnings**. Bundle-size warning remains. No-dummy/no-external-request and whitespace checks pass.
- CI includes Phase 3 artifact/OpenSSL and root/production browser checks; browser job ceiling is now 55 minutes. Remote CI was not run.

OpenSSL 3.0.20 was used as an external command-path cross-check, not claimed to be a different underlying cryptographic library from Python's backend. Wireshark/TShark/hashcat/hcxpcapngtool performance, physical RF, WPS PIN execution, actual SAE client negotiation and hosted runtime were **not** tested. Automated browser fixtures are not an instructor pilot, live provider validation, full screen-reader assessment or proof of professional competence. Local preview success is not an assertion that external preview/deployed Pages is available.

## Reproduce

```sh
python3 scripts/generate-lab-artifacts.py
python3 scripts/package-wireless-practice.py
python3 scripts/package-wireless-auth.py
python3 scripts/verify-wireless-phase3.py --openssl
python3 scripts/verify-labkit-interop.py --scapy  # requires QA Scapy 2.7.0
python3 scripts/verify-lab-artifacts.py
python3 scripts/verify-wireless-foundations.py
python3 scripts/verify-wireless-phase2.py
node scripts/verify-learning-data.mjs
node scripts/verify-progress-state.mjs
node scripts/verify-frontend-routes.mjs
npm test --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Browser runner: `scripts/ui-wireless-phase3-smoke.mjs`, using the existing `UI_AUDIT_MODULES`, optional `UI_AUDIT_EXECUTABLE` and `UI_AUDIT_URL` settings. For Pages emulation set `UI_AUDIT_PRODUCTION=1` and point at `/SecCraft`. Logs: `/home/user/phase3-*.log`; screenshots: `.cache/ui-audit/wireless-phase3/`.

## Remaining gates and next phase

Novice candidate-audit/lockout-policy pilot, independent protocol/instructor review, supported live-runtime and physical-device matrices remain pending. The earlier infrastructure preflight limitation is unchanged; see `WIRELESS_RUNTIME_FEASIBILITY.md`. Secure live rejection, lockout persistence and actual client acceptance are proposals, not completed tests.

Next: Phase 4 client trust, management frames, rogue-infrastructure attribution and guest/portal boundaries. Keep endpoint effects, causality and live execution explicitly distinct from available artifact reasoning. Do not relabel offline completion as an executed attack.

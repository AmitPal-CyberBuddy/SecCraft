# Wireless redesign — Phase 5 release

2026-10-01. **Offline curriculum and actual local certificate-file verification implemented and automatically checked.** The roadmap's full AP/client/AAA execution vertical slice has **not** passed: no hosted service, actual supplicant session, applied VLAN or live forwarding test is supplied. Learner/instructor review remains pending.

## Delivered scope

Wireless remains **15 modules / 7 phases**, now **47 lessons / 67 estimated hours**. Current Module 15 gains three units; future module splits are not presented as released Modules 16–18. Android, existing IDs, quiz banks, scoring/account schemas and the six Wireless Preview modules remain intact.

| Added lesson in `15-enterprise-fundamentals` | Outcome |
| --- | --- |
| `04-method-selection-and-trust-boundaries` | Choose EAP controls by deployment constraints; distinguish outer identity, protected inner material, key possession and Wi-Fi profile labels |
| `05-certificate-identity-validation` | Run local chain/name/time/purpose checks with a good-server positive control and distinct rejection cases |
| `06-radius-to-applied-policy` | Pair AAA requests/replies, verify their integrity and distinguish returned policy from applied placement/forwarding |

A compact entry point appears in the path's Phase 5 map. Existing availability disclosures remain: offline evidence and optional actual local tools are available; hosted live execution is not. No old lesson completion silently awards the three new units.

## WF-ENT-05 case pack

`frontend/public/wireless-practice/WF-ENT-05/` plus deterministic ZIP, **21 files**:

- Seven public Ed25519 certificate fixtures: two roots and five leaf cases (good, same-root wrong name, other-root issuer, expired, client-only purpose).
- `check-certificates.py`, using local Python/OpenSSL 3, explicitly isolated trust and a fixed reference time of **2026-10-01T00:00:00Z**. It performs no network connection or EAP negotiation.
- Two command policies: both check chain/time/server purpose; `ca-only` deliberately omits expected hostname, while `strict` adds `aaa.lab.example`. The wrong-name certificate passes the former and fails the latter. The good certificate remains accepted; untrusted/expired/wrong-purpose examples fail under both.
- Browser-only reference outcomes with an explicit “reviewed, not independently executed” route. Local execution and supplied-results review must not be confused.
- Separate Enterprise (11 frames), EAP (12) and repaired RADIUS (10) captures and decoded views; method questions, authored client/AP/AAA/forwarding model records, worksheet, scope, public rubric and hashes.

**No private keys are shipped or written.** Certificate generation uses public deterministic seeds solely for reproducible teaching; the keys are not secrets or production PKI. Learners are instructed not to install these roots into OS/browser/device trust stores. Revocation, actual TLS negotiation/key possession, client overrides and EAP firmware compatibility are not tested. Fixed historic evaluation time is not a real current-validity assessment.

S1–S4 are explicitly authored models, not collected logs: limited policy consistency, secure client rejection, requested/applied VLAN mismatch and insufficient enforcement evidence. They are not timestamp-correlated with the supplied packet scenes. No Access-Accept or missing response is promoted into proof of actual placement or segmentation.

## Correctness repairs

### RADIUS transactions and authenticators

Review found mismatched reply identifiers, reused zero request authenticators, incorrect accounting request code, a missing request before Access-Accept, missing Message-Authenticators on EAP-bearing replies, and an existing verifier that checked reply presence rather than recalculating the reply digest.

The repaired fixture now has:

- Frames **2→3**, **4→5**, **6→7**: Access request/reply pairs with IDs 1, 2 and 3.
- Frames **8→9**: Accounting-Request (code 4) / Accounting-Response (code 5), ID 5.
- Frame **10**: intentionally wrong-secret request from a separate source, not proof of an actual rogue NAS.
- Distinct deterministic teaching Access-Request nonces; production unpredictability is explicitly not claimed.
- EAP-bearing response Message-Authenticators calculated with the corresponding request authenticator, followed by final Response Authenticators; Accounting-Request uses its own MD5 construction.
- Access-Accept at frame 7 carries VLAN 100 and a four-byte EAP-Success with no Type field. Removed illustrative fake MS-MPPE key containers; no MSK/key transport is claimed.

`verify-radius-wire.py` reads raw container/network bytes without the labkit decoder, pairs flows/IDs and verifies every authenticator. Phase 5 tests reject changed reply IDs/digests/accounting codes and an altered response HMAC even after its outer digest has been recomputed. The former weak RADIUS verifier and obsolete zero-nonce reconstruction were replaced, not treated as sufficient coverage.

Embedded direct MS-CHAPv2 method bytes still have structural teaching limitations: this is not certified EAP wire interoperability, a PEAP tunnel or a functioning client/server authentication session.

### MS-CHAPv2 and teaching precision

- ChallengeHash now excludes a prepended Windows domain from UserName, as required by RFC 2759. Both `User` and `DOMAIN\User` are checked against the published known answer. The lesson documents this distinction.
- EAP Success/Failure no longer acquire invented method/type labels from trailing fixture bytes.
- Revised the RADIUS challenge's frame list/description and literal affected verifier references without changing its IDs, tasks or rewards. The whole challenge generator was not blindly rerun.
- **Four capture files** changed bytes: radius, eap, corporate-attacks and methodology. Rebuilt manifests, hashes, decoded exports and relevant case copies together. Catalogue is still 18 captures, now **241 packets** (one additional RADIUS request).
- Existing explanations now distinguish effective/inherited trust from a missing `ca_cert` setting, encrypted transport from intended-peer identity, suffix matching from exact names, outer metadata exposure and account disablement from immediate session termination. Conceptual client selection/password recovery is no longer drawn as guaranteed.

These targeted checks do not certify every field in the older abbreviated TLS/EAP fixtures. Old hashes must not be paired with corrected files.

## Verification performed

- **124 Phase 5 checks**, or **126 with certificate reproducibility and Scapy**: actual OpenSSL checks and rejection reasons, no private-key exports, complete archive hashes, AAA integrity and mutation controls, domain-qualified MS-CHAPv2 known answers, packet/model boundaries, lesson links and Preview compatibility.
- Seven certificate files regenerate byte-for-byte using **cryptography 46.0.5** (QA-only). Local verifier ran with **OpenSSL 3.0.20**. This is file verification, not supplicant execution.
- Independent **Scapy 2.7.0** catalogue pass: **18 captures / 241 packets**; additionally checked raw UDP/RADIUS payload extraction against the independent wire verifier.
- Existing artifact suite **238/238** passed after replacing loose RADIUS checks and correcting EAP Success decoding. The smaller check count is not a claim of unchanged test composition; stronger transaction and mutation checks are listed separately above.
- Foundations **337**, Phase 2 **74**, Phase 3 **94** and Phase 4 **101** checks passed. All case archives/manifests are deterministic and current.
- Learning contract: **27 platform modules / 72 lessons / 27 quiz banks / 126 questions / 29 lab entries (28 available, 3 answer-checked) / 22 challenges / 66 self-review tasks / 35 scenarios**.
- Progress migration, historical lesson credit, duplicate rewards and full local journey passed. Module 15's prior records/XP remain; all three added lessons begin incomplete and the denominator updates without a reset.
- Final **64 root browser checks** at 320/768/844-short-landscape/1440px × dark/light × normal/reduced motion: map entry, lessons, availability, keyboard disclosure/download, exact downloaded bytes, local participation, axe/reflow and runtime-error checks.
- Final **33 production `/SecCraft/` checks**, including actual service-worker-controlled cached JSON navigation while offline. Uncached files are not promised offline.
- Build and **43 frontend tests** passed. **72 internal destinations / 48 routes**, no-dummy/no-external-request and whitespace checks passed. Lint remains **0 errors / 70 warnings**; bundle-size warning remains.
- CI includes new artifact/certificate/AAA/browser checks. Certificate generation is pinned in QA; no new frontend or runtime PKI dependency was added. Browser job ceiling is 65 minutes. Remote CI was not run.

Tests use offline service fixtures, not live authentication providers, physical RF, full screen-reader assessment or a teaching pilot. Wireshark/TShark were not run here. No real EAP client, RADIUS service, credential capture, AP policy application or live service reachability was validated. Local browser success is not an assertion of external preview or deployed Pages availability.

## Reproduce

```sh
python3 scripts/generate-lab-artifacts.py
# QA only: cryptography 46.0.5 is needed for certificate generation/checking.
python3 scripts/generate-enterprise-certificates.py --check
python3 scripts/package-wireless-practice.py
python3 scripts/package-wireless-auth.py
python3 scripts/package-wireless-trust.py
python3 scripts/package-wireless-enterprise.py
python3 scripts/verify-radius-wire.py
python3 scripts/verify-wireless-phase5.py
python3 scripts/verify-wireless-phase5.py --cert-generator --scapy
python3 scripts/verify-labkit-interop.py --scapy
python3 scripts/verify-lab-artifacts.py
node scripts/verify-learning-data.mjs
node scripts/verify-progress-state.mjs
node scripts/verify-frontend-routes.mjs
npm test --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Browser runner: `scripts/ui-wireless-phase5-smoke.mjs`, with existing `UI_AUDIT_MODULES`, optional `UI_AUDIT_EXECUTABLE` and `UI_AUDIT_URL` conventions. Production mode adds `UI_AUDIT_PRODUCTION=1` against the Pages emulator's `/SecCraft` path. Logs: `/home/user/phase5-*.log`; screenshots: `.cache/ui-audit/wireless-phase5/`.

## Remaining gates and next phase

The full execution vertical slice still needs an approved isolated host, supported pinned supplicant/AP/AAA versions, real identity-validation outcomes, actual hardening/retest, key/policy correlation, bounded service checks, reset/teardown and instructor/security review. `WIRELESS_RUNTIME_FEASIBILITY.md` remains the infrastructure limitation record; no provider was provisioned and no successful live spike is claimed. The certificate-file comparison is a useful narrower execution exercise, not a substitute for that gate.

Next: **Phase 6 — post-association boundaries**, including guest/corporate/management policy, explicit source/service/direction, route/ACL evidence, health and negative controls, and supported impact. Continue to separate available evidence practice from unperformed network tests.

# Wireless redesign — Phase 6 delivery

2026-10-01 · Post-association boundaries and segmentation

## Release scope

Delivered offline evidence lessons, a reproducible local policy calculation and a browser-only reference-review route. **No hosted network runtime was provisioned, no firewall was changed and no live application reachability was tested.** The second execution vertical slice remains unpassed, as does the full Enterprise slice. This release is not a claim of executable professional training or verified learner competence.

The runtime retains 15 Wireless modules across seven phases. Module ID `18-corporate-attacks` is preserved, with the clearer title **Post-Association Boundaries and Segmentation**. Added lessons:

1. `03-boundary-map-and-test-scope`: owner assertions versus observed placement, two-client service matrix and exact authorization.
2. `04-policy-order-and-evidence-controls`: first-match rules, local model execution, positive controls, contradictory and incomplete evidence.
3. `05-retest-and-supported-impact`: comparable retests, bounded findings, application authorization and cleanup.

Existing detection material and two decision scenarios now distinguish configured policy, intended policy and demonstrated enforcement. A ping does not establish application-level impact. No arbitrary internal scanning or AD expansion was added. The phase map links directly to the new case.

## WF-BOUND-06

A deterministic ZIP contains 15 files: scope, owner topology, authorization, requested flows, baseline/hardened rules, separate authored observation sets, local calculator, reference results, worksheet, public review guide, the existing corporate capture and JSON, and a SHA-256 manifest.

- Two fictional clients: guest-A (owner-asserted VLAN 20) and corp-B (VLAN 100); management VLAN 10. VLANs are not inferred from IP addresses.
- Exact approved model requests F1–F7 specify source, service, TCP/443 and direction. F8 changes to UDP/53 and must stop as out of scope. Aliases are not network targets; real tests require separate permission.
- The baseline broad guest allow shadows narrower deny rules. Hardened rules permit only the named guest portal/public-web services; corporate internal paths and management restrictions are retained.
- F7 deliberately lacks complete route/health/application/enforcement evidence. Its uncertainty survives hardening.
- The separate 19-frame generated capture is not the source of the authored observations. Its ICMP pair proves neither application access nor a VLAN/ACL bypass.

| Flows | Baseline model | Hardened model |
| --- | --- | --- |
| F1–F3: approved service controls | MODEL_CONSISTENT | MODEL_CONSISTENT |
| F4–F5: prohibited guest paths | MODEL_DEVIATION | MODEL_CONSISTENT |
| F6: corporate-to-management restriction | MODEL_CONSISTENT | MODEL_CONSISTENT |
| F7: incomplete corporate reports evidence | INCONCLUSIVE | INCONCLUSIVE |
| F8: unauthorized tuple | STOP_SCOPE | STOP_SCOPE |

`review-policy.py baseline` and `review-policy.py hardened` read local JSON only, with no network/device operations or extra Python dependencies. This is a small stateless teaching model, not vendor firewall syntax or NAT/IPv6/return-flow emulation. It can also flag contradictory complete observations as MODEL_INCONSISTENT. Browser-only learners review supplied reference results and label that activity differently from independently running the calculation; the browser command simulator is not a Python shell.

## Compatibility

Current catalogue: **50 Wireless lessons / 70 hours; 27 platform modules / 75 lessons**. Existing module, lesson, scenario and activity IDs remain stable; Preview 01–06 and account/grading schemas are unchanged. Progress migration checks retain prior lesson credit without granting completion for the new lessons. Public answers and local completion are participation/self-review, not certification.

## Verification actually performed

- **110 Phase 6 checks**: deterministic package, exact ZIP bytes and hashes, expected decisions, tuple-scope mutations, first-match shadowing, missing/contradictory observations, invalid actions, calculator import contract, capture references, catalogue, Preview and lesson links.
- **64 root browser checks**: 320/768/844-short-landscape/1440px, both themes and normal/reduced motion; map and lessons, availability disclosures, keyboard downloads, exact bytes, local completion, axe/reflow and runtime errors.
- **33 production `/SecCraft/` browser checks**, including service-worker-controlled offline navigation to a previously cached case JSON. Uncached files are not promised offline.
- Build and **43 frontend tests** passed. Learning/progress, route, no-dummy and whitespace checks passed. Lint: **0 errors / 70 existing warnings**; bundle-size warning remains.
- Earlier releases passed: foundations **337**, Phase 2 **74**, Phase 3 **94 with OpenSSL**, Phase 4 **101**, Phase 5 **126 with certificate generation and Scapy**.
- Artifact verification **238/238** and independent Scapy verification of **18 captures / 241 packets** passed. This phase does not change capture bytes.
- CI now includes the Phase 6 verifier and both browser modes; browser job limit raised to 70 minutes. Remote CI was not run.

Browser checks use offline API fixtures. They are not a full screen-reader evaluation, instructor review, learner pilot, RF test or external deployment availability check. Local preview success does not establish that an external preview URL works.

## Reproduce

```sh
python3 scripts/package-wireless-boundaries.py --check
python3 scripts/verify-wireless-phase6.py
python3 frontend/public/wireless-practice/WF-BOUND-06/review-policy.py baseline
python3 frontend/public/wireless-practice/WF-BOUND-06/review-policy.py hardened
node scripts/verify-learning-data.mjs
node scripts/verify-progress-state.mjs
npm test --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Browser runner: `scripts/ui-wireless-phase6-smoke.mjs`, using the existing `UI_AUDIT_MODULES`, `UI_AUDIT_EXECUTABLE` and `UI_AUDIT_URL` conventions. Use `UI_AUDIT_PRODUCTION=1` with the Pages emulator at `/SecCraft`. Regression log: `/home/user/phase6-regression.log`; build log: `/home/user/phase6-build.log`; screenshots: `.cache/ui-audit/wireless-phase6/`.

## Open gates and next phase

Live baseline/post-change application checks, effective client placement, route/ACL correlation, enforcement, endpoint authorization, controlled reset/teardown and independent review remain **NOT TESTED**. The model does not satisfy those gates or validate a future hosted platform.

Next is **Phase 7 — Independent Engagement and Professional Review**. An evidence-only capstone and professional handoff can be improved within current capabilities. An executable unseen assessment must wait for the earlier environment gates, independent review and scoring trust boundary. C-20 remains an evidence practicum and Northwind remains planning-only; neither should be retroactively presented as a secure certification exam.

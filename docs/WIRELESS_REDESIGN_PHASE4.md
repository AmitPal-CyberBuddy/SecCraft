# Wireless redesign — Phase 4 release

2026-10-01. **Offline implementation and automated checks completed. Live supplicant/AP/portal validation and independent learner/instructor review remain pending.** This is not a successful execution of the live-control gates in the roadmap.

## Delivered scope

Wireless remains **15 modules / 7 phases**, now **44 lessons / 64 estimated hours**. Android, account access, quiz banks, existing IDs and the six Wireless Preview modules are retained. The future module splits are not being presented as released modules: Phase 4 extends current Modules **12 and 14**, leaving Enterprise mechanisms for Phase 5.

| New lesson | Outcome |
| --- | --- |
| `12-deauth-disassoc/03-management-effects-and-controls` | Separate frame presence, transmitter attribution, receiver acceptance, client state and application effect; compare insufficient evidence, secure rejection and ambiguous causation |
| `12-deauth-disassoc/04-client-trust-and-attribution` | Correlate owner assertions with look-alike observations; distinguish security/profile compatibility from actual client selection; plan version-specific positive/negative controls |
| `14-captive-portals/02-session-and-boundary-evidence` | Reconstruct directional forwarding and distinguish transport, session authorization, guest isolation and routed-service policy |

The path's Phase 4 map includes a case entry point without adding another large release card. Existing availability disclosures remain visible: offline practice is available; hosted live execution is unavailable; optional owned equipment and actual local file tools are separate routes.

## WF-TRUST-04 case pack

`frontend/public/wireless-practice/WF-TRUST-04/` plus deterministic ZIP, **15 files**:

- Exact copies of existing deauth (22 frames), rogue-ap (20) and corrected captive-portal (17) captures and decoded views. No duplicate catalogue labs or new graded tasks are created.
- Fictional owner inventory with an approved isolated training look-alike: a meaningful alternative to automatically calling a same-name BSS malicious.
- Four authored client-profile hypotheses: incompatible Enterprise/PSK, disabled open-network autojoin, absent PSK, and known shared PSK with selection/access still unproven. They are not actual profile exports or executed client results.
- Three management model records: missing effect evidence, secure rejection with continuity, and a disconnect with restart/clock-confounding alternatives. These are not collected supplicant logs or a synchronized continuation of the captures.
- Portal policy/model records: ordinary access/denial controls, a subject-session mismatch, inconclusive internal-service non-response, and L2 peer forwarding. Layer and source/subject/session are explicit. Service names are planning aliases, not accessible test targets.
- Scope, independent worksheet, public rubric and SHA-256 manifest. All records distinguish authored models from packet bytes and from actual learner execution.

Public IPs/URLs embedded in the historical capture are explicitly **not permission to connect**. Future validation uses owner-approved aliases/endpoints and synthetic accounts only. No credential collection, rogue AP, disruption command sequence, portal server or arbitrary network probe is added. Karma/MANA applicability is conditional on actual profile/implementation/version evidence, not a universal promise from a tool name or directed probe.

## Correctness repairs

### Address roles and portal artifact

The shared decoder previously copied address 3 into `bssid` for all data frames and treated receiver/transmitter as end-to-end destination/source. It now follows ToDS/FromDS:

- Neither: BSSID address 3; SA address 2; DA address 1.
- ToDS only: BSSID address 1; SA address 2; DA address 3.
- FromDS only: BSSID address 2; SA address 3; DA address 1.
- Both: no BSSID field; SA address 4; DA address 3. Address 4 is consumed before payload decoding; a truncated fourth address is marked malformed.

The portal request's uplink header now has the AP as receiver and the broadcast end destination in address 3. The example peer is a unicast locally administered station (`02:66:77:88:99:aa`) rather than the former multicast-valued address. All four ARP hops now consistently decode the AP BSSID.

Only **captive-portal.pcapng** changed capture bytes in this phase; regenerated decoded exports, catalogue/manifest hashes and case copies remain coordinated. Updated the portal challenge's peer-address explanation and its generator template, retaining IDs, task count and scoring. The full challenge generator was not rerun. Replaced an always-true portal verifier assertion with the actual beacon/authentication/association sequence check.

These are targeted repairs, not a full standards certification of all synthetic fixtures. The rogue scene's intentionally unprotected post-handshake data and SA Query-shaped examples retain explicit limits. Do not combine old portal hashes with corrected files.

### Teaching corrections

- PMF explanation now distinguishes **unicast pairwise protection** from **group-addressed BIP/IGTK integrity**. A protection bit is not a verified MIC or receiver result.
- Removed stale Module 09/13 pointers from management-frame teaching.
- VLAN evidence no longer implies addressing/ARP alone identifies a VLAN; updated the portal local DHCP display-filter example.
- The guest isolation/segmentation scenario now explicitly treats missing ARP replies without health/forwarding evidence as inconclusive, not verified isolation. Its ID and selected best option remain stable; this corrects reasoning without creating a new graded assessment.

## Verification performed

- **101 Phase 4 checks**, or **114 with Scapy**: deterministic archive/hashes, literal three/four-address mappings, packet citations, externally decoded ARP addresses/DS bits/opcodes, identical forwarded ARP payloads, owner/model provenance, consistent/contradictory/inconclusive policy branches, lesson links and Preview boundary.
- Existing independent Scapy 2.7.0 catalogue pass: **18 captures / 240 packets**, including clock/export/RSN agreement after regeneration.
- Existing artifact suite **242/242**, foundations **337**, Phase 2 **74**, Phase 3 **94** with external OpenSSL, all passed. Existing case packages match their current manifests/archives.
- Learning-data contract: **27 platform modules / 69 lessons / 27 quiz banks / 126 questions / 29 labs (28 available, 3 answer-checked) / 22 challenges / 66 self-review tasks / 35 scenarios**.
- Progress tests explicitly preserve old Module 12/14 lesson credit, leave both new Module 12 units and the new Module 14 unit incomplete, and award no automatic XP. Historical migration/full-journey tests also pass. Current completion percentages can decrease as new lessons enter the denominator.
- **64 root browser checks** across 320/768/844-short-landscape/1440px, dark/light, normal/reduced motion: map entry, three lessons, visible availability, keyboard disclosure/download, exact file bytes, local completion, axe/reflow and runtime-error checks.
- **33 production `/SecCraft/` checks**, including actual service-worker-controlled cached JSON navigation offline. Uncached artifacts are not promised offline.
- Build, **43 frontend tests**, **71 internal destinations / 48 routes**, no-dummy/no-external-request and diff whitespace checks pass. Lint **0 errors / 70 warnings**; bundle-size warning remains.
- CI adds the new case, independent ARP and browser checks; browser ceiling increased to 60 minutes. Remote CI was not run.

The tests validate fixture consistency, packet interpretation and UI behavior, not live attacks or teaching effectiveness. Wireshark/TShark were not executed here; Scapy was. No live provider, physical RF, full screen-reader, supplicant, portal implementation, actual endpoint effects or real segmentation was validated. Local root/Pages-emulator success is not a claim that the external preview or deployed Pages site is available.

## Reproduce

```sh
python3 scripts/generate-lab-artifacts.py
python3 scripts/package-wireless-practice.py
python3 scripts/package-wireless-auth.py
python3 scripts/package-wireless-trust.py
python3 scripts/verify-wireless-phase4.py
python3 scripts/verify-wireless-phase4.py --scapy  # QA Scapy 2.7.0
python3 scripts/verify-labkit-interop.py --scapy
python3 scripts/verify-lab-artifacts.py
python3 scripts/verify-wireless-foundations.py
python3 scripts/verify-wireless-phase2.py
python3 scripts/verify-wireless-phase3.py --openssl
node scripts/verify-learning-data.mjs
node scripts/verify-progress-state.mjs
node scripts/verify-frontend-routes.mjs
npm test --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Browser runner: `scripts/ui-wireless-phase4-smoke.mjs`, with the established `UI_AUDIT_MODULES`, optional `UI_AUDIT_EXECUTABLE` and `UI_AUDIT_URL` conventions. Set `UI_AUDIT_PRODUCTION=1` and target the Pages emulator's `/SecCraft` path for production checks. Logs: `/home/user/phase4-*.log`; screenshots: `.cache/ui-audit/wireless-phase4/`.

## Outstanding gates / next phase

Actual bounded client/AP outcomes, measured receiver effects and application continuity, a deployed portal/session/ACL implementation, reset/isolation validation, supported client versions and instructor/learner pilot remain outstanding. Secure-negative outcomes here are **models**, not executed tests. The runtime limitation recorded in `WIRELESS_RUNTIME_FEASIBILITY.md` is unchanged; no hosting infrastructure was provisioned.

Next: **Phase 5 — Enterprise trust, EAP methods, certificate/name validation and RADIUS/policy correlation.** Keep protocol observations, administrative policy and real negotiated/forwarded outcomes separate, and do not report certificate acceptance or credential compromise from abbreviated teaching packets.

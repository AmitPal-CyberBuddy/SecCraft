# Wireless curriculum review, consolidation and pilot preparation

2026-10-01 · Follow-up to the seven-phase evidence-first redesign

## Executive decision

Keep the **15-module / seven-phase / 53-lesson** runtime. Correct inaccurate legacy material, teach prerequisites before applications, consolidate repeated walkthroughs, and pilot the remaining independent checkpoints before retiring their IDs. Do not turn every topic on an external reference site into another required module.

This pass adds no live-lab or certification claims. The path remains 73 **estimated** hours; a human pilot must calibrate that estimate. Existing progress IDs, Preview access, scenario answer IDs and account/grading schemas are preserved.

## Review scope and assurance level

The complete 53-lesson registry was inventoried for learning role, sequence, available evidence and overlap. All lesson files were scanned for stale claims, obsolete tool fields, links and shell examples. Risk-focused technical reading examined the older protocol/tool lessons and their associated scenario/quiz/challenge explanations, alongside the newer case contracts and existing artifact verification. Primary documentation was consulted for capture-tool roles, Wireshark fields and supplicant identity matching.

This is an implemented content/contract review with targeted primary-source checks—not independent line-by-line IEEE conformance certification, proof that every tool recipe runs, or a completed teaching pilot. The lesson ledger below records the intended learning role and editorial decision; human learning effectiveness remains to be measured.

## Corrections implemented

| Area | Issue found | Correction |
| --- | --- | --- |
| WEP construction | RC4 seed ordered key then IV | IV precedes the shared key; Privacy is not a WEP-specific bit; CCMP also exposes nonce-related packet-number data |
| WPA key hierarchy | One PTK/MIC diagram generalized to GCMP and modern AKMs | Scoped diagram to the legacy PSK/CCMP-128 fixture; 48-byte KCK/KEK/TK layout and AKM/cipher-dependent KDF/MIC caveat |
| RSN interpretation | Certificate validation implied by an AKM entry | An AKM does not reveal effective client trust/name policy |
| Frame categories | BSS transition listed as category 6 | WNM/BSS transition category 10; 6 is Fast BSS Transition |
| SSID and ESS | Empty SSID lacked frame context; same-name grouping implied one ESS | Distinguish wildcard probe from hidden beacon; confirm ESS administratively |
| 6 GHz | HT-only channel guidance and imprecise security label | HE/receiver context and WPA3/Enhanced Open profile distinctions; local rules remain required |
| WPA3 PMF | Pure-mode RSNE rule applied too broadly | SAE associations require PMF; transition BSS can advertise MFPC without universal MFPR |
| WPS | Expanded EAP type 254 treated as WPS by itself | WFA vendor/type identification is also required |
| PEAP controls | Subject substring treated as DNS-name validation; generic machine/user certificates prescribed for PEAP-MSCHAPv2 | domain_match versus scoped domain_suffix_match; explicit substring warning; managed server validation/password policy and a separately supported certificate/chaining migration |
| EAP-MD5 | Presented without WPA key-export limitation | Explicitly not a standalone key-generating WPA-Enterprise method |
| RADIUS reporting | Log spikes equated with attacks, full auth logs encouraged, weak VLAN proof standard | Alternative causes, minimized protected logging, effective session/route/control evidence; nastype is not an authentication control |
| Certificate availability | Older clinic said no certificate files ship | Points to WF-ENT-05 while keeping actual supplicant behavior unexecuted |
| Packet commands | Obsolete EAPOL/BOOTP fields, unverified lowercase RADIUS aliases, `_ws.col.Protocol`, and `-e http.cookie` on a `Set-Cookie` response | Current RSNA EAPOL/DHCP namespaces, `frame.protocols`, `http.set_cookie`, `wlan_rsna_eapol.keydes.data`, `radius.eap_fragment`, and full RADIUS tree inspection |
| Stored PCAP wire conformance | Wireshark 4.4.5 flagged `_ws.malformed` on truncated 4-byte ICMP Echo, missing EAP-MSCHAPv2 `Value-Size` and off-by-one EAP length, 1-byte SAE group ID, short HT/RM/TPC beacon IEs, raw WSC Expanded EAP, and unframed HTTP/TLS payloads | Fixed `wififorge_labkit.py` and `generate-lab-artifacts.py`; all 20 published captures (257 packets) now dissect with **0 `_ws.malformed` frames** in Wireshark 4.4.5 while preserving 238/238 artifact and Scapy checks |
| Retired lesson deep links | `LEGACY_MODULE_MAP` redirected merged modules, but retired lesson query parameters fell back to lesson index 0 | Added `LEGACY_LESSON_MAP` / `currentLessonId` in `legacy-module-map.ts` and `learningNavigation.ts`, tested in `verify-progress-state.mjs` |
| PMKID workflow | Wrong candidate path and --show used as if it performed an audit | Explicit working directory, correct wordlist path, audit then separate display step |
| Shell example | Multiline single-quoted display filter included literal continuation characters | One valid single-line management/EAPOL filter |
| Related assessments | Same certificate-name and field errors in a scenario/challenge hints; OWE labeled WPA3 | Aligned explanations/hints, unchanged answer IDs and quiz answer indexes |
| Production navigation | New cross-lesson links escaped the Pages base | Markdown /paths links use the router basename; verified on root and /SecCraft/ |

No capture bytes, case manifests or case ZIP contents were altered by these lesson corrections. The new standalone reference guide is an additional downloadable text asset.

## Consolidation and lesson grouping

### Consolidated now, without deleting progress

- **WPA2:** the worked first-station walkthrough belongs in the four-way-handshake lesson. The clinic now links to it and concentrates on the independent second-station decision.
- **Client trust:** the rogue-infrastructure lesson owns the frame map and the PMF lesson owns protection semantics. The clinic no longer repeats those paragraphs; it combines the separate cases into an independent claim decision.
- **Enterprise:** the test-plan lesson owns collection/correlation guidance. The clinic no longer repeats the three explanations and instead asks for a source-cited cross-boundary decision.

These are content consolidations, **not retired/merged lesson IDs**. Calling a checkpoint “independent” does not make it a hidden exam; public self-checks remain public.

### Sequence improved now

- WPA2: key hierarchy → four-way teaching → independent checkpoint → PMKID → external-tool audit workflow → bounded local candidate audit.
- Enterprise: roles → methods → method selection → available certificate-file verification → optional owned-client procedure → RADIUS mechanics → hardening → applied-policy evidence → integrated test plan → independent checkpoint.

### What should become one lesson?

The strongest candidates are **four-way teaching + checkpoint**, **rogue analysis + checkpoint**, and **Enterprise test plan + checkpoint**, but only if the pilot finds no additional transfer value in a separate attempt. Their duplicate exposition is already consolidated; the remaining decision tasks have distinct learning intent. Do not retire their records solely to reduce the count.

Do **not** merge certificate-file verification with live-client testing: they have different execution modes and evidence outcomes. Do not merge WEP into WPA2, WPS into SAE, portals into segmentation, or all Enterprise content into one large lesson. These would obscure distinct mechanisms or create an unwieldy unit. WEP is already a short single-lesson module. The earlier 20-to-15 module consolidation already removed several artificial boundaries.

Any later structural merge must ship an explicit historical-credit/deep-link policy, no duplicate XP, no inferred competence, and migration tests. Pilot decisions should measure confusion and transfer, not merely reading length.

## Suggested external resources: useful, but not equivalent

### HackTricks

Reviewed the complete [Wi-Fi methodology landing page](https://hacktricks.wiki/en/generic-methodologies-and-resources/pentesting-wifi/) and the introductory modern-Wi-Fi setup material. The entire linked subsite was **not** audited.

Its connection-boundary model aligns well with the current course: discover → associate → authenticate/keys → authorize → forward. Foundations, tools, recon, WEP, WPA2/PMKID, WPS, SAE/OWE, PMF, look-alikes, portals, EAP/RADIUS, monitoring and segmentation are already represented, although many are offline reasoning rather than live practice.

Useful gaps are now included as **recognition/scoping sections in existing lessons**, not padded into unsupported labs:

- k/v/r, MBSSID, 6 GHz and MLO; DPP; Passpoint/ANQP/OpenRoaming; mesh and direct-device setup in reconnaissance.
- KRACK/FragAttacks/SSID Confusion as different implementation/trust questions, with version/patch applicability before any vulnerability claim.
- IPv6, multicast/peer isolation, cross-AP paths and stale roaming roles in the boundary-scope lesson, explicitly outside the stateless calculator.

Dedicated execution for these features, Nexmon/mobile-radio support, mesh/peer-specific attacks and implementation exploit reproduction are deferred until suitable artifacts, equipment, review and scope exist. We do not claim the additions provide that depth.

### Pentest Cheat Sheet

Reviewed the complete [Wireless page](https://osodracpt.github.io/Pentest-Cheat-Sheet/wireless.html). Its basic monitor/capture/password workflow overlaps existing lessons. It is useful for teaching **critical command review**, not as a recommended copy-and-run procedure.

It names the interface-management tool in a capture example, includes incomplete or continuous deauthentication examples, supplies a transmit-power value without jurisdiction/capability context, and presents an older bridging workflow without an isolated-network contract. Those recipes were not imported. The tool lesson now asks learners to verify program roles, local syntax, permissions, limits and restoration before executing anything.

### Learner-facing reference guide

`frontend/public/wireless-practice/REFERENCE_GUIDE.md` gives the topic-to-module coverage table, both sources, warnings, official field/configuration references and optional research pointers. It is linked from relevant lessons and tested as an exact-byte keyboard download. External reading is optional and requires connectivity; it is not included in the offline completion requirement. Text added here is original explanation, not a copied external chapter.

## Pilot preparation

See **WIRELESS_LEARNER_PILOT.md** for recruitment targets, consent/privacy prerequisites, two bounded sessions, route-specific tasks, observer template, proposed revision triggers, merge experiments and required reviewer deliverables.

**Prepared, not performed:** no people were recruited, no learner data collected, no independent instructor approved the course and no live environment was tested. A coordinator and willing participants are needed to run this next stage. The plan deliberately separates browser-only practice from optional local-tool operation and does not convert XP into competence.

## Verification performed

- Cross-phase verifier: **794 checks across all 53 lessons**, covering structure, local asset/cross-lesson links, Bash parseability, allowlisted offline command shapes, corrected concepts and prerequisite order.
- **Wireshark 4.4.5 (`libwireshark` WebAssembly via `@goodtools/wiregasm@1.9.1`) executed across all 20 published captures (257 packets), all 37 lesson `tshark -r` examples, and all 50 challenge hint filters/fields (`node scripts/verify-wireless-wireshark.mjs`).** Every capture loads with **0 `_ws.malformed` frames**, every `-Y` display filter and `-e` field compiles in `libwireshark`, and every non-empty teaching query populates its requested `-e` fields in the dissected `ProtoTree`. Native OS `tshark` CLI binary execution remains optional via `python3 scripts/verify-wireless-curriculum.py --tshark` (which fails strictly if the binary is absent).
- Browser: **61 lesson renders/deep links on root + 61 under /SecCraft/**. Each run checks all 53 at 320px dark/reduced motion and eight representative revised lessons at 1440px light/normal motion; **16 axe audits per run**, all-page overflow/runtime checks, real cross-lesson navigation and exact keyboard guide download.
- Build and **43 frontend tests** passed after the navigation fix. Learning/progress contracts and **74 internal destinations / 48 SPA routes** passed. IDs, local credit and Preview boundaries remain intact.
- Existing release suites: foundations **337**, Phase 2 **74**, Phase 3 **94 with OpenSSL**, Phase 4 **101**, Phase 5 **126 with certificate generation/Scapy**, Phase 6 **110**, Phase 7 **75**.
- Artifact checks **238/238**; independent Scapy verification **18 captures / 241 packets**.
- Lint **0 errors / 70 existing warnings**; bundle-size warning remains. CI includes static curriculum checks and both browser modes; remote CI was not run. The optional TShark execution gate is not silently counted as CI-passed.

Browser checks used offline API fixtures. This pass does not claim a full assistive-technology user evaluation, complete theme/viewport Cartesian matrix, fresh service-worker offline testing, live RF/AAA/service enforcement, external preview availability or completed learner pilot.

Logs: `/home/user/curriculum-build.log`, `/home/user/curriculum-regression.log`, `/home/user/curriculum-frontend-tests.log`. Browser snapshots: `.cache/ui-audit/curriculum/`. Do not overwrite historical phase reports: their counts and test results describe their release dates.

## Lesson-by-lesson editorial ledger

Each row retains its registered ID. “Retain” means it has a distinct intended role; it is not an independent teaching-quality sign-off. All rows received the cross-phase structural/link/command scan. Technical corrections and sequencing notes identify the targeted changes above.

| Module / lesson ID | Learning role | Decision |
| --- | --- | --- |
| `01-intro-wireless/00-network-and-tool-primer` | Networking and offline capture primer | Retain readiness/scope distinction; pilot novice terminology |
| `01-intro-wireless/01-why-wireless-is-different` | Why wireless changes the threat model | Retain readiness/scope distinction; pilot novice terminology |
| `01-intro-wireless/02-scope-and-assessment-decisions` | From permission to an assessment decision | Retain readiness/scope distinction; pilot novice terminology |
| `02-wifi-fundamentals/01-identity-topology-and-beacons` | Identity, topology and reading a beacon | Retain protocol inventory versus RF reasoning; correct discovery/band context |
| `02-wifi-fundamentals/02-rf-and-client-observation` | RF and client observations without guessing | Retain protocol inventory versus RF reasoning; correct discovery/band context |
| `03-80211-architecture/01-frames-ies-and-association` | Frames, information elements and the association flow | Retain mechanism, worked decode and independent case; correct frame/category/filter text |
| `03-80211-architecture/02-worked-rsn-decode` | Worked RSN byte decode and evidence decision | Retain mechanism, worked decode and independent case; correct frame/category/filter text |
| `03-80211-architecture/03-foundations-independent-case` | Independent foundations case: evidence to decision | Retain mechanism, worked decode and independent case; correct frame/category/filter text |
| `04-kali-wireless-setup/01-monitor-mode-and-toolchain` | Monitor mode, injection and the toolchain | Retain mode concepts, optional hardware worksheet and diagnosis; add source-quality exercise |
| `04-kali-wireless-setup/02-owned-lab-readiness` | Owned-lab readiness and passive collection | Retain mode concepts, optional hardware worksheet and diagnosis; add source-quality exercise |
| `04-kali-wireless-setup/03-capability-troubleshooting` | Capability troubleshooting and practice routes | Retain mode concepts, optional hardware worksheet and diagnosis; add source-quality exercise |
| `05-wireless-recon/01-passive-recon-workflow` | Passive reconnaissance workflow (lab) | Retain capture walkthrough versus coverage plan; add optional modern-feature inventory |
| `05-wireless-recon/02-coverage-and-inventory` | Coverage planning and scoped inventory | Retain capture walkthrough versus coverage plan; add optional modern-feature inventory |
| `06-traffic-analysis/01-evidence-workflow` | From capture to evidence (lab) | Retain packet sequence versus timeline/provenance; modernize DHCP/EAPOL fields |
| `06-traffic-analysis/02-timeline-and-evidence-handoff` | Timeline correlation and evidence handoff | Retain packet sequence versus timeline/provenance; modernize DHCP/EAPOL fields |
| `07-wep-legacy/01-wep-design-failure` | WEP: why the design fails | Keep one short legacy lesson; correct IV order/privacy/nonce comparison |
| `08-wpa-wpa2/01-rsn-key-hierarchy` | RSN and the key hierarchy | Resequence prerequisites; correct scoped crypto/tool workflow |
| `08-wpa-wpa2/02-four-way-handshake-lab` | Reading the 4-way handshake (lab) | Resequence prerequisites; correct scoped crypto/tool workflow |
| `08-wpa-wpa2/03-handshake-decision-clinic` | Handshake evidence: guided and independent decision | Repeated walkthrough consolidated into core lesson; retain independent checkpoint pending pilot merge decision |
| `08-wpa-wpa2/02-pmkid-clientless-lab` | PMKID: reduced-handshake capture (lab) | Resequence prerequisites; correct scoped crypto/tool workflow |
| `08-wpa-wpa2/01-offline-audit-lab` | Offline audit workflow (lab) | Resequence prerequisites; correct scoped crypto/tool workflow |
| `08-wpa-wpa2/04-bounded-candidate-audit` | Bounded candidate audit and non-recovery | Resequence prerequisites; correct scoped crypto/tool workflow |
| `10-wps/01-wps-architecture-and-pin` | WPS architecture and the PIN flaw | Retain PIN mechanism versus applicability/budget; qualify Expanded EAP type |
| `10-wps/02-applicability-lockout-and-budget` | WPS applicability, lockout and test budgets | Retain PIN mechanism versus applicability/budget; qualify Expanded EAP type |
| `11-wpa3/01-sae-and-transition-mode` | SAE, transition mode and OWE | Retain mechanism versus control decisions; clarify transition PMF |
| `11-wpa3/02-policy-negotiation-and-negative-controls` | Policy, negotiation and negative controls | Retain mechanism versus control decisions; clarify transition PMF |
| `12-deauth-disassoc/01-pmf-and-availability` | PMF and availability testing | Retain separate protection, ownership and client-policy questions; add version-applicability awareness |
| `12-deauth-disassoc/01-rogue-infrastructure-analysis` | Rogue infrastructure analysis (lab) | Retain separate protection, ownership and client-policy questions; add version-applicability awareness |
| `12-deauth-disassoc/02-lookalike-decision-clinic` | Look-alike and PMF evidence clinic | Repeated walkthrough consolidated into core lesson; retain independent checkpoint pending pilot merge decision |
| `12-deauth-disassoc/03-management-effects-and-controls` | Management-frame effects and defensive controls | Retain separate protection, ownership and client-policy questions; add version-applicability awareness |
| `12-deauth-disassoc/04-client-trust-and-attribution` | Client trust and infrastructure attribution | Retain separate protection, ownership and client-policy questions; add version-applicability awareness |
| `14-captive-portals/01-portal-and-isolation` | Portal testing and client isolation (lab) | Retain packet/web-session versus boundary-model decisions |
| `14-captive-portals/02-session-and-boundary-evidence` | Portal sessions and guest-boundary evidence | Retain packet/web-session versus boundary-model decisions |
| `15-enterprise-fundamentals/01-architecture-and-roles` | 802.1X architecture and roles | Resequence methods/certificates/AAA; correct identity/remediation/evidence claims |
| `15-enterprise-fundamentals/01-methods-and-credential-exposure` | EAP methods and credential exposure | Resequence methods/certificates/AAA; correct identity/remediation/evidence claims |
| `15-enterprise-fundamentals/04-method-selection-and-trust-boundaries` | Method selection and trust boundaries | Resequence methods/certificates/AAA; correct identity/remediation/evidence claims |
| `15-enterprise-fundamentals/05-certificate-identity-validation` | Certificate chain, name and purpose validation | Resequence methods/certificates/AAA; correct identity/remediation/evidence claims |
| `15-enterprise-fundamentals/02-cert-validation-and-lab` | Certificate validation and the PEAP lab | Resequence methods/certificates/AAA; correct identity/remediation/evidence claims |
| `15-enterprise-fundamentals/01-radius-mechanics-and-verification` | RADIUS mechanics and verifiable integrity | Resequence methods/certificates/AAA; correct identity/remediation/evidence claims |
| `15-enterprise-fundamentals/02-hardening-and-monitoring` | RADIUS hardening, RadSec and monitoring | Resequence methods/certificates/AAA; correct identity/remediation/evidence claims |
| `15-enterprise-fundamentals/06-radius-to-applied-policy` | RADIUS correlation and applied policy | Resequence methods/certificates/AAA; correct identity/remediation/evidence claims |
| `15-enterprise-fundamentals/02-enterprise-testing-lab` | Testing the enterprise path (lab) | Resequence methods/certificates/AAA; correct identity/remediation/evidence claims |
| `15-enterprise-fundamentals/03-enterprise-decision-clinic` | Enterprise trust-boundary evidence clinic | Repeated walkthrough consolidated into core lesson; retain independent checkpoint pending pilot merge decision |
| `18-corporate-attacks/01-kill-chain-and-segmentation` | Separate an attack narrative from segmentation evidence | Retain packet limits, detection and exact model/retest stages; add unmodeled-path scope |
| `18-corporate-attacks/02-detection-and-response` | Detection, containment and response | Retain packet limits, detection and exact model/retest stages; add unmodeled-path scope |
| `18-corporate-attacks/03-boundary-map-and-test-scope` | Boundary mapping and exact test scope | Retain packet limits, detection and exact model/retest stages; add unmodeled-path scope |
| `18-corporate-attacks/04-policy-order-and-evidence-controls` | Policy order, health and evidence controls | Retain packet limits, detection and exact model/retest stages; add unmodeled-path scope |
| `18-corporate-attacks/05-retest-and-supported-impact` | Comparable retests and supported impact | Retain packet limits, detection and exact model/retest stages; add unmodeled-path scope |
| `20-final-assessment/01-methodology-and-roe` | Methodology, scope and rules of engagement | Retain scope, technical case, attempt, review and handoff; pilot reporting overhead |
| `20-final-assessment/02-independent-capture-case` | Independent capture case C-20 | Retain scope, technical case, attempt, review and handoff; pilot reporting overhead |
| `20-final-assessment/03-independent-attempt-and-decision-log` | Independent attempt and decision log | Retain scope, technical case, attempt, review and handoff; pilot reporting overhead |
| `20-final-assessment/04-findings-non-findings-and-review` | Findings, non-findings and review | Retain scope, technical case, attempt, review and handoff; pilot reporting overhead |
| `20-final-assessment/05-client-handoff-and-retest-closure` | Client handoff and retest closure | Retain scope, technical case, attempt, review and handoff; pilot reporting overhead |

## Next decision

Run the prepared formative pilot and independent technical review, then decide the three checkpoint merges from observed learning value. Separately resolve the full Enterprise and post-association execution gates before expanding into a hosted capstone. Neither extra external links nor a shorter lesson list substitutes for those outcomes.

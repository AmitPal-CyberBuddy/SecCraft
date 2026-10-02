# Owner Decision Matrix — content ownership and classification

*Status: owner decision aid · 2 October 2026 · derived from `CONTENT_MIGRATION_MANIFEST.json` and `CONTENT_MIGRATION_REVIEW.md`. No migration or runtime change is authorized or implemented.*

This matrix reduces 159 item decisions to ten non-overlapping policy groups. Item-level source paths, hashes, stable IDs, and destinations remain in [`CONTENT_MIGRATION_REVIEW.md`](CONTENT_MIGRATION_REVIEW.md) and [`../content/migration/CONTENT_MIGRATION_MANIFEST.json`](../content/migration/CONTENT_MIGRATION_MANIFEST.json). A group decision applies only to the membership rule stated here; exceptions remain item-level decisions.

## 1. Already decided by the architecture

These do not need to be reconsidered merely because they occur in an audit.

### Public by design

| Content | Existing decision | Boundary |
|---|---|---|
| Wireless sample lesson | `01-intro-wireless/02-scope-and-assessment-decisions` | Public sample, not an access tier |
| Wireless sample files | `README.md`, `authorized-inventory.csv`, `scope.md`, `worksheet.md` only | Exactly these four; hash-pin the approved versions |
| Android sample lesson | `android-01-platform/01-architecture-sandbox-and-trust-boundaries` | Public sample, not an access tier |
| Catalogue and public-reference metadata | Titles, descriptions, objectives, prerequisites, duration, skills, maturity and approved references | Whitelist projection only; no bodies, prompts, answers or solutions |

The migration manifest currently records 14 `KEEP_PUBLIC` entries covering these decisions.

### Protected by design

| Content | Classification | Reason |
|---|---|---|
| Answer keys, expected answers and grading metadata | Server-only | Learner delivery would disclose the grader |
| Solutions and model feedback | Protected; policy-gated after attempt where approved | Not public; reveal timing is separate from access |
| Instructor keys/material | Instructor/owner-only | Never part of the normal learner payload |
| Verification keys, rubrics and process material | Server-only | Required for trustworthy evidence |
| Learner-only lesson, lab and scenario bodies/prompts | Protected learner content | Active approved accounts only |
| Artifacts that reveal an answer or verification process | Server-only or policy-gated, based on use | Never public merely because currently exposed |

The manifest already records 370 `MOVE_TO_PROTECTED_CONTENT` entries. Within the 159 review inventory, five items are also effectively decided by these rules:

* `frontend/public/wireless-foundations/WF-FND-01.zip` — the full pack is explicitly not an approved public sample.
* `frontend/public/wireless-foundations/WF-FND-01/self-review.md` — expected-answer/self-review material.
* `frontend/public/wireless-practice/WF-AUTH-03/reference-results.json`.
* `frontend/public/wireless-practice/WF-BOUND-06/reference-results.json`.
* `frontend/public/wireless-practice/WF-ENT-05/reference-results.json`.

These five should become protected when the manifest is eventually revised, after the owner accepts this matrix. They are included in group totals below so all 159 entries still reconcile.

## 2. Decision-group summary

| # | Decision group | Source items | Related findings | Current classification | Proposed classification | Proposed destination |
|---:|---|---:|---:|---|---|---|
| 1 | PCAPs | 34 | 68 | Needs explicit owner review; currently public | **Protected learner content by default**, with individually approved public teaching captures as exceptions | Private Supabase Storage + PostgreSQL metadata; public sample projection only for exceptions |
| 2 | Wireless practice pack components | 67 | 67 | Needs explicit owner review; currently public | **Split by role:** learner inputs protected; answer/grader files server-only; deliberately general resources may be public | PostgreSQL for structured instructions; private Storage for files; server-only tables for answer material |
| 3 | Lab JSON | 18 | 18 | Needs explicit owner review; currently public | **Protected learner evidence input by default**; split answer/model fields server-side | PostgreSQL when structured/queryable, otherwise private Storage + metadata |
| 4 | Downloadable archives | 9 | 18 | Needs explicit owner review; currently public | **Protected by default**; public only if every member is independently public-approved | Private Storage; avoid a public archive that bypasses member decisions |
| 5 | Checksums | 11 | 11 | Needs explicit owner review; currently public | **Inherit parent object access** | Beside private object metadata in PostgreSQL/Storage; public only for public objects |
| 6 | Android packs/source | 5 | 5 | Needs explicit owner review; currently public | **Needs genuine owner choice:** public educational source or protected learner input | Public resource projection or private Storage, according to decision |
| 7 | Self-review material | 4 | 4 | Needs explicit owner review in manifest; currently public | **Protected by design**; reveal only under an approved post-attempt policy | PostgreSQL solution table or private Storage; never unconditional public delivery |
| 8 | Reference guides | 2 | 2 | Needs explicit owner review; currently public | **Needs content-purpose choice:** public general reference or protected learner guide | Public resource projection or protected PostgreSQL/Storage |
| 9 | hostapd teaching configurations | 5 | 0 | Needs explicit owner review; authored outside public tree | **Needs genuine owner choice:** public protocol reference or protected lab input | Public reference projection or private Storage |
| 10 | Other/miscellaneous | 4 | 4 | Needs explicit owner review; currently public | Decide individually: public metadata, protected learner evidence, or protected case guidance | PostgreSQL or Storage according to role |
| | **Total** | **159** | **197** | | | |

There are 43 build-copy findings beyond their source findings (34 PCAP copies and 9 archive copies). The five hostapd decisions have no current leak finding, so the net difference is 197 findings minus 159 source decisions = 38. Build copies do not create additional source decisions.

## 3. Group decision cards

### G1 — PCAPs

| Field | Decision detail |
|---|---|
| Source items / findings | **34 / 68** |
| Examples | `frontend/public/pcaps/wifi-fundamentals/beacon-only.pcapng`; `frontend/public/pcaps/capstone/capstone-retest.pcapng`; `frontend/public/wireless-practice/WF-TRUST-04/rogue-ap.pcapng` |
| Content purpose | Packet evidence for lab analysis, scenarios and capstones |
| Current classification | `REVIEW_CLASSIFY`; publicly downloadable and copied into the build |
| Proposed classification | Protected learner content by default. Permit a public capture only when it is intentionally a public teaching sample and reveals no answer/verification process. |
| Proposed destination | Private Storage object; PostgreSQL artifact record with stable ID, release, media type, size and SHA-256. Explicit public projection for approved exceptions. |
| Why it matters | Public captures may reveal expected evidence or enable full exercise completion, but some synthetic captures can be useful public teaching resources. “It is synthetic” does not itself decide access. |
| Exact owner decision | **Choose:** (A) all PCAPs protected; (B) approve a named public subset; or (C) publish a named sample pack. List exceptions by stable ID/path. |
| Traceability | Manifest filter: `classification=REVIEW_CLASSIFY` and extension `.pcap`, `.pcapng` or `.cap`; 34 item rows in review table. |

### G2 — Wireless practice pack components

| Field | Decision detail |
|---|---|
| Source items / findings | **67 / 67** (excluding PCAPs, archives, checksums, reference guides and self-review files, which have their own groups) |
| Examples | `WF-AUTH-03/audit.py`; `WF-AUTH-03/candidates.txt`; `WF-BOUND-06/guided.json`; `WF-TRUST-04/worksheet.md` |
| Content purpose | Scope, worksheets, scripts, candidate data, guided/independent exercises and evidence files |
| Current classification | `REVIEW_CLASSIFY`; publicly exposed as unpacked pack contents |
| Proposed classification | Split by intended role: learner inputs/instructions protected; answer/reference-result fields server-only; genuinely general resources public only by deliberate approval. |
| Proposed destination | Structured instructions in PostgreSQL; downloadable inputs in private Storage; answer/grader material in server-only tables. |
| Why it matters | One folder mixes roles. A blanket public or blanket learner-readable decision would either overexpose answers or unnecessarily hide legitimate public resources. |
| Exact owner decision | **Choose a default for each of the six packs** (`WF-AUTH-03`, `WF-BOUND-06`, `WF-ENT-05`, `WF-OPS-02`, `WF-REVIEW-07`, `WF-TRUST-04`): protected full exercise, public selected inputs, or public pack. Identify public exceptions; answer-bearing files remain protected regardless. |
| Traceability | Manifest/review-table paths under `frontend/public/wireless-practice/`, after excluding the other named groups. |

### G3 — Lab JSON

| Field | Decision detail |
|---|---|
| Source items / findings | **18 / 18** |
| Examples | `lab-data/beacon-only.json`; `lab-data/methodology.json`; `lab-data/capstone-baseline.json` |
| Content purpose | Parsed/derived packet evidence used by browser labs and offline analysis |
| Current classification | `REVIEW_CLASSIFY`; public build input |
| Proposed classification | Protected learner evidence by default. Split any expected-result, answer or model fields into server-only/solution records. |
| Proposed destination | PostgreSQL JSON where field-level delivery/querying matters; otherwise private Storage with an artifact record. |
| Why it matters | JSON may duplicate a capture for accessibility/offline use, but may also make expected findings easier to infer than raw evidence. Its role—not format—determines access. |
| Exact owner decision | **Choose:** keep all as protected learner evidence, approve named public accessibility datasets, or regenerate learner-safe projections with answer/model fields removed. |
| Traceability | Manifest paths under `frontend/public/lab-data/*.json`. |

### G4 — Downloadable archives

| Field | Decision detail |
|---|---|
| Source items / findings | **9 / 18** |
| Examples | `wireless-foundations/WF-FND-01.zip`; `wireless-practice/WF-AUTH-03.zip`; `android-demos/notes-boundary-source.zip` |
| Content purpose | Convenience bundles containing source, evidence, worksheets and sometimes answer-bearing material |
| Current classification | `REVIEW_CLASSIFY`; public source and build copy |
| Proposed classification | Protected by default. An archive may be public only when every included member is independently approved public and the archive hash is approved. `WF-FND-01.zip` is already decided protected. |
| Proposed destination | Private Storage; optional generated public archive only from the approved-public allow-list. |
| Why it matters | A public archive can silently bypass item-level controls and expose files intentionally removed from public pages. |
| Exact owner decision | **Choose for each archive:** protected, public with all current members, or regenerate from a named public subset. No “inherit from current location.” |
| Traceability | Manifest filter by archive extensions; review rows include all nine paths. |

### G5 — Checksums

| Field | Decision detail |
|---|---|
| Source items / findings | **11 / 11** |
| Examples | `android-foundations/SHA256SUMS`; `WF-FND-01/SHA256SUMS`; `WF-TRUST-04/SHA256SUMS` |
| Content purpose | Integrity verification for downloadable packs/files |
| Current classification | `REVIEW_CLASSIFY`; public |
| Proposed classification | Inherit each referenced object/pack’s final access. Do not independently expose private filenames/object layout. |
| Proposed destination | PostgreSQL artifact metadata and/or a manifest beside the same-access Storage objects; public checksum only for public artifacts. |
| Why it matters | A checksum is not usually secret, but may reveal private filenames, release inventory and object relationships; mismatched access also causes unusable public manifests. |
| Exact owner decision | **Approve policy:** checksum manifests always inherit the strictest access of their members, with separate generated manifests for public subsets. |
| Traceability | Manifest paths ending `SHA256SUMS`. |

### G6 — Android packs/source

| Field | Decision detail |
|---|---|
| Source items / findings | **5 / 5** (archives, checksums and reference guide handled separately) |
| Examples | `android-cases/cases.json`; `android-foundations/AndroidManifest.xml`; `android-foundations/LinkActivity.kt` |
| Content purpose | Synthetic source excerpts and foundation code used for Android analysis |
| Current classification | `REVIEW_CLASSIFY`; public |
| Proposed classification | Genuine owner choice. Public if intended as open teaching source and answer-safe; otherwise protected learner lab input. Mixed case feedback must be split server-side. |
| Proposed destination | Public static/resource projection or private Storage; structured cases in PostgreSQL with feedback separated. |
| Why it matters | Source can be a valuable public sample, but vulnerable/fixed pairs and feedback can disclose exercise answers. The approved Android sample lesson does not automatically approve every Android artifact. |
| Exact owner decision | **Choose:** approve named foundation source files as public, or protect all Android lab source. Separately confirm that case feedback/fixed solutions remain protected. |
| Traceability | Review entries under `frontend/public/android-cases/` and `android-foundations/`, excluding checksum/archive/reference groups. |

### G7 — Self-review material

| Field | Decision detail |
|---|---|
| Source items / findings | **4 / 4** |
| Examples | `WF-FND-01/self-review.md`; three `reference-results.json` files |
| Content purpose | Expected results, model reasoning and self-assessment feedback |
| Current classification | `REVIEW_CLASSIFY`; currently public |
| Proposed classification | Protected by design; solution material with an explicit reveal policy. |
| Proposed destination | PostgreSQL solution/model-feedback records, or private Storage if document fidelity is required. |
| Why it matters | Unconditional publication reveals expected outcomes and undermines the exercise. Active learner access still must respect reveal timing. |
| Exact owner decision | **Confirm policy:** reveal after first submitted attempt, after completion, or instructor-only. Public is not proposed. |
| Traceability | The four exact paths listed in §1’s effectively-decided set. |

### G8 — Reference guides

| Field | Decision detail |
|---|---|
| Source items / findings | **2 / 2** |
| Examples | `android-practice/REFERENCE_GUIDE.md`; `wireless-practice/REFERENCE_GUIDE.md` |
| Content purpose | Cross-exercise commands, workflows and interpretation guidance |
| Current classification | `REVIEW_CLASSIFY`; public |
| Proposed classification | Decide after content-purpose review: public general reference if answer-safe, or protected learner guide if it shortcuts exercises. |
| Proposed destination | Public resource projection or protected PostgreSQL/Storage. |
| Why it matters | Hiding generic knowledge is unnecessary, but guides may contain pack-specific procedures or expected outputs. |
| Exact owner decision | **Choose per guide:** public by design, protected learner resource, or split into a public generic guide plus protected exercise guidance. |
| Traceability | The two `REFERENCE_GUIDE.md` manifest entries. |

### G9 — hostapd teaching configurations

| Field | Decision detail |
|---|---|
| Source items / findings | **5 / 0** |
| Examples | `content/configs/hostapd-wpa2-bad.conf`; `hostapd-wpa3-only-good.conf`; `hostapd-wps-enabled.conf` |
| Content purpose | Good/bad configuration examples and lab inputs |
| Current classification | `REVIEW_CLASSIFY`; not currently counted as public-build leaks |
| Proposed classification | Genuine owner choice: public protocol/configuration references or protected learner exercise inputs. |
| Proposed destination | Public reference projection or private Storage with PostgreSQL artifact metadata. |
| Why it matters | Config syntax is not secret, but “good/bad” labels and paired comparisons may encode an exercise answer. |
| Exact owner decision | **Choose:** public all five as explicit examples, protected all five as lab inputs, or publish neutralized examples and retain labelled versions as protected. |
| Traceability | Manifest entries `migration-0539` through `migration-0543`. |

### G10 — Other/miscellaneous

| Field | Decision detail |
|---|---|
| Source items / findings | **4 / 4** |
| Exact members | `frontend/public/pcaps/MANIFEST.md`; `frontend/public/pcaps/capstone/CASE_NOTES.md`; `WF-FND-01/baseline-frames.json`; `WF-FND-01/follow-up-frames.json` |
| Content purpose | Capture inventory/limitations, case guidance and parsed frame evidence |
| Current classification | `REVIEW_CLASSIFY`; public |
| Proposed classification | `pcaps/MANIFEST.md` may be public metadata if answer-safe; case notes and frame evidence protected by default because the full Wireless pack is not public. |
| Proposed destination | Public metadata projection for an approved manifest; otherwise PostgreSQL or private Storage. |
| Why it matters | These do not share one role, so a broad artifact policy would be inaccurate. The frame JSON is specifically outside the four-file Wireless sample. |
| Exact owner decision | **Decide each of four:** public metadata/resource, protected learner evidence, or server-only guidance. Confirm the two frame JSON files are not part of the public Wireless sample. |
| Traceability | Exact paths above correspond to four review-table rows. |

## 4. Recommended decision order

To minimize exceptions:

1. Confirm G7 self-review as protected and `WF-FND-01.zip` as protected (already implied by prior decisions).
2. Decide whether any PCAPs are intentionally public (G1); defaulting to protected resolves 34 items.
3. Decide pack-level policy and named public exceptions for each Wireless pack (G2/G4/G5).
4. Decide whether Lab JSON follows its PCAP or gets a learner-safe projection (G3).
5. Decide Android source openness (G6) and both guide policies (G8).
6. Decide configuration examples (G9) and the four miscellaneous files (G10).

## 5. Decision response template

The owner can respond compactly while preserving explicit exceptions:

```text
G1 PCAPs: [A all protected | B protected except: <paths/IDs> | C named public sample pack: <paths/IDs>]
G2 Wireless packs: <policy per pack + public/server-only exceptions>
G3 Lab JSON: [protected | public exceptions | regenerate projections]
G4 Archives: <policy per archive, or protected all except ...>
G5 Checksums: [approve inherit-strictest-access policy | changes]
G6 Android source: <public files / protected files>
G7 Self-review: [after attempt | after completion | instructor-only]
G8 Reference guides: <public / protected / split per guide>
G9 hostapd configs: [public | protected | neutral public + labelled protected]
G10 Other: <decision for each of four paths>
```

# NOT READY FOR MIGRATION

The matrix reduces review complexity but does not decide the groups. The system remains not ready until the owner supplies these classifications and the item-level manifest is updated and re-reviewed. No implementation begins from this document alone.

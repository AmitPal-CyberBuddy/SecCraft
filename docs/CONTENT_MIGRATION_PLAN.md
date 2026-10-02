# Content migration plan and dry-run manifest

*Status: owner-review draft · 2 October 2026 · dry-run only. This plan creates no database or Storage objects, makes no network connection, changes no deployment or repository visibility, and migrates no content.*

## 1. Boundary and objective

The existing SecCraft repository remains the only repository. After the frontend has moved to Render and that deployment has been verified, this same repository may become private. Only then may protected authored content be established here and imported. No second content repository is planned.

```text
Existing SecCraft repository (future private)
  protected authored content
       │
       ▼
  content importer ──► Supabase PostgreSQL  structured/versioned content
                   └─► Supabase Storage     large/private artifacts

Public /paths and sample projection          metadata + approved samples only
Authenticated /learn API                     server-authorized content delivery
```

A release must be updateable through this pipeline without rebuilding or deploying the backend. PostgreSQL/Storage hold runtime releases; the backend selects the active release and authorizes every read. The browser never receives protected content for UI-only hiding.

## 2. Deliverables and reproducibility

* Machine-readable inventory: [`../content/migration/CONTENT_MIGRATION_MANIFEST.json`](../content/migration/CONTENT_MIGRATION_MANIFEST.json).
* Schema: [`../content/schemas/content-migration-manifest.schema.json`](../content/schemas/content-migration-manifest.schema.json).
* Generator: `node scripts/generate-content-migration-manifest.mjs` after a production frontend build.
* Validator: `node scripts/verify-content-contract.mjs`.

The generator is local-only: it reads repository files, computes hashes, imports the report-only scanner, and writes JSON. It contains no database, Supabase, GitHub, or Render client. Every entry records source path, type, career/path/module/content identity where determinable, classification, future target, release, reason, and artifact size/hash/media type where applicable.

## 3. Dry-run result

| Classification | Manifest entries | Meaning |
|---|---:|---|
| `KEEP_PUBLIC` | 14 | Five catalogue sources, three public references, two approved lesson bodies, and exactly four approved Wireless sample files |
| `MOVE_TO_PROTECTED_CONTENT` | 529 | Protected learner content, server-only keys/solutions/mixed archives, instructor material, all 34 PCAPs, all 18 Lab JSON files, all current archives/guides/configurations and the remaining owner-resolved artifacts |
| `REVIEW_CLASSIFY` | 0 | Owner decisions G1–G10 were approved; unresolved classifications are now rejected by validation |
| **Total** | **543** | Every source boundary and logical import record has a final access class and destination |

`KEEP_PUBLIC` means public by design; it is not a maturity tier. Protected entries additionally carry `protected-learner`, `server-only`, or `instructor-only` delivery classes.

## 4. Approved public samples

* Wireless lesson: `01-intro-wireless/02-scope-and-assessment-decisions`.
* Wireless artifacts, and only these four:
  * `README.md`
  * `authorized-inventory.csv`
  * `scope.md`
  * `worksheet.md`
* The Wireless zip, captures, frame JSON, checksums, self-review, and full pack are not approved public samples.
* Android lesson: `android-01-platform/01-architecture-sandbox-and-trust-boundaries`.

These are public samples, not an access tier. The contract test fails if the Wireless sample artifact set expands or includes the zip.

## 5. Leak-audit reconciliation

The committed manifest records the approved **317 post-build findings** individually and links each one to a migration entry and reason. No finding is unmapped.

| Finding classification | Findings | Interpretation |
|---|---:|---|
| `KEEP_PUBLIC` | 6 | Two approved sample lesson bodies plus exactly four approved Wireless sample artifacts |
| `MOVE_TO_PROTECTED_CONTENT` | 311 | All other findings now have final protected learner/server/instructor classifications |
| `REVIEW_CLASSIFY` | 0 | No unresolved owner decisions remain |
| **Total** | **317** | Baseline only; CI remains report-only |

The target is **zero unintended protected-content exposure in public build/API**, not zero findings. Future enforcement must allow schema-approved catalogue fields and hash-pinned approved samples while rejecting protected records and any unapproved artifact.

## 6. Proposed migration sequence (not executed)

1. **Owner decisions (complete):** all G1–G10 classifications are encoded; validation rejects any remaining `REVIEW_CLASSIFY` entry.
2. **Prerequisite hosting gate:** prepare and verify Render Static Site; keep Pages working until cutover.
3. **Privacy gate:** make this existing repository private only after verified frontend cutover.
4. **Authoring preparation:** create protected source under `protected-content/`; split mixed files into public metadata, learner-visible content, and server-only grading material. Preserve stable IDs.
5. **Staging dry run:** validate schema, references, release ownership, hashes, sample allow-list, and generated public projection. Produce a write plan and diff; no production target.
6. **Owner gate:** review staging plan, counts, unresolved mappings, and rollback plan.
7. **Future import:** stage immutable PostgreSQL records and private Storage objects; verify hashes and authorization; atomically activate only after approval.
8. **Contract gate:** remove protected source from public build inputs, enforce the allow-list audit, and verify public/API sweeps.

This phase stops before step 2 and performs none of steps 3–8.

## 7. Runtime records and release model required

The P3.1 authored-release schema now supports paths, modules, lessons, labs, items, artifacts, ownership, references, practice/verified boundaries, and artifact hashes. The dry run identifies these additions for the future database/API phase:

* immutable `content.release` with status (`staged`, `current`, `retired`), source revision, schema version, timestamps, and one atomic current-release pointer;
* release-scoped unique IDs and foreign keys for path → module → lesson/lab/item;
* separate learner-visible prompt/content from server-only keys, solutions, rubrics, and verification logic;
* artifact object key, media type, size, SHA-256, access class, release, and optional public-sample hash allow-list;
* explicit `public-sample` publication records rather than deriving publication from maturity;
* stable aliases/slugs separate from IDs (notably stable ID `android-pentesting` and optional slug `android-security`);
* importer idempotency and a rule that no release can activate while references, hashes, decisions, or authorization probes fail.

No database migration has been authored or applied in this phase.

## 8. Validation gates to prepare before a real migration

| Validation | Prepared now | Required before import/activation |
|---|---|---|
| Public catalogue rejects protected fields | JSON whitelist schema and negative test | Validate generated production projection |
| Unauthenticated protected reads fail | Existing anonymous lesson sentinel | Sweep every content/artifact route and real ID |
| Pending protected reads fail | Existing content-gating tests cover current API | Sweep every future database-backed route and signed artifact operation |
| Active authorized reads succeed | Existing active-user content tests | Test release-backed lessons/labs/items/artifacts end to end |
| Public samples remain public | Manifest allow-list and exact-four-files test | Anonymous API/build test for both approved lessons and four files |
| Path/module and cross-record ownership | Authored-release semantic validator | Database foreign keys and import transaction checks |
| Release/version relationships | Manifest release consistency check | Immutable release schema, pointer transaction, rollback test |
| Practice vs verified | Schema and negative test | Server grader/attempt constraints; public practice can never become verified evidence |
| Protected artifacts absent publicly | Classified 317-finding baseline | Hash allow-list scanner, public API sweep, Storage bucket/RLS probe |
| Artifact integrity | Size/SHA-256 generated and revalidated | Verify before upload and after authorized download |
| Stable content IDs | Duplicate stable-identity validation | Owner-approved mapping and alias table before first import |

Access expectations are invariant: unauthenticated and pending accounts receive catalogue/status plus approved samples only; active approved accounts receive authorized learning content. Authorization belongs in FastAPI and private Storage access, never solely in route guards or frontend rendering.

## 9. Owner decisions complete; deployment gates remain

The historical [`CONTENT_MIGRATION_REVIEW.md`](CONTENT_MIGRATION_REVIEW.md) and approved [`CONTENT_OWNER_DECISION_MATRIX.md`](CONTENT_OWNER_DECISION_MATRIX.md) preserve the 159 item-level decisions. All current PCAPs, Lab JSON, Android artifacts, archives, guides, hostapd configurations and miscellaneous artifacts are protected. Mixed sources split learner fields from server-only keys/solutions; self-review reveals after first attempt; existing answer-checked labs remain Practice; `cybersecurity` is the stable Career Path ID.

No production migration is authorized until isolated staging validation is complete, the public build has no unintended protected payloads, Render cutover is separately approved and verified, and this existing repository is made private in the approved sequence.

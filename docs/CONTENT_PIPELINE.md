# Content pipeline: private authoring repository → importer → PostgreSQL

*Status: design for owner review · 2 October 2026 · nothing described here is built or applied yet. Part of [`ACCESS_AND_LEARNING_MODEL.md`](ACCESS_AND_LEARNING_MODEL.md); hosting and repository privacy are in [`HOSTING_AND_REPOSITORIES.md`](HOSTING_AND_REPOSITORIES.md). Numbers come from inspecting this repository.*

```text
Private content repository (SecCraft-content)      authoring source of truth for protected instructional content
        │   importer: validate → plan → import      versioned · reviewed · CI-verified
        ▼
Supabase PostgreSQL, schema `content` (private)    runtime delivery data; every import is an immutable release
Supabase Storage, private buckets                  PCAPs, archives, datasets, APK source
        │
        ▼
FastAPI on Render, authenticated                   the only reader of private content
        │
        ▼
Approved learner  →  /learn/…                      authorization is enforced by the API, not by the route
```

## 1. Principles

1. **The private repository is the source of truth; the database is a deployment artifact.** Nobody edits content rows by hand.
2. **Nothing in the frontend build chain can see private content.** The application repository never contains it, never fetches it at build time, and the importer is not part of any frontend build.
3. **Metadata is public and generated; bodies, keys and artifacts are private.** They join on stable ids.
4. **Every import is an immutable release.** Attempts and progress record the release they used, so grading is reproducible and rollback is a pointer change.
5. **Practice and verified are different classes**, enforced by the schema and the importer, not by convention.
6. **Expand → migrate → contract.** Add the new path first, move traffic, and only then remove the old files. No destructive step happens without approval.

---

## 2. Repository split

### 2.1 Recommendation: two repositories

| | Application repo (`SecCraft`, public now, private later) | Content repo (`SecCraft-content`, private from day one) |
|---|---|---|
| Holds | frontend, backend, importer and schemas, the generated public catalogue, the two public samples, fixtures, application QA | lessons, labs, items (practice and verification), artifacts, catalogue sources, content tooling and content QA |
| Review | code review | content review (CODEOWNERS: you) |
| CI | lint, typecheck, unit, backend, privilege tests, leak check, chrome QA on fixtures | schema validation, artifact verification, content QA against the real content |
| Secrets | none for content | importer credentials (staging, production) |

Why separate even though the application repo will also become private:

1. **A structural guarantee, not a convention.** A Render static-site build clones only the application repo. Private content cannot be bundled because it is not on the disk.
2. **Independent cadence.** Today a lesson typo triggers the full application CI (about 61 runner-minutes). Content PRs would run content CI only.
3. **Smaller secret scope.** Importer credentials live only in the repository that already has authority over content.
4. **Different access later** (an instructor with content access but no code access, or the reverse).

Costs to accept: two repositories; the importer and schema are pinned across them (§7.1); content QA must check out the application at a pinned ref (§10).

### 2.2 Alternatives considered

| Option | Verdict |
|---|---|
| One private repo with a `content/` directory | Workable once the repo is private, but nothing structural stops a build from bundling `content/`, and every content change still runs the application CI. Rejected as the end state; acceptable as an interim. |
| Private content repo as a git submodule of the application repo | The submodule pointer and every build clone it; the Render build would need credentials for it. Rejected: it recreates the bundling risk. |
| Content edited directly in the database | Rejected by decision: no review, history, or verification. |

### 2.3 What goes where

Based on the file inventory (every top-level path and all 59 files in `scripts/`).

| Path today | Files / size | Destination | Notes |
|---|---|---|---|
| `frontend/src/**` application code, `tests`, `styles`, `components`, `lib`, `pages` | – | **App** | |
| `frontend/src/content/lessons/` | 99 files, 848 KB | **Content** | the two samples are published back as generated sample files |
| `frontend/src/content/quizData.ts`, `quizzes.json` | 84 KB, 96 KB | **Content** (items) | `quizData.ts` is bundled today, with `correct` and `explanation` |
| `…/challenges.json`, `scenarios.json`, `engagements.json`, `androidCases.json` | 60 + 84 + 12 + 16 KB | **Content** (items) | titles and counts go to the public catalogue |
| `…/lab-artifacts.json` | 9 KB | **Content** | artifact manifest |
| `…/labs.json` | 31 KB | **Catalogue** (metadata) | lab *instructions* move to Content; they live in components today |
| `…/modules.json`, `learning-paths.json`, `skills.json`, `platform.json` | – | **Catalogue** | authored in Content, generated into App (§4) |
| `…/reference/*.json` | 29 KB | **Decision** | public *Resources* or private |
| `…/achievements.ts` | – | **Delete** in P4 | gamification |
| `frontend/public/{wireless-practice, wireless-foundations, lab-data, pcaps, configs, wordlists, android-*}` | ~165 files, 1.1 MB | **Content** (private storage) | designated sample artifacts stay public (§4.3) |
| `frontend/public/{favicon.svg, icons, manifest.json, sw.js}` | – | **App** | |
| `content/` | 6 files | **Content** | lab configs |
| `android-labs/notes-boundary/` | 10 files | **Content** | intentionally vulnerable demo app; plus `.github/workflows/android-demo.yml` |
| `docs/instructors/ENG-01_answer_key.md` | 1 file | **Content** (key) | **an answer key in a public repo today** |
| `tools/android-triage/`, `tools/wireless-qa/` | – | **Content** | learner toolkit source; capture verification |
| `tools/browser-qa/` | – | **App** | |
| `scripts/` (59 files) | see §2.4 | **38 Content, 21 App** | one verifier splits |
| `reporting/templates/finding.md` | 1 file | **Decision** | generic report template; public Resources? |
| `docker/docker-compose.yml` | 1 file | **Decision** | local lab stack that mounts `content/configs` and a `content/pcaps/enterprise` path that is not in git; likely legacy |
| `backend/`, `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `assets/`, `.github/workflows/{ci,pages}.yml`, platform `docs/` | – | **App** | the Dockerfile's `COPY content/ …`, `COPY frontend/src/content/ …`, `COPY frontend/public/pcaps|lab-data/ …` lines go in P3.5 |
| `NextTaskForYou`, `VisualUpdates`, `requirement.md`, `mobile/README.md` | 4 files, ~85 KB | **Housekeeping** | internal prompts and notes; move or delete |

The backend image **bakes the lessons, items and captures into the container** today (`Dockerfile` lines 35–38). After the migration the API reads the database, so content releases no longer require a backend deploy, and a backend deploy no longer carries content.

### 2.4 The 59 scripts

| Kind | Content (moves) | Application (stays) |
|---|---|---|
| Generators (5) | `generate-challenges`, `generate-enterprise-certificates`, `generate-lab-artifacts`, `generate-wireless-foundations` | `generate-motion-tokens` |
| Packagers (7) | all (`package-android-demo`, `package-wireless-*`) | – |
| Verifiers (20) | 17: `verify-android-{cases,curriculum,demo,foundations}`, `verify-lab-artifacts`, `verify-labkit-interop`, `verify-radius-wire`, `verify-wireless-{curriculum,foundations,phase2…7,wireshark}`, and `verify-learning-data` (**splits**: the catalogue-consistency half stays) | `verify-frontend-routes`, `verify-progress-state` (goes with local progress in P4), `verify-no-dummy-data` |
| Library (2) | `wififorge_labkit.py` | `serve-pages-preview.mjs` (retired by the hosting move) |
| Shell (2) | – | `run-backend.sh`, `run-frontend.sh` |
| Browser QA (23 incl. `lib/ui-audit-fixtures.mjs`) | the **9 lesson-reading scripts** (`ui-wireless-*` ×8, `ui-android-curriculum-smoke`) | the other 13 + the fixtures |

---

## 3. Content repository layout and formats

```text
SecCraft-content/                                     (private)
├─ catalogue/                                         authoritative metadata → public projection
│   ├─ paths/<pathId>.yaml          title, slug, summary, phases, outcomes, prerequisites, tools, maturity
│   ├─ modules/<moduleId>.yaml      title, description, objectives, skills, lessons[], labs[], maturity
│   ├─ skills.yaml
│   └─ career-paths/  skill-tracks/                   data only until the pages exist
├─ lessons/<moduleId>/<lessonId>.md                   body + front matter
├─ labs/<labId>/{lab.yaml, instructions.md}
├─ items/<moduleId>/<itemId>.yaml                     PRACTICE items: prompt, options, key, explanation
├─ verification/<skillId>/<itemId>.yaml               VERIFICATION items: separate directory, stricter review
├─ artifacts/<labId>/…  + artifacts.yaml              binaries and datasets, with id / sha256 / content type
├─ tools/                                             generators, packagers, verifiers (moved from scripts/)
├─ qa/                                                the lesson-reading browser scripts and their config
└─ .github/workflows/{validate,qa,release}.yml
```

* **Lesson front matter:** `id`, `module`, `title`, `description`, `kind`, `objectives`, `maturity`, and `sample: true` for a designated public sample. Public fields (title, description, objectives) are projected; the body is not.
* **Practice vs verification is a directory, not a flag you can forget.** Items under `items/` can only ever be `grading: practice`. Only files under `verification/` can be `grading: verified`. The importer and a database `CHECK` both enforce this.
* **Verification items are authored by the owner**, with `CODEOWNERS` pointing at you and (on a plan that supports it) required review. The rubric format is defined in P7.
* **Markers.** Every private file carries a marker for its class (§9.1), added by `content stamp` and required by the validator. The marker is what lets a public-repo check recognise leaked content without access to it.

---

## 4. The public projection and the samples

### 4.1 What is generated

`content publish-catalogue` renders `catalogue/` into the JSON files the frontend already imports (`modules.json`, `learning-paths.json`, `skills.json`, `labs.json` metadata, `platform.json`), plus `catalogue.manifest.json` (source commit, timestamp, file hashes), plus the sample files. Only whitelisted keys are written; forbidden keys (`body`, `content`, `correct`, `answer`, `answer_basis`, `flag`, `best`, `rationale`, `tasks`, `rubric`) fail the run.

### 4.2 How it reaches the application repo

As a **pull request opened by automation** against the application repository (or the same command run locally by you). Review is the publication gate: the diff shows exactly what becomes public. The application CI validates it (§9.2). The application build never reads the content repository.

During the transition the current files stay hand-edited and are replaced by generated ones in P3.5. Until then nothing about the public build changes.

### 4.3 The public samples

| Path | Lesson | Self-contained? |
|---|---|---|
| Wireless | `01-intro-wireless` / `02-scope-and-assessment-decisions` | **No.** It links to four files and a zip from the `WF-FND-01` pack |
| Android | `android-01-platform` / `01-architecture-sandbox-and-trust-boundaries` | **Yes.** Its only links are public OWASP pages; its three shell snippets are read-only inspection commands for an owned device |

**The wireless sample needs a decision.** The pack contains ten files: the four the lesson links to (`README.md`, `authorized-inventory.csv`, `scope.md`, `worksheet.md`), plus `baseline.pcapng`, `follow-up.pcapng`, their frame JSON, `self-review.md` and `SHA256SUMS`. The captures and self-review are the basis of a *later* independent exercise (lesson `03-foundations-independent-case`). Publishing the whole pack would spoil it.

Recommendation: designate the **four scope-exercise files plus a reduced zip** as *sample artifacts*; keep the captures, `self-review.md` and the full zip private. Then the sample lesson is complete for a visitor and the later exercise keeps its value. A sample lesson may only link to sample artifacts, catalogue pages, or external URLs; the validator enforces that.

Sample rules: exactly one per published path; carries `SC-PUBLIC-SAMPLE` instead of a private marker; its artifacts are the only files besides icons and the manifest allowed in `frontend/public`.

### 4.4 Fixtures for the application repository

The application repo keeps a tiny synthetic content set (two modules, three lessons, one lab with a small artifact, a practice item, a verification item, one sample) with canary markers. Backend tests, importer tests, the leak sweeps and chrome QA run on it, so the application CI no longer needs real content.

---

## 5. Database schema

Owned by the application repo's Alembic migrations (the API reads it). Private tables live in a schema that the REST API does not expose.

```text
schema content  (not exposed)
  release            id, repo_sha, schema_version, status (staged | current | retired), created_at, created_by
  catalogue_item     release_id, kind (path|module|skill|…), id, data jsonb, sha256
  lesson             release_id, module_id, lesson_id, title, body_md, sample, position, sha256
  lab                release_id, lab_id, module_id, instructions_md, environment, artifact_ids[], sha256
  item               release_id, item_id, module_id|skill_id, kind (quiz|scenario|challenge|lab_check|assessment|verification),
                     grading (practice|verified), prompt jsonb, options jsonb, answer_key jsonb, rubric jsonb,
                     explanation jsonb, max_attempts, sha256
                     CHECK (grading = 'practice' OR kind = 'verification')
  artifact           release_id, artifact_id, lab_id, filename, content_type, bytes, sha256, storage_bucket, storage_key
  current_release    singleton row
```

* **Privileges:** `REVOKE ALL` on the schema and its tables from `anon`, `authenticated` and `PUBLIC`; row-level security enabled with no policies (the pattern already in migrations `…_02_account_table_rls` and `…_03_feedback`). Two roles: `content_writer` (the importer; write access to `content` only, no access to account tables) and the API's role (read on `content`, plus its own tables).
* **Application tables** (schema `public`, existing pattern): `assessment_attempts` gains `item_id`, `release_id`, `score`, `max_score`, `passed`, `graded_at`; `progress_records.content_version` carries the release id; P7 adds `evidence_items` and `competency_states`.
* **Why a non-exposed schema:** Supabase exposes `public` (and `graphql_public`, `storage`) through its REST API by default; a custom schema is only reachable after it is added to the exposed list. The public `anon` key ships in the browser, so private content must not sit where that key can reach it. Because a hosted project has had cases where the dashboard setting and the running configuration disagreed, the privilege test (§9.3) and a live probe (§9.4) both check the result.
* **Size:** all private content is about 2.3 MB (lessons 0.85 MB, items 0.35 MB, artifacts 1.1 MB), so none of this needs more than Postgres plus object storage.

## 6. Object storage

* Private buckets (the Supabase default); no public URLs. Key layout `releases/<release>/<artifact_id>/<filename>`, deduplicated by sha256.
* The API checks authorization and then either streams the file (today's artifacts are tiny) or returns a short-lived signed URL (`createSignedUrl(path, expiresInSeconds)`) for large ones.
* Signed *upload* URLs exist too; whether the importer uploads with a service key or through signed upload URLs is decided in P3.3.
* The artifact manifest hash is verified by the importer and re-checked on download.

---

## 7. The importer

### 7.1 Where it lives

`tools/content/` **in the application repo**, versioned with the schema it writes. The content repo's workflows check out the application repo at a **pinned ref** (`SECCRAFT_APP_REF`) to get the importer and JSON Schemas, so content CI always validates against a specific contract. Bumping the pin is a reviewed change.

### 7.2 Commands

| Command | Purpose |
|---|---|
| `content validate` | schemas, id parity with the catalogue, links, markers, sample rules, reserved slugs, artifact hashes |
| `content stamp` | add or verify private markers |
| `content plan --env staging\|production` | dry run: what would change against the current release |
| `content import --env …` | create a release, load rows, upload artifacts, verify, flip the pointer in one transaction |
| `content rollback --env … --to <release>` | repoint the current release; rows are immutable |
| `content publish-catalogue --app DIR` | render the public projection into an application checkout |
| `content leak-scan --root DIR…` | run the leak check locally |

### 7.3 Import algorithm

1. Create a `staged` release. 2. Write catalogue items, lessons, labs, items and artifact rows for that release. 3. Upload artifacts (idempotent by sha256). 4. Verify counts and hashes against the repository and check there are no orphan ids. 5. In one transaction, retire the previous `current` release and set the new one. 6. Staging only: run the API smoke checks and the exposure probe.

Nothing is updated in place, so a failed import leaves the previous release serving, and rollback is a pointer change.

### 7.4 Credentials and approval

* Importer uses a **restricted database role** (`content_writer`) so a compromised content workflow can write content, not accounts. A connection string per environment is stored as an environment secret in the content repo.
* Storage credentials are the most powerful secret in the pipeline; keep them only in the `production` environment, behind a required reviewer where the plan supports it, otherwise behind a manual `workflow_dispatch`.
* Rejected for now: importing through an owner-authenticated admin endpoint. It would put owner capabilities (approving accounts) into the content workflow's blast radius.

---

## 8. Serving and grading

* The API reads `content.*` through a repository layer with a small cache keyed by release id. During the expand phase it falls back to the current in-repo files in development and tests.
* **Items are delivered without keys.** `answer_key`, `rubric` and `explanation` never leave the server before submission.
* `POST /attempts` grades server-side and records the result. **Practice** items record `practice` and never contribute to *Demonstrated* or *Verified*. **Verification** items record `verified`. A verification prompt is only delivered inside an attempt, not as an enumerable list (P7).
* Rate limits, idempotency keys (already present) and attempt limits apply per account.
* Lessons that link to artifacts link to the artifacts API, and the lesson renderer rewrites the old `/wireless-practice/…` paths.

---

## 9. The leak check

It protects every class of private material, not only lesson text.

### 9.1 What is protected and who may see it

| Class | Examples today | Marker | Public site and API | Active learner | Server only |
|---|---|---|---|---|---|
| Lesson content | 99 lesson files | `SC-PRIVATE:lesson:<id>` | never (designated samples excepted) | yes, via the lessons API | |
| Lab instructions | steps in `ModuleDetail`, `Labs`, case labs | `…:lab:<id>` | never | yes | |
| Item prompts | quiz, scenario, challenge and assessment text | `…:item:<id>` | never | yes, per item | |
| Answer keys, rubrics, solutions | `correct`, `answer`, `flag`, `best`, `answer_basis`; the ENG-01 key | `…:key:<id>` | never | **never** | yes |
| Explanations and model feedback | `explanation`, `rationale`, `self-review.md` | `…:explain:<id>` | never | only after submission | |
| Verification material | new `verification/` items | `…:verify:<id>` | never | prompt only during an attempt; keys never | yes |
| Artifacts | PCAPs, datasets, case packs, APK source, toolkits | `…:artifact:<id>` (text); allow-list (binary) | never (sample artifacts excepted) | yes, via the artifacts API | |
| Instructor material | `docs/instructors/*` | `…:key:<id>` | never | never | |

### 9.2 Application repository CI (`scripts/verify-no-private-content.mjs`)

1. Scan `frontend/src`, `frontend/public`, `docs/` and the built `dist/` for any `SC-PRIVATE:` marker. Any hit fails.
2. Validate the public JSON against the whitelist schema; any forbidden key fails.
3. `frontend/public` is an **allow-list**: icons, manifest, service worker, and the designated sample artifacts by path and hash. Binaries need no marker: anything not on the list fails.
4. Flag answer-shaped files anywhere in the repo (`*answer*`, `*solution*`, `instructors/**`).

This needs **no access to private content**: it looks for markers and for files that should not exist.

### 9.3 Backend and database (application CI, on fixtures)

* **Anonymous sweep** (extends the test added on this branch): every GET route, every real id, no credentials. No private marker may appear, except the designated sample.
* **Active-learner sweep:** the same with an approved learner's token. No `key` or `verify` marker may appear anywhere; `explain` markers only in post-submission responses.
* **Privilege test** in the Postgres job: for `anon`, `authenticated` and `PUBLIC`, no privilege on the `content` schema or any table in it; row-level security enabled everywhere.

### 9.4 Live probe (after each import)

With the project's public key, request every private table and bucket path through the Data API and Storage endpoints (including the `content` profile) and require a refusal. This catches the case where the exposed-schema setting and the running configuration diverge.

### 9.5 Content repository CI

The validator requires a marker on every private file and the sample marker on every sample; `publish-catalogue` output is re-scanned with §9.2.

### 9.6 Rollout

Report-only until P3.5: the script prints today's leaks (answer keys in the bundle, the instructor key in `docs/`, ~165 public artifact files) without failing CI. At the contract step it flips to enforcing.

| Mistake | Caught by |
|---|---|
| `quizData.ts` imported again | §9.2.1 (marker) and §9.2.3 |
| A new route returns lesson text | §9.3 anonymous sweep |
| A route returns an answer key to an approved learner | §9.3 active-learner sweep |
| A private table lands in an exposed schema | §9.3 privilege test, §9.4 |
| An answer file committed under `docs/` | §9.2.1, §9.2.4 |

---

## 10. CI in the two repositories

| Repository | Runs | Triggers |
|---|---|---|
| Application | lint, typecheck, unit tests, backend tests, Postgres privilege tests, leak check, chrome QA on fixtures, production-subpath job | push to `main`, pull requests |
| Content | `content validate`, artifact verification (the moved verifiers), importer dry run, **content QA** | pull requests; on merge to `main`, import to staging |

**Content QA** is the nine lesson-reading browser scripts. They check every lesson for rendering, overflow, accessibility and download bytes, so they need the real content and the application. The content workflow checks out the application at `SECCRAFT_APP_REF`, starts a Postgres service, runs migrations and the importer into it, starts the API and the dev server, and runs the scripts. Until the P4 authenticated end-to-end stack exists, they keep using the approved-learner fixture, parameterised to read from `SECCRAFT_CONTENT_DIR`.

**Cost:** one full CI run today is about 61 runner-minutes across seven jobs; the lesson-reading job is about 22 of them. Moving it to content CI takes that cost out of every application push.

---

## 11. Controlled sequence for P3

Each slice is reviewable on its own. "Applied" means it touches shared infrastructure and waits for approval.

| Slice | Content | Touches | Reversible |
|---|---|---|---|
| **P3.1 Contract** | JSON Schemas, fixture set, whitelist test, leak check in report-only mode | application repo only, additive | yes |
| **P3.2 Schema and API** | `content` schema migration, repository layer with file fallback, labs/items/artifacts endpoints without keys, graders and `grading` rule | application repo; migration runs on local/CI Postgres only | yes |
| **P3.3 Importer and content repo** | `tools/content`; owner creates the private repo; bootstrap it from this repo's content using a filtered clone (history of those paths preserved, original untouched); dry-run import into a staging database | new private repo; staging database | yes |
| **Gate: first production import** | additive: new schema and a release; no frontend change | production database and storage | rollback = pointer |
| **P3.4 Frontend** | `/learn/…` routes and guard, items and labs from the API, public pages from the projection, old URLs redirect | application repo, deployed after the import | yes (flag) |
| **Gate: contract** | remove private content from the application repo and bundle, flip the leak check to enforce, update the Dockerfile, move scripts | application repo, **destructive** | git history only |
| **P3.5 Contract** | the step above | | |
| **P3.6 Cleanup** | remove the legacy `/api/pcaps/*` and unmounted routers; update docs | application repo | yes |

The expand phase keeps production working at every step: the production backend gets the new endpoints and content before the frontend that uses them is deployed, and the old files stay until the contract gate.

## 12. Open points

* Whether the importer uploads with a service key or signed upload URLs (P3.3).
* Which Supabase project hosts staging (a second project is possible on the free plan, which allows two) or whether staging is a local/CI Postgres until the first production import.
* How migrations are applied in production today. CI smoke-tests Alembic on SQLite, but I have not seen where production runs `alembic upgrade`. Confirm before P3.2 ships.
* The wireless sample pack split (§4.3).
* `reference/*.json`, `reporting/templates/finding.md` and the local lab stack under `docker/` (§2.3).

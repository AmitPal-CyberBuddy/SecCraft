# Existing Supabase pre-launch validation contract

This contract validates SecCraft against its one existing, currently unused Supabase project. It does not require another project or hosted staging deployment. Run FastAPI and the boundary frontend locally when needed. Use `deploy/staging.env.example`; load real secrets only from a file outside the repository. The scripts require `PLATFORM_ENV=prelaunch` and reject production-looking targets.

## Components and configuration

| Component | Required configuration | Identity and permissions | Health/probe |
|---|---|---|---|
| Frontend | `VITE_API_URL`, `CONTENT_BOUNDARY_BUILD=1`, `STAGING_FRONTEND_URL` | Public static deployment; no service key, database URL, Storage token, or protected object URL | `/`, `/paths/...`, Android sample; run `verify-public-boundary-build.mjs` |
| FastAPI | `PLATFORM_ENV=staging`, `PLATFORM_DATABASE_URL`, `PLATFORM_ALLOWED_ORIGINS`, `PLATFORM_AUTO_CREATE_TABLES=false`, `PLATFORM_ENABLE_API_DOCS=false`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_ISSUER`, `SUPABASE_JWT_AUDIENCE`, JWT verification secret/key configuration, `SUPABASE_REQUIRE_VERIFIED_EMAIL=true`, `SUPABASE_SERVICE_ROLE_KEY`, `CONTENT_STORAGE_BACKEND=supabase`, `CONTENT_STORAGE_BUCKET` | `seccraft_app`: connect plus CRUD on `content` and account tables; no DDL. Service role is backend-only and may read the private bucket. | `/health`; public catalogue/sample; anonymous/pending/approved probes below |
| PostgreSQL | `PLATFORM_DATABASE_URL`; separately `CONTENT_MIGRATION_DATABASE_URL` and `CONTENT_BACKUP_DATABASE_URL` | Dedicated DB. `seccraft_migrator`: schema/DDL/migration rights. `seccraft_app`: runtime DML only. `seccraft_backup`: read/backup. TLS required. No `anon`/`authenticated` grants on `content`. | Alembic `current`; `verify_external_staging.py database` |
| Supabase Storage | `SUPABASE_URL`, secret `SUPABASE_SERVICE_ROLE_KEY`, `CONTENT_STORAGE_BUCKET=seccraft-content-staging` | Dedicated **private** bucket. No SELECT/INSERT/UPDATE/DELETE policy for `anon` or `authenticated`; service role only. FastAPI streams verified bytes and never returns keys/signed URLs. | anonymous/guessed GET denied; service GET and SHA-256 verified |
| Supabase Auth | `SUPABASE_URL`, public `SUPABASE_ANON_KEY`, issuer/audience, backend JWT verification secret/key | Dedicated staging project/users. Create pending, approved-new, approved-existing-progress, and an approved probe user. Only backend service role may administer profiles. | valid pending/approved tokens and altered/expired token probes |
| Importer | `PLATFORM_ENV=staging`, `PLATFORM_DATABASE_URL`, `CONTENT_IMPORT_ALLOW_NONLOCAL=true`, `SUPABASE_URL`, secret `SUPABASE_SERVICE_ROLE_KEY`, `CONTENT_STORAGE_BUCKET`, `CONTENT_RELEASE_ID` | Uses runtime DB writer and Storage service role. It cannot target names containing `prod`/`production`; release IDs are immutable. | second identical stage reports `idempotent: true`; counts/hashes match |

PostgreSQL tables use schema `content`; all five tables require RLS enabled. PostgreSQL roles `PUBLIC`, `anon`, and `authenticated` have no table privileges. Storage is not an authorization boundary exposed to clients: direct client access is denied, and application authorization precedes backend streaming.

## Ordered deployment and validation

1. In the existing Supabase project, create the private bucket and the `seccraft_app` database role; use the project `postgres` role for migrations/backups. Run FastAPI and the frontend locally—do not provision another hosted environment.
2. Load secrets outside Git, then run `tools/content/run_external_staging.sh`. It preflights all configuration before writes.
3. The script creates/verifies the private bucket, applies Alembic with the migrator, verifies schema/RLS, stages twice (idempotency), activates, validates Storage hashes, runs API authorization probes, and builds/audits the boundary frontend.
4. Run lifecycle acceptance using two immutable IDs/manifests:
   ```bash
   python tools/content/import_content.py stage --release "$RELEASE_N" --database-url "$PLATFORM_DATABASE_URL"
   python tools/content/import_content.py activate --release "$RELEASE_N" --database-url "$PLATFORM_DATABASE_URL"
   python tools/content/import_content.py stage --manifest "$RELEASE_N_PLUS_1_MANIFEST" --release "$RELEASE_N_PLUS_1" --database-url "$PLATFORM_DATABASE_URL"
   python tools/content/import_content.py activate --release "$RELEASE_N_PLUS_1" --database-url "$PLATFORM_DATABASE_URL"
   python tools/content/import_content.py rollback --release "$RELEASE_N" --database-url "$PLATFORM_DATABASE_URL"
   ```
   Confirm exactly one `current`. Launch both activation commands simultaneously; one may lose the unique-index race, but the final invariant must remain one current release.
5. **No-backend-deploy acceptance:** record backend image digest; change one harmless lesson sentence, generate a new manifest with a new immutable release ID, stage and activate it, GET that lesson as approved, and confirm the new sentence and release ID while the backend image digest is unchanged. Roll back to N and confirm the old body returns.
6. Back up, restore, and validate using isolated recovery resources:
   ```bash
   python tools/content/backup_external_staging.py backup /secure/path/staging-backup-N
   # Set CONTENT_RECOVERY_DATABASE_URL to disposable/local PostgreSQL and
   # CONTENT_RECOVERY_STORAGE_ROOT to a disposable local directory.
   python tools/content/backup_external_staging.py restore /secure/path/prelaunch-backup-N
   ```
   Run database/Storage hash checks against recovery, activate/rollback there, and record evidence. Documentation alone is not completion.

## Authorization and compatibility acceptance

`verify_external_staging.py authorization` checks catalogue/public sample success; anonymous and pending lesson/artifact denial; approved lesson/artifact success; unknown direct-ID denial; and invalid-token denial. `storage` checks anonymous/guessed object denial and service-side bytes/hash. Also use an expired JWT and require 401. No object key, service key, signed token, or protected URL may occur in browser responses/build output.

For progress, create: pending user, approved user without history, and approved user with copied staging history. Before and after N → N+1 → rollback, GET `/api/v1/progress` and compare stable module/lesson/lab IDs. Submit Practice activity and verify it remains Practice and creates no Demonstrated/Verified evidence; historical rows must remain readable and reference valid stable IDs. Release activation must not mutate progress tables.

## Failure and rollback

If staging/import/hash/probe checks fail, do not activate. If activation checks fail, run `rollback --release <last-known-good>`, verify one current release and authorized retrieval, then retain the failed immutable release as retired for diagnosis. Rollback changes database content state only; it requires neither backend nor frontend deployment. For database/Storage loss, restore both from the same backup set to isolated recovery, verify every stored SHA-256 and release counts, then perform activation/rollback probes before any cutover.

Completion requires recorded outputs for migration, real RLS, real Storage denial/hash, authorization, N/N+1/concurrent rollback, unchanged-backend content update, boundary build, three-user progress compatibility, and demonstrated backup restoration. Production remains untouched until all are green.

# Run pre-launch validation with GitHub Actions or Codespaces

The workflow uses the existing SecCraft Supabase project. It does not deploy a hosted staging application and never uploads its backup. FastAPI runs only inside the temporary Actions runner.

## 1. One-time Supabase preparation

In **Supabase Dashboard → SQL Editor**, create a dedicated runtime login with a generated password (do not put the password in SQL saved to Git):

```sql
create role seccraft_app login password '<GENERATED-UNIQUE-PASSWORD>';
```

If the role already exists, rotate its password instead. The Alembic migration grants this role only the required `content` schema access and creates its backend RLS policies. Use the project `postgres` connection for migrations/backups and `seccraft_app` for `PLATFORM_DATABASE_URL`.

In **Authentication → Users**, create three distinct synthetic, email-confirmed users. Use no real account:

- pending fixture;
- approved learner with no history;
- approved learner used for synthetic existing progress.

The workflow obtains short-lived JWTs at run time and prepares one pending/two active application profiles. Passwords remain GitHub secrets.

## 2. GitHub environment

In **GitHub repository → Settings → Environments**, create `prelaunch`. Add protection/required reviewers if desired. Add:

### Environment variables

| Name | Value |
|---|---|
| `SUPABASE_URL` | Existing project URL from Supabase **Project Settings → Data API/API** |
| `CONTENT_DATABASE_RUNTIME_ROLE` | `seccraft_app` |

### Environment secrets

| Name | Value/source |
|---|---|
| `PRELAUNCH_DATABASE_URL` | SQLAlchemy URL for `seccraft_app`; scheme must be `postgresql+psycopg://` |
| `PRELAUNCH_MIGRATION_DATABASE_URL` | Project `postgres` direct/session-pooler URL with `postgresql+psycopg://` |
| `PRELAUNCH_BACKUP_DATABASE_URL` | Project `postgres` URI with ordinary `postgresql://` for `pg_dump` |
| `SUPABASE_ANON_KEY` | Existing project publishable/legacy anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Existing project secret/legacy service-role key |
| `PRELAUNCH_PENDING_EMAIL` / `PRELAUNCH_PENDING_PASSWORD` | Pending synthetic account |
| `PRELAUNCH_APPROVED_NEW_EMAIL` / `PRELAUNCH_APPROVED_NEW_PASSWORD` | Approved no-history synthetic account |
| `PRELAUNCH_APPROVED_PROGRESS_EMAIL` / `PRELAUNCH_APPROVED_PROGRESS_PASSWORD` | Approved existing-progress synthetic account |

Connection values come from the Supabase project’s **Connect** dialog. URL-encode special password characters. Do not add these values as repository variables, workflow YAML, Codespace dotfiles, or frontend variables.

Before installing dependencies or contacting Supabase, the workflow checks that the required environment settings are non-empty. If one is missing, the diagnostic names the corresponding GitHub setting (for example, `PRELAUNCH_MIGRATION_DATABASE_URL`) but never prints its value; configure the named setting in the protected `prelaunch` environment before starting another validation run.

## 3. Run in Actions

After this workflow is present on `main`, open **Actions → Pre-launch Supabase validation → Run workflow**. Enter a new immutable release ID, for example `prelaunch-20261002-n1`. The workflow is manual-only, serialized, read-only to GitHub, and bound to the `prelaunch` environment.

It performs migrations/RLS, private bucket creation, synthetic profiles, full import, idempotent re-import, authorization/Storage probes, boundary leak audit, N/N+1 activation, concurrent activation invariant, content update without backend restart, rollback, progress compatibility, PostgreSQL/object backup, and local disposable restore. Temporary JWTs are masked. Backups and restored objects are deleted and never uploaded as artifacts.

Backup and restore run entirely on PostgreSQL 17. The disposable recovery service uses the `postgres:17` image, and before the backup steps the workflow installs `postgresql-client-17` from the PGDG apt repository when the runner image does not already ship it (images preinstall only one PostgreSQL major), verifies `pg_dump --version`, `pg_restore --version`, and `psql --version` all exist, and adds `/usr/lib/postgresql/17/bin` to `GITHUB_PATH` so the three tools resolve to 17. The external Supabase project must therefore run PostgreSQL major 17; if Supabase upgrades the project to a new major, raise the expected version in the workflow pin/diagnostic steps and the recovery service image together.

Backup and recovery then run in three steps:

1. `scripts/wait-for-prelaunch-recovery-postgres.sh CONTENT_RECOVERY_DATABASE_URL` — a bounded `pg_isready` readiness probe (24 attempts, 5s apart) for the disposable service. It never prints the connection string, and it fails clearly once the budget is exhausted.
2. `scripts/verify-prelaunch-postgres-versions.sh 17` — a fail-closed diagnostic that blocks the backup unless `pg_dump`, `pg_restore`, and `psql` plus both the external staging (backup source, `CONTENT_BACKUP_DATABASE_URL`) and disposable recovery (restore target, `CONTENT_RECOVERY_DATABASE_URL`) servers report major 17. Connection strings are normalised in memory to the ordinary `postgresql://` spelling the CLI tools require (a `postgresql+psycopg://` SQLAlchemy URL is never passed to them), and each value reaches `psql` as its connection argument because libpq reads `PGDATABASE` as a plain database name rather than a URI. The probes are strictly read-only (`SHOW server_version_num`), so existing pre-launch releases are never altered or deleted. On success the step prints `PostgreSQL compatibility verified: pg_dump=17, pg_restore=17, psql=17, source=17, recovery=17`; on failure it names only the failing component and its safe major version, and every diagnostic is redacted so no URL, user, password, host, port, or database name can appear in the log.
3. `python tools/content/backup_external_staging.py backup|restore` — the backup writes two custom-format dumps (the private `content` schema, then the SecCraft-owned tables in `public`: accounts, progress, feedback, and the Alembic version marker) plus `manifest.json` and `objects.json`. Supabase-managed schemas (`auth`, `storage`, `extensions`, `realtime`, and the rest) are never dumped. The restore targets only the disposable PostgreSQL 17 service and a disposable local directory, creates the runtime role that the archived content RLS policies reference, restores both dumps, then proves that release metadata (including the current and retired releases) and every table count match the source and that every recovered object exists with the recorded size and SHA-256. Workflow job-level `CONTENT_RECOVERY_DATABASE_URL` and `CONTENT_RECOVERY_STORAGE_ROOT` keep the readiness probe, diagnostic, restore, and cleanup pointed at the same throwaway resources: the recovery target is never the live Supabase project. The `always()` cleanup step deletes the dumps and recovered copies, and no backup or recovery output is uploaded as an artifact.

`scripts/tests/prelaunch-postgres-versions.test.mjs` covers the readiness probe and the version diagnostic (including the SQLAlchemy-URL normalisation, empty-URL, older-client, and unreachable-server cases), and `tools/content/tests/test_backup_external_staging.py` covers the backup scope, the CLI URL discipline, and the restore proofs.

## 4. Alternative: Codespaces

In **Repository Settings → Secrets and variables → Codespaces**, add the names from `deploy/staging.env.example` (do not use `VITE_` for server secrets). Rebuild/restart the Codespace after adding them. Then run:

```bash
cd /workspaces/SecCraft
python -m pip install -r backend/requirements.txt
npm ci --prefix frontend
(cd backend && uvicorn app.main:app --host 127.0.0.1 --port 8000) &
bash tools/content/run_external_staging.sh
python tools/content/validate_external_lifecycle.py
python tools/content/verify_external_progress.py
```

Codespaces secrets are injected as process environment variables; no `.env` file is required. Prefer the protected GitHub `prelaunch` environment workflow for repeatable evidence.

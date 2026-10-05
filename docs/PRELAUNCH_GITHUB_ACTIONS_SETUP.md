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

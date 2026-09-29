# SecCraft accounts, synchronization, and deployment

> **Implementation status:** the code supports optional Supabase Auth, a FastAPI `/api/v1` account API, PostgreSQL migrations, owner-only approvals, generic progress import/merge, and unverified assessment-attempt records. This repository does not include live Supabase, SMTP, PostgreSQL, or owner credentials. Configure and acceptance-test those services before enabling account requests in production. Guest learning remains available without them.

## Architecture and trust boundaries

```text
Static Vite/React app + version-controlled lessons, labs and artifacts
  ├─ guest: localStorage progress, notes, settings, evidence metadata; works offline
  └─ optional: Supabase Auth (email/password) → FastAPI /api/v1 → PostgreSQL
                                            └─ derives user identity from a verified provider token
```

- Lessons, quizzes, labs, challenges, path metadata, and artifacts remain static, version-controlled content; they are not copied into account tables.
- Supabase Auth owns credentials. SecCraft never stores passwords. The browser anon key is public by design; service-role keys, JWT signing keys, and database credentials are server-only.
- The API verifies Supabase JWT signature, issuer, audience, expiry, and subject. With email verification required, it also asks Supabase Auth for the current user and checks confirmation server-side. A browser-supplied user ID, role, score, XP value, or `verified` flag is not an identity or authorization source.
- The only admin authorization source is the server-managed `platform_admins` table. Normal profiles have no selectable role.
- Local progress remains usable if the network, Supabase, or API is unavailable. Nothing is synchronized automatically.

## Account states and owner control

The intended learner flow is:

1. The owner enables signup in the owner console; new account requests are disabled by default.
2. The learner requests an account with an email and password. The API checks the server setting and rate limit, then forwards the request to Supabase Auth over TLS.
3. The learner verifies the email through Supabase, signs in, and requests account status. The API independently checks email confirmation and creates a `pending` profile if needed.
4. Only an allowlisted owner can approve, reject, or suspend the profile. Protected synchronization routes check this status in the API.
5. Activation of a regular learner is refused while the approved-user limit is unset or full. The PostgreSQL settings-row lock serializes approval transactions. The limit counts active non-admin accounts; suspended users and owner-allowlisted accounts are excluded.

The initial database state is deliberately fail-closed: `signup_enabled = false` and `approved_user_limit = NULL`. No cap is invented in code. Set the real policy in the owner console before activating learner accounts. An active-user limit of `0` means no regular learner can be activated.

### Important Supabase signup boundary

`/api/v1/auth/signup` enforces `signup_enabled` for SecCraft's own registration UI/API. Supabase's public Auth endpoint and its anon key are inherently reachable by browser clients; a determined caller can attempt identity creation directly at the provider. Such an identity still cannot use SecCraft's protected API without a valid, verified token and an active profile, but the application API alone cannot prevent creation of a *pending identity* outside the UI. If the policy must prohibit identity creation while signup is closed, configure a Supabase **Before User Created** Auth Hook (or an equivalent provider-side control) to consult the same enrollment policy. Do not describe the app-level toggle as a provider-wide identity-creation block unless that hook is configured and tested.

## API contract currently implemented

| Route | Purpose | Trust behavior |
|---|---|---|
| `GET /api/v1/public-config` | Public auth/signup availability for the UI | Never exposes secrets; creates closed settings row if absent |
| `POST /api/v1/auth/signup` | Enrollment proxy to Supabase Auth | Owner toggle + per-process rate limit; generic errors avoid account enumeration |
| `GET /api/v1/account` | Current verified user's own account state | User ID comes from verified token; email confirmation rechecked |
| `GET /api/v1/progress` | Current user's progress, server XP ledger, and awards | Every query is scoped to the token subject |
| `POST /api/v1/progress/import/preview` | Preview local/browser progress merge | User-scoped; import values cannot set owner, XP, or verification |
| `POST /api/v1/progress/import` | Merge generic progress into the account | Imported rows are unverified; completed can advance only an unverified started row; verified rows are preserved; awards 0 XP |
| `POST /api/v1/attempts`, `GET /api/v1/attempts` | Record/list current user's assessment attempt metadata | Stores an answer digest, not submitted answers; no client score/pass; always `unverified`, awards 0 XP |
| `/api/v1/admin/*` | Owner settings, approvals, audit | Server allowlist only; role fields are forbidden |

The legacy shared-local progress, demo-login, answer-revealing lab-validation, upload, and cross-user analytics routes are not mounted. Authored learning content and PCAP inspection remain read-only public routes.

### What is intentionally not claimed yet

- Assessment attempts are recorded but not graded as verified. Existing local quizzes, XP, achievements, and printable local practice records remain browser-local; they are not server credentials or certificates.
- Idempotent server-side XP and achievement award helpers exist for trusted internal graders, but no shipped assessment currently calls them. The new attempt API always awards **0 XP**.
- No server-issued/accredited certificate is created. Local imports cannot create XP, verified awards, or certificates.
- Upload/object storage, roles/classrooms, CMS, social features, SSO, mobile applications, AI tutoring, cyber-range orchestration, and RF hardware control remain out of scope.

## Owner bootstrap

There is no default owner email, password, UID, or role-edit UI. After creating and verifying the owner's Supabase Auth account and running the database migration, insert that account's Supabase Auth UUID into the application database using a protected database connection:

```sql
INSERT INTO platform_admins (user_id)
VALUES ('<owner-supabase-auth-uuid>')
ON CONFLICT (user_id) DO NOTHING;
```

Then sign in and open `/account` → **Open owner console**, or visit `/admin`. The owner console creates the closed singleton settings row if it does not exist. It supports signup toggle, configured active-user capacity, learner approvals/rejections/suspensions, and an audit view. Keep the owner UUID and database access private; do not put them in frontend environment variables.

## Supabase setup

1. Create a Supabase project and use **email/password** Auth. Require email confirmation and configure the redirect allowlist for the exact deployment URLs (including `/SecCraft/account` and `/SecCraft/update-password` for GitHub Pages project paths where applicable).
2. Configure custom SMTP before public signup or password recovery. Supabase's default email sender is restricted and rate-limited; do not assume it can deliver public production verification emails.
3. Create a frontend env file from `frontend/.env.example` and set only `VITE_SUPABASE_URL`, the public `VITE_SUPABASE_ANON_KEY`, and (for a deployed API) `VITE_API_BASE` to an HTTPS origin with no path. These values are embedded in the public bundle; never put service-role keys or database credentials here.
4. Create a backend env file from `backend/.env.example`. Set the matching `SUPABASE_URL`, `SUPABASE_ANON_KEY`, issuer/JWKS URL, and exact browser origins in `PLATFORM_ALLOWED_ORIGINS`. Set `SUPABASE_EMAIL_REDIRECT_URL` to an HTTPS URL on an allowed origin. Keep all database and provider secrets in the API host's secret manager.
5. Point Supabase Auth callbacks/site URLs at the deployed app. Verify confirmation, sign-in, password recovery, and the API's `/auth/v1/user` confirmation check against a non-production project before enabling signup.

The app should have a separate managed PostgreSQL database (or a deliberately selected Supabase PostgreSQL database) for the application tables. The migration enables RLS on all account tables without anon/authenticated policies, so Supabase PostgREST cannot bypass the FastAPI ownership checks; use the same restricted, table-owning application database role for migration/runtime (or a separately reviewed grants/RLS design) and TLS. Never expose its connection string or a Supabase service-role key to the browser.

## Database migrations

SQLite auto-creation is for local development and isolated tests only. A deployed PostgreSQL service uses Alembic and does not call `create_all()`.

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # edit locally; .env is git-ignored
set -a; . ./.env; set +a
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Set `PLATFORM_DATABASE_URL` to a SQLAlchemy PostgreSQL URL using the installed `psycopg` driver, for example `postgresql+psycopg://...`, with TLS configured for the provider. For local guest-only development, omit it to use the ignored `backend/seccraft.db` SQLite file; no Supabase configuration is needed and account endpoints fail closed.

Run a schema upgrade against a disposable/test database first. Back up production before migrations. The included migration smoke test uses temporary SQLite and validates migration shape, but only PostgreSQL integration/load tests can demonstrate row-lock behavior under concurrent approvals.

## Frontend/API deployment

For local development, Vite proxies same-origin `/api` requests to `http://localhost:8000`; do not make browser code call localhost. For the GitHub Pages site, publish the API separately, set `VITE_API_BASE` to its HTTPS origin at **frontend build time**, and add the exact page origin (for the current project site, `https://amitpal-cyberbuddy.github.io`) to `PLATFORM_ALLOWED_ORIGINS`. GitHub Pages cannot host FastAPI or PostgreSQL. Configure platform-specific redirects for React Router deep links and the Supabase email callback path.

`frontend/vite.config.ts` builds a CSP from the configured API and Supabase origins. The app has no analytics/CDN font dependency. Check the generated `dist/_headers` on hosts that support it; GitHub Pages does not set arbitrary response headers, so the meta CSP cannot enforce every response-header policy.

### Optional Docker Compose deployment

The root `docker-compose.yml` provides a local PostgreSQL volume, a one-shot Alembic migration service, the API, and an Nginx static/API proxy. Create the ignored root `.env` from [`docker-compose.env.example`](../docker-compose.env.example); do not commit it. Even for guest-only Compose deployments, configure `POSTGRES_PASSWORD` and the exact browser `PLATFORM_ALLOWED_ORIGINS`. Supabase Auth is optional: leave the Supabase values blank to keep account services disabled, or provide matching `SUPABASE_URL`, public `SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` values to enable them. Use a URL-safe database password (or URL-encode it in the composed database URL). Set `PLATFORM_ALLOWED_ORIGINS` to the browser origin and `VITE_BASE=/` for the root-domain Nginx deployment. `VITE_API_BASE` may stay empty because Nginx proxies `/api` on the same origin.

```bash
# From the repository root, after configuring the ignored .env
docker compose run --rm migrate
docker compose up --build -d
```

The `web` service listens on HTTP port 8080 by default. Put it behind a TLS-terminating ingress/reverse proxy before exposing it publicly; configure the external ingress's trusted-proxy/rate-limit settings and backups. The PostgreSQL container is not published to the host. The Docker files are provided as a deployment option; run the acceptance checklist below against the actual target host/provider before enabling enrollment.

## Verification checklist before enabling accounts

- [ ] Supabase email confirmation and recovery emails work through the production SMTP domain.
- [ ] `PLATFORM_ALLOWED_ORIGINS` contains only the deployed app origins; no wildcard.
- [ ] API HTTPS, Postgres TLS, secret rotation, backups, and ingress rate limits are configured.
- [ ] Alembic migration has run against the intended PostgreSQL database and can be rolled back/restored.
- [ ] Owner Supabase UUID is in `platform_admins`; non-owner accounts receive 403 from every `/api/v1/admin/*` route.
- [ ] Signup remains closed until the owner sets a real active-user limit; test full-capacity and concurrent approval behavior on PostgreSQL.
- [ ] Unverified, pending, rejected, and suspended tokens are denied protected sync; email-verification status is checked by the API.
- [ ] Cross-user progress/attempt reads and writes are denied; import cannot alter verified records or award XP.
- [ ] Provider-side signup hook is configured if the requirement is to block direct Supabase identity creation while app signup is closed.
- [ ] No certificate, score, or mastery claim is displayed as server-verified until a real server-controlled rubric/grader and issuance policy exist.

Contract tests: `python -m pytest backend/tests -q`. Frontend API resilience regression: `cd frontend && npm test`. Frontend build and content checks are described in the root README and CI workflow.

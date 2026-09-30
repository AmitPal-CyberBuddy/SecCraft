# SecCraft security policy and boundaries

Report vulnerabilities privately through the repository's GitHub Security → Report a vulnerability flow, or the maintainer contact on the repository profile. Include reproduction and impact; do not test systems without authorization. There is no bug bounty or penetration-test assurance.

## Current architecture

The GitHub Pages frontend serves public static curriculum, captures and application code. Preview vs Full is a **UX distinction**, not confidential-content enforcement. Supabase Auth handles identity, email confirmation, login and recovery. The optional FastAPI service on Render (or self-hosted) verifies signed Supabase JWTs (JWKS or legacy HS256 secret), issuer, audience and expiry and checks the provider's current email confirmation status before accessing PostgreSQL account data. Backend account states (pending, active, rejected, suspended) and a database owner allowlist determine authorization. Browser `access.ts` and `contentAccess.ts` are presentation controls only. CORS is an explicit origin allowlist, without credentials or wildcard origins; it is not authentication.

Browser-local progress/XP, notes and practice evidence are editable by the browser user and are not authoritative. Imports are account-scoped by the server token subject and remain **unverified**, award zero verified XP and cannot replace verified records. Server-held XP comes only from server-side verified events; assessment attempts store unverified metadata until a trusted grader exists. There is no trusted live grader or server-issued certificate. Never describe static bundled lessons as protected material or local XP as server-verified.

The application signup toggle gates only `/api/v1/auth/signup`; it cannot block direct Supabase Auth identity creation. Provider-wide blocking requires a configured and tested provider-side Auth Hook. Supabase's own throttling does not replace application abuse controls. The application signup limiter is **per process and in memory**, not a distributed quota. Deploy an ingress/provider rate limit as appropriate and configure provider SMTP, auth redirect allowlists and abuse protections. Responses from signup avoid passing through provider enumeration details; review provider-hosted login/recovery enumeration behavior separately.

PostgreSQL migrations enable RLS on account tables without anon/authenticated policies. The table-owning runtime database role **bypasses RLS** unless FORCE RLS is enabled; backend query scoping is therefore the primary isolation control for this role. Separate migration ownership from a least-privileged runtime role only after testing grants and policies against PostgreSQL; do not blindly enable FORCE RLS. Protect DB connectivity, backups and owner bootstrap identifiers server-side. Browser VITE variables must contain only public API origin, Supabase URL and anon key. Never ship DB credentials, service-role keys or signing secrets in a static bundle.

The API uses `nosniff`, frame denial, no-referrer, permissions policy and no-store for account endpoints; public catalogue responses may be cached briefly. TLS/HSTS must be enforced at the actual HTTPS ingress, not assumed from an HTTP-only backend. GitHub Pages cannot configure arbitrary response headers; the frontend meta CSP is not equivalent to response-header CSP. Docker API runs as the non-root `seccraft` user; the standalone Nginx web image uses its upstream runtime model.

## Deployment checks

- Use HTTPS for browser/API/provider connections and exact CORS origins; verify rendered security headers at the ingress.
- Keep runtime secrets in the deployment secret manager, not Docker build arguments or `VITE_*` values; never commit real `.env` files.
- Migrate using Alembic; verify role grants, backups, TLS and RLS in the target PostgreSQL instance.
- Test Supabase email confirmation, recovery and direct-signup policy against a non-production project.
- Apply an ingress/provider enrollment rate limit if a global quota is needed (the in-process limiter is not global).
- Re-run dependency audits, backend and frontend tests, content checks and build before deployment.

See [account deployment](docs/ACCOUNT_SYNC_PLATFORM.md) for the owner and deployment workflow. These are engineering boundaries, not a claim that the system is fully secure or penetration tested.

# Contact and feedback

Implemented 2026-10-01. Feedback is an optional backend feature; static guest learning still works without it.

## User and owner experience

- Public form: `/feedback`; linked in the public footer and workspace account menu. Workspace links include only the current pathname, not query strings or fragments.
- Guests and authenticated learners can send a category, subject and message, with an optional reply email and editable local page reference. No attachments, automatic email or public tracking page.
- A message is acknowledged only after a database commit. The receipt is a reference number, not a promise of a reply.
- Drafts stay in the current tab's session storage until sent. Storage-denied errors are visible. Errors and throttles do not clear entered text. Exact retries keep their UUID across reloads; edits start a new submission identifier.
- `/admin/feedback` is part of the owner console, with keyset pagination, category/status filtering, full message view, internal notes and New / In progress / Resolved / Spam statuses. Selection moves focus to the detail region and scrolls there on phones.
- Both the inbox and review APIs use the existing server-controlled owner allowlist. The frontend guard is not an authorization boundary. Guests cannot retrieve a message, even with its reference number.
- Submitted content is rendered as plain text, not Markdown, HTML or executable links. Optional reply emails are explicitly unverified. Review changes use a version check to reject stale edits and add an owner audit event without copying message/note text into the audit log.

Do not submit passwords, access tokens, sensitive evidence or personal data about others. Vulnerabilities go through the private reporting instructions in `SECURITY.md`, not this general-purpose form.

## Enable on a deployment

1. Back up the database, then run `cd backend && alembic upgrade head`. Revision `20261001_03` creates `feedback` and `feedback_quotas`. PostgreSQL RLS is enabled without public policies, and direct grants to Supabase `anon`/`authenticated` roles are revoked when those roles exist. As with account tables, the runtime DB owner can bypass RLS; backend authorization and DB isolation still matter.
2. Set **`FEEDBACK_HMAC_SECRET`** to a dedicated cryptographically random secret of at least 32 bytes in the deployment secret manager. Use one stable value across all workers/replicas. Never expose it through `VITE_*` or commit it. Intake fails closed with 503 if it is absent/too short. Generate locally, for example with `python -c "import secrets; print(secrets.token_hex(32))"`; do not paste the result into chat.
3. Configure trusted proxy peers and ingress abuse controls as described below. Verify the *actual ASGI client address* through the deployed proxy chain before enabling public intake.
4. Schedule **daily**: `cd backend && python -m app.services.feedback_retention`. For Compose: `docker compose exec -T api python -m app.services.feedback_retention`. The repository supplies this command, not a managed scheduler.
5. Deploy the frontend and verify guest submission, authenticated identity, owner-only retrieval, retry behavior and retention in a staging environment. An owner must already be on the server allowlist; feedback does not create or grant owner access.

Compose passes the feedback environment variables through to API workers. Examples are in `backend/.env.example` and `docker-compose.env.example`.

## Quotas

All limits are backend-enforced **fixed UTC epoch hour/day windows**, not rolling windows. Boundary bursts can cross two windows; this is not a guarantee of a maximum over every moving 60-minute period.

| Scope | Hour | Day | Configuration |
| --- | ---: | ---: | --- |
| Authenticated account ID | 5 | 15 | `FEEDBACK_USER_HOUR`, `FEEDBACK_USER_DAY` |
| Guest network | 3 | 10 | `FEEDBACK_GUEST_HOUR`, `FEEDBACK_GUEST_DAY` |
| Shared network, all users | 30 | 100 | `FEEDBACK_IP_HOUR`, `FEEDBACK_IP_DAY` |

Guest limits apply to the network, not a fingerprinted device. Guests behind the same NAT share a quota; increase guest limits if a campus/office needs more headroom. Signed-in users have separate account quotas but still share the larger network ceiling. IPv6 addresses are grouped by /64, including normalization of IPv4-mapped IPv6 addresses.

- Counters live in the shared database. Atomic conflict updates enforce each ceiling across processes. All counter increments and the message commit in one transaction; a rejected request rolls back every increment.
- Duplicate retries return the existing receipt without another message or quota charge. A reused UUID with different text/identity returns 409. Idempotency exists while the original feedback record is retained.
- A 429 response includes numeric `Retry-After`, exposed through CORS. Browser cooldowns prevent accidental repeated clicks but are **not** a security boundary.
- No device fingerprinting, raw IP storage in the feedback tables or public raw-IP display. Quota keys are keyed HMACs including the scope/window; they cannot be joined to feedback records. Expired buckets are removed on intake and by the retention job.
- The HMAC key also protects stored request/payload hashes. Rotating it resets effective quota/idempotency namespaces; rotate deliberately, not per process or restart.

### Reverse proxy and denial-of-service boundary

The app uses `request.client.host`; it does **not** parse caller-supplied `X-Forwarded-For` / `X-Real-IP` itself. Uvicorn may already have processed proxy headers. Set `FORWARDED_ALLOW_IPS` (or `--forwarded-allow-ips`) to explicit trusted ingress peers/networks, **never `*`** for a publicly reachable backend. Restrict direct backend access and ensure trusted proxies sanitize headers from untrusted callers. Without correct trust configuration, all guests may share the reverse proxy's quota; blindly trusting headers lets attackers spoof their way around it.

Use ingress request-rate, connection and timeout limits in addition to application quotas. Nginx already has a general `/api/` limiter. Application quotas count accepted, validated messages; invalid payloads and duplicate receipt lookups can still consume resources. Feedback POST/review PATCH bodies are bounded to 64 KiB before JSON parsing, including chunked bodies. This is defense in depth, not a complete anti-spam or DDoS solution. CAPTCHA remains a possible later response to observed abuse.

## Data and retention

Feedback stores the subject/message, category, optional reply email/path, optional server-derived account ID, status, internal note and timestamps. No automatic browser fingerprint or full referring URL is collected. Messages are plaintext application records: restrict DB, backup and owner-console access accordingly.

`FEEDBACK_RETENTION_DAYS` defaults to **180**, measured from submission time regardless of status. The daily purge removes the complete record, including email, body, internal note and deduplication hashes. Until a deployment actually schedules the job, no time-based deletion is guaranteed. Database backups and infrastructure request/access logs have their own retention policies; application HMACs do not anonymize those logs. Owner audit events retain IDs, status transitions and whether a note changed, not its contents.

## API

- `POST /api/v1/feedback`: UUID `request_id`, `category` (`bug`, `content`, `suggestion`, `general`), `subject` (3–160), `message` (10–5000), optional `reply_email` (≤320), optional `page_reference` (≤300; local path without query/fragment).
- Optional bearer identity is verified using the existing identity/email policy. Invalid supplied credentials fail; they are never silently reclassified as guests. No approval state is required to give feedback.
- `GET /api/v1/admin/feedback?status=&category=&before=&limit=`: owner-only summary list, newest first, default 25/max 50, `next_cursor` for older rows. No body/email/deduplication hashes in list responses.
- `GET /api/v1/admin/feedback/{id}`: owner-only full detail, excluding abuse and deduplication hashes.
- `PATCH /api/v1/admin/feedback/{id}`: owner-only `status`, `internal_note` (≤3000), required `version`. Stale versions return 409; the UI preserves the owner's unsaved text for reconciliation.

## Validation and limitations

Local validation includes backend SQLite contracts and concurrent-request tests, migration upgrade/downgrade, frontend rendered tests, and Chromium form/owner-inbox fixtures in dark/light at phone and desktop widths. The owner browser fixture deliberately intercepts identity/API modules; it tests presentation, **not live authorization**. Backend tests separately reject unauthenticated/non-owner access.

CI now includes pinned optional browser tooling under `tools/browser-qa`, screenshot/report artifacts and a disposable PostgreSQL migration/RLS/concurrency job. The PostgreSQL job and GitHub-hosted workflow have not been executed in this sandbox; production deployment verification remains required. Real mobile browsers, assistive technology, live email verification and infrastructure logging/retention are not certified by these tests.

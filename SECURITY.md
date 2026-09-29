# Security policy and design guarantees

SecCraft is a **local-first cybersecurity learning platform**. The static app has no hosted user database,
no telemetry, and no third-party runtime service in the loop, so the security surface is small — but it is not zero, and this file
states exactly what is guaranteed, what is not, and how to report a problem.

## Reporting a vulnerability

Open a **private** report through GitHub: *Security → Report a vulnerability* on
<https://github.com/AmitPal-CyberBuddy/SecCraft>, or email the maintainer address listed on the
repository profile. Please include the affected file or route, a reproduction, and the impact you can
demonstrate. Do not open a public issue for an unreported vulnerability, and do not test against
systems you do not own or have written permission to test.

There is no bug bounty. Acknowledgement targets are best-effort: within 7 days, with a fix or a
decision (fix / accept / document) within 30 days for anything exploitable in the shipped build.

## What the shipped (static) build guarantees

| Property | How it is true |
| --- | --- |
| **No accounts, no credentials** | There is no login in the hosted build. Progress, notes and evidence records live in the browser's `localStorage`; clearing site data removes them. |
| **No third-party requests** | No CDN, no remote font requests (the app uses system font stacks), no analytics, no pixels. Every request is same-origin and relative. |
| **No server-side processing** | Analysis runs in the browser or against the optional local API. Captures you open never leave your machine. |
| **No secrets in the client** | Nothing in the bundle is a credential. The optional backend takes its JWT secret from `WIFIFORGE_JWT_SECRET` and refuses to issue tokens when it is unset. |
| **No invented data** | `scripts/verify-no-dummy-data.py` fails the build if mock datasets, placeholder hashes, fabricated claims or external requests reappear; `scripts/verify-lab-artifacts.py` (206 checks) proves the shipped captures decode to the values the lessons assert. |
| **Headers where the host allows** | The built `index.html` carries a CSP meta tag, `dist/_headers` carries the full header set for hosts that read it, and `nginx.conf` sets them for self-hosting. GitHub Pages cannot set response headers, which is why the CSP is in the document itself. |

## Optional API (`backend/`)

The FastAPI service is not required by the academy. If you run it:

* **CORS** is an explicit allowlist from `WIFIFORGE_ALLOWED_ORIGINS` (default: local dev origins only).
  There is no wildcard origin and no wildcard method/header set.
* **Auth is opt-in.** Without `WIFIFORGE_JWT_SECRET` the auth endpoints return `503`; the throwaway
  classroom accounts load only with `WIFIFORGE_DEMO_USERS=1` and are stored as PBKDF2-SHA256 hashes.
* **Uploads** are size-limited (`WIFIFORGE_MAX_UPLOAD_BYTES`, default 50 MB), type-checked, hashed with
  SHA-256, and parsed only by a local parser — never uploaded anywhere else.
* **Responses are derived or refused.** Endpoints that once returned placeholder data (certificate
  verification, "generated" PDFs, mock analytics, mock frames) now return a specific error explaining
  why the data does not exist.
* **Headers**: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`,
  `Permissions-Policy`, `Cross-Origin-Resource-Policy` and `Cache-Control: no-store`.

## What this project does **not** claim

* The completion record is **not** an accreditation; no third party has audited or endorsed it.
* The simulated terminal does not execute commands and is not a shell — it teaches syntax and
  interpretation. RF transmission labs (18.4 GHz… specifically the `RF_REQUIRED` tier) are documented,
  not performed: they need hardware, licensing and a signed scope.
* The app has not been through a professional penetration test. Treat the statements above as
  engineering properties you can re-verify, not as assurance.

## Hardening checklist for a self-hosted deployment

1. Serve over HTTPS only (`nginx.conf` already redirects and sets HSTS).
2. Set `WIFIFORGE_JWT_SECRET` to a random value of at least 32 bytes if you enable the API.
3. Keep `WIFIFORGE_ALLOWED_ORIGINS` to the exact origins you serve.
4. Leave `WIFIFORGE_DEMO_USERS` unset unless you are teaching a class and will reset it afterwards.
5. Keep dependencies current: `cd frontend && npm ci && npm audit`; CI pins actions to commit SHAs.
6. Never commit `.env` files — CI fails the build if one is tracked.

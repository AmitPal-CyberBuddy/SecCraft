# Session Tokens, Proxying & Client-vs-API Boundaries

**Standard Alignment:** [OWASP MASVS-AUTH](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0016](https://mas.owasp.org/MASTG/), [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)  
**Core Model:** The Untrusted Mobile Client Axiom → OAuth 2.0 PKCE Lifecycle → BOLA & Mass Assignment at the API Boundary → Proper Vulnerability Classification

---

## 1. The Fundamental Mobile Security Axiom

The central security principle governing all mobile application architecture is:

$$\text{The mobile device and client application operate entirely within an untrusted environment.}$$

```
+──────────────────────────+                        +──────────────────────────+
|  Mobile Client (Untrusted|                        |   Backend API (Trusted   |
|   Client Environment)    |                        |    Security Boundary)    |
|                          |                        |                          |
|  - Root user has full    |                        |  - Server-side authz     |
|    memory visibility     |  JSON REST / GraphQL   |  - Role enforcement      |
|  - Can hook any method   |───────────────────────►|  - Object access control |
|  - Can tamper with values|                        |  - Rate limiting         |
|  - Client checks CANNOT  |                        |  - Auditing & logging    |
|    enforce trust!        |                        |                          |
+──────────────────────────+                        +──────────────────────────+
```

Any security control enforced exclusively on the mobile client—such as disabling a "Transfer" button, validating that an entered transfer amount does not exceed a limit, or checking whether `user.isAdmin == true` in Kotlin—can be bypassed in seconds by an analyst using Burp Suite or Frida.

---

## 2. OAuth 2.0 & Session Token Lifecycle

Mobile applications cannot securely store static client secrets because APK decompilation trivially reveals all embedded strings. Modern mobile authorization mandates the **OAuth 2.0 Authorization Code Flow with PKCE** (Proof Key for Code Exchange - RFC 7636):

```
+──────────────────────────+                        +──────────────────────────+
|  Mobile App (Client)     |                        |   OAuth Authorization    |
|                          |                        |         Server           |
|  1. Generates Verifier   |                        |                          |
|     & Challenge (SHA256) |                        |                          |
|                          |                        |                          |
|  2. Opens Browser Auth ──┼───────────────────────►|  User Authenticates      |
|     (?code_challenge=...) |                        |                          |
|                          |                        |  Returns Auth Code via   |
|  3. Receives Auth Code ◄─┼────────────────────────┤  HTTPS App Link callback |
|                          |                        |                          |
|  4. Exchanges Code +     |                        |  Verifies code_verifier  |
|     code_verifier ───────┼───────────────────────►|  Matches challenge?      |
|                          |                        |                          |
|  5. Receives Tokens ◄────┼────────────────────────┤  Issues Access & Refresh |
|                          |                        |  Tokens                  |
+──────────────────────────+                        +──────────────────────────+
```

### 2.1. Token Management Architecture
- **Access Tokens (JWT):** Short-lived (e.g., 5 to 15 minutes). Carried in the HTTP `Authorization: Bearer <token>` header. Kept primarily in memory.
- **Refresh Tokens:** Long-lived. Used exclusively to obtain fresh access tokens. Must be persisted **only** inside `EncryptedSharedPreferences` backed by the Android Keystore.
- **Token Invalidation:** When a user logs out or changes their password, the mobile client must send a revocation request to the backend auth server (`/oauth/revoke`), and the server must invalidate the refresh token family.

---

## 3. Auditing the API Boundary with an Interception Proxy

Once the proxy (Burp Suite) is configured, the analyst examines the backend APIs exposed to the mobile app:

### 3.1. Broken Object Level Authorization (BOLA / IDOR)
The most prevalent API vulnerability in mobile applications:
```http
GET /api/v1/accounts/1042/statements HTTP/1.1
Host: api.mybank.com
Authorization: Bearer <ALICE_VALID_TOKEN>
```
**Test:** Intercept the request in Burp Suite and change the account ID from `1042` (Alice) to `1043` (Bob).
- **Vulnerable Behavior:** The server returns Bob's account statement, proving the backend failed to verify that the requesting session owns the referenced record.
- **Secure Behavior:** The server returns `403 Forbidden` or `404 Not Found`.

### 3.2. Broken Object Property Level Authorization (Mass Assignment)
Mobile client forms often submit JSON objects representing user updates:
```http
POST /api/v1/user/profile HTTP/1.1
Host: api.mybank.com
Authorization: Bearer <ALICE_TOKEN>
Content-Type: application/json

{
  "full_name": "Alice Smith",
  "phone": "+15550192"
}
```
**Test:** Inject additional privileged parameters into the JSON payload:
```json
{
  "full_name": "Alice Smith",
  "phone": "+15550192",
  "is_admin": true,
  "role": "SUPERUSER",
  "account_tier": "VIP"
}
```
If the backend binds the entire request body to the internal database entity without strict schema filtering, Alice escalates privileges.

---

## 4. Classifying Findings: Mobile Platform vs. Backend API

A critical professional skill is correctly classifying and routing findings:

| Finding Description | Classification Category | Reporting Path |
|---|---|---|
| Application permits unencrypted HTTP traffic via manifest. | **Android Platform Vulnerability** (MASVS-NETWORK-1) | Mobile Development Team |
| Hardcoded OAuth client secret extracted from strings.xml. | **Android Platform Vulnerability** (MASVS-CRYPTO-1) | Mobile Architecture Team |
| Modifying user ID in intercepted API request exposes another user's records. | **Backend API Vulnerability** (OWASP API Top 10 - BOLA) | Backend Engineering Team |
| User session token remains usable on server after client logout. | **Backend API Vulnerability** (OWASP API Top 10 - Broken Auth) | Identity / Auth Team |

---

## 5. Defense & Remediation Standards

1. **Enforce Complete Authorization on the Server:** Never rely on mobile UI screens, client checks, or hidden fields to protect sensitive operations. Validate user identity and object ownership on every incoming API request.
2. **Implement PKCE for All Mobile Auth:** Ensure OAuth implementations strictly enforce Proof Key for Code Exchange (RFC 7636) and use short-lived access tokens.
3. **Strict JSON Request Deserialization:** Backend APIs must explicitly define data transfer objects (DTOs) and reject undeclared JSON properties to prevent mass assignment.

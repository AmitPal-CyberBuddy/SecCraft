# Domain Verification, Redirects & Trust Decisions

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0028](https://mas.owasp.org/MASTG/)  
**Core Model:** URI Parser Semantics → Insecure Suffix Matching → Open Redirects in Deep Links → Non-Idempotent Action Safeguards

---

## 1. URI Parser Semantics & Host Validation Pitfalls

When an application receives an incoming deep-link Intent, the router activity typically parses the URI to determine whether the request originates from a trusted domain before executing navigation or loading content:

```kotlin
// VULNERABLE URI HOST CHECK IN ROUTER CODE
val uri = intent.data ?: return
val host = uri.host ?: return

// FLAW: Insecure suffix comparison!
if (host.endsWith("trusted.example")) {
    openInternalDestination(uri.getQueryParameter("next"))
}
```

### 1.1. Why `host.endsWith()` Fails
The naive check `host.endsWith("trusted.example")` checks only whether the trailing characters match the literal string:
- An attacker registers the domain: `attackertrusted.example`
- Or: `phishing-trusted.example`
- When evaluated:
  ```kotlin
  "attackertrusted.example".endsWith("trusted.example") // Evaluates to TRUE!
  ```
The application mistakes the attacker's domain for its own trusted infrastructure and proceeds to execute privileged actions.

### 1.2. The Correct Host Validation Pattern
To properly validate a domain including subdomains:
```kotlin
// SECURE HOST VALIDATION
fun isTrustedHost(host: String?): Boolean {
    if (host == null) return false
    val normalizedHost = host.lowercase()
    return normalizedHost == "trusted.example" || 
           normalizedHost.endsWith(".trusted.example")
}
```
Notice the explicit leading dot (`.trusted.example`). This ensures that only genuine subdomains (such as `api.trusted.example` or `auth.trusted.example`) match, while completely blocking `attackertrusted.example`.

---

## 2. Open Redirects in Mobile Deep Links

Many mobile applications accept a `redirect` or `next` parameter in deep links to restore user navigation after login or account verification:

`https://trusted.example/login?next=https://trusted.example/dashboard`

```
+──────────────────────────+                        +──────────────────────────+
|      Victim User         |                        |   Target Mobile App      |
|                          |                        |                          |
|  Clicks malicious link:  |  Dispatches Deep Link  |  Parses URL:             |
|  https://trusted.example/|───────────────────────►|  - Validates host: PASS  |
|  login?next=             |                        |  - Reads "next" param:   |
|  https://attacker.com/pwn|                        |    https://attacker.com  |
|                          |                        |  - Executes Redirect:    |
|                          |◄───────────────────────|    Loads attacker URL    |
|                          |                        |    in embedded WebView!  |
+──────────────────────────+                        +──────────────────────────+
```

### 2.1. Exploit Vectors of Deep-Link Open Redirects
1. **OAuth Token Theft:** If the app appends an authorization code or access token to the `next` URL upon successful login, the secret is transmitted directly to the attacker's server in the HTTP `Referer` header or query string.
2. **WebView Origin Escape:** If the redirected URL is loaded inside an internal `WebView` that has JavaScript interfaces (`addJavascriptInterface`) enabled, the attacker's site gains access to native device APIs.

---

## 3. Non-Idempotent Actions & Deep-Link Abuse

A critical architectural flaw in mobile design is allowing deep links to trigger **non-idempotent or state-changing operations** without interactive confirmation:

```
[Dangerous Anti-Pattern]
myapp://account/delete?confirm=true
myapp://transfer?recipient=attacker&amount=500
myapp://settings/disable_2fa=true
```

If an application executes these operations immediately upon deep-link receipt:
- An attacker can embed the deep link inside an invisible iframe or `<img src="...">` tag on a public website.
- When a victim browsing the web visits the attacker's page, the browser automatically dispatches the deep link to the installed application.
- The app opens in the background and executes the financial transfer or account deletion without the user ever clicking a confirmation button in the app.

---

## 4. Pentester's Operational Checklist: Validating Deep-Link Boundaries

1. **Extract URI Parsing Logic in JADX:**
   Search for router activities and inspect how `uri.getHost()`, `uri.getPath()`, and query parameters are processed.
2. **Test Host Validation Bypasses:**
   Construct deep links with:
   - Suffix variations: `https://eviltrusted.example/`
   - Unescaped dot regex tests: `https://trustedXexample/`
   - Embedded authentication tricks: `https://trusted.example@attacker.com/`
3. **Audit Redirect Targets:**
   Test redirect parameters with arbitrary external domains, `javascript:` pseudoprotocols, and relative path traversal:
   ```bash
   adb shell am start -a android.intent.action.VIEW \
       -d "myapp://auth?next=https://attacker.com"
   ```
4. **Verify Interactive Prompts for State Changes:**
   Confirm whether any financial transaction, account setting change, or data deletion triggered via deep link requires explicit biometric/PIN confirmation before executing.

---

## 5. Defense & Remediation Standards

1. **Strict Destination Allowlists:** Never redirect to arbitrary URLs extracted from query parameters. Restrict destinations to an explicit internal route enum or pre-approved URL allowlist.
2. **Require Re-Authentication for Sensitive Sinks:** Deep links should only navigate to a screen; they must **never** execute state-changing actions automatically. Require explicit user interaction (e.g., biometric prompt or confirmation dialog) before finalizing transactions.
3. **Validate Schemes Strictly:** Ensure routers explicitly verify `uri.scheme == "https"`. Reject plaintext `http://` or unexpected custom schemes.

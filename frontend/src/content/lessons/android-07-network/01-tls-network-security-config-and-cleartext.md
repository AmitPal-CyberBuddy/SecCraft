# TLS, Network Security Config & Cleartext Traffic

**Standard Alignment:** [OWASP MASVS-NETWORK](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0017](https://mas.owasp.org/MASTG/), [OWASP MASTG-TEST-0018](https://mas.owasp.org/MASTG/)  
**Core Model:** Transport Layer Security (TLS 1.2/1.3) → Network Security Config XML → Cleartext Traffic Policies → Debug-Override Boundaries

---

## 1. Transport Security on Modern Android

Android applications rely on Transport Layer Security (TLS) to safeguard network communications against eavesdropping, credential interception, and adversary-in-the-middle (AitM) attacks.

```
+─────────────────────────────────────────────────────────────+
|               Android Network Security Evolution            |
|                                                             |
|  • Android 7.0 (API 24): Introduction of Network Security   |
|    Config XML. User-installed CAs untrusted by default!     |
|                                                             |
|  • Android 9.0 (API 28): Cleartext HTTP disabled globally   |
|    by default (cleartextTrafficPermitted="false").          |
|                                                             |
|  • Android 10+ (API 29+): TLS 1.3 enabled by default with   |
|    modern forward-secret cipher suites.                     |
+─────────────────────────────────────────────────────────────+
```

---

## 2. Deep Dive: Network Security Config XML

The **Network Security Config** (`res/xml/network_security_config.xml`), declared in `AndroidManifest.xml` via `android:networkSecurityConfig="@xml/network_security_config"`, is the declarative security policy governing all network connections made by the application.

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Base configuration applied to all domains -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system" /> <!-- Trust ONLY system CAs -->
        </trust-anchors>
    </base-config>

    <!-- Domain-specific overrides -->
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.trusted.bank</domain>
        <!-- Pin certificates or public keys -->
        <pin-set expiration="2027-12-31">
            <pin digest="SHA-256">k2v657xUM4Mp...82M=</pin>
        </pin-set>
    </domain-config>

    <!-- Debug overrides: active ONLY when android:debuggable="true" -->
    <debug-overrides>
        <trust-anchors>
            <certificates src="user" /> <!-- Allows Burp CA on debug builds! -->
        </trust-anchors>
    </debug-overrides>
</network-security-config>
```

---

## 3. Cleartext HTTP Traffic Misconfigurations

Prior to Android 9, applications defaulted to allowing unencrypted HTTP connections. On Android 9+ (API 28+), cleartext HTTP is blocked unless explicitly permitted:

### 3.1. Dangerous Global Cleartext Enablement
A common vulnerability occurs when developers encounter cleartext traffic errors during testing and disable the protection globally in the manifest:

```xml
<!-- HIGH SEVERITY VULNERABILITY IN MANIFEST -->
<application
    android:usesCleartextTraffic="true" ...> <!-- Globally permits unencrypted HTTP! -->
```
Or in `network_security_config.xml`:
```xml
<base-config cleartextTrafficPermitted="true" />
```

### 3.2. Impact of Cleartext HTTP
When `cleartextTrafficPermitted="true"` is enabled:
- Any network attacker on an open Wi-Fi network, rogue AP, or compromised local network can observe API request/response bodies in plaintext.
- Authentication tokens, session cookies, passwords, and sensitive PII are exposed without cryptographic protection.
- Attackers can inject malicious payloads into API responses (AitM manipulation).

---

## 4. The Debug-Override Architecture

Security analysts frequently need to intercept network traffic during testing using an interception proxy (e.g., Burp Suite). 

In modern Android:
- Placing the Burp CA in the **User Certificate Store** does not work out of the box because `base-config` trusts only `system`.
- In production, trusting user certificates is dangerous because malware or malicious MDM profiles could inject rogue CAs.
- The platform provides `<debug-overrides>` to permit user CAs **only when the app is signed as a debug build**:
  ```xml
  <debug-overrides>
      <trust-anchors>
          <certificates src="user" />
      </trust-anchors>
  </debug-overrides>
  ```
- When `debuggable="false"` (production release), the `<debug-overrides>` block is completely ignored by the Android network stack!

---

## 5. Defense & Remediation Standards

1. **Enforce `cleartextTrafficPermitted="false"` Globally:** Never enable global cleartext traffic. If legacy non-TLS endpoints are unavoidable, strictly scope them to specific internal domains in `<domain-config>`.
2. **Restrict User CA Trust to Debug Builds:** Never declare `<certificates src="user" />` inside `<base-config>`. Restrict user CA trust strictly to `<debug-overrides>`.
3. **Audit Third-Party SDK Traffic:** Ensure third-party analytics and advertising libraries comply with the app's transport encryption policies and do not transmit tracking data over plaintext HTTP.

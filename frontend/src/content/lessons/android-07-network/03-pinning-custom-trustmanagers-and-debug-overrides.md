# Pinning, Custom TrustManagers & Debug Overrides

**Standard Alignment:** [OWASP MASVS-NETWORK](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0021](https://mas.owasp.org/MASTG/)  
**Core Model:** Certificate & Public Key Pinning (SPKI) → Network Security Config vs. OkHttp Pinner → Operational Risks (Bricking) → Pinning Bypass vs. Vulnerability

---

## 1. What is Certificate Pinning?

Under standard TLS, an Android application accepts any server certificate that chains up to any of the 130+ pre-installed Root Certificate Authorities in the Android system trust store. 

**Certificate Pinning** is a defense-in-depth control where an application restricts trust to a specific cryptographic certificate or public key, rejecting connections even if signed by a trusted system CA:

```
+─────────────────────────────────────────────────────────────+
|               Standard TLS vs. Certificate Pinning          |
|                                                             |
|  Standard TLS:                                              |
|  Server Cert ──► Any Trusted Root CA (130+ CAs) ──► ACCEPT  |
|                                                             |
|  Certificate Pinning:                                       |
|  Server Cert ──► Compare SHA-256(SPKI) with Hardcoded Pin:  |
|                  ├── Matches Pin: ACCEPT                    |
|                  └── Mismatch: REJECT & ABORT CONNECTION    |
|                      (Even if signed by a valid system CA!) |
+─────────────────────────────────────────────────────────────+
```

---

## 2. Implementation Approaches

Android applications implement pinning through two primary mechanisms:

### 2.1. Declarative Pinning via Network Security Config
The recommended Android standard is configuring `<pin-set>` in `res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config>
        <domain includeSubdomains="true">api.mybank.com</domain>
        <!-- Must include an expiration date and at least one backup pin! -->
        <pin-set expiration="2027-12-31">
            <!-- Primary production leaf or intermediate SPKI pin -->
            <pin digest="SHA-256">k2v657xUM4Mp...82M=</pin>
            <!-- Backup pin in secure cold storage -->
            <pin digest="SHA-256">9aBcDe12345...XYZ=</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

### 2.2. Programmatic Pinning via OkHttp `CertificatePinner`
Applications using OkHttp can enforce pinning programmatically:

```kotlin
val certificatePinner = CertificatePinner.Builder()
    .add("api.mybank.com", "sha256/k2v657xUM4Mp...82M=")
    .add("api.mybank.com", "sha256/9aBcDe12345...XYZ=") // Backup pin
    .build()

val client = OkHttpClient.Builder()
    .certificatePinner(certificatePinner)
    .build()
```

---

## 3. Operational Risks: App Bricking & The Backup Pin

Pinning is a double-edged sword. If implemented carelessly, certificate renewal or unforeseen CA revocation can permanently **brick** an application's ability to communicate with its servers:

1. **Leaf Certificate Expiration:** If an application pins only the server's leaf certificate and the server updates its TLS certificate upon renewal, all installed mobile clients immediately fail TLS handshakes.
2. **Emergency Key Compromise:** If a server's private key is compromised, administrators must rotate certificates immediately. If the new certificate does not match the hardcoded pin, the app cannot connect to receive updates.
3. **The Mandatory Backup Pin Standard:**
   - Always pin the **Subject Public Key Info (SPKI)** hash rather than the full certificate (allowing certificate re-issuance with the same key pair).
   - Pin an **intermediate CA** or maintain a **pre-generated backup key pair in offline cold storage** whose public key pin is embedded in the APK before release.

---

## 4. The Critical Distinction: Pinning Bypass != Application Vulnerability

In mobile application pentesting, the **untrusted mobile client** axiom reminds us that the client runs in an untrusted environment controlled by the device owner. Analysts frequently utilize dynamic hooking tools (such as Frida or Objection) to disable certificate pinning in order to route traffic into Burp Suite:

```bash
# Common Frida script hooking OkHttp CertificatePinner and Conscrypt TrustManager
frida --codeshare pcipolloni/universal-android-ssl-pinning-bypass-with-frida -f com.example.targetapp
```

When the script succeeds and Burp Suite displays intercepted HTTP traffic:

```
[Deficient Pentest Statement]
"Critical Vulnerability: SSL Pinning was bypassed using Frida, allowing an attacker to intercept all traffic."

[Professional Correct Assessment]
"Informational / Diagnostic Note: Certificate pinning was disabled in a controlled, instrumented 
test environment using runtime method hooks to facilitate API boundary auditing. 

On an unmodified production device without local root or runtime instrumentation, the application 
properly rejects untrusted proxy certificates and enforces transport security."
```

### 4.1. When is a TLS Interception a Real Vulnerability?
A finding is valid **if and only if** the unmodified release build accepts an invalid certificate **without any runtime hooks or device modifications**:
1. Does the app accept a self-signed certificate when installed on a stock, non-rooted device?
2. Does the app accept a certificate issued for the wrong hostname?
3. Does the app include `<certificates src="user" />` inside production `<base-config>`?

---

## 5. Defense & Remediation Standards

1. **Pin at the SPKI Layer:** Always pin public key hashes (`SubjectPublicKeyInfo`) rather than full certificate bytes to allow certificate renewal without updating app binaries.
2. **Mandate Backup Pins:** Every pinned domain must declare at least one backup pin.
3. **Pair Pinning with Server Attestation:** Combine client-side pinning with server-side mutual TLS (mTLS) or hardware attestation (Play Integrity API) to protect high-security financial APIs.

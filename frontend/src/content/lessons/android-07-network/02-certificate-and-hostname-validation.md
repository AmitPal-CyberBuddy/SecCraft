# Certificate & Hostname Validation

**Standard Alignment:** [OWASP MASVS-NETWORK](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0019](https://mas.owasp.org/MASTG/), [OWASP MASTG-TEST-0020](https://mas.owasp.org/MASTG/)  
**Core Model:** X.509 Certificate Chain of Trust → Common Name & Subject Alternative Name (SAN) → Custom TrustManager Anti-Patterns → The 4-Part TLS Test Matrix

---

## 1. The Two Pillars of TLS Verification

When an Android application initiates an HTTPS connection, the platform TLS engine (BoringSSL via Conscrypt) validates two independent security properties before encrypting data:

```
+─────────────────────────────────────────────────────────────+
|               The Two Pillars of TLS Verification           |
|                                                             |
|  1. Certificate Chain Validation (TrustManager):            |
|     - Verifies that the server's certificate was issued by  |
|       a recognized Root Certificate Authority (CA) in the   |
|       device's trust store.                                 |
|     - Verifies certificate dates (notBefore / notAfter).    |
|     - Verifies cryptographic signatures across the chain.   |
|                                                             |
|  2. Hostname Verification (HostnameVerifier):               |
|     - Verifies that the domain name the client intended to  |
|       reach matches the Subject Alternative Name (SAN) or   |
|       Common Name (CN) declared in the server certificate!  |
+─────────────────────────────────────────────────────────────+
```

$$\text{A certificate is only secure if BOTH the Chain is Trusted AND the Hostname Matches.}$$

---

## 2. Insecure Custom `X509TrustManager` Implementations

During development, developers configuring test environments or staging servers with self-signed certificates often bypass TLS errors by installing a custom "trust-all" `TrustManager`:

```java
// CRITICAL VULNERABILITY: Empty checkServerTrusted implementation
TrustManager[] trustAllCerts = new TrustManager[] {
    new X509TrustManager() {
        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType) { }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType) {
            // FLAW: Empty method body!
            // Accepts ANY certificate presented by ANY server!
            // Self-signed, expired, and attacker-generated certs all succeed!
            // Enables trivial Machine-in-the-Middle (MitM) traffic interception!
        }

        @Override
        public X509Certificate[] getAcceptedIssuers() {
            return new X509Certificate[0];
        }
    }
};

SSLContext sslContext = SSLContext.getInstance("TLS");
sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
```

### 2.1. The Threat of Trust-All Managers
If an empty `checkServerTrusted()` is deployed in production:
- Any adversary in the middle (e.g., on a shared Wi-Fi network) can present a self-signed certificate generated in seconds via `openssl req -x509 ...`.
- The application will establish the TLS connection without warning.
- The attacker decrypts, reads, and modifies all API traffic in real time.

---

## 3. Insecure `HostnameVerifier` Implementations

Even if an application uses the platform trust store and rejects self-signed certificates, it remains completely vulnerable to AitM attacks if it disables **Hostname Verification**:

```java
// CRITICAL VULNERABILITY: Allow-All HostnameVerifier
HttpsURLConnection.setDefaultHostnameVerifier(new HostnameVerifier() {
    @Override
    public boolean verify(String hostname, SSLSession session) {
        // FLAW: Always returns true!
        // Ignores whether the certificate was issued for the target domain!
        return true; 
    }
});
```

### 3.1. Why Allow-All Hostname Verifiers Are Lethal
Consider an attacker executing an AitM attack against `https://api.mybank.com`:
1. The attacker obtains a legitimate, CA-signed certificate for their own domain: `https://attacker.com` (e.g., via Let's Encrypt).
2. The attacker intercepts the victim's connection to `api.mybank.com` and presents the certificate for `attacker.com`.
3. The application's `TrustManager` validates that the certificate is signed by a valid Root CA (Let's Encrypt is in Android's system store).
4. The application's `HostnameVerifier` returns `true` without checking if `attacker.com` matches `api.mybank.com`.
5. The AitM attack succeeds completely, despite using valid certificates.

---

## 4. The 4-Part Pentester TLS Test Matrix

When evaluating an application's server trust implementation, test across four distinct environmental baselines:

| Test Case | Certificate Condition | Expected Secure Result | Vulnerability Indicated |
|---|---|---|---|
| **1. Positive Baseline** | Legitimate server certificate matching domain name. | Connection succeeds normally. | Baseline operational check. |
| **2. Wrong Hostname** | Valid certificate signed by trusted CA, but issued for a different domain (`wrong.example.com`). | Connection **fails immediately** with `SSLPeerUnverifiedException`. | If connection succeeds: Hostname Verification is disabled! |
| **3. Untrusted Root CA** | Certificate issued by an untrusted or self-signed test CA. | Connection **fails immediately** with `SSLHandshakeException`. | If connection succeeds: Custom Trust-All `X509TrustManager` installed! |
| **4. Expired Certificate** | Valid certificate whose expiration date is in the past. | Connection **fails immediately** with `CertificateExpiredException`. | If connection succeeds: Certificate validity period checks disabled! |

---

## 5. Defense & Remediation Standards

1. **Rely on Platform Default Trust Managers:** Never create custom implementations of `X509TrustManager` or `HostnameVerifier`. Modern HTTP libraries (such as OkHttp) enforce rigorous chain and hostname validation by default.
2. **Use Network Security Config for Staging CAs:** If staging environments require custom CA certificates, configure them strictly in `<debug-overrides>` within `network_security_config.xml`, ensuring production builds are unaffected.
3. **Enforce Strict Hostname Verification:** Ensure all custom socket factories invoke `OkHostnameVerifier.INSTANCE.verify(hostname, session)`.

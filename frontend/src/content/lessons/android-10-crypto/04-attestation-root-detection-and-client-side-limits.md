# Attestation, Root Detection & Client-Side Security Limits

**Standard Alignment:** [OWASP MASVS-RESILIENCE](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0031](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0032](https://mas.owasp.org/MASVS/)  
**Core Model:** Heuristic Root Checks vs. The Untrusted Client Axiom → Hardware Key Attestation → Google Play Integrity API Architecture → The 12-Step Lab Contract

---

## 1. The Fallacy of Purely Client-Side Security Checks

Mobile applications frequently embed heuristic checks to detect whether a device is rooted, running in an emulator, or being instrumented with Frida:

```
+─────────────────────────────────────────────────────────────+
|               The Untrusted Mobile Client Axiom             |
|                                                             |
|  No computation executed entirely on client-side hardware   |
|  controlled by an adversary can be trusted to report its    |
|  own compromise truthfully.                                 |
|                                                             |
|  • If code checks for "/system/bin/su", the attacker hooks  |
|    the filesystem API (stat, access, open) to hide the file.|
|  • If code checks Build.TAGS for "test-keys", the attacker  |
|    hooks the Java getter or patches the system property.    |
|  • If code returns a boolean "isDeviceSafe()", the attacker |
|    overrides the method return value to "true".             |
+─────────────────────────────────────────────────────────────+
```

---

## 2. Hardware-Backed Key Attestation

To establish verifiable device integrity without relying on easily manipulated client-side heuristics, Android introduced **Key Attestation**:

When an application generates a key inside the hardware Keystore, it supplies an attestation challenge (a cryptographically random nonce provided by the backend server):

```kotlin
val spec = KeyGenParameterSpec.Builder("auth_key", KeyProperties.PURPOSE_SIGN)
    .setDigests(KeyProperties.DIGEST_SHA256)
    .setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PSS)
    // Server-supplied random challenge nonce
    .setAttestationChallenge(serverChallengeNonce)
    .build()
```

### 2.1. The Attestation Certificate Chain
The Android Keystore returns a certificate chain where:
1. The **Leaf Certificate** is signed by an intermediate key certified by the **Google Root CA**.
2. The leaf certificate contains custom ASN.1 extension data (`1.3.6.1.4.1.11129.2.1.17`) populated directly by the TEE or StrongBox hardware.
3. The extension certifies:
   - Whether the key is hardware-backed (`KM_SECURITY_LEVEL_TRUSTED_ENVIRONMENT` or `KM_SECURITY_LEVEL_STRONGBOX`).
   - The device OS version and security patch level.
   - The **Verified Boot State** (`VerifiedBootKey`, `deviceLocked: true`, `VerifiedBootState: VERIFIED`).

$$\text{The backend server validates the certificate chain against Google's public Root CA.}$$

Because the signature is generated inside the hardware TEE using keys burnt into silicon during manufacturing, a compromised Android OS or Frida script cannot forge a valid attestation certificate.

---

## 3. Google Play Integrity API

For comprehensive application integrity and anti-abuse verification, Google deprecated SafetyNet in favor of the **Play Integrity API**:

```
+────────────────────+         +────────────────────+         +────────────────────+
|   Android Client   |         |    Google Play     |         |    Backend API     |
|   (Target App)     |         |      Servers       |         |   (Your Server)    |
+─────────┬──────────+         +─────────┬──────────+         +─────────┬──────────+
          │                                                     │
          │ 1. Request Nonce                                    │
          │────────────────────────────────────────────────────►│
          │ 2. Returns Server Nonce                             │
          │◄────────────────────────────────────────────────────│
          │                                                     │
          │ 3. Request Integrity Token(Nonce)                   │
          │────────────────────────►│                           │
          │ 4. Cryptographically    │                           │
          │    Signed Integrity Token                           │
          │◄────────────────────────│                           │
          │                                                     │
          │ 5. Transmit Integrity Token                         │
          │────────────────────────────────────────────────────►│
          │                                                     │ 6. Decrypt & Verify
          │                                                     │    Token with Google
          │                                                     │    Play APIs
          │                                                     │
          │ 7. Grant Authorized Session                         │
          │◄────────────────────────────────────────────────────│
```

### 3.1. Evaluating Integrity Token Verdicts
The backend server decrypts the token to verify three independent dimensions of trust:
1. **Device Recognition (`deviceRecognitionVerdict`):**
   - `MEETS_BASIC_INTEGRITY`: Passes basic system integrity checks.
   - `MEETS_DEVICE_INTEGRITY`: Hardware-backed Android operating system with locked bootloader.
   - `MEETS_STRONG_INTEGRITY`: Discrete hardware security module (StrongBox) with hardware keystore guarantees.
2. **App Licensing (`appLicensingVerdict`):**
   - `LICENSED`: User acquired the official build from Google Play.
3. **App Recognition (`appRecognitionVerdict`):**
   - Confirms that the target app's SHA-256 certificate digest and package name match the developer's registered build.

---

## 4. Applying the 12-Step Lab Contract to Cryptographic Audits

When documenting cryptographic findings:

1. **Prerequisites:** JADX-GUI, Android test device, Burp Suite, Frida.
2. **Scope:** Target package `com.example.targetapp`, class `VaultStorage`.
3. **Target / Build Identity:** SHA-256 digest of target APK verified.
4. **Hypothesis:** The application encrypts user records using AES-GCM with a constant static IV, allowing keystream reuse attacks and ciphertext decryption.
5. **Static Evidence:** Decompiled code in `VaultStorage.java` shows `byte[] iv = new byte[12];` initialized to zeros and passed to `GCMParameterSpec(128, iv)` without randomization.
6. **Test Plan:** Encrypt two distinct test documents on the device; extract both ciphertexts; verify that XORing the ciphertexts yields the XOR of the plaintexts.
7. **Observation:** Ciphertext 1 and Ciphertext 2 both use identical 12-byte zero IVs; XOR of ciphertexts reveals identical repeating patterns corresponding to plaintext headers.
8. **Evaluation:** Confirms Nonce Reuse in AES-GCM Encryption ([OWASP MASVS-CRYPTO-1](https://mas.owasp.org/MASVS/)).
9. **Impact:** High: permits passive eavesdroppers to recover plaintexts and forge authentication tags.
10. **Remediation:** Generate a fresh 12-byte random IV using `SecureRandom` per encryption and prepend the IV to the output ciphertext.
11. **Retest:** Build fixed release flavor; encrypt multiple records; inspect outputs to confirm all IVs are distinct and randomly distributed.
12. **Limitations:** Requires an adversary to capture multiple ciphertexts encrypted under the same key.

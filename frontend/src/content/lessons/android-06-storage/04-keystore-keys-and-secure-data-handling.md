# Keystore, Keys & Secure Data Handling

**Standard Alignment:** [OWASP MASVS-CRYPTO](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0014](https://mas.owasp.org/MASTG/), [OWASP MASTG-TEST-0015](https://mas.owasp.org/MASTG/)  
**Core Model:** Hardware-Backed Keymaster / StrongBox → Non-Exportable Cryptographic Keys → Biometric-Bound CryptoObjects → Keystore vs. Process Memory Boundaries

---

## 1. The Android Keystore Architecture

The **Android Keystore system** (`AndroidKeyStore` provider) is designed to let applications perform cryptographic operations while ensuring that **key material cannot be extracted from the device**, even by a root user:

```
+─────────────────────────────────────────────────────────────+
|               Android Keystore System Layers                |
|                                                             |
|  [Application Process (App UID)]                            |
|         │                                                   |
|         ├── Stores alias handle (e.g., "auth_master_key")   |
|         ├── NEVER holds raw private key bytes!              |
|         │                                                   |
|         ▼ IPC to Keystore Daemon (keystored)                |
|  [Android Keystore Daemon]                                  |
|         │                                                   |
|         ▼ Hardware Abstraction Layer (HAL)                  |
|  [Hardware Security Module / TEE]                           |
|         ├── Trusted Execution Environment (TEE / TrustZone) |
|         └── StrongBox Keymaster (Dedicated Secure Silicon)  |
|             - Generates key pairs                           |
|             - Executes Cipher.doFinal() / Signature.sign()  |
|             - Keys NEVER leave this hardware boundary!      |
+─────────────────────────────────────────────────────────────+
```

### 1.1. TEE vs. StrongBox
1. **Trusted Execution Environment (TEE):** A secure enclave running in an isolated processor mode (ARM TrustZone) alongside the main Android Linux kernel. The TEE runs its own microkernel and memory-isolated crypto engines.
2. **StrongBox Keymaster:** Available on select hardware (Google Pixel 3+, Samsung Knox), StrongBox uses a physically separate, tamper-resistant chip (microcontroller with secure CPU, storage, and true random number generator) to protect against side-channel and bus-snooping attacks.

---

## 2. Generating Hardware-Backed Symmetric Keys

To generate a non-exportable AES-256-GCM key inside Android Keystore:

```kotlin
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.KeyGenerator

fun generateSecureKey(alias: String) {
    val keyGenerator = KeyGenerator.getInstance(
        KeyProperties.KEY_ALGORITHM_AES, 
        "AndroidKeyStore"
    )

    val spec = KeyGenParameterSpec.Builder(
        alias,
        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
    )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(256)
        .setRandomizedEncryptionRequired(true) // Enforces fresh IV for every encryption
        .setIsStrongBoxBacked(true)           // Enforce StrongBox HSM if available
        .build()

    keyGenerator.init(spec)
    keyGenerator.generateKey()
}
```

---

## 3. Biometric-Bound Keys (`BiometricPrompt.CryptoObject`)

A vital security capability of Android Keystore is **authentication-gated key usage**. The hardware enforces that the cryptographic key cannot be initialized or used unless the user recently confirmed their identity via biometric authentication or lockscreen credentials:

```kotlin
val spec = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_DECRYPT)
    // KEY CANNOT BE USED WITHOUT BIOMETRIC AUTHENTICATION
    .setUserAuthenticationRequired(true)
    .setUserAuthenticationParameters(
        0, // 0 = Key authorized ONLY for a single BiometricPrompt transaction!
        KeyProperties.AUTH_BIOMETRIC_STRONG
    )
    .setInvalidatedByBiometricEnrollment(true) // Invalidate key if new fingerprint enrolled
    .build()
```

### 3.1. Cryptographic Enforcement via `CryptoObject`
Many applications implement biometric authentication insecurely:
```
[Insecure Biometric Pattern]
BiometricPrompt.authenticate(...) 
  └── OnSuccess() ──► Open sensitive dashboard / send API request
(Bypassable in 1 line of Frida code hooking onAuthenticationSucceeded!)
```

In a secure implementation, the application passes a `BiometricPrompt.CryptoObject` wrapping an uninitialized `Cipher`:
```kotlin
val cipher = Cipher.getInstance("AES/GCM/NoPadding")
val key = keyStore.getKey(keyAlias, null) as SecretKey
cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, iv))

// THE CRYPTO OBJECT IS TIED TO THE BIOMETRIC HARDWARE SENSOR
val cryptoObject = BiometricPrompt.CryptoObject(cipher)
biometricPrompt.authenticate(promptInfo, cryptoObject)
```
- If an attacker hooks `onAuthenticationSucceeded()`, the biometric prompt dismisses, but **the hardware TEE has not authorized the key**.
- When the code subsequently calls `cipher.doFinal()`, the Keystore throws `UserNotAuthenticatedException`!
- **Real cryptographic security cannot be bypassed by client-side UI hooks.**

---

## 4. The Fundamental Keystore Limitation: Keys vs. Process Plaintext

Pentesters and developers must understand the boundary of what Keystore does—and does not—protect:

$$\text{Keystore protects KEYS in hardware; it CANNOT protect PLAINTEXT in process memory!}$$

```
+──────────────────────────+                        +──────────────────────────+
|  What Keystore Protects  |                        |  What Keystore CANNOT    |
|                          |                        |  Protect Against         |
|                          |                        |                          |
|  - Physical chip extraction|                      |  - Memory dump of active |
|  - Firmware flash reading |                       |    application process   |
|  - Exporting key bytes   |                        |  - Runtime hooking of    |
|    via root / adb shell  |                        |    Cipher.doFinal()      |
|  - Offline brute-forcing |                        |  - Malicious code running|
|    of device storage     |                        |    inside the target UID |
+──────────────────────────+                        +──────────────────────────+
```

When an application decrypts a session token using a Keystore key:
1. The cipher returns the decrypted byte array to Java memory.
2. The byte array is converted into a `String` (which is immutable and resides in the JVM/ART heap).
3. Any attacker with Frida or memory extraction capabilities attached to the running process can capture the plaintext token after decryption.

---

## 5. Defense & Remediation Standards

1. **Hardware-Back All Master Keys:** Always generate cryptographic keys using `"AndroidKeyStore"` provider with `KeyGenParameterSpec`.
2. **Bind High-Value Keys to `CryptoObject`:** Ensure biometric authentication is backed by cryptographic key authorization rather than boolean callbacks.
3. **Wipe Plaintext from Memory Rapidly:** Handle decrypted credentials using byte arrays (`byte[]`) or character arrays (`char[]`) and immediately overwrite them with zeros (`Arrays.fill(bytes, (byte) 0)`) when finished, avoiding immutable `String` objects that persist in garbage-collected memory.

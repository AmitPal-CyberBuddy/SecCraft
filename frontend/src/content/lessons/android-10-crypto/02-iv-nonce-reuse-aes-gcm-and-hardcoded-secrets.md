# IV/Nonce Reuse, AES-GCM & Hardcoded Secrets

**Standard Alignment:** [OWASP MASVS-CRYPTO](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0014](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0015](https://mas.owasp.org/MASVS/)  
**Core Model:** AES-GCM Mechanics → The Nonce Reuse Catastrophe (Two-Time Pad & GHASH Forgery) → Static IV Anti-Patterns (`Vault.kt`) → Paired Vulnerable and Fixed Implementations

---

## 1. AES-GCM: Authenticated Encryption with Associated Data (AEAD)

AES in Galois/Counter Mode (AES-GCM) is the industry standard for symmetric encryption because it combines data confidentiality with integrity protection. It consists of two components:
1. **CTR Mode Encryption:** Generates keystream blocks by encrypting an incrementing counter initialized by a **12-byte Initialization Vector (IV / Nonce)**.
2. **GHASH Authenticator:** Computes a 128-bit cryptographic authentication tag over the ciphertext and optional Associated Data (AAD) using polynomial multiplication in $GF(2^{128})$.

$$\text{The GCM Security Invariant: An (Encryption Key, Nonce) pair must NEVER be used more than once!}$$

---

## 2. The Catastrophic Impact of Nonce Reuse

If two distinct plaintexts ($P_1$ and $P_2$) are encrypted using the same key $K$ and the same IV $N$:

### 2.1. Loss of Confidentiality (Two-Time Pad)
Because Counter Mode acts as a stream cipher, encrypting two plaintexts with the same keystream allows an eavesdropper to compute the XOR of the plaintexts:

$$C_1 \oplus C_2 = (P_1 \oplus \text{Keystream}) \oplus (P_2 \oplus \text{Keystream}) = P_1 \oplus P_2$$

If the attacker knows or guesses one plaintext, the second plaintext is immediately compromised.

### 2.2. Loss of Integrity (The "Forbidden Attack" / GHASH Key Recovery)
Beyond confidentiality loss, Antoine Joux demonstrated the **GCM Forbidden Attack**: reusing a nonce allows an attacker to solve the GHASH polynomial over $GF(2^{128})$ and recover the internal authentication subkey $H$. Once $H$ is known, the attacker can forge valid authentication tags for arbitrary forged messages.

---

## 3. Paired Implementation Analysis: `Vault.kt`

Consider the following pair of implementations representing a local note/document encryption engine:

### 3.1. Vulnerable Implementation (Static All-Zero IV)
```kotlin
// VULNERABLE IMPLEMENTATION (android-demos/Vault.kt)
class InsecureVault(private val secretKey: SecretKey) {

    fun encrypt(plaintext: ByteArray): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        
        // CRITICAL VULNERABILITY: Static 12-byte all-zero IV reused across every encryption!
        val staticIv = ByteArray(12) // All zeros: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        val spec = GCMParameterSpec(128, staticIv)
        
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, spec)
        return cipher.doFinal(plaintext)
    }
}
```

### 3.2. Hardened Implementation (Dynamic Cryptographic IV Prepended to Ciphertext)
```kotlin
// SECURE HARDENED IMPLEMENTATION
class SecureVault(private val secretKey: SecretKey) {

    companion object {
        private const val IV_LENGTH_BYTES = 12
        private const val TAG_LENGTH_BITS = 128
    }

    fun encrypt(plaintext: ByteArray): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        
        // 1. Generate fresh cryptographically secure random 12-byte IV for EVERY encryption
        val iv = ByteArray(IV_LENGTH_BYTES)
        SecureRandom().nextBytes(iv)
        
        val spec = GCMParameterSpec(TAG_LENGTH_BITS, iv)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, spec)
        val ciphertext = cipher.doFinal(plaintext)
        
        // 2. Prepend the public IV to the ciphertext output: [12-byte IV] + [Ciphertext + Tag]
        val combined = ByteArray(IV_LENGTH_BYTES + ciphertext.size)
        System.arraycopy(iv, 0, combined, 0, IV_LENGTH_BYTES)
        System.arraycopy(ciphertext, 0, combined, IV_LENGTH_BYTES, ciphertext.size)
        return combined
    }

    fun decrypt(combinedPayload: ByteArray): ByteArray {
        require(combinedPayload.size >= IV_LENGTH_BYTES + 16) { "Payload too short" }
        
        // 1. Extract the 12-byte IV from the front of the payload
        val iv = ByteArray(IV_LENGTH_BYTES)
        System.arraycopy(combinedPayload, 0, iv, 0, IV_LENGTH_BYTES)
        
        // 2. Extract remaining ciphertext + auth tag
        val ciphertext = ByteArray(combinedPayload.size - IV_LENGTH_BYTES)
        System.arraycopy(combinedPayload, IV_LENGTH_BYTES, ciphertext, 0, ciphertext.size)
        
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(TAG_LENGTH_BITS, iv)
        cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)
        
        // If authentication tag does not match, doFinal throws AEADBadTagException!
        return cipher.doFinal(ciphertext)
    }
}
```

---

## 4. Android Security Provider Behavior

In Android 10 (API 29) and later, the default security provider (Conscrypt) implements a safety check: if an application attempts to call `cipher.init(Cipher.ENCRYPT_MODE, key, reusedSpec)` with the exact same `GCMParameterSpec` instance on the same `Cipher` object, Conscrypt throws:

```
java.security.InvalidAlgorithmParameterException: Cannot reuse IV for GCM encryption
```

However, static analysis and dynamic audits must be thorough: if an application instantiates a **new** `Cipher` instance (`Cipher.getInstance("AES/GCM/NoPadding")`) each time it encrypts, the provider's internal state tracking cannot detect the reuse of identical IV bytes across different instances. The vulnerability persists!

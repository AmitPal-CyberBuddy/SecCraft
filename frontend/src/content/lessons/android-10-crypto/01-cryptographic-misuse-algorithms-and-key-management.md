# Cryptographic Misuse: Algorithms, Ciphers & Key Derivation

**Standard Alignment:** [OWASP MASVS-CRYPTO](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0012](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0013](https://mas.owasp.org/MASVS/)  
**Core Model:** Modern Cryptographic Standards → Legacy & Deprecated Primitives → Key Derivation Standards (PBKDF2) → Secure Randomness Generation

---

## 1. The Mobile Cryptography Baseline

Android applications must rely on industry-standard, authenticated cryptographic primitives. Rolling custom ciphers, misconfiguring modes of operation, or using legacy algorithms introduces critical vulnerabilities into data confidentiality and integrity:

```
+─────────────────────────────────────────────────────────────────────────────+
|                     Cryptographic Primitive Evaluation                      |
|                                                                             |
|  [VULNERABLE / DEPRECATED]                [SECURE MODERN STANDARD]          |
|  • AES in ECB mode (AES/ECB/PKCS5Padding) • AES in GCM mode (AES/GCM/NoPadding) |
|  • DES, 3DES (Triple-DES), RC4            • ChaCha20-Poly1305               |
|  • MD5, SHA-1 (Collisions known)          • SHA-256, SHA-384, SHA-512       |
|  • Static / Hardcoded AES keys            • Android Keystore Hardware Keys  |
|  • Weak PBKDF2 (< 100,000 iterations)     • Argon2id or PBKDF2 (120,000+)   |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 2. Insecure Cipher Modes: The ECB Mode Pattern Leak

The Electronic Codebook (ECB) mode encrypts each 16-byte block of plaintext independently under the exact same cryptographic key:

$$\text{Ciphertext}_i = E_K(\text{Plaintext}_i)$$

If two plaintext blocks are identical, their resulting ciphertext blocks are mathematically identical. As demonstrated by the famous "ECB Penguin" phenomenon, ECB mode preserves structural patterns in data:

```java
// CRITICAL VULNERABILITY: AES in ECB mode
// Identical 16-byte input blocks produce identical output blocks!
Cipher cipher = Cipher.getInstance("AES/ECB/PKCS5Padding");
cipher.init(Cipher.ENCRYPT_MODE, secretKey);
byte[] ciphertext = cipher.doFinal(plaintext);
```

```kotlin
// HARDENED IMPLEMENTATION: AES in Authenticated GCM Mode
// Enforces confidentiality, uniqueness, and message integrity (GHASH authentication tag)
val cipher = Cipher.getInstance("AES/GCM/NoPadding")
val iv = ByteArray(12)
SecureRandom().nextBytes(iv) // Cryptographically secure random 12-byte IV
val spec = GCMParameterSpec(128, iv) // 128-bit authentication tag
cipher.init(Cipher.ENCRYPT_MODE, secretKey, spec)
val ciphertext = cipher.doFinal(plaintext)
```

---

## 3. Key Derivation: Passwords to Cryptographic Keys

Never use a raw user password directly as a symmetric encryption key. Human-chosen passwords have low entropy and can be brute-forced. Applications must process passwords through a salted, slow **Key Derivation Function (KDF)**:

### 3.1. Vulnerable Key Derivation Anti-Patterns
```java
// CRITICAL FLAW: Generating a key directly from password bytes or raw SHA-256
byte[] keyBytes = password.getBytes(StandardCharsets.UTF_8);
SecretKeySpec key = new SecretKeySpec(keyBytes, 0, 16, "AES"); // Inadequate entropy!

// CRITICAL FLAW: Single-iteration SHA-256 hashing (GPU crackable in milliseconds)
MessageDigest md = MessageDigest.getInstance("SHA-256");
byte[] derivedKey = md.digest(password.getBytes(StandardCharsets.UTF_8));
```

### 3.2. Secure Key Derivation: PBKDF2WithHmacSHA256
A secure KDF introduces a unique per-user cryptographic salt and a computationally intensive iteration count:

```kotlin
import java.security.SecureRandom
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

object KeyDerivationUtil {
    private const val ITERATIONS = 210000 // Meets OWASP 2026 computational threshold
    private const val KEY_LENGTH = 256     // 256-bit AES key
    private const val SALT_LENGTH = 16    // 16-byte random salt

    fun deriveKeyFromPassword(password: CharArray, salt: ByteArray): SecretKeySpec {
        val spec = PBEKeySpec(password, salt, ITERATIONS, KEY_LENGTH)
        val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        val keyBytes = factory.generateSecret(spec).encoded
        return SecretKeySpec(keyBytes, "AES")
    }

    fun generateSecureSalt(): ByteArray {
        val salt = ByteArray(SALT_LENGTH)
        SecureRandom().nextBytes(salt) // Cryptographically random per-user salt
        return salt
    }
}
```

---

## 4. Secure Randomness & Pseudo-Random Number Generators (PRNG)

Generating nonces, initialization vectors (IVs), and salts requires high-entropy, cryptographically secure pseudo-random number generators (CSPRNG):

```kotlin
// INSECURE: Standard Java Random is deterministic and predictable!
val weakRandom = java.util.Random()
val weakNonce = weakRandom.nextInt() // Predictable seed; vulnerable to key recovery!

// SECURE: Java Cryptography Architecture CSPRNG
val secureRandom = java.security.SecureRandom()
val iv = ByteArray(12)
secureRandom.nextBytes(iv) // Backed by Android Linux kernel /dev/urandom
```

On Android, `SecureRandom` is securely seeded by the Linux kernel's entropy pool (`/dev/urandom`). Never attempt to manually seed `SecureRandom` with a static or system-clock value via `setSeed()`, as doing so destroys entropy and renders the generated bytes predictable.

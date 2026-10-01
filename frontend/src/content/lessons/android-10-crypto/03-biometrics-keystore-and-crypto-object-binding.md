# Biometrics, Keystore & CryptoObject Binding

**Standard Alignment:** [OWASP MASVS-AUTH](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0016](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0017](https://mas.owasp.org/MASVS/)  
**Core Model:** The Insecure Boolean Callback Trap → Hardware-Bound `CryptoObject` Standard → StrongBox Keymaster vs. TEE → Hook-Resistant Biometric Authentication

---

## 1. The Insecure Boolean Callback Trap

Many Android applications implement biometric authentication using `BiometricPrompt` as a purely visual UI gate:

```kotlin
// INSECURE IMPLEMENTATION: Unbound Boolean Callback
val biometricPrompt = BiometricPrompt(activity, executor, 
    object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
            super.onAuthenticationSucceeded(result)
            // CRITICAL FLAW: Relying on a pure control-flow callback!
            // No cryptographic operation is performed.
            navigateToAccountScreen()
        }
    }
)
// Invoked WITHOUT a CryptoObject:
biometricPrompt.authenticate(promptInfo)
```

### 1.1. Why Boolean Callbacks Fail Against Frida
Because the transition to `navigateToAccountScreen()` relies on a client-side boolean signal, an attacker on a rooted device can use a 5-line Frida script to bypass authentication entirely:

```javascript
// Trivial Frida bypass for boolean biometric callbacks
Java.perform(function() {
    var Callback = Java.use("com.example.targetapp.ui.BiometricActivity$1");
    Callback.onAuthenticationSucceeded.implementation = function(result) {
        console.log("[*] Forcing biometric authentication success!");
        this.onAuthenticationSucceeded(result);
    };
});
```

---

## 2. The Secure Standard: `BiometricPrompt.CryptoObject`

To make biometric authentication impervious to runtime callback tampering, the application must bind the biometric verification directly to a cryptographic operation backed by the hardware **Android Keystore**:

```
+─────────────────────────────────────────────────────────────+
|               CryptoObject Hardware Binding Model           |
|                                                             |
|  1. Key Stored in TEE / StrongBox (Hardware HSM).           |
|  2. Key configured with:                                    |
|     setUserAuthenticationRequired(true)                     |
|  3. Hardware Keystore REFUSES to perform encryption or       |
|     decryption until a valid biometric match occurs.        |
|  4. Biometric sensor provides a cryptographic auth token to |
|     the TEE / StrongBox kernel driver.                      |
|  5. TEE releases the Cipher only for this single operation. |
+─────────────────────────────────────────────────────────────+
```

### 2.1. Generating a Biometric-Bound Hardware Key
```kotlin
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

fun generateBiometricKey(keyAlias: String) {
    val keyGenerator = KeyGenerator.getInstance(
        KeyProperties.KEY_ALGORITHM_AES, 
        "AndroidKeyStore"
    )
    
    val spec = KeyGenParameterSpec.Builder(
        keyAlias,
        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
    )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(256)
        // Binds key strictly to biometric authentication
        .setUserAuthenticationRequired(true)
        .setUserAuthenticationParameters(
            0, // 0 = valid strictly for a single cryptographic operation
            KeyProperties.AUTH_BIOMETRIC_STRONG
        )
        // Invalidates key if the user enrolls a new fingerprint or face!
        .setInvalidatedByBiometricEnrollment(true)
        .build()

    keyGenerator.init(spec)
    keyGenerator.generateKey()
}
```

### 2.2. Executing Authentication via `CryptoObject`
```kotlin
fun authenticateWithCrypto(cipher: Cipher, prompt: BiometricPrompt, info: PromptInfo) {
    // Wrap initialized Cipher in a CryptoObject
    val cryptoObject = BiometricPrompt.CryptoObject(cipher)
    
    // Pass CryptoObject to authenticate()
    prompt.authenticate(info, cryptoObject)
}

// In AuthenticationCallback:
override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
    val authenticatedCipher = result.cryptoObject?.cipher 
        ?: throw IllegalStateException("Missing authenticated cipher")
        
    // Hardware-verified decryption:
    // If an attacker uses Frida to hook this callback, calling doFinal()
    // on an unauthenticated cipher throws UserNotAuthenticatedException!
    val decryptedToken = authenticatedCipher.doFinal(encryptedAuthToken)
    useToken(decryptedToken)
}
```

---

## 3. StrongBox Keymaster vs. Trusted Execution Environment (TEE)

Android Keystore supports two distinct hardware security architectures:

| Hardware Security Module | Android Support | Implementation Architecture | Resistance Profile |
|---|---|---|---|
| **Trusted Execution Environment (TEE)** | Android 4.3+ (API 18+) | Runs in a secure world (ARM TrustZone) sharing the main device SoC/CPU and main system RAM. | Highly resistant to software-level Android OS compromises, but vulnerable to hardware fault injection or SoC cache side-channels. |
| **StrongBox Keymaster / KeyMint** | Android 9.0+ (API 28+) | Runs on a dedicated, physically isolated discrete security chip with its own CPU, secure storage, and true random number generator (e.g., Titan M2). | Tamper-resistant against physical side-channel attacks, fault injection, and package decapping. |

```kotlin
// Requesting StrongBox backing on supporting devices (e.g., Google Pixel / Samsung Knox)
val builder = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_DECRYPT)
    .setIsStrongBoxBacked(true) // Enforce dedicated discrete secure element
```

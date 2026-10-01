# Dynamic Code Loading, Anti-Tamper & App Resilience

**Standard Alignment:** [OWASP MASVS-CODE](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0005](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0006](https://mas.owasp.org/MASVS/)  
**Core Model:** Dynamic Code Loading (DCL) Mechanics → Caller-Controlled Plugin Injection (`PluginLoader.kt`) → Android 14 Read-Only Mandate → The 12-Step Lab Contract

---

## 1. Dynamic Code Loading (DCL) Mechanics in Android

Android allows applications to load and execute DEX bytecode and native code at runtime that was not packaged into the original base APK. This is achieved using specialized class loaders:

```
+─────────────────────────────────+     +──────────────────────────────────+
|      Base APK (Installed)       |     |     Dynamic Payload (External)   |
|                                 |     |                                  |
|  • Main Application Classes     |     |  • Untrusted / Downloaded .dex   |
|  • Constructs DexClassLoader    |────►|  • Dynamic plugin or feature     |
|  • Invokes loadClass()          |     |  • Executed in app's Linux UID!  |
+─────────────────────────────────+     +──────────────────────────────────+
```

### 1.1. Core ClassLoader Primitives

| ClassLoader Class | Introduced | Execution Mechanism | Security Considerations |
|---|---|---|---|
| **`PathClassLoader`** | API 1+ | Loads classes from local filesystem paths; default loader for installed application APKs. | Safe when restricted to `/data/app/` paths. |
| **`DexClassLoader`** | API 3+ | Loads classes from arbitrary JAR/APK/DEX files on disk. | **High Risk:** Requires optimized DEX directory; vulnerable to file replacement if paths are writable. |
| **`InMemoryDexClassLoader`** | API 26+ | Loads DEX bytecode directly from a memory buffer (`ByteBuffer`). | Reduces disk exposure, but bytecode can still be captured from process memory dumps. |

---

## 2. Insecure Dynamic Code Loading: The Plugin Injection Flaw

Consider the following case representing a modular application with dynamic plugin loading:

```kotlin
// VULNERABLE IMPLEMENTATION (android-demos/PluginLoader.kt)
class InsecurePluginLoader(private val context: Context) {

    fun loadAndExecutePlugin(intent: Intent) {
        // CRITICAL VULNERABILITY: Caller-controlled path from Intent extra!
        val pluginPath = intent.getStringExtra("plugin_path") ?: return
        val pluginFile = File(pluginPath)

        // Loading untrusted DEX file from arbitrary filesystem path
        // (e.g., /sdcard/Download/malicious_plugin.dex or /data/local/tmp/)
        val dexClassLoader = DexClassLoader(
            pluginFile.absolutePath,
            context.codeCacheDir.absolutePath,
            null,
            context.classLoader
        )

        try {
            val pluginClass = dexClassLoader.loadClass("com.example.plugin.FeatureModule")
            val instance = pluginClass.getDeclaredConstructor().newInstance()
            val executeMethod = pluginClass.getMethod("execute")
            
            // EXECUTES ARBITRARY CODE IN APPLICATION CONTEXT!
            executeMethod.invoke(instance)
        } catch (e: Exception) {
            Log.e("PluginLoader", "Failed to execute plugin", e)
        }
    }
}
```

### 2.1. Attack Mechanics
1. **Unvalidated Path Control:** If an exported Activity or Broadcast Receiver accepts `plugin_path` without validation, an external malicious application can pass the path to an APK or DEX it controls in external storage (`/sdcard/`).
2. **Time-of-Check to Time-of-Use (TOCTOU):** Even if an app downloads a plugin over HTTPS to internal storage, if the target directory is writable by other processes or if permissions are permissive (`0666`), an attacker can swap the DEX file immediately prior to class loading.

---

## 3. Defense & Android Platform Hardening

### 3.1. Android 14 (API 34) Read-Only Mandate
Starting in Android 14, to mitigate dynamic code tampering, the operating system strictly forbids loading dynamic code files that are writable. If an application attempts to load a dynamically loaded file that has write permissions, Android throws a `SecurityException`:

```kotlin
// Android 14 Hardening: File MUST be made read-only before loading!
val pluginFile = File(context.filesDir, "verified_plugin.dex")
pluginFile.setReadOnly() // Sets file permissions to 0400 (Read-Only)

val loader = DexClassLoader(
    pluginFile.absolutePath,
    context.codeCacheDir.absolutePath,
    null,
    context.classLoader
)
```

### 3.2. Mandatory Cryptographic Signature Verification
Applications must strictly reject any dynamically loaded code that cannot be verified against a trusted cryptographic signature:

```kotlin
// SECURE HARDENED DCL VERIFICATION
fun verifyAndLoadPlugin(file: File, expectedSha256: String, context: Context): ClassLoader {
    // 1. Enforce strict internal storage path
    require(file.parentFile == context.filesDir) { "Untrusted directory" }
    
    // 2. Enforce read-only file permissions
    file.setReadOnly()
    
    // 3. Cryptographically verify SHA-256 digest
    val actualHash = computeSha256(file)
    if (actualHash != expectedSha256) {
        file.delete()
        throw SecurityException("DEX integrity verification failed! Signature mismatch.")
    }
    
    return DexClassLoader(file.absolutePath, context.codeCacheDir.absolutePath, null, context.classLoader)
}
```

---

## 4. Applying the 12-Step Lab Contract to Dynamic Code Loading

When auditing dynamic code loading during an assessment:

1. **Prerequisites:** JADX-GUI, Android test device, ADB.
2. **Scope:** Target package `com.example.targetapp`, component `PluginDispatcherActivity`.
3. **Target / Build Identity:** SHA-256 digest of target APK verified.
4. **Hypothesis:** An external attacker can supply an arbitrary DEX file path via Intent extra to execute unauthorized code with target app privileges.
5. **Static Evidence:** Manifest declares `PluginDispatcherActivity` exported; `onCreate()` extracts `intent.getStringExtra("plugin_path")` and instantiates `DexClassLoader` without signature checks.
6. **Test Plan:** Craft a benign test DEX file exporting a simple class with an `execute()` method that writes a marker file to `/data/data/<package>/files/pwned.txt`; trigger intent via `am start`.
7. **Observation:** Executed `am start -n com.example.targetapp/.PluginDispatcherActivity --es plugin_path /data/local/tmp/test.dex`; marker file successfully created inside target app private sandbox.
8. **Evaluation:** Confirms Critical Remote/Local Code Execution via Arbitrary Dynamic Code Loading ([OWASP MASVS-CODE-1](https://mas.owasp.org/MASVS/)).
9. **Impact:** Critical: total compromise of application sandbox and user data.
10. **Remediation:** Remove caller-controlled path loading; bundle required code directly in APK or enforce cryptographic signature verification on read-only files.
11. **Retest:** Build fixed release flavor; re-trigger launch with test DEX; confirm app rejects unverified file and logs security violation.
12. **Limitations:** Requires ability to place a DEX file on device storage or trigger intent.

# Objection, Anti-Tamper Evaluation & Dynamic Validation

**Standard Alignment:** [OWASP MASVS-RESILIENCE](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0029](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0030](https://mas.owasp.org/MASVS/)  
**Core Model:** Objection Runtime Exploration → Root Detection Mechanics & Attestation Limits → Diagnostic Bypasses vs. Vulnerabilities → The 12-Step Lab Contract

---

## 1. Objection: Runtime Mobile Security Assessment

[Objection](https://github.com/sensepost/objection) is a runtime mobile exploration toolkit powered by Frida that packages common dynamic analysis workflows into an interactive command-line interface:

```bash
# Launch target app under Objection in spawn mode
objection --gadget com.example.targetapp explore --startup-command "android sslpinning disable"
```

### 1.1. Core Dynamic Inspection Commands

```bash
# 1. Search for loaded classes matching a pattern
android hooking search classes com.example.targetapp.security

# 2. List all declared methods of a specific class
android hooking list class_methods com.example.targetapp.security.PinningManager

# 3. Watch method calls in real time with argument and return value dumps
android hooking watch class_method com.example.targetapp.security.PinningManager.verifyPin --dump-args --dump-return --dump-backtrace

# 4. Dump Android Keystore keys accessible in current context
android keystore list

# 5. Launch an unexported Activity directly
android intent launch_activity com.example.targetapp.ui.AdminDebugActivity
```

---

## 2. Root Detection Mechanics & Hardware Attestation

Applications handling high-risk transactions frequently implement root detection to prevent unauthorized inspection. Common heuristic checks include:

```kotlin
// TYPICAL HEURISTIC ROOT DETECTION IMPLEMENTATION
object RootChecker {
    private val KNOWN_SU_PATHS = arrayOf(
        "/system/bin/su", "/system/xbin/su", "/sbin/su",
        "/data/local/xbin/su", "/data/local/bin/su", "/system/sd/xbin/su"
    )

    fun isDeviceRooted(context: Context): Boolean {
        // 1. Check for su binary existence
        for (path in KNOWN_SU_PATHS) {
            if (File(path).exists()) return true
        }

        // 2. Check for test-keys build tags
        val buildTags = Build.TAGS
        if (buildTags != null && buildTags.contains("test-keys")) return true

        // 3. Attempt execution of su
        return try {
            val process = Runtime.getRuntime().exec(arrayOf("/system/xbin/which", "su"))
            process.inputStream.bufferedReader().readLine() != null
        } catch (e: Exception) {
            false
        }
    }
}
```

### 2.1. The Untrusted Client Limit: Why Heuristic Checks Fail
In an owned environment, an analyst or attacker controlling the device kernel (e.g., via Magisk Zygisk or KernelSU) can hook system calls (`stat`, `openat`, `execve`) or use Frida to hook `RootChecker.isDeviceRooted()` to return `false`:

```javascript
// Bypassing heuristic root detection via Frida
Java.perform(function() {
    var RootChecker = Java.use("com.example.targetapp.security.RootChecker");
    RootChecker.isDeviceRooted.implementation = function(context) {
        console.log("[*] Root check intercepted -> Returning false");
        return false;
    };
});
```

$$\text{Purely client-side heuristic checks cannot prevent tampering by the device owner.}$$

For genuine integrity guarantees, applications must rely on **server-verified hardware attestation** (such as the Google Play Integrity API), where the device's Trusted Execution Environment (TEE) generates a cryptographically signed attestation token verified directly by the backend server.

---

## 3. Diagnostic Bypasses vs. True Vulnerabilities

In professional mobile penetration testing, confusing diagnostic testing techniques with exploitable vulnerabilities is a critical methodology error:

```
+─────────────────────────────────────────────────────────────────────────────+
|               Diagnostic Technique vs. Exploitable Vulnerability             |
|                                                                             |
|  • Diagnostic Bypass:                                                       |
|    Disabling root checks or SSL pinning using Frida in an owned, instrumented|
|    test environment to allow Burp Suite to intercept traffic.                |
|    -> NOT A VULNERABILITY: It is a testing enablement mechanism.             |
|                                                                             |
|  • Exploitable Vulnerability:                                               |
|    A flaw in an unmodified release build running on an unmodified device    |
|    that allows an external attacker to compromise confidentiality,          |
|    integrity, or authorization (e.g., accepting invalid TLS certificates,   |
|    unauthorized IPC intent execution, or unauthenticated backend APIs).     |
+─────────────────────────────────────────────────────────────────────────────+
```

---

## 4. Applying the 12-Step Lab Contract to Runtime Assessments

When documenting runtime findings during an assessment:

1. **Prerequisites:** Rooted Android test device/emulator, ADB, `frida-server`, Objection, Burp Suite.
2. **Scope:** Target package `com.example.targetapp`, version `2.4.1` (Release build).
3. **Target / Build Identity:** SHA-256 digest of target APK verified.
4. **Hypothesis:** An attacker with local access to the device can observe plaintext credentials in Dalvik process memory after session logout.
5. **Static Evidence:** Static analysis in JADX reveals `UserSession` stores passwords as `String` objects and does not clear them in `logout()`.
6. **Test Plan:** Launch app, log in, perform logout, take a Dalvik heap dump using `am dumpheap`, and search for plaintext credentials.
7. **Observation:** Executed `am dumpheap`, converted `.hprof` via `hprof-conv`, ran `strings`; found plaintext password and active JWT token persisting 20 minutes after logout.
8. **Evaluation:** Confirms Sensitive Data Persistence in Dalvik Memory after Logout ([OWASP MASVS-STORAGE-2](https://mas.owasp.org/MASVS/)).
9. **Impact:** High: anyone acquiring a memory snapshot or physical device extraction can recover session credentials.
10. **Remediation:** Store secrets in mutable `char[]` or byte arrays and explicitly overwrite with zeros (`Arrays.fill(chars, '0')`) upon logout.
11. **Retest:** Build fixed release flavor; re-trigger login and logout; take heap dump; verify no plaintext credentials appear in memory.
12. **Limitations:** Requires root or physical memory acquisition access to the device.

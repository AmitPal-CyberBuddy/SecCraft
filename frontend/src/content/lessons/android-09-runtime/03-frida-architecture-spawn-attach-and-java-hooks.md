# Frida Architecture: Spawn, Attach & Java Method Hooks

**Standard Alignment:** [OWASP MASVS-RESILIENCE](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0013](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0014](https://mas.owasp.org/MASVS/)  
**Core Model:** Frida Client-Server Architecture → ABI Matching & Deployment → Spawn vs. Attach → The Java Bridge API & Dynamic Method Interception

---

## 1. Frida Dynamic Instrumentation Architecture

[Frida](https://frida.re) is a dynamic instrumentation toolkit that injects the Google V8 or QuickJS JavaScript engine into target processes. This allows analysts to execute custom JavaScript scripts directly inside the Android runtime (Dalvik/ART or native code):

```
+─────────────────────────────────+
|      Workstation (Client)       |
|  • Python / CLI (frida, frida-ps)|
|  • JavaScript Hook Scripts      |
+────────────────+────────────────+
                 │ USB / TCP Communication
+────────────────▼────────────────+
|      Android Device / Emulator  |
|                                 |
|  [frida-server] (Daemon, UID 0) |
|         │ Injects ptrace / Dll  |
|  +──────▼─────────────────────+ |
|  |     Target App Process     | |
|  |  • Dalvik / ART Runtime    | |
|  |  • QuickJS / V8 Engine     | |
|  |  • Intercepted Classes     | |
|  +────────────────────────────+ |
+─────────────────────────────────+
```

### 1.1. Deploying `frida-server` on a Test Device
1. **Determine Device CPU Architecture (ABI):**
   ```bash
   adb shell getprop ro.product.cpu.abi
   # e.g., 'x86_64' (typical for emulators) or 'arm64-v8a' (modern physical devices)
   ```

2. **Push and Launch `frida-server`:**
   ```bash
   # Download matching frida-server release from GitHub
   adb push frida-server-16.x.x-android-x86_64 /data/local/tmp/frida-server
   adb shell su -c "chmod 755 /data/local/tmp/frida-server"
   adb shell su -c "/data/local/tmp/frida-server &"
   ```

3. **Verify Connection:**
   ```bash
   # List running processes over USB
   frida-ps -U
   ```

---

## 2. Spawn Mode vs. Attach Mode

Frida provides two execution modes that serve distinct testing objectives:

| Execution Mode | Command Syntax | When to Use |
|---|---|---|
| **Spawn Mode** | `frida -U -f com.example.targetapp --no-pause -l script.js` | **Essential for early-lifecycle hooking**: Hooks methods executed during `Application.onCreate()`, static initializers, early anti-root routines, or certificate pinning setups before network traffic starts. |
| **Attach Mode** | `frida -U -N com.example.targetapp -l script.js` | **Attaches to already running process**: Ideal for inspecting user-driven workflows (e.g., checkout, money transfer, biometric prompt) without restarting the application. |

---

## 3. The Frida Java Bridge API

In Android apps running on the ART virtual machine, Frida's `Java` object allows reflection, method interception, and object instantiation:

```javascript
Java.perform(function() {
    console.log("[*] Frida Java Bridge Initialized successfully.");
    
    // Resolve target class
    var TargetClass = Java.use("com.example.targetapp.security.AuthEngine");
    
    // Method hook implementation
    TargetClass.verifyCredentials.implementation = function(username, password) {
        console.log("[*] Intercepted verifyCredentials call:");
        console.log("    Username: " + username);
        console.log("    Password: " + password);
        
        // Call original implementation
        var isSuccess = this.verifyCredentials(username, password);
        console.log("    Original Result: " + isSuccess);
        
        // Print execution stack trace to locate caller component
        var Log = Java.use("android.util.Log");
        var Exception = Java.use("java.lang.Exception");
        console.log(Log.getStackTraceString(Exception.$new()));
        
        return isSuccess;
    };
});
```

---

## 4. Handling Method Overloading & Heap Inspection

### 4.1. Hooking Overloaded Methods
When Java classes declare multiple methods with the same name but different signatures, specify the exact argument types using `.overload()`:

```javascript
Java.perform(function() {
    var CryptoUtils = Java.use("com.example.targetapp.crypto.CryptoUtils");

    // Hook: encrypt(String data, String key)
    CryptoUtils.encrypt.overload('java.lang.String', 'java.lang.String').implementation = function(data, key) {
        console.log("[*] encrypt(String, String) called with key: " + key);
        return this.encrypt(data, key);
    };

    // Hook: encrypt(byte[] data, byte[] key, byte[] iv)
    CryptoUtils.encrypt.overload('[B', '[B', '[B').implementation = function(data, key, iv) {
        console.log("[*] encrypt(byte[], byte[], byte[]) called");
        return this.encrypt(data, key, iv);
    };
});
```

### 4.2. Scanning Heap for Live Object Instances (`Java.choose`)
Locate and interact with active object instances already residing in Dalvik heap memory:

```javascript
Java.perform(function() {
    Java.choose("com.example.targetapp.session.UserSession", {
        onMatch: function(instance) {
            console.log("[*] Found live UserSession instance on heap!");
            console.log("    Active User: " + instance.getUsername());
            console.log("    Auth Token: " + instance.getAuthToken());
        },
        onComplete: function() {
            console.log("[*] Heap scan completed.");
        }
    });
});
```

---

## 5. Limitations & Evidence Integrity

1. **A Hook Firing Proves Method Reachability, Not Remote Vulnerability:**
   A hook demonstrating that a method accepts an unvalidated token inside an instrumented process does not prove an external attacker can reach that sink. You must corroborate reachability through an untrusted entry point (such as an exported Intent, deep link, or network packet).
2. **Timing & Race Conditions:**
   Dynamic hooking introduces execution delays. Time-sensitive cryptographic checks or asynchronous callbacks may exhibit altered behavior under instrumentation. Always verify critical findings against unmodified release builds.

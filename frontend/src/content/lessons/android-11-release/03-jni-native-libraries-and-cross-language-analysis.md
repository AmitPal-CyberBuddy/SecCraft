# JNI, Native Libraries & Cross-Language Analysis

**Standard Alignment:** [OWASP MASVS-CODE](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0005](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0004](https://mas.owasp.org/MASVS/)  
**Core Model:** JNI Bridge Architecture → Static vs. Dynamic Native Registration → Reversing ELF `.so` Binaries in Ghidra → Common Native Vulnerabilities

---

## 1. Java Native Interface (JNI) Architecture

Android applications frequently execute performance-critical, cryptographic, or proprietary algorithms in compiled native C/C++ code via the **Java Native Interface (JNI)**:

```
+─────────────────────────────────+
|     Dalvik / ART Runtime        |
|  • Kotlin / Java Source Code    |
|  • external fun verifyToken()   |
+────────────────+────────────────+
                 │ JNI Call Boundary
+────────────────▼────────────────+
|   Native Library (libsecurity.so)|
|  • Compiled ARM64 / x86_64 ELF  |
|  • JNIEnv* interface pointer    |
|  • Direct memory access (C/C++) |
+─────────────────────────────────+
```

### 1.1. Native Library Deployment in APKs
Native libraries are packaged inside the APK directory structure under `lib/<abi>/`:
- `lib/arm64-v8a/`: 64-bit ARM architecture (standard for modern physical smartphones).
- `lib/armeabi-v7a/`: 32-bit legacy ARM architecture.
- `lib/x86_64/`: 64-bit Intel/AMD architecture (standard for desktop Android emulators).

```kotlin
// Loading native library in Kotlin
class SecurityBridge {
    companion object {
        init {
            // Automatically searches APK for lib/arm64-v8a/libsecurity.so
            System.loadLibrary("security")
        }
    }

    // Native method declaration (implemented in C/C++)
    external fun validateLicenseKey(license: String): Boolean
}
```

---

## 2. JNI Function Binding: Static vs. Dynamic

To analyze native code in disassemblers like Ghidra, an analyst must understand how Android binds Java method signatures to compiled C functions:

### 2.1. Static JNI Binding (Standard Exported Symbol)
In static binding, the C function name must strictly match the mangled Java class and method signature:

$$\text{Java\_}<\text{escaped\_package}>\_<\text{escaped\_class}>\_<\text{escaped\_method}>$$

```c
// Statically bound C function in libsecurity.so
JNIEXPORT jboolean JNICALL
Java_com_example_targetapp_SecurityBridge_validateLicenseKey(
    JNIEnv* env, 
    jobject thiz, 
    jstring license
) {
    const char* nativeString = (*env)->GetStringUTFChars(env, license, 0);
    jboolean result = (strcmp(nativeString, "VALID_LICENSE_KEY_2026") == 0);
    (*env)->ReleaseStringUTFChars(env, license, nativeString);
    return result;
}
```

*Triage Tip:* Statically bound functions appear directly in the `.dynsym` symbol table and can be found instantly by filtering for `Java_` in Ghidra or `nm -D libsecurity.so`.

### 2.2. Dynamic Registration (`RegisterNatives`)
To hide function names from symbol tables, developers implement dynamic registration inside `JNI_OnLoad()`:

```c
// Dynamic registration inside JNI_OnLoad
jint JNI_OnLoad(JavaVM* vm, void* reserved) {
    JNIEnv* env;
    if ((*vm)->GetEnv(vm, (void**)&env, JNI_VERSION_1_6) != JNI_OK) return -1;

    jclass clazz = (*env)->FindClass(env, "com/example/targetapp/SecurityBridge");
    
    // Explicit mapping array of Java method to internal C function pointer
    JNINativeMethod methods[] = {
        {"validateLicenseKey", "(Ljava/lang/String;)Z", (void*)internal_hidden_validator}
    };
    
    (*env)->RegisterNatives(env, clazz, methods, 1);
    return JNI_VERSION_1_6;
}
```

*Triage Tip:* In Ghidra, navigate to the `JNI_OnLoad` function, locate the call to `RegisterNatives`, and inspect the `JNINativeMethod` struct array to locate the destination function pointer.

---

## 3. Native Security Anti-Patterns & Vulnerabilities

### 3.1. The "Native Obscurity" Fallacy
A pervasive security anti-pattern is storing API keys, decryption seeds, or authorization secrets inside native `.so` libraries under the assumption that compiled machine code is safe from inspection:

```bash
# Extracting hardcoded secrets directly from compiled ELF library strings
strings -a lib/arm64-v8a/libsecurity.so | grep -E "(key|secret|password|bearer|http)"
```

Output:
```
https://api.internal.bank.com/v1/auth
SUPER_SECRET_AES_ENCRYPTION_KEY_2026
```

### 3.2. Native Memory Corruption Vulnerabilities
Because C/C++ lacks memory safety, native Android code is susceptible to classic memory corruption flaws:
1. **Buffer Overflows:** Using unbounded string functions (`strcpy`, `strcat`, `sprintf`) on caller-supplied input from Java strings.
2. **Double Free & Use-After-Free:** Inconsistent memory management across the JNI heap boundary.
3. **Format String Vulnerabilities:** Passing unsanitized user strings directly to `printf()` or `syslog()`.

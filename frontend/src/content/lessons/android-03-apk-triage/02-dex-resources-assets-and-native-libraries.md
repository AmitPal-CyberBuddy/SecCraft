# DEX, Resources, Assets & Native Libraries

**Standard Alignment:** [OWASP MASVS-CODE](https://mas.owasp.org/MASVS/), [OWASP MASVS-CRYPTO](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0002](https://mas.owasp.org/MASTG/)  
**Core Model:** Dalvik Bytecode Structure (DEX) → Multidex Partitioning → Resource Table (`resources.arsc`) → Native Shared Objects (JNI)

---

## 1. Dalvik Executable (DEX) Bytecode Architecture

Android applications do not execute Java `.class` files or standard JVM bytecode directly. Instead, the Android build toolchain (`d8` / `r8`) compiles Java and Kotlin bytecode into the **Dalvik Executable (.dex)** format optimized for the Android Runtime (ART):

```
+─────────────────────────────────────────────────────────────+
|                     DEX Binary Structure                    |
|                                                             |
|  ├── File Header (magic, checksum, signature, file_size)    |
|  ├── string_ids  (Offsets to UTF-8 constant strings)        |
|  ├── type_ids    (Type descriptors, e.g., Ljava/lang/String)|
|  ├── proto_ids   (Method prototypes: return type + params)  |
|  ├── field_ids   (Class field declarations)                 |
|  ├── method_ids  (Method declarations)                      |
|  ├── class_defs  (Class hierarchy, interfaces, byte offsets)|
|  └── data_section (Raw bytecode opcodes, strings, debug info)|
+─────────────────────────────────────────────────────────────+
```

### 1.1. The 64K Method Limit & Multidex
A single DEX file indexes method references using a 16-bit unsigned integer, enforcing a hard architectural ceiling of **65,536 method references** (`0xFFFF`).
- Modern applications exceed this limit due to third-party SDK dependencies (Firebase, Google Play Services, OkHttp).
- The build system splits the compiled code across multiple DEX files: `classes.dex`, `classes2.dex`, `classes3.dex`, etc.
- **Pentest Trap:** Never inspect only `classes.dex`. Static analysis and string-search tools must parse **all** DEX files in the archive, as core business logic or security controls may reside in secondary Multidex files.

---

## 2. Resource Tables (`resources.arsc`) & String Harvesting

When an APK is built, all string constants, layouts, menu XMLs, and drawable identifiers declared in `res/` are compiled into an indexed binary format: `resources.arsc`.

### 2.1. Extracting Strings and Configuration Artifacts
Strings declared in `res/values/strings.xml` are assigned unique 32-bit hexadecimal resource IDs (e.g., `0x7f13002a`) mapped in `R.string`:

```bash
# Decompile resources and strings using apktool
apktool d target_app.apk -o apk_extracted

# Audit strings for leaked credentials and staging infrastructure
grep -iE "api[_-]?key|secret|token|password|auth|staging|dev|internal" \
    apk_extracted/res/values/strings.xml
```

### 2.2. High-Risk Artifact Checklist in Resources
During static triage, systematically check for common high-value disclosures:
- **Firebase Database URLs:** Strings containing `firebaseio.com`. Verify if the database rules are public (`.json` accessible without authentication).
- **Google API Keys:** Look for `google_api_key`. Determine whether the key is restricted in Google Cloud Console or allows unauthorized billing/API usage.
- **Staging / QA Endpoints:** Hardcoded internal URLs (e.g., `https://qa-api.internal.bank.com`) accidentally left in release configurations.
- **Payment Gateway Tokens:** Client-side tokens or test keys (e.g., Stripe `pk_test_...`, Razorpay `rzp_test_...`).

---

## 3. Assets vs. Raw Resources: Where Secrets Hide

Android distinguishes between compiled resources (`res/`) and raw file assets (`assets/`):

| Directory | Compilation | Access API | Typical Pentest Findings |
|---|---|---|---|
| **`/res/raw/`** | Indexed in `resources.arsc`. File contents remain uncompressed. | `getResources().openRawResource(R.raw.id)` | Pinned X.509 TLS certificates (`cert.crt`), CA bundles, static configuration JSON. |
| **`/assets/`** | Preserved verbatim as an arbitrary filesystem hierarchy inside the APK. | `getAssets().open("path/to/file")` | Embedded SQLite databases (`preloaded.db`), local HTML/JS/CSS for WebViews, cryptographic keys, machine learning models (`.tflite`). |

```bash
# Rapidly enumerate assets folder
unzip -l target_app.apk "assets/*"

# Search for embedded certificates or private keys
find apk_extracted/assets/ -type f \( -name "*.pem" -o -name "*.crt" -o -name "*.key" -o -name "*.p12" \)
```

---

## 4. Native Shared Libraries (`/lib/<abi>/*.so`) & JNI

Modern mobile applications frequently delegate security-sensitive tasks—such as root detection, cryptographic key derivation, signature verification, and anti-tamper logic—to compiled C/C++ native libraries located in the `/lib/` folder:

```
target_app.apk/lib/
├── arm64-v8a/      <── 64-bit ARM (Primary architecture for modern Android phones)
├── armeabi-v7a/    <── 32-bit ARM (Legacy devices)
├── x86_64/         <── 64-bit Intel/AMD (Standard for desktop Android emulators)
└── x86/            <── 32-bit Intel
```

### 4.1. The Java Native Interface (JNI) Bridge
Java/Kotlin code declares native methods using the `native` keyword:
```java
package com.example.security;

public class IntegrityVerifier {
    static {
        System.loadLibrary("security_core"); // Loads libsecurity_core.so
    }
    // Native method declared in Java, implemented in C/C++
    public native boolean verifyDeviceIntegrity();
}
```

In the compiled shared object (`libsecurity_core.so`), exported symbols follow a strict naming convention:
`Java_<fully_qualified_class_name>_<method_name>`  
Example: `Java_com_example_security_IntegrityVerifier_verifyDeviceIntegrity`

### 4.2. Rapid Native Library Triage with CLI Tools
Pentesters do not need to perform full native decompilation in Ghidra or IDA Pro to extract valuable intelligence from `.so` binaries:

```bash
# 1. Identify library architecture and compiler properties
file apk_extracted/lib/arm64-v8a/libsecurity_core.so

# 2. Extract JNI exported symbols
nm -D apk_extracted/lib/arm64-v8a/libsecurity_core.so | grep -i "Java_"
# Output:
# 000000000001a4e0 T Java_com_example_security_IntegrityVerifier_verifyDeviceIntegrity

# 3. Search for hardcoded strings, URLs, and encryption keys inside the binary
strings -a apk_extracted/lib/arm64-v8a/libsecurity_core.so | grep -iE "http|key|aes|su|magisk"

# 4. Check compiler security hardening flags (RELRO, Stack Canary, PIE, NX)
readelf -l apk_extracted/lib/arm64-v8a/libsecurity_core.so | grep -i "gnu_stack"
```

---

## 5. Defense & Remediation Standards

1. **Never Store True Secrets in Client Binaries:** Any secret compiled into DEX bytecode, string resources, assets, or native `.so` libraries can be trivially extracted by a competent reverse engineer. Use backend-authenticated token exchange or device Keystore with hardware backing.
2. **Strip Symbols from Production Native Libraries:** Configure the CMake or NDK build script to strip debug symbols (`-s` / `strip`) to hinder function discovery in native libraries.
3. **Audit Third-Party SDK Assets:** Review all files packaged into `assets/` and `res/` by external dependencies to prevent accidental exposure of vendor API credentials or development artifacts.

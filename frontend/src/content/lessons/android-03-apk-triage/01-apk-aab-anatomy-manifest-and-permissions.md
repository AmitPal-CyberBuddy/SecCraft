# APK/AAB Anatomy, Manifest & Permissions

**Standard Alignment:** [OWASP MASVS-CODE](https://mas.owasp.org/MASVS/), [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0001](https://mas.owasp.org/MASTG/)  
**Core Model:** ZIP Container Architecture → Binary XML Encoding (AXML) → Manifest Security Directives → Runtime Permission Audit

---

## 1. APK vs. AAB: The Modern Packaging Architecture

When an application is built for distribution, developers compile source code and assets into an archive format:

```
+─────────────────────────────────────────────────────────────+
|               Android Distribution Formats                  |
|                                                             |
|  1. Android App Bundle (.aab):                              |
|     - Publishing format uploaded to Google Play.            |
|     - Contains compiled code and resources for all ABIs,    |
|       densities, and language locales.                      |
|     - Google Play generates optimized Split APKs for each   |
|       requesting device model (Dynamic Delivery).           |
|                                                             |
|  2. Android Package (.apk):                                 |
|     - The executable archive format installed on devices.   |
|     - Standard ZIP 2.0 container containing DEX bytecode,   |
|       compiled resources, assets, and cryptographic signing |
|       blocks.                                               |
|     - Split APK architectures (e.g., base.apk +             |
|       split_config.arm64_v8a.apk) must be analyzed together.|
+─────────────────────────────────────────────────────────────+
```

### 1.1. Internal Directory Structure of an APK
Extracting an APK with `unzip -l target_app.apk` reveals its internal anatomy:

```
target_app.apk (ZIP Archive)
├── AndroidManifest.xml          <── Binary encoded XML (AXML format)
├── classes.dex                  <── Dalvik Executable bytecode
├── classes2.dex                 <── Secondary Multidex bytecode files
├── resources.arsc               <── Precompiled resource table (IDs, strings)
├── res/                         <── Compiled binary XML layouts and drawables
├── assets/                      <── Raw, uncompiled application assets
├── lib/                         <── Native compiled shared libraries (.so)
│   ├── arm64-v8a/
│   └── x86_64/
└── META-INF/                    <── v1 signature files, certs, and manifests
```

---

## 2. Binary XML and `AndroidManifest.xml` Triage

The `AndroidManifest.xml` file is the master blueprint of the application. It defines application identity, minimum/target SDK requirements, hardware dependencies, permissions, and all declared component entry points.

On disk inside the APK, `AndroidManifest.xml` is **not plaintext XML**; it is compiled into Android Binary XML (AXML) to reduce size and parsing overhead on the device. Tools like `apktool` or `jadx` decode AXML back into human-readable XML during static triage.

### 2.1. Critical Security Attributes in `<application>`
During static review, immediately inspect the root `<application>` element for dangerous operational flags:

| Manifest Attribute | Default | Risk Interpretation | Pentest Verdict |
|---|---|---|---|
| **`android:debuggable`** | `false` | If `true`, the application exposes JDWP (Java Debug Wire Protocol) debugging ports, allows memory inspection via ADB without root (`run-as <pkg>`), and compromises all local data boundaries. | **Critical Finding:** Must strictly be `false` in production builds. |
| **`android:allowBackup`** | `true` | If `true`, an attacker with physical or ADB access can extract the entire private sandbox via `adb backup` (unless Android 12+ disables cloud/USB backup via `dataExtractionRules`). | **High/Medium Finding:** Must be `false` or strictly bounded via XML backup rules for apps handling sensitive PII/tokens. |
| **`android:usesCleartextTraffic`**| OS-dependent | If `true`, overrides Android 9+ default protections and permits unencrypted `http://` network traffic. | **High Finding:** Disables mandatory transport encryption. |
| **`android:networkSecurityConfig`**| None | References `@xml/network_security_config`. Dictates custom CA trust anchors, certificate pinning, and cleartext domains. | **High Priority Review:** Inspect XML for debug-override blocks or disabled pinning. |

---

## 3. Auditing Declared and Requested Permissions

An application's permission posture reveals its potential capabilities and privacy footprint.

### 3.1. `<uses-permission>` vs. `<permission>`
- **`<uses-permission>`:** Requests access to a platform-protected API (e.g., `android.permission.CAMERA`) or an API exposed by another package.
- **`<permission>`:** Declares a **new custom permission** defined by this application to restrict access to its own components.

```xml
<!-- Example Vulnerability in AndroidManifest.xml -->
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.bank">

    <!-- Overly broad dangerous permission -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.READ_CONTACTS" />

    <!-- Custom permission with dangerous 'normal' protection level -->
    <permission
        android:name="com.example.bank.permission.SYNC_DATA"
        android:protectionLevel="normal" /> <!-- VULNERABLE: Any app can request and receive this -->

    <application ...>
        <service
            android:name=".sync.InternalSyncService"
            android:exported="true"
            android:permission="com.example.bank.permission.SYNC_DATA" />
    </application>
</manifest>
```

### 3.2. Principle of Least Privilege in Permission Audits
When reviewing requested permissions:
1. **Unnecessary Dangerous Permissions:** Does a calculator or notes app request `READ_SMS`, `RECORD_AUDIO`, or `ACCESS_FINE_LOCATION`? Flag excessive permissions as unnecessary attack surface and privacy non-compliance.
2. **Third-Party SDK Permission Bloat:** Often, advertising or analytics SDKs silently introduce aggressive permissions into the final merged manifest via Gradle manifest merger. Always inspect the **final built manifest**, not just developer source manifests.

---

## 4. Pentester's Operational Checklist: Manifest Triage

Execute this rapid 5-step triage on any target APK:

```bash
# 1. Decode manifest using aapt2 or apktool
apkanalyzer manifest print target_app.apk > manifest_decoded.xml

# 2. Check for debuggable flag
grep -i "debuggable=\"true\"" manifest_decoded.xml

# 3. Check for allowBackup flag
grep -i "allowBackup=\"true\"" manifest_decoded.xml

# 4. Enumerate all exported components
grep -B 2 -A 5 "android:exported=\"true\"" manifest_decoded.xml

# 5. Extract all requested permissions
grep "<uses-permission" manifest_decoded.xml
```

---

## 5. Defense & Remediation Standards

1. **Explicitly Disable Debugging in Release Builds:** Ensure `build.gradle` configures release builds with `debuggable false`:
   ```groovy
   buildTypes {
       release {
           debuggable false
           minifyEnabled true
           shrinkResources true
       }
   }
   ```
2. **Restrict Application Backup:** Explicitly declare `android:allowBackup="false"` or implement granular rules using `android:dataExtractionRules` (Android 12+) and `android:fullBackupContent` (Android 6–11) to exclude authentication tokens and sensitive databases from backup archives.
3. **Audit Custom Permission Protection Levels:** Set `android:protectionLevel="signature"` on all custom permissions guarding internal services or receivers.

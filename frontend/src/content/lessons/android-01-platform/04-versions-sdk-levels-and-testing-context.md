# Android Versions, SDK Levels & Testing Context

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0003](https://mas.owasp.org/MASTG/)  
**Core Model:** `minSdkVersion` vs. `targetSdkVersion` vs. Device OS API Level → Breaking Platform Security Changes → Environmental Context in Pentest Findings

---

## 1. SDK Levels: The Triad of Android Compatibility

When auditing an Android application, you will frequently observe conflicting behavior between test devices. A vulnerability easily exploitable on an Android 9 emulator may fail completely on an Android 14 device. Understanding **SDK versioning** is essential to explaining why:

```
+─────────────────────────────────────────────────────────────+
|               Android SDK Compatibility Triad               |
|                                                             |
|  1. minSdkVersion:                                           |
|     Minimum OS API level required to install the APK.       |
|     Devices running an older OS will reject installation.   |
|                                                             |
|  2. targetSdkVersion:                                       |
|     The contract with the platform. Tells Android:          |
|     "We designed and tested this app against API X."        |
|     Platform enables new security mitigations based on this! |
|                                                             |
|  3. compileSdkVersion:                                      |
|     The Android SDK version used to compile the source code.|
|     Controls which compile-time APIs and annotations are    |
|     available during the build.                             |
|                                                             |
|  4. Device OS (ro.build.version.sdk):                       |
|     The actual OS version running on the physical phone     |
|     or emulator executing the test.                         |
+─────────────────────────────────────────────────────────────+
```

### 1.1. Backward Compatibility & Compatibility Hacks
Android maintains extensive backward compatibility shims in the framework. If an application sets `targetSdkVersion="28"`, but runs on an Android 13 (API 33) device:
- The OS may emulate legacy behaviors to avoid crashing the legacy app.
- For example, Android will temporarily relax certain strict runtime checks (such as mandatory `FLAG_IMMUTABLE` on PendingIntents).
- However, Google Play mandates that updates target recent API levels (typically within one year of the latest public Android release), forcing developers to modernize their security contracts.

---

## 2. Landmark Android Platform Security Evolution

Security controls on Android do not exist in a vacuum; they were introduced iteratively in response to real-world exploit techniques:

| Android Version | API Level | Major Security & Privacy Changes | Pentest Impact |
|---|---|---|---|
| **Android 7.0 (Nougat)** | 24 | **User CA Trust Revocation:** User-installed CA certificates are no longer trusted for TLS connections by default.<br>**Network Security Config:** Introduction of `res/xml/network_security_config.xml`. | Intercepting HTTPS traffic via Burp Suite requires modifying the APK's XML config or using root CA injection into `/system/etc/security/cacerts/`. |
| **Android 8.0/8.1 (Oreo)** | 26 / 27 | **Implicit Broadcast Restrictions:** Apps cannot register implicit broadcast receivers in the manifest for most system broadcasts.<br>**Background Execution Limits:** Strict limits on background services. | Prevents background malware from listening to ambient system events to wake up and exfiltrate data. |
| **Android 9.0 (Pie)** | 28 | **Cleartext HTTP Disabled by Default:** Apps targeting API 28+ refuse unencrypted `http://` traffic unless explicitly whitelisted in Network Security Config. | Flags cleartext API traffic as an immediate configuration failure if allowed globally. |
| **Android 10 (Q)** | 29 | **Scoped Storage Introduced:** Restricts broad access to shared storage (`/sdcard/`). Apps access their own private directories and media collections via MediaStore.<br>**MAC Address Randomization:** Enabled by default for all Wi-Fi connections. | Apps can no longer snoop on other applications' files stored on the shared SD card. |
| **Android 11 (R)** | 30 | **Package Visibility Restrictions (`<queries>`):** Apps can no longer enumerate all installed packages via `pm list packages` unless explicitly declared in manifest `<queries>` tags.<br>**One-time Permissions:** Users can grant temporary permissions for location/mic. | Limits malicious reconnaissance of installed banking, crypto, or security apps. |
| **Android 12/12L (S)** | 31 / 32 | **Mandatory `android:exported`:** Manifest will fail to build and install if any component with an `<intent-filter>` omits the `android:exported` attribute.<br>**PendingIntent Mutability:** Every `PendingIntent` must specify `FLAG_IMMUTABLE` or `FLAG_MUTABLE`. | Eliminates accidental component exposure due to implicit export defaults; prevents PendingIntent hijacking. |
| **Android 13 (Tiramisu)** | 33 | **Granular Media Permissions:** `READ_EXTERNAL_STORAGE` replaced by `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_MEDIA_AUDIO`.<br>**`POST_NOTIFICATIONS` Permission:** Notifications require runtime user consent.<br>**Receiver Export Flag:** Dynamic receivers must specify `RECEIVER_EXPORTED` or `RECEIVER_NOT_EXPORTED`. | Stops arbitrary notification spam; prevents unpermissioned IPC to dynamically registered broadcast receivers. |
| **Android 14 (Upside Down Cake)** | 34 | **Safer Intent Redirection:** Implicit intents are strictly delivered to exported components only.<br>**Dynamic Code Loading (DCL) Restrictions:** Dynamically loaded DEX files (`DexClassLoader`) **must be marked read-only** (`0444`) on disk before loading to prevent TOCTOU tampering. | Mitigates local code injection and intent interception vulnerabilities. |
| **Android 15 (Vanilla Ice Cream)** | 35 | **Private Spaces:** Sensitive apps isolated in private user profile.<br>**Enhanced Binder Security:** Strict validation of cross-profile IPC transactions. | Hardens enterprise and personal profile isolation boundaries. |

---

## 3. The Pentester's Context Matrix

Because platform security mitigations evolve continuously, **a finding that does not state the OS version, API level, and target SDK is technically incomplete**:

```
[Deficient Finding Statement]
"The application allows cleartext traffic and exported activity invocation."

[Professional Contextual Finding Statement]
"Target APK (SHA-256: 4b2f...8a1c) targets SDK 33 and was evaluated on an Android 13 (API 33)
reference emulator. While cleartext HTTP is globally blocked by default on API 28+, the 
application includes a custom network_security_config.xml with <base-config cleartextTrafficPermitted="true">,
permitting unencrypted transmission of session tokens across untrusted networks."
```

### 3.1. Querying Device and Target Context via ADB
Always query and record the runtime context during reconnaissance:

```bash
# 1. Check device OS version and API level
adb shell getprop ro.build.version.release   # e.g., "13"
adb shell getprop ro.build.version.sdk       # e.g., "33"

# 2. Check target application SDK metadata
adb shell dumpsys package com.example.targetapp | grep -E "minSdk|targetSdk|versionCode"
# Output:
#   minSdk=26 targetSdk=33 versionCode=42
```

---

## 4. Defense & Remediation Standards

1. **Keep `targetSdkVersion` Current:** Update `targetSdkVersion` in `app/build.gradle` to the latest stable Android API level during each major development cycle to inherit modern platform mitigations.
2. **Review Behavior Changes for Target API:** When incrementing `targetSdkVersion`, consult Google's official migration guides to ensure newly enforced restrictions (e.g., PendingIntent flags, dynamic code loading file permissions) are properly implemented.
3. **Never Lower `targetSdkVersion` to Bypass Controls:** Lowering `targetSdkVersion` to evade modern security requirements (e.g., targeting API 27 to allow cleartext traffic or implicit broadcasts) is an anti-pattern that violates Google Play policies and exposes users to legacy attacks.

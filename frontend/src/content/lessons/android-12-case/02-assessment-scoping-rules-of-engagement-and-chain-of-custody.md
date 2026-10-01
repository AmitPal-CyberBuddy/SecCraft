# Assessment Scoping, Rules of Engagement & Chain of Custody

**Standard Alignment:** [OWASP MASVS-ALL](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0012](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0013](https://mas.owasp.org/MASVS/)  
**Core Model:** Mobile Rules of Engagement (ROE) → Build Identity & Chain of Custody → Environment Matrices → Honest Testing Disclosures

---

## 1. Rules of Engagement (ROE) for Android Assessments

A professional mobile application penetration test must define clear legal, operational, and architectural boundaries before testing begins:

```
+─────────────────────────────────────────────────────────────+
|               Mobile Assessment Scope Matrix                |
|                                                             |
|  [IN-SCOPE]                                                 |
|  • Specified target package: com.example.targetapp          |
|  • Scoped APK release flavor (SHA-256 verified)             |
|  • Local IPC boundaries, intents, deep links, WebViews      |
|  • Local sandbox persistence (SQLite, Keystore, SharedPrefs)|
|  • Authorized staging backend APIs (https://staging-api.bank)|
|                                                             |
|  [OUT-OF-SCOPE]                                             |
|  • Production backend APIs (preventing denial of service)   |
|  • Third-party analytics SDKs and ad networks               |
|  • Telecommunication SMS gateways and push notification hubs|
|  • Physical device theft or social engineering of employees |
+─────────────────────────────────────────────────────────────+
```

---

## 2. Target Build Identity & Cryptographic Chain of Custody

Every observation and finding must be firmly anchored to an exact build artifact. Testing an unverified or outdated APK invalidates the entire assessment:

```bash
# 1. Record exact SHA-256 checksum of target APK
sha256sum targetapp-release.apk
# Example: 4f8b2e1a3c7d9e0f2b4a6c8e0d1f3b5a7c9e1d3f5b7a9c1e3f5b7a9c1e3f5b7a

# 2. Verify APK signing scheme and certificate fingerprints
apksigner verify --verbose --print-certs targetapp-release.apk
```

Output:
```
Verifies
Verified using v1 scheme (JAR signing): true
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
Verified using v4 scheme (APK Signature Scheme v4): false
Number of signers: 1
Signer #1 certificate DN: CN=Example Mobile, OU=Engineering, O=Example Bank, C=US
Signer #1 certificate SHA-256 digest: 8a7f3e... (Developer Certificate Fingerprint)
```

---

## 3. The Execution Environment Matrix

Android behavior varies significantly depending on API level, manufacturer skin, and device rooting status. A complete test log must document:

```bash
# Query test device environment properties via ADB
adb shell getprop ro.build.version.release    # Android OS (e.g., "14")
adb shell getprop ro.build.version.sdk        # API Level (e.g., "34")
adb shell getprop ro.build.type               # "user" vs "userdebug"
adb shell getprop ro.product.cpu.abi          # Architecture (e.g., "arm64-v8a" or "x86_64")
adb shell getprop ro.build.fingerprint        # Exact OS system build fingerprint
```

| Dimension | Scoped Value | Relevance to Findings |
|---|---|---|
| **Package Name** | `com.example.targetapp` | Isolates target UID and sandbox. |
| **APK Build Flavor** | `release` (Release Mode) | Ensures ProGuard/R8 rules and `android:debuggable="false"` are audited. |
| **Test Device** | Pixel 7a (Physical) + AVD Emulator (API 34) | Evaluates physical hardware Keystore (StrongBox) and userdebug behaviors. |
| **Target SDK** | `targetSdkVersion="34"` | Determines platform enforcement (e.g., mandatory `RECEIVER_EXPORTED`, DCL read-only mandate). |

---

## 4. Honest Disclosures: The `NOT EXECUTED` Standard

If a test cannot be executed due to environmental limitations (e.g., lack of a physical biometric sensor, no access to an SMS gateway, or an emulator incompatible with hardware attestation), an analyst must record:

```
[Deficient Assessment Practice]
"The application is secure against biometric bypass attacks because no bypass was found."
(When no biometric test was actually executed!)

[Professional Honest Disclosure]
"Test Case TC-AUTH-03 (Biometric CryptoObject Verification): NOT EXECUTED.
Reason: Test workstation was restricted to a headless emulator without hardware biometric emulation.
Recommendation: Schedule hardware-in-the-loop verification on a physical device equipped with 
StrongBox Keymaster before production release."
```

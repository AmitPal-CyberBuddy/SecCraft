# SecCraft — Android Application Security Reference & Methodology Guide

## 1. Overview & Architecture Standards

SecCraft's Android curriculum strictly adheres to **OWASP Mobile Application Security (MAS)** standards:
- **OWASP MASVS v2.1.0** (Mobile Application Security Verification Standard)
  - `MASVS-STORAGE`: Secure data storage and sensitive asset isolation.
  - `MASVS-CRYPTO`: Robust cryptography, high-entropy key generation, and nonce uniqueness.
  - `MASVS-AUTH`: Biometric, credential, and local authorization boundaries.
  - `MASVS-NETWORK`: TLS 1.3/1.2 validation, CA trust scoping, and certificate pinning.
  - `MASVS-PLATFORM`: IPC hardening, exported component permissions, and deep link validation.
  - `MASVS-CODE`: Code quality, compiler protections, third-party library risk.
  - `MASVS-RESILIENCE`: Anti-tampering, root detection, and runtime integrity controls.
- **OWASP MASTG v2.0** (Mobile Application Security Testing Guide)
  - Atomic test cases with reproducible verification steps.
  - Dual-ledger testing: pairing vulnerable controls with verified remediations.

---

## 2. Essential Triage Workflow & Tooling

### Phase 1: Static APK Triage & Reverse Engineering
```bash
# 1. Unpack APK resources, manifests, and assets
apktool d target.apk -o target_decompiled

# 2. Decompile DEX bytecode to Java source
jadx target.apk -d target_src/

# 3. Print binary AndroidManifest.xml directly
apkanalyzer manifest print target.apk

# 4. Check APK signature scheme (v1, v2, v3, v4)
apksigner verify --verbose --print-certs target.apk
```

### Phase 2: Platform IPC & Component Probing
```bash
# Query package details and user UID
adb shell pm list packages -3
adb shell dumpsys package com.example.app | grep -E "userId|versionName"

# Inspect component definitions
adb shell dumpsys package com.example.app | grep -A 10 "Activity Resolver Table:"

# Trigger exported Activity with extras
adb shell am start -n com.example.app/.TargetActivity --es "user_id" "1337"

# Send Broadcast Intent
adb shell am broadcast -a com.example.app.ACTION_UPDATE --es "token" "tampered_token"

# Start Background Service
adb shell am startservice -n com.example.app/.BackgroundSyncService

# Query Content Provider
adb shell content query --uri content://com.example.app.provider/users
```

### Phase 3: Network Interception & Trust Scoping
```bash
# Verify Network Security Config configuration in decompiled res/xml/
cat target_decompiled/res/xml/network_security_config.xml

# Sample Network Security Config supporting Burp/ZAP user CA on debug builds only:
# <?xml version="1.0" encoding="utf-8"?>
# <network-security-config>
#     <debug-overrides>
#         <trust-anchors>
#             <certificates src="user" />
#             <certificates src="system" />
#         </trust-anchors>
#     </debug-overrides>
# </network-security-config>
```

### Phase 4: Dynamic Instrumentation (Frida & Objection)
```bash
# Start Frida server on rooted/emulator test device
adb push frida-server /data/local/tmp/
adb shell "chmod 755 /data/local/tmp/frida-server && /data/local/tmp/frida-server &"

# Launch application under Objection
objection -g com.example.app explore

# Disable TLS pinning in Objection
android sslpinning disable

# Disable root detection checks
android root disable

# Hook a specific Java method with Frida CLI
frida -U -f com.example.app -l hook_script.js
```

---

## 3. High-Risk Vulnerability Matrix & Verification

| Pattern | MASVS Control | Vulnerable Indicator | Remediated Pattern |
| :--- | :--- | :--- | :--- |
| **Exported Component** | `MASVS-PLATFORM-1` | `android:exported="true"` without permission | `android:exported="false"` or custom `signature` permission |
| **Implicit Intent Broadcast** | `MASVS-PLATFORM-2` | Unspecified component intent containing sensitive data | Explicit Intent via `intent.setPackage(...)` |
| **Custom URI Hijacking** | `MASVS-PLATFORM-3` | Unverified custom scheme `app://auth` | Verified HTTPS Android App Links via Digital Asset Links |
| **Sandbox Leakage** | `MASVS-STORAGE-1` | Plaintext files in `/sdcard/` or external cache | Private storage `/data/data/...` or EncryptedSharedPreferences |
| **AES-GCM Nonce Reuse** | `MASVS-CRYPTO-1` | Static/hardcoded 12-byte IV initialized once | SecureRandom generated 12-byte IV per encryption operation |
| **Cleartext HTTP** | `MASVS-NETWORK-1` | `android:usesCleartextTraffic="true"` | TLS 1.3 only; cleartext strictly prohibited |
| **Insecure Native Bridge** | `MASVS-PLATFORM-4` | `@JavascriptInterface` exposed to untrusted web origins | Origin validation in `shouldOverrideUrlLoading` + tokenized bridge |

---

## 4. Assessment Methodology & Reporting Standard

When reporting findings in an enterprise assessment:
1. **State the Exact Vulnerable Sink:** Specify class name, method, and manifest XML lines.
2. **Provide Reproducible Steps:** Supply exact `adb` shell commands or Frida instrumentation scripts.
3. **Evidence Dual Verification:** Include execution output demonstrating positive exploitation on vulnerable target, and negative control verification demonstrating expected denial on remediated build.
4. **Distinguish Client Speed Bumps from Server Boundaries:** Never classify client-side tampering on an adversary's device as a server compromise without demonstrating backend exploitability.

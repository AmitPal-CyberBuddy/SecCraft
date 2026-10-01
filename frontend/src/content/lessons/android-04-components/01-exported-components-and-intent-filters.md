# Exported Components & Intent Filters

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0027](https://mas.owasp.org/MASTG/)  
**Core Model:** Explicit vs. Implicit Intents → Intent Filter Resolution → `android:exported` Evolution → External Invocation Attacks via ADB

---

## 1. Intents: The Nervous System of Android IPC

An **Intent** is an asynchronous messaging object used to request an action from another application component. Intents facilitate three primary operational workflows:
1. Starting an **Activity** (`Context.startActivity()`).
2. Starting or binding to a **Service** (`Context.startService()`, `Context.bindService()`).
3. Delivering a message to a **Broadcast Receiver** (`Context.sendBroadcast()`).

```
+─────────────────────────────────────────────────────────────+
|                     Intent Classification                   |
|                                                             |
|  1. Explicit Intent:                                        |
|     - Explicitly designates the target component name       |
|       (e.g., new Intent(this, InternalAdminActivity.class)).|
|     - Delivered exclusively to that exact component.        |
|     - Used almost exclusively for internal in-app routing.  |
|                                                             |
|  2. Implicit Intent:                                        |
|     - Does NOT specify a target component name.             |
|     - Declares a general action to perform (e.g., ACTION_VIEW|
|       with data https://example.com).                       |
|     - The Android Package Manager queries all installed apps|
|       to find components matching the specified criteria.   |
+─────────────────────────────────────────────────────────────+
```

---

## 2. Intent Filters & The `android:exported` Evolution

An **Intent Filter** (`<intent-filter>`) declared inside `AndroidManifest.xml` informs the Android system what types of implicit intents an Activity, Service, or Broadcast Receiver is capable of handling.

### 2.1. The Dangerous Pre-Android 12 Default
In legacy Android versions (prior to Android 12 / API 31):
- If a component declared **at least one `<intent-filter>`** and omitted `android:exported`, the platform defaulted `android:exported` to **`true`**!
- Thousands of applications accidentally exposed internal diagnostic screens, sensitive payment gateways, and background receivers to third-party malware simply because developers added an intent filter for deep linking or notifications without realizing the component became globally accessible.

### 2.2. Modern Android 12+ Enforcement
Starting with Android 12 (API 31):
- Any Activity, Service, or Broadcast Receiver that defines an `<intent-filter>` **must explicitly declare `android:exported="true"` or `android:exported="false"`**.
- If the attribute is omitted, the Android build tools (`aapt2`) will fail the build, and the `PackageManagerService` will reject APK installation with the error:
  ```
  Installation failed: INSTALL_PARSE_FAILED_MANIFEST_MALFORMED: 
  Targeting S+ (version 31 and above) requires that an explicit value 
  for android:exported be defined when intent filters are present
  ```

---

## 3. Auditing Exported Components

An exported component is a public gateway across the application's process boundary. Any third-party application installed on the same device can send an Intent to that component.

```
+──────────────────────────+                        +──────────────────────────+
|  Malicious Rogue App     |                        |    Target Banking App    |
|  (UID 10190)             |                        |    (UID 10182)           |
|                          |                        |                          |
|  Intent i = new Intent() |                        |  Exported Activity       |
|  i.setComponent(new      |  startActivity(i)      |  (android:exported=true) |
|    ComponentName(        |───────────────────────►|                          |
|      "com.bank.app",     |                        |  - Bypasses Auth Screen! |
|      ".TransferActivity" |                        |  - Reads Unchecked Params|
|  ));                     |                        |  - Executes Transfer!    |
+──────────────────────────+                        +──────────────────────────+
```

### 3.1. Extracting Exported Components with JADX
When reviewing `AndroidManifest.xml` in JADX or after decoding with `apktool`:

```xml
<!-- Example Vulnerability: Unauthenticated Internal Activity Exported -->
<activity
    android:name="com.example.bank.ui.AccountTransferActivity"
    android:exported="true"> <!-- VULNERABLE: Direct access without authentication check -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
    </intent-filter>
</activity>
```

**Pentester Analysis:**
1. Why is `AccountTransferActivity` exported? Does it need to be invoked by other apps, or was it meant to be internal?
2. If launched directly by another app, does `AccountTransferActivity` check whether a valid user session is active, or does it assume the user already passed the PIN/biometric login screen?

---

## 4. Triggering and Interacting via ADB

During dynamic testing on an authorized device or emulator, analysts use the `am` (Activity Manager) shell utility to send crafted intents directly to exported components:

```bash
# 1. Enumerate exported activities for target package
adb shell dumpsys package com.example.targetapp | grep -A 20 "Activity Resolver Table:"

# 2. Directly launch an exported activity
adb shell am start -n com.example.targetapp/.ui.AccountTransferActivity

# 3. Launch an exported activity passing custom intent extras
adb shell am start -n com.example.targetapp/.ui.AccountTransferActivity \
    --es "recipient_account" "ACC-998877" \
    --ef "transfer_amount" 5000.00 \
    --ez "bypass_confirmation" true

# 4. Invoke with custom action and data URI
adb shell am start -a android.intent.action.VIEW \
    -d "bankapp://transfer?to=attacker&amount=1000" \
    com.example.targetapp
```

### 4.1. The Principle: Entry Point != Automatic Exploit
A fundamental discipline in mobile application security is distinguishing an **attack surface entry point** from a **demonstrated vulnerability**:
- Simply observing `android:exported="true"` in a manifest is **not** evidence of a vulnerability.
- Launcher activities (e.g., `MainActivity` with `MAIN`/`LAUNCHER` filters) **must** be exported so the Android home screen launcher can display and open the app.
- A vulnerability exists **only if** the exported component:
  1. Allows an unauthorized caller to bypass mandatory authentication gates.
  2. Executes privileged state-changing actions without validating caller authority.
  3. Leaks sensitive data back to the caller (via `setResult()` or shared storage).
  4. Crashes the application process via untrusted parameter deserialization (Denial of Service).

---

## 5. Defense & Remediation Standards

1. **Default to `android:exported="false"`:** Explicitly mark every Activity, Service, Receiver, and Content Provider as unexported unless external cross-app communication is strictly required.
2. **Never Rely on Activity Order for Authentication:** Do not assume that an Activity can only be reached after passing through `LoginActivity`. Every sensitive Activity must independently verify that an authenticated session exists in `onCreate()` or `onStart()` before rendering private data or accepting input.
3. **Guard Public Entry Points with Signature Permissions:** If a component must be exported for companion applications within your organization's suite, protect it with a custom permission set to `android:protectionLevel="signature"`.

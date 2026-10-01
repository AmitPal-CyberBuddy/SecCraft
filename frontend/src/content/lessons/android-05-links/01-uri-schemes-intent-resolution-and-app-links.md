# URI Schemes, Intent Resolution & App Links

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0028](https://mas.owasp.org/MASTG/)  
**Core Model:** URI Schemes vs. Web Links vs. Android App Links → Digital Asset Links Protocol → Disambiguation Dialogs & Intent Hijacking

---

## 1. The Anatomy of Mobile Deep Linking

A **Deep Link** is an Intent filter that allows users to navigate directly to specific content or functional flows inside an application, either from a browser, email, SMS, or another mobile app.

Android supports three distinct categories of deep linking:

```
+─────────────────────────────────────────────────────────────+
|               Android Deep Linking Hierarchy                |
|                                                             |
|  1. Custom URI Schemes (e.g., myapp://open?id=12):          |
|     - Uses a custom, proprietary protocol scheme.          |
|     - ZERO domain verification or ownership proof.          |
|     - Multiple apps can register the EXACT SAME scheme!     |
|                                                             |
|  2. Web Links (e.g., http:// or https://example.com/item):  |
|     - Uses standard HTTP/HTTPS schemes.                     |
|     - Prior to Android 12: Shows the system App Chooser     |
|       ("Disambiguation Dialog") prompting the user.         |
|                                                             |
|  3. Android App Links (Verified HTTPS Links):               |
|     - Uses https:// with android:autoVerify="true".         |
|     - Cryptographically verified against the website domain |
|       via Digital Asset Links (assetlinks.json).            |
|     - Opens directly in the app WITHOUT user prompt.        |
+─────────────────────────────────────────────────────────────+
```

---

## 2. Custom URI Schemes & The Intent Hijacking Threat

Custom URI schemes are the most common source of deep-linking vulnerabilities in mobile applications:

```xml
<!-- Example in AndroidManifest.xml -->
<activity android:name=".ui.DeepLinkRouterActivity" android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="mybank" android:host="authorize" />
    </intent-filter>
</activity>
```

### 2.1. Why Custom Schemes Cannot Establish Ownership
The Android operating system does **not** verify ownership of custom URI schemes:
- Nothing prevents a rogue application from declaring the exact same scheme in its own manifest:
  ```xml
  <!-- In Attacker's Malicious App Manifest -->
  <intent-filter>
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data android:scheme="mybank" />
  </intent-filter>
  ```
- When a user clicks `mybank://authorize?oauth_token=xyz` in a web browser or email:
  - If multiple applications register `mybank`, Android displays the **Disambiguation Dialog** asking the user which app to open.
  - If the user selects the attacker's app (or if the attacker's app is chosen by default), **the OAuth authentication token is delivered directly to the attacker!**

---

## 3. Android App Links: Cryptographic Domain Verification

To eliminate intent hijacking, Android introduced **Android App Links** (Android 6.0+ / API 23):

```
+──────────────────────────+                        +──────────────────────────+
|      Android Device      |                        |    Web Domain Host       |
|  (PackageManagerService) |                        | (https://trusted.example)|
|                          |                        |                          |
|  Parses Manifest:        |  HTTPS GET             |                          |
|  autoVerify="true"       |───────────────────────►|  /.well-known/           |
|  host="trusted.example"  |                        |    assetlinks.json       |
|                          |                        |                          |
|  Extracts Cert Hash      |  Returns Fingerprint   |                          |
|  Matches App Signature!  |◄───────────────────────|  SHA-256 Cert Fingerprint|
|                          |                        |                          |
|  STATUS: VERIFIED!       |                        |                          |
+──────────────────────────+                        +──────────────────────────+
```

### 3.1. Declaring an Android App Link
In `AndroidManifest.xml`:
```xml
<activity android:name=".ui.VerifiedLinkActivity" android:exported="true">
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https" android:host="trusted.example" android:pathPrefix="/notes" />
    </intent-filter>
</activity>
```

### 3.2. The Digital Asset Links File (`assetlinks.json`)
The webmaster must host a JSON file at `https://trusted.example/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.example.bank",
    "sha256_cert_fingerprints": [
      "14:6D:E9:01:07:52:07:71:92:07:90:86:73:A2:94:1A:F6:4D:F2:43:4E:05:4B:9E:2B:A5:8E:B4:C2:5F:4B:2C"
    ]
  }
}]
```

When the app is installed, the Android system contacts `trusted.example`, fetches `assetlinks.json`, and compares the declared SHA-256 certificate fingerprint against the APK's actual signing certificate. **Only if there is an exact cryptographic match does the OS register the app as the exclusive handler.**

---

## 4. Pentester's Operational Checklist: Auditing Links

1. **Identify All Deep-Link Filters in Manifest:**
   Search for `<action android:name="android.intent.action.VIEW" />` combined with `<category android:name="android.intent.category.BROWSABLE" />`.
2. **Check Scheme Type:**
   - Are sensitive authentication flows or password resets using custom schemes (`app://`) instead of verified HTTPS App Links?
   - If custom schemes handle sensitive tokens, flag as **MASVS-PLATFORM-1: Insecure Deep Link Transport / Risk of Intent Hijacking**.
3. **Verify App Link State via ADB:**
   Query the platform's actual domain verification status for the target package:
   ```bash
   adb shell pm get-app-links com.example.targetapp
   # Expected Output for Verified Domains:
   # com.example.targetapp:
   #   ID: 9812-3847-...
   #   Signatures: [14:6D:E9:...]
   #   Domain verification state:
   #     trusted.example: verified
   ```
   If the state is `none`, `1024` (legacy), or `failed`, the application has not passed domain verification and is susceptible to hijacking.
4. **Trigger Deep Links via ADB:**
   ```bash
   adb shell am start -a android.intent.action.VIEW \
       -d "https://trusted.example/notes?id=105"
   ```

---

## 5. Defense & Remediation Standards

1. **Migrate Sensitive Flows to Android App Links:** Replace custom URI schemes with verified HTTPS Android App Links (`android:autoVerify="true"`).
2. **Never Pass Secrets in Deep-Link Query Parameters:** Even with App Links, deep-link URLs can be leaked in web browser histories, server access logs, and referral headers. Use one-time authorization codes with short time-to-live (TTL) and PKCE (Proof Key for Code Exchange).
3. **Handle Verification Failures Gracefully:** If domain verification fails (e.g., due to temporary network issues during app install), ensure the server-side authentication flow falls back to standard in-app or browser authentication rather than failing insecurely.

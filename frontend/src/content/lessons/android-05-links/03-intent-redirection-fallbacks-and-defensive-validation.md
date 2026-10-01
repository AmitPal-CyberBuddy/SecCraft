# Intent Redirection, Fallbacks & Defensive Validation

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0027](https://mas.owasp.org/MASTG/)  
**Core Model:** Intent Redirection (Confused Deputy) → Private Component Access → URI Permission Theft → Android 14+ Platform Mitigations

---

## 1. The Intent Redirection Vulnerability

**Intent Redirection** is one of the highest-severity vulnerability classes in Android applications. It occurs when an exported application component receives an embedded `Intent` object from an untrusted caller and launches it using its own context (`startActivity()`, `startService()`, etc.) without adequate validation:

```
+──────────────────────────+                        +──────────────────────────+
|      Rogue Malware       |                        |   Target Privileged App  |
|      (UID 10190)         |                        |        (UID 10182)       |
|                          |                        |                          |
|  Cannot access unexported|                        |  Exported Forwarder:     |
|  InternalAdminActivity   |                        |  (android:exported=true) |
|  directly (Blocked by OS)|                        |             │            |
|                          |                        |             ▼            |
|  Creates payload intent: |  startActivity(proxy)  |  Extracts "next_intent"  |
|  target = AdminActivity  |───────────────────────►|  extra from caller...    |
|  Embeds in "next_intent" |                        |             │            |
|                          |                        |             ▼            |
|                          |                        |  startActivity(nextIntent|
|                          |                        |  (LAUNCHES AS APP ITSELF!|
|                          |                        |             │            |
|                          |                        |             ▼            |
|                          |                        |  Private AdminActivity   |
|                          |                        |  (android:exported=false)|
|                          |                        |  is SUCCESSFULLY BREACHED|
+──────────────────────────+                        +──────────────────────────+
```

### 1.1. Why Linux Sandbox Controls Fail to Stop This
Normally, if Malware attempts to launch `com.bank.app.InternalAdminActivity` directly via `startActivity()`, the Android `ActivityManagerService` blocks the launch because `InternalAdminActivity` has `android:exported="false"`.

However, when the target app's own exported forwarder activity extracts the embedded Intent and invokes `startActivity(nextIntent)`:
- The calling UID for that second launch is the **target app's own UID** (`10182`).
- The Android Framework permits any application to launch its own private unexported components.
- The exported forwarder becomes a **Confused Deputy**, effectively bypassing all manifest `android:exported="false"` restrictions!

---

## 2. Real-World Vulnerable Code Example

Inspect this classic vulnerable pattern commonly found in splash screens, notification forwarders, and authentication routers:

```java
// VULNERABLE INTENT REDIRECTION IN AN EXPORTED ACTIVITY
public class NotificationRouterActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Intent incoming = getIntent();
        
        // SOURCE: Extracting untrusted embedded Intent from extras
        Intent nextIntent = incoming.getParcelableExtra("next_intent");
        
        if (nextIntent != null) {
            // CRITICAL SINK: Launching untrusted Intent without validation!
            startActivity(nextIntent);
        }
        finish();
    }
}
```

### 2.1. Stealing Private Files via Intent Redirection
An attacker can weaponize Intent Redirection not just to open hidden screens, but to **steal private application files**:
1. The attacker targets an unexported FileProvider activity in the target app.
2. The attacker crafts an embedded Intent targeting the unexported activity, passing a destination pointing back to the attacker's own receiver.
3. The target app opens the file, attaches `FLAG_GRANT_READ_URI_PERMISSION`, and delivers the file descriptor back to the attacker.

---

## 3. Platform Mitigations in Modern Android

Android has introduced platform-level hardening to mitigate Intent Redirection abuse:

### 3.1. Android 14+ (API 34) Safer Implicit Intent Delivery
Starting with Android 14:
- When an app sends an **implicit intent** using a non-exported component, the Android Framework enforces that the intent can **only be delivered to components explicitly marked `exported="true"`**.
- This prevents certain forms of broadcast snooping and redirection.
- However, if the attacker specifies an **explicit component name** (`setClassName()`) in the embedded intent, developer-level validation is still strictly required.

---

## 4. Secure Implementation & Defensive Validation

To safely redirect intents without introducing a Confused Deputy vulnerability, applications must sanitize incoming intents before launch:

```java
// SECURE INTENT REDIRECTION VALIDATION
public void safelyLaunchNextIntent(Intent incomingIntent) {
    Intent nextIntent = incomingIntent.getParcelableExtra("next_intent");
    if (nextIntent == null) return;

    // 1. Resolve target component using PackageManager
    PackageManager pm = getPackageManager();
    ResolveInfo resolveInfo = pm.resolveActivity(nextIntent, PackageManager.MATCH_DEFAULT_ONLY);
    
    if (resolveInfo == null || resolveInfo.activityInfo == null) {
        throw new SecurityException("Target activity cannot be resolved");
    }

    ActivityInfo targetInfo = resolveInfo.activityInfo;

    // 2. ENFORCE EXPORT BOUNDARY OR ALLOWLIST
    // If targeting an internal component, ensure it belongs to this package AND is intended
    if (targetInfo.packageName.equals(getPackageName())) {
        if (!isAllowlistedInternalActivity(targetInfo.name)) {
            throw new SecurityException("Attempted launch of non-allowlisted internal component!");
        }
    } else {
        // If targeting an external app, ensure it is exported
        if (!targetInfo.exported) {
            throw new SecurityException("Attempted launch of private external component!");
        }
    }

    // 3. STRIP DANGEROUS URI GRANT FLAGS
    nextIntent.removeFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
    nextIntent.removeFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION);

    // 4. Safely execute launch
    startActivity(nextIntent);
}
```

---

## 5. Applying the 12-Step Lab Contract to Intent Redirection

When evaluating and reporting Intent Redirection vulnerabilities:

1. **Prerequisites:** JADX-GUI, Android Studio / ADB, target APK hash.
2. **Scope:** Target package `com.example.targetapp`, forwarder component `NotificationRouterActivity`.
3. **Target / Build Identity:** SHA-256 digest of target APK verified.
4. **Hypothesis:** An external unprivileged app can pass an explicit intent inside `next_intent` targeting unexported `InternalDebugActivity` and bypass export restrictions.
5. **Static Evidence:** `NotificationRouterActivity` is exported; calls `startActivity((Intent) getIntent().getParcelableExtra("next_intent"))` without component allowlist checks.
6. **Test Plan:** Use `am start` to send an intent with an embedded parcelable intent targeting the unexported component.
7. **Observation:** Unexported `InternalDebugActivity` launches successfully on screen.
8. **Evaluation:** Confirms Confused Deputy Intent Redirection (MASVS-PLATFORM-1).
9. **Impact:** High severity: unauthorized access to private debug utilities and sensitive administrative functions.
10. **Remediation:** Implement strict component name allowlisting and strip URI grant flags before invoking `startActivity()`.
11. **Retest:** Re-execute exploit with patched build; confirm `SecurityException` is thrown and launch is blocked.
12. **Limitations:** Vulnerability requires physical or local malware presence on the device; cannot be triggered remotely over the network.

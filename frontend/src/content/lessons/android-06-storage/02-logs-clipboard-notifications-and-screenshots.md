# Logs, Clipboard, Notifications & Screenshots

**Standard Alignment:** [OWASP MASVS-STORAGE](https://mas.owasp.org/MASVS/), [OWASP MASVS-PRIVACY](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0002](https://mas.owasp.org/MASTG/), [OWASP MASTG-TEST-0004](https://mas.owasp.org/MASTG/)  
**Core Model:** Ephemeral Data Leakage → System Logcat Buffers → Clipboard Snooping → Lockscreen Notifications → Task Switcher Snapshots (`FLAG_SECURE`)

---

## 1. System Logcat Leakage (`MASVS-STORAGE-2`)

Developers routinely insert logging statements (`Log.d()`, `Log.i()`, `println()`) during development to debug API integrations and authentication flows. When these calls remain in production release builds, sensitive data is continuously leaked to the Android system logging facility:

```java
// DANGEROUS LOGGING ANTI-PATTERNS IN RELEASE BUILDS
Log.d("AuthClient", "User logged in with token: " + bearerToken);
Log.d("NetworkRequest", "Headers: " + request.headers());
Log.d("Payment", "Processing credit card: " + cardNumber + " CVV: " + cvv);
```

### 1.1. The Threat Model of Logcat
- Any user or attacker with USB debugging enabled can extract historical logs via `adb logcat` without root privileges.
- Pre-installed vendor diagnostic apps or system utilities holding `android.permission.READ_LOGS` can collect logcat output in the background.
- Automated third-party crash reporting SDKs (Firebase Crashlytics, Sentry, Bugsnag) automatically aggregate logcat lines surrounding a crash and upload them to cloud servers, expanding the exposure footprint to third-party dashboards.

### 1.2. Stripping Logs with ProGuard / R8 Rules
To guarantee that debugging logs never reach production APKs, configure compiler shrinking rules in `proguard-rules.pro`:
```proguard
# Strip all calls to android.util.Log in release builds
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
    public static int e(...);
}
```

---

## 2. Clipboard Snooping & Android 13 Sensitive Flags

The Android system clipboard (`ClipboardManager`) is a shared global resource. When an application copies sensitive data—such as passwords, credit card numbers, or one-time passcodes (OTP)—into the clipboard:

```
+─────────────────────────────────────────────────────────────+
|               Clipboard Evolution Across Android            |
|                                                             |
|  • Pre-Android 10: ANY app running in the background could  |
|    continuously monitor and read the clipboard!             |
|                                                             |
|  • Android 10 (API 29): Background clipboard access blocked;|
|    only the currently focused foreground app can read.      |
|                                                             |
|  • Android 12 (API 31): System displays a visual toast      |
|    whenever an app pastes from the clipboard.               |
|                                                             |
|  • Android 13 (API 33): Introduction of EXTRA_IS_SENSITIVE  |
|    flag to redact visual previews on the clipboard overlay. |
+─────────────────────────────────────────────────────────────+
```

### 2.1. Protecting Sensitive Clips in Android 13+
When copying sensitive information (e.g., in a password manager or banking app), set `EXTRA_IS_SENSITIVE` to prevent Android from displaying the plaintext on the clipboard confirmation preview overlay:

```kotlin
val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
val clip = ClipData.newPlainText("password", masterPassword)

// REDACT PLAINTEXT ON CLIPBOARD CONFIRMATION OVERLAY
clip.description.extras = PersistableBundle().apply {
    putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true)
}

clipboard.setPrimaryClip(clip)
```

---

## 3. Lockscreen Notifications & Notification Channels

Applications communicate transaction alerts, multi-factor authorization codes, and private messages through notifications. If notifications are not configured with proper privacy controls, sensitive information is displayed on the device lockscreen without unlocking:

### 3.1. Setting Notification Visibility
Android defines three notification visibility levels:

| Visibility Constant | Lockscreen Behavior | Appropriate Use Case |
|---|---|---|
| **`VISIBILITY_PUBLIC`** | Shows full notification title, message text, and action buttons. | Weather alerts, media playback controls. |
| **`VISIBILITY_PRIVATE`** | Shows notification icon and title, but hides message content until the device is unlocked. | **Default for personal data**: banking alerts, chat messages, OTPs. |
| **`VISIBILITY_SECRET`** | Completely hides the notification from the lockscreen until unlocked. | Highly confidential security notices, PIN resets. |

```kotlin
val builder = NotificationCompat.Builder(context, CHANNEL_ID)
    .setContentTitle("Security Verification Code")
    .setContentText("Your OTP is 849201")
    .setVisibility(NotificationCompat.VISIBILITY_PRIVATE) // Redacted on lockscreen!
```

---

## 4. Window Screenshots & Recent Task Snapshots (`FLAG_SECURE`)

When a user switches between applications using the Android Recent Tasks (Overview / recent apps) screen, the operating system takes an automatic snapshot screenshot of the current Activity window and saves it to disk at `/data/system_ce/0/snapshots/` so it can render the app carousel.

```
+──────────────────────────+                        +──────────────────────────+
|  User Leaves Banking App |                        |    System Window Manager |
|  (Activity moves to      |                        |                          |
|   onPause / onStop)      |  Captures Window Image |  Writes PNG screenshot to|
|                          |───────────────────────►|  /data/system_ce/0/      |
|                          |                        |  snapshots/<app_id>.jpg  |
|                          |                        |  (Contains PLAINTEXT     |
|                          |                        |   account balances!)     |
+──────────────────────────+                        +──────────────────────────+
```

### 4.1. Preventing Snapshot Leakage with `FLAG_SECURE`
To prevent the operating system, unauthorized screen recording tools, or physical onlookers from viewing sensitive screens in the task switcher, set `WindowManager.LayoutParams.FLAG_SECURE` in `onCreate()` before calling `setContentView()`:

```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // PREVENT SCREENSHOTS AND TASK SWITCHER SNAPSHOTS
    window.setFlags(
        WindowManager.LayoutParams.FLAG_SECURE,
        WindowManager.LayoutParams.FLAG_SECURE
    )
    
    setContentView(R.layout.activity_account_details)
}
```

When `FLAG_SECURE` is active:
- The Recent Tasks screen displays a blank white or black window.
- The user cannot take manual screenshots (`Screenshot blocked by app policy`).
- ADB screen capturing (`adb exec-out screencap -p`) and screen-sharing tools (such as scrcpy) receive a blank video stream.

---

## 5. Defense & Remediation Standards

1. **Automate Log Stripping in Build Pipelines:** Configure R8/ProGuard to remove all `Log.*` calls in release compilation.
2. **Flag Sensitive Clipboard Data:** Always mark copied passwords or tokens with `EXTRA_IS_SENSITIVE` on Android 13+.
3. **Redact Lockscreen Notifications:** Set `NotificationCompat.VISIBILITY_PRIVATE` on all notifications containing PII, financial details, or OTPs.
4. **Enforce `FLAG_SECURE` on Sensitive Views:** Apply `FLAG_SECURE` to all activities displaying account balances, personal records, card numbers, or cryptographic seed phrases.

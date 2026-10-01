# Attack-Surface Mapping & Source-to-Sink Analysis

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0027](https://mas.owasp.org/MASTG/)  
**Core Model:** Attack-Surface Inventory → Untrusted Source Identification → Propagation & Guards → Critical Sinks → Paired Vulnerable/Fixed Retest

---

## 1. Mapping the Complete Application Attack Surface

Static reconnaissance begins by systematically extracting every external boundary exposed by the application. In Android security, the attack surface consists of every component, interface, or protocol through which untrusted data or unauthorized callers can enter the app process:

```
+─────────────────────────────────────────────────────────────+
|                Android Attack Surface Topology              |
|                                                             |
|  1. Exported UI Entry Points:                               |
|     - Activities with android:exported="true"               |
|     - Deep links (custom URI schemes, e.g., app://open)     |
|     - Android App Links (https://trusted.example/...)       |
|                                                             |
|  2. Background IPC Entry Points:                            |
|     - Exported Broadcast Receivers & dynamic receivers      |
|     - Exported Services & AIDL Binder RPC interfaces        |
|     - Exported Content Providers & content:// URIs          |
|                                                             |
|  3. Embedded Content Surfaces:                              |
|     - WebViews with setJavaScriptEnabled(true)              |
|     - JavaScript Bridges (addJavascriptInterface)          |
|                                                             |
|  4. Local Storage & File Boundaries:                        |
|     - Shared external storage files (/sdcard/)              |
|     - FileProvider paths with grand-permissions enabled     |
+─────────────────────────────────────────────────────────────+
```

### 1.1. Constructing the Attack-Surface Matrix
Before inspecting a single line of business logic, construct an **Attack-Surface Matrix** from the decompiled manifest:

| Component Name | Type | Exported? | Permissions / Filters | Untrusted Input Vector |
|---|---|---|---|---|
| `org.seccraft.noteslab.MainActivity` | Activity | `true` | `MAIN`/`LAUNCHER` & `seccraftnotes://open` | `Intent.getData()` (`id` query param) |
| `.service.BackgroundSyncService` | Service | `false` | None | None (Internal only) |
| `.receiver.PushReceiver` | Receiver | `true` | `com.google.android.c2dm.permission.SEND` | Broadcast Intent Extras |
| `.provider.NoteProvider` | Provider | `false` | None | None (Internal only) |

---

## 2. The Source-to-Sink Analysis Framework

Once an entry point is identified, we trace the flow of data through the codebase using **Source-to-Sink Analysis**:

$$\text{Untrusted Source} \longrightarrow \text{Transformations} \longrightarrow \text{Security Guard} \longrightarrow \text{Critical Sink}$$

```
+───────────────────+         +───────────────────+         +───────────────────+
| Untrusted Source  |         |   Security Guard  |         |   Critical Sink   |
|                   |         |                   |         |                   |
| Intent.getData()  |────────►|   Ownership Check |────────►| Display Sensitive |
| getQueryParameter |         |                   |         | Note Content      |
| ("id")            |         | owner.equals(user)|         |                   |
+───────────────────+         +─────────┬─────────+         +───────────────────+
                                        │
                                        │ (If Bypassed or Omitted)
                                        ▼
                              +───────────────────+
                              | Unauthorized Data |
                              | Leakage Finding   |
                              +───────────────────+
```

### 2.1. Defining Common Android Sources & Sinks

| Category | Common Untrusted Sources | Common Critical Sinks |
|---|---|---|
| **IPC / Intents** | `intent.getStringExtra()`, `intent.getData()`, `intent.getParcelableExtra()` | `startActivity()`, `sendBroadcast()`, `setResult()`, `PendingIntent.send()` |
| **Databases** | Untrusted string arguments passed to query helpers | `SQLiteDatabase.rawQuery()`, `execSQL()`, `ContentProvider.query()` |
| **Filesystem** | File paths derived from user input or URI parameters | `new File(path)`, `context.openFileOutput()`, `ContentResolver.openInputStream()` |
| **Web & Network** | URLs extracted from deep links or push notifications | `WebView.loadUrl()`, `OkHttpClient.newCall()`, `Runtime.getRuntime().exec()` |
| **Sensitive UI** | Backend responses retrieved using caller-supplied IDs | `TextView.setText()`, notification builders, clipboard copies |

---

## 3. Worked Clinic: Comparing Vulnerable and Fixed Baselines

To understand how source-to-sink flaws manifest in real code, examine the paired vulnerable and fixed implementations in SecCraft's [`notes-boundary`](/android-demos/notes-boundary-source.zip) project.

### 3.1. The Entry Point (`MainActivity.java`)
In `MainActivity.java`, an exported Activity receives the `seccraftnotes://open` URI:

```java
// Source: Reading untrusted query parameter from external Intent
private void handleIntent(Intent intent) {
    if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) return;
    Uri uri = intent.getData();
    if (uri == null) return;
    
    // SOURCE: Extracting untrusted user input
    String id = uri.getQueryParameter("id");
    
    // PROPAGATION: Passing input to data store
    String body = NoteStore.lookup(id, activeUser, BuildConfig.DEMO_VULNERABLE);
    
    // SINK: Rendering retrieved record to screen
    if (body != null) {
        output.setText("Note " + id + ": " + body);
    } else {
        output.setText("Note " + id + ": Access denied or not found.");
    }
}
```

### 3.2. The Vulnerable vs. Fixed Boundary (`NoteStore.java`)

```java
public final class NoteStore {
    private NoteStore() { }

    public static String lookup(String id, String activeUser, boolean vulnerable) {
        String owner;
        String body;
        
        // Synthetic data records
        if ("1".equals(id)) { 
            owner = "alice"; 
            body = "Alice's synthetic grocery list"; 
        } else if ("2".equals(id)) { 
            owner = "bob"; 
            body = "Bob's synthetic book list"; 
        } else {
            return null;
        }

        // ─────────────────────────────────────────────────────────────
        // THE SECURITY GUARD COMPARISON
        // ─────────────────────────────────────────────────────────────
        
        // VULNERABLE FLAVOR: Skips ownership validation!
        // When DEMO_VULNERABLE is true, any caller can read Bob's note.
        if (vulnerable) {
            return body; // Vulnerable: missing authorization check!
        }

        // FIXED FLAVOR: Validates caller context matches data owner
        if (!owner.equals(activeUser)) {
            return null; // Secure: unauthorized access blocked!
        }
        
        return body;
    }
}
```

### 3.3. Evaluating the Boundary Shift
1. **In the Vulnerable Build:** An external attacker invoking `adb shell am start -a android.intent.action.VIEW -d "seccraftnotes://open?id=2"` while Alice is the active user successfully causes Bob's note to be retrieved and displayed.
2. **In the Fixed Build:** The guard `!owner.equals(activeUser)` executes, blocking the unauthorized disclosure and displaying `Access denied or not found`.

---

## 4. Applying the 12-Step Lab Contract to Static Triage

When documenting any source-to-sink finding, adhere to the 12-Step Lab Contract:

1. **Prerequisites:** JADX-GUI v1.5+, `notes-boundary` source archive, `SHA256SUMS`.
2. **Scope:** Target package `org.seccraft.noteslab`, component `MainActivity`.
3. **Target / Build Identity:** SHA-256 digest of source archive verified against repository manifest.
4. **Hypothesis:** An external application can invoke `MainActivity` with `id=2` via deep link and read another user's note.
5. **Static Evidence:** Manifest declares `android:exported="true"` with `seccraftnotes` scheme; `MainActivity.java` passes query parameter directly to `NoteStore.lookup()`.
6. **Test Plan:** Construct intent payload `seccraftnotes://open?id=2` targeting the vulnerable build with Alice logged in.
7. **Observation:** Note body for Bob is returned and rendered to UI.
8. **Evaluation:** Confirms Broken Object Level Authorization (BOLA) at the application presentation layer.
9. **Impact:** High confidentiality breach: cross-account unauthorized data disclosure.
10. **Remediation:** Enforce session ownership verification in `NoteStore.lookup()` prior to returning record data.
11. **Retest:** Build fixed flavor (`DEMO_VULNERABLE=false`), re-execute test intent, confirm UI displays "Access denied".
12. **Limitations:** In-memory mock store; real production applications require backend database authorization and server-side session token validation.

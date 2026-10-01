# Components, Binder/IPC & Permissions

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0027](https://mas.owasp.org/MASTG/)  
**Core Model:** Components → Binder Driver → AIDL / Remote Procedure Calls → Permission Protection Levels → Caller Identity Validation

---

## 1. The Binder Inter-Process Communication (IPC) Mechanism

Because Linux processes on Android operate in isolated virtual address spaces with separate UIDs, they cannot share memory pointers. Android implements inter-process communication using the **Binder** kernel driver (`/dev/binder`).

```
+─────────────────────────────────────────────────────────────+
|                     Client App (Process A)                  |
|  Client Code ──► Service Proxy (Stub.asInterface)          |
|                       │                                     |
|                       ▼                                     |
|                 Parcel Marshaling                           |
|                       │                                     |
+───────────────────────┼─────────────────────────────────────+
                        │ ioctl(BINDER_WRITE_READ)
                        ▼
+─────────────────────────────────────────────────────────────+
|               Linux Kernel: /dev/binder                     |
|                                                             |
|  - Copies parcel data across process memory spaces (zero-copy)|
|  - Injects caller identity: calling UID and calling PID     |
|  - Routes to target Binder node handle                      |
+───────────────────────┼─────────────────────────────────────+
                        │ ioctl return
                        ▼
+─────────────────────────────────────────────────────────────+
|                     Target App (Process B)                  |
|                 Parcel Unmarshaling                         |
|                       │                                     |
|                       ▼                                     |
|  Service Stub.onTransact() ──► Business Logic Execution     |
+─────────────────────────────────────────────────────────────+
```

### 1.1. How Binder Guarantees Caller Identity
The foundational security property of Binder is that **the caller cannot spoof their UID or PID**.
- When Process A invokes `transact()`, the Binder kernel driver inspects the kernel task structure of the calling thread.
- The kernel injects the verified caller UID into the transaction record.
- Inside Process B's receiving thread (`onTransact()`), the callee queries:
  ```java
  int callerUid = Binder.getCallingUid();
  int callerPid = Binder.getCallingPid();
  ```
- If the callee invokes `Binder.getCallingUid()`, the return value is kernel-verified.

### 1.2. The Confused Deputy Trap in Binder Calls
A critical vulnerability occurs when a service makes a secondary call on behalf of the client without managing Binder identity:
- When Process B calls a system service (Process C) or another component, its own UID becomes the calling UID seen by Process C.
- If Process B fails to verify that the original caller (Process A) held the required permission before acting on its behalf, Process B acts as a **Confused Deputy**.
- Secure implementations use `Binder.clearCallingIdentity()` and `Binder.restoreCallingIdentity()` carefully around internal blocks, and verify caller permissions beforehand:
  ```java
  // Enforce caller holds required permission
  context.enforceCallingPermission(
      "com.example.permission.ACCESS_INTERNAL_REPORTS", 
      "Caller lacks required authorization"
  );
  
  final long token = Binder.clearCallingIdentity();
  try {
      // Execute sensitive operation as self
      performInternalSystemSync();
  } finally {
      Binder.restoreCallingIdentity(token);
  }
  ```

---

## 2. The Android Permission Architecture

Android restricts access to sensitive platform APIs (camera, location, contacts, SMS) and custom application components through its **Permission Framework**.

### 2.1. Permission Protection Levels

Permissions declared via `<permission>` tags define an `android:protectionLevel` that dictates how the platform grants them to requesting apps:

| Protection Level | Granting Mechanism | Security Model & Pentest Implication |
|---|---|---|
| **`normal`** | Automatically granted at installation. | Minimal risk APIs (e.g., internet access). Does not prompt user; cannot be revoked individually. |
| **`dangerous`** (runtime) | User prompt required at runtime (Android 6.0+). | High-risk private data (location, microphone, camera, contacts). Users can revoke anytime in Settings. |
| **`signature`** | Automatically granted **if and only if** the requesting app is signed by the **exact same signing certificate** as the declaring app. | **Highest security for app-to-app communication**. Protects internal APIs, companion apps, and proprietary suites. Third-party apps cannot obtain it. |
| **`privileged` / `signatureOrSystem`** | Granted to pre-installed system apps in `/system/priv-app`. | OEMs and platform vendors only. Standard third-party apps cannot acquire this. |

### 2.2. Custom Permission Definition Pitfalls
When an application defines its own custom permission:
```xml
<!-- In AndroidManifest.xml -->
<permission 
    android:name="org.seccraft.permission.READ_NOTES"
    android:protectionLevel="normal" /> <!-- VULNERABLE: normal allows any app to declare and hold it -->
```
If a developer defines a permission with `protectionLevel="normal"`, **any malicious application on the device can declare `<uses-permission android:name="org.seccraft.permission.READ_NOTES"/>` and receive it automatically without user consent**. 

To secure private inter-application interfaces, `protectionLevel` must be set to `signature`:
```xml
<permission 
    android:name="org.seccraft.permission.READ_NOTES"
    android:protectionLevel="signature" /> <!-- SECURE: restricted to apps with identical signing keys -->
```

---

## 3. Component-Level Authorization Strategies

When securing the four core Android components:

### 3.1. Activities
- **Threat:** Unauthorized screen invocation, bypassing authentication screens, sensitive parameter injection.
- **Defense:**
  - Keep `android:exported="false"` unless external apps must launch it.
  - If exported for custom deep links, enforce strict session checks in `onCreate()` or `onStart()` before displaying sensitive data.

### 3.2. Broadcast Receivers
- **Threat:** Injection of forged system or application events; interception of sensitive broadcast payloads.
- **Defense:**
  - Avoid sending sensitive data in sticky or implicit broadcasts.
  - Use `LocalBroadcastManager` (or modern Kotlin flows/SharedFlow) for in-app messaging.
  - When sending broadcasts to specific apps, use explicit intents (`intent.setPackage("com.target.app")`) or specify a sending permission:
    ```java
    sendBroadcast(intent, "com.target.app.RECEIVE_NOTIFICATION");
    ```

### 3.3. Content Providers
- **Threat:** SQL Injection via raw queries, path traversal in `openFile()`, arbitrary data leakage.
- **Defense:**
  - `android:exported="false"` by default.
  - If exported, declare granular permissions:
    ```xml
    <provider
        android:name=".data.SecureNoteProvider"
        android:authorities="org.seccraft.notes"
        android:exported="true"
        android:readPermission="org.seccraft.permission.READ_NOTES"
        android:writePermission="org.seccraft.permission.WRITE_NOTES" />
    ```
  - Always use parameterized queries with SQLite query builders; never concatenate incoming `Uri` parameters into SQL strings.

### 3.4. Services
- **Threat:** Unauthorized execution of background tasks, resource exhaustion, arbitrary RPC dispatch.
- **Defense:**
  - Protect exported services with `signature` permissions.
  - In AIDL service methods, validate caller UID via `Binder.getCallingUid()` before executing sensitive operations.

---

## 4. Pentester's Operational Checklist: Auditing Permissions & IPC

1. **Enumerate Declared and Used Permissions:**
   ```bash
   adb shell dumpsys package com.example.targetapp | grep -A 10 "requested permissions:"
   ```
2. **Audit Custom Permissions in Decompiled Manifest:**
   - Search for `<permission>` declarations in `AndroidManifest.xml`.
   - Verify whether `android:protectionLevel` is set to `signature`. Flag any custom permission with `normal` or omitted level that guards sensitive components.
3. **Inspect Component Permission Declarations:**
   - Look for components with `android:exported="true"` but missing `android:permission`.
   - Test invoking unpermissioned exported activities using `am`:
     ```bash
     adb shell am start -n com.example.targetapp/.ui.InternalAdminActivity
     ```
4. **Test Dynamic Receiver Registration:**
   - Search source code for `registerReceiver()`.
   - On Android 13+ (API 33), check if `RECEIVER_EXPORTED` or `RECEIVER_NOT_EXPORTED` is explicitly specified. Dynamic receivers registered without flags may be callable by any app on older Android versions.

---

## 5. Defense & Remediation Standards

1. **Enforce `signature` Protection on Private App Suites:** Never rely on custom permissions with `normal` protection to isolate sensitive interfaces.
2. **Explicit Receiver Flags (Android 13+):** Always pass `ContextCompat.RECEIVER_NOT_EXPORTED` when registering local broadcast listeners dynamically.
3. **Validate Callers in Service Stubs:** Do not rely solely on manifest declarations if fine-grained role checks are required; inspect `Binder.getCallingUid()` and verify caller package names against the `PackageManager`.

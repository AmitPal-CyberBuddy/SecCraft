# Android Architecture, Sandbox & Trust Boundaries

**Standard Alignment:** [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0001](https://mas.owasp.org/MASTG/)  
**Core Model:** Linux UID Isolation → Discretionary Access Control (DAC) → Mandatory Access Control (SELinux) → App Sandbox Boundaries

---

## 1. The Multi-Layered Android Security Model

Android departs fundamentally from traditional desktop operating systems where multiple applications run under the same logged-in user context. In a desktop Linux or Windows environment, any binary run by `alice` can read, modify, or exfiltrate any other file owned by `alice`. 

Android eliminates this ambient authority by treating **each installed application as a distinct Unix user**:

```
+-----------------------------------------------------------------+
|                        Application Layer                        |
|   App A (UID 10182)      App B (UID 10183)      App C (UID 10184)|
+-----------------------------------------------------------------+
|                        Framework Services                       |
|   ActivityManagerService    PackageManagerService    Keystore   |
+-----------------------------------------------------------------+
|                      Android Runtime (ART)                      |
|            Zygote Process (UID 0/root -> forks app UIDs)        |
+-----------------------------------------------------------------+
|                        Linux Kernel Layer                       |
|  - Process UID/GID separation (Discretionary Access Control)    |
|  - SELinux enforcing mode     (Mandatory Access Control)        |
|  - Cgroups, seccomp-bpf, namespace sandboxing                   |
+-----------------------------------------------------------------+
```

### 1.1. Application Sandboxing via Linux UIDs
When an application is installed, the `PackageManagerService` allocates a unique Linux User Identifier (`appId` starting at `10000`, e.g., `u0_a182` corresponds to UID `10182` on user 0).
- All processes spawned for that package execute strictly under that UID.
- The app's private data directory (`/data/data/<package_name>/` or `/data/user/0/<package_name>/`) is assigned ownership `u0_a182:u0_a182` with POSIX permissions `rwx------` (`0700` or `0751`).
- Other third-party applications (running as `u0_a183`, etc.) are physically prevented by kernel Discretionary Access Control (DAC) from reading or traversing that directory.

### 1.2. The Zygote Process and Cold Starts
To minimize cold-start latency and memory overhead:
1. During system boot, the `init` daemon starts `zygote` (or `zygote64`).
2. Zygote preloads core Java classes, Android framework resources, and pre-initializes the ART (Android Runtime).
3. When an app is launched, the system sends an IPC request to Zygote over a local Unix domain socket (`/dev/socket/zygote`).
4. Zygote calls `fork()`, duplicating its pre-warmed memory state via Copy-on-Write (CoW).
5. The forked child process immediately drops privileges: it calls `setuid()` and `setgid()` to switch from root (`0`) to the target app's assigned UID/GID (`10182`), applies `seccomp` filters, and executes the app entry point.

---

## 2. Kernel Protections: DAC vs. MAC (SELinux)

Traditional Linux file permissions (DAC) can be bypassed if any process running with UID `0` (root) or a shared group is compromised. Android enforces a secondary, non-negotiable security layer: **SELinux in Enforcing Mode** (Mandatory Access Control).

| Security Layer | Enforcing Entity | Policy Definition | Security Guarantee |
|---|---|---|---|
| **DAC (POSIX UID/GID)** | Linux Kernel VFS | File system ownership (`chown`, `chmod`) | Restricts access based on user ID identity. |
| **MAC (SELinux Android)** | Linux Kernel LSM | Compiled type enforcement (`sepolicy`) | Enforces least-privilege interactions regardless of UID (even root cannot access domains forbidden by policy). |

### 2.1. SELinux Domains and Types
Every process and object on Android is labeled with an SELinux security context:
`user:role:type:sensitivity[:category]`

For example:
- A standard untrusted third-party app runs in the domain: `u:r:untrusted_app:s0:c182,c256`
- App-private files are labeled: `u:object_r:app_data_file:s0:c182,c256`
- System framework services run in separate domains: `u:r:system_server:s0`

Even if a rogue app were to execute a local privilege escalation exploit that sets its effective UID to `0` (root), SELinux policy prevents the `untrusted_app` domain from modifying block devices, mounting filesystems, or accessing hardware drivers directly.

---

## 3. Trust Boundaries and Cross-App Communication

Because DAC and MAC isolate app processes by default, all inter-application communication and framework interactions must explicitly cross platform **trust boundaries**:

```
+-----------------------------+               +-----------------------------+
|    Application A (UID A)    |               |    Application B (UID B)    |
|                             |               |                             |
|  [Client Component]         |               |  [Exported Service / Act.]  |
|         │                   |               |               ▲             |
|         ▼                   |               |               │             |
|    Intent / RPC Call        |               |      Dispatched Payload     |
+─────────┼───────────────────+               +───────────────┼─────────────+
          │                                                   │
          ▼                                                   │
+─────────────────────────────────────────────────────────────┼─────────────+
| Android Kernel / Binder Driver (/dev/binder)               │             |
|                                                             │             |
|  - Intercepts IPC transaction                               │             |
|  - Cryptographically injects calling UID & calling PID ─────┘             |
|  - Enforces permission checks & reference capabilities                    |
+───────────────────────────────────────────────────────────────────────────+
```

### 3.1. The 4 Fundamental Component Types
Android does not expose arbitrary network ports or raw memory between applications. Cross-boundary interaction occurs exclusively through the four standard components declared in `AndroidManifest.xml`:
1. **Activities:** Interactive UI screens. Can be launched externally via explicit or implicit `Intent` requests.
2. **Services:** Background processing units. Can expose remote RPC interfaces via Binder/AIDL.
3. **Broadcast Receivers:** Event listeners that respond to system or application-wide broadcast messages.
4. **Content Providers:** Structured data interfaces abstraction (similar to a REST API over SQLite/files) accessed via `content://` URIs.

### 3.2. Declared vs. Enforced Boundaries
A component's security posture is determined by:
- **`android:exported` attribute:** If `false`, the Android Framework refuses to deliver any external Intent originating from another UID (except the Android system/root). If `true`, external apps can target this component.
- **Intent Filters:** Declaring an `<intent-filter>` advertises the component to the system for implicit resolution. In Android 12+ (API 31), explicit declaration of `android:exported` is strictly mandatory for any component containing a filter.
- **Permission Guards:** Components can require callers to hold specific permissions (`android:permission="com.example.CUSTOM_PERMISSION"`).

---

## 4. Pentester's Operational Checklist: Auditing the Sandbox

When evaluating an Android application's architectural boundary:

1. **Verify App UID & Sandboxing:**
   ```bash
   adb shell dumpsys package com.example.targetapp | grep -E "userId=|dataDir="
   # Output: userId=10182 dataDir=/data/user/0/com.example.targetapp
   ```
2. **Inspect Process Context and SELinux Domain:**
   ```bash
   adb shell ps -AZ | grep com.example.targetapp
   # Output: u:r:untrusted_app:s0:c182,c256  u0_a182  14202  1520  com.example.targetapp
   ```
3. **Check File Permissions on Application Data:**
   ```bash
   adb shell ls -la /data/data/com.example.targetapp/
   # Confirm no world-readable (0777 or 0666) files or directories exist
   ```
4. **Identify Declared Exported Boundaries:**
   Decompile the manifest using `jadx` or `apktool` and extract every component where `android:exported="true"`. Every exported component represents an entry point across the application's trust boundary.

---

## 5. Defense & Remediation Standards

- **Principle of Complete Mediation:** Never assume an incoming Intent or IPC call originates from a friendly or authenticated source.
- **Default to Unexported:** Explicitly declare `android:exported="false"` on all Activities, Services, Receivers, and Content Providers unless public cross-app interaction is a core business requirement.
- **Signature Permissions:** For internal multi-app suites (e.g., sharing data between a consumer app and a companion app from the same organization), use custom permissions protected by `android:protectionLevel="signature"`. The platform guarantees that only apps signed with the exact same developer certificate can hold that permission.
- **Input Validation at the Sink:** Any data received across an IPC boundary (`Intent.getExtras()`, `Uri` parameters, Binder RPC arguments) must be treated as untrusted input. Validate types, schema, length, and authorized context before passing data to sensitive internal sinks.

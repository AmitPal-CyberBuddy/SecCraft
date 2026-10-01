# Runtime Observation: ADB, Logcat & Process Lifecycle

**Standard Alignment:** [OWASP MASVS-RESILIENCE](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0028](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0012](https://mas.owasp.org/MASVS/)  
**Core Model:** Non-Instrumented Observation Baseline → Linux Process Isolation & `/proc/` → Real-Time Logcat Filtering → `dumpsys` Window/Activity State → Memory Heap Forensics

---

## 1. The Non-Instrumented Baseline Principle

Dynamic security assessment begins with **non-instrumented runtime observation**. Before introducing debuggers, runtime hooks (Frida), or binary patches, an analyst must observe the application's natural execution on an owned test device:

```
+─────────────────────────────────────────────────────────────+
|               Non-Instrumented Observation Axiom            |
|                                                             |
|  1. Establish Natural Baseline:                             |
|     Observe unmodified application behavior in response to  |
|     legitimate and malicious inputs (ADB intents, network   |
|     traffic, background transitions).                       |
|                                                             |
|  2. Eliminate Observer Effects:                             |
|     Instrumentation tools (Frida, Xposed, debuggers) can    |
|     alter execution timing, trigger anti-tamper routines,   |
|     or bypass logic unintentionally. Establishing a clean   |
|     baseline ensures observed behaviors are genuine.       |
|                                                             |
|  3. Validate True Privileges & Boundaries:                  |
|     Verify how the Android OS, kernel, and hardware sandbox |
|     contain the target process under real Linux UID rules.  |
+─────────────────────────────────────────────────────────────+
```

---

## 2. Process Lifecycle & Process Isolation in Linux

Every Android application runs in a dedicated Linux process spawned by the `Zygote` daemon, assigned a unique Linux User ID (e.g., `u0_a184`, UID `10184`):

```bash
# 1. Identify target process ID (PID)
adb shell pidof com.example.targetapp

# 2. Inspect running processes with full user, PID, PPID, and memory stats
adb shell ps -A -o USER,PID,PPID,VSZ,RSS,NAME | grep com.example.targetapp
```

Output:
```
USER           PID   PPID    VSZ    RSS NAME
u0_a184      14280   1245 1582944 112480 com.example.targetapp
```

### 2.1. Inspecting `/proc/<pid>/status` & Memory Mappings
On a rooted test device or userdebug build, inspect the kernel's process representation:

```bash
# Check UID, GID, capabilities, and seccomp filtering
adb shell su -c "cat /proc/14280/status | grep -E 'Name|Uid|Gid|Groups|Seccomp'"
```

Output:
```
Name:   com.example.targetapp
Uid:    10184   10184   10184   10184
Gid:    10184   10184   10184   10184
Groups: 3003 9997 20184 50184
Seccomp:        2
```

To review all dynamically loaded native shared libraries (`.so` files) and mapped memory segments:

```bash
# Check loaded libraries and executable memory pages (W^X violations)
adb shell su -c "cat /proc/14280/maps | grep -E '\.so|base\.apk'"
```

---

## 3. Real-Time Logcat Filtering & Security Event Monitoring

Android's `logcat` circular buffers contain system, framework, and application diagnostic messages. During dynamic testing, monitor logs specific to the application process to identify sensitive data leakage, cryptographic failures, or unhandled exceptions:

```bash
# Filter logs strictly by target PID
TARGET_PID=$(adb shell pidof com.example.targetapp)
adb logcat -v time --pid=$TARGET_PID
```

### 3.1. Targeted Regex and Security Exception Tracking
Monitor for specific security keywords and framework warnings:

```bash
# Filter for authentication, tokens, crypto, and exceptions
adb logcat -v threadtime | grep -iE "(token|bearer|password|key|decrypt|X509|CertificateException|SecurityException)"
```

```
[Vulnerable Runtime Log Output Observed]
03-15 10:24:18.102 14280 14312 D AuthRepository: Login success: user=alice@example.com, token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
03-15 10:24:19.450 14280 14312 D CryptoEngine: Encrypting payload with static key=SecretKey12345678, IV=FixedIV0000000000
```

---

## 4. Activity, Window & Task State via `dumpsys`

The Android framework's `dumpsys` utility reveals internal operating system states, task stacks, and active window layout parameters:

### 4.1. Tracking Resumed Activities and Task Affinity
Verify which Activity is currently visible and inspect the backstack:

```bash
adb shell dumpsys activity activities | grep -E "mResumedActivity|mFocusedApp"
```

Output:
```
mResumedActivity: ActivityRecord{4a18e02 u0 com.example.targetapp/.ui.TransferActivity t142}
```

### 4.2. Validating `FLAG_SECURE` Enforcement on Active Windows
Verify whether an Activity currently in the foreground actually enforces `FLAG_SECURE` at the Window Manager level:

```bash
# Inspect window flags for the focused window
adb shell dumpsys window windows | grep -E "mCurrentFocus|mHasSurface|flags="
```

Look for the flag mask `0x00002000` (which corresponds to `FLAG_SECURE`):
```
Window #3 Window{7b92f08 u0 com.example.targetapp/.ui.TransferActivity}:
  mHasSurface=true isReadyForDisplay()=true
  flags=0x00002000  # FLAG_SECURE IS ACTIVE: Screen captures and task snapshots blocked!
```

If `flags=0x00000000` or lacks bit `0x2000`, the Activity is failing to enforce screen security, exposing sensitive account details to task-switcher snapshots.

---

## 5. Volatile Process Memory & Heap Dump Forensics

Sensitive credentials that are never written to disk can still persist in volatile Dalvik/ART process memory. If keys or tokens are stored in long-lived Java `String` objects (which are immutable and cannot be zeroized), they survive in memory until garbage collection:

### 5.1. Extracting Process Heap (`am dumpheap`)
Capture a complete snapshot of the target application's runtime heap:

```bash
# 1. Trigger Dalvik/ART heap dump to temporary storage
adb shell am dumpheap com.example.targetapp /data/local/tmp/app_heap.hprof

# 2. Pull heap file to workstation
adb pull /data/local/tmp/app_heap.hprof ./app_heap.hprof

# 3. Clean up on device
adb shell rm /data/local/tmp/app_heap.hprof
```

### 5.2. Converting and Analyzing Heap Dumps
Android `.hprof` files use a custom format that must be converted to standard Java HPROF format before analysis:

```bash
# Convert Android HPROF to standard Java HPROF format
hprof-conv ./app_heap.hprof ./converted_heap.hprof

# Search for plaintext sensitive strings (bearer tokens, passwords)
strings ./converted_heap.hprof | grep -E "^ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"
```

```
[Observation]
Converted HPROF contains:
eyJh... (Raw JWT access token found persisting in Dalvik heap 15 minutes after session termination)
```

Analysis tools like Eclipse Memory Analyzer (MAT) or Ghidra can trace object reference paths, pinpointing which static fields or singletons retained the confidential values in memory.

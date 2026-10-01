# Proxying, Logcat, Filesystem & Test Accounts

**Standard Alignment:** [OWASP MASVS-NETWORK](https://mas.owasp.org/MASVS/), [OWASP MASVS-STORAGE](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0004](https://mas.owasp.org/MASTG/)  
**Core Model:** Interception Proxy Routing → System CA Injection → Logcat Buffer Analysis → Filesystem Sandbox Audit → Multi-Tenant Account Hygiene

---

## 1. Intercepting Mobile HTTPS Traffic with an Interception Proxy

Android applications communicate with backend REST, GraphQL, and WebSocket APIs over HTTPS. Intercepting this traffic with a local proxy (Burp Suite, OWASP ZAP, or mitmproxy) is fundamental to analyzing the client-server trust boundary.

```
Android Test Device                                  Host Workstation
+──────────────────────────+                        +──────────────────────────+
|  Target App (OkHttp/TLS) |                        |   Interception Proxy     |
|             │            |                        |      (Burp Suite)        |
|             ▼            |                        |        :8080             |
|   Android System Proxy   |───────────────────────►|  - Validates TLS Client |
| (settings put http_proxy)|  Port 8080             |  - Decrypts Traffic      |
+──────────────────────────+                        +─────────────┬────────────+
                                                                  │ Upstream TLS
                                                                  ▼
                                                    +──────────────────────────+
                                                    |    Backend API Server    |
                                                    | (https://api.example.com)|
                                                    +──────────────────────────+
```

### 1.1. System CA vs. User CA Trust
Since Android 7.0 (API 24), apps ignore certificates in the **User Trust Store** by default. To intercept traffic on modern Android without modifying the APK:
1. The CA must be installed into the **System Trust Store** located at `/system/etc/security/cacerts/`.
2. System certificates must follow a strict naming format: the subject hash followed by `.0`.

### 1.2. Installing a Burp CA Certificate as a System Certificate

Step-by-step procedure on a `-writable-system` userdebug emulator:

```bash
# 1. Export Burp CA in DER format (cacert.der) and convert to PEM
openssl x509 -inform DER -in cacert.der -out burp.pem

# 2. Compute the old subject hash required by Android's OpenSSL/BoringSSL
HASH=$(openssl x509 -inform PEM -subject_hash_old -in burp.pem | head -n 1)
echo "Generated Hash: $HASH"   # e.g., 9a5ba575

# 3. Rename certificate file to <hash>.0
cp burp.pem "${HASH}.0"

# 4. Remount emulator system partition as read-write
adb root
adb remount

# 5. Push certificate directly into system CA store
adb push "${HASH}.0" /system/etc/security/cacerts/

# 6. Correct permissions and SELinux label
adb shell chmod 644 "/system/etc/security/cacerts/${HASH}.0"
adb shell chown root:root "/system/etc/security/cacerts/${HASH}.0"

# 7. Configure Android system proxy via ADB
adb shell settings put global http_proxy 192.168.1.100:8080
```

To remove the proxy after testing:
```bash
adb shell settings put global http_proxy :0
```

---

## 2. Real-Time Diagnostics with Logcat

The Android logging framework records system and application events across multiple internal circular memory buffers:
- **`main`:** General application logging (`Log.d()`, `Log.i()`, etc.).
- **`system`:** Core Android OS framework and system server messages.
- **`events`:** Binary event notifications (window transitions, screen unlock).
- **`crash`:** Uncaught exceptions and native crash stack traces (tombstones).

### 2.1. Filtering and Monitoring Workflows
```bash
# Stream logs for a specific application PID
PID=$(adb shell pidof -s com.example.targetapp)
adb logcat --pid=$PID -v time

# Filter by application Tag and severity (Warning and Error only)
adb logcat MySecurityTag:W *:S

# Clear log buffers before executing a specific test flow
adb logcat -c
```

### 2.2. The Sensitive Log Leakage Finding
Developers often forget debugging logs in release code. While auditing logcat:
- Monitor log output while authenticating, resetting passwords, or executing transactions.
- Search for leaked credentials, JWT session tokens, API keys, and Personally Identifiable Information (PII):
  ```bash
  adb logcat | grep -iE "token|bearer|auth|password|key|secret"
  ```
- **Vulnerability Check:** If an unprivileged app can read sensitive data output to logcat, or if logs persist in automated crash reports, document this under `MASVS-STORAGE-2`.

---

## 3. Navigating the Application Filesystem

Android's filesystem follows a standardized directory structure:

```
Android Filesystem Structure
├── /data/app/
│   └── ~~[hash]/[package_name]-[hash]/
│       ├── base.apk                 <── Primary application binary
│       ├── split_config.arm64_v8a.apk<── Split APK native architecture
│       └── lib/arm64/               <── Extracted native libraries (.so)
│
├── /data/data/<package_name>/       <── App-Private Sandbox (UID owned)
│   ├── shared_prefs/                <── XML key-value property files
│   ├── databases/                   <── SQLite databases (.db, .db-wal)
│   ├── files/                       <── Internal app-created files
│   └── cache/                       <── Temporary cached network responses
│
└── /storage/emulated/0/             <── Shared External Storage (MediaStore)
    ├── Documents/
    └── Download/
```

### 3.1. Dumping and Inspecting Private Storage
After interacting with the target application, inspect its sandbox for unencrypted sensitive data:
```bash
adb root
adb shell
cd /data/data/com.example.targetapp/

# Inspect SharedPreferences XML
cat shared_prefs/*.xml

# Query internal SQLite database tables
sqlite3 databases/app_database.db ".tables"
sqlite3 databases/app_database.db "SELECT * FROM user_sessions;"
```

---

## 4. Test Account Hygiene & Multi-Tenant Separation

Security testing requires verifying that users cannot access resources belonging to other users or tenants (Broken Object Level Authorization - BOLA / IDOR):

1. **Provision Minimum of Three Accounts:**
   - **Account A (Attacker Role / Tenant 1):** Standard user privileges.
   - **Account B (Victim Role / Tenant 2):** Distinct user and tenant data.
   - **Account C (Privileged Admin Role):** Validates horizontal and vertical privilege boundaries.
2. **State Cleanliness:**
   - Always run `adb shell pm clear <package_name>` when switching accounts to verify whether residual tokens or session caches persist across logins.
3. **Logout Lifecycle Validation:**
   - Test logging out in the app, capturing the API logout call in Burp, and verifying that previously issued session tokens cannot be reused to access endpoints or query internal databases.

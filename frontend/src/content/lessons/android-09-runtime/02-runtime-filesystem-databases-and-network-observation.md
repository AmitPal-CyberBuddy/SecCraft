# Dynamic State: Filesystem Changes, Databases & Live Network

**Standard Alignment:** [OWASP MASVS-STORAGE](https://mas.owasp.org/MASVS/), [OWASP MASVS-NETWORK](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0001](https://mas.owasp.org/MASVS/)  
**Core Model:** Runtime Filesystem Tracking → Live SQLite Inspection → Dynamic Network Observation & Proxying → Dynamic Permission Revocation

---

## 1. Tracking Runtime Filesystem Changes

During runtime workflows—such as authenticating, synchronizing data, taking photos, or logging out—applications continuously read and write state to disk. To capture ephemeral or residual artifacts, monitor `/data/data/<package>/` dynamically:

```bash
# Snapshot the sandbox directory before taking an action
adb shell su -c "find /data/data/com.example.targetapp -type f -exec ls -la {} +" > ./pre_login_files.txt

# Perform action in the app (e.g., log in or view sensitive record)

# Snapshot the sandbox directory after the action
adb shell su -c "find /data/data/com.example.targetapp -type f -exec ls -la {} +" > ./post_login_files.txt

# Diff the snapshots to identify newly created or modified files
diff -u ./pre_login_files.txt ./post_login_files.txt
```

### 1.1. Real-Time Inotify Monitoring
On userdebug or rooted devices with `inotifywait` installed (via busybox or Termux), monitor filesystem writes in real time:

```bash
adb shell su -c "inotifywait -m -r -e create,modify,delete /data/data/com.example.targetapp/"
```

Output:
```
/data/data/com.example.targetapp/shared_prefs/ CREATE user_session.xml
/data/data/com.example.targetapp/shared_prefs/ MODIFY user_session.xml
/data/data/com.example.targetapp/databases/ CREATE cache.db-wal
```

---

## 2. Live SQLite Inspection & Forensic Analysis

When new database files appear, inspect them immediately using the on-device `sqlite3` binary or pull them to the analysis workstation:

```bash
# Open database directly on device as root
adb shell su -c "sqlite3 /data/data/com.example.targetapp/databases/notes.db"
```

```sql
-- SQLite interactive CLI commands
.tables
.schema notes

-- Inspect stored records for plaintext secrets
SELECT id, title, content, user_id FROM notes;

-- Check Write-Ahead Logging checkpoint status
PRAGMA wal_checkpoint;
```

### 2.1. Validating SQLCipher & Database Encryption
If the database is properly encrypted with SQLCipher, attempting to open it with standard SQLite tools yields an immediate header error:

```bash
$ sqlite3 secured_records.db
sqlite> .tables
Error: file is not a database
```

If plaintext data is returned, the application has failed to implement encryption at rest, violating [OWASP MASVS-STORAGE-1](https://mas.owasp.org/MASVS/).

---

## 3. Dynamic Network Observation & Proxy Interception

Observing an application's live network traffic verifies whether network security configurations and TLS policies declared in static XML are actually enforced at runtime:

```
+────────────────────+         +─────────────────────+         +────────────────────+
|   Android Client   |         |      Burp Suite     |         |     Backend API    |
|   (Target App)     |────────►|   Proxy Listener    |────────►|   (Target Server)  |
|                    |◄────────|   (Port 8080)       |◄────────|                    |
+────────────────────+         +─────────────────────+         +────────────────────+
```

### 3.1. Routing Device Traffic Through Burp Suite
Configure global HTTP proxy on the test device:

```bash
# Set global HTTP proxy to workstation IP and Burp port
adb shell settings put global http_proxy 192.168.1.50:8080

# To remove proxy after testing
adb shell settings put global http_proxy :0
```

### 3.2. Identifying Network Observation Outcomes

| Observed Behavior in Proxy | Root Cause / Configuration | Security Finding |
|---|---|---|
| **HTTPS traffic intercepted in cleartext** | App trusts user CA or custom TrustManager accepts proxy certificate. | Validates that test harness has visibility; in release builds, if user CAs are trusted under `<base-config>`, this is a vulnerability ([OWASP MASVS-NETWORK-1](https://mas.owasp.org/MASVS/)). |
| **TLS Handshake Fails (`SSLHandshakeException`)** | App enforces system CA trust or certificate pinning; rejects proxy CA. | **Expected standard behavior** for production release builds. |
| **No traffic reaches proxy at all** | App uses raw TCP sockets, QUIC (HTTP/3), or non-proxy-aware native network libraries (e.g., Chromium network stack or WebRTC). | Requires transparent proxying (iptables redirect) or dynamic hooks. |
| **Plaintext HTTP traffic captured** | Manifest or NSC enables `cleartextTrafficPermitted="true"`. | **Critical Finding:** Unencrypted communications vulnerable to local eavesdropping ([OWASP MASVS-NETWORK-2](https://mas.owasp.org/MASVS/)). |

---

## 4. Dynamic Permission Revocation & Fault Tolerance

Modern Android allows users to revoke runtime permissions at any time via system settings or ADB. Secure applications must handle permission loss gracefully:

```bash
# Revoke camera permission while app is running
adb shell pm revoke com.example.targetapp android.permission.CAMERA

# Revoke fine location permission
adb shell pm revoke com.example.targetapp android.permission.ACCESS_FINE_LOCATION
```

### 4.1. Assessing Failure Modes
When the app attempts an action requiring the revoked permission:
- **Resilient Behavior:** App checks `ContextCompat.checkSelfPermission()`, detects missing permission, and displays an informative in-app rationale prompt without crashing.
- **Deficient Behavior:** App crashes immediately with an unhandled `SecurityException`, causing Denial of Service and generating crash dumps containing process stack traces.

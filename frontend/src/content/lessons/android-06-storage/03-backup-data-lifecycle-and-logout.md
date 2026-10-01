# Backup, Data Lifecycle & Logout

**Standard Alignment:** [OWASP MASVS-STORAGE](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0001](https://mas.owasp.org/MASTG/), [OWASP MASTG-TEST-0005](https://mas.owasp.org/MASTG/)  
**Core Model:** Android Backup Architecture (ADB & Cloud) → Backup Rules Configuration → Data Lifecycle Audit → The Incomplete Logout Vulnerability

---

## 1. The Android Backup Architecture

Android provides automated backup capabilities allowing users to seamlessly transition data to new devices or restore state from the cloud. However, if not configured with rigorous data classification boundaries, backup mechanisms allow physical or local attackers to extract the entire application sandbox:

```
+─────────────────────────────────────────────────────────────+
|               Android Backup Mechanisms                     |
|                                                             |
|  1. Local ADB Backup (Physical / Debugging Access):         |
|     - Triggered via adb backup -f backup.ab <package_name>  |
|     - Backs up /data/data/<package_name>/ to host computer. |
|     - Enabled whenever android:allowBackup="true" and not   |
|       explicitly blocked by data extraction rules.          |
|                                                             |
|  2. Cloud Auto-Backup (Google Drive):                       |
|     - Automatically uploads up to 25MB of app private data  |
|       to the user's Google Drive account.                   |
|     - Syncs across device upgrades.                         |
|     - Risk: Compromised Google accounts expose local app    |
|       databases and cached session tokens.                  |
+─────────────────────────────────────────────────────────────+
```

---

## 2. Extracting and Analyzing ADB Backups

When evaluating an application with `android:allowBackup="true"`, security analysts test whether private session tokens and databases can be extracted via ADB:

```bash
# 1. Trigger local backup of target application
adb backup -f target_app.ab com.example.targetapp
# (Accept the prompt on the device screen without setting a password)

# 2. Inspect the backup file header
head -c 24 target_app.ab
# Output: ANDROID BACKUP\n2\n1\nnone\n (version 2, compressed, unencrypted)

# 3. Unpack the compressed archive using standard tools
dd if=target_app.ab bs=24 skip=1 | \
    python3 -c "import zlib,sys; sys.stdout.buffer.write(zlib.decompress(sys.stdin.buffer.read()))" | \
    tar -xvf -

# 4. Inspect extracted sandbox files
ls -la apps/com.example.targetapp/
# apps/com.example.targetapp/sp/ (SharedPreferences XMLs)
# apps/com.example.targetapp/db/ (SQLite Databases)
```

If the unpacked backup contains valid authentication tokens, user profile records, or unencrypted database files, document this as a **High/Medium severity finding under MASVS-STORAGE-1**.

---

## 3. Configuring Modern Backup Rules (Android 12+)

Starting with Android 12 (API 31), Android separates cloud backup from device-to-device migration transfers via `android:dataExtractionRules`:

```xml
<!-- In AndroidManifest.xml -->
<application
    android:allowBackup="true"
    android:dataExtractionRules="@xml/data_extraction_rules"
    android:fullBackupContent="@xml/backup_rules" ...>
```

In `res/xml/data_extraction_rules.xml`:
```xml
<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <!-- Rules for Cloud Backup (Google Drive) -->
    <cloud-backup>
        <!-- Include non-sensitive user UI preferences -->
        <include domain="sharedpref" path="display_settings.xml" />
        
        <!-- EXCLUDE ALL SENSITIVE CREDENTIALS AND DATABASES -->
        <exclude domain="sharedpref" path="auth_tokens.xml" />
        <exclude domain="database" path="app_database.db" />
        <exclude domain="root" path="." />
    </cloud-backup>

    <!-- Rules for Device-to-Device Transfer (Cable / Nearby Migration) -->
    <device-transfer>
        <exclude domain="sharedpref" path="auth_tokens.xml" />
        <exclude domain="database" path="app_database.db" />
    </device-transfer>
</data-extraction-rules>
```

For applications handling banking, healthcare, or authentication credentials, the safest standard is disabling backup completely:
```xml
<application android:allowBackup="false" ...>
```

---

## 4. The Incomplete Logout Vulnerability

A critical phase in the data lifecycle is **session termination (logout)**. In many poorly designed applications, clicking "Log Out" is merely a client-side visual transition:

```
+──────────────────────────+                        +──────────────────────────+
|  User Clicks "Log Out"   |                        |  What Actually Happens   |
|                          |                        |                          |
|  1. UI switches back to  |                        |  1. UI navigates: YES    |
|     LoginActivity.       |                        |  2. Server Revokes Token:|
|                          |                        |     NO (API call omitted)|
|  2. User assumes they are|                        |  3. Disk Tokens Wiped:   |
|     safely logged out.   |                        |     NO (Still in XML!)   |
|                          |                        |  4. SQLite Data Wiped:   |
|                          |                        |     NO (Still on disk!)  |
+──────────────────────────+                        +──────────────────────────+
```

### 4.1. Retest Methodology: Auditing Logout Boundaries
Execute this empirical 4-step verification:

```bash
# Step 1: Capture sandbox state WHILE LOGGED IN
adb root
adb shell "tar -czf /sdcard/pre_logout.tar.gz -C /data/data/com.example.targetapp ."
adb pull /sdcard/pre_logout.tar.gz .

# Step 2: Extract active session token from Burp Suite proxy traffic
# Example: Bearer eyJhbGciOi...

# Step 3: Click "Log Out" in the application UI

# Step 4: Capture sandbox state AFTER LOGOUT
adb shell "tar -czf /sdcard/post_logout.tar.gz -C /data/data/com.example.targetapp ."
adb pull /sdcard/post_logout.tar.gz .

# Compare sandbox states
diff -u <(tar -ztvf pre_logout.tar.gz) <(tar -ztvf post_logout.tar.gz)
```

**Evaluation Criteria:**
1. **Client-Side Storage:** Are tokens, cached user profiles, and sensitive database records deleted from disk upon logout?
2. **Server-Side Invalidation:** Replay the pre-logout token in Burp Suite against authenticated API endpoints. If the server accepts the token after client logout, document a **Broken Authentication finding (OWASP MASVS-AUTH-1)**.

---

## 5. Defense & Remediation Standards

1. **Explicitly Disable Backup on Sensitive Apps:** Set `android:allowBackup="false"` in `AndroidManifest.xml` unless cross-device synchronization is a verified product requirement.
2. **Implement Exhaustive Logout Teardown:**
   - Invalidate access tokens and refresh tokens on the backend authentication server.
   - Clear all session records in `EncryptedSharedPreferences`: `prefs.edit().clear().commit()`.
   - Delete cached files in `cacheDir.deleteRecursively()`.
   - Execute SQLite database vacuuming and reset local encryption keys.

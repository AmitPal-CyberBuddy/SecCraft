# App Storage: Preferences, Files, SQLite & Cache

**Standard Alignment:** [OWASP MASVS-STORAGE](https://mas.owasp.org/MASVS/), [OWASP MASTG-TEST-0001](https://mas.owasp.org/MASTG/), [OWASP MASTG-TEST-0003](https://mas.owasp.org/MASTG/)  
**Core Model:** Internal vs. External Storage → SharedPreferences → SQLite & Write-Ahead Logs (.db-wal) → Disk Cache Artifacts

---

## 1. The Android Storage Ecosystem

Android segregates file storage into two main physical domains with radically different security models:

```
+─────────────────────────────────────────────────────────────+
|               Android Storage Partitioning                  |
|                                                             |
|  1. Internal Storage (/data/data/<package_name>/):          |
|     - Sandbox private to the application's assigned UID.    |
|     - Protected by Linux kernel DAC (0700) & SELinux.       |
|     - Accessible by the app, root (UID 0), or via backup.   |
|                                                             |
|  2. Shared External Storage (/storage/emulated/0/ or /sdcard):|
|     - Shared FAT/ext4 media volume.                         |
|     - Prior to Android 10: Any app with READ_EXTERNAL_STORAGE|
|       could read every file stored here.                    |
|     - Android 10+ (API 29): Scoped Storage restricts apps   |
|       to their own package folder or MediaStore collections.|
|     - NEVER store sensitive user data or tokens here!       |
+─────────────────────────────────────────────────────────────+
```

---

## 2. Auditing SharedPreferences

`SharedPreferences` is a lightweight key-value store used for application settings, session flags, and state persistence. On disk, preferences are stored as plaintext XML files in `/data/data/<package_name>/shared_prefs/`:

```xml
<!-- /data/data/com.example.bank/shared_prefs/user_session.xml -->
<?xml version='1.0' encoding='utf-8' standalone='yes' ?>
<map>
    <string name="auth_token">eyJhbGciOiJIUzI1NiIsInR5cCI6...</string>
    <string name="user_email">alice@example.com</string>
    <boolean name="is_admin" value="false" />
    <int name="failed_login_count" value="0" />
</map>
```

### 2.1. Insecure File Creation Modes
In legacy Android applications, developers could pass file creation modes to `getSharedPreferences()`:
- `Context.MODE_WORLD_READABLE` (Deprecated in API 17, threw `SecurityException` starting in API 24).
- `Context.MODE_WORLD_WRITEABLE` (Deprecated in API 17).
If an application targeting older SDKs uses these modes, **any other application on the phone can directly open and read or modify the XML file**.

### 2.2. EncryptedSharedPreferences (AndroidX Security)
For storing sensitive strings locally, modern Android applications use `EncryptedSharedPreferences`:
```kotlin
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val sharedPreferences = EncryptedSharedPreferences.create(
    context,
    "secret_shared_prefs",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)
```
- Keys are encrypted using deterministic AES-256-SIV (preventing key name enumeration).
- Values are encrypted using authenticated AES-256-GCM.
- The master encryption key is securely anchored inside the hardware **Android Keystore**.

---

## 3. SQLite Databases & Write-Ahead Logging (.db-wal)

Android applications commonly persist relational data using SQLite or Room ORM, stored in `/data/data/<package_name>/databases/`.

### 3.1. The `.db-wal` Forensic Artifact Trap
When SQLite operates in WAL (Write-Ahead Logging) mode (the default since Android 9), database changes are committed to a temporary journal file (`<database_name>.db-wal`) before being merged into the primary `.db` file:

```bash
# Typical application database folder
ls -la /data/data/com.example.targetapp/databases/
# app_database.db       <── Primary database file
# app_database.db-wal   <── Write-Ahead Log (Contains unmerged transactions!)
# app_database.db-shm   <── Shared memory index file
```

**Security Analyst Insight:**
- If an application "deletes" sensitive credentials or session records upon logout, **the plaintext data frequently persists inside the `.db-wal` file** until SQLite executes a checkpoint operation (`PRAGMA wal_checkpoint(FULL)`).
- Always inspect `.db-wal` files during forensic storage audits:
  ```bash
  strings app_database.db-wal | grep -iE "token|password|bearer"
  ```

### 3.2. Encrypted Databases via SQLCipher
Standard SQLite provides zero on-disk encryption. Applications storing sensitive financial or medical records must use **SQLCipher**, which transparently encrypts every 4096-byte database page with 256-bit AES.
- **Audit Verification:** Query the database using standard `sqlite3`. If the database is properly encrypted with SQLCipher, `sqlite3 database.db ".tables"` will fail with: `Error: file is not a database`.
- **Passphrase Audit:** Inspect the decompiled DEX code in JADX to verify how the SQLCipher encryption passphrase is generated. If the passphrase is hardcoded as a static string or derived from predictable device properties (e.g., `Build.SERIAL`), the encryption is easily broken.

---

## 4. Cache & Temporary Storage Leakage

Applications frequently leak sensitive API responses through unmanaged disk caches:

1. **HTTP Network Response Cache (`/data/data/<pkg>/cache/` via `context.getCacheDir()`):**
   - HTTP client libraries (such as OkHttp) cache HTTP GET responses to disk if server headers include `Cache-Control: public, max-age=...`.
   - Inspect `/cache/` (`context.cacheDir` / `getCacheDir()`) for cached JSON responses containing account balances, personal profile details, or session tokens.
2. **Image / Glide / Coil Disk Cache:**
   - Image loading libraries cache downloaded thumbnails to disk. If an app downloads sensitive documents (driver's licenses, passports, checks), thumbnail images remain unencrypted in the cache folder.
3. **Web Cache (`app_webview/Default/Cache/`):**
   - Embedded WebViews maintain their own disk caches of loaded HTML, scripts, and cookies.

---

## 5. Defense & Remediation Standards

1. **Never Persist Sensitive Data in Plaintext:** Authentication tokens, private keys, and Personally Identifiable Information (PII) must never be written to plaintext `SharedPreferences` or standard SQLite databases.
2. **Deploy EncryptedSharedPreferences and SQLCipher:** Encrypt local storage using keys anchored in the hardware-backed Android Keystore.
3. **Disable HTTP Caching for Sensitive Endpoints:** Ensure backend APIs return `Cache-Control: no-store, no-cache, must-revalidate` on all authenticated endpoints to prevent client HTTP engines from caching payloads to disk.
4. **Flush SQLite Checkpoints on Logout:** When clearing user sessions, explicitly execute a full WAL checkpoint and vacuum to ensure residual transactions are wiped from disk:
   ```java
   db.execSQL("PRAGMA wal_checkpoint(FULL);");
   db.execSQL("VACUUM;");
   ```

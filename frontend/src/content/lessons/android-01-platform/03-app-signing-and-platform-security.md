# App Signing, Installation & Platform Security

**Standard Alignment:** [OWASP MASVS-CODE](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0012](https://mas.owasp.org/MASTG/)  
**Core Model:** Cryptographic Signatures → APK Signing Schemes (v1–v4) → Key Rotation → Package Verification → Verified Boot / dm-verity

---

## 1. The Role of Code Signing in Android

Unlike traditional desktop systems where code signing is frequently an optional reputation indicator, on Android, **code signing is a fundamental security requirement enforced by the operating system**.

Every Android application must be cryptographically signed before the `PackageManagerService` will install it. The signature establishes two non-negotiable guarantees:
1. **Code Integrity:** Ensures the APK has not been modified, corrupted, or tampered with since the developer signed it.
2. **Author Identity & Upgrade Trust:** Dictates which updates can be installed over an existing package, and regulates access to `signature`-protected permissions and shared UIDs (`android:sharedUserId`).

```
+─────────────────────────────────────────────────────────────+
|                     Installation Check                      |
|                                                             |
|  1. Parse APK Central Directory & Verify Signatures (v1-v4) |
|  2. Match Signing Certificate with installed package:       |
|     - New Install: Record Public Key in /data/system/packages.xml
|     - Update: Compare Existing Certificate with Incoming Certificate
|       ├── Exact Match: Proceed with Package Replacement      |
|       └── Mismatch: INSTALL_FAILED_UPDATE_INCOMPATIBLE      |
+─────────────────────────────────────────────────────────────+
```

---

## 2. Evolution of APK Signing Schemes (v1 to v4)

As Android matured, attacks against zip packaging and installation performance led to the development of four distinct signing schemes:

| Scheme | Introduced | Mechanism | Pentest & Security Implications |
|---|---|---|---|
| **v1 (JAR Signing)** | Android 1.0 | Standard Java JAR signing. Hashes each file individually in `META-INF/MANIFEST.MF`, with signature in `.SF` and `.RSA`/`.DSA`. | **Vulnerable to container tampering**: Metadata (e.g., zip comments, order) is unhashed. Vulnerable to the **Janus vulnerability** (CVE-2017-13156), allowing arbitrary DEX prepending to APKs without invalidating v1 signatures. |
| **v2 (APK Signing Block)** | Android 7.0 (API 24) | Signs the entire binary payload using an **APK Signing Block** inserted immediately before the ZIP Central Directory. | **Complete integrity**: Any modification to ZIP metadata or byte content invalidates the signature. Drastically accelerates verification at install time. |
| **v3 (Key Rotation)** | Android 9.0 (API 28) | Same binary format as v2, but adds a cryptographic **signing lineage proof** embedded in the signing block. | Allows developers to **rotate compromised or outdated signing keys** without breaking existing user update paths. Older keys sign trust proofs for newer keys. |
| **v4 (Streaming Signatures)**| Android 11 (API 30)| Generates a separate tree-hash signature file (`.apk.idsig`) stored alongside the APK. | Enables **Incremental Installation** over ADB (`adb install --incremental`), verifying blocks on-demand as they stream to the device. |

### 2.1. Inspecting APK Signatures with `apksigner`
The official Android SDK tool `apksigner` verifies which schemes protect an APK:

```bash
apksigner verify --verbose --print-certs target_app.apk
```

**Expected Secure Output:**
```
Verifies
Verified using v1 scheme (JAR signing): true
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
Verified using v4 scheme (APK Signature Scheme v4): false
Number of signers: 1
Signer #1 certificate DN: CN=SecCraft Security, OU=Mobile, O=SecCraft Inc, C=US
Signer #1 certificate SHA-256 digest: 8f4e2b...d14a
```

If an APK verifies **only** using the v1 scheme and lacks v2/v3 signatures, it is susceptible to archive manipulation on older devices and signals outdated build toolchains.

---

## 3. Package Manager Security & Installation Lifecycle

The `PackageManagerService` (running inside `system_server`) mediates all app installations:

1. **Manifest Parsing & Validation:**  
   Extracts `AndroidManifest.xml`, validates XML schema, checks minimum SDK version (`minSdkVersion`), and resolves component names.
2. **Signature Verification:**  
   Invokes `ApkSignatureSchemeV2Verifier` / `V3Verifier`. If the APK targets API 24+ and contains an APK Signing Block, v2/v3 verification must succeed.
3. **UID Assignment & Directory Provisioning:**  
   Assigns a unique Linux UID (e.g., `10182`), creates the sandbox folder `/data/data/<package_name>/`, sets file ownership `u0_a182:u0_a182` (`0700`), and writes package metadata into `/data/system/packages.xml`.
4. **Signature Downgrade Protection:**  
   If an installed app is signed with Certificate $K_A$, the system will **never** allow an update signed with Certificate $K_B$, even if the version code is higher. The only way to replace the app with a different signature is to uninstall it first (which deletes all private sandbox data in `/data/data/`).

---

## 4. Hardware Root of Trust: Verified Boot & AVB 2.0

Platform application security is ultimately anchored in the underlying device hardware through **Android Verified Boot (AVB 2.0)**:

```
+───────────────────────────+
|     Bootloader (ROM)      | ──► Verifies OEM Public Key in eFuse / SoC
+─────────────┬─────────────+
              │ Passes Root of Trust
              ▼
+───────────────────────────+
|      boot / vendor_boot   | ──► Verifies Kernel & Ramdisk Signature
+─────────────┬─────────────+
              │ Launches Kernel with dm-verity
              ▼
+───────────────────────────+
|   System / Vendor / Product| ──► Read-only block devices verified via
|   dm-verity hash trees    |     Merkle tree against signed root hash
+───────────────────────────+
```

### 4.1. How `dm-verity` Protects the Framework
System partitions (`/system`, `/vendor`) are mounted as read-only block devices backed by the Linux `dm-verity` (device-mapper verity) kernel driver.
- Every block on disk is verified against a Merkle tree of cryptographic hashes.
- If a root exploit or physical attacker modifies even a single byte of a system binary (e.g., `/system/framework/framework.jar` or `system_server`), the kernel blocks the read operation with an I/O error and reboots into a secure recovery state.
- This ensures that framework security controls (like the `PackageManagerService` and SELinux policies) cannot be silently patched in storage on a locked device.

---

## 5. Pentester's Operational Checklist: Auditing Signing & Installation

1. **Verify Signature Scheme Coverage:**
   ```bash
   apksigner verify --verbose sample.apk
   # Confirm v2 and v3 are present; flag any APK relying exclusively on v1.
   ```
2. **Extract Certificate Fingerprint:**
   ```bash
   keytool -printcert -jarfile sample.apk
   # Record SHA-256 fingerprint for build provenance and cross-environment comparison.
   ```
3. **Test Package Update Downgrade / Replacement:**
   Attempt to install a modified, re-signed APK over the original build:
   ```bash
   adb install -r re-signed_sample.apk
   # Expected result: Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE]
   ```
   If this succeeds on an enterprise or test device, it indicates signature checking was disabled at the platform level (e.g., via custom test ROM or Xposed/CorePatch module).

---

## 6. Defense & Remediation Standards

1. **Enforce v2 and v3 Signing in Gradle:** Ensure `signingConfigs` in `build.gradle` explicitly enables modern schemes:
   ```groovy
   android {
       signingConfigs {
           release {
               enableV1Signing true
               enableV2Signing true
               enableV3Signing true
           }
       }
   }
   ```
2. **Protect Release Keystores:** Signing private keys must never be committed to source code repositories, exposed in CI/CD pipeline logs, or stored unencrypted on developer workstations.
3. **Use Google Play App Signing:** For public store deployments, utilize Google Play App Signing with separate upload keys, ensuring that compromised developer workstations do not compromise the long-term app signing identity.

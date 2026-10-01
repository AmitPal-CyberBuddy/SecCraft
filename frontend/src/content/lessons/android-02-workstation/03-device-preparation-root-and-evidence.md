# Device Preparation, Root/Non-Root, Snapshots & Evidence

**Standard Alignment:** [OWASP MASVS-RESILIENCE](https://mas.owasp.org/MASVS/), [OWASP MASTG-TECH-0005](https://mas.owasp.org/MASTG/)  
**Core Model:** Device Environment Selection → Rooting Architecture → Snapshot State Management → Evidence Integrity & Chain of Custody → The Offline Fallback

---

## 1. Physical Hardware vs. Virtual Emulation

Choosing the appropriate test environment is the first strategic decision in an Android security assessment:

| Assessment Dimension | Android Virtual Device (AVD / Genymotion) | Physical Rooted Hardware (Pixel / OnePlus) |
|---|---|---|
| **Setup Speed & Cost** | Fast, free, easily automated across dozens of Android API levels. | Requires dedicated physical hardware and USB cabling. |
| **Root & System Modifications** | Built-in via `userdebug` images (`adb root`, `-writable-system`). | Requires unlocked bootloader and Magisk / KernelSU flashing. |
| **Hardware Fidelity** | Simulated sensors, software Keystore emulation, no NFC / SIM card. | Real Secure Element (TEE / StrongBox), genuine cellular/Bluetooth stacks, genuine biometrics. |
| **Anti-Tamper & Attestation** | Readily detected by anti-emulator heuristics (`qemu`, `goldfish` drivers). | Passes basic hardware checks; supports advanced testing of Google Play Integrity API. |

**Recommended Dual-Tier Workflow:**
1. **Tier 1 (Virtualization):** Use userdebug emulators for rapid initial triage, static analysis confirmation, proxy routing, and deep component fuzzing.
2. **Tier 2 (Physical Hardware):** Use a physical unlocked device (e.g., Google Pixel running modern stock or GrapheneOS with Magisk/KernelSU) to evaluate hardware-backed Keystore, biometrics, safety controls, and Play Integrity attestation.

---

## 2. Root Architecture: Magisk vs. KernelSU

On modern Android devices running Android 12 through 15, traditional root solutions (like SuperSU) are obsolete due to SELinux and system partition `dm-verity` protections:

```
+─────────────────────────────────────────────────────────────+
|               Modern Systemless Root Mechanics              |
|                                                             |
|  1. Magisk (Zygisk):                                         |
|     - Modifies the boot partition ramdisk, leaving /system  |
|       completely untouched (Systemless).                    |
|     - Mounts an overlay filesystem over system directories. |
|     - Intercepts Zygote process creation via Zygisk to      |
|       inject modules into application processes.            |
|                                                             |
|  2. KernelSU:                                               |
|     - Operates directly inside the Linux kernel.            |
|     - Grants root capabilities directly in kernel space     |
|       without creating /system/xbin/su or hooking userspace.|
|     - Invisible to userspace filesystem scanners by default.|
+─────────────────────────────────────────────────────────────+
```

### 2.1. When to Test on Non-Rooted Devices
A critical pitfall in mobile security testing is **testing exclusively on a rooted device**:
- If an application crashes upon launch due to a rigid root-detection control, the pentester cannot evaluate its core business logic, APIs, or data storage.
- Conversely, relying on Frida scripts to bypass root checks on an emulator proves that client-side checks can be bypassed, but does **not** demonstrate how the app behaves on an unmodified consumer phone.
- **Rule:** Always perform initial baseline observation on a clean, non-rooted device or unmodified profile to establish intended standard user behavior before introducing instrumentation.

---

## 3. Snapshot State Management & Clean Baselines

To ensure test repeatability, maintain strict control over emulator and device state:

### 3.1. Emulator Snapshot Management
```bash
# Start an emulator and save a clean baseline snapshot
emulator -avd Pentest_API33 -snapshot baseline_clean -no-snapshot-load

# Revert to clean baseline after executing an exploit scenario
emulator -avd Pentest_API33 -snapshot baseline_clean
```

### 3.2. Targeted Sandbox Archiving via Tar
When investigating data persistence or logout cleanup:
```bash
# Capture full application data sandbox before an action
adb root
adb shell "tar -czf /sdcard/state_pre_logout.tar.gz -C /data/data/com.example.targetapp ."
adb pull /sdcard/state_pre_logout.tar.gz ./evidence/

# Perform logout flow in the UI...

# Capture sandbox after action
adb shell "tar -czf /sdcard/state_post_logout.tar.gz -C /data/data/com.example.targetapp ."
adb pull /sdcard/state_post_logout.tar.gz ./evidence/

# Compare state diffs locally
tar -ztvf ./evidence/state_pre_logout.tar.gz
tar -ztvf ./evidence/state_post_logout.tar.gz
```

---

## 4. Evidence Integrity & Chain of Custody

In professional penetration testing, unsupported claims are rejected by development and compliance teams. Every reported vulnerability must be documented with complete contextual metadata:

```
[Required Evidence Artifact Specification]
1. Target Build Identity:
   - Package Name: com.example.targetapp
   - APK File Name: targetapp-v2.4.1-production.apk
   - SHA-256 Digest: 7e2f5...c91a (computed via sha256sum)
   - Version Name: 2.4.1 | Version Code: 104
   - Target SDK: 33 | Min SDK: 26

2. Execution Environment:
   - Device Model: Google Pixel 6 / Android Emulator
   - Android OS Release: 13 (API 33)
   - Kernel Version: 5.10.149-android13-9-g89...
   - Root / Tamper Status: Unrooted / Magisk v26.4 / Userdebug

3. Reproducible Command & Trace:
   - Full CLI invocation (e.g., adb shell am start ...)
   - HTTP Request / Response transcript with timestamp
   - Relevant Logcat excerpt with PID and timestamp
   - Positive Observation (flaw triggered) vs Negative Control (secure baseline)
```

---

## 5. The Offline Fallback Protocol

In many learning and CI/CD environments (such as browser-based sandboxes, containerized review pipelines, or restricted air-gapped workstations), an interactive Android emulator or physical device may be unavailable.

When working under offline or source-only constraints:

1. **Static Hypotheses are Valid Practice:**  
   Conduct rigorous static code review, map components in `AndroidManifest.xml`, trace untrusted sources to sensitive sinks in Java/Kotlin/Smali, and document potential vulnerability hypotheses.
2. **Explicitly Label Runtime Steps as `NOT EXECUTED`:**  
   Never fabricate simulated ADB responses, invent fictional proxy transcripts, or claim a dynamic vulnerability exists without empirical device verification. Document the finding as a *Static Code Vulnerability Hypothesis*, noting:
   > *"Status: Dynamic verification NOT EXECUTED due to offline environment. Requires authorized runtime testing on target build with verified accounts."*
3. **Integrity-Check Local Fixtures:**  
   Always verify the cryptographic integrity of local training packs and source fixtures against `SHA256SUMS` before beginning analysis:
   ```bash
   sha256sum -c SHA256SUMS
   ```

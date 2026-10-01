# Android Pentesting Workstation: SDK, ADB & Emulator

**Standard Alignment:** [OWASP MASTG-TECH-0001](https://mas.owasp.org/MASTG/), [OWASP MASTG-TECH-0002](https://mas.owasp.org/MASTG/)  
**Core Model:** SDK Platform-Tools → ADB Architecture (Client/Server/Daemon) → AVD System Image Selection → Writable System Execution

---

## 1. The Android Debug Bridge (ADB) Architecture

The Android Debug Bridge is the primary communication conduit between a security analyst's workstation and an Android test device or emulator. ADB is not a single executable; it operates as a three-component distributed client-server system:

```
Workstation (Host Machine)                          Android Device / Emulator
+──────────────────────────+                        +──────────────────────────+
|        ADB Client        |                        |        ADB Daemon        |
|  (CLI command: adb shell)|                        |          (adbd)          |
+────────────┬─────────────+                        +─────────────▲────────────+
             │ TCP 5037                                           │
             ▼                                                    │ USB or TCP
+──────────────────────────+                        +─────────────┴────────────+
|        ADB Server        |───────────────────────►|      Kernel USB /        |
| (Background Host Daemon) |  TCP 5555 or USB bulk  |     Loopback Network     |
+──────────────────────────+                        +──────────────────────────+
```

### 1.1. The 3 Architectural Tiers
1. **ADB Client:** Runs on the pentester's workstation. When you execute `adb shell`, `adb install`, or `adb push`, the client parses arguments and connects to the local ADB server on TCP port `5037`.
2. **ADB Server:** A background process running on the host machine. It detects attached devices via USB or network sockets, manages multiplexed connections, and serializes commands sent to individual target devices.
3. **ADB Daemon (`adbd`):** A daemon running in the background on the Android device/emulator. On production devices, `adbd` runs as the unprivileged user `shell` (UID 2000). On `userdebug` or rooted test images, `adbd` can run with root privileges (UID 0) via `adb root`.

### 1.2. ADB Connection States and Device Pairing
When running `adb devices -l`, each attached target reports one of several states:

| State | Interpretation | Action Required |
|---|---|---|
| **`device`** | Authorized and ready for communication. | Proceed with commands. |
| **`unauthorized`** | The device has not accepted the workstation's RSA public key. | Check device screen and accept the "Allow USB debugging?" dialog.ワーク |
| **`offline`** | Connected at transport level but not communicating with `adbd`. | Reconnect cable, restart daemon (`adb kill-server && adb start-server`), or toggle USB debugging. |
| **`no permissions`** | Linux host udev rules missing for USB vendor ID. | Configure `/etc/udev/rules.d/51-android.rules` with appropriate vendor permissions. |

---

## 2. Selecting the Proper Android Virtual Device (AVD) Image

Creating an emulator through Android Studio's AVD Manager presents three distinct system image types. Selecting the wrong image can completely block common testing procedures:

```
[System Image Selection Matrix]
├── Google Play Image (Production Build)
│   ├── Target: End-user fidelity testing
│   ├── adbd status: STRICT USER (adb root is PERMANENTLY DISABLED)
│   ├── Partition status: VERIFIED dm-verity (cannot remount /system)
│   └── Pentest suitability: POOR for instrumentation; good only for blackbox release testing
│
├── Google APIs Image (Userdebug Build)  <── RECOMMENDED FOR APPSEC
│   ├── Target: Developer debugging and testing
│   ├── adbd status: USERDEBUG (adb root SUCCEEDS immediately)
│   ├── Partition status: Supports -writable-system (allows custom CA injection)
│   ├── Services: Full Google Play Services (Firebase, Maps, Push)
│   └── Pentest suitability: EXCELLENT for standard mobile application pentesting
│
└── AOSP (Vanilla Open Source Image)
    ├── Target: Platform firmware development
    ├── adbd status: USERDEBUG / ROOT
    ├── Services: ZERO Google Play Services (apps depending on Google libraries may crash)
    └── Pentest suitability: SPECIALIZED (testing apps without Google framework dependencies)
```

### 2.1. Crucial CLI Flags for Security Testing
When starting an emulator instance for security assessment, launching from the command line allows passing vital configuration flags:

```bash
# Launch emulator with writable system partitions and clean snapshot state
emulator -avd Pentest_Pixel_API33 \
    -writable-system \
    -no-snapshot-load \
    -dns-server 8.8.8.8,1.1.1.1 \
    -http-proxy 192.168.1.100:8080
```

- **`-writable-system`:** Disables read-only dm-verity protection, enabling `adb remount` so you can install custom root CA certificates directly into `/system/etc/security/cacerts/`.
- **`-no-snapshot-load`:** Boots the emulator fresh from cold state, preventing stale memory artifacts or lingering process hooks from corrupting test runs.

---

## 3. Core ADB Command Reference for Security Analysts

Mastery of ADB commands allows rapid enumeration and interaction without touching device UI:

### 3.1. Package Management (`pm`)
```bash
# List all third-party (non-system) installed packages
adb shell pm list packages -3

# Find the physical filesystem path of an installed APK
adb shell pm path com.example.targetapp
# Output: package:/data/app/~~8x...==/com.example.targetapp-abc==/base.apk

# Pull the installed APK to the local workstation for decompilation
adb pull /data/app/~~8x...==/com.example.targetapp-abc==/base.apk ./target_extracted.apk

# Clear all private storage and cache for an application (clean state)
adb shell pm clear com.example.targetapp
```

### 3.2. Activity Manager Execution (`am`)
```bash
# Force start an exported activity with custom parameters
adb shell am start -n com.example.targetapp/.ui.DetailActivity --es "user_id" "105"

# Send a custom broadcast intent with extra data
adb shell am broadcast -a org.seccraft.action.REFRESH --ei "sync_code" 9999

# Start a background service
adb shell am startservice -n com.example.targetapp/.service.SyncService
```

### 3.3. Privilege Escalation & Remounting
```bash
# Switch adbd daemon to root (UID 0) on userdebug images
adb root

# Disable dm-verity and remount /system as read-write
adb disable-verity
adb reboot
adb root
adb remount
# System partitions can now be modified directly
```

---

## 4. Scope, Hygiene & Safe Pentesting Rules

1. **Authorized Scope Only:** Testing mobile applications requires strict written authorization defining target package names, API endpoints, test accounts, and acceptable test windows.
2. **Network Isolation:** Never connect an authorized pentesting emulator or rooted physical test device to an unsegmented corporate network or public Wi-Fi. Always operate behind an isolated testing bridge or dedicated lab VLAN.
3. **No Third-Party App Tampering:** Testing a specific client application does not grant authorization to audit pre-installed system apps, OEM services, or unrelated store applications installed on the same device.
4. **Post-Assessment Sanitation:** At the conclusion of testing, securely wipe test devices (`fastboot erase userdata` or AVD wipe) to eliminate stored client credentials, proprietary APKs, and diagnostic logs.

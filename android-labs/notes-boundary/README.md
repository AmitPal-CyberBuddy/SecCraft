# SecCraft Notes Boundary — owned teaching app source

**Source project only. No APK, device trace or successful build is shipped or claimed.** This workspace has no Java/Android SDK/Gradle or emulator, so the project has not been compiled or run here. The source can be audited offline. It is deliberately vulnerable in one flavor and fixed in the other; never install it on an unmanaged device or use real accounts/data. No backend, network calls, permissions or third-party dependencies are used in the app. A Gradle Android plugin is needed to build, and it will download tooling from your configured repositories; review those sources and licenses yourself. There is no wrapper JAR or prebuilt executable in this repository.

## Optional GitHub Actions APK build

An owner can run `.github/workflows/android-demo.yml` manually on this branch to build both **debug training APKs** on a GitHub-hosted runner. If that run passes, download the Actions artifact and check its `APK-SHA256SUMS` before installing on an owned emulator. This workflow has **not been executed in this workspace**; no prebuilt or dynamically tested APK is hosted by the course. Artifact retention is 14 days; GitHub may require repository access to download it. Build success would verify packaging, not observed on-device behavior or professional exploitability.

## Build on an owned Android workstation (NOT EXECUTED here)

Install JDK 17, Android SDK platform 35/build tools, and a compatible Gradle 8.x installation following official Android guidance. From this directory, run `gradle :app:assembleVulnerableDebug :app:assembleFixedDebug`. Record the `sha256sum` of each APK and inspect each **built** merged manifest before testing. Debug variants carry a debugger flag by design and are not production release builds.

Test on an owned emulator (OS API >= 26) after obtaining authorization for the device and app. Install one variant at a time or use package-qualified commands. Package IDs are `org.seccraft.noteslab.vulnerable` and `org.seccraft.noteslab.fixed`. The app has two synthetic notes: ID 1 (Alice), ID 2 (Bob). Launch its icon to select a *mock* account; default is Alice. The mock switch is **not authentication**, so this lab demonstrates a local ownership decision, not a remotely exploitable authenticated backend issue.

```sh
adb install -r app/build/outputs/apk/vulnerable/debug/app-vulnerable-debug.apk
adb shell am start -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n org.seccraft.noteslab.vulnerable/org.seccraft.noteslab.MainActivity
adb shell am start -a android.intent.action.VIEW -d 'seccraftnotes://open?id=1' -n org.seccraft.noteslab.vulnerable/org.seccraft.noteslab.MainActivity
adb shell am start -a android.intent.action.VIEW -d 'seccraftnotes://open?id=2' -n org.seccraft.noteslab.vulnerable/org.seccraft.noteslab.MainActivity
# Repeat with app-fixed-debug.apk and package org.seccraft.noteslab.fixed.
# Afterwards uninstall both:
adb uninstall org.seccraft.noteslab.vulnerable
adb uninstall org.seccraft.noteslab.fixed
```

**Expected by source inspection, not measured in this workspace:** with Alice active, ID 1 displays Alice's list in both variants; ID 2 displays Bob's list only in vulnerable and returns DENIED in fixed; an unknown ID returns DENIED in both. First invoke MAIN to reset mock account to Alice; `onNewIntent` keeps the account on subsequent URI launches while activity is alive. Android task/lifecycle behavior can differ, so *observe* the displayed account on every attempt and restart when needed. Use screenshots/logs from your own device only and record APK hash, OS/API, selected account, exact invocation, both positive and negative controls, and any unexpected result. Do **not** invent observed results from these source expectations.

Custom schemes do not verify domain ownership. A different installed app could also register `seccraftnotes`; the explicit component above avoids ambiguous resolver behavior for this particular local exercise, not real App Link validation. Not a Web/API testing lab. No pinning bypass is involved.

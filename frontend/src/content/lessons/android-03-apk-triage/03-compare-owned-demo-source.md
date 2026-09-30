# Source clinic: a vulnerable and fixed Android boundary

> This is a **source-only comparison**, not a completed device lab. Download the [original SecCraft Notes Boundary source ZIP](/android-demos/notes-boundary-source.zip) and compare its SHA-256 with [SHA256SUMS](/android-demos/SHA256SUMS). The original project lives under `android-labs/notes-boundary/` in the repository. No APK, Java SDK, Android emulator, or measured runtime results are shipped. The ZIP is for offline study and optional builds **only on an owned workstation**.

## Worked pass: why the boundary matters

Inspect `app/src/main/AndroidManifest.xml`: an exported Activity accepts the custom `seccraftnotes://open` VIEW URI. Custom schemes do **not** establish verified domain ownership. `MainActivity.java` reads the untrusted `id` query parameter, passes it to `NoteStore.lookup`, and displays the returned text. The app's mock `activeUser` defaults to Alice; switching it is a training control, *not authentication*. `NoteStore.java` contains synthetic ID 1 (Alice) and ID 2 (Bob). The vulnerable flavor skips the ownership check; the fixed flavor rejects any note whose owner differs from the mock active user. These are **source expectations**, not observed results.

The `app/build.gradle` file assigns each flavor a distinct package ID through `applicationIdSuffix` and defines `DEMO_VULNERABLE`. Both variants include the same Activity and URI handler. Calling the app a production authorization defect would be wrong: it has no real accounts, backend, or sensitive data. The defect teaches the *client-side decision* that a tester must validate on an installed scoped build.

## Independent investigation

Before consulting the [project README](/android-demos/notes-boundary-source.zip), draw `external URI → Activity → id → lookup → owner guard → text UI`. For *Alice as mock user*, predict ID 1, ID 2 and unknown ID 99 separately in vulnerable and fixed flavors. Include a positive control, negative control, and one way an app restart could change your observations. Write the exact package/variant/hash/API level fields you would need before claiming a dynamic result; leave values you lack as **NOT EXECUTED**. Why is a `seccraftnotes://` host insufficient to prove App Link ownership?

## Self-check and optional runtime extension

Source predicts ID 1 visible in both, ID 2 visible only in vulnerable, ID 99 denied in both. An Activity lifecycle reset can reset the mock user to Alice; read the account label on screen for every run. The README in the source ZIP provides *optional* `gradle` and `adb` commands for authorized workstations. They have **not been executed by SecCraft**. If you cannot build and install the project, finish the static trace but **do not claim dynamic pentesting practice**. If you do run it, record both APK hashes, built manifest, OS/API, account label, positive and negative controls, screenshots from your owned emulator, and any divergence from the expected behavior. Never use someone else's app or account to fill an evidence gap.

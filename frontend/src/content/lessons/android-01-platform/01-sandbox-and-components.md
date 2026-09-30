# Android Sandbox and Component Boundaries

**Goal:** identify which operations cross an Android app boundary. This Foundations exercise uses the text excerpts in [`android-foundations/`](/android-foundations/README.md) (or open `frontend/public/android-foundations/` in the repository). They are **not** a compiled APK; nothing here demonstrates a runtime exploit. Only inspect an app you own or are authorized to test.

Android assigns application processes a Linux UID; app-private files are not automatically readable by another app. Exposed *components* deliberately admit certain cross-process calls. Activities display flows, services perform work, receivers handle broadcasts, and providers expose structured data. A component's `android:exported` and permissions are part of the *declared* boundary, but a caller's input is still untrusted. An exported launcher activity is expected; it is not itself a finding. An unexported provider is not automatically safe against calls made *through another exported component*.

## Worked trace

Open `AndroidManifest.xml`: `MainActivity` has a MAIN/LAUNCHER filter and `exported="true"`; `NoteActivity` is not exported. `LinkActivity` is exported and handles `training://note` VIEW requests. `NoteProvider` and `ReminderReceiver` are explicitly unexported. This is an inventory of declared interfaces, not a claim that any test caller succeeded. `allowBackup="false"` and `debuggable="false"` are attributes in a teaching *source*; the merged manifest in a real installed build must be checked separately.

## Independent exercise

Build a table of `component | exported? | external input | sensitive action possible? | missing evidence`. For the VIEW activity, mark `id` as untrusted. Do *not* call it a disclosure yet: find the data-access implementation in `NoteStore.kt`, then explain whether its ownership check changes your hypothesis. Sketch one negative control with a second owned test account that would disprove a cross-account leak on a real installed build. Record why no dynamic result can be obtained from these text files.

**Self-check:** three explicitly unexported components? Count carefully: `NoteActivity`, `NoteProvider`, `ReminderReceiver`. Two activities are exported. An exported entry point is an attack surface, not proof of a bypass. The store compares `candidate.ownerId` to `session.userId`; whether *all* paths to the sensitive data use that store still needs investigation. Do not infer a production issue from a training excerpt.

**Further reference:** [Android security checklist—IPC](https://developer.android.com/privacy-and-security/security-tips#interprocess-communication), [OWASP MASVS-PLATFORM](https://mas.owasp.org/MASVS/). References inform the exercise; no OWASP conformance claim is made.

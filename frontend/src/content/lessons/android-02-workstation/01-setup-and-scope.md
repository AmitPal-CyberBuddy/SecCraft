# Authorized Android Workstation: Plan Before Attaching

This lesson plans a test; it cannot turn a browser lesson into an emulator. A proper dynamic lab needs an authorized *installed* sample, Android SDK/ADB, an emulator snapshot or owned test device, test accounts, isolated traffic and cleanup. No APK or device is supplied with this Foundations release. Do not attach to unrelated apps or intercept someone else's traffic.

## Worked setup plan

Record `app package/version/build hash | source and owner permission | Android OS API level | target SDK | emulator image or owned device | test accounts | permitted techniques | excluded endpoints | data retention | stop condition`. Then, on **your own** emulator after SDK installation, `adb devices` confirms connectivity and `adb shell getprop ro.build.version.sdk` identifies OS API level. Neither command identifies the tested app. An installed package would additionally need its exact version/signature, merged manifest and permitted launch path. If `adb devices` shows no authorized emulator, do not invent an output. Stop and use the offline excerpts instead.

An emulator can differ from physical hardware (Keystore backing, biometrics, integrity signals, OEM policies). A rooted test image may make inspection easier but can change behavior; record the environment before drawing conclusions. A debug build, network-security debug override or instrumentation can expose observations that the release build does not. Distinguish an observation from a production finding.

## Independent exercise

Write your own scope card for the original `org.seccraft.training.notes` *text fixture*: mark artifact type TEXT, version NOT BUILT, SDK NOT APPLICABLE, account NOT PROVIDED, dynamic techniques NOT EXECUTED. Which missing inputs are required before an exported-component test? Explain why installing an arbitrary app from the internet to fill the gap is not acceptable. Name one cleanup step you would perform after a future owned-emulator exercise.

**Self-check:** without a runnable build and controlled accounts, only source-level hypotheses are supported. The offline option is meaningful static practice, not dynamic proficiency. For platform installation and device tooling, consult [Android developer tooling](https://developer.android.com/tools/adb) and the [Android security checklist](https://developer.android.com/privacy-and-security/security-tips).

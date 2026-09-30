# APK Anatomy and Source-Level Triage

An APK contains the *built* manifest, DEX bytecode, resources/assets and signatures; an Android App Bundle (AAB) can yield device-specific split APKs. Source manifests and Kotlin excerpts alone cannot substitute for built-package inspection. In a real authorized assessment, inventory the exact APK/version/hash, use `apkanalyzer` or `aapt` for package/manifest information, `apksigner` for signature facts and JADX/apktool for code/resources. Decompilation can lose names or change structure; dynamic code and native libraries can obscure a path. Tools highlight candidates; you decide whether the app can reach them.

## Worked triage on available material

The supplied `AndroidManifest.xml` says package `org.seccraft.training.notes`, INTERNET permission, disabled backup/debug and two exported activities. These are *source statements*, not the result of `apkanalyzer`. The `LinkActivity.kt` excerpt takes a query ID; the `NoteStore.kt` excerpt compares ownership. Make an inventory with `artifact | observation | confidence | missing built/runtime evidence`. The two Kotlin files are intentionally short; do not infer implementation of `showNote`, session creation, or storage encryption.

## Independent exercise

Classify the following: (1) `android:debuggable="false"` in source; (2) an arbitrary custom scheme's authority; (3) `candidate.ownerId == session.userId` in an excerpt; (4) a scanned string named `api_key`. For each, decide whether it proves a shipped control, a secret, or merely indicates a question to test. State how you would check a debug-vs-release manifest difference **if** a build were provided. Do not execute APK tools against text snippets or claim a signed APK exists.

**Self-check:** source flag does not prove final merged build; URI host in a custom scheme is not app-owner verification; ownership comparison is a relevant guard on this path; a string may be public, decoy or dead code. Consult [Android build artifacts](https://developer.android.com/build/building-cmdline) and [OWASP MASTG Android knowledge](https://mas.owasp.org/MASTG/knowledge/android/) when preparing a real authorized package review.

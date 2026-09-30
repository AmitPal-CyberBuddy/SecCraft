# Storage, Backup and Data Leakage: Mechanism and Worked Trace

> **Scope:** original synthetic training files only. The [source case pack](/android-cases/cases.json) is not a compiled APK or a device capture. Download the [Notes Boundary source project](/android-demos/notes-boundary-source.zip) only for the one mock note/URI demo it actually contains. Use an owned emulator and authorized test builds for optional runtime work; no observed runtime result ships here.

## Threat boundary

Map where each sensitive value is created, persisted, rendered and destroyed: app-private files, preferences, databases, cache, notifications, logs, clipboard, backup and shared storage. Android sandboxing and storage protection are different controls.

## Worked observation → interpretation → limit

The SessionCache excerpt writes a synthetic token to preferences and logs it. Private preferences do not imply all other apps can read the file; logs and backups have separate access models. The improved excerpt refers to a secureStore pseudocode and logout cleanup—neither is a tested Keystore-backed implementation.

The relevant source excerpt is labeled **SessionCache.kt (illustrative excerpt)**. In the Lab tab, read the candidate and safer comparison before answering. Identify the source of untrusted input, the sink, and the missing proof. secureStore is pseudocode, not a shipped secure-storage implementation.

## A safer decision

Android Keystore makes certain keys non-exportable under conditions, not app-process plaintext inaccessible. Key handling, user authentication policy and hardware backing vary. Do not call an imaginary secureStore secure. A finding requires an exact artifact hash, OS/API and target SDK context where relevant, a controlled positive and negative observation, and a bounded conclusion. In this authored example, the only safe claim is what the named source files express. The distinct Android cases are *not* one deployed application.

**Practice standard:** this unit touches [MASVS-STORAGE](https://mas.owasp.org/MASVS/), but a thematic alignment is not a completed OWASP verification test. Refer to the applicable MASTG atomic test only when the actual build and method can be matched. No account XP or locally revealed answer proves field skill.

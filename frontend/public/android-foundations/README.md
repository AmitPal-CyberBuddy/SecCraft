# Android Foundations synthetic evidence pack

These are three **authored text excerpts**, not an APK, Gradle project, emulator capture or production evidence. They are safe for offline source/manifest exercises. Do not run `adb install` or claim runtime validation against them. The LinkActivity and NoteStore excerpts are intentionally separate: the exported VIEW entry point accepts an untrusted ID, while the supplied store enforces owner checks. The observed static data flow does not establish cross-account disclosure. A real engagement needs the exact built manifest, all relevant code paths, authorized test accounts, and controlled runtime evidence.

From the repository root, verify integrity with `python3 scripts/verify-android-foundations.py`. Hashes are printed there and in `SHA256SUMS`. The sample is original SecCraft teaching content; it contains no real credentials or third-party app code.

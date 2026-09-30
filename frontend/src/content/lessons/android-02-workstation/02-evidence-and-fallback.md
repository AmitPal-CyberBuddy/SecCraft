# Evidence Integrity and the Offline Fallback

Read `frontend/public/android-foundations/README.md` and `SHA256SUMS`. These are four authored text files, **not** an APK. Run `python3 scripts/verify-android-foundations.py` from the repository root, or compare local file hashes with `sha256sum -c SHA256SUMS` inside that folder. The verifier reads local files only; it never downloads an app or contacts a device. A matching hash establishes that your copy matches this repository's declared fixture. It does not establish that the code was compiled, installed, or executed.

## Worked evidence record

`Source: AndroidManifest.xml | SHA-256: read SHA256SUMS | observation: LinkActivity exported VIEW handler | interpretation: external input may enter | alternative: no matching installed handler/build exists | next test: inspect installed merged manifest on an authorized demo | status: NOT EXECUTED`.

## Independent exercise

Make the same record for `NoteStore.kt` and answer: if someone edits the stored hash file *and* the Kotlin file together, would a local checksum comparison by itself prove provenance? No: for stronger provenance, compare against a trusted repository revision or signed release. If you are offline without Android SDK, complete the static data-flow exercises and explicitly mark runtime testing unperformed. If you have the SDK but no provided APK, still do not present simulated `adb` output as measured evidence.

**Self-check:** hash = integrity relative to a known reference, not code behavior. A partial excerpt can omit call paths. Stronger claims require a specific built artifact, controlled environment, positive and negative runtime tests and independent review.

# Reverse Engineering and Release Surfaces: Independent Decision and Feedback

Do this **before** opening the Lab tab's model reasoning. Work offline from [the integrity-checked case pack](/android-cases/cases.json) ([hash](/android-cases/SHA256SUMS)). If you run the optional owned demo, follow its source README and record the result you actually observed. **Never report a device outcome you did not execute.**

## Independent task

List every missing link from external input to executed untrusted code. Propose a negative control with an invalid path and a positive test against a trusted built-in plugin on an authorized demo. Compare debug and release builds and inventory bundled libraries and dependency versions before declaring an SDK risk.

For the PluginLoader.kt (illustrative excerpt) excerpt, answer each question with `source file / relevant expression | observation | alternative | missing evidence | next authorized test`:

1. What caller-controlled path reaches the code-loading sink?
2. Which missing facts block a claim of code execution?
3. Why can a decompiler's absence of a class fail to prove an app has no dynamic code?

## Compare with model reasoning (after attempting)

1. The intent extra plugin flows into DexClassLoader; if reachable in a real installed build, this is a serious candidate. The file's origin/readability and execution of the loaded class are missing.
2. Check exported entry, actual path control, filesystem permissions, existence, signature/policy validation and whether a method is invoked. loadClass itself is not proof the payload ran.
3. Runtime-loaded code, reflection, native libraries, split APKs and obfuscation can hide paths from a simple decompile; inspect the exact built package and runtime evidence.

## Transfer to a real authorized assessment

No plugin file, compiled APK, JNI library or executed loader is supplied; do not claim code execution. The fixed excerpt is a design alternative, not a complete supply-chain audit. The source-only case does not prove arbitrary code execution. No dynamic loader or native library is shipped in the Notes Boundary APK source.

**Result boundaries:** The Lab tab records only self-review (0 graded XP); it cannot validate APK contents, device behavior, a screenshot, a bypass, or another person's app. Your quiz tests interpretation, not independent field proficiency. If the artifact is missing, say **NOT TESTED** rather than inventing a finding.

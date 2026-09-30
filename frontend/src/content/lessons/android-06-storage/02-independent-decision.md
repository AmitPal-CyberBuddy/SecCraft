# Storage, Backup and Data Leakage: Independent Decision and Feedback

Do this **before** opening the Lab tab's model reasoning. Work offline from [the integrity-checked case pack](/android-cases/cases.json) ([hash](/android-cases/SHA256SUMS)). If you run the optional owned demo, follow its source README and record the result you actually observed. **Never report a device outcome you did not execute.**

## Independent task

List every sink in the example, rank what can be inferred statically, then design an owned-device before/after-logout test with a fake token. Include a positive control that the app still works while signed in, negative control that old data cannot be reused, and screenshot/notification surface check.

For the SessionCache.kt (illustrative excerpt) excerpt, answer each question with `source file / relevant expression | observation | alternative | missing evidence | next authorized test`:

1. Which two separate sinks expose token material in the vulnerable excerpt?
2. Does placing a symmetric key in Keystore automatically prevent an authorized app process from using or disclosing a token?
3. What positive/negative checks would establish logout cleanup on an owned device?

## Compare with model reasoning (after attempting)

1. Plaintext preferences and Log.d are separate storage/logging surfaces. The excerpt alone does not prove another app can read app-private files on a current OS.
2. No. An app process that can request decryption can still mishandle the resulting value. Hardware backing and user authentication vary by device/key policy.
3. Use a synthetic test token, inspect accessible app storage and scoped logs before/after logout on an owned build, then verify session reuse fails. No real token or runtime capture is included.

## Transfer to a real authorized assessment

Requires a dedicated build and owned emulator to inspect device files/logs; this pack supports offline tracing only. secureStore is pseudocode, not a shipped secure-storage implementation. Android Keystore makes certain keys non-exportable under conditions, not app-process plaintext inaccessible. Key handling, user authentication policy and hardware backing vary. Do not call an imaginary secureStore secure.

**Result boundaries:** The Lab tab records only self-review (0 graded XP); it cannot validate APK contents, device behavior, a screenshot, a bypass, or another person's app. Your quiz tests interpretation, not independent field proficiency. If the artifact is missing, say **NOT TESTED** rather than inventing a finding.

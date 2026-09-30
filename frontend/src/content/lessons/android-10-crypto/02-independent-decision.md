# Cryptography and Device Identity: Independent Decision and Feedback

Do this **before** opening the Lab tab's model reasoning. Work offline from [the integrity-checked case pack](/android-cases/cases.json) ([hash](/android-cases/SHA256SUMS)). If you run the optional owned demo, follow its source README and record the result you actually observed. **Never report a device outcome you did not execute.**

## Independent task

Design a test with two synthetic plaintexts under one controlled key. Identify the invariant to check (distinct IV per encryption), what your test can infer if the provider rejects a repeat, and a negative control for different keys. Explain why Keystore and biometrics do not automatically enforce server authorization.

For the Vault.kt (illustrative excerpt) excerpt, answer each question with `source file / relevant expression | observation | alternative | missing evidence | next authorized test`:

1. What relationship makes repeating a GCM nonce dangerous?
2. Does Keystore-backed key material by itself repair IV reuse?
3. What evidence separates source-level misuse from ciphertext actually produced in a release build?

## Compare with model reasoning (after attempting)

1. Reusing a nonce with the same key in GCM destroys required uniqueness and can undermine confidentiality/integrity; the all-zero IV is a clear static misuse candidate.
2. No; non-exportability is separate from correct AEAD initialization and nonce management. Actual providers may reject IV reuse on encryption; verify behavior rather than claim exploitation from snippet alone.
3. Identify the built code path, key alias/lifecycle and generated ciphertext/IV pairs on an authorized build, with controlled test data. No key or ciphertext is shipped.

## Transfer to a real authorized assessment

No crypto app or device ciphertext is included; source-only test and a proposed owned-build validation. Both excerpts are illustrative and omit decrypt, encoding, storage and key generation. Never call a sample key stolen or infer a cryptographic attack from source alone. Provider behavior and actual build data are NOT TESTED.

**Result boundaries:** The Lab tab records only self-review (0 graded XP); it cannot validate APK contents, device behavior, a screenshot, a bypass, or another person's app. Your quiz tests interpretation, not independent field proficiency. If the artifact is missing, say **NOT TESTED** rather than inventing a finding.

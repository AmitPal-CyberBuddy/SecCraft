# Network Trust and Client Sessions: Independent Decision and Feedback

Do this **before** opening the Lab tab's model reasoning. Work offline from [the integrity-checked case pack](/android-cases/cases.json) ([hash](/android-cases/SHA256SUMS)). If you run the optional owned demo, follow its source README and record the result you actually observed. **Never report a device outcome you did not execute.**

## Independent task

Write a matrix for correct chain/name, wrong CA, wrong name and expired certificate on a future owned test server. Compare exact debug/release builds; record the connected host, OS/API level and selected config. After inspecting traffic, hand off backend authorization claims to the API path.

For the NetworkClient.kt (illustrative excerpt) excerpt, answer each question with `source file / relevant expression | observation | alternative | missing evidence | next authorized test`:

1. What trust boundary does an empty checkServerTrusted undermine?
2. Is interception after a pinning bypass by itself evidence of an exploitable app vulnerability?
3. How do you distinguish a debug-only CA from a release-build trust decision?

## Compare with model reasoning (after attempting)

1. Server certificate-chain acceptance is bypassed in this illustrative implementation, but hostname verification and whether this manager is installed are not shown; inspect the real built client.
2. No. A controlled proxy/instrumentation technique permits observation; separately test whether an unmodified release build accepts an untrusted server and what sensitive data it transmits.
3. Inspect merged network-security config and code for each exact build, compare controlled wrong-CA/host tests and record OS/API, certificate and client logs. No network session is provided.

## Transfer to a real authorized assessment

No endpoint, certificate chain, proxy session or APK supplied for this case; do not claim an observed TLS failure. The fixed code references a third-party HTTP client only as an example; it is not a compilable fixture or dependency in the Notes Boundary demo. Do not disable TLS verification on real targets or declare all traffic compromised from seeing a hook/flag. No endpoint or measured request is shipped for this module.

**Result boundaries:** The Lab tab records only self-review (0 graded XP); it cannot validate APK contents, device behavior, a screenshot, a bypass, or another person's app. Your quiz tests interpretation, not independent field proficiency. If the artifact is missing, say **NOT TESTED** rather than inventing a finding.

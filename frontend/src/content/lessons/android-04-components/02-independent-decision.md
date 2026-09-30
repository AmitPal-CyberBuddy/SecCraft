# Exported Components and IPC: Independent Decision and Feedback

Do this **before** opening the Lab tab's model reasoning. Work offline from [the integrity-checked case pack](/android-cases/cases.json) ([hash](/android-cases/SHA256SUMS)). If you run the optional owned demo, follow its source README and record the result you actually observed. **Never report a device outcome you did not execute.**

## Independent task

Compare a positive (Alice opens note 1), a negative (Alice requests Bob’s note 2) and an unknown ID in both demo flavors. On an owned emulator, record the built manifest, hash, account label and visible result. Without a build, trace the Java branches and mark execution NOT TESTED. The receiver case is source-only: inspect permission protection level and intent reachability before proposing a second-app call.

For the Receiver.java (illustrative excerpt) excerpt, answer each question with `source file / relevant expression | observation | alternative | missing evidence | next authorized test`:

1. Which manifest and source evidence identifies the external caller boundary?
2. Why is exported=true alone not a vulnerability, and what control is missing in this excerpt?
3. How would a second controlled app and two mock accounts falsify the disclosure hypothesis?

## Compare with model reasoning (after attempting)

1. An exported receiver with no guarding permission accepts external intents; intent extras supply untrusted id. The final merged manifest, permission definitions and actual call path still matter.
2. The sensitive sink is reply.send(body) after a raw lookup without ownership validation. The fixed variant restricts export and checks ownership, but its correctness still needs an installed build test.
3. Invoke a scope-approved receiver from an owned second app for own and other-account IDs; compare results and session labels. This snippet is not an installed receiver, so no delivery or leak is observed.

## Transfer to a real authorized assessment

Optional: build the separate Notes Boundary demo and compare VIEW Activity behavior; the receiver shown here is NOT part of that APK. No second-app receiver test, Binder trace or permission enforcement observation exists in this pack. Never equate exported=true with exploitation. The default Activity lifecycle can reset the mock account; a successful second-app delivery and observed sensitive sink require separate evidence.

**Result boundaries:** The Lab tab records only self-review (0 graded XP); it cannot validate APK contents, device behavior, a screenshot, a bypass, or another person's app. Your quiz tests interpretation, not independent field proficiency. If the artifact is missing, say **NOT TESTED** rather than inventing a finding.

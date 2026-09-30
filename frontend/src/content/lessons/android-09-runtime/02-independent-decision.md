# Runtime Observation and Instrumentation: Independent Decision and Feedback

Do this **before** opening the Lab tab's model reasoning. Work offline from [the integrity-checked case pack](/android-cases/cases.json) ([hash](/android-cases/SHA256SUMS)). If you run the optional owned demo, follow its source README and record the result you actually observed. **Never report a device outcome you did not execute.**

## Independent task

On an owned emulator, launch each flavor, record APK hash/API/account label and observe the positive and negative IDs. Optionally attach instrumentation to corroborate parameter and return values; compare against an uninstrumented run. If no runtime is available, produce a clearly labeled test plan and NOT EXECUTED rows.

For the InstrumentationPlan.txt (authored plan) excerpt, answer each question with `source file / relevant expression | observation | alternative | missing evidence | next authorized test`:

1. What does a hook firing prove, and what does it not prove about account impact?
2. Why compare passive UI observations with an instrumented run?
3. How can an app restart or a debug build invalidate a claimed comparison?

## Compare with model reasoning (after attempting)

1. A hook proves execution under that instrumented environment, not another user's actual data exposure or production exploitability. Corroborate displayed behavior and ownership on controlled mock records.
2. Instrumentation can alter timing, checks and trust. Pair hook observations with unmodified build behavior and repeatable positive/negative controls.
3. The Notes Boundary mock user resets to Alice on a new Activity instance; debug builds differ from release. Observe the account label and record artifact identity for every attempt.

## Transfer to a real authorized assessment

Owned-workstation extension uses the Notes Boundary source; no Frida scripts or measured traces ship here. Tools are optional; ordinary UI + ADB suffice for the mock lookup case. An instrumentation transcript cannot be generated or graded in a browser-only course without an independently run device and trusted test harness. Emulators, debugging, instrumentation, lifecycle and anti-tamper can change behavior. Hook success is not a professional exploit or production account leak. No Frida trace is provided or machine graded.

**Result boundaries:** The Lab tab records only self-review (0 graded XP); it cannot validate APK contents, device behavior, a screenshot, a bypass, or another person's app. Your quiz tests interpretation, not independent field proficiency. If the artifact is missing, say **NOT TESTED** rather than inventing a finding.

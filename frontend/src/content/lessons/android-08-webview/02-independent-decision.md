# WebView and Native Bridge Boundaries: Independent Decision and Feedback

Do this **before** opening the Lab tab's model reasoning. Work offline from [the integrity-checked case pack](/android-cases/cases.json) ([hash](/android-cases/SHA256SUMS)). If you run the optional owned demo, follow its source README and record the result you actually observed. **Never report a device outcome you did not execute.**

## Independent task

Trace untrusted URL → loaded origin → bridge method → privileged action, marking missing links. Propose a benign controlled page and a negative origin for an owned demo build. Explain how you would inspect the final origin after redirects and whether an annotated bridge method was actually called.

For the BrowserActivity.kt (illustrative excerpt) excerpt, answer each question with `source file / relevant expression | observation | alternative | missing evidence | next authorized test`:

1. Identify the externally controlled source and privileged sink.
2. Why is restricting the first URL insufficient if redirects or subresources can execute bridge-calling JavaScript?
3. Which device observation would distinguish arbitrary URL loading from actual bridge-method impact?

## Compare with model reasoning (after attempting)

1. The intent extra supplies url; loading it into a JavaScript-enabled WebView with a native bridge is a high-priority review path. The Bridge implementation is absent: no sensitive action is established.
2. Navigation policy must be enforced across redirects and content origins; bridge exposure and origin assumptions vary with platform/API. Check bridge method annotations and loaded-content model.
3. On a permitted build, use benign controlled content, track final origin and bridge invocation, and document whether any sensitive action occurred. No WebView device result is bundled.

## Transfer to a real authorized assessment

The Notes Boundary app has no WebView; this is source-only and needs a distinct build for dynamic validation. No Bridge method bodies, WebView client, redirect chain or browser trace is supplied. A URL-filter snippet does not ensure safety across all navigation and API levels. The buildable Notes Boundary project has no WebView; do not claim its APK validates this case.

**Result boundaries:** The Lab tab records only self-review (0 graded XP); it cannot validate APK contents, device behavior, a screenshot, a bypass, or another person's app. Your quiz tests interpretation, not independent field proficiency. If the artifact is missing, say **NOT TESTED** rather than inventing a finding.

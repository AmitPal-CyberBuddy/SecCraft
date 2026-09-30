# Deep Links and App Links: Independent Decision and Feedback

Do this **before** opening the Lab tab's model reasoning. Work offline from [the integrity-checked case pack](/android-cases/cases.json) ([hash](/android-cases/SHA256SUMS)). If you run the optional owned demo, follow its source README and record the result you actually observed. **Never report a device outcome you did not execute.**

## Independent task

Make a table of three hosts (trusted.example, attackertrusted.example, trusted.example.attacker.test) and predict the vulnerable and fixed branch for each. A proposed device test needs the exact package/version, resolver state and a controlled destination. For auth redirects, verify a state/nonce and caller trust where applicable; no OAuth exchange is included.

For the LinkRouter.kt (illustrative excerpt) excerpt, answer each question with `source file / relevant expression | observation | alternative | missing evidence | next authorized test`:

1. Which crafted hostname passes the suffix check without being trusted.example?
2. What is separate from the URI parser check when claiming an Android App Link is verified?
3. What evidence would show an unsafe action actually occurred on a device?

## Compare with model reasoning (after attempting)

1. attackertrusted.example passes the suffix comparison; so does a legitimate subdomain if that is separately authorized. Exact host matching and explicit subdomain policy are distinct decisions.
2. Android HTTPS App Link verification requires the installed manifest, domain association and device state; a URI host string or a custom scheme alone does not prove verified ownership.
3. Use an authorized test device, installed build/hash, a competing handler where relevant, controlled inputs and evidence of the privileged sink actually executing. A source trace alone is a hypothesis.

## Transfer to a real authorized assessment

Optional owned build: test Notes Boundary custom-scheme routing. It demonstrates URI entry, not HTTPS App Link verification or this fictional LinkRouter. The snippet has no app association JSON, installed domain verification result or privileged sink implementation. A string comparison alone is not proof of a verified App Link or action execution. Query and fragment parsing, redirects and version-specific resolver state matter; do not invent domain ownership.

**Result boundaries:** The Lab tab records only self-review (0 graded XP); it cannot validate APK contents, device behavior, a screenshot, a bypass, or another person's app. Your quiz tests interpretation, not independent field proficiency. If the artifact is missing, say **NOT TESTED** rather than inventing a finding.

# Intent Filters, Exports, and Version-Aware Claims

A manifest filter *selects possible handlers*; it does not authenticate the caller or validate query parameters. A custom URI scheme such as `training://note?id=7` is not an HTTPS Android App Link and has no domain verification guarantee. Another app may register the same custom scheme. `LinkActivity` accepts an `id` and looks it up: inspect its callee before asserting that a cross-account note is visible. Explicit `android:exported` values in the sample avoid relying on version-dependent defaults; real analysis must record Android OS version, target SDK and final merged manifest because platform requirements and behavior evolve.

## Worked example

Hypothesis: an external app may send a VIEW intent with arbitrary `id`. Evidence: the filter and `getQueryParameter("id")`. **Not shown:** whether it reaches an unauthorized note. Follow `noteStore.lookup` into `NoteStore.kt`: it returns `null` if the note owner differs from the session user. A static path is therefore constrained in this excerpt. This does not prove *every* installed path enforces ownership.

## Independent exercise

Compare `training://note?id=mine`, `training://note?id=someone-else` and a missing `id`. Predict which lines execute in the supplied excerpts and where each would stop. What two separate observations would you need to prove an issue in an installed app? Suggested answer: verify the *installed* intent resolution and observe a note belonging to a different controlled account after a scoped launch, ruling out cached/shared-account data. Without the runnable app, label both **NOT EXECUTED**.

**Self-check:** `android:exported="true"` for `LinkActivity` supports a reachable-entry-point hypothesis. It does not establish that the URI is verified, that an intent was delivered on a device, or that data escaped. A concrete test must include the built APK's hash/version and an owned device/test-account pair. See [Android intent security guidance](https://developer.android.com/privacy-and-security/security-tips#intents) and [OWASP MASTG](https://mas.owasp.org/MASTG/).

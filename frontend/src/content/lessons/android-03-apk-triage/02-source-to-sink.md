# Source to Sink: An Independent Static Decision

**Do this before reading the self-check.** The evidence pack in `frontend/public/android-foundations/` contains a manifest, an entry-point excerpt and a data-access excerpt. Verify the hashes first. This is a static exercise only. State what evidence an installed-app test would require, rather than fabricating dynamic results.

## Your case

A teammate claims: “An exported deep link takes a note ID. Anyone can read another user's note.” Trace every step with the specific fixture filename and code expression. Build `source → transformation → lookup → guard → output` and say which step is established, merely hypothetical, or missing. Invent two test IDs *for controlled accounts* as a proposed future test, not as a production command. Design one negative control (a different account's ID should be rejected) and one positive control (your own ID should resolve) for an authorized build. If the negative control fails, what further evidence distinguishes a shared account from an actual access-control flaw?

## Feedback / model reasoning

`intent?.data?.getQueryParameter("id")` is attacker-controlled input at an exported VIEW handler. `noteStore.lookup(id)` is the call; `db.findById(id)` retrieves a candidate; the supplied `candidate.ownerId == session.userId` check returns `null` for a different owner. `showNote(note)` is named but its implementation and what it does for `null` are **not supplied**. Therefore an interesting *hypothesis* exists, but the teammate's disclosure conclusion is not supported by these excerpts. A static guard does not prove every code path is protected, and an incomplete source pack does not prove a deployed release build. A real dynamic test needs explicit scope, installed build hash/version, two distinct test accounts with known note ownership, a verified invocation, observed app behavior and an alternate-explanation check.

For interview practice, explain the difference between intent resolution, a data lookup, an authorization decision, and a visible outcome without naming a tool. If you cannot articulate what would falsify your claim, continue investigating rather than escalating the severity.

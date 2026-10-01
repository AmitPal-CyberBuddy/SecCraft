# Look-Alike Infrastructure: Ownership, Compatibility and Client Choice

> **Available now: offline packet, owner-record and profile reasoning.** No rogue AP is launched and no real client is induced to connect. Hosted execution is unavailable. Client selection, credential capture and application access remain **NOT TESTED**.

## Start with an observation, not a verdict

Use the [WF-TRUST-04 ZIP](/wireless-practice/WF-TRUST-04.zip), [scope](/wireless-practice/WF-TRUST-04/scope.md), [look-alike capture](/wireless-practice/WF-TRUST-04/rogue-ap.pcapng), [decoded view](/wireless-practice/WF-TRUST-04/rogue-ap.json) and [fictional owner inventory](/wireless-practice/WF-TRUST-04/owner-inventory.csv). The filename is not a finding.

Compare frames 1–2: same SSID, different BSSID, channel, advertised authentication and beacon profile. Record those fields before checking O1/O2. The fictional owner record lists the second BSS as an approved isolated training scene. How does that change “unknown infrastructure” versus “malicious rogue”? What remains uncertain about an observed transmitter even with that administrative record?

A radio observation does not establish a switch connection, asset owner or corporate foothold. Stronger simulated signal, a locally administered address and a matching name are not ownership proofs. A stale inventory can omit a legitimate deployment; an owner entry can be spoofed over the air. Request current authorization and wired-side correlation where relevant, rather than converting a fingerprint into attribution.

## Compatibility is not client selection

Review the [four authored client cases](/wireless-practice/WF-TRUST-04/client-cases.json). They are hypotheses, not actual client profile exports.

1. **C1:** the client expects Enterprise, while the candidate offers PSK. Does the same SSID erase the security-mode mismatch? Do not import certificate-testing work from the next phase into a claim this file cannot support.
2. **C2:** an open profile has autojoin disabled. Does a directed probe prove consent to join or override that policy?
3. **C3:** a Personal profile matches, but the candidate lacks the correct PSK. Can a name and signal advantage alone complete a valid key exchange?
4. **C4:** the hypothetical candidate knows the correct shared credential. What selection, profile, user-action and endpoint evidence is still missing before you can say the client actually connected and used a service?

A directed probe is an observed request, not a complete saved-network list, permanent device identity or guaranteed autojoin behavior. Modern operating systems vary by version, profile settings, randomized addressing and selection policy. Karma/MANA-style claims must specify those conditions; a tool name or probe response does not prove applicability. Do not promise universal automatic credential capture.

## Recognize what the constructed sequence encodes

Frames 7–10 encode authentication/association, 11–14 a PSK exchange, 15–18 DHCP, and 19–20 illustrative HTTP. These are authored bytes, not a collected client decision log. The fixture's post-handshake plaintext is a teaching simplification, not evidence of a protected AP accepting plaintext.

The earlier deauth frames do not prove they caused the later sequence. Do not merge this file with deauth.pcapng or assume their repeated identifiers describe one client session. A PSK verifier supports a bounded candidate check where applicable; it does not expose the password merely because the name was cloned.

## Design controls that could falsify the claim

Write a future test matrix with a legitimate baseline, a compatible permitted profile, an incompatible security-mode case and a profile refusing autojoin or fallback. Pin client/AP versions and use only isolated owned equipment and synthetic credentials. Collect client decision logs, AP authentication outcomes and an allowlisted application check. Stop on unintended clients, real credential entry or impact outside the agreed window; remove temporary profiles and restore configuration afterwards.

Do not activate that plan here. State expected outcomes as hypotheses and allow secure rejection or insufficient evidence. Supply a scoped inventory, C1–C4 decisions and a missing-evidence request in the [worksheet](/wireless-practice/WF-TRUST-04/worksheet.md). Compare the [public review guide](/wireless-practice/WF-TRUST-04/review-guide.md) only after drafting. The exercise assesses reasoning by self-review, not live attack performance.

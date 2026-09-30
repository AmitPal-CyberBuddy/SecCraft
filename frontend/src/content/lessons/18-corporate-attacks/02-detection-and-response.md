# Detection, Containment and Response

## 1. What the defender sees (and what they miss)

| Link | Detection opportunity | Blind spot |
| --- | --- | --- |
| Rogue beaconing | WIDS sees a duplicate SSID/BSSID not in the authorised list | if WIDS has no baseline or the twin uses the same BSSID |
| Deauth flood | rate of unprotected deauth frames per BSSID | SA Query is conditional; effect needs client/AP state |
| Client association to a rogue | client seen with an unknown BSSID (AP-side telemetry, NAC) | client-side only; the wired side often cannot see it |
| PEAP credential capture | duplicate/hostile EAP authenticator, invalid certificate on the wire | encrypted inner exchange looks normal |
| Credential replay | authentication anomalies on VPN/SSO/other SSO-reachable systems | use of captured credentials in the same WLAN |
| Cross-segment movement | firewall/ACL deny logs (if the path is denied) | permitted paths are invisible by design |

## 2. Containment playbook

```
1. Verify ownership and wired correlation with the network owner; contain a confirmed unauthorized port only with change authority.
2. If affected clients are established, coordinate targeted re-authentication/session invalidation with the owner.
3. If authorized test evidence establishes credential exposure, rotate affected accounts and hunt for reuse; do not infer exposure from this synthetic fixture.
4. If separate RADIUS evidence shows secret exposure, rotate affected per-NAS secrets and confirm integrity enforcement with version-specific guidance.
5. Enforce or repair the missing control (PMF required, certificate validation, ACL, isolation).
6. Add the detection that was missing, with an owner and a test.
```

## 3. Writing the "defense" half of a finding

A finding is not finished until it tells the defender what to do — and how to know the fix worked:

* **Control** (what to change) — e.g. enforce `domain_suffix_match` in the 802.1X profile.
* **Deployment path** (how it reaches every client) — MDM/GPO-managed profile, not user-edit.
* **Verification** (how the defender confirms it) — repeat the controlled rogue-authenticator test and inspect client logs for rejection of the wrong server identity; absence of an inner exchange alone is insufficient.
* **Residual risk** (what remains) — legacy devices without PMF, EAP method gaps, credential reuse rules.

## 4. Reviewer exercise: break the imagined chain

Build a `link | observed fixture frames | missing evidence | safe next test | owner` table for
(1) the look-alike beacon, (2) client association, (3) direct MS-CHAPv2 example and (4)
the cross-subnet ICMP pair in `corporate-attacks.pcapng`. A complete chain would require
coherent client/AP/AAA logs and network enforcement evidence that are **not** bundled.
Independently review the table with another learner or supervisor: if a link depends on
invented PEAP, a guessed switch port or a real credential, remove that claim. Then write
an incident triage note that distinguishes confirmed observations, working hypotheses and
unperformed containment. No synthetic log is a substitute for a live incident record.

## 5. Decision practice

Write the containment steps for the `corporate-attacks.pcapng` chain in the order you would execute them if
you were the client's incident responder — and mark which steps are *immediate* (hours) versus *structural*
(sprint/quarter).

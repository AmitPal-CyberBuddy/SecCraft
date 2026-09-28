# Detection, Containment and Response

## 1. What the defender sees (and what they miss)

| Link | Detection opportunity | Blind spot |
| --- | --- | --- |
| Rogue beaconing | WIDS sees a duplicate SSID/BSSID not in the authorised list | if WIDS has no baseline or the twin uses the same BSSID |
| Deauth flood | rate of unprotected deauth frames per BSSID | PMF-protected clients generate SA Query, not observable effect |
| Client association to a rogue | client seen with an unknown BSSID (AP-side telemetry, NAC) | client-side only; the wired side often cannot see it |
| PEAP credential capture | duplicate/hostile EAP authenticator, invalid certificate on the wire | encrypted inner exchange looks normal |
| Credential replay | authentication anomalies on VPN/SSO/other SSO-reachable systems | use of captured credentials in the same WLAN |
| Cross-segment movement | firewall/ACL deny logs (if the path is denied) | permitted paths are invisible by design |

## 2. Containment playbook

```
1. Identify the rogue BSSID / host (RF triangulation + wired correlation) and disable the switch port.
2. Force re-authentication of affected clients; invalidate cached sessions.
3. Assume the captured credential is compromised: rotate it and hunt for its use elsewhere.
4. Rotate the RADIUS shared secret if it may have been exposed; verify require_message_authenticator.
5. Enforce or repair the missing control (PMF required, certificate validation, ACL, isolation).
6. Add the detection that was missing, with an owner and a test.
```

## 3. Writing the "defense" half of a finding

A finding is not finished until it tells the defender what to do — and how to know the fix worked:

* **Control** (what to change) — e.g. enforce `domain_suffix_match` in the 802.1X profile.
* **Deployment path** (how it reaches every client) — MDM/GPO-managed profile, not user-edit.
* **Verification** (how the defender confirms it) — repeat the rogue-authenticator test and expect a TLS
  alert; check that no MS-CHAPv2 exchange appears.
* **Residual risk** (what remains) — legacy devices without PMF, EAP method gaps, credential reuse rules.

## 4. Decision practice

Write the containment steps for the `corporate-attacks.pcapng` chain in the order you would execute them if
you were the client's incident responder — and mark which steps are *immediate* (hours) versus *structural*
(sprint/quarter).

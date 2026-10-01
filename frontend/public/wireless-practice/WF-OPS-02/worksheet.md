# Investigation worksheet — complete before self-review

## 1. Readiness
For each capability profile: observed fact | hypothesis | missing evidence | next safe diagnostic | stop condition. Separate virtual network connectivity, USB attachment, driver/firmware, regulatory permission, mode support, reception and injection. Finish with `RF reception: NOT TESTED; injection: NOT TESTED` for this offline exercise.

## 2. Inventory and collection plan
Record artifact filename/hash and tool/version (or “supplied JSON review, no capture tool run”). For each in-scope AP: owner alias | observed BSSID | observed SSID | channel | cipher/AKM | PMF | evidence frames | ownership source | uncertainty. Record the hidden-name change as a pair of observations, not a security fix. Minimize incidental identifiers.

Add CLIENT-A's probe/authentication/association evidence and distinguish it from proof of a successful key exchange. Explain what the other observed address's locally administered bit does NOT prove.

Propose a future passive collection matrix: authorized channel | fixed/hopping strategy | duration agreed with owner | receiver/position | expected evidence | missed-traffic risks | stop/retention rule. There is no universally adequate dwell duration. Do not execute that plan in this case.

## 3. Evidence and timeline
For traffic-analysis only: source file/hash | frame/event | original time | normalized time | uncertainty | observation | supported claim | alternative explanation. Include association response, EAPOL sequence, one data frame with its actual Protected-bit value and L2. State clock assumptions and whether any event ordering is indeterminate.

Write one defensible conclusion, reject an overclaim and request one missing evidence item. Do not treat a hash, “connected” label, Protected bit or browser completion as proof of a successful attack or application access.

## 4. Handoff and retest
Package your worksheet, commands/filters, tool versions, original hashes, derived-file hashes, assumptions and data-minimization decisions. Keep originals unchanged; label redacted copies and link them to source frame numbers. Record “NOT TESTED — live reception, injection, endpoint effect, application reachability”. Propose a bounded authorized retest with measurable expected observations; do not mark it executed.

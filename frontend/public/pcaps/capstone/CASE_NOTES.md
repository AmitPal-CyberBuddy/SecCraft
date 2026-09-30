# Case C-20: staged wireless assessment dossier

**Fictional training case, independent of Northwind and of the earlier methodology capture.** These bytes are generated, not collected from a radio. All names, addresses, values and times are invented training data. Nothing in this dossier proves a production AP, a live client, applied ACLs or a complete professional retest. Read this brief **before** opening the captures; keep the answer key in the lesson for later self-review.

## Scope and custody

A hypothetical client authorizes *offline interpretation* of `capstone-baseline.pcapng` and `capstone-retest.pcapng` and a written retest plan. No active RF, connection, password guesses against real devices, or scans of third parties. Report only the fictional case; cite each file's current SHA-256 from `frontend/public/pcaps/MANIFEST.md`, frame numbers and filters. The retest file is a staged **post-change advertisement**, not a verified live client outcome. The owner approves a separate client test later, but provides no client or logs here.

## Partial asset inventory (fictional document, not radio proof)

| Asset | BSSID | Owner statement | Planned policy |
| --- | --- | --- | --- |
| OPS-A | `02:aa:10:00:00:01` | managed training AP, channel 6 | formerly PSK, change request CR-20 to SAE-only with PMF required |
| CORP-A | `02:aa:10:00:00:02` | managed training AP, channel 36 | 802.1X, PMF required |
| Unknown | `02:aa:10:00:00:09` | **not listed**; inventory incomplete | no verified ownership or switch-port mapping |

The locally administered bit is set on **all three** training BSSIDs. It is not an indicator of rogue ownership. Identical SSIDs do not establish common administration.

## Change request CR-20 (staged paperwork, not independently validated configuration)

The operations team says it intended to migrate OPS-A from PSK to SAE-only/PMF-required and to retire the old passphrase. A configuration excerpt supplied as a *fictional change plan*, not a machine export:

```text
# BEFORE target: OPS-A / CASE-OPS
wpa_key_mgmt=WPA-PSK
ieee80211w=1
# AFTER intended: OPS-A / CASE-OPS
wpa_key_mgmt=SAE
ieee80211w=2
```

The post-change beacon is independent evidence that **the named BSSID advertises** the intended AKM and PMF policy in this simulated file. It does not show client negotiation, enforced policy on every AP, retirement of the old passphrase, or whether the unlisted same-SSID BSS is operated by the client.

## Deliverables

1. Inventory observed BSSIDs by file and frame. Reconcile each to this **partial** inventory. Identify one hypothesis that cannot become a finding yet.
2. Verify the baseline M2 MIC *offline* with the deliberately published lab candidate `password123` using the repository artifact verifier. Distinguish a known lab value from a real password audit. Do not assert that the same-name unknown BSS uses that password.
3. Compare the same owned BSSID across files: what advertised field changed, what remained untested and what extra client/AP evidence would close the retest? If a PSK beacon remains on the same SSID, does that invalidate the change on OPS-A, prove a rogue, or require inventory follow-up?
4. Produce `claim | source/hash/frame | interpretation | alternative | impact assumption | next authorized test | retest status`. At least one record should conclude **insufficient evidence**, and none may claim live RF or production segmentation.

Rubric for a reviewer: reject any submission that conflates the two case files with Northwind, equates a beacon with an accepted association, claims an unlisted BSSID is malicious without wired/owner correlation, claims retest complete without a client test, or presents published fixture credentials as an actual client secret. A reviewer should ask for original raw captures, owner inventory and client/AP logs before signing off field proficiency.

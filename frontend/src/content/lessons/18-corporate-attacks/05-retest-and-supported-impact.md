# Retest the Same Boundary and Report Only Supported Impact

> **Available now: offline comparison and retest planning.** The baseline and hardened files are authored policy models, not collected before/after measurements. No live configuration was changed. Hosted network execution is unavailable; real remediation effectiveness remains **NOT TESTED**.

## Preserve the comparison contract

Use the [WF-BOUND-06 ZIP](/wireless-practice/WF-BOUND-06.zip), [scope](/wireless-practice/WF-BOUND-06/scope.md), [hardened policy](/wireless-practice/WF-BOUND-06/hardened-policy.json) and [hardened model observations](/wireless-practice/WF-BOUND-06/hardened-observations.json). Compare them against the same flow requests and intended policy used in the previous lesson.

A defensible real retest preserves or explains changes to client identity, effective profile/session, source interface/zone, destination/service, protocol/port, direction, route and enforcement point. It records the specific configuration change, target health, clocks and observation window. An expired session or newly unhealthy service can look like a successful deny without validating the proposed fix.

The model changes the broad guest rule, not the clients or intended service matrix. Which deviations disappear? Which legitimate paths remain consistent? Which uncertainty survives? Do not call the existence of a file named “hardened” evidence that anything was deployed.

## Separate the reported result from its explanation

| Result | Bounded statement | Unsupported extension |
| --- | --- | --- |
| Guest request reached an approved demo API in a complete authored record despite intended deny | a model policy deviation for the specified tuple | live corporate access, sensitive data exposure or domain administration |
| Model denies the guest path after the rule revision | model consistency under the revised first-match rules | real firewall enforcement or universal isolation |
| Corporate client cannot use management in complete model records | intended model restriction retained | every management interface or protocol is protected |
| No response without route/health confirmation | inconclusive | proof that the ACL blocked traffic |
| ICMP request/reply in a generated capture | that fixture encodes an ICMP exchange | an application accepted credentials or a production network was bypassed |

An application response is also not blanket authorization. What operation and identity were tested? Were sensitive objects or actions intentionally excluded? A login page, HTTP 200 or TCP handshake cannot substitute for evidence about an authorized business operation. Do not escalate a test solely to make the finding sound more severe.

## Propose a future bounded retest

Write a plan; do not execute it here:

1. Confirm owner approval for the exact source/service/direction and request/time budget. Use synthetic identities and an isolated service, not real user tokens.
2. Establish endpoint health and intended allowed access before testing deny paths. Verify actual client/AP/switch placement and effective routes.
3. Collect relevant firewall policy/version, decision logs and client/server observations with correlated request IDs and clock uncertainty. Check that the traffic traverses the intended control.
4. Repeat only the approved cases after the specific change. Preserve positive controls, record intended denials and keep unresolved observations inconclusive.
5. Stop on unlisted traffic, unintended impact, service instability or the budget limit. Restore approved configuration, remove temporary sessions/accounts and confirm ordinary service continuity.

State separately what a later isolated worker would need: controlled endpoints, enforced egress scope, resource/time limits, reset, cleanup and independent review. Neither this policy calculator nor the prior certificate-file exercise establishes that execution platform.

## Deliver a professional handoff

In the [worksheet](/wireless-practice/WF-BOUND-06/worksheet.md), include one source-cited model deviation, one consistent control, one inconclusive result, a rejected overclaim and the retest proposal. Attach original/derived hashes, flow/rule/observation IDs, intended policy, collection limits, change owner and cleanup criteria. Keep the independent packet scene distinct from model observations; do not fabricate a complete attack timeline.

Review with the [public guide](/wireless-practice/WF-BOUND-06/review-guide.md). Model reproducibility can be checked now, but live placement, forwarding, application authorization and business impact remain **NOT TESTED**. Instructor review and real execution assessment are separate from browser-local completion.

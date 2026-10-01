# Correlate AAA Decisions With Applied Network Policy

> **Available now: packet and model review.** The supplied RADIUS transactions are generated files, not a running AAA service. Actual client authentication, VLAN placement and application enforcement remain **NOT TESTED**. No hosted execution is supplied.

## Define the chain of evidence

Use the [WF-ENT-05 ZIP](/wireless-practice/WF-ENT-05.zip), [scope](/wireless-practice/WF-ENT-05/scope.md), [RADIUS capture](/wireless-practice/WF-ENT-05/radius.pcapng), [decoded RADIUS view](/wireless-practice/WF-ENT-05/radius.json) and [worksheet](/wireless-practice/WF-ENT-05/worksheet.md). The Enterprise/EAP captures are separate scenes; repeated identities and clocks do not make them one session.

Separate these questions:

1. Did an intended client validate the correct EAP server?
2. Did AAA authenticate/authorize the intended identity under the right policy?
3. Did the authenticator/controller apply the returned policy to that session?
4. Did the switch/firewall enforce the intended path, and did the approved application respond?

A missing log at one stage cannot be filled with an Access-Accept at another. A client certificate rejection is not a wrong-password result, and a successful login is not proof of every downstream rule.

## Pair requests and responses before checking integrity

For each RADIUS transaction, record frame, code, identifier, source/destination/port, outstanding-request context and request authenticator. The eight-bit RADIUS ID can be reused; it is not the EAP ID, a user identity or a globally unique session ID. Use session identifiers and clock uncertainty from actual infrastructure when available.

The corrected fixture contains three Access request/reply pairs, an Accounting pair and one deliberately invalid-secret request. Find them yourself before using the rubric. Identify which reply contains VLAN 100 and why EAP-Success has no Type field. Direct MS-CHAPv2 values remain illustrative; no complete PEAP tunnel, interoperable EAP peer or real MSK transport is supplied.

For local inspection only:

```bash
tshark -r radius.pcapng -Y radius -T fields \
  -e frame.number -e ip.src -e udp.srcport -e ip.dst -e udp.dstport \
  -e radius.code -e radius.id
```

Use decoded JSON instead if tools are unavailable and record that method. Do not submit requests to addresses found in the file.

## Verify the appropriate authenticator

For an Access-Request, zero the Message-Authenticator value and compute HMAC-MD5 under the disclosed lab secret while retaining the request's authenticator. For an EAP-bearing response, the Message-Authenticator calculation uses the **matching request authenticator** in the header; then the final Response Authenticator includes the completed attributes. Substituting zero or another request's nonce can produce the wrong result even with the correct secret.

Accounting-Request has its own MD5 construction over the header with zero authenticator, attributes and secret. It is not an Access-Request sent to port 1813. The repository's raw verifier checks all four reply pairings and authenticator values, rather than merely detecting that a reply exists. Deterministic fixture nonces and the public secret are not examples of production randomness or credential policy.

Valid integrity establishes consistency under the shared-secret relationship, not unique physical sender identity, a genuine live authentication decision or applied VLAN. The intentionally wrong-secret request demonstrates a mismatch; it does not identify a real rogue NAS or reveal a production credential.

## Review an independent policy model

Open [S1–S4 model records](/wireless-practice/WF-ENT-05/policy-model.json). These are authored, not collected logs:

- S1 correlates a requested and applied policy with limited allowed/denied service observations.
- S2 stops at client-side certificate rejection, before inner credential evaluation.
- S3 has a requested VLAN and a different applied VLAN, with application impact untested.
- S4 has an Access-Accept but missing placement/health/route evidence.

Classify each without turning model consistency into universal security. For S3, name the policy boundary to investigate; do not invent successful internal access. For S4, explain why no response does not verify enforcement.

## Request a real vertical-slice retest

Propose one bounded authorized session with client/profile/certificate evidence, AP/BSSID identity, NAS/AAA transaction correlation, controller/switch policy and explicit service-health controls. Use synthetic identities, allowlisted services, synchronized clocks, a secure-rejection case, time/attempt limits and cleanup. Record actual results only if such an environment is later supplied.

Deliver source-cited packet pairs, model classifications and the unperformed retest plan. Use the [public review guide](/wireless-practice/WF-ENT-05/review-guide.md) after drafting. Hosted execution and independent performance grading remain unavailable.

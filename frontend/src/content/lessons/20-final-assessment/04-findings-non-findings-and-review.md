# Defend Findings, Non-findings and Uncertainty

> **Available now: source-cited review practice.** WF-REVIEW-07 uses public synthetic evidence. Real client acceptance, enforced policy and application access remain **NOT TESTED**. A public rubric is not an authoritative grader.

## Use a claim ledger

Continue your [worksheet](/wireless-practice/WF-REVIEW-07/worksheet.md) from the [WF-REVIEW-07 ZIP](/wireless-practice/WF-REVIEW-07.zip). Separate three statuses:

| Status | Meaning | Example of its boundary |
| --- | --- | --- |
| SUPPORTED | The supplied evidence supports this narrowly worded claim | a named BSSID advertises particular fields in a specified frame |
| INSUFFICIENT_EVIDENCE | Evidence does not resolve a hypothesis | an unlisted same-name BSSID's ownership remains unknown |
| NOT_TESTED | The required test was not performed | actual SAE negotiation or application access |

SUPPORTED does not mean “vulnerability confirmed”. It can describe a policy match or a narrow non-finding. Do not turn an unknown into a negative result: “we did not test access” is not “access was blocked”.

## Treat a no-finding as a legitimate result

Compare CORP-A's advertised AKM/PMF in the two files against its stated planned policy. If these fields match, report no advertised-policy deviation **in the supplied frames**. Do not extend that result to certificate validation, endpoint trust, successful authentication or segmentation. Those checks need different evidence.

For OPS-A, compare the same owned BSSID before and after. Keep the advertised-policy change separate from installed keys, accepted clients and retirement of the old passphrase. The remaining same-name BSS is an inventory follow-up, not automatic proof that CR-20 failed or a rogue was found.

## Risk needs context, not invented severity

For every risk hypothesis, identify the affected asset, actual exposure, prerequisite, demonstrated consequence and assumptions. Here there is no production business context or measured client impact. Request that context rather than manufacturing a numerical severity. Prioritize owner inventory reconciliation and a controlled client retest because they resolve specific uncertainties, not because every observation must become a high-risk finding.

## Review without pretending to certify

After saving your attempt, consult the [public review guide](/wireless-practice/WF-REVIEW-07/review-guide.md) and [reference claim set](/wireless-practice/WF-REVIEW-07/reference-review.json). Apply MET / REVISE / NOT ASSESSED per criterion, with citations. Unsupported live outcomes or scope violations require revision regardless of other strengths; do not average them away into a passing score.

Ask a peer to challenge one alternative explanation and reproduce one citation. If no reviewer is available, record SELF-REVIEW, not independent approval. Preserve changes across retries and explain whether a new source or corrected reasoning changed the result. No unseen variant equivalence, instructor pilot or trusted scoring has been established here.

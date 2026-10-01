# Authentication decision worksheet

Before opening review-guide.md, record source hashes, tool/version (or supplied-results review), scope and unperformed tests.

## A. Guided candidate check
Run `python3 audit.py guided` from the extracted case. Explain why SSID, AP/station addresses and PMKID must belong to the same record. Identify the matching candidate line and the verifier mechanism. Record exactly three tested candidates, not an invented exhaustive search or benchmark.

## B. Independent decision
Run `python3 audit.py independent` once. For each record, write: observed outcome | candidate coverage | supported claim | rejected overclaim | next owner-approved action. Do not expand the candidate list. A matching password does not establish live association or internal access; non-recovery does not establish strength. Compare changing just the SSID in your reasoning: why would it change the PBKDF2 output? No real target inputs are required.

## C. WPS applicability and budget
First inspect the two WPS beacon observations. Separate advertised methods, setup-lock state and selected-registrar state from actual reachability and exploitable PIN behavior. Then analyze the separate hypothetical W2 log. When must the operator stop? Can a planned 900-second cooldown fit within the 600-second authorization? Does the record prove lockout duration, permanence or universal safety? Explain why the conditional 10^4 + 10^3 search space is not a guaranteed runtime or permission to keep trying.

## D. Modern policy comparison
Cite the RSNE of each WPA3 capture. Separate advertised AKMs, a selected PSK exchange, PMF capability/requirement and absent live-client evidence. Does the transition capture prove a forced downgrade? Can its PSK verifier audit SAE directly? What additional configuration evidence would establish credential reuse across modes? Keep the two files separate rather than treating them as a performed remediation/retest.

## E. Recommendation and validation request
Write one supported finding or non-finding for each lane, with uncertainty and no invented severity. Specify owner-approved remediation and a measurable retest proposal. Include compatibility/negative controls and stop/restore conditions. Physical association, WPS execution, SAE client acceptance and application access remain NOT TESTED. Compare the public review guide only after drafting; local completion is participation, not trusted grading.

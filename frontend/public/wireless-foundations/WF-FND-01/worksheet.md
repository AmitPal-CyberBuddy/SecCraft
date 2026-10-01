# WF-FND-01 learner record

Mode used: packet tool / derived JSON. Tool/version: ____. Date of analysis: ____.
Baseline SHA-256: ____. Follow-up SHA-256: ____. Hash check outcome: ____.

## A. Scope decision

Which actions are permitted? Which apparent target needs owner clarification? Which incidental observation should be excluded? Identify one tempting action you must not perform.

## B. AP/client inventory

For each relevant BSSID record: observed SSID by frame; administrative ownership reference; advertised channel/frequency; AKM/cipher/PMF; what is missing; confidence and next question. Count BSSIDs, not physical radios. Keep the excluded BSS in a minimal separate note.

For each station observation record: address, frame references, requested SSID or wildcard, association evidence if any, and the limit on device identity/randomization inference.

## C. Timeline

frame(s) | source and destination | observed protocol event | supported conclusion | unsupported conclusion

Where is the strongest association evidence? What would be needed to claim successful WPA access? What does the management-frame observation prove about client impact?

## D. Five disputed claims

For each claim, agree/disagree/insufficient evidence, cite specific frames or the administrative source, then write a corrected sentence.

1. All three BSSIDs using Aster-Lab are one authorized network.
2. The hidden SSID cannot be recovered from the supplied evidence.
3. A locally administered station address proves MAC randomization and identifies one device.
4. A successful association response proves working WPA access.
5. The observed deauthentication proves a successful denial of service.

## E. Follow-up comparison

Apply comparable filters to both files. What changed? What stayed the same? Is this a security fix? Is it evidence of an executed client retest? Which outcomes remain NOT TESTED?

## F. Next safe decision

Write one test request with target, hypothesis, required authorization, collection points, baseline/negative control, expected observation, stop condition, recovery and evidence handling. Do not provide a performed result for a proposed test.

## G. Review and correction

Consult the public self-review only after attempting A–F. Preserve first answer → reason for correction → revised conclusion. If scope or evidence attribution fails, correct it before moving on. This worksheet is not uploaded or automatically graded by SecCraft.

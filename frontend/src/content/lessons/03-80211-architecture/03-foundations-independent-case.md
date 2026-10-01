# Independent Foundations Case: What Happened—and What Remains Unknown?

**WF-FND-01 · evidence practice · public self-review.** Combine Modules 01–03 without being told to select an attack. Your goal is a defensible assessment decision, not a flag or a claim of compromise.

This original case contains actual downloadable PCAPNG files, but their frames are generated teaching evidence, not a live radio recording. Neither a working AP/client environment nor independent grading is supplied.

## Your evidence pack

[Download the complete WF-FND-01 case pack (ZIP)](/wireless-foundations/WF-FND-01.zip). Individual file links also download; extract the ZIP to keep all case files together.

- [Case brief and tool instructions](/wireless-foundations/WF-FND-01/README.md)
- [Scope and stop conditions](/wireless-foundations/WF-FND-01/scope.md)
- [Owner inventory](/wireless-foundations/WF-FND-01/authorized-inventory.csv)
- [Baseline capture](/wireless-foundations/WF-FND-01/baseline.pcapng) and [derived baseline frames](/wireless-foundations/WF-FND-01/baseline-frames.json)
- [Follow-up capture](/wireless-foundations/WF-FND-01/follow-up.pcapng) and [derived follow-up frames](/wireless-foundations/WF-FND-01/follow-up-frames.json)
- [SHA-256 manifest](/wireless-foundations/WF-FND-01/SHA256SUMS)
- [Learner worksheet](/wireless-foundations/WF-FND-01/worksheet.md)

Download the files into one directory. Check the hashes before annotating a copy. If you cannot run a packet tool, use the read-only JSON and explicitly record that limitation. Both routes can practice interpretation; only the packet-tool route exercises filtering the binary capture.

## Guided start, then work independently

First inspect the scope and inventory, not the strongest signal or most familiar SSID. Keep three columns throughout:

1. What the packet bytes show.
2. What the owner’s administrative record says.
3. What is not established by either.

For a **separate illustrative example**, an association response with status 0 is evidence of a successful MAC-layer association response, not by itself a successful WPA key exchange or usable network access. What follow-on evidence would test those stronger claims? Apply that distinction to this case without assuming such evidence exists.

## Independent tasks

Complete worksheet A–F before opening the answer guide.

1. Classify each observation against the scope. Which needs clarification rather than an attack?
2. Build a relevant BSSID/station inventory with frame references. Determine whether the initially hidden name can be linked to a specific BSSID. Preserve uncertainties about ESS membership, physical devices and address randomization.
3. Reconstruct the client-facing sequence from probing through association. Identify where evidence for a stronger authenticated-access claim is missing.
4. Inspect management-frame and PMF advertisements. Separate an observed frame, an advertised capability and a measured client effect.
5. Correct the five disputed claims in the worksheet, citing evidence rather than tool screenshots alone.
6. Compare baseline and follow-up with the same filters. Explain whether the observed change demonstrates a security fix or a performed retest.
7. Propose the next permitted evidence request/test, including a negative control and stop condition. Its outcome is **NOT PERFORMED**.

Do not assume the expected result is “compromised.” A supported non-finding or insufficient-evidence conclusion can be the best assessment decision.

## Reproducible record

Use one row per claim:

```text
source filename + SHA-256 | tool/version + filter | frame(s)
observed fact | supporting administrative source | alternative explanation
conclusion and confidence | limitation | next authorized decision
```

Frame 1 of the follow-up file is not frame 1 of the baseline. A file hash identifies your artifact, not a real operator, device or engagement. Synthetic timestamps are usable for this exercise's ordering only; no actual collection timeline is asserted.

## Review without upgrading the result

When your first answer is saved, open the [public self-review rubric](/wireless-foundations/WF-FND-01/self-review.md). Preserve a first-answer → correction → reason record. Scope overreach or an invented result must be corrected before moving on.

If an instructor is available, ask them to choose one claim for reproduction and one declined action for explanation. This is a review request, not an assertion that an instructor assessed you.

Marking this lesson complete records browser-local practice. Existing quiz results remain knowledge checks; neither action certifies that you can operate a radio, deploy infrastructure or perform a professional engagement.

## Carry the method forward

In the next phase you will study the environment and toolchain. Carry forward the same inventory and evidence discipline: first determine capability and authorization, then choose an observation or controlled test. Do not turn the missing evidence in this case into a pretend result.

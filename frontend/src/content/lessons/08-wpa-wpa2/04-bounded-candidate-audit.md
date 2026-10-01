# A Bounded Password Audit: Match, Non-Recovery and Next Decisions

> **Available now: offline evidence and real local CPU verification.** The case uses fictional WPA2-Personal PMKID records. Python runs on your own computer, not in the browser command simulator. No GPU, hosted VM, radio, live target or independent grading is supplied.

## Define the question and budget

An owner asks whether a small approved set of candidate passwords is consistent with supplied verifier material. That is a different question from “can I join the network?” or “is every other password strong?” Your deliverable must answer the question you actually tested.

Download the [WF-AUTH-03 ZIP](/wireless-practice/WF-AUTH-03.zip), read its [scope](/wireless-practice/WF-AUTH-03/scope.md), and draft the [worksheet](/wireless-practice/WF-AUTH-03/worksheet.md). The new PMKID records are **not extracted from** the accompanying WPS/WPA3 captures. Keep their sources separate.

The budget is exactly three supplied candidates per record, with no mutation rules or expanded list. Candidate ordering/coverage is part of an assessment decision, not an excuse to keep testing indefinitely. No result authorizes a live connection, credential reuse test or administrative login.

## Why the verifier works

For these WPA2-Personal records:

1. Derive the 32-byte PMK with PBKDF2-HMAC-SHA1, passphrase, SSID and 4096 iterations.
2. Compute HMAC-SHA1 with that PMK over `PMK Name` followed by the AP and station MAC bytes.
3. Compare the first 16 bytes with the supplied PMKID.

The SSID is a salt, not a credential. Addresses and verifier must belong to the same record. Changing an SSID/address or pairing unrelated records can cause non-recovery even when a candidate is otherwise plausible. An absent match requires checking provenance and extraction as well as candidate coverage.

This is **not** a generic SAE password test. Correct SAE exchanges do not expose the ordinary PSK-derived offline verifier. Enterprise methods also need their own applicability analysis. “WPA” in a filename does not determine what a tool can verify.

## Guided execution

Extract the ZIP and enter its WF-AUTH-03 directory. Use Python 3; inspect the small standard-library-only script before running it. It has no network I/O and accepts only the two bundled exercise modes.

```bash
sha256sum -c SHA256SUMS
python3 --version
python3 audit.py guided
```

On Windows, use your Python launcher and `Get-FileHash` to compare individual files against the manifest. Opening these files does not require elevated privileges. Record the actual interpreter version and output; do not invent GPU throughput, hashcat compatibility or a wall-clock benchmark.

For G1, identify the matching candidate line, cite its record/hash and explain what was compared. A match confirms consistency with a **constructed** verifier. It does not establish an AP's identity, actual association, DHCP success or application access.

## Independent exercise: commit your conclusions first

```bash
python3 audit.py independent
```

For I1 and I2, independently record the result, exact tested-set size, candidate coverage, alternate explanations and your next owner-approved request. Stop after the three candidates even if nothing matches. Do not read the public key and then add its credential to claim an independent success.

No interpreter available? Use [guided records](/wireless-practice/WF-AUTH-03/guided.json), [independent records](/wireless-practice/WF-AUTH-03/independent.json) and [supplied reference outcomes](/wireless-practice/WF-AUTH-03/reference-results.json). Mark **reviewed supplied results; not independently executed**. You can still complete the reasoning; do not claim tool-operation competence.

## Report results without inflating them

A defensible non-recovery statement names the artifact, verifier type and three tested candidates. It does not say “uncrackable”, “secure” or “all possible passwords tested”. A match also does not set severity automatically: assess intended use, reachability, credential policy, reuse evidence and compensating controls separately.

For a real finding, request a unique, appropriately generated credential or a supported migration policy from the owner, and plan comparable post-change validation. Do not select a universal password length from this tiny fixture. Record live association and internal access as **NOT TESTED**. Compare the [public review guide](/wireless-practice/WF-AUTH-03/review-guide.md) only after drafting. Local lesson completion is participation, not trusted grading.

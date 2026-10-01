# Verify the Server You Intended, Not Merely a Trusted Signature

> **Available now: actual local certificate-file verification.** Python 3 and OpenSSL 3 run on your computer, not in SecCraft's command simulator. This is not an EAP/TLS connection, hosted VM or supplicant test. Live client acceptance remains **NOT TESTED**.

## Prepare an isolated file exercise

Download the [WF-ENT-05 ZIP](/wireless-practice/WF-ENT-05.zip), read the [scope](/wireless-practice/WF-ENT-05/scope.md) and extract it. Verify SHA256SUMS before working. The public certificates are deterministically generated teaching fixtures; their keys derive from public seeds. **Do not install the roots into your operating system, browser or device, and never use these keys for a real service.** No private keys are shipped or needed.

The trusted root signs a good server, a wrong-name server, an expired server and a certificate with only client-authentication purpose. Another teaching root signs a server with the expected name. Which files should a correctly constrained server verifier accept?

## Predict each independent check

| Check | Question | Counterexample |
| --- | --- | --- |
| Chain/signature trust | Does the chain terminate at an approved anchor with valid signatures? | a correctly named server signed by another root |
| Expected identity | Does the certificate cover the intended DNS name? | a same-root certificate for another service |
| Validity time | Is it valid at the evaluation time? | an expired certificate with the right name/issuer |
| Intended purpose | Is its key usage/EKU appropriate for a server? | a client-auth-only certificate |
| Effective client policy | Does the real client apply the intended checks without bypass? | not established by a command-line file check |

Revocation, actual TLS negotiation, possession of the matching key and device policy are outside this local check. Do not infer them from a successful signature/path result.

## Execute two bounded policies

From the extracted WF-ENT-05 directory:

```bash
openssl version
python3 check-certificates.py ca-only
python3 check-certificates.py strict
```

The script uses only local files. Both policies restrict the trust anchor and check validity and server purpose. `ca-only` deliberately lacks the expected-name constraint; `strict` additionally checks `aaa.lab.example`. The exercise pins its time to **2026-10-01T00:00:00Z**, so future runs are reproducible. Do not copy a historic `-attime` value into a real current assessment.

The strict good-server check can also be inspected directly:

```bash
openssl verify -no-CApath -no-CAstore -CAfile trusted-root.pem \
  -purpose sslserver -attime 1790812800 \
  -verify_hostname aaa.lab.example server-good.pem
```

Do not remove trust/name checks just to produce a green result. Missing OpenSSL is a setup limitation, not a failed certificate. If local installation is unavailable, use [supplied reference outcomes](/wireless-practice/WF-ENT-05/reference-results.json) and explicitly record **reviewed supplied results; not independently executed**. Both routes support the reasoning exercise; only one demonstrates local tool operation.

## Interpret the difference

Which wrong server passes the incomplete-name policy but fails strict? Record the failure reason, not merely a nonzero exit code. Retain the good-server positive control so “reject everything” cannot masquerade as a usable fix. Check that the unknown issuer, expiry and wrong-purpose cases fail for their distinct reasons under both policies.

Your before/after statement concerns **the local verifier command policy**, not a hardened live supplicant. Ed25519 works in this exercise's OpenSSL verification; the pack does not establish support on any particular Wi-Fi client. An exact hostname check here is also not identical to every client's suffix-matching configuration. Choose the intended matching semantics and inspect the effective device profile.

## Handoff and future validation

Record versions, certificate hashes, trusted anchor, expected name, reference time, purpose, outputs and untested checks in the [worksheet](/wireless-practice/WF-ENT-05/worksheet.md). A real controlled retest would require a managed test client, approved synthetic identity, actual CA/name policy, known-good and wrong-server cases, client/AP logs and cleanup. Stop on real credential entry or unintended devices. Hosted infrastructure is unavailable; do not report that plan as executed.

Compare the [public review guide](/wireless-practice/WF-ENT-05/review-guide.md) after drafting. A secure rejection is a useful result within the mode actually tested; local lesson completion is not independent grading.

# Modern Wi-Fi Policy: Advertisement Is Not Negotiation

> **Available now: offline comparison.** The fixtures do not supply valid SAE authentication or measured client behavior. Hosted execution is unavailable. Client acceptance, forced downgrade and remediation retests remain **NOT TESTED**.

## Compare two scenes, not a fabricated before/after

Use the [WF-AUTH-03 ZIP](/wireless-practice/WF-AUTH-03.zip), [scope](/wireless-practice/WF-AUTH-03/scope.md), [SAE-only capture](/wireless-practice/WF-AUTH-03/wpa3-only.pcapng), [transition capture](/wireless-practice/WF-AUTH-03/wpa3-transition.pcapng), [SAE-only decoded view](/wireless-practice/WF-AUTH-03/wpa3-only.json) and [transition decoded view](/wireless-practice/WF-AUTH-03/wpa3-transition.json).

These are independently constructed scenes. They are not a performed remediation/retest pair. Cite source-specific frames and hashes in the [worksheet](/wireless-practice/WF-AUTH-03/worksheet.md).

## Classify the advertisement

Inspect frame 1 in each capture. Record group/pairwise ciphers, the full AKM list and both PMF bits. AKM 8 identifies SAE; AKM 2 identifies PSK. A list containing both permits compatibility choices, not proof that a particular client selected either one.

PMF capable means support is advertised. PMF required makes protection a policy requirement for association under that advertisement. An absent required bit does **not** imply every capable client negotiates PMF off. Collect negotiated policy and client/AP evidence before predicting the effect of a management frame.

For local file inspection, use Wireshark's RSN tree or:

```bash
tshark -r wpa3-transition.pcapng -Y 'wlan.fc.type_subtype == 8' -V
tshark -r wpa3-transition.pcapng -Y 'eapol' -V
```

These commands read downloaded files on your computer; they do not run in SecCraft's simulator. Use the JSON route if tools cannot be installed, and label your method accordingly.

## Identify where the evidence ends

The transition scene includes reproducible PSK handshake material. A PSK candidate audit can apply to that material, but does not directly audit SAE. Credential reuse across modes is a separate configuration question: do not assume a recovered PSK is the SAE credential.

The SAE-only fixture contains illustrative commit/confirm-shaped data, not a valid authenticated SAE exchange. The protected-bit/BIP-shaped management observation does not have a validated integrity result. Neither proves successful negotiation or a client honoring/rejecting management traffic.

Explain the difference among:

- “This BSS advertises PSK and SAE.”
- “This evidence encodes a client PSK exchange.”
- “An attacker forced this client to fall back from its intended SAE policy.”

The third claim requires a causal baseline, intended client policy, controlled intervention, version details and client/AP logs. The first two do not imply it.

## Choose negative controls before requesting live work

Draft a future authorized matrix; do not execute it here:

| Configuration/control | Intended observation | Evidence needed |
| --- | --- | --- |
| SAE-only with supported legitimate client | normal connection using intended SAE/PMF policy | real client/AP logs, negotiated policy and bounded application check |
| SAE-only with PSK-only client | no PSK association; expected compatibility rejection | client/AP state and failure logs, not merely absent packets |
| Transition with permitted legacy client | compatibility path matches owner policy | selected AKM, credentials policy and negotiated PMF |
| Client configured to refuse legacy fallback | policy preserved under the approved test | baseline/control comparison and client-side decision evidence |

Select implementation versions and allowed behavior with the owner. A secure rejection is a valid positive defensive result. If a legacy exception is needed, document its scope, monitoring and retirement criteria. Removing compatibility can break legitimate devices; include a restoration plan.

## Bound the recommendation

Do not report “WPA3 broken” from a permitted PSK path, or “safe” solely from an SAE advertisement. OWE provides unauthenticated link encryption, not an authenticated AP identity. WPA3-Enterprise's 192-bit profile is not a synonym for choosing a different SAE group.

Deliver the comparison, one rejected overclaim and your proposed negative-control matrix. Check the [public review guide](/wireless-practice/WF-AUTH-03/review-guide.md) after drafting. Keep all real client effects and future retests **NOT TESTED**; local progress records offline participation only.

# Select an EAP Method Without Inventing Credential Exposure

> **Available now: offline method and evidence decisions.** No hosted EAP environment is supplied. Actual authentication, credential exposure and client effects remain **NOT TESTED**.

## Start the Enterprise case

Use the [WF-ENT-05 ZIP](/wireless-practice/WF-ENT-05.zip), [scope](/wireless-practice/WF-ENT-05/scope.md), [method cases](/wireless-practice/WF-ENT-05/method-cases.json) and [worksheet](/wireless-practice/WF-ENT-05/worksheet.md). This case combines separate exercises, not a fabricated end-to-end capture. The next lesson offers real local public-certificate checks; the later applied-policy lesson correlates packet transactions and fictional policy records.

## Assign each decision to its owner

The supplicant chooses and enforces its effective EAP/profile policy. The authenticator carries EAP between the client and the authentication service and applies the returned network policy. The EAP server authenticates according to its method and identity store. A controller, switch or firewall may enforce placement and forwarding. One successful stage does not prove the others.

A beacon advertises a Wi-Fi security profile/AKM, not the complete inner EAP configuration. A method name in a packet is evidence of a label at that stage; a proposal is not a completed negotiation. PMF is a separate management-frame control, not a substitute for EAP server identity validation.

## Choose with constraints, not a universal ranking

| Deployment question | Candidate approach | Controls still needed |
| --- | --- | --- |
| Managed PKI and supported devices; avoid reusable network passwords | EAP-TLS | server chain/name validation, client certificate-to-identity mapping, protected private keys and lifecycle/revocation policy |
| Legacy PEAP-MSCHAPv2 clients must remain temporarily | restricted, managed validated profiles | explicit trusted server identity, no user override, method restrictions, version testing and migration plan |
| Certificate-free password EAP considered | evaluate EAP-PWD only where profile/support permit | password policy, validated implementation, peer/authentication properties and applicable Wi-Fi profile requirements |
| Mixed machine/user policy | evaluate supported method/policy combination | actual client support and explicit authorization mapping; do not assume every tunnel method provides the same binding |

EAP-PWD is not WPA3-Enterprise and is not SAE. WPA3-Enterprise is a security profile with requirements beyond an EAP name. Its 192-bit mode is not “use a longer password”. Do not declare interoperability or compliance from an AKM or marketing label alone.

## Decide what material is actually visible

An outer identity may be visible and can use an anonymous realm identity where supported. That does not mean the inner identity/password is visible or that all metadata is hidden. An ordinary passive observation of a correctly protected PEAP/TTLS tunnel does not expose its inner challenge/response for a password audit.

A public client certificate does not disclose a private key. Observing that certificate does not prove a peer demonstrated possession or that authorization mapped it to the intended identity. In EAP-TLS, removing the reusable password does not remove server trust, private-key protection or authorization requirements.

The [EAP decoded fixture](/wireless-practice/WF-ENT-05/eap.json) has deliberately direct illustrative MS-CHAPv2 values. The [Enterprise decoded fixture](/wireless-practice/WF-ENT-05/enterprise.json) uses abbreviated TLS-like bytes and inserted key material. Neither demonstrates a real rogue tunnel or credential capture; do not join them to the separate RADIUS file by reused identifiers.

## Independent method decisions

For E1–E4, identify the right role, a defensible method/control choice, a rejected overclaim and one missing evidence request. In particular, ask whether a broad CA without a constrained server identity satisfies E2, and whether E4 supplies any proof of private-key possession. Do not equate an absent field in one exported profile with disabled validation: inspect the effective settings, inherited trust and client behavior.

Deliver a method/control matrix with compatibility, credential exposure and policy limits. Read the [public review guide](/wireless-practice/WF-ENT-05/review-guide.md) after committing your decisions. Browser completion records participation, not validated client configuration or professional execution competence.

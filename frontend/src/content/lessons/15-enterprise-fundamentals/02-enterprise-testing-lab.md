# Testing the Enterprise Path (Lab)

> Artifact boundary: `enterprise.pcapng` and `radius.pcapng` are separate synthetic protocol fixtures. The former uses abbreviated EAP/TLS-like bytes and an inserted lab MSK; the latter contains example authenticators/attributes. Neither proves a complete PEAP session, a deployed RADIUS policy, rogue NAS activity, or VLAN enforcement.

## 1. A test plan for 802.1X

| # | Question | Method | Artefact |
| --- | --- | --- | --- |
| 1 | Which EAP method does the network offer? | read the outer exchange | `eap.pcapng`, frames |
| 2 | Does the client validate the server certificate? | client profile review / lab client with no `ca_cert` | supplicant log, capture of the inner exchange |
| 3 | Can credentials be captured and cracked? | lab rogue authenticator (authorised) | MS-CHAPv2 challenge/response |
| 4 | Is the RADIUS shared secret strong and scoped? | verify Message-Authenticator; guess-test offline in the lab | `radius.pcapng` |
| 5 | Is the assigned VLAN/ACL enforced? | reachability tests from the authenticated client | frame-level reachability + logs |
| 6 | Is PMF required for authenticated clients? | RSNE check; spoof test if authorised | beacon RSNE, deauth attempt |

## 2. Lab tasks

```bash
# 1. method identification
tshark -r enterprise.pcapng -Y 'eap' -T fields -e frame.number -e eap.code -e eap.type

# 2. outer identity vs inner identity
tshark -r enterprise.pcapng -Y 'eap.type == 1' -T fields -e frame.number -e eap.identity

# 3. RADIUS policy in the reply
tshark -r radius.pcapng -Y 'radius.code == 2' \
  -T fields -e frame.number -e radius.tunnel_private_group_id -e radius.eap_message

# 4. integrity: is the Message-Authenticator present and valid?
tshark -r radius.pcapng -Y 'radius.code == 1' \
  -T fields -e frame.number -e radius.message_authenticator
```

1. Identify the EAP method labels and visible identities in the fixtures; explain why abbreviated TLS-like bytes do not reveal a complete tunnel or inner identity.
2. Re-derive the direct MS-CHAPv2 fixture response from the documented lab password (`scripts/verify-lab-artifacts.py`, step 6). Do not claim it was captured inside PEAP or caused by a rogue authenticator.
3. Verify the constructed Message-Authenticator with the disclosed lab shared secret and compare the intentionally invalid example. Explain what this proves about those sample bytes—not about a deployed NAS or production secret.
4. The RADIUS example includes a VLAN attribute. Design the authorized client/AP/switch/log tests needed to prove the client actually lands in that VLAN and cannot reach a disallowed destination; the PCAP does not prove enforcement.

## 3. Correlating a *real* controlled session: collection contract

The two supplied PCAPs cannot be merged into one session. For a supervised, owned EAP lab,
assign a unique test account and capture identifier first. Start synchronized client/AP/RADIUS
logs and a wireless capture; collect **redacted** effective supplicant profile, certificate
chain and expected server name. Correlate one attempt by client MAC, BSSID, EAP identifier,
NAS-Identifier/Calling-Station-Id, request identifier, timestamp *with clock skew noted*, and
server transaction ID. EAP identifiers can be reused; a timestamp or identity alone is not
sufficient to join unrelated sessions. Keep raw evidence private; never put credentials or
private keys in a repo.

| Controlled case | Evidence to request | Bounded result |
| --- | --- | --- |
| Known server name and CA | client trust/profile + certificate chain + EAP outcome + AAA decision | for this client/profile, was expected identity validated? |
| Test server with wrong name, same trusted CA | effective client profile + supplicant reason + EAP/TLS frames | rejection *reason* needs client log; a TLS alert alone is ambiguous |
| Test account accepted | AAA Access-Accept + AP/client assigned VLAN + allowed/denied reachability + switch policy | assigned attribute is not applied policy without enforcement evidence |
| Negative test account | AAA rejection and client failure + reason | distinguish intended rejection from unreachable RADIUS |

Do **not** describe `enterprise.pcapng` and `radius.pcapng` as this collected session. If a
client/AAA log is missing, mark that control **NOT TESTED** rather than filling the gap with
illustrative output. Independent reviewer check: can each identity, policy decision and test
result be followed through one authorized transaction without inferring a TLS secret from bytes?

## 4. Reporting the enterprise findings

A hypothetical report finding must be based on a separate authorized test, not inferred from these fixtures. For example, only if a controlled test demonstrates it and profile/log evidence corroborates it, report that a specific client profile failed to validate the expected server identity and that the test authenticator obtained specified inner-method material. Scope the impact to demonstrated test accounts and systems; credential reuse/lateral movement needs separate evidence. Retest the corrected managed profile with a controlled untrusted certificate and correlate supplicant logs, configuration, and packet evidence. The supplied captures alone do not support this finding.

## 5. Decision practice

**`scn-15-msk-to-pmk`** — why does the 4-way handshake appear *after* a successful EAP exchange, and what
would its absence indicate?

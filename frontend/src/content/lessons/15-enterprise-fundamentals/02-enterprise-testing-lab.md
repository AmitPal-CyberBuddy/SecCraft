# Testing the Enterprise Path (Lab)

> Artifacts: `enterprise.pcapng` (PEAP flow, MSK→PMK→4-way), `radius.pcapng` (verifiable RADIUS
> authenticators, dynamic VLAN 100, rogue NAS with a wrong Message-Authenticator).

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

1. Name the EAP method and explain what is inside the TLS tunnel versus what is visible on the air.
2. Re-derive one MS-CHAPv2 NT-Response from the documented lab password
   (`scripts/verify-lab-artifacts.py`, step 6). Explain why this material is only obtainable when the
   attacker terminates the tunnel (a rogue authenticator), never from a passive capture of a correctly
   configured client.
3. Verify one Message-Authenticator with the lab shared secret, then show that the "rogue NAS" request in
   the capture does not verify. What does that tell you about guessing the secret offline?
4. The Access-Accept assigns VLAN 100. Design the test that proves the client actually lands in VLAN 100
   and cannot reach a different VLAN — and say what would falsify your conclusion.

## 3. Reporting the enterprise findings

Enterprise findings are architectural, so write them at the level of the control:

* *"The client profile does not validate the RADIUS server certificate, allowing an on-path attacker with a
  rogue authenticator to obtain MS-CHAPv2 challenge/response material, which is offline-crackable."*
* Impact: credential capture → lateral movement where those credentials are reused → recommend EAP-TLS or
  enforced certificate validation plus credential rotation.
* Evidence: the rogue-authenticator capture, the client profile (redacted), the cracked password (lab),
  and the timeline.

## 4. Decision practice

**`scn-15-msk-to-pmk`** — why does the 4-way handshake appear *after* a successful EAP exchange, and what
would its absence indicate?

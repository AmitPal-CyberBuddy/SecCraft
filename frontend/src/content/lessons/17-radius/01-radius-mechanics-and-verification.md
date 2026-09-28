# RADIUS Mechanics and Verifiable Integrity

> Artifact: `radius.pcapng` — Access-Request → Access-Challenge → Access-Accept (+ Accounting-Request),
> a rogue NAS whose Message-Authenticator fails, VLAN 100 assignment.

## 1. Protocol essentials

* UDP **1812** (authentication) and **1813** (accounting); legacy 1645/1646 may still appear.
* Header: code, identifier, length, **Authenticator (16 bytes)**, then attributes (type, length, value).
* Codes worth naming: 1 Access-Request, 2 Access-Accept, 3 Access-Reject, 11 Access-Challenge,
  4 Accounting-Request, 5 Accounting-Response.
* Attributes that carry evidence: 1 User-Name, 2 User-Password, 8 Framed-IP-Address,
  24 State, 26 Vendor-Specific, 30 Called-Station-Id, 31 Calling-Station-Id, 79 EAP-Message,
  80 Message-Authenticator, 81 Tunnel-Private-Group-Id (VLAN).

**EAP-Message can be split across multiple attributes.** A decoder that reads only the first attribute
loses the rest of the EAP packet — concat all attributes with type 79 before parsing (labkit does this).

## 2. Integrity you can verify in a capture

* **Message-Authenticator (80)**: `HMAC-MD5(packet with the attribute value zeroed, shared secret)`.
  Offers integrity of the packet *and* proof of knowledge of the secret.
* **Response Authenticator**: `MD5(Code ‖ ID ‖ Length ‖ Request-Authenticator ‖ Attributes ‖ Secret)`
  for responses; a request's Authenticator field is a random value used as the seed.
* **User-Password (2)** is XOR-encrypted with a keystream built from the Request Authenticator and the
  secret — reversible by anyone who knows the secret, i.e. **not** mutual confidentiality from the NAS.

```bash
tshark -r radius.pcapng -Y 'radius' -T fields -e frame.number -e radius.code \
  -e radius.id -e radius.message_authenticator -e radius.tunnel_private_group_id
```

`scripts/verify-lab-artifacts.py` verifies the Message-Authenticator of every request and the Response
Authenticator of every reply, and confirms that the deliberately wrong-secret "rogue NAS" request fails —
which is what you should reproduce by hand at least once.

## 3. The shared secret: why it is a high-value target

* Every AP/WLC that talks to the RADIUS server holds it, so its blast radius equals the number of devices
  configured with it.
* With a captured request **and** a candidate secret, the Message-Authenticator can be recomputed offline
  — an offline dictionary check against the secret itself (no rate limit, no lockout).
* The secret also decrypts User-Password attributes and lets an attacker forge accepts if they can answer
  as the NAS (e.g. by spoofing the NAS IP when the server does not restrict source addresses).
* Requirements: `require_message_authenticator = yes` server-side, per-device secrets, source-IP
  restriction, and RadSec (RADIUS over TLS, TCP 2083) for the transport.

## 4. Lab tasks

1. List every RADIUS packet with code names and identify the challenge/accept pair.
2. Verify the Access-Request Message-Authenticator with the lab secret `testing123`; then try a wrong
   secret and show the mismatch.
3. Verify the Access-Accept Response Authenticator using the request's Authenticator field.
4. Explain the VLAN assignment you see (attribute 81) and list two ways an attacker could abuse a
   trust-the-reply design.
5. Find the rogue NAS request and explain *precisely* why it fails verification.

## 5. Decision practice

**`scn-17-secret-rotation`** — the secret is found in a config backup on a shared drive. What is the
finding, and what does the impact depend on?
**`scn-17-radius-log-reading`** — from a RADIUS log alone, what can you prove about a failed login?

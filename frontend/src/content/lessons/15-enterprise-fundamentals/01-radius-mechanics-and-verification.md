# RADIUS Mechanics and Verifiable Integrity

> Artifact: `radius.pcapng` — synthetic Access-Request/Challenge/Accept examples (+ accounting), a deliberately invalid Message-Authenticator example, and a VLAN attribute. This does not establish a deployed NAS, production shared secret, real authentication decision, or VLAN enforcement.

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
  Supports integrity under the shared-secret relationship, not unique sender identity. EAP-bearing responses substitute the matching request authenticator for this HMAC calculation and compute the final Response Authenticator afterwards.
* **Response Authenticator**: `MD5(Code ‖ ID ‖ Length ‖ Request-Authenticator ‖ Attributes ‖ Secret)`
  for responses; an Access-Request uses an unpredictable request authenticator in production (this fixture uses documented deterministic values). Accounting-Request has a separate MD5 authenticator construction.
* **User-Password (2)** is obfuscated with a keystream derived from the Request Authenticator and shared
  secret. A party holding that secret can recover it; this is not modern end-to-end confidentiality and
  does not protect the password from the NAS or a compromised RADIUS endpoint.

```bash
tshark -r radius.pcapng -Y 'radius' -V
# Inspect attributes 79 (EAP-Message), 80 (Message-Authenticator), and 81 (Tunnel-Private-Group-Id).
# Displaying an authenticator is not cryptographic verification.
```

`scripts/verify-lab-artifacts.py` verifies the Message-Authenticator of the constructed requests and the Response
Authenticator of the constructed replies, and confirms that one deliberately invalid request fails candidate-secret verification. That packet does not, by itself, prove a rogue NAS or identify a production secret; reproduce the calculation with the disclosed lab fixture values.

## 3. The shared secret: why it is a high-value target

* Every AP/WLC that talks to the RADIUS server holds it, so its blast radius equals the number of devices
  configured with it.
* With a captured request **and** a candidate secret, the Message-Authenticator can be recomputed offline
  — an offline dictionary check against the secret itself (no rate limit, no lockout).
* A party with the shared secret and network reachability may be able to impersonate that configured
  RADIUS client and construct valid requests; a party impersonating the server may also forge responses
  accepted by a NAS using that secret. Source-address allowlists and network controls reduce exposure but
  are not substitutes for strong, unique secrets and protected transport.
* Requirements: `require_message_authenticator = yes` server-side, per-device secrets, source-IP
  restriction, and RadSec (RADIUS over TLS, typically TCP 2083) for transport protection with validated peers and suitable policy.

## 4. Lab tasks

1. List every RADIUS packet with code names and identify the challenge/accept pair.
2. Verify the Access-Request Message-Authenticator with the lab secret `testing123`; then try a wrong
   secret and show the mismatch.
3. Verify the Access-Accept Response Authenticator using the request's Authenticator field.
4. Identify the VLAN attribute in the example and distinguish a RADIUS attribute from proof that an AP/switch applied the VLAN. State what infrastructure/log evidence would verify enforcement.
5. Find the deliberately invalid-secret request and explain *precisely* why it fails verification.

## 5. Decision practice

**`scn-17-secret-rotation`** — the secret is found in a config backup on a shared drive. What is the
finding, and what does the impact depend on?
**`scn-17-radius-log-reading`** — from a RADIUS log alone, what can you prove about a failed login?

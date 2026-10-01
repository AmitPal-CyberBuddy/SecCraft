# EAP Methods and Credential Exposure

## 1. The methods that matter

| Method | Server proves identity? | Client proves identity with | On-the-air exposure | Notes |
| --- | --- | --- | --- | --- |
| EAP-MD5 | no | password-based challenge response | susceptible to offline guessing if exposed | does not export the keying material required as a standalone WPA-Enterprise method; legacy/context only |
| LEAP | weak challenge-response (not certificate-based server authentication) | MS-CHAPv1-style challenge/response | vulnerable to offline dictionary attacks | Cisco-proprietary and deprecated; do not use |
| PEAPv0 + MS-CHAPv2 | **only if the client validates** | username + MS-CHAPv2 response | after a rogue authenticator: challenge/response → offline crack | the classic enterprise exposure |
| EAP-TTLS + MS-CHAPv2 | only if validated | same as PEAP | same as PEAP | inner method can also be PAP/CHAP |
| EAP-TLS | the client should validate the server certificate | X.509 client certificate | no password challenge/response to crack; certificate/private-key handling still matters | requires a PKI and managed trust |
| TEAP | TLS server authentication when the client validates the certificate | varies | depends on the inner method and tunnel validation | flexible tunneled method; deployment and client support vary |

**The rule:** TLS can encrypt traffic even to an unintended peer. Server chain and expected-identity validation are what distinguish the intended server from an impersonator. Without effective validation, a compatible rogue server may terminate the tunnel; method/profile and runtime evidence determine what is exposed.

## 2. MS-CHAPv2, precisely

The exchange inside the tunnel:

```
server → client : Challenge  (16-byte AuthenticatorChallenge, name)            [MS-CHAPv2 Code 1]
client → server : PeerChallenge (16 random bytes) + Reserved(8) +
                  NT-Response(24) + username                                   [Code 2]
server → client : Success/Failure + message                                    [Code 3/4]
```

The NT-Response is built in three DES operations (RFC 2759 §4.2):

```
1. challenge_hash = SHA1(PeerChallenge ‖ AuthenticatorChallenge ‖ username).digest()[0:8]
2. pad the 16-byte NT-hash (MD4 of the UTF-16LE password) with five zero bytes to 21;
   split into three 7-byte chunks and expand each to an 8-byte DES key with parity bits → K1, K2, K3
3. NT-Response = DES(K1, challenge_hash) ‖ DES(K2, challenge_hash) ‖ DES(K3, challenge_hash) (24 bytes)
```

The **challenge hash** excludes a prepended Windows domain from the username (`DOMAIN\user` contributes `user`, per RFC 2759). It concatenates the peer challenge first, then the Authenticator challenge and that username, and takes the first 8 bytes of SHA-1. Omitting or reordering these values yields a different challenge, and encrypting the LM constant `KGS!@#$%` instead of that challenge is not MS-CHAPv2 NT-Response derivation. The DES keys come from the password hash, not from the challenges. Hashcat mode 5500 expects correctly formatted MS-CHAPv2/NetNTLMv1 material; derive the eight-byte challenge hash and use the tool's documented input format rather than pasting the two 16-byte challenges into an assumed format.
The labkit implements the full derivation, and `verify-lab-artifacts.py` re-derives the captured
challenge/response pair from the documented lab password (a known-answer fixture check, not a measured password-cracking run).

### Worked, reproducible derivation (lab-only values)

For `password = lab-only-pass`, `username = student`, AuthenticatorChallenge
`00112233445566778899aabbccddeeff` and PeerChallenge
`ffeeddccbbaa99887766554433221100`, RFC 2759 gives:

```text
SHA1(peer || authenticator || username)[0:8] = 97f18041951d7d5b
MD4(UTF-16LE(password))                 = e6031b6c39547078ffc0589278d93ff1
NT-Response (three DES blocks)           = 6c97b41cd05a5701922d425ad93498160c9e6c4709820100
```

Check the intermediate lengths: two 16-byte challenges, an eight-byte challenge hash, a 16-byte
NT hash padded to 21, and a 24-byte response. Reverse the challenge order or encrypt
`KGS!@#$%` instead, and the response will differ. Reproduce offline from the repository root
without a capture or network:

```bash
python3 - <<'PYCODE'
import sys
sys.path.insert(0, 'scripts')
from wififorge_labkit import mschapv2_credentials
response, nthash, challenge = mschapv2_credentials(
    'lab-only-pass', bytes.fromhex('00112233445566778899aabbccddeeff'),
    bytes.fromhex('ffeeddccbbaa99887766554433221100'), 'student')
print(challenge.hex(), nthash.hex(), response.hex())
PYCODE
```

This known-answer vector teaches the calculation; it is neither a PEAP capture nor a real
credential. The fixture's direct EAP-MSCHAPv2 values provide a separate packet-reading exercise.

## 3. Turning a capture into an audit

After a rogue authenticator terminates PEAP (or the client is configured without validation), the
attacker has the challenge, the peer challenge, the NT-Response, and the username:

```
challenge_hash = SHA1(peer_challenge || authenticator_challenge || username)[0:8]
verify(candidate_password, challenge_hash, captured_nt_response)
```

For a *direct* MS-CHAPv2 teaching exchange, `hashcat -m 5500` can test a correctly converted
NetNTLMv1-style challenge/response; consult the installed tool's `--example-hashes` and keep the
computed eight-byte challenge hash distinct from either 16-byte input. Do not paste the raw
peer/authenticator challenges into an unverified example format. A normal passively observed PEAP
tunnel does not expose this inner response. The NT hash is `MD4` of the
UTF-16LE password — an unsalted hash with no key stretching, which is why dictionary attacks succeed
quickly against human-chosen passwords.

## 4. Certificate validation: the control that actually fixes this

`wpa_supplicant` example (client side) — every option here is a control:

```
network={
    ssid="Corp-WLAN"
    key_mgmt=WPA-EAP
    eap=PEAP
    identity="a.patel@corp.example"
    anonymous_identity="anonymous@corp.example"
    password="…"
    ca_cert="/etc/ssl/certs/corp-root-ca.pem"     # trust only the corporate CA
    domain_suffix_match="radius.corp.example"     # constrain the DNS suffix; review intended subdomain matching
    phase2="auth=MSCHAPV2"
    ieee80211w=2
}
```

* Configure an explicit trust anchor and expected server name. Without those settings, do not assume the supplicant validates the intended server certificate; exact defaults vary by supplicant and profile.
* Use `domain_match` for a full expected DNS-name match or a deliberately scoped `domain_suffix_match` for a DNS suffix. `subject_match` is only a subject substring comparison, not an equivalent DNS identity control; the upstream configuration documentation warns against using it for a domain suffix. A valid chain alone is not enough.
* Migrate compatible clients and servers to EAP-TLS to remove this password-response mechanism, with managed certificate issuance, validation, renewal and revocation. If PEAP-MSCHAPv2 remains, enforce server trust/name checks on clients, managed profiles and an appropriate password policy. Machine/user certificate chaining is not a generic PEAP-MSCHAPv2 switch; any TEAP or other chaining design needs separate client/server support and validation.

## 5. Lab tasks

**Artifact boundary:** `eap.pcapng` contains abbreviated EAP method identifiers and a deliberately direct, visible EAP-MSCHAPv2 challenge/response fixture. Its TLS-like payloads are structural bytes; it does **not** contain a complete PEAP TLS handshake, a proven inner MS-CHAPv2 exchange inside PEAP, or client certificate-validation evidence. The challenge/response values are included for offline-derivation practice only. `radius.pcapng` is a separate synthetic protocol example, not the same coherent session.

1. Identify the EAP method identifiers and any identity fields actually visible; cite frames.
2. Point out the abbreviated TLS-like bytes. Explain why this fixture cannot establish a complete TLS exchange or hide/reveal an inner identity.
3. Extract the direct MS-CHAPv2 challenge, peer challenge, NT-Response and username using labkit:
   `scripts/wififorge_labkit.py`'s `decode` function or tshark fields — then re-derive the response
   from the documented lab password. For an executable checked example, run
   `python3 scripts/verify-lab-artifacts.py` from the repository root and inspect its
   `verify_mschapv2` routine; reproduce the RFC 2759 calculation with your extracted bytes.
4. Verify the known lab response against the documented password and RFC 2759 derivation. Treat any offline wordlist exercise as a lab-only demonstration; the fixture does not show a rogue authenticator or client profile.
5. Separately describe the real-world precondition for PEAP credential exposure: failure to validate both trusted CA and expected server identity. Do not claim this artifact proves that precondition.

## 6. Decision practice

**`scn-16-method-identification`** — you see PEAP then an immediate TLS alert. What happened?
**`scn-16-cert-validation`** — the client has `ca_cert` but no `domain_suffix_match`. Still exploitable?

## Profile reference

The [upstream wpa_supplicant configuration reference](https://w1.fi/cgit/hostap/plain/wpa_supplicant/wpa_supplicant.conf) distinguishes `domain_match`, `domain_suffix_match` and substring-only `subject_match`, and documents method-specific inner authentication. Check the deployed version and effective managed profile; an example file is not evidence that a client used those settings.

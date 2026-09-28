# EAP Methods and Credential Exposure

## 1. The methods that matter

| Method | Server proves identity? | Client proves identity with | On-the-air exposure | Notes |
| --- | --- | --- | --- | --- |
| EAP-MD5 | no | MD5 of password + challenge | password crackable offline | should not be used |
| LEAP | **no** (or trivially) | MS-CHAPv1 | MS-CHAPv1 crackable | Cisco-proprietary, should not be used |
| PEAPv0 + MS-CHAPv2 | **only if the client validates** | username + MS-CHAPv2 response | after a rogue authenticator: challenge/response → offline crack | the classic enterprise exposure |
| EAP-TTLS + MS-CHAPv2 | only if validated | same as PEAP | same as PEAP | inner method can also be PAP/CHAP |
| EAP-TLS | yes | X.509 client certificate | nothing crackable | requires a PKI |
| TEAP | yes (TLS + inner methods) | varies | depends on the inner method | modern replacement for PEAP/TTLS mixes |

**The rule:** the outer TLS tunnel only protects what is inside *if the client verifies the server's
certificate*. Without validation, the tunnel is with whoever answered — an attacker can present their own
certificate and terminate it.

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
1. challenge_hash = SHA1(AuthenticatorChallenge ‖ PeerChallenge ‖ username).digest()[0:8]
2. split the 16-byte NT-hash (MD4 of the UTF-16LE password) into three 7-byte chunks,
   each expanded to 8 bytes by inserting zero parity bits  →  K1, K2, K3
3. NT-Response = DES(K1, "KGS!@#$%") ‖ DES(K2, "KGS!@#$%") ‖ DES(K3, "KGS!@#$%")   (24 bytes)
```

The step most implementations get wrong is the **challenge hash**: it concatenates the server
(Authenticator) challenge, the **peer challenge** and the username, and only then takes 8 bytes. A tool
that omits the peer challenge or the username derives different DES keys and its NT-Response will not match
the captured value — `hashcat -m 5500` (the MS-CHAPv2/NetNTLMv1 mode, which consumes
`username::::response:challenge` style material) will then fail to crack a genuinely guessable password.
The labkit implements the full derivation, and `verify-lab-artifacts.py` re-derives the captured
challenge/response pair from the documented lab password (see module 18 lab for the crack itself).

## 3. Turning a capture into an audit

After a rogue authenticator terminates PEAP (or the client is configured without validation), the
attacker has the challenge, the peer challenge, the NT-Response, and the username:

```
username::domain:server_challenge:peer_challenge:nt_response
corp\a.patel::CORP:5b5d7c7d7b3f2f3e:a1b2…:9f9b…
```

`hashcat -m 5500` (or John's `netntlm-naive`, `chap`) attacks this offline. The NT hash is `MD4` of the
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
    domain_suffix_match="radius.corp.example"     # accept only this server identity
    phase2="auth=MSCHAPV2"
    ieee80211w=2
}
```

* Without `ca_cert`, the supplicant trusts *any* certificate → rogue authenticator works.
* `domain_suffix_match` (or `subject_match`) binds the certificate to the expected server name; a valid
  certificate for another name is not enough.
* On the server side, disabling PEAP-MSCHAPv2 in favour of EAP-TLS removes the crackable material entirely;
  if PEAP must stay, enforce machine + user certificate checks and strong password policy.

## 5. Lab tasks

`eap.pcapng` contains the full PEAP identity → TLS handshake → MS-CHAPv2 challenge/response → success
exchange.

1. Identify the outer identity and the method from the outer exchange only (frames).
2. Point to where the TLS records begin and end. Why can the inner identity not be read from those frames?
3. Extract the MS-CHAPv2 challenge, peer challenge, NT-Response and username using labkit:
   `python3 -c "…"` or tshark fields — then re-derive the response from the lab password and confirm the
   maths (the same check `verify-lab-artifacts.py` performs).
4. Build a hashcat `-m 5500` line from the capture and crack it with the lab wordlist.
5. State the *precondition* that made this possible: the client did not validate the server certificate.

## 6. Decision practice

**`scn-16-method-identification`** — you see PEAP then an immediate TLS alert. What happened?
**`scn-16-cert-validation`** — the client has `ca_cert` but no `domain_suffix_match`. Still exploitable?

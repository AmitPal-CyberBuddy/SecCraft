# RADIUS Hardening, RadSec and Monitoring

## 1. Hardening checklist (server side)

| Control | Setting (FreeRADIUS 3.x style) | Why |
| --- | --- | --- |
| Integrity required | `require_message_authenticator = yes` | requires attribute 80 for applicable requests; verify it with the correct secret and current server version |
| Per-device secrets | one `client { … secret = … }` block per AP/WLC | limits blast radius; enables revocation |
| Source restriction | `client` allowlist with `ipaddr`; `nastype` is not an authentication control | narrows accepted clients; source-IP filtering alone does not authenticate a NAS |
| BlastRADIUS protection | reject requests without Message-Authenticator; do **not** proxy unsigned packets | CVE-2024-3596 class of attacks |
| Transport encryption | RadSec (TLS, TCP 2083) or IPsec | protects attributes in transit, including User-Password |
| Proxy hygiene | explicit proxy realms, no wildcard proxying | prevents leaking credentials to third parties |
| Logging | minimized authentication metadata to a protected collector; exclude passwords, key material and unnecessary identities | detection and post-incident evidence |
| Secret rotation | automated, documented, rolled to all NASes | limits the useful lifetime of a leaked secret |

CVE-2024-3596 ("BlastRADIUS") is worth understanding as a *design* lesson, not just a CVE: when a RADIUS request/response exchange lacks required integrity protections, an on-path attacker may exploit the MD5-based response authenticator to forge a response (including an Access-Accept) under the conditions of the attack. Require and validate Message-Authenticator on applicable Access-Requests and responses per the patched server/client guidance; test compatibility before enforcement. A captured unsigned packet alone does not show the server accepted it.

## 2. RadSec in one paragraph

RadSec wraps RADIUS in TLS. Both peers present certificates (mutual TLS), so the shared secret is no
longer the only authenticator of the NAS, and attributes cannot be read or rewritten in transit. Typical
deployment: the WLC/AP is a RadSec client to an internal RADIUS, or the RADIUS server proxies to a cloud
identity service over RadSec.

## 3. What good monitoring looks like

* **Per-user, per-NAS auth failure counts** — a spike can indicate guessing, stale credentials or misconfiguration; correlate reason codes and controlled baselines before assigning cause.
* **Access-Request source inventory** — any new source IP talking to the server is an alert.
* **Message-Authenticator failures** — investigate secret mismatch, corruption, misconfiguration or attack; the failure alone does not establish intent.
* **EAP method drift** — clients suddenly negotiating a weaker inner method (MD5, MSCHAPv1) is a downgrade
  signal.
* **VLAN assignment anomalies** — a user receiving an unexpectedly privileged VLAN.

## 4. Wireless + RADIUS evidence map

| Claim | Minimum evidence |
| --- | --- |
| "Credentials are exposed" | controlled tunnel endpoint/inner-method evidence and client profile/logs; separate captured verifier material from actual password recovery |
| "The shared secret is guessable" | captured request with Message-Authenticator + the candidate secret + verification |
| "The RADIUS server accepts unsigned requests" | a lab request without attribute 80 accepted by the server + the response |
| "This user got the wrong VLAN" | correlated AAA attributes + effective AP/switch session/VLAN mapping + intended policy + authorized service/route evidence |
| "The attack failed due to a control" | effective profile/configuration + endpoint rejection reason + comparable positive/negative controls; an alert alone is ambiguous |

## 5. Decision practice

Your client's APs all share one secret, and you found it in a 2019 config backup. Rank the following by
what you would recommend first, and justify: (a) rotate the secret per AP, (b) enable RadSec, (c) enable
`require_message_authenticator`, (d) enable monitoring for new NAS sources.

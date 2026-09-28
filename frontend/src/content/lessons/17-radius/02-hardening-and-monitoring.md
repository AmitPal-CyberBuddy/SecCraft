# RADIUS Hardening, RadSec and Monitoring

## 1. Hardening checklist (server side)

| Control | Setting (FreeRADIUS 3.x style) | Why |
| --- | --- | --- |
| Integrity required | `require_message_authenticator = yes` | rejects forged/unsigned requests; enables offline secret auditing only against signed packets |
| Per-device secrets | one `client { … secret = … }` block per AP/WLC | limits blast radius; enables revocation |
| Source restriction | `client` bound to IP (and `nastype`, `ipaddr`) | stops spoofed-NAS requests |
| BlastRADIUS protection | reject requests without Message-Authenticator; do **not** proxy unsigned packets | CVE-2024-3596 class of attacks |
| Transport encryption | RadSec (TLS, TCP 2083) or IPsec | protects attributes in transit, including User-Password |
| Proxy hygiene | explicit proxy realms, no wildcard proxying | prevents leaking credentials to third parties |
| Logging | full auth logs to a central collector (not the AP) | detection and post-incident evidence |
| Secret rotation | automated, documented, rolled to all NASes | limits the useful lifetime of a leaked secret |

CVE-2024-3596 ("BlastRADIUS") is worth understanding as a *design* lesson, not just a CVE: without a
Message-Authenticator requirement, an on-path attacker can modify a RADIUS request (e.g. flip the
response) because the protocol's integrity check is optional. The fix is to require it and to reject
unsigned packets.

## 2. RadSec in one paragraph

RadSec wraps RADIUS in TLS. Both peers present certificates (mutual TLS), so the shared secret is no
longer the only authenticator of the NAS, and attributes cannot be read or rewritten in transit. Typical
deployment: the WLC/AP is a RadSec client to an internal RADIUS, or the RADIUS server proxies to a cloud
identity service over RadSec.

## 3. What good monitoring looks like

* **Per-user, per-NAS auth failure counts** — a spike on one user is an online guessing attempt; a spike
  across many users on one NAS is a configuration or secret problem.
* **Access-Request source inventory** — any new source IP talking to the server is an alert.
* **Message-Authenticator failures** — either a misconfigured NAS or an attacker.
* **EAP method drift** — clients suddenly negotiating a weaker inner method (MD5, MSCHAPv1) is a downgrade
  signal.
* **VLAN assignment anomalies** — a user receiving an unexpectedly privileged VLAN.

## 4. Wireless + RADIUS evidence map

| Claim | Minimum evidence |
| --- | --- |
| "Credentials are exposed" | inner EAP capture (rogue authenticator or unvalidated client) + crack result |
| "The shared secret is guessable" | captured request with Message-Authenticator + the candidate secret + verification |
| "The RADIUS server accepts unsigned requests" | a lab request without attribute 80 accepted by the server + the response |
| "This user got the wrong VLAN" | Access-Accept attribute 81 (or a VSA) + the client's reachability evidence |
| "The attack failed due to a control" | the rejection/alert in the capture + the configuration line enforcing it |

## 5. Decision practice

Your client's APs all share one secret, and you found it in a 2019 config backup. Rank the following by
what you would recommend first, and justify: (a) rotate the secret per AP, (b) enable RadSec, (c) enable
`require_message_authenticator`, (d) enable monitoring for new NAS sources.

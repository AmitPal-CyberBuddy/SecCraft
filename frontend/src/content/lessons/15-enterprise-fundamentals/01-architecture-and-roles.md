# 802.1X Architecture and Roles

## 1. The cast

```
  Supplicant            Authenticator              Authentication server
  (client device)       (AP / WLC)                 (RADIUS)
        │                     │                            │
        │  802.11 association │                            │
        │◄───────────────────►│                            │
        │  EAPOL-Start        │                            │
        │────────────────────►│  RADIUS Access-Request     │
        │                     │───────────────────────────►│
        │  EAP Request/Response (carried in EAPOL ↔ RADIUS EAP-Message)
        │◄───────────────────►│◄──────────────────────────►│
        │                     │  Access-Accept/Reject      │
        │                     │◄───────────────────────────│
        │  EAP-Success        │                            │
        │◄────────────────────┤                            │
        │  4-way handshake (PMK = MSK[0:32] for the STA)    │
        │◄───────────────────►│                            │
        │  data on the assigned VLAN / with assigned ACLs   │
```

| Role | Examples | What it holds |
| --- | --- | --- |
| Supplicant | laptops, phones, IoT with 802.1X | credentials or certificate; TLS validation settings |
| Authenticator | AP, wireless controller | RADIUS shared secret; policy mapping of the reply |
| Authentication server | FreeRADIUS, ISE, NPS, Aruba ClearPass | identity store, certificates, per-user policy |
| Identity store | AD/LDAP, local users | the actual credential/PIN/certificate mapping |

## 2. Why the 4-way handshake still happens

EAP authenticates the *client to the network* and produces the **MSK**; both the supplicant and the
authenticator derive it. For common WPA2-Enterprise profiles, the PMK is derived from the MSK (commonly its first 256 bits), and the 4-way handshake then derives the
PTK and installs keys — the same mechanics as PSK mode, but the PMK is per-session and per-user rather than
shared. This is why you see both EAP frames *and* EAPOL-Key M1–M4 after a successful 802.1X login.

## 3. Trust boundaries and the questions a tester asks

| Boundary | Question | Failure mode |
| --- | --- | --- |
| client ↔ AP (EAP outer) | does the client verify the server's certificate? | rogue authenticator terminates PEAP, captures MS-CHAPv2 |
| AP ↔ RADIUS | how strong and how scoped is the shared secret? | offline guessing of the secret from captures; any host can act as a NAS |
| RADIUS ↔ identity store | are credentials checked per user, with lockout? | shared accounts, no lockout → online brute force |
| RADIUS reply → network | is the assigned VLAN/ACL actually enforced? | dynamic VLAN assignment trusted but not enforced; ACL missing |
| Client profile | are legacy/insecure methods offered? | EAP-MD5/LEAP negotiated, password exposure |

## 4. Design properties that make enterprise Wi-Fi *good*

* **Per-user credentials** with no shared secret among users; disabling an account removes access.
* **Server certificate validation** on the client (`ca_cert`, `domain_suffix_match`) so the network must
  prove its identity before the client reveals anything.
* **EAP-TLS** (mutual certificates) where the fleet supports it — no password to capture or crack.
* **PMF required** for management-frame protection, independent of the EAP method.
* **Dynamic VLAN + ACL** from RADIUS, enforced by the AP and the wired switch, not merely logged.
* **Monitoring**: failed-auth rates per user/NAS, rogue authenticator detection, secret rotation.

## 5. Lab

**Artifact boundary:** `enterprise.pcapng` is an abbreviated synthetic EAPOL/EAP fixture with structural TLS-like bytes and an inserted lab MSK; it is not a complete PEAP/TLS authentication. `radius.pcapng` is a separate synthetic RADIUS exchange with example attributes/authenticators; it is not linked to the enterprise capture and does not prove deployed policy or VLAN enforcement.

1. Draw the message flow for the capture (roles, frames, protocols).
2. Identify the outer identity and explain why `anonymous@corp.example` is used.
3. Identify the example RADIUS VLAN attribute, and explain why an Access-Accept/handshake in synthetic captures does not prove an AP or switch enforced the policy.
4. List three questions you would ask the client about their 802.1X deployment before testing further.

## 6. Decision practice

**`scn-15-which-component`** — a client fails to authenticate. Where do you look first, and what evidence
distinguishes a client-side certificate problem from a RADIUS-side policy problem?

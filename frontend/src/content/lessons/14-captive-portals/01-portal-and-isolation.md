# Portal Testing and Client Isolation (Lab)

> Artifact: `captive-portal.pcapng` — 17-frame deterministic simulation of an open `Guest-WLAN`, a DHCP DORA exchange, HTTP redirect/POST/response, and a client-to-client ARP request/reply forwarded through the simulated AP. It is not a running portal or a live network capture.

## 1. Reconstruct the fixture

| Frames | Observation |
| --- | --- |
| 1–5 | Open BSS beacon, authentication and association |
| 6–9 | DHCP Discover, Offer, Request and ACK |
| 10–11 | HTTP connectivity-check GET and 302 redirect containing a portal URL |
| 12–13 | HTTP POST with lab-only form values and an HTTP response with a session cookie |
| 14–17 | ARP request/reply forwarded between two guest stations by the simulated AP |

The HTTP and cookie bytes are visible because the fixture is an open BSS and the application flow uses HTTP. The example does **not** implement server-side authentication, session validation, a real MAC-bound authorization check, or a working MAC-spoof bypass. The URL contains a MAC value; that alone is not evidence that the portal trusts it.

## 2. Distinguish the controls

| Control | What it enforces | Evidence to collect in a real scoped test |
| --- | --- | --- |
| Client isolation (`ap_isolate=1`) | Prevents station-to-station forwarding through the AP | Controlled two-client traffic in both directions and AP/config evidence |
| VLAN separation | Distinct L2 broadcast domains | Address/prefix, gateway, VLAN assignment and ARP behavior |
| Inter-VLAN ACL/firewall | Explicit routed traffic policy | Approved source/target/service tests plus rule/config evidence |
| Portal authorization | Whether a client has a valid session | Server-side policy/logs, token lifecycle and controlled negative tests |

The four ARP frames in this fixture model an AP forwarding an exchange between two stations. They are evidence about the *fixture*, not proof of an AP configuration or of a production isolation setting. A real finding needs a controlled pair of clients and confirmation of what the AP/router forwarded.

## 3. Lab tasks

```bash
tshark -r captive-portal.pcapng -Y 'http' \
  -T fields -e frame.number -e http.request.method -e http.response.code -e http.location -e http.cookie
tshark -r captive-portal.pcapng -Y 'bootp' -T fields -e frame.number -e bootp.option.dhcp
tshark -r captive-portal.pcapng -Y 'arp' -T fields -e frame.number -e arp.opcode -e arp.src.proto_ipv4 -e arp.dst.proto_ipv4
```

1. Reconstruct DHCP and the HTTP request/response sequence by frame number. Which lab-only values appear in plaintext?
2. What additional server-side evidence would be required to claim the session is bound only to a spoofable MAC or can be hijacked?
3. What do frames 14–17 show in this simulated topology? What would you collect to prove a real client-isolation failure?
4. Keep portal credential exposure, client isolation and inter-VLAN reachability as separate findings with separate evidence.
5. Design a safe retest that proves the fix while preserving authorized guest portal access.

## 4. Remediation themes

Use HTTPS-only portal flows with HSTS and strong server-side session controls; do not treat a MAC address as an authenticator. Configure client isolation and guest VLAN ACLs independently, then retest each with controlled endpoints. OWE can add link-layer confidentiality to an otherwise open guest experience where supported; it does not replace portal or network access controls.

**Decision practice:** `scn-14-isolation-vs-segmentation` — identify the control actually tested and the evidence still needed.
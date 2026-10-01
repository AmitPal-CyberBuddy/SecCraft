# Define the Boundary Before Testing a Path

> **Available now: offline policy and evidence practice.** WF-BOUND-06 models two clients and named services; it is not a running network. Hosted execution is unavailable. Association, VLAN placement, ACL enforcement and application access remain **NOT TESTED**.

## Replace “internal access” with an exact question

A guest client's ping receives a response. Does that mean a firewall failed, a corporate application accepted a request or an administrator account was reached? None of those follows automatically. Start with a source, destination, direction, protocol, port, intended action and explicit authorization.

Download the [WF-BOUND-06 ZIP](/wireless-practice/WF-BOUND-06.zip), read the [scope](/wireless-practice/WF-BOUND-06/scope.md), and open the [fictional topology](/wireless-practice/WF-BOUND-06/topology.json), [flow requests](/wireless-practice/WF-BOUND-06/flows.json) and [authorization record](/wireless-practice/WF-BOUND-06/authorization.json). Use the [worksheet](/wireless-practice/WF-BOUND-06/worksheet.md) throughout this phase. Verify extracted files against SHA256SUMS; matching bytes do not establish real collection or permission.

## Map independent controls

| Boundary | Question | Evidence not interchangeable with it |
| --- | --- | --- |
| Wireless authentication | Did the intended client complete the required method? | a beacon, address assignment or offline password match |
| Placement | Which actual VLAN/zone/session policy was applied? | an IP subnet or an Access-Accept attribute alone |
| Peer isolation | Can controlled clients exchange traffic through the relevant path? | success or failure on a different routed service |
| Routed service policy | Is this source/service/direction permitted at the actual enforcement point? | a generic ping or a configured rule without runtime context |
| Application authorization | Can this identity perform the permitted operation on this service? | TCP connect, HTTP status or a login page alone |

The topology's VLAN values are **owner assertions within a fiction**. A real assessment needs effective AP/controller/switch assignment and route evidence. Do not deduce a VLAN from address appearance. NAT, a proxy, a second interface, VPN or a different return route can change the path you think you tested.

## Make the permission narrower than the story

F1–F7 define a future scoped client-to-service request on TCP/443. The two clients have different intended entitlements; corporate membership does not authorize management-console access. F8 changes to UDP/53. Even if the service name or address is familiar, its old permission does not follow that changed request.

Create a flow table before looking at the public guide. Distinguish “owner permits this bounded test” from “network policy should permit the traffic”. Testing a deny rule can be authorized; that does not make the tested path allowed by business policy. Equally, one reachable corporate service can be an intended exception rather than a vulnerability.

The service names are non-resolvable teaching aliases. These documents do not authorize scanning, contacting addresses found in a capture, expanding ports, using real credentials or attempting sensitive operations. Stop at a scope mismatch, uncertainty about identity, the agreed time/request ceiling or unintended impact.

## Inspect the separate packet example

Use the [corporate fixture](/wireless-practice/WF-BOUND-06/corporate-attacks.pcapng) or [decoded view](/wireless-practice/WF-BOUND-06/corporate-attacks.json). Frames 18–19 encode an ICMP request/reply between different IP subnets. Cite the file/hash and frame numbers, then explain why this does not establish a VLAN, a missing ACL, application access or a complete attack chain.

On your own computer, a read-only view is:

```bash
tshark -r corporate-attacks.pcapng -Y icmp \
  -T fields -e frame.number -e ip.src -e ip.dst -e icmp.type
```

No packets are sent by this command. The browser simulator cannot execute it; decoded JSON is an alternative, not independent confirmation. This capture is unrelated to the new model's clients and service observations.

## Deliver a scoped map

Record each boundary's owner, intended policy, evidence needed and stop rule. Include a deliberate STOP for F8 and at least one unsupported-impact claim you reject. Review the [public guide](/wireless-practice/WF-BOUND-06/review-guide.md) after drafting. The next lesson calculates a policy model, not a real firewall or route test.

## Expand a real boundary inventory beyond this teaching model

WF-BOUND-06 intentionally models named TCP services only. A future authorized assessment also asks about IPv6 routes/ACLs, neighbor discovery, multicast/broadcast, peer isolation across APs or SSIDs, DNS/DHCP infrastructure, and stale roles after roaming, reconnect or reauthentication. IPv4 restrictions do not automatically describe IPv6 behavior; a portal session does not establish every forwarding rule.

Record each as an explicit additional source/destination/protocol/direction and authorization question. Do not add it to the calculator or scan it without permission: these paths and state transitions are **NOT TESTED** by the supplied stateless model. Prefer a separate controlled case to pretending F1–F7 cover an entire network.

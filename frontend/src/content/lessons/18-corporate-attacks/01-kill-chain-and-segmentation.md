# Kill Chain and Segmentation Testing (Lab)

> Artifact: `corporate-attacks.pcapng` — 19-frame deterministic simulation. It contains management frames, a PSK look-alike BSS, a real-MIC WPA-Personal handshake using the documented lab PSK, a direct synthetic EAP-MSCHAPv2 exchange, and an ICMP echo/reply pair. **It does not contain DHCP, DNS, a PEAP/TLS tunnel, RADIUS packets, certificate-validation evidence or a complete production attack chain.**

## 1. Separate supported observations from the story

| Frames | Evidence in this fixture | Limit |
| --- | --- | --- |
| 1–3 | Corp, Guest and IoT beacons | No authorized inventory is supplied; SSID/BSSID alone does not establish ownership or ESS membership |
| 4 | One deauthentication frame sourced from the Corp BSSID | Does not prove an attacker injected it or that a client accepted it; PMF behavior is not tested |
| 5–6 | Same-SSID PSK look-alike beacon and a directed probe | Supports a look-alike observation, not proof of a rogue AP or a causal “lure” |
| 7–10 | Authentication and association with the look-alike | A simulated client exchange only |
| 11–14 | EAPOL-Key M1–M4 with lab-derived MICs | Supports verification of the published lab PSK, not a real client credential finding |
| 15–17 | Direct EAP-MSCHAPv2 challenge/response/success packets | Intentionally simplified; not a faithful PEAP/TLS exchange. The inner method would normally be protected by the outer TLS tunnel |
| 18–19 | Simulated ICMP echo request/reply between different IP subnets | Shows the fixture’s packet sequence only; no real VLAN, ACL or network reachability was tested |

A synthetic EAP-MSCHAPv2 response is not evidence that a production PEAP client failed to validate a server certificate. This artifact has no PEAP/TLS transcript or RADIUS exchange. Use `eap.pcapng`, `radius.pcapng` and their lessons for the separate protocol/configuration exercises, while preserving their own simulation limits.

## 2. Segmentation: test the control, not just a ping

In a real authorized engagement, record the client interface address/prefix, route, exact target, source and destination, and a simultaneous capture. Confirm the VLAN and enforcement point with the network owner. A successful ICMP response proves only that the particular request was answered; it does not by itself prove a missing ACL, access to sensitive services, or a general segmentation bypass.

```bash
tshark -r corporate-attacks.pcapng -Y 'icmp' \
  -T fields -e frame.number -e ip.src -e ip.dst -e icmp.type
```

## 3. Lab tasks

1. Reconstruct only the observations in the table, with frame numbers.
2. Explain why the direct EAP-MSCHAPv2 fixture is not proof of PEAP certificate-validation failure.
3. Verify the weak lab PSK only as a lab value; distinguish it from any client credential.
4. State what a real inter-VLAN finding would require beyond an ICMP request/reply: authorized source/target, route/VLAN context, ACL evidence, repeatability and scope.
5. Rewrite a “full kill chain succeeded” claim as a bounded statement supported by this fixture.

## 4. Safer assessment sequence

Obtain written scope and rules of engagement; use passive evidence first; test only controlled lab clients; separate wireless authentication, RADIUS policy and network segmentation; stop when the approved impact boundary is reached; and report each demonstrated link with its own evidence and limits. The interactive attack/defense panel is a scripted local illustration, not a live attack or a validated retest.

**Decision practice:** `scn-18-chain-order` and `scn-18-segmentation-evidence` — identify which steps are evidenced, which are merely hypothesized, and what safe retest would close the gap.
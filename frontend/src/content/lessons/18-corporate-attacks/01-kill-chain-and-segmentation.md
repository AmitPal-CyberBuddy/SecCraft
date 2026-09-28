# Kill Chain and Segmentation Testing (Lab)

> Artifact: `corporate-attacks.pcapng` — 19 frames: legitimate `Corp-WLAN` (802.1X, PMF required) and a
> rogue twin with the lab's weak PSK, a client lured to the twin, PEAP credential capture, DHCP, DNS and a
> cross-segment ICMP exchange showing a segmentation gap.

## 1. Chain every link to the evidence that proves it

| Link | Observation | Artefact (this capture) |
| --- | --- | --- |
| 1. Recon | `Corp-WLAN` enumerated with its RSNE and clients | beacon frames, probe requests |
| 2. Pressure | deauth/disassoc frames from the twin | reason-coded frames, timing |
| 3. Impersonation | twin BSS with the same SSID, different BSSID/RSNE/fingerprint | beacon comparison |
| 4. Association | client moves to the twin | auth/assoc frames to the rogue BSSID |
| 5. Credential capture | PEAP → MS-CHAPv2 material | EAP exchange frames |
| 6. Offline crack | password recovered from the material | hashcat output (lab) |
| 7. Access | client joined the rogue network (PSK), gets DHCP | DHCP exchange |
| 8. North-south | cross-segment reachability | ICMP frames to a different subnet |

Each link needs its own evidence; a chain is not proven by showing only its last step.

## 2. Segmentation: test the claim, not the feeling

"How do I know I am on a different segment?" — use protocol-level evidence:

```bash
# from the compromised client (lab)
ip -4 addr show                                  # address + prefix (which subnet am I on?)
ip route                                          # default gateway, on-link routes
ping -c 3 <target-in-other-subnet>                # ICMP echo: does it route?
# capture at the same time, then:
tshark -r corporate-attacks.pcapng -Y 'icmp' -T fields -e frame.number -e ip.src -e ip.dst -e icmp.type
```

Defensible statement: *"ICMP echo requests from 192.168.10.23 (guest VLAN) to 10.20.0.5 (server VLAN)
were answered; the reply frames (13–14) show L3 reachability across the boundary — the VLANs are separated
but no ACL restricts this path."* Vague statements ("we had access") are not findings.

## 3. Isolation vs. segmentation vs. ACL

Test all three explicitly, because they are different controls owned by different teams:

1. **Client isolation** — guest-to-guest ARP/ICMP through the AP.
2. **VLAN separation** — are you in a different L2 broadcast domain? (ARP for a host on the other VLAN
   should fail.)
3. **Inter-VLAN ACL** — even with separated VLANs, is traffic permitted? (TCP/UDP reachability, not just
   ICMP.)

## 4. Impact discipline

Recovered credentials and a rogue network do not imply domain compromise. State what you *demonstrated*:
access to which L2/L3, which services responded, and what would be required for the next step (that you
did not take, because it was out of scope). Overstating impact is the fastest way to lose a client's trust
and a report's credibility.

## 5. Tasks

1. Reconstruct the chain with frame numbers, one row per link as above.
2. Identify the exact frame where the client's traffic leaves the legitimate infrastructure.
3. Prove (or disprove) segmentation with frame-level evidence; state the limits of your test.
4. Propose one control per link and say which link each control breaks.
5. Rewrite the weakest sentence in your draft report as an evidence-backed statement.

## 6. Decision practice

**`scn-18-chain-order`** — sort the eight links into the order you would attempt them, and say what makes a
link untestable in a given engagement.
**`scn-18-segmentation-evidence`** — which of these counts as evidence: a screenshot of `ip addr`, a ping
success, an ICMP capture, a switch config? Justify.

# Portal Testing and Client Isolation (Lab)

> Artifact: `captive-portal.pcapng` — open `Guest-WLAN`, DHCP, HTTP 302 redirect, cleartext POST,
> session cookie, and a client-to-client ARP exchange showing isolation is **not** enforced.

## 1. Portal flow and where it breaks

```
client ──DHCP──► gateway (10.0.0.1)
   │
   ├─ DNS/HTTP to any destination ──► interception (302 to portal host)
   ├─ GET /login (HTTP) ──► credential form served over cleartext
   ├─ POST /login username=…&password=… ──► credentials visible on the air
   └─ Set-Cookie: session=… ──► session tied to MAC/token, often weak
```

Findings to look for, in order of consequence:

1. **Credentials over cleartext HTTP** — capturable by anyone on the open BSS (and by a twin).
2. **Session fixation / MAC-bound sessions** — a replayed MAC or token can hijack an authenticated session;
   a portal that authorises by MAC address can be bypassed by spoofing an authenticated client's MAC
   (trivially observable in the clear, since an open BSS exposes every MAC).
3. **Portal bypass via direct IP/alternative ports** — enforcement implemented with DNS/HTTP redirection
   only, leaving other protocols open.
4. **No encryption for guest traffic** — an open BSS means every payload is readable; OWE fixes the L2
   confidentiality without changing the user experience.
5. **Client isolation absent** — guests can attack each other (ARP spoofing, SMB, mDNS scanning).

## 2. Isolation is not segmentation

| Control | What it enforces | Test |
| --- | --- | --- |
| Client isolation (`ap_isolate=1`) | no client-to-client frames forwarded through the AP | ARP/ICMP between two guest clients |
| VLAN separation | guest traffic and corporate traffic are different L2 broadcast domains | can a guest reach a corporate host/l3? |
| ACL/firewall between VLANs | explicit inter-VLAN policy | TCP/UDP reachability to corporate subnets, not just ping |
| NAC/802.1X on the wired side | device-level admission | out of wireless scope |

Isolation and segmentation are independent: a guest network can be isolated between guests yet still reach
the corporate VLAN, and vice versa. Test both, and report them as separate findings.

## 3. Lab tasks

```bash
tshark -r captive-portal.pcapng -Y 'http.request' -T fields -e frame.number -e http.request.method -e http.host -e http.request.uri
tshark -r captive-portal.pcapng -Y 'http.request.method == "POST"' -T fields -e frame.number -e http.file_data
tshark -r captive-portal.pcapng -Y 'arp' -T fields -e frame.number -e arp.src.proto_ipv4 -e arp.dst.proto_ipv4
```

1. Reconstruct the portal flow with frame numbers and mark where credentials appear in cleartext.
2. Identify the session token and the mechanism that binds it (cookie, MAC). What would you test to prove
   hijacking in a lab with two clients you own?
3. Which frames prove isolation is off? What would the capture look like if `ap_isolate=1` were set?
4. Write the two findings separately (credential exposure; missing isolation) with distinct impacts.
5. Design the retest: which frames must disappear, and which must still work (portal access)?

## 4. Remediation

```
# hostapd — isolate clients, keep the portal reachable
ap_isolate=1
# guest SSID: encrypted, not open
wpa=2
wpa_key_mgmt=OWE
ieee80211w=2
```

Plus: HTTPS-only portal with HSTS, tokens bound to a strong server-side session (not to a spoofable MAC),
open-flow enforcement at the switch/router (not just DNS/HTTP redirection), and a guest VLAN with an
explicit deny to internal ranges.

## 5. Decision practice

**`scn-14-isolation-vs-segmentation`** — guests are isolated from each other but can ping a corporate
server. Which finding is it, and what evidence do you need?

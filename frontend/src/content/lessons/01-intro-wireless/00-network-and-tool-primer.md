# Before the Radio: Networking and Evidence Primer

> Start here if `tshark`, IP subnets or a shell are unfamiliar. This is a *readiness bridge*, not a prerequisite claim that everyone already knows these terms. All exercises below are offline and safe; no adapter or credentials are needed.

## A packet has more than one address

A **MAC address** names an interface on a local link; an 802.11 BSSID identifies a BSS, not an Internet host. An **IP address** identifies an endpoint within an IP routing context; a **subnet/prefix** identifies which addresses are on a local network. A **port** and **protocol** identify an application conversation. An AP may bridge a client to a wired VLAN, but seeing the same SSID, a DHCP lease or an ICMP reply does not establish that the VLAN or firewall rules are correctly enforced.

Example: `10.20.30.17/24` is within `10.20.30.0/24`; `10.20.31.17` is not. To claim that guest access to the latter is blocked, test from an authorized guest endpoint against an approved target, document the route, and check both the client result and enforcement logs. One unanswered ping could instead mean a missing route, host firewall or offline target.

**Check yourself:** Is `192.0.2.44/24` in the same /24 as `192.0.3.44`? No: the first 24 bits differ. Do not infer segmentation from this calculation alone.

## Read a stored capture without a radio

Download the linked PCAP from the lab or use a local checkout; paths below assume the repository root. `tshark` is Wireshark's optional command-line program, not installed by the academy. If unavailable, open the PCAP in Wireshark and apply the same display filters. `-r` **reads** a file (does not transmit); `-Y` selects displayed packets; `-T fields` prints selected fields. A *display filter* does not change the saved raw capture.

```bash
f=frontend/public/pcaps/wifi-fundamentals/beacon-only.pcapng
sha256sum "$f"                       # preserve artifact identity
# Optional after installing tshark locally:
tshark -r "$f" -Y 'wlan.fc.type_subtype == 8' \
  -T fields -e frame.number -e wlan.bssid -e wlan.ssid
```

If `tshark` is absent, use the browser's existing capture viewer or Wireshark. **Do not invent terminal results.** The same frame number can mean something different in another file: always cite the filename and SHA-256. `pcapng` is a capture container; the radiotap header describes receiver-side radio metadata; the 802.11 header and its information elements contain the protocol fields. A receiver's signal value is not proof of a transmitter's location or ownership.

## One complete reasoning loop

Suppose a beacon displays SSID `LAB-WIFI`, BSSID `00:11:22:33:44:55`, channel 6 and PSK in its RSN element. **Observation:** the AP advertises PSK on that BSS in that frame. **Mechanism:** a beacon announces options before a particular client negotiates and installs keys. **Alternative:** a different BSSID could use the same name and other policy. **Decision:** inventory this BSSID; inspect a client association/handshake only if its behavior is in scope. **Not proved:** password strength, who owns the AP, which users joined or whether a VLAN is isolated.

Deliverable: write a two-column table, “frame-supported claim” and “requires another test,” for the beacon. Include capture hash, filter, frame number and one reason a missing packet is not proof of absence. Compare with the module 02 verified beacon activity; do not claim a verified score from reading this page.

## Ready for the next lessons?

You should be able to distinguish MAC/BSSID from IP address, SSID from ESS membership, capture from transmission, a display filter from a modified raw file, and an observation from an impact claim. If not, repeat the table before using the later protocol shorthand. Local quizzes are self-checks, not professional certification.

# Rogue Infrastructure Analysis (Lab)

> Artifact: `rogue-ap.pcapng` — legitimate `Corp-WLAN` (802.1X, PMF required, 5 GHz) and a twin on 2.4 GHz
> with a locally-administered BSSID, PSK security, a 50 TU beacon interval and a much stronger signal.

## 1. Two different things are called "rogue AP"

* **Rogue AP**: unauthorised hardware connected to the corporate network (a risk to *your* network from
  *their* device). Detected by wired-side correlation, not by RF alone.
* **Evil twin / rogue authenticator**: an AP impersonating your SSID to capture clients (a risk to
  *clients*). Detected by comparing twins with the authorised BSS list and IE fingerprints.

Report which one you tested. They have different impacts and different remediation owners.

## 2. How to tell a twin from a legitimate peer in a capture

| Signal | Legitimate ESS member | Twin |
| --- | --- | --- |
| BSSID OUI | vendor OUI, consistent with hardware | often locally administered (bit 1 of first octet set) |
| RSNE | matches the rest of the ESS | different AKMs/ciphers (e.g. PSK where the ESS is 802.1X) |
| IE fingerprint | same HT/VHT/HE, ext caps, vendor IEs | different capability set, missing/extraneous vendor IEs |
| Channel/band | planned channel plan | unexpected channel/band (2.4 GHz twin of a 5 GHz ESS) |
| Beacon interval | typical 100 TU | unusual (50 TU to be discovered faster) |
| Signal | consistent with the site plan | implausibly strong next to the client |

No single signal is proof. Build the case from several, and correlate with client behaviour
(deauth → probe → association to the twin → DHCP from an unexpected server).

## 3. Why clients join a twin

* **Auto-connect** to a stored SSID, with no server authentication in PSK mode.
* **PNL leakage** tells the attacker which SSID to impersonate.
* **Enterprise clients without certificate validation** accept any RADIUS server, letting a rogue
  authenticator terminate PEAP and capture MS-CHAPv2 (module 16).
* Aggressive deauth/beacon flooding can push clients off the legitimate BSS — which is why the RoE must
  define what is permitted.

## 4. Lab tasks

```bash
tshark -r rogue-ap.pcapng -Y 'wlan.ssid == "Corp-WLAN"' \
  -T fields -e frame.number -e wlan.bssid -e wlan.ds.current_channel \
  -e wlan.rsn.akms.type -e wlan.rsn.capabilities.mfpr -e wlan.fixed.beacon
```

1. List both BSSIDs and contrast their RSNE, channel, beacon interval and BSSID administration bits.
2. Find the frames where the client leaves the legitimate BSS and associates with the twin. Which frame
   triggered the move?
3. Identify the DHCP server the client received a lease from. Why is that a strong indicator even without
   knowing the client's config?
4. The client completes a 4-way handshake with the twin using the lab's weak PSK. What does that let the
   attacker do to the client's traffic, and what does it *not* give them?
5. Write the finding twice: once for the client-impersonation risk and once for the network-side rogue
   risk. Note who owns each remediation.

## 5. Remediation and detection

* **Prevent**: PMF required + PMF-capable clients; WPA3-only where possible; enterprise clients configured
  with `ca_cert` + `domain_suffix_match` so a rogue authenticator cannot complete TLS.
* **Detect**: WIDS/WIPS with an authorised BSSID/IE baseline, RF triangulation, wired-side correlation
  (switch MAC tables), and alerting on deauth floods.
* **Respond**: kill switch port, revoke the rogue authenticator's reachability, force re-authentication of
  affected clients, rotate any captured credentials (assume compromise).

## 6. Decision practice

**`scn-13-twin-detection`** — one SSID, three BSSIDs. Which is the twin, and what confirms it?
**`scn-13-enterprise-rogue`** — does an enterprise client with certificate validation connect? Why not?

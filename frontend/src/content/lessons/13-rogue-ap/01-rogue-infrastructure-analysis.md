# Rogue Infrastructure Analysis (Lab)

> Artifact: `rogue-ap.pcapng` — 20-frame deterministic simulation. It contains a `Corp-WLAN` beacon on BSSID `de:ad:be:ef:00:01` (channel 36) and a same-SSID BSS on locally administered BSSID `02:11:22:33:44:55` (channel 6). The latter advertises PSK rather than 802.1X, uses a 50 TU beacon interval, and has a stronger *simulated* signal value.

## 1. Name the claim precisely

“Rogue AP” can mean unauthorised infrastructure attached to an organization’s wired network, or an impersonating BSS intended to attract clients. An over-the-air capture can reveal a look-alike BSS and client behavior; it cannot establish who owns the AP or whether it is connected to a corporate switch. That requires an authorized BSSID/site baseline and wired-side correlation.

A matching SSID and different BSSID do **not** prove that two BSSs belong to one ESS—or that either is malicious. Compare the authorized inventory, RSN/AKM, channel plan, information-element profile, and deployment context. Signal level and a locally administered MAC are clues, not proof.

## 2. Reconstruct what the fixture shows

| Frames | Observation |
| --- | --- |
| 1–2 | Two same-SSID `Corp-WLAN` beacons with different advertised security/profile fields (look-alike signals; ownership is unknown) |
| 3–4 | Two deauthentication frames addressed to the client, sourced from the reference BSSID in this fixture |
| 5–6 | Client directed probe request and response from the twin |
| 7–10 | Authentication and association with the twin |
| 11–14 | Complete EAPOL-Key exchange with the documented weak lab PSK |
| 15–18 | DHCP DORA exchange through the simulated twin; an ACK is present |
| 19–20 | HTTP GET and a synthetic portal-form response |

The sequence shows that the client later associates with the look-alike; timing alone does not prove the deauthentication caused the move. These packet records do not demonstrate that a real transmitter delivered the frames, that the client trusted the network, or that the AP served a real portal.

## 3. Lab tasks

```bash
tshark -r rogue-ap.pcapng -Y 'wlan.ssid == "Corp-WLAN"' \
  -T fields -e frame.number -e wlan.bssid -e wlan.ds.current_channel \
  -e wlan.rsn.akms.type -e wlan.rsn.capabilities.mfpr
tshark -r rogue-ap.pcapng -Y 'bootp' -T fields -e frame.number -e bootp.option.dhcp
tshark -r rogue-ap.pcapng -Y 'http' -T fields -e frame.number -e http.request.method -e http.response.code
```

1. List the two BSSIDs and contrast their advertised AKM, channel and beacon interval. Which observations require an authorized baseline before you can call one BSS unauthorized?
2. Trace deauthentication, probing, association and handshake by frame number. State why you cannot infer causation from order alone.
3. Verify the DHCP message sequence and ACK. What does the synthetic lease show, and what does it not establish about an actual client/network?
4. State what a verified weak PSK would permit for that BSS; do not claim access to other networks or clients without separate evidence.
5. Write a bounded observation or no-finding conclusion about the client association. Separately describe what authorized inventory and wired-side evidence would be needed before reporting unauthorized network infrastructure.

## 4. Controls and limits

Use an authorized BSSID/IE baseline, wired-side switch correlation, managed-client certificate validation for Enterprise Wi-Fi, and a documented response process. PMF and WPA3-only can reduce specific attack paths; they do not authenticate an arbitrary PSK network to a client. All actions in this local fixture are simulated; no RF frames are sent.

**Decision practice:** `scn-13-twin-detection` — identify the look-alike signals, then state what evidence would falsify the conclusion.
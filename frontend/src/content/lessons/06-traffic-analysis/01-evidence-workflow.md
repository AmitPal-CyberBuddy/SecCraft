# From Capture to Evidence (Lab)

> Artifact: `traffic-analysis.pcapng` — 21 frames. **Deterministic teaching simulation, not an RF capture.**

## 1. What this fixture contains

| Frames | Contents |
| --- | --- |
| 1 | `LAB-WIFI` beacon, BSSID `00:11:22:33:44:55`, channel 6, RSN advertises PSK/CCMP |
| 2–3 | Probe request and probe response |
| 4–5 | Open-system authentication request/response |
| 6–7 | Association request/response |
| 8–11 | EAPOL-Key M1–M4; MICs are computed from the documented lab PSK |
| 12–15 | DHCP Discover, Offer, Request and ACK |
| 16–17 | ARP request/reply |
| 18–19 | ICMP echo request/reply |
| 20–21 | DNS query and HTTP GET |

The frames after the handshake are intentionally **unprotected** in this fixture. That is visible in the 802.11 Protected bit. They are not valid evidence that a real CCMP-protected association accepted plaintext traffic, nor that an AP decrypted or forwarded it. Treat them as a prompt to inspect the protection bit and to state the simulation limit—not as proof of a production-network weakness.

## 2. The evidence contract

For every report claim, record the smallest reproducible evidence set:

| Field | Example |
| --- | --- |
| Claim | “The fixture contains a complete EAPOL-Key exchange” |
| Capture | `traffic-analysis.pcapng`, SHA-256 from `frontend/public/pcaps/MANIFEST.md` |
| Filter | `eapol.type == 3` |
| Frames | 8 (M1), 9 (M2), 10 (M3), 11 (M4) |
| Interpretation | M2 carries a MIC that permits offline candidate verification; M4 has MIC and Secure flags, not an ACK frame |
| Limit | This deterministic PCAP is synthetic; it does not establish RF delivery, AP acceptance, or real-client behavior |

## 3. Reproduce the view

```bash
tshark -r traffic-analysis.pcapng -Y 'wlan.bssid == 00:11:22:33:44:55'
tshark -r traffic-analysis.pcapng -Y 'eapol.type == 3' \
  -T fields -e frame.number -e eapol.keydes.key_info -e eapol.keydes.replay_counter
tshark -r traffic-analysis.pcapng -Y 'bootp' -T fields -e frame.number -e bootp.option.dhcp
tshark -r traffic-analysis.pcapng -Y 'wlan.fc.protected == 1' -T fields -e frame.number -e wlan.fc.protected
```

## 4. Tasks

1. Reconstruct probe, authentication and association from frames 2–7.
2. Classify M1–M4 using key-information flags and replay counters. M1 sets ACK; M4 carries MIC and Secure. Which message carries the MIC used for a PSK candidate check?
3. Explain why M1+M2 can support an offline WPA-Personal candidate audit, and what M3/M4 add to the exchange.
4. Which frames have the Protected bit set? Why must a beacon’s advertised CCMP suite not be confused with proof that every captured data frame is encrypted or accepted?
5. Write a two-sentence evidence-limit statement that distinguishes packet bytes in this fixture from a real engagement capture.

## 5. Reporting extract

Use the bundled hash manifest and capture verifier for reproducible artifact metadata. Do not reuse a placeholder digest or present the lab passphrase as a client finding. Any assessment of a real network must be supported by an authorized capture, scope and passphrase policy evidence.

**Decision practice:** `scn-06-which-frames` and `scn-06-encrypted-or-not` — choose minimum evidence and justify claims from the actual frame flags.
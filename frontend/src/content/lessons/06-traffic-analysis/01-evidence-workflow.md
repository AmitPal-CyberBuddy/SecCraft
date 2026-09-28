# From Capture to Evidence (Lab)

> Artifact: `traffic-analysis.pcapng` (12 frames, **SIMULATION**).

## Objective

Turn a capture into **evidence**: the smallest set of frames that proves one claim, reproducible by a
third party with the same filter, plus an explicit statement of what the evidence does not show.

## 1. The evidence contract

A finding is only as good as its artefacts. For each claim record:

| Field | Example |
| --- | --- |
| Claim | "Clients can complete a 4-way handshake with a weak PSK" |
| Capture | `traffic-analysis.pcapng`, SHA-256 `…` |
| Filter | `eapol.type == 3` |
| Frames | 9 (M1), 10 (M2), 11 (M3), 12 (M4) |
| Interpretation | M2/M4 carry MICs derived from the PSK; the PSK is in the provided wordlist |
| Limit | The capture does not show what the client transmitted after association (payload encrypted) |

## 2. Isolation is the skill

Beginners list everything they see. Professionals isolate *one* conversation:

```bash
# one BSS, one client
tshark -r traffic-analysis.pcapng -Y 'wlan.bssid == aa:bb:cc:dd:ee:ff'
# the handshake only
tshark -r traffic-analysis.pcapng -Y 'eapol.type == 3' \
  -T fields -e frame.number -e eapol.keydes.key_info -e eapol.keydes.replay_counter
# metadata vs. content: what is actually readable?
tshark -r traffic-analysis.pcapng -Y 'wlan.fc.protected == 1' -T fields -e frame.number -e wlan.fc.protected
```

Ask of every frame: *which claim does this prove, and what is the alternative explanation?*

## 3. Tasks

1. Identify the association state machine: frame numbers for probe, auth (both directions), association
   (both directions).
2. Identify M1–M4 by their key-information flags (ACK/MIC/Install/Secure) and replay counters. Which
   message proves the client knows the PSK?
3. Why is a capture with **only M1+M2** still usable for an offline audit, and what does M3/M4 add?
4. Decode the confidentiality claim: which frames contain clear-text IP payloads, and why are they
   clear text even though the BSS advertises CCMP? (Answer with the frame numbers and the protected bit.)
5. Write the "limits" statement for this capture.

## 4. Reporting extract

```
Finding F-01 — WPA2-PSK network accepts a weak passphrase (lab reproduction)
Evidence
  • traffic-analysis.pcapng (SHA-256 3f9c…), frames 9–12: complete EAPOL-Key M1–M4 exchange
  • Filter used: eapol.type == 3 (reproducible)
  • Offline audit: hcxpcapngtool -o audit.hc22000 traffic-analysis.pcapng &&
    hashcat -m 22000 audit.hc22000 wordlists/wififorge-lab-psk.txt --show
Impact
  • Any party within RF range can perform this audit offline, without touching the network again.
  • The recovered PSK grants L2 access to the BSS and any trust placed in that L2 (no per-user identity).
Limit
  • The passphrase is the lab value published in the manifest; severity must be re-derived against the
    client's real passphrase policy and the value of the data reachable on that L2.
```

## 5. Decision practice

**`scn-06-which-frames`** — pick the minimal evidence set for three different claims.
**`scn-06-encrypted-or-not`** — is this frame readable? Justify from the protected bit and key state.

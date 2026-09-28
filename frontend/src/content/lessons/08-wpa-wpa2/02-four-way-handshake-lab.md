# Reading the 4-Way Handshake (Lab)

> Artifact: `wpa2-handshake.pcapng` — 13 frames, two clients: one complete M1–M4, one truncated M1–M2.
> MICs are computed from the documented lab PSK, so hashcat can verify your understanding.

## 1. Frame by frame

| Message | Direction | Key info flags | Carries | Proves |
| --- | --- | --- | --- | --- |
| M1 | AP → STA | Pairwise, ACK, no MIC | ANonce, replay counter, (optionally PMKID KDE) | AP is ready; nothing authenticated |
| M2 | STA → AP | Pairwise, MIC | SNonce, MIC over the frame | Client knows the PMK → **both sides can now derive the PTK** |
| M3 | AP → STA | Pairwise, ACK, MIC, Install, Secure | ANonce, MIC, encrypted GTK | AP knows the PMK and installs keys |
| M4 | STA → AP | Pairwise, MIC, Secure | MIC only | Client confirms; group key in place |

Flag meanings (EAPOL-Key "key information" field): bit 3 key type (1 = pairwise), bit 6 install,
bit 7 ACK, bit 8 MIC, bit 9 secure, bit 12 encrypted key data.

## 2. Lab commands

```bash
tshark -r wpa2-handshake.pcapng -Y 'eapol.type == 3' \
  -T fields -e frame.number -e wlan.sa -e wlan.da -e eapol.keydes.key_info \
  -e eapol.keydes.replay_counter -e eapol.keydes.nonce -e eapol.keydes.key_mic
```

Tasks:

1. Classify every EAPOL-Key frame as M1/M2/M3/M4 and justify it from `key_info`, not from order alone.
2. Which client's handshake is complete? What can you still do with the incomplete one, and why?
3. Explain, in one sentence, how the MIC lets a cracker test a candidate passphrase without being online.
4. The capture's PSK is `ForgeLab2026!` (documented lab value). Compute the PMK with the SSID from the
   beacon, derive the PTK for the M1/M2 pair, and verify the M2 MIC yourself:
   `scripts/verify-lab-artifacts.py` performs exactly this check — read it, then reproduce it with your
   own tooling (`hcxpsktool`, Python, or Wireshark's decryption).
5. Decrypt: with the PSK and handshake, load the capture in Wireshark (Preferences → Protocols →
   IEEE 802.11 → decryption keys) and verify that the payload after the handshake becomes readable.
   Which frames can now be decrypted, and which cannot?

## 3. Evidence you should end up with

* Frame numbers for M1–M4 plus the key-info values.
* The capture SHA-256.
* A statement of what the capture proves: the PSK is recoverable *offline* if it is guessable.
* The limit: no user attribution (shared PMK), and nothing about the AP's configuration beyond the RSNE.

## 4. Decision practice

**`scn-08-handshake-completeness`** — you have M1+M2 only. Is that enough for the audit? What if you have
M2+M3 but the replay counters do not line up?

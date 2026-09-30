# Practice Clinic: From EAPOL Frames to an Offline-Audit Decision

> Use the 13-frame synthetic `frontend/public/pcaps/wpa2/wpa2-handshake.pcapng`. The published training passphrase is deliberately known. This exercise needs no radio or real password guessing.

## Worked pass: one client

Frames 1–5 introduce the AP and the first station's authentication/association. Filter `eapol.type == 3`; frames 6–9 are the first station's four EAPOL-Key messages. Identify **M1** by AP→STA, ACK set and no MIC; **M2** by STA→AP, SNonce and MIC; **M3** by AP→STA, MIC/Install/Secure; **M4** by STA→AP, MIC/Secure. Check addresses and replay counters before accepting the sequence. The MIC on M2 can test a candidate PMK derived from *both* the passphrase and exact SSID. No captured frame by itself proves the receiver accepted it.

```bash
tshark -r frontend/public/pcaps/wpa2/wpa2-handshake.pcapng -Y 'eapol.type == 3' \
  -T fields -e frame.number -e wlan.sa -e wlan.da \
  -e eapol.keydes.replay_counter -e eapol.keydes.key_info
```

Use Wireshark's display filter if `tshark` is unavailable. Cite the **current** manifest SHA-256 (the fixtures were regenerated when PMF bits were corrected), not an older hash from a screenshot.

## Independent attempt: the other client

Without looking at `chal-04-handshake`, identify the second station in frames 10–13. Build `station | message frames | ANonce | SNonce | MIC-bearing frame | conclusion | not proved`. The fixture stops at M2 for this client. Decide if a candidate can be checked offline and whether association/key installation is demonstrated. **Do not say** that two stations were cracked merely because two exchanges appear.

Then run `python3 scripts/verify-lab-artifacts.py` from the repository root and identify the checked M2. The verifier knows the *published* fixture secret; a matching MIC is a known-answer check, not a production strength measurement. A wrong candidate must not match. If you cannot install the optional toolchain, give the exact calculation you would perform and label it NOT EXECUTED.

## Self-check and next decision

Expected: first station has M1–M4; second has M1/M2 only; both can carry sufficient material to verify an appropriately matched PSK candidate, but the partial exchange does **not** prove AP acceptance or usable L2 access. No protected post-handshake data payload exists in this fixture, so do not claim decrypted traffic. The next safe test is a separate *authorized* client/AP observation with negotiated policy and logs; no injected reconnection is needed for this offline exercise. If your conclusion is stronger than these bytes, locate the additional evidence or retract it.

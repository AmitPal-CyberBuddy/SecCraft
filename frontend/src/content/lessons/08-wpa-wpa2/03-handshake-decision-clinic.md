# Practice Clinic: From EAPOL Frames to an Offline-Audit Decision

> Use the 13-frame synthetic `frontend/public/pcaps/wpa2/wpa2-handshake.pcapng`. The published training passphrase is deliberately known. This exercise needs no radio or real password guessing.

## Prepare without repeating the walkthrough

Complete [Reading the 4-way handshake](/paths/wireless-pentesting/modules/08-wpa-wpa2?tab=theory&lesson=02-four-way-handshake-lab) first. It owns the message/flag explanation; this checkpoint asks you to apply it to the **other station** before consulting the answer. Cite the current capture manifest, not an old screenshot hash.

## Independent attempt: the other client

Without looking at `chal-04-handshake`, identify the second station in frames 10–13. Build `station | message frames | ANonce | SNonce | MIC-bearing frame | conclusion | not proved`. The fixture stops at M2 for this client. Decide if a candidate can be checked offline and whether association/key installation is demonstrated. **Do not say** that two stations were cracked merely because two exchanges appear.

Then run `python3 scripts/verify-lab-artifacts.py` from the repository root and identify the checked M2. The verifier knows the *published* fixture secret; a matching MIC is a known-answer check, not a production strength measurement. A wrong candidate must not match. If you cannot install the optional toolchain, give the exact calculation you would perform and label it NOT EXECUTED.

## Self-check and next decision

Expected: first station has M1–M4; second has M1/M2 only; both can carry sufficient material to verify an appropriately matched PSK candidate, but the partial exchange does **not** prove AP acceptance or usable L2 access. No protected post-handshake data payload exists in this fixture, so do not claim decrypted traffic. The next safe test is a separate *authorized* client/AP observation with negotiated policy and logs; no injected reconnection is needed for this offline exercise. If your conclusion is stronger than these bytes, locate the additional evidence or retract it.

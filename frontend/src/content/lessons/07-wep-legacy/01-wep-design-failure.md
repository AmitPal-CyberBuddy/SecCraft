# WEP: Why the Design Fails

> Lab tier: **SIMULATION** for analysis; recovering a key from *live* injection is **RF_REQUIRED**.

## What you must be able to do

Explain — without running a tool — why WEP cannot be fixed by lengthening the key, and what a WEP finding
must evidence.

## 1. The construction

WEP = **RC4** stream cipher + **24-bit IV** + **CRC-32 (ICV)** integrity check, with a shared key
(40 or 104 bits) used by every station.

```
ciphertext = RC4(K ‖ IV) ⊕ (plaintext ‖ CRC32(plaintext))
```

Three independent design failures:

1. **IV reuse.** The 24-bit IV is sent in the clear per packet and the same WEP key is shared by stations.
   Collisions become increasingly likely as traffic accumulates; their timing depends on packet rate and
   IV selection, so there is no universal “within hours” threshold. Reused keystreams can expose plaintext
   relationships (the classic two-ciphertexts-XOR weakness).
2. **Weak key scheduling.** RC4's KSA/PRGA with related keys leaks key material; FMS, KoreK and PTW turn
   "many packets" into "the key", needing on the order of tens of thousands to a few hundred thousand
   frames depending on the attack and traffic pattern.
3. **Integrity that cannot detect modification.** CRC-32 is linear: an attacker who knows the plaintext
   can adjust the ICV after flipping bits. WEP provides no real integrity, and no replay protection.

**Key length is not the problem.** 104-bit vs. 40-bit does not repair the IV, RC4 or integrity failures; attack requirements vary by traffic and technique.

## 2. What a WEP finding must evidence

* BSS in scope: BSSID/SSID, channel, frame number of a beacon with the WEP capability bit set (bit 4 of the
  capability field) — *there is no RSNE on a WEP network*. Absence of an RSNE is not by itself proof of WEP: distinguish open, legacy WPA vendor IE and WEP using the Privacy bit, security IEs, configuration and authorized client evidence.
* Data frames with the protected bit set and the IV visible (WEP exposes the IV in the frame header;
  WPA2/CCMP does not).
* The recovery result: frames consumed, attack used, tool output, and time.
* Impact in context: what is reachable on that L2, and whether the WEP segment is isolated.
* A statement that the key is **shared**, so attribution of traffic to a user is impossible.

## 3. Remediation (there is only one correct answer)

Migrate. Replacing a WEP key, "rotating" it, or adding MAC filtering changes nothing about the design:
MAC filtering is bypassable (MACs are in every frame and in monitor-mode captures) and key rotation only
resets the IV space. The migration path is:

```
WEP  →  WPA2-PSK (CCMP) with a strong, unique passphrase  →  WPA3-SAE (PMF required) where clients allow
```

Where legacy clients genuinely require WPA/TKIP-era support, treat it as a documented exception with a
compensating control (isolated VLAN, no access to sensitive data) and a dated removal plan.

## 4. Retest

* Post-migration beacon shows **RSNE with AKM 2 (PSK) or 8 (SAE)** and cipher CCMP/GCMP — no WEP BSS.
* An authorized legacy-client test no longer completes a WEP association. Capture the client/AP result and relevant logs; response codes and failure behavior vary, so do not rely on one status code alone.
* The old WEP key must not work; record the attempt and the failure.

## 5. Offline reasoning exercise (no key-recovery capture supplied)

A **toy** repeated-keystream illustration (not real WEP bytes): suppose two one-byte plaintexts
`0x41` and `0x42` use the same keystream byte `0x20`. Their ciphertexts are `0x61` and `0x62`;
XORing the ciphertexts gives `0x03`, equal to `0x41 XOR 0x42`. In WEP, IV reuse with a shared
key can create the same keystream under the stream cipher; this relationship is **not** a recovered
key and does not prove any particular capture exposes plaintext. CRC-32's linearity separately
permits malleability. Name both independent flaws before recommending replacement.

Write two bounded report lines: (a) a configuration observation supported by a WEP setting in an
**authorized** sample config (if none is supplied, mark NOT TESTED); (b) the additional IV-bearing
traffic and scope/impact evidence needed before claiming exploitation. No WEP pcap or actual
recovery result is bundled; the self-review config lab is conceptual.

## 6. Decision practice

**`scn-07-wep-report`** — write the finding and pick a defensible severity for a WEP segment that is
isolated from internal systems but carries POS traffic.

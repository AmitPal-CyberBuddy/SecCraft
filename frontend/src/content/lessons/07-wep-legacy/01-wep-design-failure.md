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

1. **IV reuse.** 2^24 IVs, sent in the clear, per *packet*, shared by all clients. In a busy network IVs
   repeat within hours; a repeated IV keystream is enough to recover plaintext (the classic
   two-ciphertexts-XOR attack).
2. **Weak key scheduling.** RC4's KSA/PRGA with related keys leaks key material; FMS, KoreK and PTW turn
   "many packets" into "the key", needing on the order of tens of thousands to a few hundred thousand
   frames depending on the attack and traffic pattern.
3. **Integrity that cannot detect modification.** CRC-32 is linear: an attacker who knows the plaintext
   can adjust the ICV after flipping bits. WEP provides no real integrity, and no replay protection.

**Key length is not the problem.** 104-bit vs. 40-bit changes how many packets an attack needs, not whether
the attack works.

## 2. What a WEP finding must evidence

* BSS in scope: BSSID/SSID, channel, frame number of a beacon with the WEP capability bit set (bit 4 of the
  capability field) — *there is no RSNE on a WEP network*.
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
* A monitor-mode capture of an association attempt using WEP fails (status code "unsupported security").
* The old WEP key must not work; record the attempt and the failure.

## 5. Decision practice

**`scn-07-wep-report`** — write the finding and pick a defensible severity for a WEP segment that is
isolated from internal systems but carries POS traffic.

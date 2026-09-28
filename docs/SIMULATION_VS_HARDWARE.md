# Simulation vs Hardware — Lab Tier System

Every module, lab and challenge in WiFiForge carries one of three tiers. The tier is not decoration: it
states exactly what an artefact-based exercise can and cannot establish, and where a real radio is
required. **A PCAP simulation is never presented as RF testing.**

| Tier | Meaning | What it can prove | What it cannot prove |
| --- | --- | --- | --- |
| 🟢 **SIMULATION** | Everything needed is an artefact: a capture, a configuration, a log, an offline hash file. | Policy advertised in beacons; handshake/PMKID material and offline audit results; EAP/RADIUS exchanges; portal flows; segmentation *evidence captured in a test environment*. | Anything that depends on the air itself: injection, client reaction, RF behaviour, interference. |
| 🟡 **HYBRID** | The concept is provable from artefacts, but confidence needs real hardware (your own AP/adapter) at some point. | The reasoning, the configuration, the analysis — and what would happen given those settings. | Real client behaviour, real driver/firmware behaviour, real-world RF conditions. |
| 🔴 **RF_REQUIRED** | The air is the subject of the test. | Nothing, from a capture alone. A capture shows *that* frames were transmitted, not *that a client was affected*. | Everything that matters here: injection capability, deauth effect, rogue-AP discovery/association choice, channel/RF behaviour. |

## Where each tier is used

* **SIMULATION** — modules 01, 02, 03, 05, 06, 07, 08, 11, 15, 16, 17, 19 plus the engagement scaffolding.
* **HYBRID** — modules 04 (monitor mode/injection are hardware; the reasoning is not), 09 (offline audit of a
  captured handshake is real crypto, collection needs a radio), 10 (WPS state is readable from beacons; a PIN
  attempt needs a radio and authorisation), 13 (rogue infrastructure analysis vs. operating a rogue AP),
  14 (portal analysis vs. an on-site isolation test).
* **RF_REQUIRED** — module 12 (availability testing) and every intrusive test in module 18 (deauth, rogue
  authenticator, live segmentation testing).

## How the tiers appear in the product

* `modules.json` → `lab_requirement` (authoritative), with a legacy `status` field for compatibility.
* `lab-artifacts.json` → each artefact records what is **real** and what is **synthetic** (cryptographic
  material is real where it can be; TLS payloads and SAE scalars are structural only, and say so).
* UI → `<TierBadge>` / `<TierLegend>` in module headers, labs, challenges and the engagement pack; the
  SIMULATION badge never appears next to language that implies RF confirmation.
* Documentation → each lesson states the tier at the top and the exact limit that follows from it.

## Creating artefacts (the verification pipeline)

```bash
python3 scripts/generate-lab-artifacts.py    # 16 PCAPNGs + lab-data JSON + wordlist + MANIFEST + inventory
python3 scripts/generate-challenges.py       # 15 challenges; every answer is computed from the captures
python3 scripts/verify-lab-artifacts.py      # 142 checks: hashes, RSNE, MICs, PMKID, RADIUS, MS-CHAPv2, answers
```

The verifier is the contract: if a capture is regenerated with different values, stale challenge answers,
hashes or lesson references fail the run. Cryptographic material is genuinely computed — PMK/PTK/MIC for the
handshake captures, PMKID from the PMK, RADIUS Message-Authenticator/Response Authenticator from the shared
secret, and MS-CHAPv2 challenge/response derived per RFC 2759 (checked against the published test vector).

## What stays synthetic, deliberately

* TLS record contents inside EAP tunnels (structural bytes; the inner MS-CHAPv2 exchange, where crackable,
  is real).
* SAE commit/confirm scalars — a real SAE exchange requires a live DH exchange with a client; the point of
  the WPA3 lab is that the payloads are *not* offline-crackable.
* BIP MIC values on protected management frames (the IGTK is not knowable to a passive listener).
* DHCP option bytes and HTTP/DNS payload strings in the traffic-analysis capture (minimal, fixed-size).

Each capture's manifest entry lists exactly which parts are synthetic, so a learner can never be misled
about what a delivered artefact demonstrates.

## Hardware mode (optional, zero-cost)

If you have an adapter that supports monitor mode and injection:

1. Set up your own AP (`hostapd`) and clients you own — never a third-party network.
2. Verify capability first: `iw dev`, `iw phy <phy> info | grep -A6 'Supported interface modes'`,
   `aireplay-ng --test <if>` against your own AP.
3. Use the same evidence standard: hash, filter, frame numbers, limits — plus the hardware/software
   versions, since RF results are not reproducible without them.

If you do not have the hardware, complete the tier's reasoning and analysis tasks; the academy records
that the RF step was not performed rather than pretending it was.

# Why Wireless Changes the Threat Model

## What you must be able to do after this lesson

* Explain to a client why "the Wi-Fi is encrypted" is not the same as "the network is secure".
* Describe what an observer can learn **without any credentials, association or IP address**.
* Apply the authorisation test before your first capture: *whose* radio, on *whose* airspace, under *whose* signature?

## 1. Radio is a broadcast medium

Ethernet uses a physical medium; 802.11 uses radio, so a monitor-mode receiver may hear over-the-air
frames within its RF conditions. It must be tuned to the relevant channel/band, and reception depends on
range, interference, antenna, hardware and capture configuration. Beacons, probes, authentication and
association frames are often observable; some handshake material is transmitted in the clear. A capture
is never guaranteed to contain every frame or every client.

What that means in practice:

| Observation | Requires authentication? | Typical evidence |
| --- | --- | --- |
| SSID / BSSID / channel / band | no | beacon or probe response |
| Security policy (RSNE: AKM, ciphers, PMF) | no | beacon / probe response / association request |
| Advertised vendor/model clues, not proven ownership | no | address allocation where applicable, WPS IE and capability sets |
| Station-address observations and requested SSIDs | no | probes/association requests; not physical identity or a complete preferred-network list |
| 4-way handshake material | no (but needs a client to connect) | EAPOL-Key M1–M4 |
| Interpreting protected payload | not necessarily observer association; relevant keying material is needed | successful decryption under the negotiated cipher with session evidence |

## 2. The attack surface is four different surfaces

1. **The access point** — configuration: no WPS, PMF required, correct AKMs, strong PSK/SAE, isolated guest VLAN.
2. **The clients** — behaviour: auto-connect, PNL leakage, certificate validation, enterprise profile settings.
3. **The authentication infrastructure** — RADIUS shared secrets, EAP methods, certificate handling, VLAN/ACL assignment.
4. **The air itself** — availability: unauthenticated management frames, RF jamming/resource exhaustion.

A professional test considers all four surfaces, then states which were in scope, which were tested, and what each evidence source can actually support.

## 3. Wi-Fi is not every kind of wireless

802.11 Wi-Fi is a local-area network protocol: stations associate with APs (or use other 802.11
modes) and exchange MAC frames on channels. Bluetooth pairing, cellular attach and RFID reads
use different roles, security mechanisms and test permissions. RF proximity alone is common to
these technologies; a Wi-Fi beacon/RSNE audit cannot assess a cellular or Bluetooth deployment.

**Try this:** your client says “the warehouse radios are encrypted.” Ask which technology, owned
transmitters, devices, test window and data-handling rules are in scope before selecting a tool.
For an 802.11 AP, write one testable claim from a beacon (advertised AKM) and one claim a beacon
cannot establish (whether a specific client validated an Enterprise server certificate).

## 4. What stays the same as a wired test

The engagement discipline does not change: written authorisation, defined scope, evidence, impact,
remediation, retest. What changes is *where the evidence lives*: frames and RF facts rather than
HTTP requests.

## 5. The loop every module uses

```
Authorisation → Observation → Interpretation → Hypothesis → Next test
      → Evidence → Conclusion → Impact → Remediation → Retest → Report
```

Each module is a variation of that loop, with the same evidence standard: **a claim without a
reproducible artefact is an opinion**.

## 6. Legal and ethical boundary (read this twice)

* Test only infrastructure you own, or that a client has authorised in writing for a defined window.
* Do not capture or inject on networks outside the written scope. Wireless interception, disruption and
  credential handling are legally sensitive; applicable law varies by jurisdiction and facts. Obtain
  explicit authorization and follow client/legal requirements before testing.
* Do not "tidy up" captures: keep the raw file, record the SHA-256, and note the tool and filter used.
* If a test could disrupt production (deauth, rogue AP, RF flooding), it needs explicit written
  approval in the Rules of Engagement — and a rollback plan.

## 7. Decision practice

Open module 01 in the academy and work through **`scn-01-scope-gap`** (Decision Practice). It puts you in
front of a scope document with a gap and asks what you do *before* touching the radio.

## References

* IEEE 802.11-2020 §4 (general description), §9.3 (MAC frame types)
* Rules of Engagement template: `docs/VAPT_METHODOLOGY.md`, Engagement Mode → `ENG-01`

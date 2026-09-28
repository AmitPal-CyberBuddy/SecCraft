# Why Wireless Changes the Threat Model

## What you must be able to do after this lesson

* Explain to a client why "the Wi-Fi is encrypted" is not the same as "the network is secure".
* Describe what an observer can learn **without any credentials, association or IP address**.
* Apply the authorisation test before your first capture: *whose* radio, on *whose* airspace, under *whose* signature?

## 1. Radio is a broadcast medium

Ethernet gives you a cable: frames exist only where the copper goes. 802.11 radiates, so a monitor-mode
receiver inside the coverage area receives everything that is not spatially separated from it — beacons,
probe requests, authentication and association frames, and the unprotected parts of the security
handshake. No address, no port, no account.

What that means in practice:

| Observation | Requires authentication? | Typical evidence |
| --- | --- | --- |
| SSID / BSSID / channel / band | no | beacon or probe response |
| Security policy (RSNE: AKM, ciphers, PMF) | no | beacon / probe response / association request |
| Vendor (OUI) and, sometimes, model | no | BSSID prefix, WPS IE, HT/VHT/HE capability sets |
| Client presence and preferred networks | no | probe requests, association requests |
| 4-way handshake material | no (but needs a client to connect) | EAPOL-Key M1–M4 |
| Inside encrypted traffic | yes (key required) | decrypted payload after PTK is known |

## 2. The attack surface is four different surfaces

1. **The access point** — configuration: no WPS, PMF required, correct AKMs, strong PSK/SAE, isolated guest VLAN.
2. **The clients** — behaviour: auto-connect, PNL leakage, certificate validation, enterprise profile settings.
3. **The authentication infrastructure** — RADIUS shared secrets, EAP methods, certificate handling, VLAN/ACL assignment.
4. **The air itself** — availability: unauthenticated management frames, RF jamming/resource exhaustion.

A professional test touches all four and says which weakness belongs to which surface.

## 3. What stays the same as a wired test

The engagement discipline does not change: written authorisation, defined scope, evidence, impact,
remediation, retest. What changes is *where the evidence lives*: frames and RF facts rather than
HTTP requests.

## 4. The loop every module uses

```
Authorisation → Observation → Interpretation → Hypothesis → Next test
      → Evidence → Conclusion → Impact → Remediation → Retest → Report
```

Each module is a variation of that loop, with the same evidence standard: **a claim without a
reproducible artefact is an opinion**.

## 5. Legal and ethical boundary (read this twice)

* Test only infrastructure you own, or that a client has authorised in writing for a defined window.
* Never capture traffic from networks you are not authorised to test — in most jurisdictions
  interference, injection and credential capture are criminal offences regardless of intent.
* Do not "tidy up" captures: keep the raw file, record the SHA-256, and note the tool and filter used.
* If a test could disrupt production (deauth, rogue AP, RF flooding), it needs explicit written
  approval in the Rules of Engagement — and a rollback plan.

## 6. Decision practice

Open module 01 in the academy and work through **`scn-01-scope-gap`** (Decision Practice). It puts you in
front of a scope document with a gap and asks what you do *before* touching the radio.

## References

* IEEE 802.11-2020 §4 (general description), §9.3 (MAC frame types)
* Rules of Engagement template: `docs/VAPT_METHODOLOGY.md`, Engagement Mode → `ENG-01`

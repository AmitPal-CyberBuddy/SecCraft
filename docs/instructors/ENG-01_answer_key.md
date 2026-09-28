# ENG-01 — Instructor Answer Key (do not ship in the app UI)

> The learner-facing pack is `frontend/src/content/engagements.json`. This file exists so a trainer can
> grade against a defensible reference. It is **not** imported by the frontend.

## Mapping of engagement targets to lab artefacts

| Engagement name | Lab artefact(s) | Policy as generated |
| --- | --- | --- |
| NW-Corp | `enterprise.pcapng`, `eap.pcapng`, `radius.pcapng`, `wpa3-only.pcapng` | 802.1X/PEAP with MS-CHAPv2 inner; RADIUS with verifiable authenticators; AKM 8 + MFPC+MFPR on the WPA3-capable BSS |
| NW-Guest | `captive-portal.pcapng`, `rogue-ap.pcapng` | open BSS, HTTP portal, no client isolation; a twin exists on 2.4 GHz |
| NW-Ops | `wpa2-handshake.pcapng`, `pmkid.pcapng` | WPA2-PSK (CCMP), shared passphrase `password123` in the lab wordlist; PMKID advertised |
| NW-Legacy | `wep-legacy` (lab notes; no WEP capture is shipped) | WEP, documented as deprecated, isolated VLAN claim unverified |
| Site/recon | `beacon-only.pcapng`, `recon-lab.pcapng`, `traffic-analysis.pcapng`, `wps-beacon.pcapng`, `deauth.pcapng`, `wpa3-transition.pcapng`, `corporate-attacks.pcapng`, `methodology.pcapng` | beacon policies; hidden SSID; WPS unlocked + locked pair; spoofed deauth supported and blocked; transition-mode PSK/SAE mix |

## Reference findings (expected, with the evidence that must be cited)

1. **NW-Ops — guessable shared PSK.** Evidence: `wpa2-handshake.pcapng` frames for M1–M4 (and/or the PMKID
   KDE in `pmkid.pcapng`), `hcxpcapngtool` → `hashcat -m 22000` with the lab wordlist. Impact: L2 access to
   the operations SSID and decryption of other users' traffic on it; shared key ⇒ no attribution. Severity
   must be derived against what the operations VLAN reaches (the learner should test/argue this) — an
   in-scope answer is Medium–High, **not** automatic Critical.
2. **NW-Corp — PEAP-MSCHAPv2 exposure requires a precondition.** Passive capture alone does not expose
   credentials: the material exists only if the client does not validate the server certificate
   (`corporate-attacks.pcapng` demonstrates the rogue-authenticator path; `eap.pcapng`/`radius.pcapng` show
   the method and the verifiable RADIUS attributes). Finding statement must name the precondition and the
   remediation (`ca_cert` + `domain_suffix_match`, prefer EAP-TLS). If the learner claims "PEAP is broken"
   without the precondition, that is a technical-accuracy deduction.
3. **NW-Guest — cleartext portal credentials + no client isolation.** Evidence:
   `captive-portal.pcapng` (HTTP request frames, POST body, ARP between clients). Two separate findings.
4. **NW-Legacy — WEP by design.** The correct remediation is migration, not key rotation. The learner must
   state that *no WEP capture is in the bundle* (the lab provides notes only) and therefore what was and was
   not tested — the honest limitation statement is part of the grade.
5. **WPS (site-wide).** `wps-beacon.pcapng` contains an unlocked PIN-capable BSS and a setup-locked one.
   Configuration exposure ≠ demonstrated exploitability: no PIN attack was performed (not authorised).
6. **PMF inconsistency.** `deauth.pcapng` shows a spoofed flood against a PMF-capable BSS and the same
   attempt against a PMF-required BSS; `wpa3-transition.pcapng` shows a PSK client in transition mode.
   Correct framing: availability impact is scoped to clients that do not negotiate PMF.
7. **RED HERRING — `rogue-ap.pcapng`.** The twin advertises `Corp-WLAN` with a locally administered BSSID,
   AKM 2 and a 2.4 GHz channel. It *looks* like the most severe finding. In this environment it is a
   **simulated artefact from an authorised test**, and the engagement's NW-Corp clients enforce certificate
   validation, so the enterprise client population is not capturable by it. The correct disposition: treat
   it as evidence of the detection/recon exercise (or of a *historical* test), do **not** raise a
   production-rogue finding for it, and say why. Learners who report it as a live attacker without checking
   the preconditions lose impact-reasoning marks.
8. **No exploitable weakness — `wpa3-only.pcapng`.** WPA3-only with AKM 8, MFPC+MFPR, protected management
   frames. The graded section is the documented negative result: what was tested, the evidence that the
   control held, and the limitations (client population not sampled, roaming not tested).
9. **RADIUS log burst.** A service account with 4 312 rejects then one accept (`radius` lab-data / logs).
   Expected reasoning: online guessing against an account without effective lockout; credential compromised
   ⇒ rotate and investigate reuse; the log alone does not establish attribution.
10. **Segmentation.** `methodology.pcapng` / `corporate-attacks.pcapng` contain cross-segment ICMP. Expected:
    protocol-level evidence, ports listed, isolate vs. segment vs. ACL distinguished, and the explicit
    statement of what the artefact does *not* prove (a capture on a test path ≠ production policy).

## Grading heuristics

* **Automatic technical-accuracy deductions:** deprecated Wireshark field names (`wlan_mgt.*`); claiming a
  CVSS score as a property of a technique; claiming impact beyond the demonstrated access; confusing
  client isolation with VLAN segmentation; reporting the hidden SSID as a security control.
* **Automatic scope deductions:** testing or reporting on an SSID not in the four targets; performing a
  technique marked prohibited; capturing payload beyond what the guest BSS exposes passively.
* **Evidence deductions:** any claim without a frame number + filter + capture hash (or config/log excerpt);
  screenshots used as primary evidence; missing SHA-256.
* **Distinction-level work:** correct red-herring disposition; a documented negative result; severity that
  changes with the environment and says so; a retest plan a third party could execute unassisted.

## Regenerating / verifying artefacts

```bash
python3 scripts/generate-lab-artifacts.py     # 16 captures + lab-data + MANIFEST + inventory
python3 scripts/verify-lab-artifacts.py       # 112 checks: hashes, RSNE, MICs, PMKID, RADIUS, MS-CHAPv2
```

All cryptographic material is derived from the documented lab values; the MS-CHAPv2 derivation is checked
against the published RFC 2759 vector (`clientPass` / `User`) inside the verifier.

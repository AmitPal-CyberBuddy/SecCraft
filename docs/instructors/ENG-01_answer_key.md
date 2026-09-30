# ENG-01 and Case C-20 — instructor review guide

> ENG-01 (`frontend/src/content/engagements.json`) is a **Northwind scenario brief only**. Its named Northwind AP inventory, client profiles, per-SSID capture bundle, RADIUS logs, portal rules, test accounts and remediation artifacts are **not shipped**. This guide is not imported by the frontend and is **not** a marking record or a claim that any professional assessment has been graded. Do not map generic laboratory captures to Northwind SSIDs or declare Northwind findings.

## Assess the Northwind planning exercise

An acceptable submission lists missing client evidence by source and authorization: AP and wired inventory; per-SSID capture with exact collection window; effective managed-client trust configuration and supplicant event logs; RADIUS server/NAS policy and integrity logs; controlled guest-client isolation and allowed/denied routing tests; portal server-side session behavior; remediated configuration and before/after client observations. The student should distinguish read-only review from intrusive testing, map every such test to a valid RoE clause, name a stop condition, and state how personal data would be handled. **No Northwind vulnerability, negative result or passed retest is established** by the supplied brief.

Reject any submission that attributes the published lab PSK `password123` to NW-Ops; treats `corporate-attacks.pcapng` as a successful PEAP compromise; treats a beacon or synthetic ICMP pair as proof of client isolation or VLAN enforcement; calls a same-SSID BSSID a malicious AP without ownership verification; or describes WEP exploitation based on a nonexistent Northwind WEP capture. The bundled `radius.pcapng` does not include a Northwind service-account incident. Do not award Northwind findings for generic teaching fixtures.

## Independently review staged Case C-20

Case notes: `frontend/public/pcaps/capstone/CASE_NOTES.md`. Captures: `capstone-baseline.pcapng` (11 frames) and `capstone-retest.pcapng` (3 frames). Check the current digests in `frontend/public/pcaps/MANIFEST.md` rather than copying a stale digest. These are independent fictional deterministic bytes, **not Northwind** and **not live RF**.

| Question | Expected bounded answer |
| --- | --- |
| Inventory | Baseline frames 1–3 advertise `CASE-OPS` on `02:aa:10:00:00:01` (PSK, MFPC only), `CASE-CORP` on `.02` (802.1X, MFPR) and another `CASE-OPS` on `.09` (PSK, MFPC only). The fictional owner lists `.01` and `.02`; `.09` ownership is unknown, not established malicious. |
| Key audit | Baseline frames 8–11 contain a PSK M1–M4 exchange for `.01`; M2 verifies with the *published training candidate* `password123` using the artifact verifier. This validates the known fixture, not any client secret, production access or `.09`'s password. |
| Comparison | Post-change frame 1 for the same `.01` advertises SAE-only and MFPC+MFPR (`0x00c0`); baseline was PSK and MFPC-only (`0x0080`). Post-change frame 3 shows `.09` still advertising PSK. This comparison verifies **staged advertised policy for one BSSID**, not enforced client negotiation or estate-wide closure. |
| Missing work | To sign off a real retest: authorized same client/SSID/BSSID attempt, effective client profile, selected AKM/PMF, AP/client logs, negative PSK attempt if approved, asset/wired inventory for `.09`, and new raw captures with hashes. Record **NOT TESTED** here. |

A strong submission states at least one **insufficient-evidence** result, gives a source/hash/filter/frame for each positive observation, identifies alternatives, avoids assigning production severity to lab facts, and writes measurable follow-up criteria. The same-name unknown BSS may be legitimate, unlisted, or unauthorized; the synthetic case does not resolve it.

## Review discipline and regeneration

- Ask the learner to explain their report without looking at the self-review challenge answer. Check commands, frame numbers, original captures, chain of custody, negative controls and whether observations support each claim.
- Test a *real* field exercise only with separately agreed safe RoE, owned AP/client hardware, client and infrastructure evidence, reviewer feedback and performed retest. Do not infer competence from a local flag, XP or quiz completion.
- Rebuild deterministic fixtures with `python3 scripts/generate-lab-artifacts.py` and `python3 scripts/generate-challenges.py`; then run `python3 scripts/verify-lab-artifacts.py` and the learning-data/progress checks. Regeneration changes PCAP hashes when the generator changes: update authored digest references or use the manifest.

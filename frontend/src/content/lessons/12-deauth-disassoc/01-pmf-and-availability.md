# PMF and Availability Testing

> Lab tier: **RF_REQUIRED** for effect; **SIMULATION** for analysis (`deauth.pcapng`, `wpa3-only.pcapng`).

## 1. Why unprotected management frames are spoofable

Deauthentication (subtype 12) and disassociation (subtype 10) frames are management frames. Before
802.11w, they generally lacked cryptographic protection; on a BSS/client association without PMF, a forged frame may be accepted. Acceptance and impact depend on the negotiated policy, frame validity, client/AP behavior and RF delivery. Two possible consequences—not guaranteed outcomes—are:

* **Availability**: repeated accepted deauth frames can disrupt clients; any live test needs explicit authorization and strict scope because it can interrupt service.
* **Facilitation**: an accepted targeted deauth may lead a client to reconnect. That could expose a handshake to capture (Module 08) or affect client selection (the client-trust lessons in this module); neither result is guaranteed.

## 2. Reason codes are evidence

| Code | Meaning | Typical use in a capture |
| --- | --- | --- |
| 1 | Unspecified | non-specific; reason code alone does not identify tooling or intent |
| 2 | Previous authentication no longer valid | AP-side state reset |
| 3 | STA is leaving / no longer valid | legitimate disconnection |
| 7 | Class 3 frame received from nonassociated STA | state/association context is needed; not proof of a deliberate kick |
| 8 | Disassociated, STA is leaving BSS | legitimate disassociation |
| 15 | 4-way handshake timeout | timeout reported; correlate with the client/AP exchange and logs |
| 39 | SA Query timeout | the response did not arrive before timeout; correlate with peer/AP logs |

Quote codes with frame numbers and inter-frame timing. A code-1 burst can warrant investigation, but reason codes alone do not establish tooling, sender identity beyond the observed address, authorization, or cause.

## 3. PMF: what changes with 802.11w

| RSN caps | Behaviour | Test consequence |
| --- | --- | --- |
| neither bit | no PMF advertised | unprotected robust-management frames may be accepted |
| MFPC only (bit 7 / `0x0080`) | PMF is optional; association negotiation determines whether it is used | clients in the same ESS can have different protection states |
| MFPC + MFPR (bits 6+7 / `0x00c0`) | PMF required for association; robust management frames are protected | an unprotected forged deauth should be discarded by a PMF-negotiated peer; valid protection depends on the negotiated pairwise or group-addressed mechanism |

Deauth/disassoc are **Robust Management Frames**. Unicast robust-management protection uses the negotiated pairwise cipher/key; group-addressed robust-management integrity uses BIP with an IGTK. A frame with only the Protected bit set is not proof of a valid MIC or receiver acceptance. Depending on the conditions, SA Query can help a PMF peer verify that a station is still responsive before completing a teardown.

Artifact boundary: `wpa3-only.pcapng` contains a synthetic protected-bit/BIP-shaped deauth with no validated MIC. `deauth.pcapng` contains scripted frame examples for comparison; neither capture establishes RF delivery, receiver acceptance, disconnection, or availability impact.

## 4. Testing it honestly

* Availability tests need explicit, written authorisation; they affect users immediately.
* Prefer a scoped single-client test on a lab BSSID, with a stop condition and a maximum duration.
* Evidence must show **effect**, not just frames: client-side disconnection (supplicant log), re-association
  frames, and a before/after timeline.
* Measure and state the impact in business terms: which users, which service, how long.

## 5. Remediation

```
# hostapd — require PMF
ieee80211w=2
group_mgmt_cipher=AES-128-CMAC
# optional: beacon protection (client support dependent)
beacon_prot=1
```

Additional controls: WIDS/WIPS with deauth-flood thresholds, SA Query monitoring, client-side 802.11w
support verification (a client that cannot do PMF keeps the ESS exposed to that client), and a documented
exception process for legacy devices.

## 6. Retest

Repeat a narrowly scoped authorized test using an explicitly defined unprotected robust-management frame against a PMF-negotiated client. The expected protocol behavior is rejection of that frame; verify the negotiated PMF state, station/AP logs and association status. Do not equate a frame in the capture with a successful or failed delivery. Report the tested conditions and observed outcome; a bounded negative test can support that control for that client/configuration, not prove universal immunity.

## 7. Decision practice

**`scn-12-pmf-value`** — MFPC-only: what does that actually allow, and how would you prove it?
**`scn-12-evidence-for-dos`** — which artefacts would you require before reporting an availability finding?

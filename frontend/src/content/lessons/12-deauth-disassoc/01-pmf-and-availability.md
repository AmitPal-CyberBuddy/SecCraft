# PMF and Availability Testing

> Lab tier: **RF_REQUIRED** for effect; **SIMULATION** for analysis (`deauth.pcapng`, `wpa3-only.pcapng`).

## 1. Why unprotected management frames are spoofable

Deauthentication (subtype 12) and disassociation (subtype 10) frames are management frames. Before
802.11w they carried no cryptographic protection at all: any transmitter can put an AP's MAC in the
address fields and the receiving station must process the frame. Two consequences:

* **Availability**: a flood of deauth frames removes clients from the BSS; the effect on a production
  network is a self-inflicted denial of service unless it is explicitly authorised and controlled.
* **Facilitation**: a targeted deauth forces a client to reconnect, which produces a fresh 4-way handshake
  to capture (module 09) or drives it toward a rogue twin (module 13).

## 2. Reason codes are evidence

| Code | Meaning | Typical use in a capture |
| --- | --- | --- |
| 1 | Unspecified | flood tooling (least useful for attribution) |
| 2 | Previous authentication no longer valid | AP-side state reset |
| 3 | STA is leaving / no longer valid | legitimate disconnection |
| 7 | Class 3 frame received from nonassociated STA | targeted "kick the client" pattern |
| 8 | Disassociated, STA is leaving BSS | legitimate disassociation |
| 15 | 4-way handshake timeout | client that never received M3 |
| 39 | SA Query timeout | PMF-protected client failing SA Query |

Quote codes with frame numbers and inter-frame timing: a burst of code-1 broadcast frames from one
transmitter is a strong indicator of tooling, not of normal operation.

## 3. PMF: what changes with 802.11w

| RSN caps | Behaviour | Test consequence |
| --- | --- | --- |
| neither bit | no protection | spoofed deauth works |
| MFPC only (B5) | protection negotiated if the client asks | mixed ESS: some clients protected, some not |
| MFPC + MFPR (B4) | protection required for robust management frames | spoofed deauth is rejected; forged frames need the IGTK |

Protected deauth/disassoc frames are **Robust Management Frames**: they carry a BIP MIC computed with the
IGTK, so a spoofer without the key cannot produce a frame the client accepts. The AP also uses **SA Query**
(action category 8) to verify a client still holds the PTK before tearing down state.

`wpa3-only.pcapng` contains a protected deauth (protected bit set) and `deauth.pcapng` shows both cases
side by side: a spoofed flood against a PMF-capable BSS and the same attempt against a PMF-required BSS.

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

Repeat the exact test: same tool, same frames, same duration, against a PMF-required BSS. Expect the
client to remain associated (verify with association timestamps and the AP's logs) — and say explicitly
that "the attack failed" is *evidence of a control working*, not a missing finding.

## 7. Decision practice

**`scn-12-pmf-value`** — MFPC-only: what does that actually allow, and how would you prove it?
**`scn-12-evidence-for-dos`** — which artefacts would you require before reporting an availability finding?

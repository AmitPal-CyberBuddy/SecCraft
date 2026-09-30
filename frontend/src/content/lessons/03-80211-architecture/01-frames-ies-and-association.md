# Frames, Information Elements and the Association Flow

## What you must be able to do

* Name frame type/subtype numbers and translate them into display filters.
* Read the security-relevant information elements (SSID, RSN, WPS, Ext Cap, HT/VHT/HE) as policy statements.
* Walk the association state machine and say what each transition proves — and what it does not.

## 1. Frame types and useful subtypes

| Type (2 bits) | Subtype | Name | Security relevance |
| --- | --- | --- | --- |
| 0 management | 4 / 5 | Probe Request / Response | client PNL; hidden SSID reveal |
| 0 | 8 | Beacon | full policy advertisement (RSNE, WPS, caps) |
| 0 | 11 | Authentication | open/SAE/FT exchange; auth algorithm tells you which |
| 0 | 0 / 1 | Association Request / Response | negotiated policy; status codes |
| 0 | 10 / 12 | Disassociation / Deauthentication | unauthenticated unless PMF protects them |
| 0 | 13 | Action | SA Query (category 8), RRM (5), BSS transition (6) |
| 1 control | — | ACK/RTS/CTS/BlockAck | reliability, airtime, hidden-node analysis |
| 2 data | 0 / 8 | Data / QoS Data | EAPOL, IP payloads (protected once keys exist) |

Display filters (Wireshark 2.x+; the old `wlan_mgt.*` field namespace was removed years ago):

```
wlan.fc.type_subtype == 8            # Beacon
wlan.fc.type_subtype == 12           # Deauthentication
eapol                                 # any EAPOL frame
eapol.type == 3                       # EAPOL-Key (4-way handshake)
eap                                   # any EAP frame
radius                                # RADIUS (when RADIUS is on the capture path)
wlan.rsn.capabilities.mfpr == 1       # PMF required
wlan.bssid == 00:11:22:33:44:55       # one BSS
```

## 2. The information elements that matter

* **SSID (0)** — length 0 means hidden.
* **Supported Rates / Extended Supported Rates (1, 50)** — legacy rates; keep for completeness, not for decisions.
* **DS Parameter (3)** — 2.4 GHz channel.
* **TIM (5)** — DTIM/beacon count; useful when you interpret power-save client wake-ups.
* **Country (7)** — the regulatory triplet the AP claims to use (channel ranges and EIRP limits).
* **RSN (48)** — cipher/AKM suites + capabilities (see module 02).
* **Extended Capabilities (127)** — capabilities such as BSS Transition (802.11v); check the appropriate RSN/management elements separately for OCV-related policy.
* **HT/VHT/HE (45/61, 191/192, ext 35)** — channel width, MCS, spatial streams, OFDMA.
* **Vendor (221)** — WPS (`00:50:F2` type `04`) and vendor-specific extensions; fingerprinting material.

The RSNE advertises security options; association selects a compatible option, and the EAP/4-way exchanges establish keys. Confirm the negotiated AKM/PMF and client policy before claiming enforcement.

## 3. Association state machine

```
  Scan/probe (no state change)
  State 1: unauthenticated, unassociated
     │ 802.11 authentication exchange (open system or SAE)
     ▼
  State 2: authenticated at 802.11 MAC layer, unassociated
     │ association request / successful response
     ▼
  State 3: authenticated at 802.11 MAC layer, associated
     │ WPA-Personal: EAPOL-Key M1–M4 after association
     │ WPA-Enterprise: 802.1X/EAP over EAPOL after association,
     │                 then EAPOL-Key M1–M4 after EAP success
     ▼
  Still State 3: keys installed and controlled port authorized (not a fourth 802.11 state)

  Disassociation returns to State 2; deauthentication returns to State 1.
```

What each step proves:

* **Probe**: a directed SSID can indicate interest, not proof the client will join or trusts that BSS.
* **Authentication (open, algorithm 0)**: nothing. It is a formality; do not report it as "authentication".
* **Association**: which capabilities the AP and client agreed on (RSNE is echoed here).
* **4-way handshake**: when valid and completed, both peers prove PMK possession and install session keys; a captured M1/M2 alone permits offline candidate verification but does not prove successful completion or acceptance.
* **Status/reason codes**: protocol-level reasons for the frame outcome, not necessarily the underlying cause. Quote the code and correlate it with supplicant/AP logs and other evidence.

## 4. What the capture cannot show you

Encrypted data frames remain opaque without the PTK. A capture shows **metadata and the handshake**;
claims about user data require keys (lab PSK, or a live client you are authorised to test).

## 5. Lab

`traffic-analysis.pcapng` contains one complete client association: beacon → probe → auth (2 frames) →
association (2 frames) → 4-way handshake → DHCP/ARP/ICMP/DNS/HTTP:

```bash
tshark -r traffic-analysis.pcapng -Y 'wlan.fc.type_subtype==8 || wlan.fc.type_subtype==4 || \
  wlan.fc.type_subtype==5 || wlan.fc.type_subtype==11 || wlan.fc.type_subtype==0 || \
  wlan.fc.type_subtype==1 || eapol' -T fields -e frame.number -e wlan.fc.type_subtype -e wlan.sa -e wlan.da
```

Deliverable: a table `frame | step | what it proves` plus the RSNE decoded from the association request.

Before moving on, compare the RSNE in a beacon with the association request and response in
`traffic-analysis.pcapng`: make three columns for *offered*, *requested* and *observed key exchange*.
Do not interpret a successful association status alone as evidence that the WPA keys or 802.1X
credentials were accepted. On the Enterprise path, draw where EAP and the subsequent four-way
handshake would fit; the module 06 fixture is PSK, not Enterprise.

## 6. Decision practice

Module 03 scenarios: **`scn-03-rsn-decode`** (read a raw RSNE and classify the deployment) and
**`scn-03-pmf-bits`** (what does MFPC-without-MFPR allow?).

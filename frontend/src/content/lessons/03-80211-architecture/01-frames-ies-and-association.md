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
* **Supported Rates / Extended Rates (1, 35)** — legacy rates; keep for completeness, not for decisions.
* **DS Parameter (3)** — 2.4 GHz channel.
* **TIM (5)** — DTIM/beacon count; useful when you interpret power-save client wake-ups.
* **Country (7)** — the regulatory triplet the AP claims to use (channel ranges and EIRP limits).
* **RSN (48)** — cipher/AKM suites + capabilities (see module 02).
* **Extended Capabilities (127)** — capabilities such as BSS Transition (802.11v) and OCV.
* **HT/VHT/HE (45/61, 191/192, ext 35)** — channel width, MCS, spatial streams, OFDMA.
* **Vendor (221)** — WPS (`00:50:F2` type `04`) and vendor-specific extensions; fingerprinting material.

The RSNE is where the *policy* lives; the 4-way handshake is where the policy is *enforced*.

## 3. Association state machine

```
              ┌───────────────┐  Authenticate (alg 0/3)   ┌──────────────┐
  Probe ────► │  State 1:     │  ───────────────────────► │ State 2:     │
  (scan)      │  Unauthenticated/Associated? no          │ Authenticated│
              └───────────────┘  ◄─────────────────────── └──────────────┘
                                            Disassociate / Deauthenticate
   State 2 ──► Associate Request/Response ──► State 3: Associated
   State 3 ──► 4-way handshake (EAPOL-Key M1–M4) ──► State 4: Authenticated & Associated
                 (for 802.1X: EAP runs between state 2 and the 4-way handshake)
```

What each step proves:

* **Probe**: what the client is willing to join.
* **Authentication (open, algorithm 0)**: nothing. It is a formality; do not report it as "authentication".
* **Association**: which capabilities the AP and client agreed on (RSNE is echoed here).
* **4-way handshake**: both parties proved knowledge of the PMK and derived the same PTK.
* **Status/reason codes**: the only place the network tells you *why* something failed — always quote them.

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

## 6. Decision practice

Module 03 scenarios: **`scn-03-rsn-decode`** (read a raw RSNE and classify the deployment) and
**`scn-03-pmf-bits`** (what does MFPC-without-MFPR allow?).

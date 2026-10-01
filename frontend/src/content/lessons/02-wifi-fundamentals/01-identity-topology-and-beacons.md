# Identity, Topology and Reading a Beacon

## What you must be able to do

Given only a beacon capture, produce a defensible inventory entry:
`BSSID | SSID | channel | band | width | AKM | ciphers | PMF (capable/required) | WPS | vendor`, with the
frame number that supports each field.

## 1. Identity: SSID, BSSID, ESS, BSS

| Term | What it identifies | Where you see it |
| --- | --- | --- |
| SSID | the network *name* (0–32 arbitrary bytes; not necessarily UTF-8 or printable) | SSID IE (ID 0) in beacon/probe response |
| BSSID | one infrastructure BSS; a physical AP/radio can advertise several BSSIDs | address 3 of a beacon; in data frames identify it using To DS/From DS direction and address roles, not a fixed field |
| BSS | an infrastructure service set (AP and associated stations), identified by its BSSID | beacon + its clients |
| ESS | one extended service set comprising coordinated BSSs, commonly sharing an SSID | confirm with authorized inventory/configuration and network context; SSID equality alone does not establish ESS membership |
| Hidden SSID | a BSS whose beacons carry a zero-length SSID IE | SSID IE length 0 |

Two facts worth internalising:

* **A hidden SSID is not a security control.** A directed probe or association request can expose the SSID
  in clear when a client attempts to use it; a zero-length beacon/probe response does not hide it reliably.
  Hiding it can also encourage client-side directed probes and privacy leakage.
* **Same SSID ≠ same network.** An ESS and an evil twin look identical at the SSID level. Compare them
  with BSSID, channel, RSNE and IE fingerprints, then confirm ownership against authorized records; those indicators alone do not prove a twin.

## 2. Reading a beacon

Fixed fields (12 bytes) then information elements:

```
Timestamp (8) | Beacon interval (2, TU ≈ 1.024 ms) | Capability (2)
IE: SSID(0) · Supported Rates(1) · DS Parameter(3) · TIM(5) · Country(7)
    RSN(48) · HT Cap(45)/HT Op(61) · VHT(191/192) · HE(ext 35) · Ext Cap(127) · Vendor(221: WPS)
```

Practical decoding notes:

* **DS Parameter (3)** gives the channel for 2.4 GHz; on 5 GHz correlate HT/VHT operation where present; on 6 GHz use HE operation and receiver frequency metadata. Do not infer 6 GHz channel information from HT alone.
* **RSN (48)** is the security policy. Fields in order: version, group cipher, pairwise cipher list,
  AKM list, RSN capabilities, optional PMKID list.
* **RSN capabilities bit 6 (`0x0040`) = MFPR; bit 7 (`0x0080`) = MFPC.** MFPC means PMF is supported;
  MFPR+MFPC means it is required; neither bit means it is not advertised for that profile. These
  advertisement bits alone do not prove the PMF state of a particular association or that a forged frame
  was delivered/accepted. Verify the fields with Wireshark `wlan.rsn.capabilities.mfpr`/`.mfpc`.
* **AKM suite numbers** (OUI 00-0F-AC): 1 = 802.1X, 2 = PSK, 3 = FT-802.1X, 4 = FT-PSK,
  5 = 802.1X-SHA256, 6 = PSK-SHA256, 8 = SAE, 9 = FT-SAE, 18 = OWE, 24 = SAE-EXT-KEY.
  WEP is **not** an RSN AKM — a WEP network has no RSNE at all.
* **Cipher suites**: 1 = WEP-40, 2 = TKIP, 4 = CCMP-128, 8 = GCMP-128, 9 = GCMP-256, 6/11/12 = BIP variants.
* **Capability field bit 4 (Privacy)** advertises a privacy requirement, not which cipher was negotiated or whether a particular payload was actually encrypted.

## 3. Bands, channels, width

* **2.4 GHz**: channels 1–13 in most regions; channel 14 is a special Japan-only legacy channel and is not part of a general 1/6/11/14 plan. Common non-overlapping 20 MHz planning uses 1/6/11 (local rules and deployment density still matter); 40 MHz operation is usually harmful in this crowded band.
* **5 GHz**: UNII-1/2/2A/2C/3; channel numbers 36–177; DFS channels require radar detection and can cause
  data-carrying APs to move channel unexpectedly mid-test.
* **6 GHz (Wi-Fi 6E)**: channel numbers are defined within the 1–233 range with channelization/regulatory availability depending on region; applicable 6 GHz profiles require modern security (WPA3-Personal/Enterprise or Enhanced Open/OWE) and PMF, not legacy WPA2 transition modes. Do not assume every channel is available in every country or device.
* Channel width is in **HT/VHT/HE** elements, not in the DS parameter.

## 4. Clients: what they leak

A probe request reveals intent: a **wildcard** probe (empty SSID IE) means "is anything there?", while a
directed probe names an SSID of interest at that moment; it does not prove a complete stored Preferred Network List or a future association. Modern devices also
**randomise their MAC**. The locally administered bit is bit 1 (`0x02`) of the first octet: `92:…` has it set (`0x92 & 0x02 != 0`). Check the bit, not the parity of a hexadecimal digit. A locally administered address is only a clue, not proof of randomisation or one physical device. Probe SSIDs may still leak despite address changes.

## 5. Lab

`labs` for this module use **`beacon-only.pcapng`** and **`recon-lab.pcapng`** (both
`SIMULATION`, generated by `scripts/generate-lab-artifacts.py` — every frame is real radiotap + 802.11).

```bash
tshark -r beacon-only.pcapng -Y 'wlan.fc.type_subtype == 8' \
  -T fields -e frame.number -e wlan.bssid -e wlan.ssid -e wlan.ds.current_channel \
  -e wlan.rsn.akms.type -e wlan.rsn.capabilities.mfpc -e wlan.rsn.capabilities.mfpr
```

Then answer, with frame numbers: which BSS has no RSNE, which has MFPR set, and which band the
`LAB-WPA3` BSS belongs to.

## 6. Evidence standard for this module

* Inventory rows must cite **frame numbers**, not screenshots of your own terminal.
* Record the capture's SHA-256 (`sha256sum`) so a third party can verify the artefact.
* State what you could not determine (e.g. "locally administered client address observed; physical device and randomisation policy unconfirmed").

## 7. Common mistakes

* Reporting the SSID as an identifier of the *network* rather than of the *name*.
* Claiming PMF is "off" because the AP did not advertise MFP in the beacon while MFPC/MFPR say otherwise.
* Assuming 5 GHz channels are numbers you can set without checking DFS and the regulatory domain
  (read it with `iw reg get`; do not blindly run `iw reg set`).

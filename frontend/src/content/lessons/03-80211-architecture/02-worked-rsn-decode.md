# Worked Decode: RSN Bytes to a Bounded Decision

> The module 03 raw-byte scenario is meant to follow this example. Use only the supplied bytes; do not infer a live client's selected policy or the AP's ownership.

## Mechanism: length-prefixed information elements

An 802.11 information element starts with **ID, length, payload**. The RSN IE is ID `0x30` (decimal 48). Multibyte counts, version and capabilities in its payload are little-endian. A suite selector is four bytes: three-byte OUI `00 0f ac` and one-byte type. Read a count before reading that many selectors; an unknown or truncated count is a parsing failure, not permission to guess.

Take this **different** example from the decision scenario:

```text
30 14 01 00 00 0f ac 04 01 00 00 0f ac 04 01 00 00 0f ac 02 c0 00
│  │  └── payload starts here
│  └──── 0x14 = 20 payload bytes (not counting ID and length)
└─────── RSN IE ID 48
```

| Offset in payload | Bytes | Decode | Reason |
| --- | --- | --- | --- |
| 0–1 | `01 00` | version 1 | little-endian 16-bit integer |
| 2–5 | `00 0f ac 04` | group cipher CCMP-128 | suite type 4 |
| 6–7 | `01 00` | one pairwise suite | count = 1 |
| 8–11 | `00 0f ac 04` | pairwise CCMP-128 | applies to unicast |
| 12–13 | `01 00` | one AKM | count = 1 |
| 14–17 | `00 0f ac 02` | PSK | not SAE or 802.1X |
| 18–19 | `c0 00` | capabilities `0x00c0` | bit 6 MFPR and bit 7 MFPC set |

**Check the arithmetic:** `2+4+2+4+2+4+2 = 20`; a 20-byte payload plus two IE header bytes totals 22. MFPR means PMF is **advertised as required** for this BSS. It is not evidence of a particular client association, valid management-frame MIC, accepted deauthentication or password strength. A four-way handshake, station profile and client/AP logs answer different questions.

## Practice before the scenario

Decode `30 18 01 00 00 0f ac 04 01 00 00 0f ac 04 02 00 00 0f ac 02 00 0f ac 08 80 00` yourself. Stop after each count and check the declared 24 payload bytes. **Self-check:** one CCMP pairwise suite, **two** AKMs (PSK and SAE) and `0x0080` (MFPC only, not MFPR): transition-mode advertisement, not proof that a client downgraded. This is the input to `scn-03-rsn-decode`; explain what station evidence would distinguish PSK from SAE negotiation.

Now inspect `frontend/public/pcaps/wpa3/wpa3-transition.pcapng` with Wireshark, or locally:

```bash
tshark -r frontend/public/pcaps/wpa3/wpa3-transition.pcapng \
  -Y 'wlan.fc.type_subtype == 8' -T fields -e frame.number -e wlan.bssid \
  -e wlan.rsn.akms.type -e wlan.rsn.capabilities.mfpc -e wlan.rsn.capabilities.mfpr
```

Cite the **capture** frame and hash separately from the example byte string. If the two advertisements differ in extra fields, report only the fields you verified; do not assume all captures contain an identical IE. Submit a three-line evidence record: advertised policy, one unsupported inference, next authorized observation.

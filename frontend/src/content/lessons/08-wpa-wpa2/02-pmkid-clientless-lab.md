# PMKID Collection Without a Full Handshake (Lab)

> Artifact: `pmkid.pcapng` — six synthetic teaching frames including authentication/association and an EAPOL-Key M1 carrying a PMKID KDE. The PMKID is derived from the documented lab PSK. This is not literally clientless: a station/AP exchange is represented, and collection availability depends on AP/client behavior.

## 1. What a PMKID is

A PMKID may be included in EAPOL-Key M1 key data when the AP/client use a PMKSA. Availability depends on implementation, association and caching behavior; it is not guaranteed merely because 802.11r is enabled.

```text
dd 14 00 0f ac 04 ‖ PMKID(16)
 │  │  └── OUI 00-0F-AC, type 04 (PMKID KDE)
 │  └── KDE length 20
 └── vendor-specific element ID 221
```

```text
PMKID = HMAC-SHA1-128(PMK, "PMK Name" ‖ AA(AP MAC) ‖ SPA(STA MAC))
```

For WPA-Personal, the PMKID gives a candidate passphrase an offline verification value. A collector may obtain a PMKID without capturing the complete four-message EAPOL handshake, and often without deauthenticating a victim. Depending on method/AP behavior, an associated or test station exchange may still be needed. “Clientless” is common shorthand for not requiring a full victim handshake; it does not mean no station participates.

## 2. Operational comparison

| | Four-way handshake | PMKID |
| --- | --- | --- |
| Evidence needed | Commonly M1+M2, or another sufficient message pair | PMKID-bearing M1 |
| Full four-message exchange | Not required for an offline audit | Not required |
| Station/AP activity | Usually an association/handshake; an authorized test may prompt reconnection | An AP/client PMKSA exchange must expose it; collection methods vary |
| Forced disruption | Not inherently required; deauth is sometimes used to induce a handshake | Not inherently required |
| Availability | Depends on a suitable captured handshake | Depends on AP/client behavior and PMKSA state |

Both can support offline PSK guessing. The PMKID method changes the capture requirements; it does not make a weak passphrase safe or prove a production network is vulnerable. A missing PMKID is inconclusive.

## 3. Lab

```bash
tshark -r pmkid.pcapng -Y 'eapol.type == 3' \
  -T fields -e frame.number -e wlan.sa -e eapol.keydes.key_info -e eapol.keydes.key_data_len -e eapol.keydes.key_data

hcxpcapngtool -o pmkid.hc22000 pmkid.pcapng
hashcat -m 22000 pmkid.hc22000 wordlists/wififorge-lab-psk.txt --show
```

Use these commands only with the bundled lab artifact or an explicitly authorized capture.

Tasks:

1. Extract the PMKID and re-derive it from the lab PSK/SSID (`scripts/verify-lab-artifacts.py` shows the calculation).
2. Explain why the formula includes both AP (AA) and station (SPA) addresses.
3. Compare the hashcat lines produced from `pmkid.pcapng` and `wpa2-handshake.pcapng`: which fields differ, and why does the 22000 format carry both?
4. State the limits: PMKID availability varies by AP/client behavior; its absence does not mean “no offline risk.”

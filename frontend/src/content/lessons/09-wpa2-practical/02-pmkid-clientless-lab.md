# PMKID: Clientless Capture (Lab)

> Artifact: `pmkid.pcapng` — six frames: beacon, auth, association, and **M1 carrying a PMKID KDE**.
> The PMKID is the real `HMAC-SHA1-128(PMK, "PMK Name" | AA | SPA)` of the documented lab PSK.

## 1. What a PMKID is

When an AP supports PMK caching (fast roaming/802.11r-style reassociation), M1 may include a **PMKID KDE**
in its key data:

```
dd 14 00 0f ac 04 ‖ PMKID(16)
 │  │  └── OUI 00-0F-AC, type 04 (PMKID KDE)
 │  └── KDE length 20
 └── vendor-specific element ID 221
```

```
PMKID = HMAC-SHA1-128(PMK, "PMK Name" ‖ AA(AP MAC) ‖ SPA(STA MAC))
```

Because the PMKID is a keyed function of the PMK, a candidate passphrase can be tested **offline**:
`hcxpcapngtool` extracts it into the same 22000 format, and no client handshake completion is required.

## 2. Why it matters operationally

| | 4-way handshake | PMKID |
| --- | --- | --- |
| needs a client to connect | yes (or you must disconnect one) | no |
| frames needed | M1+M2 (MIC) | single M1 |
| active disruption | often (deauth to force reconnection) | none |
| availability | depends on clients roaming | only if PMK caching is enabled |

The security consequence is the same as any offline PSK guessing attack; the operational difference is
that it can be collected **passively**, which changes the noise level of the test.

## 3. Lab

```bash
tshark -r pmkid.pcapng -Y 'eapol.type == 3' \
  -T fields -e frame.number -e wlan.sa -e eapol.keydes.key_info -e eapol.keydes.key_data_len -e eapol.keydes.key_data

hcxpcapngtool -o pmkid.hc22000 pmkid.pcapng
hashcat -m 22000 pmkid.hc22000 wordlists/wififorge-lab-psk.txt --show
```

Tasks:

1. Extract the PMKID bytes from the capture and re-derive it from the lab PSK/SSID
   (`scripts/verify-lab-artifacts.py` shows the calculation).
2. Explain why the client MAC (SPA) is part of the formula — and what that means for a PMKID captured
   when the client is not present.
3. Compare the hashcat lines produced from `pmkid.pcapng` and `wpa2-handshake.pcapng`: which fields differ,
   and why does the 22000 format carry both?
4. State the *limits*: which APs will never expose a PMKID, and why the absence of a PMKID does not mean
   "no offline risk".

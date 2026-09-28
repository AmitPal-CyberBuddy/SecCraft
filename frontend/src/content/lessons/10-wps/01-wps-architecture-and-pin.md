# WPS Architecture and the PIN Flaw

> Lab tier: **HYBRID** — enumeration is SIMULATION (`wps-beacon.pcapng`); PIN attacks against live
> hardware are **RF_REQUIRED** and need explicit authorisation.

## 1. How WPS works

WPS (Wi-Fi Simple Configuration) lets a user join a WPA2-PSK network without typing the passphrase, using
one of several methods advertised in the WPS IE:

| Method | Bit (config methods) | Notes |
| --- | --- | --- |
| Label / PIN | 0x0004 | 8-digit PIN printed on the device — the weak method |
| Display | 0x0008 | AP shows a PIN the client types |
| Push button (PBC) | 0x0080 | no PIN; vulnerable to *physical* window abuse, not to math |
| NFC / USB | other bits | out of scope for RF testing |

The WPS IE (vendor ID 221, OUI `00:50:F2`, OUI type `04`) carries attributes you can read from a beacon:
version, config methods, **AP setup locked**, **selected registrar**, device password ID, device name.

## 2. The 8-digit PIN is really 11 000 guesses

The PIN is 8 digits: `D1 D2 D3 D4 D5 D6 D7 C`, where the last digit `C` is a **checksum** of the first
seven. WPS also validates the PIN in two halves:

* the AP tells the enrollee whether the **first half** (D1–D4) is correct — 10^4 = 10 000 possibilities;
* then whether the **second half** (D5–D7) is correct — 10^3 = 1 000 possibilities.

So the effective search space is ~11 000 attempts, not 10^7 — and each half can be attacked
independently. Versions of the attack (e.g. "pixie dust") abuse implementation flaws in how the AP
generates its own nonces and can be faster, but they are implementation-specific, not universal.

## 3. What actually stops it

* **Disable WPS** (`wps_state=0`). This is the only complete fix for the PIN method.
* If a product requires WPS: enforce **attempt lockout** and lock the registrar aggressively, and use PBC
  only when physically attended.
* **WPS 2.0 / "WPS with NFC"** removes the PIN method for newer devices, but the older IE may still be
  advertised — always read the IE, never trust the product name.
* Monitoring: repeated WSC exchanges (`EAP-WSC`, type 254) against the same BSSID is a strong WIDS signal.

## 4. Lab

```bash
tshark -r wps-beacon.pcapng -Y 'wlan.tag.number == 221' \
  -T fields -e frame.number -e wlan.bssid -e wlan.ssid -e wps.version -e wps.config_methods \
  -e wps.ap_setup_locked -e wps.selected_registrar -e wps.device_password_id
```

Tasks:

1. Which BSS is WPS-enabled and **not** locked? Which is locked? Cite frame numbers.
2. Decode the config methods: which methods does each AP offer? Is PBC available?
3. The capture also contains an EAP-WSC identity exchange. Why does WPS traffic appear as EAPOL/EAP rather
   than as ordinary data frames?
4. Write the finding: is "WPS enabled, PIN method advertised" a vulnerability on its own? Argue both
   sides, then state the condition under which it becomes one (lockout absent, PIN method available,
   reachable by an unauthorised party).

## 5. Remediation and retest

```
# hostapd — disable WPS entirely
wps_state=0
ap_setup_locked=1
```

Retest: re-enumerate the BSS and show the WPS IE is gone (or setup-locked with lockout enforced and
verified by triggering it in the lab), then attempt one WSC exchange and record the rejection.

## 6. Decision practice

**`scn-10-wps-locked`** — setup-locked is set. Do you report "no WPS risk"? What else do you check first?

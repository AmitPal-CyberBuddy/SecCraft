# SAE, Transition Mode and OWE

## What you must be able to do

* Distinguish WPA3-only from transition mode from the RSNE alone, and explain the downgrade path.
* Explain why SAE resists offline guessing and what an attacker can *still* do.
* Explain OWE's role and its PMF requirement.

## 1. SAE (Simultaneous Authentication of Equals)

SAE is a password-authenticated key exchange (Dragonfly) that replaces the PSK handshake:

```
commit   : each side sends a scalar + element derived from the password and a random value
confirm  : each side proves knowledge of the shared secret (and its own contribution)
PMK      : derived from the resulting shared secret — fresh for every association
```

Properties that matter for testing:

* **No offline dictionary attack.** Nothing in the exchange lets an attacker test a passphrase offline:
  each guess would have to be *used* in a live exchange (online guessing, rate-limited by anti-clogging
  tokens, commit retries and lockout).
* **Forward secrecy.** Recording the exchange today and learning the password tomorrow does not recover
  the session keys.
* **PMF is mandatory** in WPA3-Personal (MFPC + MFPR set in the RSNE).
* **Groups**: 19 (P-256), 20 (P-384), 21 (P-521) — these are **elliptic-curve** (Weierstrass) groups;
  MODP groups 22–24 exist in the standard but are not the default. WPA3-Personal uses 128-bit security;
  the 192-bit Suite B mode adds group 21 with GCMP-256 and BIP-GMAC-256.
* **SAE-EXT-KEY** (AKM 24) is the newer 256-bit variant used by Wi-Fi 6E/7 deployments — if you see it,
  the deployment is modern; do not describe it as "standard SAE".

Do **not** report "SAE is vulnerable to X" based on a lab capture: the commit/confirm payloads cannot be
turned into an offline audit, because no keyed verification value is exposed.

## 2. Transition mode: the downgrade surface

A transition-mode BSS advertises **both** AKM 2 (PSK) and AKM 8 (SAE) and usually MFPC-only:

```
RSNE: version 1, group CCMP, pairwise CCMP, AKM {PSK, SAE}, caps = 0x0020 (MFPC, not MFPR)
```

Consequences:

* A WPA2-era client associates with the **PSK** AKM and runs a normal 4-way handshake — capture of that
  handshake yields crackable material exactly as in module 09 (`wpa3-transition.pcapng` shows this).
* The same passphrase protects both AKMs, so one weak passphrase spoils the WPA3 protection for the whole
  BSS — *for clients that downgrade*.
* MFPR not being set means the management-frame protections of WPA3 are not enforced for those clients.

The finding is not "WPA3 is broken"; it is *"the deployment permits a WPA2 association, so WPA3's
offline-guessing resistance does not apply to all clients"*.

## 3. OWE (Enhanced Open, AKM 18)

OWE replaces "open" with an unauthenticated DH exchange: no password, but per-client encryption and
**PMF required**. Read the RSNE: AKM 18 with MFPC+MFPR is OWE; no RSNE at all is genuinely open
(cleartext). Both may exist in one ESS — a real finding for guests.

## 4. Remediation

```
# WPA3-only (hostapd, 5 GHz example)
wpa=2
wpa_key_mgmt=SAE
sae_password=<long, unique, not a dictionary word>
ieee80211w=2
sae_pwe=2               # allow both SAE PWE derivations (required for 6 GHz interop)
sae_groups=19 20 21
group_mgmt_cipher=AES-128-CMAC
rsn_pairwise=CCMP
wps_state=0
```

Migration reality: some clients never associate with SAE. If transition mode must remain, treat it as a
documented exception with compensating controls (PMF required if the clients support it, monitoring for
PSK-AKM associations to a WPA3 BSS, and a retirement date).

## 5. Lab

`wpa3-only.pcapng` (AKM 8, MFPC+MFPR, a protected deauth) and `wpa3-transition.pcapng` (AKM 2+8, MFPC
only, and a PSK client completing a 4-way handshake).

1. Classify each BSS from the RSNE bytes (cite frames).
2. In the transition capture, which client used SAE and which used PSK? How did you tell?
3. Write both findings (transition downgrade; WPA3-only "no weakness found — say so").
4. What would you capture to *prove* the downgrade in a live engagement, and what would you compare
   before/after?

## 6. Decision practice

**`scn-11-transition-downgrade`** and **`scn-11-owe`**.

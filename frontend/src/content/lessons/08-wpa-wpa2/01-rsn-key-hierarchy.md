# RSN and the Key Hierarchy

## What you must be able to do

Derive the key chain on paper, explain what each key protects, and read the RSNE as a policy statement.

## 1. The chain

```
passphrase/SAE or 802.1X MSK
        │  PMK = PBKDF2-HMAC-SHA1(passphrase, SSID, 4096, 256)      (PSK mode)
        │  PMK = first 256 bits of the MSK                          (802.1X mode)
        ▼
       PMK ──── used by: 4-way handshake (proves knowledge of PMK; derives PTK)
        │
        │  PTK = PRF-512(PMK, "Pairwise key expansion",
        │        min(AA,SPA) ‖ max(AA,SPA) ‖ min(ANonce,SNonce) ‖ max(ANonce,SNonce))
        ▼
   PTK = KCK (16) ‖ KEK (16) ‖ TK (16)  [+ optional 16 for TKIP/GCMP-256]
        │            │           │
        │            │           └─ encryption of unicast data (CCMP: AES-CTR + CBC-MAC)
        │            └─ wraps the GTK during the handshake (NIST AES key wrap)
        └─ computes the EAPOL-Key MIC (HMAC-SHA1 for CCMP, AES-CMAC for GCMP)
        │
   GTK (distributed in M3) ── protects group-addressed data; IGTK/BIGTK provide integrity protection for relevant group-addressed management/beacon frames
```

Two consequences worth stating out loud:

* The PTK is **bound to both MAC addresses and both nonces**. Replaying a captured handshake against a
  different client cannot produce the same PTK.
* In PSK mode **every user shares the PMK**. "Who did what" is not attributable, and one leaked passphrase
  compromises every user until it is changed.

## 2. Reading the RSNE

| Field | Meaning | Red flags |
| --- | --- | --- |
| group cipher | cipher for broadcast/multicast | TKIP or WEP-40 present |
| pairwise list | unicast ciphers offered | TKIP offered alongside CCMP (downgrade surface) |
| AKM list | authentication/key management | PSK + SAE together = transition mode; 802.1X without cert validation on clients |
| RSN capabilities bits 6/7 (`0x0040`/`0x0080`) | MFPR required / MFPC capable | Advertisement alone does not establish the negotiated PMF state of a station |
| PMKID list (optional) | PMKSA identifiers in some association/cache exchanges | may enable offline PSK verification without the complete four-way handshake; availability varies and a station exchange is represented |

## 3. What WPA2 does well, and what it does not

* **Strong**: CCMP confidentiality/integrity per frame, replay protection, key freshness per association.
* **Weak by design**: the passphrase is the entire secret (offline guessing is expected), management frames
  were unprotected until 802.11w, and the handshake is observable — the handshake is not a vulnerability,
  it is the material for an *offline* guess whose difficulty is entirely the passphrase's entropy.

Say it precisely in reports: *"capture of the 4-way handshake allows an offline dictionary attack"*, not
*"WPA2 is broken"*.

## 4. Decision practice

**`scn-08-psk-compromise`** — the passphrase is recovered. Which of these does it actually grant:
(a) live traffic decryption, (b) access to the corporate SSID's VLAN, (c) ability to decrypt other users'
sessions, (d) the RADIUS shared secret? Justify each.

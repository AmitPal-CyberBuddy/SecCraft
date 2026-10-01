# RSN and the Key Hierarchy

## What you must be able to do

Derive the key chain on paper, explain what each key protects, and read the RSNE as a policy statement.

## 1. The chain

```
WPA2-Personal passphrase / WPA3 SAE / 802.1X MSK
        │  PMK = PBKDF2-HMAC-SHA1(passphrase, SSID, 4096, 256)      (PSK mode)
        │  PMK = derived from SAE shared secret                      (SAE mode)
        │  PMK = first 256 bits of the MSK                          (common 802.1X mode)
        ▼
       PMK ──── used by: 4-way handshake (proves knowledge of PMK; derives PTK)
        │
        │  PTK = PRF-512(PMK, "Pairwise key expansion",
        │        min(AA,SPA) ‖ max(AA,SPA) ‖ min(ANonce,SNonce) ‖ max(ANonce,SNonce))
        ▼
   PTK = KCK (16) ‖ KEK (16) ‖ TK (16)  [48-byte CCMP-128 teaching profile]
        │            │           │
        │            │           └─ encryption of unicast data (CCMP: AES-CTR + CBC-MAC)
        │            └─ wraps the GTK during the handshake (NIST AES key wrap)
        └─ computes the EAPOL-Key MIC (HMAC-SHA1-128 in this legacy PSK/CCMP profile)
        │
   GTK (distributed in M3) ── protects group-addressed data; IGTK/BIGTK provide integrity protection for relevant group-addressed management/beacon frames
```

The PTK diagram describes the bundled legacy WPA2-PSK/CCMP-128 profile: its PRF produces sufficient material and the first 48 bytes form KCK/KEK/TK. AKM and cipher jointly determine the KDF, key lengths and EAPOL-Key MIC algorithm. Do not generalize PRF-512 or 16-byte KCK/KEK to every SAE, SHA-256 or Suite-B profile; TKIP also includes separate data-MIC keys. A GCMP label alone does not select AES-CMAC for EAPOL.

Two consequences worth stating out loud:

* The PTK is **bound to both MAC addresses and both nonces**. Replaying a captured handshake against a
  different client cannot produce the same PTK.
* In this **single shared-PSK profile**, users derive the same PMK for the same SSID. The shared credential alone does not provide individual attribution. Captured matching handshake inputs can enable derivation of session keys if that credential is known; do not promise decryption of arbitrary sessions. Per-device/multiple-PSK products need their own configuration analysis.

## 2. Reading the RSNE

| Field | Meaning | Red flags |
| --- | --- | --- |
| group cipher | cipher for broadcast/multicast | TKIP or WEP-40 present |
| pairwise list | unicast ciphers offered | TKIP offered alongside CCMP (legacy path; verify what clients actually select) |
| AKM list | authentication/key management | PSK + SAE together = transition mode; 802.1X identifies an AKM family, not client certificate-validation policy |
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

## Reference and verification boundary

Use the negotiated AKM/cipher and descriptor version, not a generic diagram, to select a calculation. The repository verifier checks the bundled PSK/CCMP fixture profile only. Current field names are documented in Wireshark's [RSNA EAPOL reference](https://www.wireshark.org/docs/dfref/w/wlan_rsna_eapol.html); the common replay-counter field remains under [EAPOL](https://www.wireshark.org/docs/dfref/e/eapol.html). This does not claim verification of every modern AKM.

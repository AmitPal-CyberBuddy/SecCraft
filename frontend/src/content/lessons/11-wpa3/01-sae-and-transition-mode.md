# SAE, Transition Mode and OWE

> Artifact boundary: the WPA3 captures are synthetic teaching fixtures. The SAE-shaped commit/confirm bytes and protected-bit/BIP-shaped management frame are not valid cryptographic exchanges; they do not prove successful SAE authentication or client acceptance. The transition capture does include a reproducible PSK handshake.

## What you must be able to do

* Distinguish WPA3-only from transition mode from the RSNE alone, and explain the downgrade path.
* Explain why SAE resists offline guessing and what an attacker can *still* do.
* Explain OWE's role and its PMF requirement.

## 1. SAE (Simultaneous Authentication of Equals)

SAE is a password-authenticated key exchange (Dragonfly) that replaces PSK-based PMK derivation. A four-way EAPOL-Key handshake still follows SAE to install traffic keys:

```
commit   : each side sends a scalar + element derived from the password and a random value
confirm  : each side proves knowledge of the shared secret (and its own contribution)
PMK      : derived from the resulting shared secret — fresh for every association
```

Properties that matter for testing:

* **Passive-capture resistance.** A correctly implemented SAE exchange does not provide the ordinary WPA-Personal handshake/PMKID offline verifier; a password guess generally requires an online exchange. Online rate limiting is implementation-dependent, and side-channel or implementation flaws remain possible.
* **Forward secrecy (with sound ephemeral randomness and implementation).** Recorded sessions are designed not to reveal their keys merely because the password is later learned.
* **PMF is mandatory for SAE associations.** A WPA3-Personal-only BSS advertises MFPC + MFPR; a transition BSS may advertise MFPC without MFPR to admit legacy PSK clients, while SAE associations still require PMF.
* **Groups**: group 19 (P-256) is a common SAE choice; additional group support depends on implementation and profile. Do not conflate SAE groups with WPA3-Enterprise’s distinct 192-bit security profile. Verify applicable client/AP versions rather than inferring a security level from a group number.
* **SAE-EXT-KEY** (AKM selector 24) is a distinct extended-key variant. Do not infer Wi-Fi generation, security posture, or successful negotiation from that selector alone; check the applicable standard/profile and client support.

Do **not** report "SAE is vulnerable to X" based on this fixture. Its commit/confirm-shaped bytes are not a valid cryptographic exchange. A correctly implemented passive SAE exchange does not expose the ordinary password-derived PSK offline verifier; implementation-vulnerability claims require separate version-specific evidence.

## 2. Transition mode: the downgrade surface

A transition-mode BSS advertises **both** AKM 2 (PSK) and AKM 8 (SAE) and usually MFPC-only:

```
RSNE: version 1, group CCMP, pairwise CCMP, AKM {PSK, SAE}, caps = 0x0080 (MFPC, not MFPR)
```

Consequences:

* A WPA2-era client associates with the **PSK** AKM and runs a normal 4-way handshake — capture of that
  handshake yields crackable material exactly as in Module 08 (`wpa3-transition.pcapng` shows this).
* Deployments often reuse one passphrase for both AKMs, but may configure distinct credentials. If reused, a weak passphrase can be audited from a captured PSK handshake for clients that select PSK; do not assume credential reuse without configuration evidence.
* MFPR not being set means protection is not universally required by this advertisement; capable clients may still negotiate PMF. Check the actual negotiated policy before predicting a client effect.

The finding is not "WPA3 is broken"; it is *"the deployment permits a WPA2 association, so WPA3's
offline-guessing resistance does not apply to all clients"*.

## 3. OWE (Enhanced Open, AKM 18)

OWE uses an unauthenticated Diffie–Hellman exchange: no shared password, but per-association link encryption and PMF support/requirements under the applicable profile. Read the complete advertised policy: AKM 18 identifies OWE; an absent RSNE alone does not prove an open network because legacy WEP is also possible. An open classification also checks the privacy capability and other security IEs. Multiple guest security modes may coexist; confirm the intended/authorized inventory.

## 4. Remediation

```
# WPA3-only (hostapd, 5 GHz example)
wpa=2
wpa_key_mgmt=SAE
sae_password=<long, unique, not a dictionary word>
ieee80211w=2
# For 6 GHz, follow the applicable Wi-Fi 6E profile and client support; H2E is required there.
sae_groups=19 20 21
group_mgmt_cipher=AES-128-CMAC
rsn_pairwise=CCMP
wps_state=0
```

Migration reality: some clients never associate with SAE. If transition mode must remain, treat it as a
documented exception with compensating controls (PMF required if the clients support it, monitoring for
PSK-AKM associations to a WPA3 BSS, and a retirement date).

## 5. Lab

`wpa3-only.pcapng` advertises SAE (AKM 8) and MFPC+MFPR; it contains synthetic SAE-shaped frames and a protected-bit/BIP-shaped deauthentication whose MIC is not validated. `wpa3-transition.pcapng` advertises AKM 2+8 and MFPC-only, and includes a reproducible PSK handshake. Neither fixture demonstrates an attacker-induced downgrade or a successful SAE exchange.

1. Classify each BSS from the advertised RSNE (cite frames); distinguish advertisement from negotiation.
2. In the transition capture, identify the station whose PSK handshake is present. What can—and cannot—you infer from the synthetic SAE-shaped frames?
3. Write bounded conclusions: what the selected captures show, which tests were not performed, and what additional evidence is needed before a production risk rating.
4. For a live authorized assessment, what client/AP association, negotiated-AKM/PMF, profile and event-log evidence would support a downgrade claim?

## 6. Decision practice

**`scn-11-transition-downgrade`** and **`scn-11-owe`**.

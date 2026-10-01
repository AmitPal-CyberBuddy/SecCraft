# Public self-review, not a secret exam

## Candidate audit
Guided G1 matches candidate line 2. Independent I1 matches line 3; I2 matches none of the three. Use filename/hash/record ID and tested-set size, not a claimed time-to-crack or keyspace percentage. A correct PMKID comparison confirms consistency of a candidate with this constructed verifier; it does not demonstrate AP acceptance, association, a VLAN assignment or application access.

I2's public fixture credential is `case-only-outside-list-04!`. It is deliberately absent from the permitted set, NOT a claim of strong randomness. Adding it after reading this guide would defeat the independent exercise and exceed its scope. G1 uses `SummerLab2026!`, I1 `WinterLab2026!`. All are teaching values, not real secrets.

PBKDF2-HMAC-SHA1 uses the SSID as salt, 4096 iterations and a 32-byte PMK. The PMKID is the first 16 bytes of HMAC-SHA1(PMK, "PMK Name" || AP || station). SAE does not expose this ordinary password-derived PSK verifier. File hashes establish consistency, not genuine collection or authorization.

## WPS
wps-beacon frames 1–2 supply advertised WPS attributes. They do not prove a vulnerable PIN implementation, registrar reachability, attack success or measured lockout. W2 is a separate fictional log: stop at third rejection/lock at 80 seconds, with no fourth request. The three-attempt cap also prevents continuing. A hypothetical 900-second wait extends beyond the remaining 520 seconds; it cannot justify resuming inside this window. Cooldown was not measured. Do not bypass lockout or power-cycle a device to continue a budget-limited test.

The PIN split reduces a conditional online search to roughly 10,000 + 1,000 candidates only when the implementation exposes useful half-validation feedback and permits attempts. Rate limits, lockout, implementation behavior and scope govern actual feasibility. Pixie Dust requires specific implementation/randomness conditions, not merely a WPS IE. PBC does not use the split PIN search but still requires a controlled enrollment window and consideration of nearby unauthorized enrollees.

## WPA3
wpa3-only frame 1: AKM [8], group/pairwise CCMP, caps 0x00c0 (MFPC and MFPR). wpa3-transition frame 1: AKMs [2,8], caps 0x0080 (MFPC only). The latter permits PSK compatibility; its constructed PSK handshake does not prove an attacker forced a downgrade. Absence of MFPR does not mean all clients negotiate PMF off. The SAE-shaped records do not establish successful authentication, and the BIP-shaped record has no validated MIC.

Audit PSK material only where an actual compatible verifier exists. Shared credentials across PSK/SAE require owner configuration evidence. OWE encrypts the link without authenticating AP identity; Enterprise 192-bit profiles are not a synonym for a stronger SAE password setting.

## Review gates
Every conclusion cites bytes or an attributed authored record; scope stays bounded; unmatched is not “secure”; advertisement is not negotiation; successful offline checking is not access; no timing/severity is invented; retests are proposed, not performed. Request instructor review for execution competence. Missing hosted infrastructure does not prevent completing these evidence exercises.

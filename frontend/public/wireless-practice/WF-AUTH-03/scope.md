# WF-AUTH-03: scope and provenance

All targets, credentials and records are fictional teaching material. Permission applies only to these bundled files. Never test an actual network with a matching name or address.

Available: offline PMKID candidate verification, capture interpretation and written policy decisions. A local Python 3 interpreter can run audit.py; no GPU, radio, cloud lab or third-party package is required. The browser command simulator cannot run Python. With no interpreter, read the provided reference-results.json and explicitly mark “reviewed supplied results; not independently executed”.

Guided and independent JSON files are freshly constructed PMKID records, NOT exports from the accompanying captures. They deliberately have different SSIDs and device addresses. Keep filenames/hashes and record IDs in every claim. The PMKID computation models WPA2-Personal PBKDF2/HMAC only; do not apply it to SAE or Enterprise authentication.

Budget: exactly the three candidates in candidates.txt for each record, no expanded lists or mutation rules. Stop after the supplied set. A failed candidate set is not proof of strong credentials. All fixture credentials are public in the generator/review guide: this is practice, not a secret exam.

Policy comparison files reuse three existing catalogue captures: wps-beacon (9 frames), wpa3-only (6), wpa3-transition (11). Their JSON views are derived from those files, not independent confirmations. SAE-shaped bytes and BIP-shaped management data are illustrative, not valid cryptographic exchanges. The transition capture has a reproducible PSK handshake. No live association, WPS PIN recovery, measured lockout or attacker-induced downgrade was performed.

The fictional WPS log is an authored reasoning exercise, not endpoint evidence. A real WPS test would require its own authorization, device/client versions, isolation, disruption limits and stop/reset plan. Hosted live labs remain unavailable. Keep unavailable execution outcomes NOT TESTED; they do not block offline lessons.

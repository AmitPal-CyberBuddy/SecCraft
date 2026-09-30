# Cryptography and Device Identity: Mechanism and Worked Trace

> **Scope:** original synthetic training files only. The [source case pack](/android-cases/cases.json) is not a compiled APK or a device capture. Download the [Notes Boundary source project](/android-demos/notes-boundary-source.zip) only for the one mock note/URI demo it actually contains. Use an owned emulator and authorized test builds for optional runtime work; no observed runtime result ships here.

## Threat boundary

Test key use, algorithms, IV/nonce generation, lifecycle, keystore protection and biometric/app authorization separately. Device integrity and anti-tamper signals require a server-side decision to affect privileged actions.

## Worked observation → interpretation → limit

The Vault excerpt uses a constant 12-byte nonce for AES-GCM. Reusing the same nonce with a key violates GCM requirements; some Android providers may reject repeated IV use rather than produce two ciphertexts. The alternative lets the provider generate an IV and stores it beside ciphertext. Neither excerpt shows a key, ciphertext or compiled code.

The relevant source excerpt is labeled **Vault.kt (illustrative excerpt)**. In the Lab tab, read the candidate and safer comparison before answering. Identify the source of untrusted input, the sink, and the missing proof. Both excerpts are illustrative and omit decrypt, encoding, storage and key generation.

## A safer decision

Never call a sample key stolen or infer a cryptographic attack from source alone. Provider behavior and actual build data are NOT TESTED. A finding requires an exact artifact hash, OS/API and target SDK context where relevant, a controlled positive and negative observation, and a bounded conclusion. In this authored example, the only safe claim is what the named source files express. The distinct Android cases are *not* one deployed application.

**Practice standard:** this unit touches [MASVS-CRYPTO](https://mas.owasp.org/MASVS/), but a thematic alignment is not a completed OWASP verification test. Refer to the applicable MASTG atomic test only when the actual build and method can be matched. No account XP or locally revealed answer proves field skill.

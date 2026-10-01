# WF-ENT-05 — Enterprise trust and policy evidence

Available: public certificate-file verification on your own computer (Python 3 and OpenSSL 3), offline packet analysis, authored policy-model reasoning and a public rubric. No live EAP, RADIUS server, supplicant, portal, cloud VM or radio is provisioned. The browser command simulator cannot run these scripts.

Permission is limited to these files. All identities, credentials and keys are teaching values. Never install these roots into a browser/OS trust store, use the deterministic public-seed keys for real authentication or connect to matching names/addresses. The ZIP contains public certificates only; no private key is written or shipped. The certificate generator uses public deterministic seeds and is not a production PKI.

The certificate checker isolates its trust to trusted-root.pem, pins the reference time to 2026-10-01T00:00:00Z and checks server purpose. “ca-only” omits the expected DNS name; “strict” adds aaa.lab.example. These are real offline cryptographic file checks, not collected supplicant outcomes. In a real test use actual time, supported client policy, effective trust stores, revocation requirements and measured client/AP logs. No OCSP/CRL, device profile, TLS negotiation or key possession is checked here.

The server-good and same-root wrong-name certificates demonstrate why trusting a CA is not the same as restricting server identity. Other examples test an untrusted issuer, expiry at the pinned time, and a client-only EKU. The Ed25519 files are supported by this OpenSSL exercise; no EAP client/firmware interoperability is claimed.

enterprise.pcapng (11 frames) and eap.pcapng (12) retain abbreviated teaching bytes; they are not complete TLS tunnels. radius.pcapng (10) contains paired AAA teaching transactions with verifiable outer authenticators, direct illustrative MS-CHAPv2 values, a VLAN attribute, accounting and a wrong-secret control. It is not a PEAP session, live EAP peer, MSK transport or applied network policy. The three scenes and certificate fixtures do not belong to one captured engagement.

policy-model.json describes separate fictional client/AP/AAA/forwarding records for reasoning. Do not call them collected logs or claim you ran the model's network tests. Shared identifiers and clocks alone cannot join unrelated packets. Mark live authentication, certificate acceptance by an actual supplicant, credential exposure, VLAN placement and application reachability NOT TESTED.

Extract the ZIP, preserve original files/hashes and verify SHA256SUMS. Hashes establish byte consistency, not real collection or authorization. Browser-only learners can use reference-results.json and explicitly record “reviewed supplied outcomes; not independently executed”. Local completion is participation, not trusted grading or field certification.

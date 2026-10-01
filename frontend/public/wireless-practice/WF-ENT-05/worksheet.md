# Enterprise trust worksheet

Start with source filenames/hashes, review-versus-execution method and scope. Do not merge independent packet scenes, certificate tests and model records into a claimed live session.

## 1. Method and exposure
For E1–E4: roles | proposed method/control | visible versus tunnel-protected material | missing evidence | next authorized question. Separate outer identity privacy from inner credentials. Explain server validation in password-based tunnels, mutual certificate authentication, client-key possession, EAP-PWD and Wi-Fi security-profile labels. No real credential recovery is required.

## 2. Certificate checks
Predict results before using reference-results.json. Run `python3 check-certificates.py ca-only` then `python3 check-certificates.py strict` if local tools are available. Record OpenSSL version, reference time, selected trust anchor, expected name, purpose, per-file result and failure reason. Which bad certificate passes the incomplete-name policy? Which negative controls fail under both? Is this a complete revocation or supplicant validation test?

Write a bounded before/after statement: the local verifier's policy changed, not a deployed client profile. Keep the good server as a positive control. Explain why globally adding the lab root or disabling validation on a real device is neither needed nor authorized.

## 3. RADIUS correlation and integrity
List the radius.pcapng request/reply pairs by frame, code, identifier, endpoint/port tuple and request authenticator. The request's RADIUS ID is not the EAP ID. Identify the accounting pair and the deliberately wrong-secret request. Find VLAN 100 in the Accept, then list the missing placement/enforcement evidence.

For responses carrying EAP, explain the Message-Authenticator calculation with the request authenticator in the header, followed by Response Authenticator computation. Accounting Request uses its own MD5 authenticator construction, not a random Access-Request nonce. All disclosed secrets/nonces are teaching values, not production credentials.

## 4. Integrated model handoff
For S1–S4 classify: consistent within model, secure rejection, policy/application mismatch, or insufficient evidence. Identify the failure layer before prescribing password changes. Propose a real one-attempt collection contract with synchronized clocks, client/profile/certificate chain, NAS/AAA transaction IDs, AP/switch policy and bounded allowed/denied application tests. Include timeout, impact stops and restoration. Mark all live outcomes NOT TESTED.

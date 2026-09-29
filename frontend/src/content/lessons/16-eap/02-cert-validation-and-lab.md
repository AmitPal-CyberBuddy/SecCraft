# Certificate Validation and the PEAP Lab

> Conceptual procedure, not an executable capture lab: the bundled `eap.pcapng`, `radius.pcapng` and `corporate-attacks.pcapng` are separate synthetic fixtures. None contains a complete rogue PEAP/TLS session, certificate-validation result, or coherent credential-capture chain. Any live test must use an isolated, authorized lab and test accounts.

## 1. The rogue authenticator, conceptually

```
real AP (Corp-WLAN, 802.1X)              rogue authenticator (same SSID, stronger signal)
        │                                        │
        ├── deauth/beacon pressure ──────────────┤ client associates to the twin
        │                                        │
        │                               EAP-Request/Identity
        │                                        │        (rogue presents *its* certificate)
        │                       ┌────────────────┴─────────────────┐
        │                       │ client validates?                │
        │                       │  yes → TLS alert, no credentials │
        │                       │  no  → inner MS-CHAPv2 exchange  │
        │                       └────────────────┬─────────────────┘
        │                                        │
        │                       attacker captures: username,
        │                       server challenge, peer challenge, NT-Response
        │                                        ▼
        │                             hashcat -m 5500 → password
```

Two outcomes, two completely different findings:

* **Validation enforced** → the client should reject a server with the wrong trust/identity. Verify with the supplicant log and a controlled test; a TLS alert alone does not identify why the handshake failed.
* **Validation missing** → a rogue authenticator may be able to terminate the tunnel and obtain inner-method material, depending on profile and method. Demonstrate only with a controlled client/test account; establish impact separately.

## 2. Lab procedure (own hardware, authorised lab)

1. In an isolated, authorized lab, configure a test authenticator with a test server certificate and matching private key; do not target a production SSID. Validate the certificate chain and server name through the actual supplicant profile and its logs (`openssl s_client` does not emulate EAP).
2. Configure a test client **without** `ca_cert`; connect. Capture with `tshark`.
3. Repeat with `ca_cert` and `domain_suffix_match` set. Capture the difference.
4. Compare only lab-generated evidence and supplicant logs. Do not infer credential exposure from a missing field in a packet capture alone.

```bash
# hostapd side (isolated test authenticator; exact options depend on hostapd version)
#   ssid=Corp-Lab, wpa_key_mgmt=WPA-EAP, eap_server=1
#   server_cert=/path/to/lab-server.pem, private_key=/path/to/lab-server.key
#   ieee80211w=1 (PMF capable/optional; not an evil-twin defense by itself)

# client side: confirm which identity/cert is presented
sudo wpa_supplicant -i wlan0 -c lab-client.conf -dd 2>&1 | grep -Ei 'certificate|TLS|alert'
```

## 3. What you must record

| Artefact | Why it is needed |
| --- | --- |
| BSSID/beacon compared with an authorized inventory | supports identification; a beacon alone does not prove unauthorized ownership |
| Client association and supplicant log | establishes which BSS the test client joined and its observed validation decision |
| Inner exchange capture (test account only) | shows the material actually exposed; method and tunnel context must be verified |
| Redacted client profile | helps identify trust/name-validation settings; correlate with runtime logs |
| Lab-only password recovery | demonstrates a test-account risk, not credential reuse or lateral movement |
| Repeated controlled test with validation enforced | evidence for the tested profile/client; do not generalize to all devices |

## 4. Remediation, in order of strength

1. **EAP-TLS** with client certificates — remove the password from the exchange entirely.
2. **Enforce certificate validation** on every client profile: `ca_cert` + `domain_suffix_match`
   (and machine-level, GPO/MDM-managed profiles that users cannot edit).
3. **Disable PEAP-MSCHAPv2** server-side where possible; if not, require machine/user certificate checks
   before evaluating the password.
4. **PMF required** to protect robust management frames on supporting clients. This reduces spoofed deauth/disassoc paths but does not authenticate an AP or prevent every evil-twin technique.
5. **Monitoring** for rogue BSSIDs / duplicate SSIDs and for anomalous EAP flows.

## 5. Retest

Repeat a controlled test with the corrected profile. Verify expected server identity and rejection of the untrusted test server in client logs; do not rely on a TLS alert alone or treat a packet capture as proof of profile configuration. Record the test inputs, relevant logs, captures and hashes.

## 6. Decision practice

**`scn-16-cert-validation`** — the client has `ca_cert` but the rogue certificate chains to the same root.
What still has to be checked, and what is the residual risk?

# Certificate Validation and the PEAP Lab

> Lab: `eap.pcapng`, `radius.pcapng`, plus the rogue-authenticator material in `corporate-attacks.pcapng`.
> Everything here uses documented lab values; the technique must only ever be run against a network you
> own or are authorised to test, with the roaming-capture risk explicitly accepted in writing.

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

* **Validation enforced** → the attempt fails. Evidence: supplicant log ("certificate verify failed"),
  TLS alert in the capture. Report it as *control verified*, not as a finding.
* **Validation missing** → credentials captured. Evidence: MS-CHAPv2 material, the cracked password,
  the client profile setting. That is a credential-compromise finding with a lateral-movement impact.

## 2. Lab procedure (own hardware, authorised lab)

1. Configure `hostapd` with `WPA-EAP` and a self-signed certificate for the SSID under test; verify with
   `openssl s_client` that the certificate is *not* the corporate CA.
2. Configure a test client **without** `ca_cert`; connect. Capture with `tshark`.
3. Repeat with `ca_cert` and `domain_suffix_match` set. Capture the difference.
4. Extract and crack the material from step 2 only; confirm step 3 produced none.

```bash
# hostapd side (rogue authenticator, lab only)
#   ssid=Corp-Lab, wpa_key_mgmt=WPA-EAP, eap_server=1, ca_cert=/etc/hostapd/lab-ca.pem
#   ieee80211w=1 (optional: offer PMF capable)

# client side: confirm which identity/cert is presented
sudo wpa_supplicant -i wlan0 -c lab-client.conf -dd 2>&1 | grep -Ei 'certificate|TLS|alert'
```

## 3. What you must record

| Artefact | Why it is needed |
| --- | --- |
| Rogue BSSID + beacon (IE fingerprint) | proves the infrastructure was not the client's authorised AP |
| Client association to the twin | proves the client accepted the impersonation |
| Inner exchange capture | the credential material itself |
| Client configuration excerpt (redacted) | the root cause: missing `ca_cert` / `domain_suffix_match` |
| Cracked password (lab only) | impact: credential replay against other services |
| Failed attempt with validation on | proof the control works (retest evidence) |

## 4. Remediation, in order of strength

1. **EAP-TLS** with client certificates — remove the password from the exchange entirely.
2. **Enforce certificate validation** on every client profile: `ca_cert` + `domain_suffix_match`
   (and machine-level, GPO/MDM-managed profiles that users cannot edit).
3. **Disable PEAP-MSCHAPv2** server-side where possible; if not, require machine/user certificate checks
   before evaluating the password.
4. **PMF required** so a client cannot be trivially moved to the twin by deauth.
5. **Monitoring** for rogue BSSIDs / duplicate SSIDs and for anomalous EAP flows.

## 5. Retest

Repeat step 2 with the fixed profile: the capture must contain a TLS alert and no MS-CHAPv2 exchange.
Record both captures and their hashes. This is the retest evidence the client needs — a config change
alone is not proof.

## 6. Decision practice

**`scn-16-cert-validation`** — the client has `ca_cert` but the rogue certificate chains to the same root.
What still has to be checked, and what is the residual risk?

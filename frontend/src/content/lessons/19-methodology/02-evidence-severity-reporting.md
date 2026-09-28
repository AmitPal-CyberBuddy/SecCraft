# Evidence, Severity and Reporting

## 1. The evidence standard

Every finding carries: **claim → artefact → method → interpretation → limit → impact → remediation → retest**.

| Class | Examples | Integrity requirement |
| --- | --- | --- |
| Capture | pcapng of the exchange | SHA-256 at collection; hash in the report |
| Derived data | hc22000 file, extracted keys (lab) | hash + exact command line |
| Configuration | hostapd/wpa_supplicant excerpts, switch port config | source system, date, redaction note |
| Application/AAA logs | RADIUS auth log lines | timestamp, source host, correlation ID |
| Radio facts | channel, power, timings, signal | measurement tool + conditions |
| Reproduction | step list that a third party can follow | must be unambiguous and safe |

Screenshots are *illustrative*, never primary evidence: they can be edited and cannot be re-analysed. A
frame number plus filter plus capture hash can be.

## 2. Severity is derived, not assigned

Work through the chain explicitly:

```
Finding: clients complete a 4-way handshake with a guessable PSK on Corp-WLAN
Exploitability : offline, no auth required; requires RF proximity; dictionary attack succeeded in 4 s
Impact         : L2 access to Corp-WLAN; user traffic decryptable with the PSK;
                 shared PSK means no user attribution
Environment    : Corp-WLAN has access to the internal server VLAN (confirmed by segmentation test)
→ Severity     : High (would be Medium if the WLAN were isolated to internet-only)
```

**CVSS is a calculation, not a label.** Use it as a tool: state the vector, justify each metric from the
findings, and show how a different environment changes the score. A technique on its own has **no**
CVSS score — "WPS enabled" scores differently on a home router with lockout than on a corporate AP where
the PIN is not the joining method. Where you provide numbers, label them as *example* vectors derived from
the engagement's actual context.

| Factor | Question that changes the score |
| --- | --- |
| Attack vector | local/RF proximity vs. internet-reachable |
| Attack complexity | does it require a specific client action or rare condition? |
| Privileges | none / user / admin already required |
| User interaction | auto-connect behaviour (none) vs. tricking a user |
| Confidentiality/Integrity/Availability | what is *actually* reachable or affected? |
| Scope | does compromise cross a security boundary (guest → corporate)? |

## 3. Writing pattern

```
F-03 — PEAP-MSCHAPv2 credentials capturable by a rogue authenticator
Severity : High    [example vector: CVSS:3.1/AV:A/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:N — justify each metric]
Summary  : Client profiles omit certificate validation; a rogue authenticator terminates PEAP and
           captures MS-CHAPv2 material that is offline-crackable.
Evidence : corporate-attacks.pcapng (SHA-256 …), frames 9–14 (EAP exchange);
           cracked password reproduced with hashcat -m 5500 (rate/time …);
           client profile excerpt without ca_cert / domain_suffix_match.
Impact   : Captured credentials were valid for VPN and SSO (tested with an authorised test account);
           on-path attacker can move from RF proximity to network credentials.
Remediation : Enforce ca_cert + domain_suffix_match via MDM; prefer EAP-TLS; require PMF; rotate credentials.
Retest   : Re-run the rogue-authenticator test — expect a TLS alert and no MS-CHAPv2 exchange (see §4).
Limits   : Testing used the client profiles provided; other device families were not sampled.
```

## 4. Retest is a test, not a promise

A retest is credible only if it repeats the original test:

* same target and method (and, where relevant, the same tool and parameters)
* same evidence extraction (filter, frame list, hash comparison)
* explicit pass/fail against the original finding
* a new recommendation if the fix only moved the problem (e.g. "WPS disabled, but WPS IE still advertised
  by a repeater")

Example — PMF: original deauth test disconnected a client; after `ieee80211w=2`, the same test produces no
disconnection and the capture shows SA Query. That is a *verified fix*.

## 5. Reporting pitfalls to avoid

* Severity inflation ("critical" for a lab-reproduced weak PSK on an isolated guest network).
* Copying a CVE's CVSS score onto a configuration finding.
* Omitting the environment assumptions that made the impact real.
* Presenting command output without the claim it supports.
* Burying the retest criteria — the client should be able to schedule the retest from the report alone.

## 6. Decision practice

**`scn-19-severity-context`** — three environments, one finding; assign and defend the severity.
**`scn-19-retest-fail`** — the "fix" did not hold. Rewrite the retest section.

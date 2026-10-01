# Case scope and owner record

All records are fictional. Permission here applies to the supplied teaching files only, never to a real network with matching identifiers.

The case owner lists three in-scope APs:

| Alias | BSSID | Intended name | Intended channel | Intended policy |
| --- | --- | --- | --- | --- |
| AP-A | 00:11:22:33:44:55 | LAB-WIFI | 6 | PSK / CCMP; PMF capable, not required |
| AP-B | 00:11:22:33:44:56 | LAB-WIFI | 11 | same policy; intended ESS member with AP-A |
| AP-C | aa:bb:cc:11:22:33 | HIDDEN-LAB | 1 | PSK / CCMP; PMF capable, not required |

CLIENT-A (12:34:56:78:9a:bc) is owner-listed for the exercise. No identity claim is available for 22:33:44:55:66:77. A locally administered bit is not proof of randomization, common device ownership or physical identity. SSID matching and IE fingerprints do not authenticate infrastructure.

Other BSSs and directed names in the file are incidental. Record the minimum needed to note exclusion; do not expand scope or reproduce unrelated directed names in a report. The original immutable capture still contains fictional incidental records; real retention/redaction must follow the owner's policy.

Allowed: inspect supplied files, derive a bounded inventory, review fictional troubleshooting records, correlate the traffic scene with its fictional sidecar and propose a next test. Not allowed by this case: transmission, scanning real targets, credential testing, injection or disruption.

Coverage: the recon file is a constructed multi-channel sequence, not a survey with channel dwell times. No real position, receiver loss statistics, capture-filter settings or synchronized clocks were collected. All observations are positive examples; missing clients/APs/frames cannot establish absence. The traffic scene and its sidecar are a different task, even where addresses match.

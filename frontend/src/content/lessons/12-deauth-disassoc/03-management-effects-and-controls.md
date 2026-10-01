# From a Management Frame to an Effect Claim

> **Available now: offline evidence and model review.** No RF frames are transmitted. Hosted live labs are unavailable. Delivery, receiver acceptance and client impact remain **NOT TESTED**; unavailable hardware does not block this lesson.

## Set a defensible question

A capture contains a burst of deauthentication frames. Your task is not to label it a successful denial of service. Ask which observation would distinguish a captured frame, a receiver decision, a client disconnect and an application outage. These are different claims with different evidence requirements.

Download the [WF-TRUST-04 ZIP](/wireless-practice/WF-TRUST-04.zip), read the [scope](/wireless-practice/WF-TRUST-04/scope.md), then use the [deauth capture](/wireless-practice/WF-TRUST-04/deauth.pcapng) or [decoded view](/wireless-practice/WF-TRUST-04/deauth.json). Keep the [worksheet](/wireless-practice/WF-TRUST-04/worksheet.md) for all three Phase 4 lessons. Verify the extracted files against SHA256SUMS before citing them; a matching hash verifies bytes, not genuine collection.

## Establish each link separately

| Claim | Evidence needed beyond a frame count |
| --- | --- |
| A frame is present | source capture/hash, frame number, subtype, observed addresses and timing |
| A particular device sent it | authenticated/protected context and authorized transmitter evidence; source address alone is insufficient |
| Receiver accepted it | negotiated security state, integrity/replay checks and receiver/AP logs |
| Client disconnected because of it | synchronized state timeline, isolated intervention, alternative causes and negative control |
| Service was disrupted | bounded application-level before/during/after measurements and affected scope |

A retransmission or frame burst is not a count of disconnected clients. A reason code reports a value; it does not authenticate the sender or reveal intent. Beacon PMF capabilities are not a specific station's negotiated state. The supplied clocks and radio values are synthetic and cannot measure a real outage.

## Read the fixture without overclaiming

Select directed deauth, disassociation and SA Query-shaped observations. Record frame IDs, direction and the actual protection flag. For local file analysis only:

```bash
tshark -r deauth.pcapng -Y 'wlan.fc.type_subtype == 12 || wlan.fc.type_subtype == 10 || wlan.fc.type_subtype == 13' \
  -T fields -e frame.number -e frame.time_relative -e wlan.sa -e wlan.da -e wlan.fc.protected
```

The browser simulator cannot execute this command. Use JSON if no local tool is available and label that method. The SA Query-shaped bytes are not proof a valid protected request/response was accepted.

Unicast robust-management protection uses the negotiated pairwise cipher/key. Group-addressed robust-management integrity uses BIP with an IGTK. Do not generalize one to the other, and never treat a Protected bit as a verified MIC. PMF does not authenticate every beacon or guarantee availability against RF interference.

## Decide three model outcomes

Open [management model records](/wireless-practice/WF-TRUST-04/management-outcomes.json). They are deliberately **not collected supplicant logs**, and are not timestamp-correlated with this capture.

- **M0:** only a frame observation exists. What impact can you responsibly report?
- **M1:** the model describes rejection with association and service continuity. Is this a useful defensive outcome? What would be required before claiming you measured it?
- **M2:** a disconnect is near the frame event, but an AP restart and clock uncertainty are also recorded. What alternative explanation survives? Does repeating a disruptive action without controls resolve that ambiguity?

Commit a supported statement and a rejected overclaim for each before reading the public guide.

## Propose—not perform—a bounded validation

A future isolated test needs an owned AP/client, written permission for disruption, negotiated policy evidence, baseline and positive service-health checks, a narrowly defined intervention, maximum duration and immediate stop on unintended impact. Record tool/client/firmware versions and restore the original configuration. Secure rejection can be a successful control result; an unexplained missing response is not.

Deliver your frame-cited observations, the three model decisions, missing evidence and a separate retest proposal. Use the [public review guide](/wireless-practice/WF-TRUST-04/review-guide.md) after drafting. Local completion records participation, not a measured availability assessment.

## Configuration is not implementation assurance

PMF and strong ciphers do not certify every parser, reassembly or key-installation path. KRACK concerns key reinstallation/state handling; FragAttacks concerns fragmentation/aggregation handling; SSID Confusion concerns network-name binding and client interpretation. These are different questions, not synonyms for a weak password or an advertised optional-PMF bit.

Use the [research pointers](/wireless-practice/REFERENCE_GUIDE.md) to identify applicable vendor advisories and affected versions, then obtain owner firmware/client inventory and patch evidence. No exploit fixture or version-specific vulnerability reproduction is supplied here. Report applicability unknown until established; any controlled reproduction needs separate scope, recovery and client/AP evidence. Do not run malformed-frame or exhaustion tests against production simply because a feature is present.

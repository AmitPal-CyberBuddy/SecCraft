# Build an Inventory Without Inventing Coverage

> **Available now: supplied-evidence practice.** WF-OPS-02 contains generated teaching frames, not a real passive survey. No live target or hosted radio is supplied. Optional future collection is a plan, not an exercise you must execute to finish this lesson.

## Prepare the evidence

Use the [case ZIP](/wireless-practice/WF-OPS-02.zip), [scope and owner record](/wireless-practice/WF-OPS-02/scope.md), [recon capture](/wireless-practice/WF-OPS-02/recon-lab.pcapng), [decoded recon evidence](/wireless-practice/WF-OPS-02/recon-lab.json) and [hash manifest](/wireless-practice/WF-OPS-02/SHA256SUMS). Complete the inventory section of the [worksheet](/wireless-practice/WF-OPS-02/worksheet.md).

If you downloaded the ZIP, extract it and verify the files from inside its WF-OPS-02 directory:

```bash
sha256sum -c SHA256SUMS
```

On Windows, use `Get-FileHash -Algorithm SHA256 .\recon-lab.pcapng` and compare it with the manifest. A hash match verifies bytes, not the truth of the owner's claims. Browser-only learners can cite the provided manifest and explicitly say **not independently hashed**.

## Observation is not ownership

Separate three sources: **packet observation**, **owner attribution** and **your inference**. AP-A and AP-B advertise the same name; the owner record says they are intended ESS members. The name alone would not prove that. Similarly, a hidden-name response supplies an observed name for a BSSID; it does not establish security, consent or authenticity.

Create one row per in-scope BSSID, not per SSID. Include alias, observed name, channel/band, group/pairwise cipher, AKM, PMF capabilities, frame numbers, ownership source and confidence/limits. Decode RSN suite type 4 as CCMP and AKM type 2 as PSK; do not mistake the OUI's byte `ac` for a cipher type. PMF capable and PMF required are different bits.

There are more BSSs in the file than the owner lists. Count the incidental observations separately, minimize their identifiers and do not turn discovery into permission to investigate. Do not copy unrelated directed probe names into a client report.

## Reproduce a bounded view

These are local file-analysis commands for your computer, not commands to run against a real network:

```bash
tshark -r recon-lab.pcapng -Y 'wlan.fc.type_subtype == 8 || wlan.fc.type_subtype == 5' \
  -T fields -e frame.number -e wlan.bssid -e wlan.ssid -e radiotap.channel.freq
tshark -r recon-lab.pcapng -Y 'wlan.bssid == aa:bb:cc:11:22:33'
```

In Wireshark, inspect the RSN element, channel metadata and management subtype. If your tool version uses different field names, use its field browser rather than guessing. Without a capture tool, review the same fields in the supplied JSON and record that method honestly. The decoded export is a convenience; it is not an independent source confirming the original bytes.

## Challenge your inventory

1. Which three BSSIDs are in scope? Cite owner rows and packets separately.
2. Which pair of frames shows AP-C's hidden name and later response? Does hiding the name prevent discovery?
3. Which frames support CLIENT-A's probes, open-system authentication and association? Which later security stages are **absent from this file**?
4. Both observed client addresses have a locally administered bit. Why does that neither prove randomization nor show that they belong to the same device?
5. Can the file establish all nearby BSSs, all associated clients or a complete preferred-network list? Explain the missing collection evidence.

## Plan coverage before collecting

This constructed sequence switches channels every few milliseconds without a real receiver or dwell log. Do not interpret that as achievable survey coverage. In a real scoped collection plan, record authorized channels, receiver position, fixed-channel versus hopping strategy, owner-agreed duration, clock source, capture filters, loss statistics and storage/stop rules.

A fixed channel can preserve a conversation while missing other channels. Hopping can broaden observations while missing handshakes and short-lived traffic between visits. Neither makes “not seen” equivalent to “not present”. There is no universal dwell time that guarantees completeness. Ask for additional bounded windows or owner/controller/client logs when necessary.

## Deliver and self-review

Submit to your own learning notes: the scoped inventory, a collection matrix you have **not executed**, and two explicit uncertainty statements. Use the [review guide](/wireless-practice/WF-OPS-02/review-guide.md) only after drafting. A future retest must compare equivalent coverage and configuration; an absent BSSID in a shorter or differently tuned capture does not prove removal or remediation.

## Recognize modern features without adding an attack checklist

An SSID/security summary is not a complete feature inventory. Add optional fields only when the capture or owner record supplies them; use **unknown/not assessed**, not “absent”, when your receiver or parser cannot observe a feature.

| Feature family | What it adds | Follow-up question, not a finding |
| --- | --- | --- |
| 802.11k/v/r roaming | measurement, transition assistance and fast transition are distinct capabilities | Which APs/mobility domain and client profiles participate; is authorization retained correctly after a roam? |
| MBSSID and Wi-Fi 7 MLO | non-transmitted BSS profiles or affiliated links can complicate one-row-per-beacon counting | Which BSS profile/link belongs to the owner, and which bands did the observer actually cover? |
| 6 GHz discovery | receiver support, operation/discovery elements and local channel rules matter | Is the adapter/driver authorized and capable of observing that band? A 2.4 GHz-only file cannot exclude it. |
| DPP / Easy Connect | bootstrapping and profile provisioning, not a replacement cipher | Who is authorized as configurator, how is bootstrap identity checked and how are profiles revoked? |
| Passpoint / ANQP / OpenRoaming | provider discovery, onboarding and federated AAA trust | Which provider/realm and server identity does the managed client trust? Discovery information alone is not authenticated access. |
| Mesh, EasyMesh and peer-to-peer setup | backhaul/controller or direct-device boundaries beyond ordinary AP access | Are setup networks, backhaul and dual-homed devices in scope? Do not assume the front-haul policy covers them. |

These are **recognition and scoping topics**, not new executable labs. No modern-feature packet case or device outcome is supplied. Consult the [reading guide](/wireless-practice/REFERENCE_GUIDE.md), record exact firmware/client/profile versions and request an approved specialist test only when relevant. Do not inflate BSSID counts into physical-device counts or equate an MLO-capable label with consistent security on every link.

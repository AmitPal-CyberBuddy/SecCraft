# Correlate a Timeline and Hand Off Defensible Evidence

> **Available now: offline evidence workflow.** The captures and client sidecar are constructed examples. Local Wireshark/TShark execution is optional; decoded JSON supports the same reasoning. No hosted environment, live client response or independently graded assessment is supplied.

## Establish source identity before sorting events

Use the [WF-OPS-02 ZIP](/wireless-practice/WF-OPS-02.zip), [traffic capture](/wireless-practice/WF-OPS-02/traffic-analysis.pcapng), [decoded traffic evidence](/wireless-practice/WF-OPS-02/traffic-analysis.json), [fictional client log](/wireless-practice/WF-OPS-02/client-log.csv), [clock note](/wireless-practice/WF-OPS-02/clock-note.md) and [worksheet](/wireless-practice/WF-OPS-02/worksheet.md).

The recon and traffic files reuse addresses and a seeded epoch, but represent **separate scenes**. Do not join them into one session. Frame 7 in one file is not frame 7 in another. Every timeline row must carry source filename/hash and frame or event ID.

Record the original hash, tool/version, command/filter and any transformation. Preserve originals. A redacted or filtered file gets its own hash and a mapping back to source frame numbers. Hashes detect byte changes; chain of custody also needs recorded handling, source and transfer history.

## Three clocks you must not confuse

- **Capture timestamp:** the PCAPNG interface clock. This case uses microseconds since Unix epoch. Frame 1 is `1700000000002000`, or `2023-11-14T22:13:20.002000Z`.
- **Relative time:** elapsed since the first packet of that file. Frame 12 has relative time 22 ms, not 24 ms; the first packet starts at .002, not at the whole second. Filtering does not create a new original capture clock.
- **AP TSF / endpoint time:** different sources. A beacon's TSF is not Unix time. The fictional client log uses a separate clock with a supplied offset and uncertainty.

Correct PCAPNG timestamps combine high and low words into one 64-bit counter: `(high << 32) | low`, then apply the interface resolution. Do not interpret those words as seconds and microseconds. Use the current case manifest; older releases of the legacy files had incorrect timestamps and cannot be cited with the repaired hashes.

## Build the packet timeline

Run locally if TShark is installed:

```bash
tshark -r traffic-analysis.pcapng \
  -Y 'wlan.bssid == 00:11:22:33:44:55' -T fields \
  -e frame.number -e frame.time_epoch -e frame.time_relative \
  -e wlan.fc.type_subtype -e wlan.fc.protected -e frame.protocols
```

Browser-only route: use `capture_timestamp_us` and `relative_time_ms` in the decoded JSON. Do not claim to have run the command. Identify association response, EAPOL exchange and the data frames using structure and flags, not the order alone.

As the preceding lesson explains, this fixture intentionally contains unprotected DHCP/ARP/ICMP/DNS/HTTP after the key exchange. Record the actual Protected bit. A beacon advertising CCMP does not prove those frames were encrypted or accepted by an AP. This simplification is not a production-network vulnerability finding.

## Normalize without manufacturing precision

The clock note stipulates that the client clock is **1.500 seconds ahead**, with ±5 ms uncertainty and no measured drift. Subtract 1.500 seconds. Keep the original timestamp and record the assumption; this is not calibration you performed.

Normalize L2, then compare its possible interval with frames 13–17. Which event ordering is indeterminate? Why can matching addresses and close times support correlation but not prove causation? A client state label “connected” is not application reachability. The sidecar's application probe was explicitly not performed.

## Write a claim with a boundary

Prepare one timeline table and two short statements:

1. **Supported:** what the files encode, with exact citations, uncertainty and source attribution.
2. **Rejected overclaim:** an assertion these files cannot establish, such as actual key installation, accepted plaintext, successful application access or a real exploit.

Request the next missing item: synchronized authorized AP/client logs, a bounded endpoint test or comparable post-change capture. State what outcome would support or contradict your hypothesis. Do not report that proposed retest as executed.

## Evidence handoff gate

Package the worksheet, commands, hashes, original/derived-file mapping, clock assumptions, minimized identifiers and a **NOT TESTED** section covering physical reception, injection, client effect and application reachability. Compare with the [public review guide](/wireless-practice/WF-OPS-02/review-guide.md), revise unsupported claims and record the correction.

Completing this workflow demonstrates evidence reasoning practice, not professional field competence. Hosted execution remains unavailable; optional owned-equipment work and instructor review are separate validation routes, not hidden prerequisites for offline learning.

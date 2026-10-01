# RF and Client Observations: Build an Inventory Without Guessing

**Mode: offline evidence practice / self-review.** Apply the preceding beacon lesson to [WF-FND-01](/wireless-foundations/WF-FND-01/README.md). This lesson prepares the inventory; leave the complete independent case until Module 03.

## Identity is not ownership

A BSSID identifies a basic service set in an infrastructure network; one physical AP can advertise several BSSIDs. Do not count BSSIDs as physical radios, or treat equal SSIDs as proof of one ESS. Record what the frames advertise, then correlate with an authorized inventory.

The organizational part of a universally administered address may suggest a vendor allocation. Addresses can be spoofed, and locally administered addresses do not provide the same OUI attribution. An address is not a reliable personal or physical-device identifier.

## Signal, noise and coverage

Receive power depends on the observer, antenna, gain, placement, channel, obstructions and time. A stronger signal does not identify an owner, prove proximity precisely or establish which AP a client selected.

SNR is a difference only when signal and noise are comparable measurements. If signal is -52 dBm and measured noise is -92 dBm at the same observation point/bandwidth, SNR is approximately 40 dB. If noise is absent, write **unknown**, not an assumed -95 dBm noise floor.

In WF-FND-01, frequency and -47 dBm are fabricated radiotap metadata for a deterministic exercise. No noise measurement, channel width, packet-loss estimate or calibrated distance is supplied. Do not turn them into an RF survey.

Channel number needs band/frequency context. Channel width is a separate property, not something you can infer from channel number alone. A fixed-channel capture sees a limited slice; channel hopping can miss an exchange. Absence from a file is not proof that a client or AP never transmitted. In actual fieldwork, record channel coverage, dwell time, observer capabilities and clock uncertainty.

## Probes, hidden names and privacy

An empty SSID in a beacon does not mean the network has no name. A later response or association may reveal it. A directed probe shows a request for that name at that moment; it does not prove the entire preferred-network list, future auto-connect behaviour or successful authentication.

A wildcard probe asks for discovery without naming a particular SSID. A locally administered address is a bit-pattern observation, **not proof** of a specific randomization policy. Two observations may belong to different devices or one changing device; do not resolve that uncertainty without additional permitted evidence.

Modern-client behaviour is version/profile-dependent. Later client-trust scenarios will test it rather than assuming every probe can be converted into association.

## Worked row: separate sources

Suppose a fictional beacon contains BSSID A, name Lab, channel 6 and a PSK RSNE. The owner inventory lists A as managed.

```text
Observed: BSSID A advertises Lab/PSK on channel 6 (frame 4).
Administrative correlation: A is listed as managed (inventory revision 1).
Not established: current password strength, physical radio identity, client access.
Next question: what authorized observation would test the intended control?
```

A beacon’s privacy bit alone does not tell you the cipher. Use the RSNE where present; absent information can remain unknown. Do not fill every inventory cell merely to make the table look complete.

## Your inventory

Use [baseline.pcapng](/wireless-foundations/WF-FND-01/baseline.pcapng) with Wireshark or the [derived frame view](/wireless-foundations/WF-FND-01/baseline-frames.json). Consult the [owner inventory](/wireless-foundations/WF-FND-01/authorized-inventory.csv) separately.

For each relevant BSSID fill:

```text
BSSID | observed name and frames | inventory reference | advertised security/PMF
      | observed frequency/channel | width/noise/coverage limitations | next question
```

For each relevant station observation fill:

```text
address | directed/wildcard | frame references | association evidence
        | physical identity/randomization limits
```

Keep an incidental/out-of-scope observation note rather than investigating it as a target. Do not use SSID equality or signal as proof of rogue ownership. Save your first inventory in the [worksheet](/wireless-foundations/WF-FND-01/worksheet.md); you will challenge it in the independent case.

## Readiness check

Can you distinguish observed fields from administrative claims? Can you explain why SNR, width, physical-device count and client trust remain unknown here? If yes, continue to frames and state reconstruction. A tidy inventory with invented values is worse than a precise inventory with explicit unknowns.

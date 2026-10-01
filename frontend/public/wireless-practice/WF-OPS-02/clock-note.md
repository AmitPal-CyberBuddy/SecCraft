# Traffic-scene clock model (fictional)

Use ONLY traffic-analysis.pcapng and traffic-analysis.json with client-log.csv. Do not correlate recon-lab by matching timestamps; its clock was independently seeded to the same value.

The case stipulates one fictional clock comparison at the start: client clock is 1.500 seconds ahead of the capture clock, with ±0.005 seconds uncertainty. No drift measurement exists. Subtract 1.500 from each client timestamp to express it on the capture timeline; keep the uncertainty. This is a supplied assumption, not calibration you performed.

First packet: 1700000000002000 microseconds since Unix epoch = 2023-11-14T22:13:20.002000Z. Packet intervals are exactly 2 ms by construction. Capture timestamps are not AP TSF values. Relative time is measured from the first packet of THIS file, not from a UI session start or the first displayed filtered packet.

The fictional client event “connected” records a state label, not application reachability or proof of key installation. Close timestamps and matching addresses support correlation under this model, not causal proof. State what a real retest would need: synchronized host/AP/client logs, capture method, permitted endpoint behavior and explicit success/failure criteria.

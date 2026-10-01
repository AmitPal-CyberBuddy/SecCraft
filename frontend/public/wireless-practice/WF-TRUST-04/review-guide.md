# Public review guide — not independent grading

## Management reasoning
The deauth scene has MFPC-only advertisement at frame 1 and MFPC+MFPR at 2. Frames 15–16 are directed unprotected deauth with reason 7, 17 is disassociation reason 8, 18 reports reason 15 in the reverse direction; frames 21–22 are SA Query-shaped action frames (category 8), not valid proof of a protected SA Query exchange. Packet order does not establish delivery, integrity, client acceptance or causation.

M0 lacks endpoint effect and negotiated state: insufficient evidence for impact. M1 represents a secure rejection with continuity in a fictional model, a useful defensive result but not an executed test. M2 includes an AP-restart alternative and ±500 ms clock uncertainty: a disconnect is not enough to attribute the cause to a frame. Request synchronized AP/client and application evidence plus an isolated bounded control. Do not use a disruption loop to manufacture certainty.

Unicast robust-management protection uses the negotiated pairwise cipher/key; group-addressed robust-management integrity uses BIP with an IGTK. The Protected bit is not a cryptographic validation result. PMF is not a universal availability guarantee and does not stop RF interference or authenticate every beacon.

## Attribution and client selection
rogue-ap frames 1–2 share a name, but advertise Enterprise versus PSK and different channel/profile fields. O2 attributes the look-alike to an approved isolated training scene within this fiction, supplying a legitimate alternative to “malicious rogue”. Owner assertion does not authenticate an observed transmitting address, prove wiring or establish what a real client selected. Never join this scene to the independent management capture.

C1: Enterprise-only policy is not made PSK-compatible by matching the SSID. C2: a directed probe does not prove a saved profile or override disabled autojoin; actual OS/version behavior must be tested. C3: name and stronger signal alone do not supply the PSK needed for a valid key exchange. C4: a correct shared credential can make protocol compatibility possible but does not establish selection, user consent, network ownership, successful service access or causality. Do not claim Karma/MANA applicability from a tool name or probe alone; specify version, profile state, selection behavior and negative controls.

The rogue-ap scene encodes later authentication/association (7–10), a PSK exchange (11–14), DHCP (15–18) and illustrative HTTP (19–20). It does not measure an induced switch or captured credentials. Its post-handshake plaintext is a fixture simplification, not a validated protected network behavior.

## Portal decision matrix
R1–R4 are consistent with their respective desired policies only within the model. R5 contradicts P5: the model accepts a copied A-session for B despite the intended subject binding. That is a model session-authorization mismatch, not proven MAC spoofing; the mechanism would require implementation evidence. R6 is inconclusive: no response without route/target-health and enforcement evidence does not prove segmentation. R7 contradicts the model's no guest-to-guest forwarding policy at L2, but supplies no application-reachability result.

In the packet fixture, frames 10–13 encode GET/redirect/POST/response; a MAC in a URL is not an authenticator and a cookie is not a server-side decision. Frames 14–17 encode peer ARP forwarding. The corrected BSSID is de:ad:be:ef:00:02 throughout those hops. Frame 14 is to the AP with broadcast end destination; frame 15 from AP to peer 02:66:77:88:99:aa carries original source 12:34:56:78:9a:bc. Frame 16 replies through the AP; frame 17 returns to the first station. Do not confuse receiver/transmitter with original source/destination or guess a VLAN from an IP address.

## Review gates
Source-cited facts, attributed model/owner assumptions, no invented live outcomes, distinct control boundaries, secure rejection and inconclusive branches, synthetic accounts only, bounded future plans and explicit NOT TESTED outcomes. Revise unsupported claims before recording local participation. Instructor review and real execution assessment remain separate.

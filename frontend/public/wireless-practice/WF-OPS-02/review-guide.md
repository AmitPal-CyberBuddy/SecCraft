# Public self-review guide

Read after writing your worksheet. This is a reasoning rubric, not a secret answer or field certification. A defensible alternative is acceptable if supported by the files and scoped assumptions.

## Readiness
A: eth0 connectivity is not access to a wireless PHY. Confirm owned USB pass-through, guest device enumeration and driver/firmware support before considering mode changes. B: a soft block is a relevant blocker, not proof of the only failure. Resolve under owner policy, then recheck PHY/mode/legal channel and bounded reception; do not change the regulatory domain as a workaround. C: the supplied 5 GHz frequency list does not show support for requested channel 6 (2437 MHz). Obtain the full capability/channel output; use a compatible authorized receiver or offline evidence. Monitor mode and an empty capture do not prove injection or AP absence. All three remain RF NOT TESTED in this case.

## Reconnaissance
Six BSSs appear in recon-lab, of which three are in scope. AP-A frame 1, AP-B frame 2, AP-C frames 3 and 13. AP-C's empty beacon name becomes HIDDEN-LAB in a probe response; the BSSID remains the same. AP-A/B share a name but only the fictional owner record asserts intended ESS membership. All three advertise CCMP group/pairwise suite type 4, PSK AKM 2, and capabilities 0x0080 (PMF capable, not required). The case supplies no real coverage or authenticity evidence.

CLIENT-A probes in frames 7–10, open-system authentication appears in 14–15, association in 16–17. Directed names are not a complete preferred-network list, a verified travel history or evidence a client joined those networks. This file has no EAPOL key exchange. 0x12 and 0x22 both have the locally administered bit set; that does not link these addresses to one physical device. The probe source in frame 12 and response destination in 13 can be correlated only as observed addresses, not owner-authenticated client identity.

## Traffic-scene evidence
Frame 7: association response at 22:13:20.014Z. Frames 8–11: EAPOL sequence at .016/.018/.020/.022; distinguish message structure from proof of real execution. Frame 12: unprotected DHCP Discover at .024 (relative 22 ms). All data in this fixture is intentionally unprotected despite the beacon advertising CCMP. That is a teaching simplification, not evidence a real AP accepted plaintext; the final synthetic HTTP GET is not proof of application success. L2 normalizes to .030 ± .005 (interval .025–.035), overlapping frames 13–17. You cannot assign a precise order between L2 and packets inside that interval. These constructed frames and fictional logs do not prove actual key installation, Internet access, decrypted payload or exploit impact.

A sufficient handoff identifies source-specific frame numbers and hashes, offset sign and uncertainty, reproducible filters, the limits of the owner record and a bounded next collection/retest. It never joins recon and traffic simply because their seeded epochs and addresses match.

## Review gates
- Every factual claim cites a file/frame or explicitly attributed owner/clock record.
- Capability hypotheses are not relabeled observations; physical tests stay NOT TESTED.
- Inventory includes scope and coverage limits, not just SSID counts.
- Timeline keeps file identity, clock uncertainty and alternative explanations.
- Handoff separates original/derived files, findings/proposals and offline/live outcomes.

If a gate fails, revise the worksheet and explain the correction. Lesson completion only records local participation; an instructor or supervised field exercise is still needed to assess execution competence.

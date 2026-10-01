# Independent Capture Case C-20

> This is an **offline-first practice case**, not a professional credential or a live RF test. `ENG-01` remains a separate optional Northwind *planning brief* with missing attachments; none of its results can be inferred from this case. Start with technical decisions; the later WF-REVIEW-07 lessons add source-cited reporting and public review.

## Your evidence pack

Read `frontend/public/pcaps/capstone/CASE_NOTES.md`. The pack contains two **independent synthetic** captures: `capstone-baseline.pcapng` (11 frames) and a staged `capstone-retest.pcapng` (three beacons only). The case notes contain a **partial** AP inventory and a fictional change request. No production client, switch logs, portal, RADIUS records or negotiated SAE exchange is supplied. The after-file's name does not mean a full retest was performed.

Before opening the challenge's answer, record the current SHA-256 from `frontend/public/pcaps/MANIFEST.md` for each file. Use Wireshark or the optional local `tshark` tool. The published training passphrase is only for checking the fixture's packet math.

## Guided first step: classify one beacon

In baseline frame 1, `CASE-OPS` on the owner's `02:aa:10:00:00:01` BSSID advertises PSK and MFPC without MFPR. **Mechanism:** a beacon describes an AP's offered policy; a client still has to negotiate and install keys. **Decision:** inspect the same BSSID in the post-change capture and request controlled client evidence before claiming the new policy is enforced.

```bash
# From repository root. Reads stored files; sends no radio frames.
sha256sum frontend/public/pcaps/capstone/*.pcapng
tshark -r frontend/public/pcaps/capstone/capstone-baseline.pcapng \
  -Y 'wlan.fc.type_subtype == 8 || eapol.type == 3' \
  -T fields -e frame.number -e wlan.bssid -e wlan.ssid \
  -e wlan.rsn.akms.type -e wlan.rsn.capabilities.mfpc -e wlan.rsn.capabilities.mfpr
```

Without `tshark`, use the same display filter in Wireshark. Do not claim you executed a tool you do not have.

## Independent attempt

1. Inventory **all** BSSIDs in baseline, then cross-check the partial owner list. The additional same-name address is an investigation lead, not a proven unauthorized AP. What would falsify the rogue hypothesis?
2. Identify M1–M4 in baseline for the owner's BSSID and the station. Check nonce, replay counter and M2 MIC with the published lab candidate via `python3 scripts/verify-lab-artifacts.py`. What does a known-answer match prove, and what does it not prove about an actual network?
3. Compare the **same owned BSSID** in baseline and post-change files. What changed about AKM and MFPR? What does the other same-name PSK BSS still advertise? Separate the policy advertisement check from an actual client retest.
4. Decide the next **authorized** tests: a controlled client association with negotiated AKM/PMF and supplicant/AP logs, plus owner/wired inventory correlation for the unlisted BSSID. Mark those real tests **NOT EXECUTED** here. Explain why a beacon-only post-change capture cannot close the client-policy question.

## Self-check before the challenge answer

Expected: three BSSIDs in each file; on the owned OPS BSSID the staged advertisement changes from PSK/MFPC-only to SAE-only/MFPC+MFPR. The other same-name BSSID continues to advertise PSK. Baseline contains a real-MIC *teaching* handshake for the known candidate; post-change has no client handshake. Neither file establishes RF delivery, actual ownership of the unlisted AP, successful SAE negotiation, installed PMF or network access. **Observed policy change** is supported for one BSSID; a completed on-site retest is not.

Take `chal-15-engagement` only after writing your own inventory and decisions. A peer may challenge your assumptions and citations, but local challenge completion and XP are self-review—not independent proof of testing skill. If you have owned APs and test clients, the optional hardware worksheets earlier in the path describe the separate scope and safety prerequisites. Do not run those procedures on third-party networks.

# Diagnose Capability Before Changing the Environment

> **Available now: offline diagnostic practice.** No radio, VM or hosted lab is required. The supplied records are authored examples, not commands SecCraft ran. Optional physical validation remains **NOT TESTED** unless you perform a separately authorized test on your own equipment.

## Start the tester workflow case

Download the [WF-OPS-02 case ZIP](/wireless-practice/WF-OPS-02.zip), or use the [scope](/wireless-practice/WF-OPS-02/scope.md), [capability records](/wireless-practice/WF-OPS-02/capability-cases.json) and [worksheet](/wireless-practice/WF-OPS-02/worksheet.md) individually. Keep your worksheet for Modules 05 and 06. The case includes decoded evidence so a learner who cannot install Wireshark can still complete the reasoning.

Your goal is not to make a command print “success”. It is to decide which capability is established, which layer may be failing, and what evidence would justify the next action.

## Seven different questions

| Layer | Evidence to request on your own authorized system | What it does not prove |
| --- | --- | --- |
| Guest connectivity | interface list and ordinary network configuration | an Ethernet-style VM connection is not a wireless PHY |
| Device attachment | USB device enumeration and hypervisor pass-through state | attachment alone does not prove a working driver |
| Driver and firmware | device/driver association, version, relevant diagnostic errors | advertised features may not work in every mode/band |
| Regulatory permission | current domain, legal channels and restrictions | a supported frequency is not permission to transmit |
| Interface mode | PHY-supported modes and actual interface mode | monitor support does not prove useful reception or injection |
| Reception | bounded capture on the correct authorized channel | an empty capture does not establish absence; one beacon does not establish full coverage |
| Injection and endpoint effect | separate controlled test and client/AP evidence | a capture file or command transcript cannot substitute for this test |

Use read-only checks before any change: `ip link`, `lsusb`, `iw dev`, `iw phy`, `rfkill list` and `iw reg get` on a system where those tools are installed. A missing command means a tool is missing, not necessarily that the adapter is unsupported. Record versions and omitted output. Do not disable security services, reset the regulatory domain or transmit as a generic troubleshooting step.

## Optional local file-analysis setup

On your own Debian/Kali-style system, the distribution packages can supply the tools:

```bash
sudo apt update
sudo apt install wireshark tshark
tshark --version
```

Use your operating system's supported installer elsewhere. These installation commands are guidance, not actions run by SecCraft. Record the actual version; package versions vary. Opening supplied files does not require root, promiscuous capture permissions or enabling non-root live capture. If installation is unavailable or restricted, use the decoded JSON instead—do not bypass device policy. Open the downloaded PCAPNG with Wireshark, or use the read-only `tshark -r` examples in the next lessons. The case ZIP must be downloaded before it is available offline.

## Diagnose three incomplete records

Open capability-cases.json. For each profile, fill five worksheet columns: **observed fact → hypothesis → missing evidence → safe next diagnostic → stop condition**.

1. **A: the VM has Internet but no wireless interface.** Explain why guest Internet connectivity is not enough. What distinguishes an unattached USB device from a missing driver? Do not claim either diagnosis is confirmed by these excerpts alone.
2. **B: monitor support is listed, but the radio is soft-blocked.** Identify the observed blocker. What must be checked again after an owner-approved change? Does unblocking prove packet reception or legal transmit permission?
3. **C: monitor mode is active, but the supplied frequency list is 5 GHz and the requested channel is 6.** Convert channel 6 in the intended 2.4 GHz band to 2437 MHz. What additional output would establish band support and the actual tuned channel? Why does zero traffic not prove the target is offline?

Write `RF reception: NOT TESTED; injection: NOT TESTED` for all three offline profiles. Do not convert an intended action into a recorded observation.

## Choose a feasible practice route

- **Browser-only:** reason from the supplied JSON and worksheet. No command execution is needed.
- **Your own computer:** inspect the downloaded capture with Wireshark/TShark. This is real local file analysis, not a live wireless test. Record the tool/version and results you actually obtain.
- **Optional isolated equipment:** use the earlier owned-lab readiness worksheet after permission, compatibility and stop rules are established. Avoid losing your only Internet interface during a mode change; plan recovery first.
- **Hosted live lab:** not available on SecCraft. The browser command simulator has canned responses; it does not expose a shell, install software, attach a radio or create a target.

A future cloud environment could run virtual AP/client protocol exercises without a physical receiver. It would still not establish antenna performance, interference, range or compatibility of your actual adapter. Do not label a future feature “available” or let missing infrastructure block the offline lessons.

## Review and handoff

Compare your reasoning with the [public self-review guide](/wireless-practice/WF-OPS-02/review-guide.md). Correct unsupported diagnoses and retain the original uncertainty. Your handoff should identify a practical learning route now and a separate plan for any future physical test. Marking this lesson complete records participation, not validated setup or RF competence.

## Read a cheat sheet critically

A command reference is not a scoped test plan. `airmon-ng` manages monitor interfaces; `airodump-ng` captures traffic. Capture filters and output-prefix options copied onto the wrong program are not interchangeable. Verify syntax with the installed tool's help and the [official capture reference](https://www.aircrack-ng.org/doku.php?id=airodump-ng).

Do not blindly stop network managers with `check kill`, run continuous deauthentication, raise transmit power, or bridge a test AP to a live uplink. Each changes availability, regulatory exposure or the forwarding boundary. Identify the owned interface, permitted action, impact limit and restore procedure first. None is required for this offline path.

**Check yourself:** A copied command promises “capture channel 6” but names the interface-management tool and has no bounded collection plan. What do you reject before running anything? Answer: verify the program/options, confirm scope/capability and define a passive collection budget; do not repair the syntax and assume that grants permission.

Use the [curated reading and coverage guide](/wireless-practice/REFERENCE_GUIDE.md) to distinguish external background from supplied practice. Free access does not make every example current, safe or appropriate to your environment.

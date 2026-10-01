# Monitor Mode, Injection and the Toolchain

> **Offline reasoning + optional owned hardware.** Captures and capability records are available now. Physical reception/injection needs authorized isolated equipment; SecCraft provides no hosted live lab. Hardware is not required to finish the offline lessons.

## What you must be able to do

* Say which interface mode a task requires and why (capture vs. injection vs. association).
* Prove your adapter's capability instead of assuming it (monitor, injection, bands).
* Read the regulatory domain and make a jurisdiction decision instead of pasting a command.

## 1. Interface modes

| Mode | Sees | Can transmit | Typical use |
| --- | --- | --- | --- |
| managed | normal traffic for its associated BSS; selected management observations exposed by the OS | normal traffic | using a network |
| monitor | frames it can receive on the tuned channel | hardware/driver dependent; injection may be supported | capture, recon, analysis, authorized frame-injection tests |
| AP / master | — | beacons, serves clients | running a test AP (authorised lab only) |
| mesh / IBSS | mesh/adhoc frames | mesh | specific topologies, rarely needed |

Monitor mode is a **per-radio** capability: the driver must support it and the firmware must allow it.
Do not infer injection support from an integrated-versus-USB label. Chipset, driver, firmware, band and operating-system versions matter; verify the required behavior on the actual authorized setup.

## 2. Capability checks (optional, on your own hardware)

```bash
iw dev                     # interfaces, modes, channels
iw dev wlan0 info          # mode, channel, txpower
iw phy phy0 info | grep -A6 'Supported interface modes'   # does the driver expose monitor?
rfkill list                # is the radio soft/hard blocked?
```

The following changes are separate from diagnosis. Use only a correctly identified owned interface after scope, legal channel, recovery and capture limits are agreed. Do not switch the interface providing your only connectivity. `wlan0` is an example, not an instruction to change every device.

```bash
sudo ip link set wlan0 down
sudo iw dev wlan0 set type monitor
sudo ip link set wlan0 up
sudo iw dev wlan0 set channel 6            # 2.4 GHz example
```

* Keep a **managed** interface for the internet/tooling and put the adapter in monitor mode.
* If `iw dev wlan0 set type monitor` fails, that is evidence about your hardware — record it rather than
  fighting it. Check permissions, interface state, driver/firmware and supported modes before diagnosing the hardware as incompatible.

An injection test is **not part of this readiness exercise**. It needs a separately approved isolated AP/client setup, transmit/impact limits and endpoint evidence; monitor mode is not proof it works. Stop on unintended traffic or connectivity loss. Restore the original interface mode/channel and any owner-approved network-manager changes, then verify ordinary connectivity; consult the prior configuration rather than assuming defaults. Keep unavailable capabilities marked **NOT TESTED**.

## 3. Regulatory domain

The regulatory domain sets allowed channels and transmit power. It is a **legal** setting, not a
troubleshooting step:

```bash
iw reg get                 # read the current domain and the AP's country IE influence
iw reg get | grep -A3 global
```

* The AP's Country IE only *informs* clients; your own radio obeys your domain.
* Never set a domain you are not entitled to use in your location, and never raise power to "get more range"
  in a shared environment.
* DFS channels (radar) can force a channel change mid-capture — plan around them for long captures.

## 4. Toolchain: purpose, not nostalgia

| Job | Tool | Why |
| --- | --- | --- |
| enumerate networks/clients, collect captures | `airodump-ng` / `kismet` | structured capture with per-AP context |
| analyse frames, follow conversations, decode EAPOL/RADIUS | Wireshark / `tshark` | dissection + fields you can cite as evidence |
| discover WPS-enabled BSSs | `wash` (+ beacon IE) | WPS attributes at a glance |
| rogue AP / enterprise rogue authenticator | `hostapd`, `eaphammer` (authorised lab only) | acts as the authenticator/AP |
| run a legitimate test AP | `hostapd` | reference configuration and behaviour |
| act as a supplicant to prove a client-side claim | `wpa_supplicant -d` | shows certificate/profile behaviour |
| turn WPA-Personal captures into audit material | `hcxpcapngtool` → `hashcat` | offline audit of supported EAPOL/PMKID formats; SAE commit/confirm captures do not provide an equivalent offline verifier |
| craft/inspect frames programmatically | Scapy | reproducible lab artefacts |

**Golden rule:** tools are chosen by the question you need answered. If you cannot state the question, the
command is not a test.

## 5. Decide: simulation or hardware?

Ask: *can the claim be established from an artefact, or does it require the air?*

* SIMULATION — reading policy from a capture, decoding handshakes, auditing an offline hash, reading RADIUS logs.
* HYBRID — the concept is provable from artefacts, but confidence needs a real client/AP (e.g. client
  behaviour with a misconfigured profile, WPS lockout).
* RF_REQUIRED — anything where the *air* is the subject: injection, deauth effect, rogue beaconing,
  client association choice, RF/channel behaviour.

## 6. Lab

Hardware labs in this module are optional and gated. Without hardware, complete the *reasoning* tasks:
use the capture entries in `frontend/src/content/lab-artifacts.json` as an inventory of *fixtures*,
not an adapter-capability file. Pick `deauth.pcapng`, `wpa2-handshake.pcapng` and
`enterprise.pcapng`: for each, identify one claim the stored frames can support and one claim
requiring a real radio/client or configuration. Compare the module's `lab_requirement` in
`modules.json` and justify any difference between learning a mechanism and proving an RF outcome.
No injection command is supplied here; any later test needs an owned, isolated test AP and separate written scope.
Record the adapter/driver, supported bands/modes and regulatory domain only if using your own hardware;
otherwise write “not tested” rather than inventing capability.

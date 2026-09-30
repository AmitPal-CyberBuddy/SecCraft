# Monitor Mode, Injection and the Toolchain

> Lab tier: **HYBRID** — the reasoning is learnable from captures; the mechanics need a real adapter.

## What you must be able to do

* Say which interface mode a task requires and why (capture vs. injection vs. association).
* Prove your adapter's capability instead of assuming it (monitor, injection, bands).
* Read the regulatory domain and make a jurisdiction decision instead of pasting a command.

## 1. Interface modes

| Mode | Sees | Can transmit | Typical use |
| --- | --- | --- | --- |
| managed | only its own BSS's frames | normal traffic | using a network |
| monitor | frames it can receive on the tuned channel | hardware/driver dependent; injection may be supported | capture, recon, analysis, authorized frame-injection tests |
| AP / master | — | beacons, serves clients | running a test AP (authorised lab only) |
| mesh / IBSS | mesh/adhoc frames | mesh | specific topologies, rarely needed |

Monitor mode is a **per-radio** capability: the driver must support it and the firmware must allow it.
Most integrated laptop cards cannot inject; USB adapters with supported chipsets can.

## 2. Capability checks (do these first, on your own hardware)

```bash
iw dev                     # interfaces, modes, channels
iw dev wlan0 info          # mode, channel, txpower
iw phy phy0 info | grep -A6 'Supported interface modes'   # does the driver expose monitor?
rfkill list                # is the radio soft/hard blocked?
sudo ip link set wlan0 down
sudo iw dev wlan0 set type monitor
sudo ip link set wlan0 up
sudo iw dev wlan0 set channel 6            # 2.4 GHz example
sudo aireplay-ng --test wlan0              # injection test (lab hardware, own AP)
```

* Keep a **managed** interface for the internet/tooling and put the adapter in monitor mode.
* If `iw dev wlan0 set type monitor` fails, that is evidence about your hardware — record it rather than
  fighting it; several labs in this academy are explicitly marked `RF_REQUIRED` for this reason.

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
| enumerate networks/clients, capture to pcapng | `airodump-ng` / `kismet` | structured capture with per-AP context |
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
Do not run the injection test above without an owned, isolated test AP and written scope.
Record the adapter/driver, supported bands/modes and regulatory domain only if using your own hardware;
otherwise write “not tested” rather than inventing capability.

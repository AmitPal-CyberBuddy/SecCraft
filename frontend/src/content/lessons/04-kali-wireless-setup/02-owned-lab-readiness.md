# Owned-Lab Readiness: Observe Before Transmitting

> This is an optional **supervised hardware worksheet**, not a browser lab. No hardware, RF rights or results are supplied by SecCraft. Stop at the offline alternative when you do not own or have written permission for the target and its test clients.

## Preconditions and stop rules

Record: owner and location of the AP and client; permitted SSID/BSSID, band/channel, time window, observer, permitted actions, data minimization, emergency stop, power and channel constraints under the local regulatory domain. Never assume a permitted SSID authorizes capturing nearby client payloads. Set a maximum test duration and agree how to restore the AP and client. **No injection, deauthentication or rogue beaconing is required for this worksheet.** If adjacent networks enter the capture, follow the agreed handling policy rather than inspecting them.

## Establish adapter capability on your own system

Run `iw dev`, `iw phy` (or `iw list`), `iw reg get` and `rfkill list`. Save only non-sensitive output, interface/driver version and date. Check supported interface modes and allowed channels before switching anything. Monitor mode is not proof of injection; a device may report monitor support yet fail to capture on a specific channel. The AP's Country IE is evidence about what it advertises, not permission to change your own regulatory domain. Name the actual interface; `wlan0` is only an example.

| Symptom | Diagnostic observation | Safe decision |
| --- | --- | --- |
| No monitor mode listed | `iw phy` lacks monitor | use offline captures; do not promise RF results |
| Radio blocked | `rfkill list` says soft/hard block | resolve only on your own device; never bypass a hardware lock |
| Empty capture | check channel, band, receive antenna, duration and legal scope | no frames observed ≠ no AP or no clients |
| Other SSIDs seen | receiver hears more than authorized target | stop/limit storage per RoE; do not analyze out-of-scope traffic |
| Mode switch drops internet | same radio cannot provide both roles here | use a separate managed adapter or work offline |

## Bounded passive exercise

After scope approval, tune to a **known owned AP** channel and collect only a short passive capture with an appropriate capture filter or client-safe collection plan. Record the command, start/stop time, actual interface, channel, file SHA-256 and one beacon's BSSID/SSID/RSNE fields. Compare its advertised security to the AP configuration the owner provided. A mismatch is a question to investigate, not proof an attacker is present. Restore the interface to managed mode afterwards and confirm ordinary connectivity.

**Decision:** can you support “this BSS advertised this AKM in this window”? Perhaps, with the frame and hash. Can you support “a client rejected a fake server” or “injection works”? No. Those require separate explicit approval, managed-client logs and controlled tests. Never put credentials, real capture payloads or client identifiers into the public repository.

## Offline alternative and review

With no hardware, use `beacon-only.pcapng` to produce the same **frame-supported advertisement** record and write `RF capability: NOT TESTED; no hardware/scope supplied`. Ask a supervisor to review the collection scope, how you handled unintended observations, artifact provenance, and the difference between capability, actual packet reception and effect on a client. A self-reviewed worksheet is not a validated field assessment.

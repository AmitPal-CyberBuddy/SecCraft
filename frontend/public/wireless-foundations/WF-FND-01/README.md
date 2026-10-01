# WF-FND-01 — Aster foundations evidence case

Version 1.0, original SecCraft teaching material. **Evidence practice / self-review.**

This is a fictional, deterministic scenario. The two PCAPNG files contain structurally encoded radiotap/802.11 management frames, not a recording from an operating AP, client or radio. Addresses, signal values, timestamps and organization are invented for the exercise. No key exchange, RF delivery, traffic interception, client impact or remediation execution is demonstrated.

The complete download is `WF-FND-01.zip` on the lesson page. Extract it first; its inner SHA256SUMS covers the individual case files. The archive is a convenience package, not a signed credential.

## Work order

1. Read `scope.md` and `authorized-inventory.csv` before opening packet data.
2. Verify `SHA256SUMS` with `sha256sum -c SHA256SUMS` from this directory. On other systems use an equivalent SHA-256 tool. A hash checks matching bytes, not authenticity of a real capture.
3. Analyze `baseline.pcapng` in Wireshark/TShark. Without those tools, read `baseline-frames.json`, a decoded view of the same bytes. The JSON route practices interpretation, not independent packet-tool operation.
4. Complete `worksheet.md` without the answer guide.
5. Compare `follow-up.pcapng` using the same filters; its distinct hash identifies a separate staged fixture. This is evidence comparison, not a learner-performed retest.
6. Open `self-review.md`, correct unsupported conclusions, and retain your first and corrected answer.

`baseline.pcapng`: 13 frames; `follow-up.pcapng`: 3 frames. Both use PCAPNG microsecond timestamps, linktype 127 and a fixed synthetic channel-6 observer (2437 MHz). Receive power is fixed at -47 dBm solely to populate a decode field. Noise, channel width, packet-loss rate, device manufacturer and full RF coverage are not supplied. The small number of frames is a teaching constraint, not an observed traffic rate.

The follow-up simulates an operator making a formerly hidden SSID visible. It does not implement stronger authentication, remove the unlisted BSS or establish a client's security state. Do not call visibility a vulnerability fix.

## Useful read-only commands

```sh
tshark -r baseline.pcapng -Y 'wlan.fc.type_subtype == 8' -T fields -e frame.number -e wlan.bssid -e wlan.ssid -e wlan.rsn.capabilities.mfpc -e wlan.rsn.capabilities.mfpr
tshark -r baseline.pcapng -Y 'wlan.fc.type_subtype == 11 || wlan.fc.type_subtype == 0 || wlan.fc.type_subtype == 1' -T fields -e frame.number -e wlan.sa -e wlan.da -e wlan.fixed.status_code
tshark -r baseline.pcapng -Y 'eapol' -T fields -e frame.number
```

An empty EAPOL result describes **this supplied file**, not everything that occurred in a real deployment. No radio interface, privilege escalation or network transmission is needed for these commands.

## Reproduction

Repository: `python3 scripts/generate-wireless-foundations.py`; checks: `python3 scripts/verify-wireless-foundations.py`. Source and answer guide are public: this is not a secret assessment or certification. New lessons record ordinary browser-local practice only.

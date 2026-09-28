# Passive Reconnaissance Workflow (Lab)

> Artifact: `recon-lab.pcapng` (17 frames, **SIMULATION**) — generated and verified by
> `scripts/generate-lab-artifacts.py`. 6 BSSs, 1 hidden BSS, 3 clients (one with a randomised MAC).

## Objective

Produce an AP/client inventory from a passive capture, with a frame number for every claim, and one
defensible statement about what the capture **cannot** tell you.

## 1. Workflow

```
1. Inventory BSSs        → BSSID, SSID, channel, band, capability
2. Classify security     → RSNE: ciphers, AKM list, MFPC/MFPR, WPS IE
3. Group networks        → which BSSIDs share an SSID (ESS) and which are look-alikes
4. Inventory clients     → MAC, randomised?, what it probed for, what it associated to
5. Correlate             → which client is seen with which BSS (auth/assoc/data)
6. State limits          → what the capture does not establish (identity, payload, intent)
```

## 2. Run it

```bash
# all BSSs and their policy
tshark -r recon-lab.pcapng -Y 'wlan.fc.type_subtype == 8 || wlan.fc.type_subtype == 5' \
  -T fields -e frame.number -e wlan.bssid -e wlan.ssid -e wlan.ds.current_channel \
  -e wlan.rsn.akms.type -e wlan.rsn.capabilities.mfpc -e wlan.rsn.capabilities.mfpr

# who is probing for what
tshark -r recon-lab.pcapng -Y 'wlan.fc.type_subtype == 4' \
  -T fields -e frame.number -e wlan.sa -e wlan.ssid

# the hidden SSID reveal
tshark -r recon-lab.pcapng -Y 'wlan.fc.type_subtype == 5' \
  -T fields -e frame.number -e wlan.bssid -e wlan.ssid -e wlan.ssid_len
```

## 3. Questions (answer with frame numbers)

1. How many **BSSIDs** are present, and how many distinct **SSIDs**? Which ones form an ESS?
2. Which BSS hides its SSID, and which frame reveals it? What does that tell you about "hidden network" claims?
3. Which BSS has **PMF required**? Which has only **PMF capable**? Quote the RSNE bytes.
4. Which BSS is open with **no RSNE at all**, and which offers **OWE** instead? Why does that distinction matter?
5. Which client is using a **randomised MAC**? How did you decide?
6. What has a *look-alike* SSID in this capture, if anything — and what evidence would you need to prove it
   was a rogue twin rather than a legitimate ESS member? (Hint: it is not in the capture. Say so.)

## 4. Deliverable

An inventory table with columns `BSSID | SSID | ch | band | ciphers | AKM | PMF | WPS | first seen frame`,
plus:

* capture SHA-256 and command lines used;
* a "limits" paragraph: what is *not* determinable from this capture.

## 5. Evidence standard

Every row needs a frame number. If you cannot cite one, delete the row. This is the habit that separates a
pentest report from a scan dump.

## 6. Decision practice

**`scn-05-hidden-ssid`** — after a client joins a hidden BSS, what changes and what does it prove?
**`scn-05-clone-or-ess`** — one SSID, two BSSIDs, different vendors and IE fingerprints. ESS or twin?

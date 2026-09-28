# Offline Audit Workflow (Lab)

> Artifacts: `wpa2-handshake.pcapng`, `pmkid.pcapng`. Wordlist: `wordlists/wififorge-lab-psk.txt`.
> Authorised-lab material only: the PSKs are published lab values.

## 1. The workflow

```
capture (.pcapng) ──hcxpcapngtool──► hashcat 22000 file ──hashcat──► recovered passphrase
        │                                                     │
        └── SHA-256, frame numbers, filter ──────────────────┘──► evidence record
```

```bash
sha256sum wpa2-handshake.pcapng                     # integrity first
hcxpcapngtool -o audit.hc22000 wpa2-handshake.pcapng
hashcat -m 22000 audit.hc22000 wordlists/wififorge-lab-psk.txt --show
hashcat -m 22000 audit.hc22000 wordlists/wififorge-lab-psk.txt -d 1 --status
```

Why **22000** and not a legacy mode: hashcat 22000 is the unified WPA-PBKDF2-PMKID+EAPOL format that
supersedes the old separate modes (PMKID `16800`, handshake `2500`). Legacy modes still exist for old
workflows; new work should use 22000.

## 2. Questions

1. How many hashes did `hcxpcapngtool` extract from each capture, and why?
2. Which capture gives you a crackable line with **no client present**, and what does that say about the
   "you need a handshake" claim?
3. Time the audit: record the hash rate, wall time, and whether the passphrase was found. Convert that into
   a statement about passphrase strength (this is the number a client cares about).
4. The lab passphrase is 13 characters from a 4-symbol alphabet of patterns taught in the module notes.
   Estimate the search space of a **random 13-character** password over 94 printable ASCII characters and
   compare it with `rockyou.txt`-style dictionaries. What does that say about why the audit succeeded?

## 3. Interpretation — the part most testers get wrong

A recovered passphrase is **not** automatically a critical finding. Ask:

* What does the passphrase grant? (L2 access to this BSS; possibly one VLAN.)
* Is that L2 isolated, or is it the corporate production WLAN?
* Is the passphrase personal or shared? (Shared → no attribution, blast radius = every user.)
* What compensating controls exist? (802.1X on the same ESS? client isolation? NAC?)
* Does the recovered passphrase unlock anything *else* (reuse in other systems)? That is a separate finding.

## 4. Evidence record

```
Tool      : hcxpcapngtool 7.x, hashcat 7.x
Input     : wpa2-handshake.pcapng — SHA-256 1efab7c5…
Command   : hcxpcapngtool -o audit.hc22000 wpa2-handshake.pcapng
Hash file : audit.hc22000 — SHA-256 …, 2 hashes (1 complete, 1 truncated)
Result    : passphrase recovered in 4.2 s at 1.9 MH/s (lab wordlist)
Limit     : dictionary-based audit; absence of recovery does not prove strength
```

## 5. Decision practice

**`scn-09-cracked-not-owned`** — the passphrase is recovered and it is also the local admin password of
the AP. What is the finding, what is the impact, and what do you *not* claim?

# Offline Audit Workflow (Lab)

> Artifacts: `wpa2-handshake.pcapng`, `pmkid.pcapng`. Candidate list: `frontend/public/wordlists/wififorge-lab-psk.txt`.
> The PSKs are intentionally published lab values. Do not use these procedures outside captures/networks you own or are authorized to assess.

## 1. The workflow

```
capture (.pcapng) ──hcxpcapngtool──► hashcat 22000 file ──hashcat──► recovered passphrase
        │                                                     │
        └── SHA-256, frame numbers, filter ──────────────────┘──► evidence record
```

Run from `frontend/public/pcaps/wpa2/` in a local checkout (the required tools are not bundled):

```bash
sha256sum wpa2-handshake.pcapng
# Expected SHA-256 for the checked-in fixture:
# 54ec8ba5b9c9e231173c0538283af9493b0c8d9823b8396e94eb325df4332e7f
hcxpcapngtool -o audit.hc22000 wpa2-handshake.pcapng
hashcat -m 22000 audit.hc22000 ../../wordlists/wififorge-lab-psk.txt
hashcat -m 22000 audit.hc22000 --show
```

Why **22000** and not a legacy mode: hashcat 22000 is the unified WPA-PBKDF2-PMKID+EAPOL format that
supersedes the old separate modes (PMKID `16800`, handshake `2500`). Legacy modes still exist for old
workflows; new work should use 22000.

## 2. Questions

1. How many hashes did `hcxpcapngtool` extract from each capture, and why?
2. Which capture contains a PMKID usable without the complete four-message handshake? What station/AP exchange is still represented, and why is “no client present” misleading?
3. Time the audit: record the hash rate, wall time, and whether the passphrase was found. State the tested candidate coverage and hardware/tool context; this measurement alone does not establish password strength.
4. The published fixture PSK is `ForgeLab2026!` and is intentionally present in the bundled candidate list; recovering it verifies the toolchain, not password strength or a live-network weakness. Separately estimate the search space of a **uniformly random 13-character** password over 94 printable ASCII characters and compare it with common human-chosen patterns and dictionary coverage. What can—and cannot—you conclude from this fixture?

## 3. Interpretation — the part most testers get wrong

A recovered passphrase is **not** automatically a critical finding. Ask:

* What access, if any, would the credential grant if accepted? Live association and segmentation need separate authorized evidence.
* Is that L2 isolated, or is it the corporate production WLAN?
* Is the passphrase personal or shared? (A shared credential alone does not attribute actions to individuals; enumerate the profiles and users that actually share it.)
* What compensating controls are actually enforced for this PSK path (client isolation, ACLs, NAC)? A separate Enterprise BSS does not fix an exposed PSK path merely by sharing its SSID.
* Does the recovered passphrase unlock anything *else* (reuse in other systems)? That is a separate finding.

## 4. Evidence record

```text
Input: wpa2-handshake.pcapng — SHA-256 54ec8ba5b9c9e231173c0538283af9493b0c8d9823b8396e94eb325df4332e7f
Expected fixture: two client exchanges (one complete M1–M4, one partial M1–M2)
Result: record your own tool versions, extracted line count, recovered/not recovered result and elapsed time
Limit: no measured hash rate or run time is asserted here; dictionary non-recovery does not prove strength
```

The repository's verifier checks the PCAP structure and cryptographic material, not the performance result of your local `hashcat` run.

## 5. Decision practice

**`scn-09-cracked-not-owned`** — the passphrase is recovered and it is also the local admin password of
the AP. What is the finding, what is the impact, and what do you *not* claim?

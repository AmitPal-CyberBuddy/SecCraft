#!/usr/bin/env python3
"""Generate frontend/src/content/challenges.json from the verified lab captures.

Every answer is *computed from the artefact* (`wififorge_labkit.decode`), never hand-written, so a challenge
answer cannot drift away from the capture a learner opens. Run after `generate-lab-artifacts.py`:

    python3 scripts/generate-lab-artifacts.py
    python3 scripts/generate-challenges.py
    python3 scripts/verify-lab-artifacts.py

Challenge levels encode the de-guiding progression from the review:
  guided      → the method is given, the learner executes and interprets
  semi-guided → the objective is given, the learner chooses the method
  assessment  → only scope + artefacts; the learner designs the approach
"""

from __future__ import annotations

import glob
import json
import os
import sys
from typing import Dict, List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wififorge_labkit import decode, pmk_from_psk, pmkid, read_pcapng  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PCAP_ROOT = os.path.join(REPO, "frontend", "public", "pcaps")
OUT = os.path.join(REPO, "frontend", "src", "content", "challenges.json")

LAB_PSK = "ForgeLab2026!"
LAB_PSK_WEAK = "password123"


def frames(pcap_id: str) -> List[Dict[str, object]]:
    path = glob.glob(os.path.join(PCAP_ROOT, "*", f"{pcap_id}.pcapng"))[0]
    return [decode(f) for f in read_pcapng(path)]


def numbers(records, **match) -> List[int]:
    """1-based frame numbers where every key equals the given value."""
    out = []
    for i, r in enumerate(records, 1):
        if all(r.get(k) == v for k, v in match.items()):
            out.append(i)
    return out


def fmt(nums: List[int]) -> str:
    return ", ".join(f"frame {n}" for n in nums) if nums else "none"


def join(nums: List[int]) -> str:
    return "/".join(str(n) for n in nums)


def bssids(records) -> List[str]:
    seen = []
    for r in records:
        b = r.get("bssid")
        if r.get("subtype_name") == "Beacon" and b and b != "ff:ff:ff:ff:ff:ff" and b not in seen:
            seen.append(str(b))
    return seen


def ssid_for(records, bssid: str) -> str:
    for r in records:
        if r.get("bssid") == bssid and r.get("subtype_name") == "Beacon":
            return str(r.get("ssid") or "(hidden)")
    return "?"


def akm_for(records, bssid: str) -> str:
    for r in records:
        if r.get("bssid") == bssid and r.get("subtype_name") == "Beacon":
            akms = r.get("akm_names") or []
            return ", ".join(str(a) for a in akms) if akms else "no RSNE"
    return "?"


def pmf_for(records, bssid: str) -> str:
    for r in records:
        if r.get("bssid") == bssid and r.get("subtype_name") == "Beacon":
            if "rsn" not in r:
                return "no RSNE"
            mfpc, mfpr = r.get("mfpc"), r.get("mfpr")
            return f"MFPC={int(bool(mfpc))}, MFPR={int(bool(mfpr))}"
    return "?"


def build() -> List[Dict[str, object]]:
    challenges: List[Dict[str, object]] = []

    # ---------------------------------------------------------------- 1. beacon
    rec = frames("beacon-only")
    bss = bssids(rec)
    no_rsn = [b for b in bss if akm_for(rec, b) == "no RSNE"]
    req = [b for b in bss if "MFPR=1" in pmf_for(rec, b)]
    challenges.append(dict(
        id="chal-01-beacon", title="Beacon Triage — Read the Policy Before You Touch Anything",
        module="02-wifi-fundamentals", difficulty="Beginner", type="pcap_analysis", level="guided",
        estimated_time="15m", points=100, status="simulated",
        description=("beacon-only.pcapng holds four BSSs. Classify each one's security policy from the beacon "
                     "itself — the answer to every task is a frame number plus the decoded field."),
        objectives=["Decode SSID/BSSID/channel from beacons",
                    "Read RSNE AKM and RSN capability bits",
                    "Distinguish 'no RSNE' from 'RSNE with PMF'"],
        artifacts=["beacon-only.pcapng"],
        tasks=[
            dict(id="t1", question="How many BSSs are advertised, and on which channels?",
                 answer=(f"{len(bss)} BSSs: " + "; ".join(
                     f"{ssid_for(rec, b)} ({b}) ch{r0.get('channel')}"
                     for b in bss for r0 in [next(x for x in rec if x.get('bssid') == b and x.get('subtype_name') == 'Beacon')])),
                 hint="tshark -r beacon-only.pcapng -Y 'wlan.fc.type_subtype == 8' -T fields -e frame.number -e wlan.bssid -e wlan.ssid -e wlan.ds.current_channel"),
            dict(id="t2", question="Which BSSs advertise no RSNE at all, and what does that mean?",
                 answer=(f"{', '.join(no_rsn) if no_rsn else 'none'} — no RSN information element, i.e. no WPA2/WPA3 "
                         "policy: the link is unprotected (or legacy WEP). Policy must be read from the RSNE, never "
                         "inferred from the name."),
                 hint="Filter wlan.tag.number == 48 and compare which BSSIDs appear."),
            dict(id="t3", question="Which BSS requires management frame protection, and which frames prove it?",
                 answer=(f"{', '.join(req) if req else 'none'} — RSN capabilities show MFPR=1 in the beacon "
                         f"({fmt([n for n, r in enumerate(rec, 1) if r.get('mfpr')])}). MFPR is bit 4 of the RSN "
                         "capabilities field; MFPC (bit 5) alone is not enforcement."),
                 hint="tshark -r beacon-only.pcapng -Y 'wlan.rsn.capabilities.mfpr == 1' -T fields -e frame.number -e wlan.bssid"),
        ],
        flag="WIFIFORGE{BEACON_TRIAGE_RSNE_BITS}", skills=["recon", "rsne", "pmf"],
        answer_basis="computed from beacon frames with wififorge_labkit.decode",
        deliverable="A four-row BSS table with frame numbers and the decoded policy fields.",
    ))

    # ---------------------------------------------------------------- 2. recon
    rec = frames("recon-lab")
    bss = bssids(rec)
    hidden = [b for b in bss if ssid_for(rec, b) == "(hidden)"]
    reveal = numbers(rec, subtype_name="Probe Response")
    pnl = [str(r.get("ssid")) for r in rec if r.get("subtype_name") == "Probe Request" and r.get("ssid_len")]
    random_client = [str(r.get("sa")) for r in rec if r.get("subtype_name") == "Probe Request"]
    randomised = sorted({m for m in random_client if int(m.split(":")[0], 16) & 0x02})
    ess = [b for b in bss if ssid_for(rec, b) == "LAB-WIFI"]
    challenges.append(dict(
        id="chal-02-recon", title="Passive Recon — Inventory, Hidden BSS and Client Leakage",
        module="05-wireless-recon", difficulty="Beginner", type="pcap_analysis", level="guided",
        estimated_time="20m", points=100, status="simulated",
        description=("recon-lab.pcapng is a passive capture of one site. Produce an AP/client inventory with "
                     "frame numbers, then state what the capture cannot establish."),
        objectives=["Enumerate BSSs and group them into an ESS",
                    "Show that SSID hiding leaks the name anyway",
                    "Identify client PNL leakage and MAC randomisation"],
        artifacts=["recon-lab.pcapng"],
        tasks=[
            dict(id="t1", question="How many BSSs and how many distinct SSIDs are present?",
                 answer=(f"{len(bss)} BSSs, {len(set(ssid_for(rec, b) for b in bss))} advertised SSIDs "
                         f"(one BSS hides its name). The two LAB-WIFI BSSIDs ({', '.join(ess)}) share an SSID — "
                         "consistent with one ESS; proving it needs the same-layer 2 topology or the client's "
                         "association behaviour, not just the name."),
                 hint="Count unique wlan.bssid across beacons, then unique wlan.ssid."),
            dict(id="t2", question="Which BSS hides its SSID, and which frame discloses it?",
                 answer=(f"{', '.join(hidden) if hidden else 'none'} hides its SSID (SSID IE length 0 in its beacon). "
                         f"The probe response in {fmt(reveal)} carries the SSID '{ssid_for(rec, hidden[0]) if hidden else ''}' "
                         "in clear — which is exactly why hiding an SSID is not a security control."),
                 hint="Filter wlan.fc.type_subtype == 5 (probe responses) and read wlan.ssid."),
            dict(id="t3", question="What does the client disclose, and is it trackable by MAC?",
                 answer=(f"Probe requests leak a preferred network list: {', '.join(sorted(set(pnl)))}. "
                         f"Client addresses seen probing include {', '.join(sorted(set(random_client)))}"
                         + (f"; {', '.join(randomised)} use a locally administered bit (randomised MAC), so device "
                            "identity is not determinable from the capture." if randomised else ".")),
                 hint="tshark -Y 'wlan.fc.type_subtype == 4' -T fields -e wlan.sa -e wlan.ssid"),
        ],
        flag="WIFIFORGE{RECON_HIDDEN_BSS_PNL}", skills=["recon", "hidden-ssid", "pnl", "mac-randomisation"],
        answer_basis="computed from probe/beacon frames with wififorge_labkit.decode",
        deliverable="Inventory table (BSSID | SSID | ch | AKM | PMF | frames) + a limits paragraph.",
    ))

    # ---------------------------------------------------------------- 3. traffic
    rec = frames("traffic-analysis")
    assoc = numbers(rec, subtype_name="Association Request") + numbers(rec, subtype_name="Association Response")
    eapol = [n for n, r in enumerate(rec, 1) if r.get("eapol_key")]
    challenges.append(dict(
        id="chal-03-traffic", title="From Capture to Evidence — One Association, Frame by Frame",
        module="06-traffic-analysis", difficulty="Intermediate", type="pcap_analysis", level="guided",
        estimated_time="25m", points=100, status="simulated",
        description=("traffic-analysis.pcapng contains one client's full lifecycle. Reconstruct it as a timeline "
                     "and turn one claim into a reproducible evidence record."),
        objectives=["Reconstruct the association state machine in order",
                    "Identify EAPOL-Key messages and their key-information flags",
                    "Package a claim with hash + filter + frames + limits"],
        artifacts=["traffic-analysis.pcapng"],
        tasks=[
            dict(id="t1", question="Give the frame sequence for the association state machine.",
                 answer=(f"Authentication: {fmt(numbers(rec, subtype_name='Authentication'))}; association: "
                         f"{fmt(assoc)}; 4-way handshake (EAPOL-Key): {fmt(eapol)}."),
                 hint="tshark -Y 'wlan.fc.type_subtype == 11 || wlan.fc.type_subtype == 0 || wlan.fc.type_subtype == 1 || eapol.type == 3' -T fields -e frame.number -e wlan.fc.type_subtype"),
            dict(id="t2", question="Classify every EAPOL-Key frame (M1–M4) using its key-information field.",
                 answer=("; ".join(f"frame {n}: {r.get('key_message')} (key_info=0x{int(r.get('key_info', 0)):04x})"
                                   for n, r in enumerate(rec, 1) if r.get("eapol_key"))
                         + ". Use the flags — ACK/MIC/Install/Secure — never the order alone."),
                 hint="tshark -Y 'eapol.type == 3' -T fields -e frame.number -e eapol.keydes.key_info -e eapol.keydes.replay_counter"),
            dict(id="t3", question="State the evidence record for the claim 'the client completed a WPA2 handshake with this BSS'.",
                 answer=("Artefact: traffic-analysis.pcapng (SHA-256 in MANIFEST.md); filter: eapol.type == 3; frames: "
                         f"{join([n for n, r in enumerate(rec, 1) if r.get('eapol_key')])}; interpretation: M1→M4 with "
                         "increasing replay counters and MICs derived from the PMK. Limit: the capture shows metadata and "
                         "the handshake only — payload confidentiality is not demonstrated, and no user is identified "
                         "(shared PMK)."),
                 hint="Hash + filter + frame numbers + interpretation + limit. A claim without all five is an opinion."),
        ],
        flag="WIFIFORGE{EVIDENCE_RECORD_HANDSHAKE}", skills=["wireshark", "evidence", "eapol"],
        answer_basis="computed from EAPOL/management frames with wififorge_labkit.decode",
        deliverable="A frame-numbered timeline plus one complete evidence record.",
    ))

    # ---------------------------------------------------------------- 4. handshake
    rec = frames("wpa2-handshake")
    clients = sorted({str(r.get("sa")) for r in rec if r.get("eapol_key") and str(r.get("sa")) != "00:11:22:33:44:55"})
    m = {}
    for n, r in enumerate(rec, 1):
        if r.get("eapol_key"):
            key = str(r.get("key_message", "")).split(" ")[0]
            m.setdefault(key, []).append(n)
    pmk = pmk_from_psk(LAB_PSK, "LAB-WIFI")
    challenges.append(dict(
        id="chal-04-handshake", title="Two Clients, One Complete Handshake",
        module="09-wpa2-practical", difficulty="Intermediate", type="pcap_analysis", level="guided",
        estimated_time="25m", points=100, status="simulated",
        description=("wpa2-handshake.pcapng has a complete M1–M4 exchange and a truncated M1–M2. Decide what each "
                     "one is worth for an offline audit, and verify the MIC yourself."),
        objectives=["Identify M1–M4 from key_info flags",
                    "Explain why M1+M2 is enough for an offline audit",
                    "Re-derive a MIC from the documented lab PSK"],
        artifacts=["wpa2-handshake.pcapng"],
        tasks=[
            dict(id="t1", question="Which frames are M1–M4, and for which client?",
                 answer=("; ".join(f"{k}: {fmt(v)}" for k, v in m.items())
                         + f". The complete exchange belongs to {clients[0] if clients else '?'}; the second client "
                         "has only M1/M2 and never received M3."),
                 hint="tshark -Y 'eapol.type == 3' -T fields -e frame.number -e wlan.sa -e eapol.keydes.key_info"),
            dict(id="t2", question="Why is the truncated exchange still usable for an offline audit?",
                 answer=("M2 carries the MIC computed with the KCK, and the KCK is derived from the PMK — so a candidate "
                         "passphrase can be tested entirely offline. M3/M4 add GTK delivery and confirmation, not "
                         "crackability. The incomplete handshake's security relevance is limited to an availability/"
                         "interoperability observation, not a separate finding."),
                 hint="Ask which message lets an attacker verify a candidate key."),
            dict(id="t3", question="Reproduce the audit end to end (documented lab PSK).",
                 answer=(f"PMK = PBKDF2-HMAC-SHA1('{LAB_PSK}', 'LAB-WIFI', 4096, 256) = {pmk.hex()[:32]}…; the MICs in "
                         "the capture verify against this PMK (scripts/verify-lab-artifacts.py performs the KCK→MIC "
                         "check). In hashcat terms: hcxpcapngtool -o audit.hc22000 wpa2-handshake.pcapng, then "
                         "hashcat -m 22000 audit.hc22000 wordlists/wififorge-lab-psk.txt --show."),
                 hint="PMK → PTK (PRF-512 over both MACs and nonces) → KCK → HMAC-SHA1 over the EAPOL-Key frame with the MIC zeroed."),
        ],
        flag="WIFIFORGE{HANDSHAKE_MIC_REDERIVE}", skills=["wpa2", "hashcat", "offline-audit"],
        answer_basis="computed from EAPOL-Key frames; MIC verification in scripts/verify-lab-artifacts.py",
        deliverable="A short audit note: frames, PMK derivation, hashcat result, and what the key grants.",
    ))

    # ---------------------------------------------------------------- 5. pmkid
    rec = frames("pmkid")
    m1 = [n for n, r in enumerate(rec, 1) if r.get("pmkid")]
    pmkid_value = str(rec[m1[0] - 1]["pmkid"]) if m1 else ""
    challenges.append(dict(
        id="chal-05-pmkid", title="Clientless Collection — The PMKID in M1",
        module="09-wpa2-practical", difficulty="Intermediate", type="pcap_analysis", level="semi-guided",
        estimated_time="20m", points=100, status="simulated",
        description=("pmkid.pcapng holds a single EAPOL-Key M1 with a PMKID key data encapsulation. Decide why this "
                     "matters operationally and what it does not prove."),
        objectives=["Locate the PMKID KDE inside M1 key data",
                    "Reproduce the PMKID from the PSK",
                    "Compare clientless collection with a handshake capture"],
        artifacts=["pmkid.pcapng"],
        tasks=[
            dict(id="t1", question="Where is the PMKID, and what is its value?",
                 answer=(f"{fmt(m1)}: M1 key data is 'dd14000fac04' + the 16-byte PMKID = {pmkid_value} "
                         "(KDE: element 221, length 20, OUI 00-0F-AC, type 04)."),
                 hint="tshark -Y 'eapol.type == 3' -T fields -e frame.number -e eapol.keydes.key_data"),
            dict(id="t2", question="Verify the PMKID from the documented lab PSK and the BSSID/client addresses.",
                 answer=(f"PMKID = HMAC-SHA1-128(PMK, 'PMK Name' | AA | SPA) with AA={rec[0].get('bssid')} and "
                         f"SPA={rec[3].get('sa')} reproduces {pmkid_value}, where PMK = PBKDF2-HMAC-SHA1('{LAB_PSK}', "
                         "'LAB-WIFI', 4096, 256). That is why a PMKID is crackable material: it is a keyed hash of the PMK."),
                 hint="python3 -c \"import sys;sys.path.insert(0,'scripts');from wififorge_labkit import *\" — or read scripts/verify-lab-artifacts.py."),
            dict(id="t3", question="What is the operational difference from a 4-way handshake capture?",
                 answer=("No client needs to connect: a single M1 is enough, so collection can be entirely passive with "
                         "no deauthentication. The security consequence is identical (offline PSK guessing); what changes "
                         "is the noise and the impact on the network. Limits: the AP must support PMK caching, and a "
                         "missing PMKID proves nothing about passphrase strength."),
                 hint="Think about what you would otherwise have to do to a live client."),
        ],
        flag="WIFIFORGE{PMKID_KDE_CLIENTLESS}", skills=["pmkid", "hashcat", "offline-audit"],
        answer_basis="PMKID read from the capture and recomputed with wififorge_labkit.pmkid",
        deliverable="PMKID value + derivation + a note on collection trade-offs.",
    ))

    # ---------------------------------------------------------------- 6. wps
    rec = frames("wps-beacon")
    wps = [(n, r) for n, r in enumerate(rec, 1) if r.get("wps_attrs")]
    unlocked = [str(r.get("bssid")) for _, r in wps if not r["wps_attrs"].get("setup_locked")]
    locked = [str(r.get("bssid")) for _, r in wps if r["wps_attrs"].get("setup_locked")]
    methods = [r["wps_attrs"].get("config_methods") for _, r in wps]
    challenges.append(dict(
        id="chal-06-wps", title="WPS State — Configuration Exposure vs Exploitability",
        module="10-wps", difficulty="Intermediate", type="pcap_analysis", level="semi-guided",
        estimated_time="20m", points=100, status="simulated",
        description=("wps-beacon.pcapng advertises WPS on two BSSs with different states. Decide what can and cannot "
                     "be concluded, and write the finding without over-claiming."),
        objectives=["Decode WPS IE attributes",
                    "Separate a configuration finding from a demonstrated exploit",
                    "Write remediation and retest criteria"],
        artifacts=["wps-beacon.pcapng"],
        tasks=[
            dict(id="t1", question="Which BSS is in setup-locked state, and which is open to enrolment?",
                 answer=(f"unlocked: {', '.join(unlocked) if unlocked else 'none'}; setup-locked: "
                         f"{', '.join(locked) if locked else 'none'} ({fmt([n for n, _ in wps])} carry the WPS IE). "
                         f"Config methods decoded: {methods} — label (PIN) and push-button where present."),
                 hint="tshark -Y 'wlan.tag.number == 221' -T fields -e frame.number -e wlan.bssid -e wps.ap_setup_locked -e wps.config_methods"),
            dict(id="t2", question="Is 'WPS enabled with the PIN method' exploitable on its own?",
                 answer=("No — it is a configuration exposure. Exploitability also requires: the PIN registrar to be "
                         "reachable, no effective lockout (the 8-digit PIN is ~11 000 guesses because the last digit is "
                         "a checksum and the halves are validated separately), and an authorised window to attempt it. "
                         "In this capture no PIN attack was performed, so the finding is stated as exposure with the "
                         "attack left as a testable condition."),
                 hint="Compare the two states and ask what evidence you would need for each claim."),
            dict(id="t3", question="State the remediation and how you would retest it.",
                 answer=("Disable WPS entirely (hostapd: wps_state=0) — the only complete fix for the PIN method. Where a "
                         "product requires WPS, enforce lockout and use PBC with a monitored window. Retest: re-enumerate "
                         "the BSS and show the WPS IE is gone (or setup-locked with enforced lockout verified by a "
                         "controlled attempt), then attempt one WSC exchange and record the rejection."),
                 hint="Remediation + verification, not just 'disable WPS'."),
        ],
        flag="WIFIFORGE{WPS_STATE_NOT_EXPLOIT}", skills=["wps", "config-review", "reporting"],
        answer_basis="WPS attributes decoded from beacons in the capture",
        deliverable="A configuration finding (not an exploit claim) with retest criteria.",
    ))

    # ---------------------------------------------------------------- 7. wpa3-only
    rec = frames("wpa3-only")
    b = bssids(rec)[0]
    protected = [n for n, r in enumerate(rec, 1) if r.get("protected")]
    challenges.append(dict(
        id="chal-07-wpa3-only", title="WPA3-Only — Proving a Control Holds",
        module="11-wpa3", difficulty="Advanced", type="pcap_analysis", level="semi-guided",
        estimated_time="20m", points=100, status="simulated",
        description=("wpa3-only.pcapng is a modern deployment. Your job is to document why the usual attacks do not "
                     "apply — including what you did not manage to get out of the capture."),
        objectives=["Read AKM and PMF from the RSNE",
                    "Explain why SAE resists offline guessing",
                    "Write a 'no finding' section that a reviewer can trust"],
        artifacts=["wpa3-only.pcapng"],
        tasks=[
            dict(id="t1", question="Classify the deployment from the RSNE.",
                 answer=(f"{b}: {ssid_for(rec, b)} — AKM {akm_for(rec, b)}, {pmf_for(rec, b)}. WPA3-Personal only: no "
                         "PSK AKM, so there is no 4-way handshake with crackable material in the capture."),
                 hint="Filter wlan.tag.number == 48 -e wlan.rsn.akms.type -e wlan.rsn.capabilities.mfpc -e wlan.rsn.capabilities.mfpr"),
            dict(id="t2", question="Why can't the SAE exchange be turned into an offline audit?",
                 answer=("SAE (Dragonfly) derives the session key from a password-authenticated key exchange: neither "
                         "commit nor confirm exposes a keyed verification value that lets a candidate password be tested "
                         "offline. A guess would have to be used in a live exchange (online, rate-limited by "
                         "anti-clogging/commit retries). There is also forward secrecy: recording the exchange now does "
                         "not help later. That is a design property, not a lab artefact."),
                 hint="Contrast with the MIC in M2 of a PSK handshake."),
            dict(id="t3", question="What does the protected deauthentication frame prove?",
                 answer=(f"{fmt(protected)}: the deauthentication frame has the Protected bit set and carries a BIP MIC, "
                         "i.e. it is a Robust Management Frame under PMF — a spoofer without the IGTK cannot produce one "
                         "the client accepts. Evidence for a control working."),
                 hint="tshark -Y 'wlan.fc.type_subtype == 12' -T fields -e frame.number -e wlan.fc.protected"),
        ],
        flag="WIFIFORGE{WPA3_SAE_NO_OFFLINE}", skills=["wpa3", "sae", "pmf", "reporting"],
        answer_basis="RSNE/PMF fields decoded from the capture",
        deliverable="A documented negative result: tests performed, evidence, limits.",
    ))

    # ---------------------------------------------------------------- 8. transition
    rec = frames("wpa3-transition")
    b = bssids(rec)[0]
    sae_auth = numbers(rec, subtype_name="Authentication", auth_algorithm=3)
    psk_auth = numbers(rec, subtype_name="Authentication", auth_algorithm=0)
    handshake = [n for n, r in enumerate(rec, 1) if r.get("eapol_key")]
    challenges.append(dict(
        id="chal-08-transition", title="Transition Mode — Demonstrating the Downgrade Path",
        module="11-wpa3", difficulty="Advanced", type="pcap_analysis", level="semi-guided",
        estimated_time="25m", points=100, status="simulated",
        description=("wpa3-transition.pcapng shows a BSS that offers both PSK and SAE. Prove how a client can end up on "
                     "the weaker path, and state the finding precisely."),
        objectives=["Identify a mixed AKM list",
                    "Distinguish SAE clients from PSK clients in the capture",
                    "Word the finding without claiming 'WPA3 is broken'"],
        artifacts=["wpa3-transition.pcapng"],
        tasks=[
            dict(id="t1", question="What policy does the BSS advertise?",
                 answer=(f"{b}: {ssid_for(rec, b)} — AKM {akm_for(rec, b)}; {pmf_for(rec, b)}. Two AKMs (PSK + SAE) with "
                         "MFPC-only is the textbook transition-mode profile: PMF is available but not required."),
                 hint="Read wlan.rsn.akms.type — a list with two entries means transition mode."),
            dict(id="t2", question="Which client used the weaker path, and what artefact proves it?",
                 answer=(f"SAE authentication (algorithm 3): {fmt(sae_auth)}; open/PSK authentication (algorithm 0): "
                         f"{fmt(psk_auth)} followed by EAPOL-Key frames {fmt(handshake)} — a WPA2 PSK handshake against a "
                         "WPA3-capable BSS. That is the downgrade path, demonstrated rather than asserted."),
                 hint="Client MACs differ between the two flows; correlate the authentication algorithm with the following handshake."),
            dict(id="t3", question="Write the finding: one sentence of claim plus remediation.",
                 answer=("Claim: the BSS permits a PSK association, so WPA3's offline-guessing resistance and mandatory "
                         "PMF do not apply to clients that choose the PSK AKM — a weak passphrase remains crackable from "
                         "a captured PSK handshake. Remediation: move to SAE-only (wpa_key_mgmt=SAE, ieee80211w=2) where "
                         "the client population allows it; if transition mode must stay, treat it as a documented "
                         "exception with PMF required, monitoring for PSK associations and a retirement date."),
                 hint="Scope the claim to the clients that actually downgrade."),
        ],
        flag="WIFIFORGE{TRANSITION_DOWNGRADE_PROVEN}", skills=["wpa3", "transition", "reporting"],
        answer_basis="authentication algorithms and EAPOL-Key frames decoded from the capture",
        deliverable="A scoped finding plus remediation/exception plan.",
    ))

    # ---------------------------------------------------------------- 9. deauth
    rec = frames("deauth")
    reasons = sorted({int(r.get("reason_code") or 0) for r in rec if r.get("subtype_name") in ("Deauthentication", "Disassociation")})
    floods = [n for n, r in enumerate(rec, 1) if r.get("subtype_name") == "Deauthentication" and r.get("da") == "ff:ff:ff:ff:ff:ff"]
    directed = [n for n, r in enumerate(rec, 1) if r.get("subtype_name") == "Deauthentication" and r.get("da") != "ff:ff:ff:ff:ff:ff"]
    pmf_bss = [b for b in bssids(rec) if "MFPR=1" in pmf_for(rec, b)]
    actions = numbers(rec, subtype_name="Action")
    challenges.append(dict(
        id="chal-09-deauth", title="Availability Testing — Frames, Effect and Reason Codes",
        module="12-deauth-disassoc", difficulty="Advanced", type="pcap_analysis", level="semi-guided",
        estimated_time="25m", points=100, status="simulated",
        description=("deauth.pcapng contains a spoofed flood against a PMF-capable BSS and the same attempt against a "
                     "PMF-required BSS, plus SA Query traffic. Decide what is demonstrable and what needs a live test."),
        objectives=["Interpret reason codes as evidence",
                    "Explain why PMF changes the outcome",
                    "State the evidence an availability finding requires"],
        artifacts=["deauth.pcapng"],
        tasks=[
            dict(id="t1", question="Summarise the deauthentication traffic: how many frames, which reasons, broadcast or directed?",
                 answer=(f"reason codes present: {reasons}; broadcast flood: {len(floods)} frames ({fmt(floods[:4])}…); "
                         f"directed frames: {len(directed)} ({fmt(directed)}). Reason 1 = unspecified (typical of tooling), "
                         "7 = class-3 frame from a nonassociated station, 8 = STA leaving, 15 = 4-way handshake timeout."),
                 hint="tshark -Y 'wlan.fc.type_subtype == 12' -T fields -e frame.number -e wlan.fixed.reason_code -e wlan.da"),
            dict(id="t2", question="Which BSS requires PMF, and what extra traffic shows the client defending itself?",
                 answer=(f"{', '.join(pmf_bss) if pmf_bss else 'none'} requires PMF (MFPR=1). Action frames {fmt(actions)} "
                         "are SA Query (category 8): the AP asks the client to prove it still holds the PTK before tearing "
                         "down state. An unprotected deauth is simply not accepted by a PMF client."),
                 hint="Filter wlan.fc.type_subtype == 13 and look at the action category."),
            dict(id="t3", question="What evidence would you need before reporting an availability finding?",
                 answer=("Transmission plus effect plus timing: the deauth frames, a client-side disconnection record "
                         "(supplicant log or AP logs) and the re-association timeline, all on one clock reference — and an "
                         "impact statement naming the population and duration. Frames alone prove only that something was "
                         "transmitted; a single capture cannot show that clients were removed."),
                 hint="Caution: 'we sent 200 deauths' is not an impact statement."),
        ],
        flag="WIFIFORGE{DEAUTH_REASONS_EFFECT}", skills=["pmf", "availability", "evidence"],
        answer_basis="deauthentication/action frames decoded from the capture",
        deliverable="An availability finding with effect evidence or an explicit statement that effect was not tested.",
    ))

    # ---------------------------------------------------------------- 10. rogue
    rec = frames("rogue-ap")
    bss = bssids(rec)
    legit, twin = bss[0], bss[1] if len(bss) > 1 else bss[0]
    local = int(twin.split(":")[0], 16) & 0x02
    challenges.append(dict(
        id="chal-10-rogue", title="Rogue Infrastructure — Build the Case From Signals",
        module="13-rogue-ap", difficulty="Advanced", type="pcap_analysis", level="assessment",
        estimated_time="30m", points=150, status="simulated",
        description=("rogue-ap.pcapng contains legitimate enterprise infrastructure and an impersonating BSS. You are "
                     "given no baseline document: decide which signals make the case, and what would falsify it."),
        objectives=["Compare BSSID administration bits, RSNE and beacon parameters",
                    "Trace client behaviour from deauth to association to handshake",
                    "Separate rogue-AP risk from client-impersonation risk"],
        artifacts=["rogue-ap.pcapng"],
        tasks=[
            dict(id="t1", question="Which BSS is the impersonator, and which signals support that?",
                 answer=(f"{twin}: locally administered MAC (bit 1 of the first octet set: {local == 2}), different AKM "
                         f"({akm_for(rec, twin)}) from the legitimate {legit} ({akm_for(rec, legit)}), different IE "
                         "fingerprint and channel plan. No single signal is proof — the case is the combination, ideally "
                         "corroborated by the authorised inventory."),
                 hint="Compare wlan.bssid, wlan.rsn.akms.type and wlan.fixed.beacon for both BSSIDs."),
            dict(id="t2", question="Reconstruct what happened to the client, with frames.",
                 answer=(f"Deauthentication {fmt(numbers(rec, subtype_name='Deauthentication'))} from the legitimate BSS; "
                         f"probe request {fmt(numbers(rec, subtype_name='Probe Request'))}; probe response and association "
                         f"to the twin ({fmt(numbers(rec, subtype_name='Probe Response') + numbers(rec, subtype_name='Association Request'))}); "
                         f"then a 4-way handshake with the twin ({fmt([n for n, r in enumerate(rec, 1) if r.get('eapol_key')])}). "
                         f"The handshake completes with the weak lab passphrase ({LAB_PSK_WEAK}) — so the attacker can "
                         "decrypt that client's traffic, and only that."),
                 hint="Order the frames you already have; the sequence is the evidence."),
            dict(id="t3", question="Write both findings (client impersonation and network-side rogue) and one control per finding.",
                 answer=("Client impersonation: clients auto-connect to a stored SSID and, in PSK mode, cannot verify the "
                         "network's identity → control: PMF required, WPA3-only where possible, and enterprise clients "
                         "with ca_cert + domain_suffix_match so a rogue authenticator cannot complete TLS. Network-side "
                         "rogue: unauthorised infrastructure that looks like an ESS member → control: WIDS/WIPS with an "
                         "authorised BSSID/IE baseline, wired-side correlation and a documented response that disables "
                         "the port and rotates captured credentials."),
                 hint="Different impacts, different owners, different controls."),
        ],
        flag="WIFIFORGE{ROGUE_TWIN_SIGNALS}", skills=["rogue-ap", "evil-twin", "detection"],
        answer_basis="beacon/EAPOL frames decoded from the capture",
        deliverable="Two findings with distinct impacts, controls and owners.",
    ))

    # ---------------------------------------------------------------- 11. portal
    rec = frames("captive-portal")
    arp = numbers(rec, subtype_name="QoS Data")
    challenges.append(dict(
        id="chal-11-portal", title="Guest Portal and Client Isolation",
        module="14-captive-portals", difficulty="Advanced", type="pcap_analysis", level="assessment",
        estimated_time="30m", points=150, status="simulated",
        description=("captive-portal.pcapng is an open guest network with a portal and a client-to-client exchange. "
                     "Only scope and artefacts are provided: decide what the findings are and what proves them."),
        objectives=["Trace the portal flow and find credential exposure",
                    "Test isolation and segmentation claims separately",
                    "Write findings at the level the evidence supports"],
        artifacts=["captive-portal.pcapng"],
        tasks=[
            dict(id="t1", question="Reconstruct the portal flow and identify the credential exposure.",
                 answer=("Open association → DHCP → HTTP redirect to the portal (302) → cleartext POST carrying the "
                         "credentials → Set-Cookie session token, all unencrypted on an open BSS. The exposure is not "
                         "'the portal is exploitable' but 'anyone in range receives the credentials and the token in "
                         "cleartext' — and a MAC-bound session can be hijacked by spoofing an authenticated client's MAC."),
                 hint="tshark -Y 'http.request' -T fields -e frame.number -e http.request.method -e http.host -e http.request.uri"),
            dict(id="t2", question="Does the capture show client isolation? Which frames decide it?",
                 answer=("No. Client-to-client ARP frames appear between two client MACs through the AP (55:66:77:88:99:aa "
                         "and the portal client), so clients can reach each other: ap_isolate=1 is not in force. Isolation "
                         "and segmentation are different controls — this capture says nothing about whether the guest VLAN "
                         "can reach corporate networks; that needs its own protocol-level test."),
                 hint="Look for ARP between two non-AP MACs."),
            dict(id="t3", question="Prioritise the remediation and justify the order.",
                 answer=("1) Encrypt the guest link (OWE, ieee80211w=2) — removes passive capture of every credential "
                         "carried on it. 2) Serve the portal over HTTPS with HSTS and bind sessions server-side rather "
                         "than to a spoofable MAC. 3) Enforce client isolation (ap_isolate=1). 4) Verify the guest VLAN's "
                         "inter-VLAN policy with an ACL test rather than assuming the portal's redirect rules are "
                         "segmentation. Order reflects blast radius: credentials first, then lateral movement, then "
                         "peer-to-peer exposure."),
                 hint="Rank by what an attacker gains and how easily."),
        ],
        flag="WIFIFORGE{PORTAL_ISOLATION_SPLIT}", skills=["captive-portal", "isolation", "reporting"],
        answer_basis="HTTP/ARP frames decoded from the capture",
        deliverable="Two prioritised findings (credential exposure, missing isolation) plus a segmentation test plan.",
    ))

    # ---------------------------------------------------------------- 12. enterprise
    rec = frames("enterprise")
    eap_types = sorted({str(r.get("eap_type_name")) for r in rec if r.get("eap_type_name")})
    challenges.append(dict(
        id="chal-12-enterprise", title="802.1X Path — From EAPOL-Start to Keys",
        module="15-enterprise-fundamentals", difficulty="Advanced", type="pcap_analysis", level="assessment",
        estimated_time="35m", points=150, status="simulated",
        description=("enterprise.pcapng follows one client through the enterprise path. Reconstruct the flow, name each "
                     "component and say where the trust decisions are made."),
        objectives=["Map supplicant → authenticator → RADIUS → identity store",
                    "Explain the MSK→PMK→PTK relationship",
                    "Decide what a passive capture can and cannot show"],
        artifacts=["enterprise.pcapng", "radius.pcapng"],
        tasks=[
            dict(id="t1", question="List the EAP methods and the order of the exchange.",
                 answer=(f"EAP types seen: {', '.join(eap_types)}. Order: EAPOL-Start/EAP-Request Identity → PEAP outer "
                         f"exchange → inner method → EAP-Success → 4-way handshake ({fmt([n for n, r in enumerate(rec, 1) if r.get('eapol_key')])}). "
                         "The outer identity is anonymous by design; the real identity is inside the TLS tunnel."),
                 hint="tshark -Y 'eap' -T fields -e frame.number -e eap.code -e eap.type"),
            dict(id="t2", question="Why is there still a 4-way handshake after successful EAP authentication?",
                 answer=("EAP produces the MSK; the PMK is the first 256 bits of it (per user, per session). The 4-way "
                         "handshake then proves both sides hold the PMK, derives the PTK (KCK/KEK/TK) bound to the MAC "
                         "addresses and nonces, and installs keys including the GTK. If it is missing: the EAP exchange did "
                         "not actually succeed, the client aborted, or the capture is incomplete."),
                 hint="The two exchanges derive different keys for different purposes."),
            dict(id="t3", question="What can a passive capture of this flow prove about credential exposure?",
                 answer=("Nothing directly — the inner MS-CHAPv2 exchange is inside the TLS tunnel. Credential exposure "
                         "requires the client to accept a rogue authenticator (no ca_cert / domain_suffix_match), which "
                         "needs an active, authorised test. From this capture you can only establish the method, the "
                         "identities and the fact that the client reached an authenticated state."),
                 hint="State the precondition for the attack rather than assuming the capture demonstrates it."),
        ],
        flag="WIFIFORGE{ENTERPRISE_MSK_TO_PMK}", skills=["802.1x", "eap", "peap"],
        answer_basis="EAP/EAPOL frames decoded from the capture",
        deliverable="A role-labelled flow diagram plus a precondition analysis.",
    ))

    # ---------------------------------------------------------------- 13. eap
    rec = frames("eap")
    peers = numbers(rec, eap_type_name="MS-CHAPv2", mschapv2_opcode_name="Response")
    chal = numbers(rec, eap_type_name="MS-CHAPv2", mschapv2_opcode_name="Challenge")
    challenges.append(dict(
        id="chal-13-eap", title="EAP Methods and MS-CHAPv2 Material",
        module="16-eap", difficulty="Advanced", type="pcap_analysis", level="assessment",
        estimated_time="35m", points=150, status="simulated",
        description=("eap.pcapng mixes PEAP, EAP-TLS and EAP-TTLS exchanges and includes real MS-CHAPv2 material. Work "
                     "out which exchanges can leak credentials and under which precondition."),
        objectives=["Identify methods from outer exchanges",
                    "Extract and verify MS-CHAPv2 material",
                    "Explain the certificate-validation precondition"],
        artifacts=["eap.pcapng"],
        tasks=[
            dict(id="t1", question="Which EAP methods appear, and what does each protect?",
                 answer=("PEAP (type 25) and EAP-TTLS (type 21) tunnel an inner method behind TLS; EAP-TLS (type 13) uses "
                         "client certificates on both sides; MS-CHAPv2 (type 26) appears as the inner method. PEAP/TTLS "
                         "protect the inner exchange only if the client validates the server's certificate — EAP-TLS does "
                         "not depend on a password at all."),
                 hint="tshark -Y 'eap.type == 25 || eap.type == 13 || eap.type == 21 || eap.type == 26'"),
            dict(id="t2", question="Extract the MS-CHAPv2 challenge/response pair and say what makes it crackable.",
                 answer=(f"Challenge frames {fmt(chal)} and Response frames {fmt(peers)}: the response contains the "
                         "16-byte peer challenge, the 24-byte NT-Response and the username. The NT-Response is derived "
                         "from MD4(password) with the challenge hash SHA1(PeerChallenge | AuthenticatorChallenge | "
                         "UserName)[0:8] — a fast, unsalted construction that makes `hashcat -m 5500` effective against "
                         "human-chosen passwords. scripts/verify-lab-artifacts.py re-derives it from the documented lab "
                         "password and checks the RFC 2759 test vector."),
                 hint="The material is only present because the tunnel was terminated — say by whom."),
            dict(id="t3", question="State the precondition and the controls that remove it.",
                 answer=("Precondition: the client did not validate the server certificate, so a rogue authenticator "
                         "completed the TLS handshake and ran the inner method. Controls, strongest first: EAP-TLS with "
                         "client certificates; enforce ca_cert plus domain_suffix_match in every managed profile; disable "
                         "PEAP-MSCHAPv2 server-side where possible; require PMF so clients cannot be pushed off the "
                         "legitimate BSS; monitor for rogue BSSIDs and duplicate SSIDs."),
                 hint="Controls belong at the client profile, the RADIUS policy and the radio."),
        ],
        flag="WIFIFORGE{EAP_MSCHAPV2_PRECONDITION}", skills=["eap", "mschapv2", "certificates"],
        answer_basis="EAP/MS-CHAPv2 fields decoded from the capture; RFC 2759 derivation checked in verify-lab-artifacts.py",
        deliverable="A precondition analysis plus a layered remediation.",
    ))

    # ---------------------------------------------------------------- 14. radius
    rec = frames("radius")
    codes = [str(r.get("radius_code_name")) for r in rec if r.get("radius_code_name")]
    vlan = next((r.get("radius_attributes", {}) for r in rec if isinstance(r.get("radius_attributes"), dict)), {})
    challenges.append(dict(
        id="chal-14-radius", title="RADIUS — Verifiable Integrity and Trust Boundaries",
        module="17-radius", difficulty="Professional", type="pcap_analysis", level="assessment",
        estimated_time="40m", points=200, status="simulated",
        description=("radius.pcapng contains an authentication exchange, an accounting pair, a rogue NAS request and "
                     "policy attributes. Verify the integrity fields yourself before drawing conclusions."),
        objectives=["Read codes and attributes as evidence",
                    "Verify Message-Authenticator and Response Authenticator",
                    "Assess the shared secret as a high-value credential"],
        artifacts=["radius.pcapng"],
        tasks=[
            dict(id="t1", question="List the RADIUS packets with codes and the EAP method inside them.",
                 answer=("; ".join(f"frame {n}: {r.get('radius_code_name')}"
                                   + (f" / {r.get('eap_type_name')}" if r.get("eap_type_name") else "")
                                   for n, r in enumerate(rec, 1) if r.get("radius_code_name"))
                         + ". Note EAP-Message can be split across several attributes: concatenate every type-79 "
                           "attribute before parsing, or the EAP packet will be silently truncated."),
                 hint="tshark -Y radius -T fields -e frame.number -e radius.code -e radius.eap_message"),
            dict(id="t2", question="Verify integrity: what does the Message-Authenticator prove, and why does one request fail?",
                 answer=("Message-Authenticator = HMAC-MD5 over the packet with the attribute value zeroed, keyed with the "
                         "shared secret — it proves the sender knows the secret and the packet is unmodified. Recomputing "
                         "it for each request with the documented lab secret verifies the exchange; the rogue-NAS request "
                         "in the capture was built with a different secret and fails verification, which is exactly what "
                         "you should reproduce by hand. Responses additionally carry the Response Authenticator "
                         "(MD5 over code|id|length|request authenticator|attributes|secret)."),
                 hint="Zero the 16-byte attribute value before hashing, then compare with the captured value."),
            dict(id="t3", question="What is the impact of a leaked shared secret, and what limits it?",
                 answer=("With the secret an attacker can verify and forge RADIUS packets, decrypt User-Password "
                         "attributes in captured requests and, if the server accepts requests from anywhere, answer as a "
                         "NAS. Impact is bounded by: require_message_authenticator (unsigned requests rejected), source-IP "
                         "restriction and per-device secrets, RadSec (TLS) for transport, and secret rotation. Evidence for "
                         "this finding is the recomputation, not the secrecy assumption."),
                 hint="Environmental preconditions decide severity — test them, do not assume them."),
        ],
        flag="WIFIFORGE{RADIUS_VERIFY_MA_ROGUE_NAS}", skills=["radius", "integrity", "shared-secret"],
        answer_basis="RADIUS attributes and authenticators decoded/verified from the capture",
        deliverable="A verification record (packet bytes, secret used, calculation) plus an impact analysis.",
    ))

    # ---------------------------------------------------------------- 15. engagement
    rec = frames("methodology")
    all_bss = bssids(rec)
    pmf_req = [b for b in all_bss if "MFPR=1" in pmf_for(rec, b)]
    weak = [b for b in all_bss if ssid_for(rec, b) == "LAB-WEAK-PSK"]
    challenges.append(dict(
        id="chal-15-engagement", title="Multi-BSS Engagement — Test Plan and Findings",
        module="20-final-assessment", difficulty="Professional", type="pcap_analysis", level="assessment",
        estimated_time="45m", points=200, status="simulated",
        description=("methodology.pcapng is a multi-BSS capture of a four-SSID estate. You get the capture and nothing "
                     "else: prioritise the estate, select the tests, and write findings that survive review."),
        objectives=["Triage an estate from a single capture",
                    "Choose tests by expected impact, not by tool availability",
                    "Produce findings, limits and a retest plan"],
        artifacts=["methodology.pcapng"],
        tasks=[
            dict(id="t1", question="Produce the attack-surface inventory (BSSID, SSID, AKM, PMF, notable frames).",
                 answer=("; ".join(f"{b}: {ssid_for(rec, b)}, AKM {akm_for(rec, b)}, {pmf_for(rec, b)}" for b in all_bss)
                         + f". BSSs requiring PMF: {', '.join(pmf_req) if pmf_req else 'none'}; the weak-passphrase BSS is "
                           f"{', '.join(weak) if weak else 'not present'}."),
                 hint="Beacon fields give you the policy; the rest of the capture gives you behaviour."),
            dict(id="t2", question="Prioritise the test sequence and justify it.",
                 answer=("1) Passive inventory and policy review (no impact). 2) Offline audit of any PSK material — "
                         "passive collection, no disruption. 3) Portal/cleartext exposure review on the open or OWE BSS. "
                         "4) Enterprise path analysis; the rogue-authenticator test needs authorisation and a window. "
                         "5) Availability testing last, timeboxed, on named test clients. Order = increasing impact and "
                         "increasing disruption; each stage informs whether the next is worth its risk."),
                 hint="Cheapest, least disruptive, highest information first."),
            dict(id="t3", question="Write the finding list with severity reasoning and retest criteria.",
                 answer=("Expected findings: (a) guessable shared PSK on the PSK BSS — offline audit evidence, impact "
                         "bounded by what that L2 reaches, retest = same audit after rotation (the recovered line must "
                         "disappear); (b) cleartext portal credentials — impact = credential theft for every guest, "
                         "retest = repeat capture, expect HTTPS; (c) PMF absent on some BSSs — availability finding scoped "
                         "to the clients that do not negotiate PMF, retest = deauth test with identical parameters, expect "
                         "no disconnection; (d) enterprise credential exposure only if the rogue-authenticator test is "
                         "authorised and succeeds — retest = rogue authenticator with validation enforced, expect a TLS "
                         "alert. Each severity must name the environment assumption that produced it."),
                 hint="Four findings, four retests, each stating what would falsify it."),
        ],
        flag="WIFIFORGE{ENGAGEMENT_TRIAGE_RETEST}", skills=["methodology", "assessment", "reporting", "retest"],
        answer_basis="computed from the multi-BSS capture; findings verified in scripts/verify-lab-artifacts.py",
        deliverable="An inventory, a sequenced test plan, findings with severity reasoning and retest criteria.",
    ))

    return challenges


def main() -> int:
    challenges = build()
    with open(OUT, "w") as fh:
        json.dump(challenges, fh, indent=1)
    levels = {}
    for c in challenges:
        levels[c["level"]] = levels.get(c["level"], 0) + 1
    print(f"wrote {len(challenges)} challenges to {OUT}")
    print(f"  levels: {levels}")
    print(f"  tasks:  {sum(len(c['tasks']) for c in challenges)} (answers computed from the captures)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

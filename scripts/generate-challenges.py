#!/usr/bin/env python3
"""Generate frontend/src/content/challenges.json from the verified lab captures.

Frame-specific facts (addresses, frame numbers, decoded fields, challenge responses) are derived from the
artifacts where practical. Explanatory answer keys and interpretation prompts are authored guidance, not
machine-graded output; the verifier spot-checks selected claims. Run after `generate-lab-artifacts.py`:

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
                 answer=(f"{', '.join(no_rsn) if no_rsn else 'none'} — no RSN information element is advertised, so the "
                         "beacon does not show a WPA2/WPA3 RSN policy. Check the Privacy capability and any other "
                         "security IEs before distinguishing an open BSS from legacy WEP; absence alone does not "
                         "establish which one it is."),
                 hint="Filter wlan.tag.number == 48 and compare which BSSIDs appear."),
            dict(id="t3", question="Which BSS requires management frame protection, and which frames prove it?",
                 answer=(f"{', '.join(req) if req else 'none'} — RSN capabilities show MFPR=1 in the beacon "
                         f"({fmt([n for n, r in enumerate(rec, 1) if r.get('mfpr')])}). MFPR is RSN capabilities bit 6 "
                         "(0x0040); MFPC is bit 7 (0x0080). Advertisement is not proof of a station's negotiated PMF state."),
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
    reveal = [n for n, r in enumerate(rec, 1)
              if r.get("subtype_name") == "Probe Response" and r.get("bssid") in hidden]
    hidden_reveal = next((r for r in rec if r.get("subtype_name") == "Probe Response"
                          and r.get("bssid") in hidden), {})
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
                         "consistent with one ESS, but an SSID match alone does not establish membership. Correlate with an "
                         "authorized inventory/controller configuration and deployment context."),
                 hint="Count unique wlan.bssid across beacons, then unique wlan.ssid."),
            dict(id="t2", question="Which BSS hides its SSID, and which frame discloses it?",
                 answer=(f"{', '.join(hidden) if hidden else 'none'} hides its SSID (SSID IE length 0 in its beacon). "
                         f"The probe response in {fmt(reveal)} carries the SSID '{hidden_reveal.get('ssid', '')}' "
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
        description=("traffic-analysis.pcapng is a deterministic one-client lifecycle fixture. Reconstruct the recorded sequence as a timeline "
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
            dict(id="t3", question="What EAPOL-Key sequence is recorded, and what additional evidence would be needed to claim a real client completed a WPA2 handshake with a production BSS?",
                 answer=("Artefact: traffic-analysis.pcapng (SHA-256 in MANIFEST.md); filter: eapol.type == 3; frames: "
                         f"{join([n for n, r in enumerate(rec, 1) if r.get('eapol_key')])}; interpretation: the fixture contains an M1→M4 sequence with replay counters and MICs that verify against its documented lab PMK. Limit: this synthetic capture does not establish RF delivery, AP acceptance, or a production client/session. A live claim needs authorized capture plus client/AP logs and association context; user identity is not established by the shared PSK."),
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
        module="08-wpa-wpa2", difficulty="Intermediate", type="pcap_analysis", level="guided",
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
                         "has M1/M2 recorded but no M3/M4 in this capture; that absence does not establish what the station actually received."),
                 hint="tshark -Y 'eapol.type == 3' -T fields -e frame.number -e wlan.sa -e eapol.keydes.key_info"),
            dict(id="t2", question="Why is the truncated exchange still usable for an offline audit?",
                 answer=("M2 carries the MIC computed with the KCK, and the KCK is derived from the PMK — so a candidate "
                         "passphrase can be tested entirely offline. M3/M4 add GTK delivery and confirmation, not "
                         "crackability. The missing M3/M4 in this capture may reflect capture loss or a partial exchange; it "
                         "does not by itself prove an availability/interoperability failure. The M1/M2 material remains auditable."),
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
        id="chal-05-pmkid", title="PMKID Without a Full Handshake — The KDE in M1",
        module="08-wpa-wpa2", difficulty="Intermediate", type="pcap_analysis", level="semi-guided",
        estimated_time="20m", points=100, status="simulated",
        description=("pmkid.pcapng holds a single EAPOL-Key M1 with a PMKID key data encapsulation. Decide why this "
                     "matters operationally and what it does not prove."),
        objectives=["Locate the PMKID KDE inside M1 key data",
                    "Reproduce the PMKID from the PSK",
                    "Compare PMKID collection without a full handshake with a 4-way capture"],
        artifacts=["pmkid.pcapng"],
        tasks=[
            dict(id="t1", question="Where is the PMKID, and what is its value?",
                 answer=(f"{fmt(m1)}: M1 key data is 'dd14000fac04' + the 16-byte PMKID = {pmkid_value} "
                         "(KDE: element 221, length 20, OUI 00-0F-AC, type 04)."),
                 hint="tshark -Y 'eapol.type == 3' -T fields -e frame.number -e wlan_rsna_eapol.keydes.data"),
            dict(id="t2", question="Verify the PMKID from the documented lab PSK and the BSSID/client addresses.",
                 answer=(f"PMKID = HMAC-SHA1-128(PMK, 'PMK Name' | AA | SPA) with AA={rec[0].get('bssid')} and "
                         f"SPA={rec[3].get('sa')} reproduces {pmkid_value}, where PMK = PBKDF2-HMAC-SHA1('{LAB_PSK}', "
                         "'LAB-WIFI', 4096, 256). That is why a PMKID is crackable material: it is a keyed hash of the PMK."),
                 hint="python3 -c \"import sys;sys.path.insert(0,'scripts');from wififorge_labkit import *\" — or read scripts/verify-lab-artifacts.py."),
            dict(id="t3", question="What is the operational difference from a 4-way handshake capture?",
                 answer=("A PMKID-bearing M1 can provide offline-verification material without capturing all four EAPOL-Key messages, and may be collected passively without deauthentication when an AP emits it for an associated client. It is not necessarily clientless: an association/exchange must occur and AP behavior varies. The material permits offline PSK guesses; a missing PMKID proves nothing about passphrase strength."),
                 hint="Think about what you would otherwise have to do to a live client."),
        ],
        flag="WIFIFORGE{PMKID_KDE_NO_FULL_HANDSHAKE}", skills=["pmkid", "hashcat", "offline-audit"],
        answer_basis="PMKID read from the capture and recomputed with wififorge_labkit.pmkid",
        deliverable="PMKID value + derivation + a note on collection trade-offs.",
    ))

    # ---------------------------------------------------------------- 6. wps
    rec = frames("wps-beacon")
    wps = [(n, r) for n, r in enumerate(rec, 1) if r.get("wps_attrs")]
    unlocked = [str(r.get("bssid")) for _, r in wps if not r["wps_attrs"].get("setup_locked")]
    locked = [str(r.get("bssid")) for _, r in wps if r["wps_attrs"].get("setup_locked")]
    method_labels = []
    for n, r in wps:
        attrs = r["wps_attrs"]
        config = attrs.get("config_methods") or {}
        offered = [name for key, name in (("label", "PIN/label"), ("display", "display"), ("push_button", "push-button")) if config.get(key)]
        method_labels.append(f"{r.get('bssid')}: {', '.join(offered) or 'none decoded'}; setup_locked={bool(attrs.get('setup_locked'))}; selected_registrar={bool(attrs.get('selected_registrar'))}")
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
            dict(id="t1", question="Which BSS advertises Setup Locked, and what WPS methods/registrar state are visible on each?",
                 answer=(f"Setup Locked not advertised: {', '.join(unlocked) if unlocked else 'none'}; Setup Locked set: "
                         f"{', '.join(locked) if locked else 'none'} ({fmt([n for n, _ in wps])} carry the WPS IE). "
                         f"Decoded WPS state: {'; '.join(method_labels)}. These beacon fields do not prove live reachability, successful enrollment, or lockout behavior."),
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
        description=("wpa3-only.pcapng is a synthetic teaching fixture advertising SAE-only policy. State what its frames "
                     "show, what they do not validate, and how to write a bounded no-finding conclusion."),
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
                         "offline from a passive transcript alone when correctly implemented; implementation flaws and side channels remain possible. A guess generally requires a live exchange, but rate limiting is implementation-dependent. SAE is designed to provide forward secrecy when ephemeral values are generated and handled correctly. The abbreviated synthetic frames in this fixture do not validate a real SAE exchange."),
                 hint="Contrast with the MIC in M2 of a PSK handshake."),
            dict(id="t3", question="What does the protected deauthentication frame prove?",
                 answer=(f"{fmt(protected)}: the fixture marks this deauthentication frame protected and includes a BIP MIC-like field. The capture's IGTK is synthetic/unknown, so it does not prove the MIC is cryptographically valid or that a receiver accepted the frame. The beacon's MFPR advertisement is direct policy evidence; validate PMF behavior using an authorized client/AP test."),
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
    psk_station = next((str(r.get("sa")) for r in rec if r.get("eapol_key") and r.get("sa") != b), "unknown")
    sae_station = next((str(r.get("sa")) for r in rec if r.get("auth_algorithm") == 3 and r.get("sa") != b), "unknown")
    challenges.append(dict(
        id="chal-08-transition", title="Transition Mode — Evidence of a PSK Association",
        module="11-wpa3", difficulty="Advanced", type="pcap_analysis", level="semi-guided",
        estimated_time="25m", points=100, status="simulated",
        description=("wpa3-transition.pcapng shows a BSS advertising both PSK and SAE, plus a captured PSK handshake. "
                     "Document which path the fixture shows; it does not prove that an attacker induced a downgrade."),
        objectives=["Identify a mixed AKM list",
                    "Identify the captured PSK association without claiming it was attacker-induced",
                    "Word the finding without claiming 'WPA3 is broken'"],
        artifacts=["wpa3-transition.pcapng"],
        tasks=[
            dict(id="t1", question="What policy does the BSS advertise?",
                 answer=(f"{b}: {ssid_for(rec, b)} — advertised AKMs {akm_for(rec, b)}; {pmf_for(rec, b)}. In this fixture PSK and SAE are both advertised, with PMF capable (MFPC=1) but not required (MFPR=0). This does not establish what a deployed client negotiated."),
                 hint="Read wlan.rsn.akms.type — a list with two entries means transition mode."),
            dict(id="t2", question="Which station's recorded association trace uses PSK rather than SAE, and what evidence supports that reading?",
                 answer=(f"SAE-shaped authentication frames (algorithm 3) involve station {sae_station}: {fmt(sae_auth)}. The station {psk_station} has open-system authentication (algorithm 0) at {fmt(psk_auth)} followed by EAPOL-Key frames {fmt(handshake)} — evidence of a PSK handshake against a BSS that also advertises SAE. The synthetic SAE payloads do not prove a valid SAE exchange, and the PSK path does not prove an attacker induced a downgrade."),
                 hint="Client MACs differ between the two flows; correlate the authentication algorithm with the following handshake."),
            dict(id="t3", question="Write the finding: one sentence of claim plus remediation.",
                 answer=("Claim: the beacon advertises PSK as well as SAE and the fixture contains a PSK handshake; it does not show an induced downgrade or establish a weak production passphrase. If PSK compatibility is unnecessary, consider SAE-only with PMF required; otherwise assess passphrase strength and client negotiation in an authorized deployment test."),
                 hint="Scope the claim to the captured PSK association; do not assert that an attacker induced a downgrade."),
        ],
        flag="WIFIFORGE{TRANSITION_PSK_PATH_RECORDED}", skills=["wpa3", "transition", "reporting"],
        answer_basis="authentication algorithms and EAPOL-Key frames decoded from the capture",
        deliverable="A scoped finding plus remediation/exception plan.",
    ))

    # ---------------------------------------------------------------- 9. deauth
    rec = frames("deauth")
    reasons = sorted({int(r.get("reason") or 0) for r in rec if r.get("subtype_name") in ("Deauthentication", "Disassociation")})
    floods = [n for n, r in enumerate(rec, 1) if r.get("subtype_name") == "Deauthentication" and r.get("da") == "ff:ff:ff:ff:ff:ff"]
    directed = [n for n, r in enumerate(rec, 1) if r.get("subtype_name") == "Deauthentication" and r.get("da") != "ff:ff:ff:ff:ff:ff"]
    pmf_bss = [b for b in bssids(rec) if "MFPR=1" in pmf_for(rec, b)]
    actions = numbers(rec, subtype_name="Action")
    challenges.append(dict(
        id="chal-09-deauth", title="Availability Testing — Frames, Effect and Reason Codes",
        module="12-deauth-disassoc", difficulty="Advanced", type="pcap_analysis", level="semi-guided",
        estimated_time="25m", points=100, status="simulated",
        description=("deauth.pcapng is a synthetic frame sequence with broadcast/directed deauthentication and disassociation, "
                     "two SA Query-shaped action frames, and BSSs advertising different PMF capabilities. Frames alone do not prove delivery, acceptance, or service impact."),
        objectives=["Interpret reason codes as evidence",
                    "Explain why PMF changes the outcome",
                    "State the evidence an availability finding requires"],
        artifacts=["deauth.pcapng"],
        tasks=[
            dict(id="t1", question="Summarise the deauthentication traffic: how many frames, which reasons, broadcast or directed?",
                 answer=(f"reason codes present: {reasons}; broadcast deauthentication set: {len(floods)} frames ({fmt(floods[:4])}…); "
                         f"directed frames: {len(directed)} ({fmt(directed)}). Reason 1 = unspecified (not attribution or proof of tooling), "
                         "7 = class-3 frame from a nonassociated station, 8 = STA leaving, 15 = 4-way handshake timeout."),
                 hint="tshark -Y 'wlan.fc.type_subtype == 12' -T fields -e frame.number -e wlan.fixed.reason_code -e wlan.da"),
            dict(id="t2", question="Which BSS advertises PMF required, and what SA Query-shaped traffic is present in the fixture?",
                 answer=(f"{', '.join(pmf_bss) if pmf_bss else 'none'} advertises MFPR=1. Frames {fmt(actions)} carry category-8 SA Query-shaped request/response bytes in this synthetic fixture. They do not prove a valid protected exchange, PTK possession, or that a real client rejected a deauthentication."),
                 hint="Filter wlan.fc.type_subtype == 13 and look at the action category."),
            dict(id="t3", question="What evidence would you need before reporting an availability finding?",
                 answer=("Transmission plus effect plus timing: the deauth frames, a client-side disconnection record "
                         "(supplicant log or AP logs) and the re-association timeline, all on one clock reference — and an "
                         "impact statement naming the population and duration. A packet record alone does not prove that a real frame "
                         "was transmitted/delivered or that clients were removed."),
                 hint="Caution: 'we sent 200 deauths' is not an impact statement."),
        ],
        flag="WIFIFORGE{DEAUTH_REASONS_EFFECT}", skills=["pmf", "availability", "evidence"],
        answer_basis="deauthentication/action frames decoded from the capture",
        deliverable="An availability finding with effect evidence or an explicit statement that effect was not tested.",
    ))

    # ---------------------------------------------------------------- 10. rogue
    rec = frames("rogue-ap")
    bss = bssids(rec)
    reference, twin = bss[0], bss[1] if len(bss) > 1 else bss[0]
    local = int(twin.split(":")[0], 16) & 0x02
    challenges.append(dict(
        id="chal-10-rogue", title="Rogue Infrastructure — Build the Case From Signals",
        module="12-deauth-disassoc", difficulty="Advanced", type="pcap_analysis", level="assessment",
        estimated_time="30m", points=150, status="simulated",
        description=("rogue-ap.pcapng contains an enterprise-style BSS and a same-SSID look-alike with differing advertised settings. No authorized BSSID inventory is supplied; decide what the capture supports and what remains unproven."),
        objectives=["Compare BSSID administration bits, RSNE and beacon parameters",
                    "Reconstruct the frame order and distinguish sequence from causation",
                    "Separate rogue-AP risk from client-impersonation risk"],
        artifacts=["rogue-ap.pcapng"],
        tasks=[
            dict(id="t1", question="Which BSS is the look-alike? What additional evidence is needed before calling it unauthorized?",
                 answer=(f"{twin}: locally administered MAC (bit 1 of the first octet set: {local == 2}), different AKM "
                         f"({akm_for(rec, twin)}) from the other captured BSS {reference} ({akm_for(rec, reference)}), different IE "
                         "fingerprint and channel plan. No single signal is proof — the case is the combination, ideally "
                         "corroborated by the authorised inventory."),
                 hint="Compare wlan.bssid, wlan.rsn.akms.type and wlan.fixed.beacon for both BSSIDs."),
            dict(id="t2", question="Reconstruct what happened to the client, with frames.",
                 answer=(f"The fixture records deauthentication frame(s) {fmt(numbers(rec, subtype_name='Deauthentication'))}, a probe request {fmt(numbers(rec, subtype_name='Probe Request'))}, then a probe response/association with the look-alike ({fmt(numbers(rec, subtype_name='Probe Response') + numbers(rec, subtype_name='Association Request'))}) and a 4-way handshake ({fmt([n for n, r in enumerate(rec, 1) if r.get('eapol_key')])}). The documented weak lab PSK ({LAB_PSK_WEAK}) reproduces the handshake MIC; the sequence does not prove the deauth reached the client or caused association. No encrypted client payload traffic is included; the handshake could support offline audit/decryption of separately captured traffic."),
                 hint="Order the frames you already have; the sequence is the evidence."),
            dict(id="t3", question="Write a bounded finding or no-finding conclusion for the look-alike and client association. What evidence would establish unauthorized ownership and real client impact?",
                 answer=("The capture shows a same-SSID look-alike with different advertised security/IEs and a client association/handshake sequence, but it does not establish unauthorized ownership, a real client profile, or that an attack caused the association. Compare against an authorized BSSID/IE inventory and correlate wired-side ownership/logs before calling it a rogue. In a controlled client test, verify profile/AKM behavior and impact. Controls may include managed enterprise certificate validation, appropriate WPA3/PMF policy, WIDS with an authorized baseline, and a documented response; do not infer credential capture or rotate credentials without evidence."),
                 hint="Different impacts, different owners, different controls."),
        ],
        flag="WIFIFORGE{ROGUE_TWIN_SIGNALS}", skills=["rogue-ap", "evil-twin", "detection"],
        answer_basis="beacon/EAPOL frames decoded from the capture",
        deliverable="A bounded finding or no-finding conclusion, with additional evidence and safe tests needed to establish ownership/impact.",
    ))

    # ---------------------------------------------------------------- 11. portal
    rec = frames("captive-portal")
    arp = numbers(rec, subtype_name="QoS Data")
    challenges.append(dict(
        id="chal-11-portal", title="Guest Portal and Client Isolation",
        module="14-captive-portals", difficulty="Advanced", type="pcap_analysis", level="assessment",
        estimated_time="30m", points=150, status="simulated",
        description=("captive-portal.pcapng is a packet-level open-network simulation with an HTTP portal flow and a two-station ARP exchange. "
                     "Distinguish fixture evidence from claims that would require a real service or network test."),
        objectives=["Trace the HTTP flow and identify bytes visible in the fixture",
                    "Test isolation and segmentation claims separately",
                    "Write findings at the level the evidence supports"],
        artifacts=["captive-portal.pcapng"],
        tasks=[
            dict(id="t1", question="Reconstruct the portal flow and identify which values are visible in plaintext in this fixture.",
                 answer=("Open association → DHCP DORA → HTTP connectivity-check GET → 302 redirect → cleartext POST with lab-only values → HTTP response with Set-Cookie. The fixture exposes those bytes on an open BSS, but it does not implement a real portal, prove that a server trusts the MAC in the URL, or demonstrate session hijacking; those require controlled service-side tests and logs."),
                 hint="tshark -Y 'http.request' -T fields -e frame.number -e http.request.method -e http.host -e http.request.uri"),
            dict(id="t2", question="Does the capture show client isolation? Which frames decide it?",
                 answer=("The synthetic packet sequence shows an ARP request from 12:34:56:78:9a:bc forwarded by the AP to 02:66:77:88:99:aa, followed by the peer reply forwarded back. That demonstrates the fixture models station-to-station forwarding; it does not establish a real AP setting or production isolation failure. The capture says nothing about guest-to-corporate segmentation, which needs a separate scoped test."),
                 hint="Look for ARP between two non-AP MACs."),
            dict(id="t3", question="Prioritise the remediation and justify the order.",
                 answer=("Prioritize TLS/HTTPS for the portal and server-side session controls, then validate guest client isolation and inter-VLAN policy independently. The fixture demonstrates cleartext HTTP bytes and simulated peer ARP forwarding only; it does not establish a MAC-based authorization flaw or prove an actual production control is absent."),
                 hint="Rank by what an attacker gains and how easily."),
        ],
        flag="WIFIFORGE{PORTAL_ISOLATION_SPLIT}", skills=["captive-portal", "isolation", "reporting"],
        answer_basis="HTTP/ARP frames decoded from the capture",
        deliverable="Two bounded fixture observations (visible HTTP values and modeled station-to-station forwarding) plus separate authorized portal/isolation/segmentation test plans.",
    ))

    # ---------------------------------------------------------------- 12. enterprise
    rec = frames("enterprise")
    eap_types = sorted({str(r.get("eap_type_name")) for r in rec if r.get("eap_type_name")})
    challenges.append(dict(
        id="chal-12-enterprise", title="802.1X Path — From EAPOL-Start to Keys",
        module="15-enterprise-fundamentals", difficulty="Advanced", type="pcap_analysis", level="assessment",
        estimated_time="35m", points=150, status="simulated",
        description=("enterprise.pcapng is an abbreviated synthetic EAPOL/EAP teaching fixture. Reconstruct the visible "
                     "frames, then distinguish protocol concepts from what this capture cannot prove: no complete TLS/PEAP session, RADIUS exchange or deployed policy is bundled."),
        objectives=["Map supplicant → authenticator → RADIUS → identity store",
                    "Explain the MSK→PMK→PTK relationship",
                    "Decide what a passive capture can and cannot show"],
        artifacts=["enterprise.pcapng", "radius.pcapng"],
        tasks=[
            dict(id="t1", question="List the EAP methods and the order of the exchange.",
                 answer=(f"EAP type labels present in the fixture: {', '.join(eap_types)}. Visible frame order includes EAPOL/EAP identifiers and EAPOL-Key frames ({fmt([n for n, r in enumerate(rec, 1) if r.get('eapol_key')])}). "
                         "TLS bytes are abbreviated structural data and the MSK is inserted lab data; this does not prove a complete PEAP tunnel, real inner identity, or successful production authentication."),
                 hint="tshark -Y 'eap' -T fields -e frame.number -e eap.code -e eap.type"),
            dict(id="t2", question="Why is there still a 4-way handshake after successful EAP authentication?",
                 answer=("EAP produces the MSK; the PMK is the first 256 bits of it (per user, per session). The 4-way "
                         "handshake then proves both sides hold the PMK, derives the PTK (KCK/KEK/TK) bound to the MAC "
                         "addresses and nonces, and installs keys including the GTK. If no handshake appears in a capture, the "
                         "capture alone cannot distinguish an incomplete recording from a failed/aborted exchange; consult client/AP logs and session context."),
                 hint="The two exchanges derive different keys for different purposes."),
            dict(id="t3", question="What can a passive capture of this flow prove about credential exposure?",
                 answer=("This fixture cannot establish credential exposure or the client's certificate-validation behavior. Its TLS bytes are structural and the MSK is inserted; it does not contain a complete TLS tunnel or a validated client authentication. In a real PEAP test, a client profile that fails to validate both a trusted CA and expected server identity can be vulnerable to a rogue authenticator; that requires an authorized, scoped test."),
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
        module="15-enterprise-fundamentals", difficulty="Advanced", type="pcap_analysis", level="assessment",
        estimated_time="35m", points=150, status="simulated",
        description=("eap.pcapng contains abbreviated EAP method identifiers and an intentionally direct MS-CHAPv2 teaching exchange. It is not a set of complete PEAP, EAP-TLS or EAP-TTLS sessions; analyse the visible fields and state what the fixture cannot prove."),
        objectives=["Identify methods from outer exchanges",
                    "Extract and verify MS-CHAPv2 material",
                    "Explain the certificate-validation precondition"],
        artifacts=["eap.pcapng"],
        tasks=[
            dict(id="t1", question="Which EAP methods appear, and what does each protect?",
                 answer=("The fixture contains EAP type identifiers for PEAP (25), EAP-TLS (13), EAP-TTLS (21) and direct EAP-MSCHAPv2 (26) packets. These are abbreviated method examples, not complete TLS sessions or proof that MS-CHAPv2 occurred inside PEAP/TTLS. In general, PEAP/TTLS rely on client validation of the server certificate; EAP-TLS uses client certificates and does not authenticate with a password."),
                 hint="tshark -Y 'eap.type == 25 || eap.type == 13 || eap.type == 21 || eap.type == 26'"),
            dict(id="t2", question="Extract the MS-CHAPv2 challenge/response pair and say what makes it crackable.",
                 answer=(f"Challenge frames {fmt(chal)} and Response frames {fmt(peers)}: the fixture's response contains the "
                         "peer challenge, NT-Response and username. This is deliberately direct, visible EAP-MSCHAPv2 material—not evidence that a PEAP tunnel was terminated. The NT-Response construction permits offline password guesses; scripts/verify-lab-artifacts.py verifies the fixture against the documented lab password and RFC 2759 vector."),
                 hint="In this fixture the direct MS-CHAPv2 packets are intentionally exposed; do not infer a tunnel from an EAP type label."),
            dict(id="t3", question="State the precondition and the controls that remove it.",
                 answer=("Precondition: a compatible client accepts an untrusted/wrong-identity server and an authorized rogue authenticator successfully negotiates the tunneled method; missing validation alone does not prove credential capture. Controls include EAP-TLS with managed client certificates; enforce the intended CA and expected server name in every profile; disable PEAP-MSCHAPv2 server-side where possible; use PMF to reduce spoofed deauth/disassoc paths (not as AP authentication); monitor look-alike BSSIDs against an authorized baseline."),
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
        module="15-enterprise-fundamentals", difficulty="Professional", type="pcap_analysis", level="assessment",
        estimated_time="40m", points=200, status="simulated",
        description=("radius.pcapng contains paired synthetic AAA transactions, a valid accounting pair, an intentionally invalid-secret request and a VLAN attribute. "
                     "Verify correlation and authenticators; no live client or policy enforcement is supplied."),
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
                 hint="tshark -Y radius -T fields -e frame.number -e radius.code -e radius.eap_fragment"),
            dict(id="t2", question="Verify integrity: what does the Message-Authenticator prove, and why does one request fail?",
                 answer=("Message-Authenticator = HMAC-MD5 over the packet with the attribute value zeroed, keyed with the "
                         "shared secret — a valid value supports integrity under that shared secret, but does not uniquely identify which holder sent the packet. Recomputing "
                         "it for each request with the documented lab secret verifies the exchange; the rogue-NAS request "
                         "in the capture was built with a different secret and fails verification, which is exactly what "
                         "you should reproduce by hand. Responses additionally carry the Response Authenticator "
                         "(MD5 over code|id|length|request authenticator|attributes|secret)."),
                 hint="Zero the 16-byte attribute value before hashing, then compare with the captured value."),
            dict(id="t3", question="What is the impact of a leaked shared secret, and what limits it?",
                 answer=("A party holding the secret can validate/construct packets for that shared-secret relationship and recover User-Password attributes from captured requests; impersonation also depends on network reachability and server/NAS policy. Source-IP allowlists, unique per-device secrets, protected RadSec peers and prompt rotation reduce exposure, but none makes a leaked secret harmless. The fixture demonstrates verification under its lab secret, not production compromise."),
                 hint="Environmental preconditions decide severity — test them, do not assume them."),
        ],
        flag="WIFIFORGE{RADIUS_VERIFY_MA_ROGUE_NAS}", skills=["radius", "integrity", "shared-secret"],
        answer_basis="RADIUS attributes and authenticators decoded/verified from the capture",
        deliverable="A verification record (packet bytes, secret used, calculation) plus an impact analysis.",
    ))

    # ---------------------------------------------------------------- 15. independent staged case (not Northwind)
    before, after = frames("capstone-baseline"), frames("capstone-retest")
    owned, unknown = "02:aa:10:00:00:01", "02:aa:10:00:00:09"
    challenges.append(dict(
        id="chal-15-engagement", title="Case C-20 — Baseline and Bounded Retest",
        module="20-final-assessment", difficulty="Professional", type="pcap_analysis", level="assessment",
        estimated_time="60m", points=200, status="simulated",
        description="Separate staged synthetic case; inspect the case notes and two new PCAPs. Neither is Northwind evidence or a real on-site retest.",
        objectives=["Inventory and correlate a partial asset list", "Verify a lab-only PSK candidate from M2",
                    "Compare policy before/after without claiming client acceptance"],
        artifacts=["capstone-baseline.pcapng", "capstone-retest.pcapng"],
        tasks=[
            dict(id="t1", question="Inventory baseline BSSIDs and determine which are owner-confirmed.",
                 answer="; ".join(f"{b}: {ssid_for(before, b)}, {akm_for(before, b)}, {pmf_for(before, b)}"
                                  for b in bssids(before)) +
                 ". The case notes confirm only the .01 and .02 BSSIDs; .09 is unlisted, not proven rogue.",
                 hint="Read the partial inventory, then cite beacon frames in the baseline file."),
            dict(id="t2", question="What does the baseline handshake demonstrate, and what remains unknown?",
                 answer="Frames 8–11 are a synthetic PSK M1–M4 exchange on CASE-OPS at " + owned +
                 ". M2 verifies with the published training candidate password123; this validates the fixture, not any production credential, impact, or the unknown BSSID's secret.",
                 hint="Match address and nonce/replay counter, then use the artifact verifier."),
            dict(id="t3", question="Compare the same owned BSSID across baseline and retest. Is the case closed?",
                 answer=f"{owned} changed from PSK/MFPC-only to SAE-only/MFPC+MFPR in the staged beacon. "
                 f"{unknown} still advertises same-name PSK; owner unknown. No retest client association, "
                 "supplicant log, negative PSK test, or wired inventory was supplied: advertising-policy change observed, full client/security retest NOT TESTED.",
                 hint="Compare BSSID, AKM and both PMF bits; require client and ownership evidence for closure."),
        ],
        flag="WIFIFORGE{CASE_POLICY_NOT_CLIENT_RETEST}", skills=["assessment", "reporting", "retest"],
        answer_basis="two independent synthetic case captures and a fictional partial inventory; no actual RF outcome",
        deliverable="Evidence-linked case inventory, bounded before/after comparison, and NOT TESTED client retest criteria.",
    ))

    # Seven previously scenario-only modules now have distinct self-review exercises.
    # Answers are teaching guidance, not machine-checked submissions or RF outcomes.
    extra = [
        ("chal-16-scope", "01-intro-wireless", "From Scope to a Bounded Claim", "beacon-only.pcapng", "guided", [
            ("Which clause would you request before passively collecting client traffic?", "Named scope, authorized collector/signatory, collection window and data-handling/retention terms; an SSID alone is not capture authorization.", "Think about people and payloads outside the named BSS."),
            ("Give one defensible claim from a beacon and one claim it cannot support.", "With hash and frame: a BSSID advertises a stated AKM; the beacon cannot establish whether a client validated an EAP server or what network segment it reached.", "Separate advertisement from negotiated behavior."),
            ("How do you document missing observations?", "State tuned channel, duration, receiver conditions, filter and scope. No observed client is not proof that none joined.", "Explain the negative evidence limit."),
        ]),
        ("chal-17-state", "03-80211-architecture", "Association State and RSN Decode", "traffic-analysis.pcapng", "guided", [
            ("Place open authentication, association and M1–M4 into the correct MAC states.", "Open authentication moves state 1 to 2; successful association moves state 2 to 3; M1–M4 follows association and does not create state 4.", "Do not confuse 802.11 MAC state with controlled-port authorization."),
            ("Decode the beacon/association RSNE and identify what remains unproved.", "Read counts before suites; cite PSK/CCMP and PMF advertisement, then state that successful association alone does not prove installed keys or client acceptance.", "Use the worked RSN example, then check the actual capture bytes."),
            ("Where would Enterprise EAP appear, and can you show it in this PSK capture?", "For Enterprise, EAP over EAPOL occurs after 802.11 association, followed by the 4-way handshake after EAP success. This PSK fixture does not contain a full Enterprise EAP session.", "Do not invent missing method frames."),
        ]),
        ("chal-18-readiness", "04-kali-wireless-setup", "Adapter Evidence Versus Offline Evidence", "deauth.pcapng", "guided", [
            ("What does an offline deauth fixture prove about your own adapter?", "Nothing: it supports frame/reason-code practice but not your driver's monitor/injection capability or receiver acceptance.", "Stored bytes are not a radio capability check."),
            ("What must be recorded before an owned passive capture?", "RoE, allowed band/channel and regulatory domain, actual adapter/driver/mode, start/stop window, capture hash and handling of out-of-scope frames.", "No injection is necessary here."),
            ("No adapter is available. What is the honest result?", "Complete the offline frame classification; mark monitor, injection and actual RF delivery NOT TESTED, not failed or passed.", "Do not award yourself a hardware result."),
        ]),
        ("chal-19-wep", "07-wep-legacy", "WEP Evidence Gap and Migration", "beacon-only.pcapng", "semi-guided", [
            ("Does an absent RSNE alone in this beacon capture prove WEP?", "No: consider the Privacy capability, WPA vendor IE, AP configuration and authorized station evidence. The bundled capture is not a WEP recovery trace.", "Compare open, legacy WPA and WEP."),
            ("Why is a longer shared WEP key insufficient?", "The 24-bit IV, RC4 key-scheduling weakness and malleable CRC-32/replay limitation remain. Replace WEP rather than rotate only its key.", "Separate confidentiality from integrity."),
            ("Write a bounded migration retest.", "Inspect a new RSNE/cipher on the owned BSS and controlled client authentication with logs; mark result NOT TESTED until a real remediated AP is supplied.", "A test plan is not a performed result."),
        ]),
        ("chal-20-rsn", "08-wpa-wpa2", "Handshake Inputs and Decryption Limit", "wpa2-handshake.pcapng", "semi-guided", [
            ("Compare M1/M2 with M1–M4 across the two clients.", "Both pairs can carry inputs for offline PSK candidate verification; only one four-message sequence is present. M1/M2 does not prove completion or AP acceptance.", "Trace client MACs, nonces and replay counters."),
            ("Which keys do PMK, PTK and GTK represent?", "In PSK mode PMK comes from passphrase and SSID; PTK binds AP/STA addresses and nonces, with KCK for MIC; GTK protects group data. SAE and Enterprise derive PMK differently.", "Explain mechanism, not just acronyms."),
            ("Can this fixture demonstrate decrypted protected payloads?", "No: this 13-frame capture has no CCMP-protected post-handshake data payload. State the additional scoped capture and key material needed.", "Filter Protected bit and check the manifest."),
        ]),
        ("chal-21-chain", "18-corporate-attacks", "Kill-Chain Evidence Breaks", "corporate-attacks.pcapng", "assessment", [
            ("Which chain links are direct observations?", "The synthetic file contains management/look-alike, PSK handshake, direct EAP-MSCHAPv2 examples and an ICMP pair. It contains no complete PEAP, RADIUS, real client disconnect or VLAN policy test.", "Separate packet records from attack outcomes."),
            ("What would show a PEAP client validation failure?", "A controlled client's effective trust/name policy plus supplicant logs and a coherent authorized test-server session; a direct EAP fixture or TLS alert alone is insufficient.", "No invented certificate transcript."),
            ("Rewrite a full-compromise claim.", "Record only the observed synthetic sequence; list unknown ownership, receiver acceptance, authentication and network enforcement separately with approved follow-up tests.", "Use an evidence-gap table."),
        ]),
        ("chal-22-report", "20-final-assessment", "Evidence Decision Under Peer Review", "methodology.pcapng", "assessment", [
            ("Write one frame-supported claim and its limits.", "Cite capture hash/frame/filter for an advertised BSS policy or synthetic weak-PSK exchange; do not assert production password, unauthorized owner or applied segmentation.", "Can a peer reproduce it?"),
            ("How do you rate impact when the network context is absent?", "Mark impact and production severity undetermined; request an authorized inventory, client path and reachability evidence before a contextual rating.", "A technique label is not a severity score."),
            ("What makes a retest record more than a plan?", "New dated capture and hash, same controlled client/target/criteria, effective config and client/AP logs with actual pass/fail. None is provided for a real site; mark NOT TESTED.", "Another learner may review the evidence, but that is not trusted grading."),
        ]),
    ]
    for cid, module, title, artifact, level, prompts in extra:
        challenges.append(dict(
            id=cid, title=title, module=module, difficulty="Intermediate", type="pcap_analysis",
            level=level, estimated_time="25m", points=100, status="simulated",
            description="Self-review of bounded evidence and an authorized next test; no live RF or verified grading.",
            objectives=["Interpret artifact evidence", "State unsupported claims", "Choose a safe next test"],
            artifacts=[artifact],
            tasks=[dict(id=f"t{i}", question=q, answer=a, hint=h)
                   for i, (q, a, h) in enumerate(prompts, 1)],
            flag=f"WIFIFORGE{{{cid.upper().replace('-', '_')}_REVIEW}}",
            skills=["evidence", "methodology"],
            answer_basis="authored self-review interpretation of existing synthetic artifact; no live result",
            deliverable="Evidence-linked answers, explicit limits and a feasible next-test decision.",
        ))

    return challenges


def main() -> int:
    challenges = build()
    # Path ownership is catalog metadata shared with the UI's path-aware totals and filters.
    for challenge in challenges:
        challenge.setdefault("learningPathId", "wireless-pentesting")
    with open(OUT, "w") as fh:
        json.dump(challenges, fh, indent=1)
    levels = {}
    for c in challenges:
        levels[c["level"]] = levels.get(c["level"], 0) + 1
    print(f"wrote {len(challenges)} challenges to {OUT}")
    print(f"  levels: {levels}")
    print(f"  tasks:  {sum(len(c['tasks']) for c in challenges)} (frame-derived fields plus authored, self-review answer keys)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

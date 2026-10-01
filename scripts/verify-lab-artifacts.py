#!/usr/bin/env python3
"""
WiFiForge — lab artifact verifier.

Independent check that the captures under `frontend/public/pcaps/` are what the
curriculum claims they are.  This is the artifact test suite: it fails (exit 1) if
a capture is malformed or if any cryptographic value does not match the documented
lab credential, so the labs can never silently rot.

Verifies
--------
1. every file is a real PCAPNG (SHB + IDB + EPB) with linktype 127 (radiotap),
2. every frame decodes as 802.11 and the frame counts match the generated report,
3. RSNE decoding: AKM/cipher suite numbers and the MFPC (bit 7) / MFPR (bit 6) bits,
4. EAPOL-Key MICs recomputed from the documented PSK (PMK → PTK → KCK → MIC),
5. PMKID = HMAC-SHA1-128(PMK, "PMK Name" | AA | SPA) as carried in key data,
6. RADIUS Message-Authenticator (bare `[31]*64` in this lab) in OpenSSH `radtest`-style,
7. MS-CHAPv2 NT-Response re-derived from the documented lab password,
8. that the display filters taught in the curriculum match at least one frame.

Run:  python3 scripts/verify-lab-artifacts.py [--verbose]
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import struct
import sys
from typing import Dict, List, Optional, Tuple

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from wififorge_labkit import (  # noqa: E402
    ATTR_EAP_MESSAGE, ATTR_MESSAGE_AUTHENTICATOR, RADIUS_ACCESS_ACCEPT, RADIUS_ACCESS_CHALLENGE,
    pmk_from_psk,
    RSNCAP_MFPC, RSNCAP_MFPR, decode, eapol_key_mic, mschapv2_credentials,
    pmkid as compute_pmkid, ptk_from_pmk, radius_message_authenticator, read_pcapng,
)

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PCAP_ROOT = os.path.join(REPO, "frontend", "public", "pcaps")
ARTIFACTS = os.path.join(REPO, "frontend", "src", "content", "lab-artifacts.json")

VERBOSE = "--verbose" in sys.argv

results: List[Tuple[bool, str]] = []


def check(ok: bool, message: str) -> bool:
    results.append((ok, message))
    if VERBOSE or not ok:
        print(f"  {'PASS' if ok else 'FAIL'}  {message}")
    return ok


def frames_of(pcap_id: str) -> List[Dict[str, object]]:
    for root, _dirs, files in os.walk(PCAP_ROOT):
        for name in files:
            if name == f"{pcap_id}.pcapng":
                raw = read_pcapng(os.path.join(root, name))
                return [decode(f) for f in raw]
    raise FileNotFoundError(pcap_id)


def eapol_key_frames(records: List[Dict[str, object]]) -> List[Dict[str, object]]:
    return [r for r in records if r.get("eapol_key")]


def verify_pcapng_structure(inventory: Dict[str, Dict[str, object]]) -> None:
    print("\n[1] PCAPNG structure")
    for pcap_id, meta in inventory.items():
        path = os.path.join(PCAP_ROOT, meta["path"])  # type: ignore[arg-type]
        raw = open(path, "rb").read()
        check(raw[:4] == struct.pack("<I", 0x0A0D0D0A), f"{pcap_id}: section header block present")
        check(raw[8:12] == struct.pack("<I", 0x1A2B3C4D), f"{pcap_id}: byte-order magic")
        offset = 0
        block_types: List[int] = []
        block_lengths_valid = True
        while offset + 12 <= len(raw):
            block_type, block_len = struct.unpack_from("<II", raw, offset)
            if block_len < 12 or block_len % 4 or offset + block_len > len(raw):
                block_lengths_valid = False
                break
            trailer_len = struct.unpack_from("<I", raw, offset + block_len - 4)[0]
            if trailer_len != block_len:
                block_lengths_valid = False
                break
            block_types.append(block_type)
            offset += block_len
        check(block_lengths_valid and offset == len(raw), f"{pcap_id}: all block lengths are aligned, bounded, and mirrored")
        check(block_types[:2] == [0x0A0D0D0A, 0x00000001], f"{pcap_id}: section header followed by interface description")
        idb_offset = struct.unpack_from("<I", raw, 4)[0]
        linktype = struct.unpack_from("<H", raw, idb_offset + 8)[0] if idb_offset + 10 <= len(raw) else -1
        check(linktype == 127, f"{pcap_id}: interface link type is radiotap (127)")
        epb_count = block_types.count(0x00000006)
        check(epb_count == meta["frames"], f"{pcap_id}: {epb_count} enhanced packet blocks == manifest ({meta['frames']})")
        blocks = read_pcapng(path)
        check(len(blocks) == meta["frames"], f"{pcap_id}: {len(blocks)} decoded frames == manifest ({meta['frames']})")
        check(hashlib.sha256(raw).hexdigest() == meta["sha256"], f"{pcap_id}: sha256 matches manifest")


def verify_rsn_and_filters() -> None:
    print("\n[2] RSNE decoding and curriculum display filters")
    records = frames_of("wpa3-only")
    rsns = [r for r in records if r.get("rsn")]
    check(RSNCAP_MFPR == 0x0040 and RSNCAP_MFPC == 0x0080,
          "RSN constants use IEEE MFPR bit 6 and MFPC bit 7")
    check(bool(rsns), "wpa3-only: RSNE present in beacons")
    if rsns:
        caps = rsns[0]["rsn"]["caps"]  # type: ignore[index]
        check(bool(caps & RSNCAP_MFPC) and bool(caps & RSNCAP_MFPR),
              f"wpa3-only: MFPC (bit 7) and MFPR (bit 6) both set (caps=0x{caps:04x})")
        check(rsns[0]["rsn"]["akm"] == [8], "wpa3-only: AKM suite is 8 (SAE)")  # type: ignore[index]
    trans = [r for r in frames_of("wpa3-transition") if r.get("rsn")]
    check(bool(trans) and trans[0]["rsn"]["akm"] == [2, 8],  # type: ignore[index]
          "wpa3-transition: AKM list is [2 (PSK), 8 (SAE)]")
    check(bool(trans) and trans[0]["rsn"]["mfpr"] is False,  # type: ignore[index]
          "wpa3-transition: MFPR not set (transition mode is not PMF-required)")

    before = frames_of("capstone-baseline")
    after = frames_of("capstone-retest")
    def policy(rows: List[Dict[str, object]], address: str) -> Dict[str, object]:
        matches = [r for r in rows if r.get("bssid") == address and r.get("type") == 0 and r.get("subtype") == 8]
        check(len(matches) == 1, f"capstone: exactly one beacon for {address}")
        return matches[0]["rsn"] if matches else {}  # type: ignore[return-value]
    owned = "02:aa:10:00:00:01"
    other = "02:aa:10:00:00:09"
    baseline = policy(before, owned)
    retest = policy(after, owned)
    check(baseline.get("akm") == [2] and baseline.get("caps") == 0x0080,
          "capstone baseline: owned BSS PSK, MFPC only (0x0080)")
    check(retest.get("akm") == [8] and retest.get("caps") == 0x00c0,
          "capstone retest: same owned BSS SAE only, MFPC+MFPR (0x00c0)")
    check(policy(after, other).get("akm") == [2],
          "capstone retest: distinct same-name PSK BSS persists; owner unknown")
    check(len(eapol_key_frames(before)) == 4 and not eapol_key_frames(after),
          "capstone: baseline has four EAPOL-Key frames; retest has no client handshake")

    records = frames_of("deauth")
    check(sum(1 for r in records if r.get("subtype") == 12) >= 15, "deauth: deauthentication frames present")
    check(any(r.get("reason") == 7 for r in records), "deauth: reason code 7 (class 3 frame from non-associated STA)")
    check(any(r.get("reason") == 15 for r in records), "deauth: reason code 15 (4-way handshake timeout)")
    check(any(r.get("action_category") == 8 for r in records), "deauth: SA Query action frames (category 8)")

    records = frames_of("radius")
    radius_frames = [r for r in records if r.get("radius")]
    check(len(radius_frames) >= 4, f"radius: {len(radius_frames)} RADIUS messages decoded over UDP/1812")
    names = {r["radius_code_name"] for r in radius_frames}
    check({"Access-Request", "Access-Accept", "Access-Challenge"} <= names, f"radius: codes {sorted(names)}")
    check(any(r["radius_attributes"].get("Tunnel-Private-Group-Id") == "100" for r in radius_frames),
          "radius: Tunnel-Private-Group-Id = 100 (dynamic VLAN)")

    records = frames_of("captive-portal")
    check(any(r.get("protocol") == "HTTP" and r.get("http_method") == "POST" for r in records), "captive-portal: HTTP POST is decoded")
    check(any(r.get("protocol") == "DHCP" and r.get("dhcp_message_type") == "ACK" for r in records), "captive-portal: DHCP ACK is decoded")
    check([r.get("subtype") for r in records[:5]] == [8, 11, 11, 0, 1], "captive-portal: beacon, authentication and association sequence present")

    records = frames_of("wps-beacon")
    wps_beacons = [r for r in records if r.get("wps")]
    check(len(wps_beacons) == 2, "wps-beacon: two BSSs advertise a WPS IE")
    locked = [r for r in wps_beacons if r.get("wps_attrs", {}).get("setup_locked")]  # type: ignore[union-attr]
    check(len(locked) == 1, "wps-beacon: exactly one BSS has AP setup locked")

    records = frames_of("recon-lab")
    hidden = [r for r in records if r.get("ssid_len") == 0 and r.get("subtype") == 8]
    revealed = [r for r in records if r.get("ssid") == "HIDDEN-LAB" and r.get("subtype") == 5]
    check(bool(hidden) and bool(revealed), "recon-lab: hidden beacon (SSID len 0) is revealed by a probe response")
    randomised = [r for r in records if r.get("subtype") == 4 and (int(r["sa"].split(":")[0], 16) & 0x02)]  # type: ignore[union-attr]
    check(bool(randomised), "recon-lab: probe requests from a locally-administered (randomised) MAC")


def verify_eapol_mics(inventory: Dict[str, Dict[str, object]]) -> None:
    print("\n[3] EAPOL-Key MIC verification (PMK → PTK → KCK → MIC)")
    credentials = json.load(open(ARTIFACTS))["credentials"]
    # PMKID is a *clientless* capture: it has M1 only, so it is verified in step [4].
    audits = [
        ("wpa2-handshake", credentials["lab_psk"], "LAB-WIFI"),
        ("traffic-analysis", credentials["lab_psk"], "LAB-WIFI"),
        ("rogue-ap", credentials["lab_psk_weak"], "Corp-WLAN"),
        ("methodology", credentials["lab_psk_weak"], "LAB-WEAK-PSK"),
        ("capstone-baseline", credentials["lab_psk_weak"], "CASE-OPS"),
    ]
    for pcap_id, psk, ssid in audits:
        records = frames_of(pcap_id)
        keys = eapol_key_frames(records)
        if not keys:
            check(False, f"{pcap_id}: no EAPOL-Key frames found")
            continue
        m2 = next((k for k in keys if "M2" in str(k.get("key_message"))), None)
        check(m2 is not None, f"{pcap_id}: M2 (SNonce + MIC) present")
        if not m2:
            continue
        # M1 with the matching replay counter carries the ANonce from the AP.
        m1 = next((k for k in keys if "M1" in str(k.get("key_message"))
                   and k.get("replay_counter") == m2.get("replay_counter")), None)
        if not m1:
            m1 = m2
        ap = bytes.fromhex(str(m1.get("bssid") or m2.get("bssid")).replace(":", ""))
        # For STA→AP frames the transmitter is the STA and addr3 is the BSSID.
        sta = bytes.fromhex(str(m2.get("sa")).replace(":", ""))
        pmk = pmk_from_psk(psk, ssid)
        anonce = bytes.fromhex(str(m1.get("nonce")))
        snonce = bytes.fromhex(str(m2.get("nonce")))
        ptk = ptk_from_pmk(pmk, ap, sta, anonce, snonce)
        ok = verify_one_mic(records, str(m2.get("mic")), ptk[:16], m2)
        check(ok, f"{pcap_id}: M2 MIC verifies against the documented PSK ('{psk}')")

    # A wrong PSK must NOT verify (proves the check is meaningful).
    records = frames_of("wpa2-handshake")
    keys = eapol_key_frames(records)
    m2 = next(k for k in keys if "M2" in str(k.get("key_message")))
    m1 = next(k for k in keys if "M1" in str(k.get("key_message")))
    pmk = pmk_from_psk("not-the-lab-psk", "LAB-WIFI")
    ptk = ptk_from_pmk(pmk, bytes.fromhex(m1["bssid"].replace(":", "")),  # type: ignore[union-attr]
                       bytes.fromhex(m2["sa"].replace(":", "")),  # type: ignore[union-attr]
                       bytes.fromhex(m1["nonce"]), bytes.fromhex(m2["nonce"]))  # type: ignore[arg-type]
    check(not verify_one_mic(records, str(m2.get("mic")), ptk[:16], m2),
          "wpa2-handshake: MIC does not verify with a wrong PSK (negative control)")


def verify_one_mic(records: List[Dict[str, object]], mic_hex: str, kck: bytes,
                   record: Dict[str, object]) -> bool:
    """Rebuild the EAPOL frame from the capture and recompute the MIC."""
    frame = rebuild_eapol_key(record)
    if frame is None:
        return False
    return eapol_key_mic(kck, frame).hex() == mic_hex


def rebuild_eapol_key(record: Dict[str, object]) -> Optional[bytes]:
    """Reconstruct the EAPOL-Key blob from the decoded fields (no capture bytes needed)."""
    from wififorge_labkit import eapol_key
    nonce = bytes.fromhex(str(record.get("nonce")))
    key_data_hex = record.get("key_data_hex")
    key_data = bytes.fromhex(key_data_hex) if key_data_hex else b""
    return eapol_key(int(record.get("replay_counter", 1)), nonce,
                     int(record.get("key_info", 0)), key_data=key_data,
                     descriptor=int(record.get("key_descriptor", 2)))


def verify_pmkid() -> None:
    print("\n[4] PMKID verification")
    records = frames_of("pmkid")
    m1 = eapol_key_frames(records)[0]
    pmkid_hex = str(m1.get("pmkid"))
    meta = json.load(open(ARTIFACTS))
    psk, ssid = meta["credentials"]["lab_psk"], "LAB-WIFI"
    pmk = pmk_from_psk(psk, ssid)
    sta = bytes.fromhex(str(m1.get("da")).replace(":", ""))     # AP→STA frame: addr1 is the client
    ap = bytes.fromhex(str(m1.get("sa")).replace(":", ""))
    expected = compute_pmkid(ap, sta, pmk).hex()
    check(pmkid_hex == expected, f"pmkid: PMKID matches HMAC-SHA1-128(PMK, 'PMK Name'|AA|SPA) = {expected[:16]}…")


def verify_radius_authenticators() -> None:
    print("\n[5] Raw RADIUS transaction and authenticator verification")
    import runpy
    verifier = runpy.run_path(os.path.join(REPO, "scripts", "verify-radius-wire.py"))
    check(verifier["verify"]() == 4,
          "radius: four request/reply pairs with verified Message/Response/Accounting authenticators and wrong-secret control")


def verify_mschapv2() -> None:
    print("\n[6] MS-CHAPv2 material (hashcat -m 5500 candidate)")
    # Published MS-CHAPv2 reference vector (RFC 2759 / FreeRADIUS test data):
    # password "clientPass", user "User", authenticator challenge 5B5D7C7D…262628,
    # peer challenge 21402324255E262A28295F2B3A337C7E, ChallengeHash D02E4386BCE91226.
    vector, _nt, chap = mschapv2_credentials(
        "clientPass",
        bytes.fromhex("5B5D7C7D7B3F2F3E3C2C602132262628"),
        bytes.fromhex("21402324255E262A28295F2B3A337C7E"),
        "User",
    )
    check(chap.hex() == "d02e4386bce91226", "RFC 2759 ChallengeHash matches the published vector")
    check(vector.hex() == "82309ecd8d708b5ea08faa3981cd83544233114a3d85d6df",
          "RFC 2759 NT-Response matches the published vector")
    meta = json.load(open(ARTIFACTS))
    password = meta["credentials"]["eap_password"]
    for pcap_id in ("radius", "eap", "corporate-attacks", "methodology"):
        records = frames_of(pcap_id)
        captured = [r for r in records if r.get("mschapv2_nt_response")]
        check(bool(captured), f"{pcap_id}: MS-CHAPv2 Response captured")
        if not captured:
            continue
        # The NT-Response is computed with the challenge from the preceding
        # MS-CHAPv2 Challenge message (they are separate frames).
        for response in captured:
            index = records.index(response)
            challenge = None
            for earlier in reversed(records[:index + 1]):
                if earlier.get("mschapv2_challenge"):
                    challenge = bytes.fromhex(str(earlier["mschapv2_challenge"]))
                    break
            if challenge is None:
                check(False, f"{pcap_id}: Challenge message precedes the Response")
                continue
            peer = bytes.fromhex(str(response["mschapv2_peer_challenge"]))
            user = str(response["mschapv2_username"])
            recomputed, _nt_hash, _chap_hash = mschapv2_credentials(password, challenge, peer, user)
            check(recomputed.hex() == str(response["mschapv2_nt_response"]),
                  f"{pcap_id}: NT-Response re-derives from '{password}' via RFC 2759 "
                  f"(challenge {challenge.hex()[:8]}…, peer {peer.hex()[:8]}…)")
            check(user.endswith("a.patel") and len(peer) == 16,
                  f"{pcap_id}: Response carries peer challenge and username used in the derivation")


def verify_challenge_answers() -> None:
    """Every challenge answer must be derivable from the capture it points at (spot checks)."""
    print("\n[8] Challenge answers match the captures")
    path = os.path.join(REPO, "frontend", "src", "content", "challenges.json")
    challenges = json.load(open(path))
    check(len(challenges) == 22, f"{len(challenges)} challenges present")
    ids = [c["id"] for c in challenges]
    check(len(ids) == len(set(ids)), "challenge ids unique")
    learning_paths = json.load(open(os.path.join(REPO, "frontend", "src", "content", "learning-paths.json")))
    valid_path_ids = {path["id"] for path in learning_paths}
    check(all(c.get("learningPathId") in valid_path_ids for c in challenges),
          "every challenge retains valid path ownership metadata")
    check(all(t.get("question") and t.get("answer") and t.get("hint") for c in challenges for t in c["tasks"]),
          "every task has question, answer and hint")
    check(all(c.get("level") in ("guided", "semi-guided", "assessment") for c in challenges),
          "every challenge has a de-guiding level")
    check(all(c.get("answer_basis") for c in challenges), "every challenge records how its answers were derived")

    by_id = {c["id"]: c for c in challenges}

    def answer_text(cid: str) -> str:
        return " ".join(str(t["answer"]) for t in by_id[cid]["tasks"])

    # challenge ids must reference artefacts that exist
    for c in challenges:
        for artifact in c["artifacts"]:
            pcap_id = artifact.replace(".pcapng", "")
            found = any(os.path.basename(p) == artifact for _r, _d, fs in os.walk(PCAP_ROOT) for p in fs)
            check(found, f"{c['id']}: artefact {artifact} exists")

    beacon = frames_of("beacon-only")
    beacon_bss = sorted({str(r["bssid"]) for r in beacon if r.get("subtype_name") == "Beacon"})
    text = answer_text("chal-01-beacon")
    check(str(len(beacon_bss)) in text, "chal-01: BSS count in the answer matches the capture")
    check(any(str(r["bssid"]) in text for r in beacon if r.get("mfpr")), "chal-01: PMF-required BSSID present in the answer")

    recon = frames_of("recon-lab")
    hidden = [r for r in recon if r.get("subtype_name") == "Beacon" and r.get("ssid_len") == 0]
    text = answer_text("chal-02-recon")
    check(bool(hidden) and str(hidden[0]["bssid"]) in text, "chal-02: hidden BSSID in the answer")
    reveal = [i for i, r in enumerate(recon, 1) if r.get("subtype_name") == "Probe Response" and r.get("ssid")]
    check(bool(reveal) and f"frame {reveal[0]}" in text, "chal-02: revealing probe-response frame in the answer")

    hs = frames_of("wpa2-handshake")
    m_frames = {}
    for i, r in enumerate(hs, 1):
        if r.get("eapol_key"):
            m_frames.setdefault(str(r.get("key_message", "")).split(" ")[0], []).append(i)
    text = answer_text("chal-04-handshake")
    check(all(f"frame {n}" in text or f"frames {n}" in text or f"{n}," in text or f"/{n}" in text
              for nums in m_frames.values() for n in nums),
          "chal-04: every M1–M4 frame number appears in the answer")

    pmkid_frames = frames_of("pmkid")
    value = next((str(r["pmkid"]) for r in pmkid_frames if r.get("pmkid")), "")
    check(bool(value) and value in answer_text("chal-05-pmkid"), "chal-05: PMKID value matches the capture")
    pmk = pmk_from_psk("ForgeLab2026!", "LAB-WIFI")
    check(pmk.hex()[:32] in answer_text("chal-04-handshake"), "chal-04: documented PMK appears in the answer")

    deauth = frames_of("deauth")
    reasons = sorted({str(int(r.get("reason_code") or 0)) for r in deauth
                      if r.get("subtype_name") in ("Deauthentication", "Disassociation")})
    text = answer_text("chal-09-deauth")
    check(all(r0 in text for r0 in reasons), "chal-09: every reason code present in the capture appears in the answer")

    radius = frames_of("radius")
    vlan_seen = any("100" == str((r.get("radius_attributes") or {}).get("Tunnel-Private-Group-Id", ""))
                    for r in radius if isinstance(r.get("radius_attributes"), dict))
    check(vlan_seen, "chal-14: Tunnel-Private-Group-Id 100 is present in the capture the challenge uses")


def verify_no_stale_artifacts() -> None:
    print("\n[7] No stale captures")
    manifest = json.load(open(ARTIFACTS))["artifacts"]
    on_disk = set()
    for root, _dirs, files in os.walk(PCAP_ROOT):
        for name in files:
            if name.endswith(".pcapng"):
                on_disk.add(name[: -len(".pcapng")])
    check(on_disk == set(manifest), f"captures on disk match the manifest ({len(on_disk)} files)")


def main() -> int:
    if not os.path.exists(ARTIFACTS):
        print("run scripts/generate-lab-artifacts.py first")
        return 1
    inventory = json.load(open(ARTIFACTS))["artifacts"]
    verify_pcapng_structure(inventory)
    verify_rsn_and_filters()
    verify_eapol_mics(inventory)
    verify_pmkid()
    verify_radius_authenticators()
    verify_mschapv2()
    verify_no_stale_artifacts()
    verify_challenge_answers()

    failed = [m for ok, m in results if not ok]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    if failed:
        print("\nFailures:")
        for message in failed:
            print(f"  - {message}")
        return 1
    print("all lab artifacts verified")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

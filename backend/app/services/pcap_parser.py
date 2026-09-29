"""
SecCraft — capture decoding service.

Order of preference, with no synthesised fallback:
  1. ``tshark`` if it is installed (most faithful dissection),
  2. ``scapy`` if it is installed,
  3. the offline dataset in ``frontend/public/lab-data/`` — decoded from the real captures by
     ``scripts/wififorge_labkit.py`` and asserted by ``scripts/verify-lab-artifacts.py``.

If none of the three can produce frames, the response says so. Earlier revisions returned invented
frames ("mock") here, which made an empty result look like a successful analysis; that is exactly what
this module must never do again.
"""

import json
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

# Try scapy import for fallback
try:
    from scapy.all import rdpcap, Dot11, Dot11Beacon, Dot11ProbeReq, Dot11ProbeResp, Dot11Auth, Dot11AssoReq, Dot11AssoResp, EAPOL
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False

def tshark_available() -> bool:
    return shutil.which("tshark") is not None

def parse_with_tshark(pcap_path: Path, display_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Parse using tshark -T json"""
    cmd = [
        "tshark",
        "-r", str(pcap_path),
        "-T", "json",
        "-e", "frame.number",
        "-e", "wlan.fc.type",
        "-e", "wlan.fc.type_subtype",
        "-e", "wlan.ssid",
        "-e", "wlan.bssid",
        "-e", "wlan.sa",
        "-e", "wlan.da",
        "-e", "wlan.ds.current_channel",
        "-e", "wlan.fixed.beacon",
        "-e", "eapol",
    ]
    if display_filter:
        cmd.extend(["-Y", display_filter])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode != 0:
            return []
        data = json.loads(result.stdout)
        frames = []
        for pkt in data:
            layers = pkt.get("_source", {}).get("layers", {})

            def get_first(key):
                v = layers.get(key, [])
                if isinstance(v, list) and len(v) > 0:
                    return v[0]
                return v if v else None

            frames.append({
                "number": get_first("frame.number"),
                "type": get_first("wlan.fc.type"),
                "subtype": get_first("wlan.fc.type_subtype"),
                "ssid": get_first("wlan.ssid"),
                "bssid": get_first("wlan.bssid"),
                "sa": get_first("wlan.sa"),
                "da": get_first("wlan.da"),
                "channel": get_first("wlan.ds.current_channel"),
                "eapol": bool(layers.get("eapol")),
                "raw": pkt
            })
        return frames
    except Exception as e:
        print(f"[pcap_parser] tshark failed: {e}")
        return []

def parse_with_scapy(pcap_path: Path, display_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    """Parse using Scapy — works without tshark, supports deauth/rogue/captive"""
    if not SCAPY_AVAILABLE:
        return []

    try:
        packets = rdpcap(str(pcap_path))
        frames = []
        for idx, pkt in enumerate(packets, 1):
            if not pkt.haslayer(Dot11):
                continue
            dot11 = pkt[Dot11]

            # Subtype name including Phase E deauth/disassoc
            if dot11.type == 0:
                if dot11.subtype == 8:
                    subtype_name = "Beacon"
                elif dot11.subtype == 4:
                    subtype_name = "Probe Request"
                elif dot11.subtype == 5:
                    subtype_name = "Probe Response"
                elif dot11.subtype == 11:
                    subtype_name = "Authentication"
                elif dot11.subtype == 0:
                    subtype_name = "Association Request"
                elif dot11.subtype == 1:
                    subtype_name = "Association Response"
                elif dot11.subtype == 12:
                    subtype_name = "Deauthentication"
                elif dot11.subtype == 10:
                    subtype_name = "Disassociation"
                else:
                    subtype_name = f"Mgmt-{dot11.subtype}"
            elif dot11.type == 2:
                subtype_name = "Data"
                try:
                    if pkt.haslayer(EAPOL) or b'\x88\x8e' in bytes(pkt):
                        subtype_name = "EAPOL (4-way handshake)"
                except:
                    pass
            else:
                subtype_name = f"Type-{dot11.type} Sub-{dot11.subtype}"

            # Extract SSID / Channel / Reason / WPS / PMKID / RSN
            ssid = None
            bssid = None
            channel = None
            reason = None
            wps = False
            pmkid = None
            rsn_info = {}

            try:
                from scapy.layers.dot11 import Dot11Elt, Dot11Deauth, Dot11Disas
                # Reason code for deauth/disassoc
                if pkt.haslayer(Dot11Deauth):
                    try:
                        reason = pkt[Dot11Deauth].reason
                    except:
                        pass
                if pkt.haslayer(Dot11Disas):
                    try:
                        reason = pkt[Dot11Disas].reason
                    except:
                        pass

                # Iterate over Dot11Elt for SSID, channel, WPS, PMKID, RSN
                elt = pkt.getlayer(Dot11Elt)
                while elt:
                    if elt.ID == 0:  # SSID
                        try:
                            ssid = elt.info.decode(errors='ignore') if isinstance(elt.info, bytes) else str(elt.info)
                        except:
                            ssid = str(elt.info)
                    elif elt.ID == 3:  # Channel
                        if len(elt.info) >= 1:
                            channel = elt.info[0] if isinstance(elt.info, (bytes, bytearray)) else ord(elt.info[0]) if isinstance(elt.info, str) else elt.info[0]
                    elif elt.ID == 221:  # Vendor specific - WPS OUI 00:50:F2:04
                        try:
                            info_bytes = elt.info if isinstance(elt.info, bytes) else bytes(elt.info)
                            if len(info_bytes) >= 4 and info_bytes[0:3] == b'\x00\x50\xf2' and info_bytes[3] == 0x04:
                                wps = True
                            # PMKID is in RSN IE ID 48, but also check vendor
                        except:
                            pass
                    elif elt.ID == 48:  # RSN
                        try:
                            info_bytes = elt.info if isinstance(elt.info, bytes) else bytes(elt.info)
                            # Simple parse: check for PMKID list
                            # RSN structure: version(2) + group cipher(4) + pairwise count(2) + pairwise list + akm count(2) + akm list + RSN cap(2) + PMKID count(2) + PMKID list
                            # The generated lab captures embed the PMKID as key-data in EAPOL M1
                            if len(info_bytes) > 20:
                                # Heuristic: look for known PMKID pattern in raw
                                rsn_info['raw_len'] = len(info_bytes)
                        except:
                            pass
                    elt = elt.payload.getlayer(Dot11Elt)
            except Exception as e:
                pass

            # BSSID / SA / DA
            try:
                bssid = dot11.addr2 or dot11.addr3
                sa = dot11.addr2
                da = dot11.addr1
            except:
                bssid = None
                sa = None
                da = None

            # Detect EAPOL more robustly: check EAPOL layer, SNAP ethertype 0x888e, or Raw starting with EAPOL version
            is_eapol = False
            try:
                if pkt.haslayer(EAPOL):
                    is_eapol = True
                else:
                    # Check SNAP
                    from scapy.layers.l2 import SNAP
                    snap = pkt.getlayer(SNAP)
                    if snap is not None and hasattr(snap, 'code') and snap.code == 0x888e:
                        is_eapol = True
                    # Check Raw payload for EAPOL header 02 03 or 01 03 or 02 00 etc
                    from scapy.layers.l2 import LLC
                    from scapy.all import Raw
                    if pkt.haslayer(Raw):
                        raw_load = pkt[Raw].load if hasattr(pkt[Raw], 'load') else bytes(pkt[Raw])
                        if len(raw_load) >= 2 and raw_load[0] in (0x01, 0x02) and raw_load[1] in (0x00, 0x03):
                            is_eapol = True
                    # Also check LLC payload raw
                    if not is_eapol:
                        # Look for \x88\x8e in raw bytes of Dot11 payload
                        payload_bytes = bytes(dot11.payload)
                        if b'\x88\x8e' in payload_bytes or payload_bytes.startswith(b'\x02\x03') or payload_bytes.startswith(b'\x01\x03'):
                            is_eapol = True
                        # Our generated PCAPs use LLC/SNAP/Raw with EAPOL starting 02 03
                        if b'\x02\x03\x00' in payload_bytes or b'\xaa\xaa\x03\x00\x00\x00\x88\x8e' in payload_bytes:
                            is_eapol = True
            except:
                pass

            if is_eapol:
                subtype_name = "EAPOL (4-way handshake)" if "Data" in subtype_name else subtype_name + " + EAPOL"

            # Summary with reason, WPS, etc.
            summary_parts = [subtype_name]
            if ssid:
                summary_parts.append(f"SSID={ssid}")
            if bssid:
                summary_parts.append(f"BSSID={bssid}")
            if channel:
                summary_parts.append(f"Ch={channel}")
            if reason is not None:
                summary_parts.append(f"Reason={reason}")
            if wps:
                summary_parts.append("WPS")
            if reason == 7:
                summary_parts.append("Class 3 frame from nonassociated STA")
            if is_eapol:
                summary_parts.append("EAPOL M?")
            summary = " | ".join(summary_parts)

            frame_info = {
                "number": idx,
                "type": dot11.type,
                "subtype": dot11.subtype,
                "subtype_name": subtype_name,
                "ssid": ssid,
                "bssid": bssid,
                "sa": sa,
                "da": da,
                "channel": channel,
                "reason": reason,
                "wps": wps,
                "eapol": is_eapol or "EAPOL" in subtype_name,
                "summary": summary
            }

            # Apply simple display filter logic (wireshark-like)
            if display_filter:
                df = display_filter
                # Exact subtype filters
                if "wlan.fc.type_subtype==8" in df and not (dot11.type == 0 and dot11.subtype == 8):
                    continue
                if "wlan.fc.type_subtype==4" in df and not (dot11.type == 0 and dot11.subtype == 4):
                    continue
                if "wlan.fc.type_subtype==5" in df and not (dot11.type == 0 and dot11.subtype == 5):
                    continue
                if "wlan.fc.type_subtype==12" in df and not (dot11.type == 0 and dot11.subtype == 12):
                    continue
                if "wlan.fc.type_subtype==10" in df and not (dot11.type == 0 and dot11.subtype == 10):
                    continue
                if "wlan.fc.type_subtype==0" in df and not (dot11.type == 0 and dot11.subtype == 0):
                    continue
                if "wlan.fc.type_subtype==1" in df and not (dot11.type == 0 and dot11.subtype == 1):
                    continue
                # Generic
                dflow = df.lower()
                if "beacon" in dflow and "beacon" not in subtype_name.lower():
                    continue
                if "probe" in dflow and "probe" not in subtype_name.lower():
                    continue
                if "deauth" in dflow and "deauth" not in subtype_name.lower():
                    continue
                if "disassoc" in dflow and "disassoc" not in subtype_name.lower():
                    continue
                if "eapol" in dflow and not frame_info["eapol"]:
                    continue
                if "wps" in dflow and not wps:
                    continue

            frames.append(frame_info)

        return frames
    except Exception as e:
        print(f"[pcap_parser] scapy failed: {e}")
        import traceback
        traceback.print_exc()
        return []

def _apply_display_filter(frames: List[Dict[str, Any]], display_filter: Optional[str]) -> List[Dict[str, Any]]:
    """Evaluate the display filters the UI offers against the offline dataset.

    Only the filters the interface actually presents are supported; an unknown filter is reported by
    leaving the frame list unchanged and is surfaced to the user by the UI, never silently "matched".
    """
    f = (display_filter or "").strip()
    if not f:
        return frames

    import re as _re

    m = _re.fullmatch(r"wlan\.fc\.type_subtype==(\d+)", f)
    if m:
        return [fr for fr in frames if str(fr.get("subtype")) == m.group(1)]
    if f == "eapol":
        return [fr for fr in frames if fr.get("eapol")]
    if f == "eap":
        return [fr for fr in frames if fr.get("eap")]
    if f == "radius":
        return [fr for fr in frames if fr.get("radius")]
    if f == "wps":
        return [fr for fr in frames if fr.get("wps")]
    m = _re.fullmatch(r'wlan\.ssid=="?(.+?)"?', f)
    if m:
        return [fr for fr in frames if fr.get("ssid") == m.group(1)]
    return frames


def offline_frames(pcap_id: str) -> List[Dict[str, Any]]:
    """Decoded frames from the datasets that ship with the frontend.

    ``frontend/public/lab-data/<id>.json`` is produced by ``scripts/generate-lab-artifacts.py`` and
    decoded by ``scripts/wififorge_labkit.py`` from the real capture files, and the same values are
    asserted by ``scripts/verify-lab-artifacts.py``. It is the only fallback used here: this module no
    longer synthesises frames, because a learner must never be shown frame numbers and hashes that do
    not exist in the capture on disk.
    """
    from app.core.config import OFFLINE_DATA_DIR

    path = OFFLINE_DATA_DIR / f"{pcap_id}.json"
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return []
    frames = data.get("frames", [])

    # Normalise the offline dataset into the shape the API has always returned.
    normalised: List[Dict[str, Any]] = []
    for frame in frames:
        normalised.append({
            "number": frame.get("number"),
            "type": frame.get("type"),
            "subtype": frame.get("subtype"),
            "subtype_name": frame.get("subtype_name"),
            "ssid": frame.get("ssid"),
            "bssid": frame.get("bssid"),
            "sa": frame.get("sa"),
            "da": frame.get("da"),
            "channel": frame.get("channel"),
            "reason": frame.get("reason"),
            "wps": bool(frame.get("wps")),
            "eapol": bool(frame.get("eapol")),
            "eap": bool(frame.get("eap")),
            "radius": bool(frame.get("radius")),
            "summary": _summarise(frame),
        })
    return normalised


def _summarise(frame: Dict[str, Any]) -> str:
    """One-line description built from the fields that are actually present in the frame."""
    bits = [str(frame.get("subtype_name") or "Frame")]
    if frame.get("ssid"):
        bits.append(f"SSID={frame['ssid']}")
    if frame.get("bssid"):
        bits.append(f"BSSID={frame['bssid']}")
    if frame.get("sa") and frame.get("sa") != frame.get("bssid"):
        bits.append(f"SA={frame['sa']}")
    if frame.get("channel"):
        bits.append(f"Ch={frame['channel']}")
    if frame.get("reason") is not None:
        bits.append(f"Reason={frame['reason']}")
    if frame.get("wps"):
        bits.append("WPS IE")
    if frame.get("eapol"):
        bits.append(f"EAPOL{(' ' + str(frame['key_message'])) if frame.get('key_message') else ''}")
    if frame.get("eap_code_name"):
        bits.append(f"EAP {frame['eap_code_name']}")
    if frame.get("radius_code_name"):
        bits.append(f"RADIUS {frame['radius_code_name']}")
    if frame.get("mschapv2_opcode_name"):
        bits.append(f"MS-CHAPv2 {frame['mschapv2_opcode_name']}")
    return " | ".join(bits)


def parse_pcap(pcap_path: Path, display_filter: Optional[str] = None, pcap_id: str = "") -> Dict[str, Any]:
    """Decode a capture: tshark → scapy → the verified offline dataset shipped with the app.

    If none of the three can produce frames, the caller gets an empty frame list plus an explicit
    ``note``. Nothing is invented to fill the response.
    """
    frames: List[Dict[str, Any]] = []
    note: Optional[str] = None

    if tshark_available():
        frames = parse_with_tshark(pcap_path, display_filter)
        method = "tshark"
    elif SCAPY_AVAILABLE:
        frames = parse_with_scapy(pcap_path, display_filter)
        method = "scapy"
    else:
        method = "offline-dataset"

    # tshark/scapy returned nothing (filter matched no frames, or the file is one of the generated
    # lab captures whose structure the pinned versions cannot dissect): use the offline dataset.
    if not frames:
        offline = offline_frames(pcap_id)
        if offline:
            frames = _apply_display_filter(offline, display_filter)
            method = "offline-dataset"
            if tshark_available() or SCAPY_AVAILABLE:
                note = (
                    "The installed parser returned no frames for this capture; frames come from the "
                    "offline dataset generated and verified by scripts/verify-lab-artifacts.py."
                )
        else:
            method = "unavailable"
            note = (
                f"No parser available for {pcap_id or pcap_path.name} and no offline dataset found. "
                "Install tshark (or scapy) to decode the capture on this machine."
            )

    # Build summary including Phase E
    ssids = list(set([f.get("ssid") for f in frames if f.get("ssid")]))
    bssids = list(set([f.get("bssid") for f in frames if f.get("bssid")]))
    clients = list(set([f.get("sa") for f in frames if f.get("sa") and f.get("sa") not in bssids]))
    channels = list(set([f.get("channel") for f in frames if f.get("channel")]))

    summary = {
        "total_frames": len(frames),
        "ssids": ssids,
        "bssids": bssids,
        "clients": clients,
        "channels": channels,
        "beacons": len([f for f in frames if "Beacon" in f.get("subtype_name", "")]),
        "probes": len([f for f in frames if "Probe" in f.get("subtype_name", "")]),
        "eapol": len([f for f in frames if f.get("eapol")]),
        "deauth": len([f for f in frames if "Deauth" in f.get("subtype_name", "")]),
        "disassoc": len([f for f in frames if "Disassoc" in f.get("subtype_name", "")]),
        "assoc": len([f for f in frames if "Assoc" in f.get("subtype_name", "")]),
        "wps": len([f for f in frames if f.get("wps")]),
    }

    return {
        "method": method,
        "pcap_id": pcap_id,
        "pcap_path": str(pcap_path),
        "filter": display_filter,
        "note": note,
        "frames": frames,
        "summary": summary,
    }

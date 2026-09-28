"""
WiFiForge — PCAP Parser Service
Tries tshark first, falls back to Scapy, then mock

Phase C: Real parsing for beacon/recon/traffic labs
Phase D: WPA2 handshake, PMKID, WPS, WPA3 transition
Phase E: Deauth/disassoc (subtype 12/10), Rogue AP, Captive Portal
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
        "-e", "wlan_mgt.ssid",
        "-e", "wlan.bssid",
        "-e", "wlan.sa",
        "-e", "wlan.da",
        "-e", "wlan_mgt.ds.current_channel",
        "-e", "wlan_mgt.fixed.beacon",
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
                "ssid": get_first("wlan_mgt.ssid"),
                "bssid": get_first("wlan.bssid"),
                "sa": get_first("wlan.sa"),
                "da": get_first("wlan.da"),
                "channel": get_first("wlan_mgt.ds.current_channel"),
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
                            # For our mock PCAPs, we embed PMKID as 16 bytes hex pattern
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

def mock_frames(pcap_id: str) -> List[Dict[str, Any]]:
    """Fallback mock data for when no parser available — includes Phase E"""
    if "deauth" in pcap_id:
        frames = [{"number": 1, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "LAB-DEAUTH", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "reason": None, "wps": False, "eapol": False, "summary": "Beacon | SSID=LAB-DEAUTH | BSSID=AA:BB:CC:DD:EE:FF | Ch=6 | PMF disabled"}]
        for i in range(2, 12):
            frames.append({"number": i, "type": 0, "subtype": 12, "subtype_name": "Deauthentication", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "sa": "AA:BB:CC:DD:EE:FF", "da": "11:22:33:44:55:66", "reason": 7, "wps": False, "eapol": False, "summary": f"Deauthentication | BSSID=AA:BB:CC:DD:EE:FF | Reason=7 | AP→Client | Class 3 frame from nonassociated STA"})
        frames.append({"number": 12, "type": 0, "subtype": 12, "subtype_name": "Deauthentication", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "sa": "11:22:33:44:55:66", "da": "AA:BB:CC:DD:EE:FF", "reason": 7, "wps": False, "eapol": False, "summary": "Deauthentication | Client→AP | Reason=7"})
        frames.append({"number": 14, "type": 0, "subtype": 10, "subtype_name": "Disassociation", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": 8, "wps": False, "eapol": False, "summary": "Disassociation | Reason=8 | STA leaving BSS"})
        return frames
    if "rogue" in pcap_id:
        return [
            {"number": 1, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "Corp-WLAN", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "reason": None, "wps": False, "eapol": False, "summary": "Beacon | SSID=Corp-WLAN | BSSID=AA:BB:CC:DD:EE:FF legit Ch6"},
            {"number": 2, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "Corp-WLAN", "bssid": "11:22:33:44:55:66", "channel": 11, "reason": None, "wps": False, "eapol": False, "summary": "Beacon | SSID=Corp-WLAN | BSSID=11:22:33:44:55:66 rogue Ch11 same SSID different BSSID"},
            {"number": 3, "type": 0, "subtype": 4, "subtype_name": "Probe Request", "ssid": "Corp-WLAN", "bssid": None, "sa": "12:34:56:78:9A:BC", "reason": None, "wps": False, "eapol": False, "summary": "Probe Request | SSID=Corp-WLAN | Client=12:34:56:78:9A:BC"},
            {"number": 4, "type": 0, "subtype": 5, "subtype_name": "Probe Response", "ssid": "Corp-WLAN", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "reason": None, "wps": False, "eapol": False, "summary": "Probe Response | SSID=Corp-WLAN | BSSID=AA:BB:CC:DD:EE:FF legit"},
            {"number": 5, "type": 0, "subtype": 5, "subtype_name": "Probe Response", "ssid": "Corp-WLAN", "bssid": "11:22:33:44:55:66", "channel": 11, "reason": None, "wps": False, "eapol": False, "summary": "Probe Response | SSID=Corp-WLAN | BSSID=11:22:33:44:55:66 rogue"},
            {"number": 6, "type": 0, "subtype": 0, "subtype_name": "Association Request", "ssid": "Corp-WLAN", "bssid": "11:22:33:44:55:66", "sa": "12:34:56:78:9A:BC", "reason": None, "wps": False, "eapol": False, "summary": "Association Request | Client 12:34:56:78:9A:BC to rogue 11:22:33:44:55:66"},
            {"number": 7, "type": 0, "subtype": 1, "subtype_name": "Association Response", "ssid": "Corp-WLAN", "bssid": "11:22:33:44:55:66", "sa": "11:22:33:44:55:66", "da": "12:34:56:78:9A:BC", "reason": None, "wps": False, "eapol": False, "summary": "Association Response | Rogue accepts client"},
        ]
    if "captive" in pcap_id:
        return [
            {"number": 1, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "Guest-WLAN", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "reason": None, "wps": False, "eapol": False, "summary": "Beacon | SSID=Guest-WLAN | BSSID=AA:BB:CC:DD:EE:FF | Ch6 Open"},
            {"number": 2, "type": 0, "subtype": 0, "subtype_name": "Association Request", "ssid": "Guest-WLAN", "bssid": "AA:BB:CC:DD:EE:FF", "sa": "11:22:33:44:55:66", "reason": None, "wps": False, "eapol": False, "summary": "Association Request | Client to open"},
            {"number": 3, "type": 0, "subtype": 1, "subtype_name": "Association Response", "ssid": "Guest-WLAN", "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "Association Response | Open success"},
            {"number": 4, "type": 2, "subtype": 0, "subtype_name": "Data", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "Data | HTTP GET example.com"},
            {"number": 5, "type": 2, "subtype": 0, "subtype_name": "Data", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "Data | HTTP 302 redirect portal.guest.com/login"},
            {"number": 6, "type": 2, "subtype": 0, "subtype_name": "Data", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "Data | HTTP POST login over HTTP (weak)"},
        ]
    if "beacon" in pcap_id:
        return [
            {"number": 1, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "LAB-WIFI", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "reason": None, "wps": False, "eapol": False, "summary": "Beacon | SSID=LAB-WIFI | BSSID=AA:BB:CC:DD:EE:FF | Ch=6"},
            {"number": 2, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "LAB-WIFI", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "reason": None, "wps": False, "eapol": False, "summary": "Beacon | SSID=LAB-WIFI | BSSID=AA:BB:CC:DD:EE:FF | Ch=6"},
            {"number": 3, "type": 0, "subtype": 4, "subtype_name": "Probe Request", "ssid": "LAB-WIFI", "bssid": None, "sa": "11:22:33:44:55:66", "reason": None, "wps": False, "eapol": False, "summary": "Probe Request | SSID=LAB-WIFI | Client=11:22:33:44:55:66 (PNL leak)"},
            {"number": 4, "type": 0, "subtype": 5, "subtype_name": "Probe Response", "ssid": "LAB-WIFI", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "reason": None, "wps": False, "eapol": False, "summary": "Probe Response | SSID=LAB-WIFI | BSSID=AA:BB:CC:DD:EE:FF"},
        ]
    if "wpa3" in pcap_id:
        return [
            {"number": 1, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "LAB-WPA3-TRANS", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 36, "reason": None, "wps": False, "eapol": False, "summary": "Beacon | SSID=LAB-WPA3-TRANS | AKM PSK+SAE | PMF optional | Transition"},
            {"number": 2, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "LAB-WPA3", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 36, "reason": None, "wps": False, "eapol": False, "summary": "Beacon | SSID=LAB-WPA3 | AKM SAE | PMF required | WPA3-only"},
        ]
    if "wps" in pcap_id:
        return [
            {"number": 1, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "LAB-WPS", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "reason": None, "wps": True, "eapol": False, "summary": "Beacon | SSID=LAB-WPS | BSSID=AA:BB:CC:DD:EE:FF | Ch6 | WPS OUI 00:50:F2:04 | 11k PIN flaw"},
            {"number": 2, "type": 0, "subtype": 5, "subtype_name": "Probe Response", "ssid": "LAB-WPS", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "reason": None, "wps": True, "eapol": False, "summary": "Probe Response | SSID=LAB-WPS | WPS"},
        ]
    if "pmkid" in pcap_id:
        return [
            {"number": 1, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "LAB-PMKID", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "reason": None, "wps": False, "eapol": False, "summary": "Beacon + EAPOL M1 with PMKID aabbccddeeff00112233445566778899 | Clientless"},
        ]
    if "enterprise" in pcap_id or "eap" in pcap_id:
        return [
            {"number": 1, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "Corp-Enterprise", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "reason": None, "wps": False, "eapol": False, "summary": "Beacon | SSID=Corp-Enterprise | WPA2-EAP CCMP | BSSID=AA:BB:CC:DD:EE:FF Ch6"},
            {"number": 2, "type": 0, "subtype": 0, "subtype_name": "Association Request", "ssid": "Corp-Enterprise", "bssid": "AA:BB:CC:DD:EE:FF", "sa": "11:22:33:44:55:66", "reason": None, "wps": False, "eapol": False, "summary": "Association Request | Client 11:22:33:44:55:66 to Enterprise"},
            {"number": 3, "type": 0, "subtype": 1, "subtype_name": "Association Response", "ssid": "Corp-Enterprise", "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "Association Response"},
            {"number": 4, "type": 2, "subtype": 8, "subtype_name": "EAPOL (4-way handshake)", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "sa": "11:22:33:44:55:66", "reason": None, "wps": False, "eapol": True, "summary": "EAPOL Start"},
            {"number": 5, "type": 2, "subtype": 8, "subtype_name": "EAP (Identity)", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "sa": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "EAP Request Identity"},
            {"number": 6, "type": 2, "subtype": 8, "subtype_name": "EAP (Identity)", "ssid": None, "bssid": "11:22:33:44:55:66", "sa": "11:22:33:44:55:66", "reason": None, "wps": False, "eapol": False, "summary": "EAP Response Identity user@corp.com"},
            {"number": 7, "type": 2, "subtype": 8, "subtype_name": "EAP (PEAP)", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "PEAP TLS ClientHello ServerHello"},
            {"number": 8, "type": 2, "subtype": 8, "subtype_name": "EAP (PEAP) + MSCHAPv2", "ssid": None, "bssid": "11:22:33:44:55:66", "reason": None, "wps": False, "eapol": False, "summary": "MSCHAPv2 Challenge/Response inside PEAP — capturable if no cert validation"},
            {"number": 9, "type": 2, "subtype": 8, "subtype_name": "EAP Success", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "EAP Success + MSK"},
            {"number": 10, "type": 2, "subtype": 8, "subtype_name": "EAPOL (4-way handshake)", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": True, "summary": "EAPOL M1-M4 from MSK"},
        ]
    if "radius" in pcap_id:
        return [
            {"number": 1, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "Corp-Enterprise", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "reason": None, "wps": False, "eapol": False, "summary": "Beacon | Corp-Enterprise EAP"},
            {"number": 2, "type": 2, "subtype": 8, "subtype_name": "EAP (Identity)", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "EAP Response Identity user@corp.com"},
            {"number": 3, "type": 2, "subtype": 8, "subtype_name": "RADIUS Access-Request", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "RADIUS Access-Request user@corp.com NAS 192.168.1.1 secret testing123 weak"},
            {"number": 4, "type": 2, "subtype": 8, "subtype_name": "RADIUS Access-Challenge", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "RADIUS Access-Challenge MSCHAPv2 Challenge"},
            {"number": 5, "type": 2, "subtype": 8, "subtype_name": "RADIUS Access-Request", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "RADIUS Access-Request MSCHAPv2 Response"},
            {"number": 6, "type": 2, "subtype": 8, "subtype_name": "RADIUS Access-Accept", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "RADIUS Access-Accept MSK VLAN 100"},
            {"number": 7, "type": 2, "subtype": 8, "subtype_name": "EAPOL (4-way handshake)", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": True, "summary": "EAPOL M1-M4"},
            {"number": 8, "type": 2, "subtype": 8, "subtype_name": "RADIUS Accounting-Request", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "RADIUS Accounting-Request Start"},
        ]
    if "corporate" in pcap_id:
        return [
            {"number": 1, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "Corp-Enterprise", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "reason": None, "wps": False, "eapol": False, "summary": "Beacon | Corp-Enterprise WPA2-EAP Ch6 legit"},
            {"number": 2, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "Corp-Guest", "bssid": "BB:CC:DD:EE:FF:00", "channel": 11, "reason": None, "wps": False, "eapol": False, "summary": "Beacon | Corp-Guest Open Ch11"},
            {"number": 3, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "IoT-PSK", "bssid": "CC:DD:EE:FF:00:11", "channel": 1, "reason": None, "wps": True, "eapol": False, "summary": "Beacon | IoT-PSK WPA2-PSK WPS Ch1 weak"},
            {"number": 4, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "Corp-Enterprise", "bssid": "11:22:33:44:55:66", "channel": 11, "reason": None, "wps": False, "eapol": False, "summary": "Beacon | Corp-Enterprise rogue Ch11 same SSID diff BSSID 11:22:33:44:55:66"},
            {"number": 5, "type": 0, "subtype": 12, "subtype_name": "Deauthentication", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "sa": "AA:BB:CC:DD:EE:FF", "da": "11:22:33:44:55:66", "reason": 7, "wps": False, "eapol": False, "summary": "Deauth AP→Client reason7 to force reconnect to rogue"},
            {"number": 7, "type": 0, "subtype": 0, "subtype_name": "Association Request", "ssid": "Corp-Enterprise", "bssid": "11:22:33:44:55:66", "sa": "11:22:33:44:55:66", "reason": None, "wps": False, "eapol": False, "summary": "Assoc Req Client 11:22:33:44:55:66 to rogue 11:22:33:44:55:66"},
            {"number": 8, "type": 2, "subtype": 8, "subtype_name": "EAP (Identity)", "ssid": None, "bssid": "11:22:33:44:55:66", "reason": None, "wps": False, "eapol": False, "summary": "EAP Response Identity user@corp.com to rogue"},
            {"number": 9, "type": 2, "subtype": 8, "subtype_name": "EAP (PEAP) + MSCHAPv2", "ssid": None, "bssid": "11:22:33:44:55:66", "reason": None, "wps": False, "eapol": False, "summary": "MSCHAPv2 Challenge/Response captured by rogue RADIUS"},
            {"number": 10, "type": 2, "subtype": 8, "subtype_name": "Data", "ssid": None, "bssid": "BB:CC:DD:EE:FF:00", "reason": None, "wps": False, "eapol": False, "summary": "ARP Guest isolation disabled — clients can ping"},
            {"number": 11, "type": 2, "subtype": 8, "subtype_name": "Data", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "ICMP Corp VLAN 100 to Guest VLAN 200 Success — ACL misconfigured segmentation bypass"},
        ]
    if "methodology" in pcap_id or "final" in pcap_id:
        return [
            {"number": 1, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "Corp-Enterprise", "bssid": "AA:BB:CC:DD:EE:FF", "channel": 6, "reason": None, "wps": False, "eapol": False, "summary": "Beacon Corp-Enterprise EAP Ch6"},
            {"number": 2, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "Corp-Guest", "bssid": "BB:CC:DD:EE:FF:00", "channel": 11, "reason": None, "wps": False, "eapol": False, "summary": "Beacon Corp-Guest Open Ch11"},
            {"number": 3, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "IoT-PSK", "bssid": "CC:DD:EE:FF:00:11", "channel": 1, "reason": None, "wps": True, "eapol": False, "summary": "Beacon IoT-PSK WPA2-PSK WPS weak Ch1"},
            {"number": 4, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "HIDDEN-LAB", "bssid": "DD:EE:FF:00:11:22", "channel": 6, "reason": None, "wps": True, "eapol": False, "summary": "Beacon HIDDEN-LAB hidden SSID WPS"},
            {"number": 5, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "LAB-WPA3-TRANS", "bssid": "EE:FF:00:11:22:33", "channel": 36, "reason": None, "wps": False, "eapol": False, "summary": "Beacon LAB-WPA3-TRANS PSK+SAE transition PMF optional"},
            {"number": 6, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "LAB-WPS", "bssid": "FF:00:11:22:33:44", "channel": 6, "reason": None, "wps": True, "eapol": False, "summary": "Beacon LAB-WPS WPS 11k"},
            {"number": 7, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "Corp-Enterprise", "bssid": "11:22:33:44:55:66", "channel": 11, "reason": None, "wps": False, "eapol": False, "summary": "Beacon rogue Corp-Enterprise Ch11"},
            {"number": 8, "type": 0, "subtype": 4, "subtype_name": "Probe Request", "ssid": "HIDDEN-LAB", "bssid": None, "sa": "33:44:55:66:77:88", "reason": None, "wps": False, "eapol": False, "summary": "Probe Req HIDDEN-LAB reveals hidden"},
            {"number": 9, "type": 0, "subtype": 5, "subtype_name": "Probe Response", "ssid": "HIDDEN-LAB", "bssid": "DD:EE:FF:00:11:22", "channel": 6, "reason": None, "wps": False, "eapol": False, "summary": "Probe Resp HIDDEN-LAB"},
            {"number": 10, "type": 0, "subtype": 12, "subtype_name": "Deauthentication", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "sa": "AA:BB:CC:DD:EE:FF", "da": "11:22:33:44:55:66", "reason": 7, "wps": False, "eapol": False, "summary": "Deauth to force reconnect to rogue"},
            {"number": 11, "type": 0, "subtype": 0, "subtype_name": "Association Request", "ssid": "Corp-Enterprise", "bssid": "11:22:33:44:55:66", "sa": "11:22:33:44:55:66", "reason": None, "wps": False, "eapol": False, "summary": "Assoc to rogue"},
            {"number": 12, "type": 2, "subtype": 8, "subtype_name": "EAP (Identity)", "ssid": None, "bssid": "11:22:33:44:55:66", "reason": None, "wps": False, "eapol": False, "summary": "EAP Identity user@corp.com"},
            {"number": 13, "type": 2, "subtype": 8, "subtype_name": "EAP (PEAP) + MSCHAPv2", "ssid": None, "bssid": "11:22:33:44:55:66", "reason": None, "wps": False, "eapol": False, "summary": "MSCHAPv2 Challenge/Response"},
            {"number": 14, "type": 2, "subtype": 8, "subtype_name": "EAPOL (4-way handshake)", "ssid": None, "bssid": "CC:DD:EE:FF:00:11", "reason": None, "wps": False, "eapol": True, "summary": "EAPOL M1-M4 IoT-PSK weak WeakPass123"},
            {"number": 18, "type": 2, "subtype": 8, "subtype_name": "Data", "ssid": None, "bssid": "BB:CC:DD:EE:FF:00", "reason": None, "wps": False, "eapol": False, "summary": "HTTP GET example.com → 302 portal.guest.com/login → POST HTTP weak"},
            {"number": 21, "type": 2, "subtype": 8, "subtype_name": "Data", "ssid": None, "bssid": "AA:BB:CC:DD:EE:FF", "reason": None, "wps": False, "eapol": False, "summary": "ICMP Corp VLAN 100 to Guest VLAN 200 Success — segmentation bypass"},
            {"number": 22, "type": 2, "subtype": 8, "subtype_name": "Data", "ssid": None, "bssid": "BB:CC:DD:EE:FF:00", "reason": None, "wps": False, "eapol": False, "summary": "ARP Guest isolation disabled"},
        ]
    return []

def parse_pcap(pcap_path: Path, display_filter: Optional[str] = None, pcap_id: str = "") -> Dict[str, Any]:
    """
    Main entry: tries tshark -> scapy -> mock
    Returns dict with frames + summary including deauth/rogue/captive
    """
    frames = []

    if tshark_available():
        frames = parse_with_tshark(pcap_path, display_filter)
        method = "tshark"
    elif SCAPY_AVAILABLE:
        frames = parse_with_scapy(pcap_path, display_filter)
        method = "scapy"
    else:
        frames = mock_frames(pcap_id)
        method = "mock"

    # If still empty and file exists, try scapy anyway
    if not frames and pcap_path.exists() and SCAPY_AVAILABLE:
        frames = parse_with_scapy(pcap_path, display_filter)
        method = "scapy-fallback"

    # If still empty, use mock for known IDs
    if not frames:
        frames = mock_frames(pcap_id)
        if frames:
            method = "mock-fallback"

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
        "frames": frames,
        "summary": summary
    }

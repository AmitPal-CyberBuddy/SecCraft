#!/usr/bin/env python3
"""
WiFiForge — PCAP Generator using Scapy
Generates synthetic 802.11 PCAPs for simulated labs (no RF needed)

Usage:
  python3 scripts/generate_pcap.py --type beacon --ssid LAB-WIFI --bssid AA:BB:CC:DD:EE:FF --channel 6 -o content/pcaps/wifi-fundamentals/beacon-only.pcapng
  python3 scripts/generate_pcap.py --type recon --output content/pcaps/recon/recon-lab.pcapng
  python3 scripts/generate_pcap.py --type traffic --output content/pcaps/traffic/traffic-analysis.pcapng
  python3 scripts/generate_pcap.py --all
"""

import argparse
import os
from pathlib import Path

# Ensure scapy import
try:
    from scapy.all import (
        Dot11, Dot11Beacon, Dot11Elt, Dot11ProbeReq, Dot11ProbeResp,
        Dot11Auth, Dot11AssoReq, Dot11AssoResp, RadioTap, wrpcap, EAPOL
    )
    from scapy.layers.dot11 import Dot11EltRates, Dot11EltRSN
except ImportError:
    print("Scapy not found. Install: pip install scapy")
    exit(1)

REPO_ROOT = Path(__file__).parent.parent
CONTENT_PCAP = REPO_ROOT / "content" / "pcaps"
FRONTEND_PCAP = REPO_ROOT / "frontend" / "public" / "pcaps"

def ensure_dir(p: Path):
    p.parent.mkdir(parents=True, exist_ok=True)

def beacon_frame(ssid: str, bssid: str, channel: int, security: str = "Open"):
    """Create a beacon frame"""
    # RadioTap + Dot11 + Beacon
    dot11 = Dot11(type=0, subtype=8, addr1="ff:ff:ff:ff:ff:ff", addr2=bssid, addr3=bssid)
    beacon = Dot11Beacon(cap=0x2104 if security == "Open" else 0x3114)  # ESS+privacy if secured
    essid = Dot11Elt(ID="SSID", info=ssid.encode(), len=len(ssid))
    rates = Dot11Elt(ID="Rates", info=b'\x82\x84\x8b\x96\x0c\x12\x18\x24')
    channel_elt = Dot11Elt(ID="DSset", info=bytes([channel]))
    # RSN for WPA2
    if security == "WPA2-PSK":
        rsn_info = (
            b"\x01\x00"  # version
            b"\x00\x0f\xac\x02"  # group cipher TKIP
            b"\x02\x00"  # pairwise cipher count
            b"\x00\x0f\xac\x04\x00\x0f\xac\x02"  # pairwise ciphers
            b"\x01\x00"  # akm count
            b"\x00\x0f\xac\x02"  # akm PSK
            b"\x00\x00"  # RSN capabilities
        )
        rsn = Dot11Elt(ID="RSNinfo", info=rsn_info)
        frame = RadioTap() / dot11 / beacon / essid / rates / channel_elt / rsn
    else:
        frame = RadioTap() / dot11 / beacon / essid / rates / channel_elt
    return frame

def probe_req_frame(client_mac: str, ssid: str = ""):
    dot11 = Dot11(type=0, subtype=4, addr1="ff:ff:ff:ff:ff:ff", addr2=client_mac, addr3="ff:ff:ff:ff:ff:ff")
    essid = Dot11Elt(ID="SSID", info=ssid.encode(), len=len(ssid))
    rates = Dot11Elt(ID="Rates", info=b'\x82\x84\x8b\x96\x0c\x12\x18\x24')
    return RadioTap() / dot11 / Dot11ProbeReq() / essid / rates

def probe_resp_frame(bssid: str, client_mac: str, ssid: str, channel: int):
    dot11 = Dot11(type=0, subtype=5, addr1=client_mac, addr2=bssid, addr3=bssid)
    beacon = Dot11Beacon(cap=0x2104)
    essid = Dot11Elt(ID="SSID", info=ssid.encode(), len=len(ssid))
    rates = Dot11Elt(ID="Rates", info=b'\x82\x84\x8b\x96\x0c\x12\x18\x24')
    channel_elt = Dot11Elt(ID="DSset", info=bytes([channel]))
    return RadioTap() / dot11 / Dot11ProbeResp() / beacon / essid / rates / channel_elt

def auth_frame(bssid: str, client_mac: str):
    dot11 = Dot11(type=0, subtype=11, addr1=bssid, addr2=client_mac, addr3=bssid)
    return RadioTap() / dot11 / Dot11Auth(algo=0, seqnum=1, status=0)

def assoc_req_frame(bssid: str, client_mac: str, ssid: str):
    dot11 = Dot11(type=0, subtype=0, addr1=bssid, addr2=client_mac, addr3=bssid)
    cap = 0x2104
    essid = Dot11Elt(ID="SSID", info=ssid.encode(), len=len(ssid))
    rates = Dot11Elt(ID="Rates", info=b'\x82\x84\x8b\x96\x0c\x12\x18\x24')
    return RadioTap() / dot11 / Dot11AssoReq(cap=cap, listen_interval=10) / essid / rates

def assoc_resp_frame(bssid: str, client_mac: str):
    dot11 = Dot11(type=0, subtype=1, addr1=client_mac, addr2=bssid, addr3=bssid)
    return RadioTap() / dot11 / Dot11AssoResp(cap=0x2104, status=0, AID=1)

def generate_beacon_only(output: Path):
    """Single AP beacon lab"""
    frames = []
    bssid = "AA:BB:CC:DD:EE:FF"
    ssid = "LAB-WIFI"
    channel = 6
    # 3 beacons
    for _ in range(3):
        frames.append(beacon_frame(ssid, bssid, channel, "Open"))
    # Probe req from client revealing PNL
    frames.append(probe_req_frame("11:22:33:44:55:66", ssid))
    # Probe resp
    frames.append(probe_resp_frame(bssid, "11:22:33:44:55:66", ssid, channel))
    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] Beacon-only PCAP: {output} ({len(frames)} frames)")

def generate_recon_lab(output: Path):
    """Recon lab: multiple APs, hidden SSID, clients, vendors"""
    frames = []
    # AP 1: LAB-WIFI on ch 6, open, Cisco OUI
    frames.append(beacon_frame("LAB-WIFI", "00:11:22:33:44:55", 6, "Open"))
    # AP 2: LAB-WIFI on ch 11, same ESS different BSSID
    frames.append(beacon_frame("LAB-WIFI", "00:11:22:33:44:56", 11, "Open"))
    # AP 3: Hidden SSID
    frames.append(beacon_frame("", "AA:BB:CC:11:22:33", 1, "WPA2-PSK"))
    # AP 4: Corp-WLAN WPA2-PSK on ch 36 (5GHz)
    frames.append(beacon_frame("Corp-WLAN", "DE:AD:BE:EF:00:01", 36, "WPA2-PSK"))
    # AP 5: Guest-WLAN Open
    frames.append(beacon_frame("Guest-WLAN", "DE:AD:BE:EF:00:02", 6, "Open"))

    # Clients probing
    # Client 1: iPhone probing for LAB-WIFI and HomeWiFi (PNL leak)
    frames.append(probe_req_frame("12:34:56:78:9A:BC", "LAB-WIFI"))
    frames.append(probe_req_frame("12:34:56:78:9A:BC", "HomeWiFi"))
    frames.append(probe_req_frame("12:34:56:78:9A:BC", "Corp-WLAN"))
    # Client 2: Laptop probing hidden
    frames.append(probe_req_frame("AA:BB:CC:99:88:77", ""))
    # Probe responses for hidden SSID revealing it
    frames.append(probe_resp_frame("AA:BB:CC:11:22:33", "AA:BB:CC:99:88:77", "HIDDEN-LAB", 1))

    # Some auth/assoc
    frames.append(auth_frame("00:11:22:33:44:55", "12:34:56:78:9A:BC"))
    frames.append(assoc_req_frame("00:11:22:33:44:55", "12:34:56:78:9A:BC", "LAB-WIFI"))
    frames.append(assoc_resp_frame("00:11:22:33:44:55", "12:34:56:78:9A:BC"))

    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] Recon lab PCAP: {output} ({len(frames)} frames)")

def generate_traffic_analysis(output: Path):
    """Traffic analysis: full association flow + EAPOL placeholder"""
    frames = []
    bssid = "AA:BB:CC:DD:EE:FF"
    client = "11:22:33:44:55:66"
    ssid = "LAB-WIFI"
    channel = 6

    # Beacons
    frames.append(beacon_frame(ssid, bssid, channel, "WPA2-PSK"))
    frames.append(beacon_frame(ssid, bssid, channel, "WPA2-PSK"))
    # Probe
    frames.append(probe_req_frame(client, ssid))
    frames.append(probe_resp_frame(bssid, client, ssid, channel))
    # Auth
    frames.append(auth_frame(bssid, client))
    frames.append(Dot11(type=0, subtype=11, addr1=client, addr2=bssid, addr3=bssid) / Dot11Auth(algo=0, seqnum=2, status=0))
    # Assoc
    frames.append(assoc_req_frame(bssid, client, ssid))
    frames.append(assoc_resp_frame(bssid, client))

    # EAPOL (4-way handshake) — simplified, not cryptographically valid, but has EAPOL type
    # Use raw EAPOL frames for analysis
    from scapy.all import LLC, SNAP
    for i in range(4):
        dot11 = Dot11(type=2, subtype=8, addr1=bssid if i%2==0 else client, addr2=client if i%2==0 else bssid, addr3=bssid)
        # EAPOL header: version 2, type 3 (key), length
        eapol_raw = b'\x02\x03\x00\x5f\x02\x00\x8a\x00\x10\x00\x00\x00\x00\x00\x00\x00\x01' + bytes([i]*80)
        frames.append(RadioTap() / dot11 / LLC() / SNAP() / eapol_raw)

    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] Traffic analysis PCAP: {output} ({len(frames)} frames)")

def main():
    parser = argparse.ArgumentParser(description="WiFiForge PCAP Generator")
    parser.add_argument("--type", choices=["beacon", "recon", "traffic", "all"], default="all", help="PCAP type")
    parser.add_argument("--ssid", default="LAB-WIFI")
    parser.add_argument("--bssid", default="AA:BB:CC:DD:EE:FF")
    parser.add_argument("--channel", type=int, default=6)
    parser.add_argument("-o", "--output", type=Path, help="Output file")
    parser.add_argument("--all", action="store_true", help="Generate all PCAPs")
    args = parser.parse_args()

    if args.all or args.type == "all":
        # Generate all
        generate_beacon_only(CONTENT_PCAP / "wifi-fundamentals" / "beacon-only.pcapng")
        generate_beacon_only(FRONTEND_PCAP / "wifi-fundamentals" / "beacon-only.pcapng")
        generate_recon_lab(CONTENT_PCAP / "recon" / "recon-lab.pcapng")
        generate_recon_lab(FRONTEND_PCAP / "recon" / "recon-lab.pcapng")
        generate_traffic_analysis(CONTENT_PCAP / "traffic" / "traffic-analysis.pcapng")
        generate_traffic_analysis(FRONTEND_PCAP / "traffic" / "traffic-analysis.pcapng")
        # Also copy to frontend src/content for dev fallback
        frontend_src = REPO_ROOT / "frontend" / "src" / "content" / "pcaps"
        frontend_src.mkdir(parents=True, exist_ok=True)
        # We'll just ensure public is enough, but also copy to src for import
        return

    if args.type == "beacon":
        out = args.output or CONTENT_PCAP / "wifi-fundamentals" / "beacon-only.pcapng"
        generate_beacon_only(out)
    elif args.type == "recon":
        out = args.output or CONTENT_PCAP / "recon" / "recon-lab.pcapng"
        generate_recon_lab(out)
    elif args.type == "traffic":
        out = args.output or CONTENT_PCAP / "traffic" / "traffic-analysis.pcapng"
        generate_traffic_analysis(out)

if __name__ == "__main__":
    main()

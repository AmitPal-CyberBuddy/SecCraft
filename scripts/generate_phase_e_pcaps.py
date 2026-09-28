#!/usr/bin/env python3
"""
WiFiForge Phase E — Deauth, Rogue AP, Captive Portal PCAPs
"""

from pathlib import Path
from scapy.all import (
    Dot11, Dot11Beacon, Dot11Elt, Dot11Deauth, Dot11Disas,
    Dot11ProbeReq, Dot11ProbeResp, Dot11Auth, Dot11AssoReq, Dot11AssoResp,
    RadioTap, wrpcap, LLC, SNAP, IP, TCP, UDP, DNS, DNSQR, Raw
)

REPO_ROOT = Path(__file__).parent.parent
CONTENT_PCAP = REPO_ROOT / "content" / "pcaps"
FRONTEND_PCAP = REPO_ROOT / "frontend" / "public" / "pcaps"

def ensure_dir(p: Path):
    p.parent.mkdir(parents=True, exist_ok=True)

def beacon(ssid, bssid, channel, security="WPA2-PSK"):
    dot11 = Dot11(type=0, subtype=8, addr1="ff:ff:ff:ff:ff:ff", addr2=bssid, addr3=bssid)
    beacon = Dot11Beacon(cap=0x3114 if security != "Open" else 0x2104)
    essid = Dot11Elt(ID="SSID", info=ssid.encode())
    rates = Dot11Elt(ID="Rates", info=b'\x82\x84\x8b\x96\x0c\x12\x18\x24')
    channel_elt = Dot11Elt(ID="DSset", info=bytes([channel]))
    if security == "WPA2-PSK":
        rsn = Dot11Elt(ID="RSNinfo", info=b"\x01\x00\x00\x0f\xac\x04\x01\x00\x00\x0f\xac\x04\x01\x00\x00\x0f\xac\x02\x00\x00")
        return RadioTap() / dot11 / beacon / essid / rates / channel_elt / rsn
    elif security == "Open":
        return RadioTap() / dot11 / beacon / essid / rates / channel_elt
    else:
        return RadioTap() / dot11 / beacon / essid / rates / channel_elt

def generate_deauth(output: Path):
    frames = []
    bssid = "AA:BB:CC:DD:EE:FF"
    client = "11:22:33:44:55:66"
    ssid = "LAB-DEAUTH"
    channel = 6

    # Beacon with PMF disabled (bad)
    frames.append(beacon(ssid, bssid, channel, "WPA2-PSK"))
    # 10 deauth frames AP->Client reason 7
    for i in range(10):
        dot11 = Dot11(type=0, subtype=12, addr1=client, addr2=bssid, addr3=bssid)
        frames.append(RadioTap() / dot11 / Dot11Deauth(reason=7))
    # 2 deauth Client->AP
    for i in range(2):
        dot11 = Dot11(type=0, subtype=12, addr1=bssid, addr2=client, addr3=bssid)
        frames.append(RadioTap() / dot11 / Dot11Deauth(reason=7))
    # 1 disassoc
    dot11 = Dot11(type=0, subtype=10, addr1=client, addr2=bssid, addr3=bssid)
    frames.append(RadioTap() / dot11 / Dot11Disas(reason=8))

    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] Deauth PCAP: {output} ({len(frames)} frames) — 12 deauth, 1 disassoc, PMF disabled")

def generate_rogue_ap(output: Path):
    frames = []
    # Legit AP
    legit_bssid = "AA:BB:CC:DD:EE:FF"
    legit_ssid = "Corp-WLAN"
    legit_channel = 6
    frames.append(beacon(legit_ssid, legit_bssid, legit_channel, "WPA2-PSK"))
    # Rogue AP same SSID different BSSID different channel
    rogue_bssid = "11:22:33:44:55:66"
    rogue_channel = 11
    frames.append(beacon(legit_ssid, rogue_bssid, rogue_channel, "WPA2-PSK"))
    # Client probing Corp-WLAN
    client = "12:34:56:78:9A:BC"
    dot11 = Dot11(type=0, subtype=4, addr1="ff:ff:ff:ff:ff:ff", addr2=client, addr3="ff:ff:ff:ff:ff:ff")
    frames.append(RadioTap() / dot11 / Dot11ProbeReq() / Dot11Elt(ID="SSID", info=legit_ssid.encode()))
    # Probe responses from both
    frames.append(RadioTap() / Dot11(type=0, subtype=5, addr1=client, addr2=legit_bssid, addr3=legit_bssid) / Dot11ProbeResp() / Dot11Beacon() / Dot11Elt(ID="SSID", info=legit_ssid.encode()))
    frames.append(RadioTap() / Dot11(type=0, subtype=5, addr1=client, addr2=rogue_bssid, addr3=rogue_bssid) / Dot11ProbeResp() / Dot11Beacon() / Dot11Elt(ID="SSID", info=legit_ssid.encode()))
    # Client associates to rogue (evil twin)
    frames.append(RadioTap() / Dot11(type=0, subtype=0, addr1=rogue_bssid, addr2=client, addr3=rogue_bssid) / Dot11AssoReq(cap=0x3114) / Dot11Elt(ID="SSID", info=legit_ssid.encode()))
    frames.append(RadioTap() / Dot11(type=0, subtype=1, addr1=client, addr2=rogue_bssid, addr3=rogue_bssid) / Dot11AssoResp(cap=0x3114, status=0, AID=1))

    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] Rogue AP PCAP: {output} ({len(frames)} frames) — Legit {legit_bssid} Ch6 vs Rogue {rogue_bssid} Ch11 same SSID")

def generate_captive_portal(output: Path):
    frames = []
    bssid = "AA:BB:CC:DD:EE:FF"
    client = "11:22:33:44:55:66"
    ssid = "Guest-WLAN"
    channel = 6

    # Beacon open
    frames.append(beacon(ssid, bssid, channel, "Open"))
    # Client assoc open
    frames.append(RadioTap() / Dot11(type=0, subtype=0, addr1=bssid, addr2=client, addr3=bssid) / Dot11AssoReq(cap=0x2104) / Dot11Elt(ID="SSID", info=ssid.encode()))
    frames.append(RadioTap() / Dot11(type=0, subtype=1, addr1=client, addr2=bssid, addr3=bssid) / Dot11AssoResp(cap=0x2104, status=0, AID=1))
    # Data frames with HTTP captive portal redirect (simplified as LLC/SNAP/IP/TCP/HTTP)
    # HTTP GET example.com -> 302 redirect to portal
    # We'll create data frames with LLC/SNAP/IP/TCP/Raw HTTP
    # Client -> AP data
    dot11 = Dot11(type=2, subtype=8, addr1=bssid, addr2=client, addr3=bssid)
    http_get = b"GET / HTTP/1.1\r\nHost: example.com\r\n\r\n"
    frames.append(RadioTap() / dot11 / LLC() / SNAP() / IP(src="192.168.1.100", dst="93.184.216.34") / TCP(dport=80) / Raw(load=http_get))
    # AP -> Client data with redirect
    dot11 = Dot11(type=2, subtype=8, addr1=client, addr2=bssid, addr3=bssid)
    http_redirect = b"HTTP/1.1 302 Found\r\nLocation: https://portal.guest.com/login\r\n\r\n"
    frames.append(RadioTap() / dot11 / LLC() / SNAP() / IP(src="192.168.1.1", dst="192.168.1.100") / TCP(sport=80) / Raw(load=http_redirect))
    # Login POST over HTTP (weak)
    dot11 = Dot11(type=2, subtype=8, addr1=bssid, addr2=client, addr3=bssid)
    http_post = b"POST /login HTTP/1.1\r\nHost: portal.guest.com\r\n\r\nusername=guest&password=guest123"
    frames.append(RadioTap() / dot11 / LLC() / SNAP() / IP(src="192.168.1.100", dst="192.168.1.1") / TCP(dport=80) / Raw(load=http_post))

    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] Captive Portal PCAP: {output} ({len(frames)} frames) — Open assoc + HTTP redirect + login")

def main():
    generate_deauth(CONTENT_PCAP / "deauth" / "deauth.pcapng")
    generate_deauth(FRONTEND_PCAP / "deauth" / "deauth.pcapng")
    
    generate_rogue_ap(CONTENT_PCAP / "rogue" / "rogue-ap.pcapng")
    generate_rogue_ap(FRONTEND_PCAP / "rogue" / "rogue-ap.pcapng")
    
    generate_captive_portal(CONTENT_PCAP / "captive" / "captive-portal.pcapng")
    generate_captive_portal(FRONTEND_PCAP / "captive" / "captive-portal.pcapng")
    
    print("\n[+] Phase E PCAPs generated")

if __name__ == "__main__":
    main()

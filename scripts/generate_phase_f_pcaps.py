#!/usr/bin/env python3
"""
WiFiForge Phase F — Enterprise, EAP, RADIUS, Corporate Attacks, Methodology PCAP Generator
"""

from pathlib import Path
from scapy.all import (
    Dot11, Dot11Beacon, Dot11Elt, Dot11ProbeReq, Dot11ProbeResp,
    Dot11Auth, Dot11AssoReq, Dot11AssoResp, Dot11Deauth, Dot11Disas,
    RadioTap, wrpcap, LLC, SNAP, EAP, EAPOL
)
import os

REPO_ROOT = Path(__file__).parent.parent
CONTENT_PCAP = REPO_ROOT / "content" / "pcaps"
FRONTEND_PCAP = REPO_ROOT / "frontend" / "public" / "pcaps"

def ensure_dir(p: Path):
    p.parent.mkdir(parents=True, exist_ok=True)

def beacon_enterprise(ssid, bssid, channel):
    dot11 = Dot11(type=0, subtype=8, addr1="ff:ff:ff:ff:ff:ff", addr2=bssid, addr3=bssid)
    beacon = Dot11Beacon(cap=0x3114)
    essid = Dot11Elt(ID="SSID", info=ssid.encode())
    rates = Dot11Elt(ID="Rates", info=b'\x82\x84\x8b\x96\x0c\x12\x18\x24')
    channel_elt = Dot11Elt(ID="DSset", info=bytes([channel]))
    # RSN for WPA2-EAP CCMP
    rsn_info = b"\x01\x00\x00\x0f\xac\x04\x01\x00\x00\x0f\xac\x04\x01\x00\x00\x0f\xac\x01\x00\x00"
    rsn = Dot11Elt(ID="RSNinfo", info=rsn_info)
    return RadioTap() / dot11 / beacon / essid / rates / channel_elt / rsn

def beacon_open(ssid, bssid, channel):
    dot11 = Dot11(type=0, subtype=8, addr1="ff:ff:ff:ff:ff:ff", addr2=bssid, addr3=bssid)
    beacon = Dot11Beacon(cap=0x3114)
    essid = Dot11Elt(ID="SSID", info=ssid.encode())
    rates = Dot11Elt(ID="Rates", info=b'\x82\x84\x8b\x96\x0c\x12\x18\x24')
    channel_elt = Dot11Elt(ID="DSset", info=bytes([channel]))
    return RadioTap() / dot11 / beacon / essid / rates / channel_elt

def beacon_psk(ssid, bssid, channel, wps=False):
    dot11 = Dot11(type=0, subtype=8, addr1="ff:ff:ff:ff:ff:ff", addr2=bssid, addr3=bssid)
    beacon = Dot11Beacon(cap=0x3114)
    essid = Dot11Elt(ID="SSID", info=ssid.encode())
    rates = Dot11Elt(ID="Rates", info=b'\x82\x84\x8b\x96\x0c\x12\x18\x24')
    channel_elt = Dot11Elt(ID="DSset", info=bytes([channel]))
    rsn_info = b"\x01\x00\x00\x0f\xac\x04\x01\x00\x00\x0f\xac\x04\x01\x00\x00\x0f\xac\x02\x00\x00"
    rsn = Dot11Elt(ID="RSNinfo", info=rsn_info)
    if wps:
        wps_data = b"\x00\x50\xf2\x04\x10\x4a\x00\x01\x10\x10\x3a\x00\x01\x01"
        wps_elt = Dot11Elt(ID=221, info=wps_data)
        return RadioTap() / dot11 / beacon / essid / rates / channel_elt / rsn / wps_elt
    return RadioTap() / dot11 / beacon / essid / rates / channel_elt / rsn

def eapol_frame(bssid, client, msg_num):
    if msg_num % 2 == 1:
        dot11 = Dot11(type=2, subtype=8, addr1=client, addr2=bssid, addr3=bssid)
    else:
        dot11 = Dot11(type=2, subtype=8, addr1=bssid, addr2=client, addr3=bssid)
    key_infos = {1: 0x008a, 2: 0x010a, 3: 0x13ca, 4: 0x030a}
    key_info = key_infos.get(msg_num, 0x008a)
    anonce = bytes.fromhex("aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899")
    snonce = bytes.fromhex("112233445566778899aabbccddeeff112233445566778899aabbccddeeff00")
    nonce = anonce if msg_num in [1,3] else snonce
    eapol = (
        b'\x02\x03\x00\x5f' +
        key_info.to_bytes(2, 'big') +
        b'\x00\x10' +
        msg_num.to_bytes(8, 'big') +
        nonce +
        b'\x00'*16 + b'\x00'*8 + b'\x00'*8 + b'\x00'*16 +
        b'\x00\x00'
    )
    return RadioTap() / dot11 / LLC() / SNAP() / eapol

def generate_enterprise(output: Path):
    frames = []
    bssid = "AA:BB:CC:DD:EE:FF"
    client = "11:22:33:44:55:66"
    ssid = "Corp-Enterprise"
    channel = 6
    frames.append(beacon_enterprise(ssid, bssid, channel))
    # Assoc open (Enterprise has open assoc, then 802.1X)
    frames.append(RadioTap() / Dot11(type=0, subtype=0, addr1=bssid, addr2=client, addr3=bssid) / Dot11AssoReq(cap=0x3114, listen_interval=10) / Dot11Elt(ID="SSID", info=ssid.encode()))
    frames.append(RadioTap() / Dot11(type=0, subtype=1, addr1=client, addr2=bssid, addr3=bssid) / Dot11AssoResp(cap=0x3114, status=0, AID=1))
    # EAPOL Start
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid, addr2=client, addr3=bssid) / LLC() / SNAP() / EAPOL(version=2, type=1))
    # EAP Request Identity
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=client, addr2=bssid, addr3=bssid) / LLC() / SNAP() / EAP(code=1, id=1, type=1))
    # EAP Response Identity user@corp.com
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid, addr2=client, addr3=bssid) / LLC() / SNAP() / EAP(code=2, id=1, type=1) / b"user@corp.com")
    # PEAP Start (EAP type 25)
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=client, addr2=bssid, addr3=bssid) / LLC() / SNAP() / EAP(code=1, id=2, type=25))
    # PEAP TLS ClientHello etc simulated as EAP
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid, addr2=client, addr3=bssid) / LLC() / SNAP() / EAP(code=2, id=2, type=25) / b"TLS ClientHello")
    # EAP Success
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=client, addr2=bssid, addr3=bssid) / LLC() / SNAP() / EAP(code=3, id=3))
    # 4-way handshake (PMK from MSK)
    for i in range(1,5):
        frames.append(eapol_frame(bssid, client, i))
    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] Enterprise PCAP: {output} ({len(frames)} frames) — {ssid} EAP PEAP user@corp.com")

def generate_eap(output: Path):
    frames = []
    bssid = "AA:BB:CC:DD:EE:FF"
    client = "11:22:33:44:55:66"
    ssid = "Corp-Enterprise"
    channel = 6
    frames.append(beacon_enterprise(ssid, bssid, channel))
    frames.append(RadioTap() / Dot11(type=0, subtype=0, addr1=bssid, addr2=client, addr3=bssid) / Dot11AssoReq(cap=0x3114, listen_interval=10) / Dot11Elt(ID="SSID", info=ssid.encode()))
    frames.append(RadioTap() / Dot11(type=0, subtype=1, addr1=client, addr2=bssid, addr3=bssid) / Dot11AssoResp(cap=0x3114, status=0, AID=1))
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid, addr2=client, addr3=bssid) / LLC() / SNAP() / EAPOL(version=2, type=1))
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=client, addr2=bssid, addr3=bssid) / LLC() / SNAP() / EAP(code=1, id=1, type=1))
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid, addr2=client, addr3=bssid) / LLC() / SNAP() / EAP(code=2, id=1, type=1) / b"user@corp.com")
    # PEAP MSCHAPv2 Challenge/Response inside TLS (simulated)
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=client, addr2=bssid, addr3=bssid) / LLC() / SNAP() / EAP(code=1, id=2, type=25) / b"MSCHAPv2 Challenge")
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid, addr2=client, addr3=bssid) / LLC() / SNAP() / EAP(code=2, id=2, type=25) / b"MSCHAPv2 Response")
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=client, addr2=bssid, addr3=bssid) / LLC() / SNAP() / EAP(code=3, id=3))
    for i in range(1,5):
        frames.append(eapol_frame(bssid, client, i))
    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] EAP PCAP: {output} ({len(frames)} frames) — PEAP MSCHAPv2 user@corp.com")

def generate_radius(output: Path):
    frames = []
    bssid = "AA:BB:CC:DD:EE:FF"
    client = "11:22:33:44:55:66"
    ssid = "Corp-Enterprise"
    channel = 6
    frames.append(beacon_enterprise(ssid, bssid, channel))
    frames.append(RadioTap() / Dot11(type=0, subtype=0, addr1=bssid, addr2=client, addr3=bssid) / Dot11AssoReq(cap=0x3114, listen_interval=10) / Dot11Elt(ID="SSID", info=ssid.encode()))
    frames.append(RadioTap() / Dot11(type=0, subtype=1, addr1=client, addr2=bssid, addr3=bssid) / Dot11AssoResp(cap=0x3114, status=0, AID=1))
    # EAP Identity
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid, addr2=client, addr3=bssid) / LLC() / SNAP() / EAP(code=2, id=1, type=1) / b"user@corp.com")
    # RADIUS Access-Request simulated as EAP + Data
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid, addr2=client, addr3=bssid) / LLC() / SNAP() / b"\x01\x01\x00\x20RADIUS Access-Request user@corp.com NAS 192.168.1.1")
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=client, addr2=bssid, addr3=bssid) / LLC() / SNAP() / b"\x02\x02\x00\x20RADIUS Access-Challenge MSCHAPv2 Challenge")
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid, addr2=client, addr3=bssid) / LLC() / SNAP() / b"\x01\x03\x00\x20RADIUS Access-Request MSCHAPv2 Response")
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=client, addr2=bssid, addr3=bssid) / LLC() / SNAP() / b"\x02\x03\x00\x20RADIUS Access-Accept MSK VLAN 100")
    for i in range(1,5):
        frames.append(eapol_frame(bssid, client, i))
    # Accounting Start
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid, addr2=client, addr3=bssid) / LLC() / SNAP() / b"\x04\x04\x00\x10RADIUS Accounting-Request Start")
    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] RADIUS PCAP: {output} ({len(frames)} frames) — Access-Request/Accept VLAN 100")

def generate_corporate_attacks(output: Path):
    frames = []
    # Beacons 3 SSIDs
    bssid_ent = "AA:BB:CC:DD:EE:FF"
    bssid_guest = "BB:CC:DD:EE:FF:00"
    bssid_iot = "CC:DD:EE:FF:00:11"
    bssid_rogue = "11:22:33:44:55:66"
    frames.append(beacon_enterprise("Corp-Enterprise", bssid_ent, 6))
    frames.append(beacon_open("Corp-Guest", bssid_guest, 11))
    frames.append(beacon_psk("IoT-PSK", bssid_iot, 1, wps=True))
    # Rogue clones Enterprise
    frames.append(beacon_enterprise("Corp-Enterprise", bssid_rogue, 11))
    # Clients
    client_ent = "11:22:33:44:55:66"
    client_guest = "22:33:44:55:66:77"
    client_iot = "33:44:55:66:77:88"
    # Deauth to force reconnect to rogue (if PMF not required)
    frames.append(RadioTap() / Dot11(type=0, subtype=12, addr1=client_ent, addr2=bssid_ent, addr3=bssid_ent) / Dot11Deauth(reason=7))
    frames.append(RadioTap() / Dot11(type=0, subtype=12, addr1=client_ent, addr2=bssid_ent, addr3=bssid_ent) / Dot11Deauth(reason=7))
    # Client assoc to rogue
    frames.append(RadioTap() / Dot11(type=0, subtype=0, addr1=bssid_rogue, addr2=client_ent, addr3=bssid_rogue) / Dot11AssoReq(cap=0x3114, listen_interval=10) / Dot11Elt(ID="SSID", info=b"Corp-Enterprise"))
    frames.append(RadioTap() / Dot11(type=0, subtype=1, addr1=client_ent, addr2=bssid_rogue, addr3=bssid_rogue) / Dot11AssoResp(cap=0x3114, status=0, AID=1))
    # EAP Identity + MSCHAPv2
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid_rogue, addr2=client_ent, addr3=bssid_rogue) / LLC() / SNAP() / EAP(code=2, id=1, type=1) / b"user@corp.com")
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=client_ent, addr2=bssid_rogue, addr3=bssid_rogue) / LLC() / SNAP() / EAP(code=1, id=2, type=25) / b"MSCHAPv2 Challenge")
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid_rogue, addr2=client_ent, addr3=bssid_rogue) / LLC() / SNAP() / EAP(code=2, id=2, type=25) / b"MSCHAPv2 Response")
    # Guest clients can ping each other (isolation disabled)
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid_guest, addr2=client_guest, addr3=bssid_guest) / LLC() / SNAP() / b"ARP Request Guest client 22:33:44:55:66:77 to 33:44:55:66:77:88")
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=client_guest, addr2=bssid_guest, addr3=bssid_guest) / LLC() / SNAP() / b"ARP Reply")
    # Segmentation bypass: Corp VLAN 100 ping Guest VLAN 200
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid_ent, addr2=client_ent, addr3=bssid_ent) / LLC() / SNAP() / b"ICMP Ping Corp VLAN 100 192.168.100.10 to Guest VLAN 200 192.168.200.10 Success - ACL misconfigured")
    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] Corporate Attacks PCAP: {output} ({len(frames)} frames) — 3 SSIDs + rogue + segmentation + isolation bypass")

def generate_methodology(output: Path):
    frames = []
    # Combine many previous: WPS, weak PSK, PMF disabled, transition, PEAP no cert, RADIUS weak secret, open no isolation, captive MAC bypass, rogue, segmentation
    bssid1 = "AA:BB:CC:DD:EE:FF"  # Enterprise
    bssid2 = "BB:CC:DD:EE:FF:00"  # Guest Open
    bssid3 = "CC:DD:EE:FF:00:11"  # IoT PSK weak WPS
    bssid4 = "DD:EE:FF:00:11:22"  # Hidden LAB
    bssid5 = "EE:FF:00:11:22:33"  # WPA3 TRANS
    bssid6 = "FF:00:11:22:33:44"  # WPS
    bssid_rogue = "11:22:33:44:55:66"
    frames.append(beacon_enterprise("Corp-Enterprise", bssid1, 6))
    frames.append(beacon_open("Corp-Guest", bssid2, 11))
    frames.append(beacon_psk("IoT-PSK", bssid3, 1, wps=True))
    frames.append(beacon_psk("HIDDEN-LAB", bssid4, 6, wps=True))
    frames.append(beacon_enterprise("LAB-WPA3-TRANS", bssid5, 36))  # Actually transition but use enterprise beacon for simplicity
    frames.append(beacon_psk("LAB-WPS", bssid6, 6, wps=True))
    frames.append(beacon_enterprise("Corp-Enterprise", bssid_rogue, 11))  # Rogue
    # Clients
    client1 = "11:22:33:44:55:66"
    client2 = "22:33:44:55:66:77"
    client3 = "33:44:55:66:77:88"
    client4 = "44:55:66:77:88:99"
    client5 = "55:66:77:88:99:AA"
    # Probe req for hidden
    frames.append(RadioTap() / Dot11(type=0, subtype=4, addr1="ff:ff:ff:ff:ff:ff", addr2=client3, addr3="ff:ff:ff:ff:ff:ff") / Dot11ProbeReq() / Dot11Elt(ID="SSID", info=b"HIDDEN-LAB"))
    frames.append(RadioTap() / Dot11(type=0, subtype=5, addr1=client3, addr2=bssid4, addr3=bssid4) / Dot11ProbeResp() / Dot11Beacon() / Dot11Elt(ID="SSID", info=b"HIDDEN-LAB"))
    # Deauth
    frames.append(RadioTap() / Dot11(type=0, subtype=12, addr1=client1, addr2=bssid1, addr3=bssid1) / Dot11Deauth(reason=7))
    # Assoc to rogue
    frames.append(RadioTap() / Dot11(type=0, subtype=0, addr1=bssid_rogue, addr2=client1, addr3=bssid_rogue) / Dot11AssoReq(cap=0x3114, listen_interval=10) / Dot11Elt(ID="SSID", info=b"Corp-Enterprise"))
    frames.append(RadioTap() / Dot11(type=0, subtype=1, addr1=client1, addr2=bssid_rogue, addr3=bssid_rogue) / Dot11AssoResp(cap=0x3114, status=0, AID=1))
    # EAP Identity + MSCHAPv2
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid_rogue, addr2=client1, addr3=bssid_rogue) / LLC() / SNAP() / EAP(code=2, id=1, type=1) / b"user@corp.com")
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=client1, addr2=bssid_rogue, addr3=bssid_rogue) / LLC() / SNAP() / EAP(code=1, id=2, type=25) / b"MSCHAPv2 Challenge")
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid_rogue, addr2=client1, addr3=bssid_rogue) / LLC() / SNAP() / EAP(code=2, id=2, type=25) / b"MSCHAPv2 Response")
    # EAPOL handshake for IoT PSK weak
    for i in range(1,5):
        frames.append(eapol_frame(bssid3, client3, i))
    # WPS IE already in beacons
    # Captive portal HTTP
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid2, addr2=client2, addr3=bssid2) / LLC() / SNAP() / b"HTTP GET example.com")
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=client2, addr2=bssid2, addr3=bssid2) / LLC() / SNAP() / b"HTTP 302 redirect portal.guest.com/login")
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid2, addr2=client2, addr3=bssid2) / LLC() / SNAP() / b"HTTP POST login over HTTP")
    # Segmentation bypass
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid1, addr2=client1, addr3=bssid1) / LLC() / SNAP() / b"ICMP Ping Corp VLAN 100 to Guest VLAN 200 Success")
    # Isolation bypass
    frames.append(RadioTap() / Dot11(type=2, subtype=8, addr1=bssid2, addr2=client2, addr3=bssid2) / LLC() / SNAP() / b"ARP Request Guest isolation disabled")
    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] Methodology PCAP: {output} ({len(frames)} frames) — Final assessment combined")

def main():
    generate_enterprise(CONTENT_PCAP / "enterprise" / "enterprise.pcapng")
    generate_enterprise(FRONTEND_PCAP / "enterprise" / "enterprise.pcapng")

    generate_eap(CONTENT_PCAP / "eap" / "eap.pcapng")
    generate_eap(FRONTEND_PCAP / "eap" / "eap.pcapng")

    generate_radius(CONTENT_PCAP / "radius" / "radius.pcapng")
    generate_radius(FRONTEND_PCAP / "radius" / "radius.pcapng")

    generate_corporate_attacks(CONTENT_PCAP / "corporate" / "corporate-attacks.pcapng")
    generate_corporate_attacks(FRONTEND_PCAP / "corporate" / "corporate-attacks.pcapng")

    generate_methodology(CONTENT_PCAP / "methodology" / "methodology.pcapng")
    generate_methodology(FRONTEND_PCAP / "methodology" / "methodology.pcapng")

    print("\n[+] Phase F PCAPs generated")

if __name__ == "__main__":
    main()

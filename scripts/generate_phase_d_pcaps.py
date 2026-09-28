#!/usr/bin/env python3
"""
WiFiForge Phase D — WPA/WPA2/WPA3/WPS PCAP Generator
"""

from pathlib import Path
from scapy.all import (
    Dot11, Dot11Beacon, Dot11Elt, Dot11ProbeReq, Dot11ProbeResp,
    Dot11Auth, Dot11AssoReq, Dot11AssoResp, RadioTap, wrpcap,
    LLC, SNAP
)
import os

REPO_ROOT = Path(__file__).parent.parent
CONTENT_PCAP = REPO_ROOT / "content" / "pcaps"
FRONTEND_PCAP = REPO_ROOT / "frontend" / "public" / "pcaps"

def ensure_dir(p: Path):
    p.parent.mkdir(parents=True, exist_ok=True)

def beacon_wpa2(ssid, bssid, channel):
    dot11 = Dot11(type=0, subtype=8, addr1="ff:ff:ff:ff:ff:ff", addr2=bssid, addr3=bssid)
    beacon = Dot11Beacon(cap=0x3114)
    essid = Dot11Elt(ID="SSID", info=ssid.encode())
    rates = Dot11Elt(ID="Rates", info=b'\x82\x84\x8b\x96\x0c\x12\x18\x24')
    channel_elt = Dot11Elt(ID="DSset", info=bytes([channel]))
    # RSN IE for WPA2-PSK CCMP
    rsn_info = (
        b"\x01\x00"
        b"\x00\x0f\xac\x04"
        b"\x01\x00"
        b"\x00\x0f\xac\x04"
        b"\x01\x00"
        b"\x00\x0f\xac\x02"
        b"\x00\x00"
    )
    rsn = Dot11Elt(ID="RSNinfo", info=rsn_info)
    return RadioTap() / dot11 / beacon / essid / rates / channel_elt / rsn

def beacon_wpa2_wps(ssid, bssid, channel):
    dot11 = Dot11(type=0, subtype=8, addr1="ff:ff:ff:ff:ff:ff", addr2=bssid, addr3=bssid)
    beacon = Dot11Beacon(cap=0x3114)
    essid = Dot11Elt(ID="SSID", info=ssid.encode())
    rates = Dot11Elt(ID="Rates", info=b'\x82\x84\x8b\x96\x0c\x12\x18\x24')
    channel_elt = Dot11Elt(ID="DSset", info=bytes([channel]))
    rsn_info = b"\x01\x00\x00\x0f\xac\x04\x01\x00\x00\x0f\xac\x04\x01\x00\x00\x0f\xac\x02\x00\x00"
    rsn = Dot11Elt(ID="RSNinfo", info=rsn_info)
    # WPS IE (221 = vendor specific, OUI 00:50:F2:04)
    wps_data = b"\x00\x50\xf2\x04\x10\x4a\x00\x01\x10\x10\x3a\x00\x01\x01\x10\x08\x00\x02\x00\x00"
    wps = Dot11Elt(ID=221, info=wps_data)
    return RadioTap() / dot11 / beacon / essid / rates / channel_elt / rsn / wps

def beacon_wpa3_transition(ssid, bssid, channel):
    """WPA3 transition mode: WPA2 + WPA3 in same beacon, PMF optional"""
    dot11 = Dot11(type=0, subtype=8, addr1="ff:ff:ff:ff:ff:ff", addr2=bssid, addr3=bssid)
    beacon = Dot11Beacon(cap=0x3114)
    essid = Dot11Elt(ID="SSID", info=ssid.encode())
    rates = Dot11Elt(ID="Rates", info=b'\x82\x84\x8b\x96\x0c\x12\x18\x24')
    channel_elt = Dot11Elt(ID="DSset", info=bytes([channel]))
    # RSN for WPA2-PSK (transition)
    rsn_wpa2 = Dot11Elt(ID="RSNinfo", info=b"\x01\x00\x00\x0f\xac\x04\x01\x00\x00\x0f\xac\x04\x01\x00\x00\x0f\xac\x02\x00\x00")
    # RSN for WPA3-SAE (akm 8 = SAE)
    rsn_wpa3 = Dot11Elt(ID="RSNinfo", info=b"\x01\x00\x00\x0f\xac\x04\x01\x00\x00\x0f\xac\x04\x01\x00\x00\x0f\xac\x08\x0c\x00")
    # Extended capabilities for PMF optional
    return RadioTap() / dot11 / beacon / essid / rates / channel_elt / rsn_wpa2 / rsn_wpa3

def beacon_wpa3_only(ssid, bssid, channel):
    dot11 = Dot11(type=0, subtype=8, addr1="ff:ff:ff:ff:ff:ff", addr2=bssid, addr3=bssid)
    beacon = Dot11Beacon(cap=0x3114)
    essid = Dot11Elt(ID="SSID", info=ssid.encode())
    rates = Dot11Elt(ID="Rates", info=b'\x82\x84\x8b\x96\x0c\x12\x18\x24')
    channel_elt = Dot11Elt(ID="DSset", info=bytes([channel]))
    rsn_wpa3 = Dot11Elt(ID="RSNinfo", info=b"\x01\x00\x00\x0f\xac\x04\x01\x00\x00\x0f\xac\x04\x01\x00\x00\x0f\xac\x08\x0c\x00")
    return RadioTap() / dot11 / beacon / essid / rates / channel_elt / rsn_wpa3

def eapol_frame(bssid, client, msg_num, anonce=None, snonce=None):
    """Create EAPOL frame M1-M4"""
    # Simplified EAPOL key frame
    # M1: AP->Client ANonce
    # M2: Client->AP SNonce+MIC
    # M3: AP->Client GTK+MIC
    # M4: Client->AP ACK
    if msg_num % 2 == 1:
        # AP -> Client
        dot11 = Dot11(type=2, subtype=8, addr1=client, addr2=bssid, addr3=bssid)
    else:
        dot11 = Dot11(type=2, subtype=8, addr1=bssid, addr2=client, addr3=bssid)
    
    # EAPOL payload: version, type, length, key info, etc.
    # Key info bits: M1: 0x008a, M2: 0x010a, M3: 0x13ca, M4: 0x030a (simplified)
    key_infos = {1: 0x008a, 2: 0x010a, 3: 0x13ca, 4: 0x030a}
    key_info = key_infos.get(msg_num, 0x008a)
    
    # Generate fake nonces
    if anonce is None:
        anonce = bytes.fromhex("aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899")
    if snonce is None:
        snonce = bytes.fromhex("112233445566778899aabbccddeeff112233445566778899aabbccddeeff00")
    
    nonce = anonce if msg_num in [1,3] else snonce
    
    # EAPOL frame: version 2, type 3 (key), length 95, key info, key length, replay counter, nonce, etc.
    eapol = (
        b'\x02\x03\x00\x5f' +  # version 2, type 3, length 95
        key_info.to_bytes(2, 'big') +
        b'\x00\x10' +  # key length
        msg_num.to_bytes(8, 'big') +  # replay counter
        nonce +
        b'\x00' * 16 +  # IV
        b'\x00' * 8 +   # RSC
        b'\x00' * 8 +   # ID
        b'\x00' * 16 +  # MIC (fake)
        b'\x00\x00'      # key data length
    )
    
    return RadioTap() / dot11 / LLC() / SNAP() / eapol

def generate_wpa2_handshake(output: Path):
    frames = []
    bssid = "AA:BB:CC:DD:EE:FF"
    client = "11:22:33:44:55:66"
    ssid = "LAB-WPA2"
    channel = 6
    
    frames.append(beacon_wpa2(ssid, bssid, channel))
    # Client probe
    dot11 = Dot11(type=0, subtype=4, addr1="ff:ff:ff:ff:ff:ff", addr2=client, addr3="ff:ff:ff:ff:ff:ff")
    frames.append(RadioTap() / dot11 / Dot11ProbeReq() / Dot11Elt(ID="SSID", info=ssid.encode()))
    frames.append(RadioTap() / Dot11(type=0, subtype=5, addr1=client, addr2=bssid, addr3=bssid) / Dot11ProbeResp() / Dot11Beacon() / Dot11Elt(ID="SSID", info=ssid.encode()))
    # Auth
    frames.append(RadioTap() / Dot11(type=0, subtype=11, addr1=bssid, addr2=client, addr3=bssid) / Dot11Auth(algo=0, seqnum=1, status=0))
    frames.append(RadioTap() / Dot11(type=0, subtype=11, addr1=client, addr2=bssid, addr3=bssid) / Dot11Auth(algo=0, seqnum=2, status=0))
    # Assoc
    frames.append(RadioTap() / Dot11(type=0, subtype=0, addr1=bssid, addr2=client, addr3=bssid) / Dot11AssoReq(cap=0x3114, listen_interval=10) / Dot11Elt(ID="SSID", info=ssid.encode()))
    frames.append(RadioTap() / Dot11(type=0, subtype=1, addr1=client, addr2=bssid, addr3=bssid) / Dot11AssoResp(cap=0x3114, status=0, AID=1))
    # 4-way handshake M1-M4
    for i in range(1,5):
        frames.append(eapol_frame(bssid, client, i))
    
    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] WPA2 handshake PCAP: {output} ({len(frames)} frames)")

def generate_pmkid(output: Path):
    """PMKID in RSN IE of EAPOL M1"""
    frames = []
    bssid = "AA:BB:CC:DD:EE:FF"
    client = "11:22:33:44:55:66"
    ssid = "LAB-PMKID"
    channel = 6
    
    frames.append(beacon_wpa2(ssid, bssid, channel))
    # EAPOL M1 with PMKID in key data (simplified)
    # PMKID is HMAC-SHA1-128(PMK, "PMK Name" | BSSID | STA MAC)
    # For lab, fake PMKID
    pmkid = bytes.fromhex("aabbccddeeff00112233445566778899")
    dot11 = Dot11(type=2, subtype=8, addr1=client, addr2=bssid, addr3=bssid)
    # Key data with PMKID KDE: type 0xDD, OUI 00-0F-AC, type 4, PMKID
    kde = b"\xdd\x14\x00\x0f\xac\x04" + pmkid
    eapol = (
        b'\x02\x03\x00\x7f' +
        (0x008a).to_bytes(2, 'big') +
        b'\x00\x10' +
        (1).to_bytes(8, 'big') +
        bytes.fromhex("aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899") +
        b'\x00'*16 + b'\x00'*8 + b'\x00'*8 + b'\x00'*16 +
        len(kde).to_bytes(2, 'big') +
        kde
    )
    frames.append(RadioTap() / dot11 / LLC() / SNAP() / eapol)
    
    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] PMKID PCAP: {output} ({len(frames)} frames) — PMKID: {pmkid.hex()}")

def generate_wps(output: Path):
    frames = []
    bssid = "AA:BB:CC:DD:EE:FF"
    ssid = "LAB-WPS"
    channel = 6
    frames.append(beacon_wpa2_wps(ssid, bssid, channel))
    # Probe response with WPS
    dot11 = Dot11(type=0, subtype=5, addr1="11:22:33:44:55:66", addr2=bssid, addr3=bssid)
    beacon = Dot11Beacon(cap=0x3114)
    essid = Dot11Elt(ID="SSID", info=ssid.encode())
    wps_data = b"\x00\x50\xf2\x04\x10\x4a\x00\x01\x10\x10\x3a\x00\x01\x01"
    wps = Dot11Elt(ID=221, info=wps_data)
    frames.append(RadioTap() / dot11 / Dot11ProbeResp() / beacon / essid / wps)
    
    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] WPS PCAP: {output} ({len(frames)} frames) — WPS IE present")

def generate_wpa3_transition(output: Path):
    frames = []
    bssid = "AA:BB:CC:DD:EE:FF"
    ssid = "LAB-WPA3-TRANS"
    channel = 36
    frames.append(beacon_wpa3_transition(ssid, bssid, channel))
    # Client that only supports WPA2 trying to connect (downgrade risk)
    client = "11:22:33:44:55:66"
    dot11 = Dot11(type=0, subtype=4, addr1="ff:ff:ff:ff:ff:ff", addr2=client, addr3="ff:ff:ff:ff:ff:ff")
    frames.append(RadioTap() / dot11 / Dot11ProbeReq() / Dot11Elt(ID="SSID", info=ssid.encode()))
    
    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] WPA3 transition PCAP: {output} ({len(frames)} frames) — Transition mode, PMF optional")

def generate_wpa3_only(output: Path):
    frames = []
    bssid = "AA:BB:CC:DD:EE:FF"
    ssid = "LAB-WPA3"
    channel = 36
    frames.append(beacon_wpa3_only(ssid, bssid, channel))
    ensure_dir(output)
    wrpcap(str(output), frames)
    print(f"[+] WPA3-only PCAP: {output} ({len(frames)} frames) — PMF required")

def main():
    # Generate all Phase D PCAPs
    generate_wpa2_handshake(CONTENT_PCAP / "wpa2" / "wpa2-handshake.pcapng")
    generate_wpa2_handshake(FRONTEND_PCAP / "wpa2" / "wpa2-handshake.pcapng")
    
    generate_pmkid(CONTENT_PCAP / "wpa2" / "pmkid.pcapng")
    generate_pmkid(FRONTEND_PCAP / "wpa2" / "pmkid.pcapng")
    
    generate_wps(CONTENT_PCAP / "wps" / "wps-beacon.pcapng")
    generate_wps(FRONTEND_PCAP / "wps" / "wps-beacon.pcapng")
    
    generate_wpa3_transition(CONTENT_PCAP / "wpa3" / "wpa3-transition.pcapng")
    generate_wpa3_transition(FRONTEND_PCAP / "wpa3" / "wpa3-transition.pcapng")
    
    generate_wpa3_only(CONTENT_PCAP / "wpa3" / "wpa3-only.pcapng")
    generate_wpa3_only(FRONTEND_PCAP / "wpa3" / "wpa3-only.pcapng")
    
    print("\n[+] Phase D PCAPs generated")

if __name__ == "__main__":
    main()

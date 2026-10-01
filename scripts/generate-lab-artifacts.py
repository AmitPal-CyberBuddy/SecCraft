#!/usr/bin/env python3
"""
WiFiForge — lab artifact generator (deterministic, stdlib only).

Regenerates every capture under `frontend/public/pcaps/` as a **real PCAPNG**
whose frames actually decode in Wireshark/tshark, plus the offline lab data used
by the web app (GitHub Pages has no backend):

    frontend/public/pcaps/<group>/<id>.pcapng     valid radiotap + 802.11 frames
    frontend/public/lab-data/<id>.json            pre-decoded PcapData (offline-first)
    frontend/public/wordlists/wififorge-lab-psk.txt  candidate list for the audit labs
    frontend/public/pcaps/MANIFEST.md             what is real vs. synthetic + SHA256

Cryptographic material that *can* be real, is real:
  * EAPOL-Key MIC (M2/M3/M4) computed from the documented lab PSK via PMK →
    PTK → KCK (so `hcxpcapngtool` + `hashcat -m 22000` crack the lab PSK),
  * PMKID = HMAC-SHA1-128(PMK, "PMK Name" | AA | SPA),
  * RADIUS Message-Authenticator / Response Authenticator from the documented
    shared secret,
  * MS-CHAPv2 challenge/response from the documented lab password.

Cryptographic material that cannot honestly be produced offline (TLS server
certificates, SAE commit scalars, BIP MICs) is *synthetic* and is labelled as
such in MANIFEST.md and in the lab text.

Run:  python3 scripts/generate-lab-artifacts.py
"""

from __future__ import annotations

import hashlib
import json
import os
import struct
import sys
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from wififorge_labkit import (  # noqa: E402
    AKM_8021X, AKM_8021X_SHA256, AKM_OWE, AKM_PSK, AKM_PSK_SHA256, AKM_SAE, AKM_FT_PSK,
    ATTR_CALLED_STATION_ID, ATTR_CALLING_STATION_ID, ATTR_EAP_MESSAGE, ATTR_MESSAGE_AUTHENTICATOR,
    ATTR_NAS_IDENTIFIER, ATTR_NAS_IP, ATTR_STATE, ATTR_TUNNEL_MEDIUM_TYPE,
    ATTR_TUNNEL_PRIVATE_GROUP_ID, ATTR_TUNNEL_TYPE, ATTR_USER_NAME, CIPHER_CCMP_128, CIPHER_TKIP,
    EAP_FAILURE, EAP_REQUEST, EAP_RESPONSE, EAP_SUCCESS, EAP_TYPE_IDENTITY, EAP_TYPE_MSCHAPV2,
    EAP_TYPE_PEAP, EAP_TYPE_TLS, EAP_TYPE_TTLS, EAP_TYPE_WSC,
    KEYINFO_ACK, KEYINFO_ENCRYPTED_KEY_DATA, KEYINFO_INSTALL, KEYINFO_KEY_TYPE, KEYINFO_MIC,
    KEYINFO_SECURE, RSNCAP_MFPC, RSNCAP_MFPR,
    RADIUS_ACCESS_ACCEPT, RADIUS_ACCESS_CHALLENGE, RADIUS_ACCESS_REQUEST, RADIUS_ACCOUNTING_REQUEST,
    RADIUS_ACCOUNTING_RESPONSE, REASON_CLASS3_FRAME, REASON_GROUP_KEY_UPDATE, REASON_UNSPECIFIED,
    REASON_4WAY_TIMEOUT, SUBTYPE_ASSOC_REQ, SUBTYPE_ASSOC_RESP, SUBTYPE_AUTH, SUBTYPE_BEACON,
    SUBTYPE_DEAUTH, SUBTYPE_DISASSOC, SUBTYPE_NULL, SUBTYPE_PROBE_REQ, SUBTYPE_PROBE_RESP,
    WPS_CONFIG_LABEL, WPS_CONFIG_PUSHBUTTON,
    LabFrame, beacon_body, channel_to_freq, data_frame, eap, eapol_eap, eapol_key, ie_bss_load,
    ie_country, ie_ds_param, ie_ext_cap, ie_extended_rates, ie_he_cap, ie_ht_cap, ie_ht_op,
    ie_rm_enabled, ie_rsn, ie_supported_rates, ie_tx_power, ie_vht_cap, ie_vht_op, ie_wps,
    ipv4, key_data_gtk, key_data_pmkid, llc_snap, mgmt_frame, mschapv2_credentials, pmk_from_psk,
    pmkid as compute_pmkid, ptk_from_pmk, radius_attr, radius_message_authenticator,
    mschapv2_challenge, mschapv2_response, mschapv2_result,
    radius_packet, radius_response_authenticator, radius_vsa, udp, write_pcapng, analyze,
    MS_VENDOR_ID, MS_ATTR_MPPE_SEND_KEY, MS_ATTR_MPPE_RECV_KEY, WPS_CONFIG_DISPLAY,
)

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PCAP_ROOT = os.path.join(REPO, "frontend", "public", "pcaps")
DATA_ROOT = os.path.join(REPO, "frontend", "public", "lab-data")
WORDLIST = os.path.join(REPO, "frontend", "public", "wordlists", "wififorge-lab-psk.txt")

# Documented lab credentials — these are *lab* values, published on purpose so the
# learner can verify their hashcat / RADIUS results end to end.
LAB_PSK = "ForgeLab2026!"          # 13 chars, in the provided wordlist + rockyou-adjacent
LAB_PSK_WEAK = "password123"       # deliberately weak BSS used for the audit lab
LAB_EAP_USER = "corp\\a.patel"   # DOMAIN\user as sent in the MS-CHAPv2 Name field
LAB_EAP_PASSWORD = "Summer2026!"
LAB_RADIUS_SECRET_WEAK = b"testing123"
LAB_RADIUS_SECRET_STRONG = b"7c4a1f93b60d2e88a5c1f0b2d9e34716"  # 32 hex chars


@dataclass
class Lab:
    """Collects frames for one artifact with monotonic timestamps."""

    pcap_id: str
    group: str
    channel: int = 6
    start_us: int = 1_700_000_000_000_000
    signal: int = -45
    _seq: Dict[str, int] = None  # type: ignore[assignment]
    frames: List[LabFrame] = None  # type: ignore[assignment]
    _t: int = 0

    def __post_init__(self) -> None:
        self.frames = []
        self._seq = {}
        self._t = self.start_us

    # -- helpers -----------------------------------------------------------
    def seq(self, key: str) -> int:
        value = self._seq.get(key, 0)
        self._seq[key] = value + 1
        return value

    def freq(self, channel: Optional[int] = None) -> int:
        ch = channel or self.channel
        band = "2.4" if ch <= 14 else ("5" if ch <= 177 else "6")
        return channel_to_freq(ch, band)

    def add(self, data: bytes, channel: Optional[int] = None, dt_us: int = 2000,
            signal: Optional[int] = None, rate: int = 2, tsft: bool = True) -> None:
        ch = channel or self.channel
        self._t += dt_us
        from wififorge_labkit import radiotap
        radio = radiotap(self.freq(ch), signal if signal is not None else self.signal, rate,
                         tsft_us=(self._t - self.start_us) if tsft else 0)
        self.frames.append(LabFrame(data=radio + data, channel=ch, timestamp_us=self._t))

    def mgmt(self, subtype: int, addr1: bytes, addr2: bytes, addr3: bytes, body: bytes = b"",
             flags: int = 0, **kw) -> int:
        frame = mgmt_frame(subtype, addr1, addr2, addr3, body,
                           seq=self.seq(f"{addr2.hex()}{subtype}"), flags=flags)
        self.add(frame, **kw)
        return len(self.frames)

    def data(self, addr1: bytes, addr2: bytes, addr3: bytes, payload: bytes,
             to_ds: int = 0, from_ds: int = 0, protected: bool = False, qos: bool = True,
             tid: int = 0, **kw) -> int:
        frame = data_frame(addr1, addr2, addr3, payload, seq=self.seq(f"{addr2.hex()}data"),
                           to_ds=to_ds, from_ds=from_ds, protected=protected, qos=qos, tid=tid)
        self.add(frame, **kw)
        return len(self.frames)

    # -- common protocol exchanges ----------------------------------------
    def eapol_over_wifi(self, sta: bytes, ap: bytes, eapol_body: bytes, **kw) -> int:
        """STA -> AP EAPOL (ToDS)."""
        return self.data(ap, sta, ap, llc_snap(0x888E, eapol_body), to_ds=1, **kw)

    def eapol_from_ap(self, sta: bytes, ap: bytes, eapol_body: bytes, **kw) -> int:
        """AP → STA EAPOL (FromDS: addr1 = STA, addr2 = BSSID, addr3 = SA)."""
        return self.data(sta, ap, ap, llc_snap(0x888E, eapol_body), from_ds=1, **kw)

    def ip_from_ap(self, sta: bytes, ap: bytes, src: str, dst: str, payload: bytes,
                   proto: int = 17, **kw) -> int:
        return self.data(sta, ap, ap, llc_snap(0x0800, ipv4(src, dst, payload, proto)),
                         from_ds=1, **kw)

    def ip_from_sta(self, sta: bytes, ap: bytes, src: str, dst: str, payload: bytes,
                    proto: int = 17, **kw) -> int:
        return self.data(ap, sta, ap, llc_snap(0x0800, ipv4(src, dst, payload, proto)),
                         to_ds=1, **kw)  # ToDS: addr1 = BSSID, addr2 = SA, addr3 = DA


def mac(value: str) -> bytes:
    return bytes(int(part, 16) for part in value.split(":"))


def tcp(sport: int, dport: int, payload: bytes, seq: int = 1, ack: int = 1) -> bytes:
    """Minimal TCP PSH/ACK segment with a structurally valid header for lab decoding."""
    return struct.pack("!HHIIHHHH", sport, dport, seq, ack, (5 << 12) | 0x18, 65535, 0, 0) + payload


def arp_ipv4(op: int, sender_mac: bytes, sender_ip: str, target_mac: bytes, target_ip: str) -> bytes:
    """Build an Ethernet/IPv4 ARP body."""
    import ipaddress
    return (struct.pack("!HHBBH", 1, 0x0800, 6, 4, op) + sender_mac + ipaddress.IPv4Address(sender_ip).packed
            + target_mac + ipaddress.IPv4Address(target_ip).packed)


def dhcp_payload(op: int, xid: int, client_mac: bytes, message_type: int,
                 offered_ip: str = "0.0.0.0", server_ip: str = "0.0.0.0") -> bytes:
    """Build a minimally valid BOOTP/DHCP packet for offline protocol decoding."""
    import ipaddress
    yiaddr = ipaddress.IPv4Address(offered_ip).packed
    siaddr = ipaddress.IPv4Address(server_ip).packed
    header = (bytes([op, 1, 6, 0]) + struct.pack("!IHH", xid, 0, 0x8000)
              + bytes(4) + yiaddr + siaddr + bytes(4)
              + client_mac[:6].ljust(16, b"\x00") + bytes(64 + 128)
              + b"\x63\x82\x53\x63")
    options = b"\x35\x01" + bytes([message_type])
    if message_type in (2, 5):
        options += b"\x36\x04" + siaddr
    return header + options + b"\xff"


# ---------------------------------------------------------------------------
# Reusable BSS definitions
# ---------------------------------------------------------------------------

AP_ESS_1 = "00:11:22:33:44:55"
AP_ESS_2 = "00:11:22:33:44:56"
AP_HIDDEN = "aa:bb:cc:11:22:33"
AP_CORP_1 = "de:ad:be:ef:00:01"
AP_CORP_2 = "de:ad:be:ef:00:02"
AP_IOT = "cc:dd:ee:ff:00:11"
AP_ROGUE = "02:11:22:33:44:55"      # locally administered bit set
AP_WPS = "ff:00:11:22:33:44"
AP_WPS_LOCKED = "ff:00:11:22:33:45"
AP_WPA3 = "ee:ff:00:11:22:33"
AP_WPA3_ONLY = "ee:ff:00:11:22:34"
AP_DEAUTH = "aa:bb:cc:dd:ee:ff"
AP_DEAUTH_PMF = "aa:bb:cc:dd:ee:fe"
AP_OPEN = "de:ad:be:ef:00:03"
STA_1 = "12:34:56:78:9a:bc"
STA_2 = "22:33:44:55:66:77"        # flagged as locally administered (randomised MAC)
STA_3 = "33:44:55:66:77:88"
STA_4 = "44:55:66:77:88:99"
STA_5 = "55:66:77:88:99:aa"

SSID_ESS = "LAB-WIFI"
SSID_HIDDEN = "HIDDEN-LAB"
SSID_CORP = "Corp-WLAN"
SSID_GUEST = "Guest-WLAN"
SSID_IOT = "IoT-PSK"
SSID_OPEN = "LAB-OPEN"
SSID_ROGUE_CLONE = "Corp-WLAN"
SSID_WPS = "LAB-WPS"
SSID_WPA3 = "LAB-WPA3-TRANS"
SSID_WPA3_ONLY = "LAB-WPA3"
SSID_DEAUTH = "LAB-DEAUTH"
SSID_DEAUTH_PMF = "LAB-DEAUTH-PMF"


def beacon_ies(rsn: Optional[bytes] = None, wps: Optional[bytes] = None,
               band_5: bool = False, he: bool = False, rm: bool = True,
               wildcard_probe: bool = False) -> List[bytes]:
    ies: List[bytes] = []
    if rm:
        ies.append(ie_rm_enabled())
    ies.append(ie_ext_cap())
    ies.append(ie_ht_cap())
    if band_5:
        ies.append(ie_vht_cap())
        ies.append(ie_ht_op(36))
        ies.append(ie_vht_op(1, 42, 0))
    if he:
        ies.append(ie_he_cap())
    if rsn:
        ies.append(rsn)
    if wps:
        ies.append(wps)
    ies.append(ie_tx_power(20))
    ies.append(ie_bss_load(2, 31, 220))
    return ies


def bss_beacon(lab: Lab, ssid: str, bssid: str, channel: int, ies: Sequence[bytes],
               hidden: bool = False, capability: int = 0x0411, interval: int = 100,
               signal: int = -45) -> int:
    body = beacon_body("" if hidden else ssid, channel, capability=capability,
                       ies=list(ies), beacon_interval=interval)
    return lab.mgmt(SUBTYPE_BEACON, b"\xff" * 6, mac(bssid), mac(bssid), body,
                    channel=channel, signal=signal)


# ---------------------------------------------------------------------------
# Artifact builders
# ---------------------------------------------------------------------------

def build_beacon_only() -> Lab:
    """02 — beacon anatomy across bands, security variants and PMF states."""
    lab = Lab("beacon-only", "wifi-fundamentals")
    bss_beacon(lab, SSID_ESS, AP_ESS_1, 6, beacon_ies(
        rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)), signal=-42)
    bss_beacon(lab, SSID_CORP, AP_CORP_1, 36, beacon_ies(
        rsn=ie_rsn(akm=[AKM_8021X], caps=RSNCAP_MFPC | RSNCAP_MFPR), band_5=True, he=True),
        signal=-58)
    bss_beacon(lab, SSID_GUEST, AP_CORP_2, 1, beacon_ies(
        rsn=ie_rsn(akm=[AKM_OWE], caps=RSNCAP_MFPC | RSNCAP_MFPR))[:0], signal=-67)
    bss_beacon(lab, SSID_OPEN, AP_OPEN, 11, beacon_ies(rsn=None), signal=-71, interval=200)
    return lab


def build_recon_lab() -> Lab:
    """05 — five APs, an ESS, a hidden BSS revealed by probe response, PNL leakage."""
    lab = Lab("recon-lab", "recon")
    bss_beacon(lab, SSID_ESS, AP_ESS_1, 6, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)), signal=-41)
    bss_beacon(lab, SSID_ESS, AP_ESS_2, 11, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)), signal=-52)
    bss_beacon(lab, SSID_HIDDEN, AP_HIDDEN, 1, beacon_ies(
        rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)), hidden=True, signal=-63)
    bss_beacon(lab, SSID_CORP, AP_CORP_1, 36, beacon_ies(
        rsn=ie_rsn(akm=[AKM_8021X], caps=RSNCAP_MFPC | RSNCAP_MFPR), band_5=True, he=True), signal=-55)
    bss_beacon(lab, SSID_GUEST, AP_CORP_2, 6, beacon_ies(
        rsn=ie_rsn(akm=[AKM_OWE], caps=RSNCAP_MFPC | RSNCAP_MFPR)), signal=-66)
    bss_beacon(lab, SSID_OPEN, AP_OPEN, 11, beacon_ies(rsn=None), signal=-70)

    # Client 1 (STA_1) — directed probes leak the preferred network list.
    for ssid in (SSID_CORP, SSID_ESS, "HomeWiFi-2345", "Airport_Free_WiFi"):
        lab.mgmt(SUBTYPE_PROBE_REQ, b"\xff" * 6, mac(STA_1), b"\xff" * 6,
                 ie_supported_rates() + ie_extended_rates() + __import__("wififorge_labkit").ie_ssid(ssid),
                 channel=6, signal=-49)
    # Wildcard probe (no SSID IE) — how a client discovers anything nearby.
    lab.mgmt(SUBTYPE_PROBE_REQ, b"\xff" * 6, mac(STA_2), b"\xff" * 6,
             ie_supported_rates() + ie_extended_rates(), channel=6, signal=-58)
    # Client 2 (STA_2, randomised MAC) probes the hidden BSS; the AP answers with the
    # real SSID in the probe response — the hidden SSID is not a security control.
    lab.mgmt(SUBTYPE_PROBE_REQ, b"\xff" * 6, mac(STA_2), b"\xff" * 6,
             ie_supported_rates() + __import__("wififorge_labkit").ie_ssid(SSID_HIDDEN),
             channel=1, signal=-59)
    lab.mgmt(SUBTYPE_PROBE_RESP, mac(STA_2), mac(AP_HIDDEN), mac(AP_HIDDEN),
             beacon_body(SSID_HIDDEN, 1, ies=beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC))),
             channel=1, signal=-63)
    # Association flow of STA_1 against the first BSS of the ESS.
    lab.mgmt(SUBTYPE_AUTH, mac(AP_ESS_1), mac(STA_1), mac(AP_ESS_1),
             struct.pack("<HHH", 0, 1, 0), channel=6, signal=-46)
    lab.mgmt(SUBTYPE_AUTH, mac(STA_1), mac(AP_ESS_1), mac(AP_ESS_1),
             struct.pack("<HHH", 0, 2, 0), channel=6, signal=-42)
    lab.mgmt(SUBTYPE_ASSOC_REQ, mac(AP_ESS_1), mac(STA_1), mac(AP_ESS_1),
             struct.pack("<HH", 0x0411, 10) + __import__("wififorge_labkit").ie_ssid(SSID_ESS)
             + ie_supported_rates() + ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC), channel=6, signal=-46)
    lab.mgmt(SUBTYPE_ASSOC_RESP, mac(STA_1), mac(AP_ESS_1), mac(AP_ESS_1),
             struct.pack("<HHH", 0x0411, 0, 1 | 0xC000) + ie_supported_rates(),
             channel=6, signal=-42)
    return lab


def _four_way(lab: Lab, sta: bytes, ap: bytes, ssid: str, psk: str,
              include_pmkid: bool = False, complete: bool = True,
              channel: int = 6, from_ap_is_tods: bool = False) -> Dict[str, str]:
    """Real M1–M4 with MICs derived from `psk` (documented lab credential)."""
    pmk = pmk_from_psk(psk, ssid)
    anonce = hashlib.sha256(b"anonce:" + sta + ap).digest()
    snonce = hashlib.sha256(b"snonce:" + sta + ap).digest()[:32]
    ptk = ptk_from_pmk(pmk, ap, sta, anonce, snonce)
    kck = ptk[:16]
    out: Dict[str, str] = {"pmk": pmk.hex(), "ptk": ptk.hex(), "anonce": anonce.hex(), "snonce": snonce.hex()}

    key_data = key_data_pmkid(compute_pmkid(ap, sta, pmk)) if include_pmkid else b""
    m1 = eapol_key(1, anonce, KEYINFO_KEY_TYPE | KEYINFO_ACK, key_data=key_data)
    lab.eapol_from_ap(sta, ap, m1, channel=channel)

    m2 = eapol_key(1, snonce, KEYINFO_KEY_TYPE | KEYINFO_MIC, key_data=b"")
    m2_mic = __import__("wififorge_labkit").eapol_key_mic(kck, m2)
    m2 = m2[:81] + m2_mic + m2[97:]
    lab.eapol_over_wifi(sta, ap, m2, channel=channel)

    if not complete:
        return out

    gtk = hashlib.sha256(b"gtk:" + ssid.encode()).digest()[:16]
    m3 = eapol_key(2, anonce, KEYINFO_KEY_TYPE | KEYINFO_ACK | KEYINFO_MIC | KEYINFO_INSTALL
                   | KEYINFO_SECURE | KEYINFO_ENCRYPTED_KEY_DATA, key_data=key_data_gtk(gtk))
    m3_mic = __import__("wififorge_labkit").eapol_key_mic(kck, m3)
    m3 = m3[:81] + m3_mic + m3[97:]
    lab.eapol_from_ap(sta, ap, m3, channel=channel)

    m4 = eapol_key(2, b"\x00" * 32, KEYINFO_KEY_TYPE | KEYINFO_MIC | KEYINFO_SECURE, key_data=b"")
    m4_mic = __import__("wififorge_labkit").eapol_key_mic(kck, m4)
    m4 = m4[:81] + m4_mic + m4[97:]
    lab.eapol_over_wifi(sta, ap, m4, channel=channel)
    out["gtk"] = gtk.hex()
    return out


def build_traffic_analysis() -> Lab:
    """06 — full association state machine plus post-association traffic."""
    lab = Lab("traffic-analysis", "traffic")
    bss_beacon(lab, SSID_ESS, AP_ESS_1, 6, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)))
    lab.mgmt(SUBTYPE_PROBE_REQ, b"\xff" * 6, mac(STA_1), b"\xff" * 6,
             ie_supported_rates() + ie_extended_rates(), channel=6)
    lab.mgmt(SUBTYPE_PROBE_RESP, mac(STA_1), mac(AP_ESS_1), mac(AP_ESS_1),
             beacon_body(SSID_ESS, 6, ies=beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC))))
    lab.mgmt(SUBTYPE_AUTH, mac(AP_ESS_1), mac(STA_1), mac(AP_ESS_1), struct.pack("<HHH", 0, 1, 0))
    lab.mgmt(SUBTYPE_AUTH, mac(STA_1), mac(AP_ESS_1), mac(AP_ESS_1), struct.pack("<HHH", 0, 2, 0))
    lab.mgmt(SUBTYPE_ASSOC_REQ, mac(AP_ESS_1), mac(STA_1), mac(AP_ESS_1),
             struct.pack("<HH", 0x0411, 10) + __import__("wififorge_labkit").ie_ssid(SSID_ESS)
             + ie_supported_rates() + ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC))
    lab.mgmt(SUBTYPE_ASSOC_RESP, mac(STA_1), mac(AP_ESS_1), mac(AP_ESS_1),
             struct.pack("<HHH", 0x0411, 0, 1 | 0xC000) + ie_supported_rates())
    _four_way(lab, mac(STA_1), mac(AP_ESS_1), SSID_ESS, LAB_PSK)
    # DHCP (client 10.20.30.51) — DORA, then ARP + ICMP + DNS + HTTP.
    xid = 0x11223344
    discover = dhcp_payload(1, xid, mac(STA_1), 1)
    offer = dhcp_payload(2, xid, mac(STA_1), 2, "10.20.30.51", "10.20.30.1")
    request = dhcp_payload(1, xid, mac(STA_1), 3, "0.0.0.0", "10.20.30.1")
    ack = dhcp_payload(2, xid, mac(STA_1), 5, "10.20.30.51", "10.20.30.1")
    lab.ip_from_sta(mac(STA_1), mac(AP_ESS_1), "0.0.0.0", "255.255.255.255", udp(68, 67, discover))
    lab.ip_from_ap(mac(STA_1), mac(AP_ESS_1), "10.20.30.1", "255.255.255.255", udp(67, 68, offer))
    lab.ip_from_sta(mac(STA_1), mac(AP_ESS_1), "0.0.0.0", "255.255.255.255", udp(68, 67, request))
    lab.ip_from_ap(mac(STA_1), mac(AP_ESS_1), "10.20.30.1", "255.255.255.255", udp(67, 68, ack))
    lab.data(mac(AP_ESS_1), mac(STA_1), mac(AP_ESS_1),
             llc_snap(0x0806, arp_ipv4(1, mac(STA_1), "10.20.30.51", bytes(6), "10.20.30.10")), to_ds=1)  # ARP request
    lab.data(mac(STA_1), mac(AP_ESS_1), mac(AP_ESS_1),
             llc_snap(0x0806, arp_ipv4(2, mac(AP_ESS_1), "10.20.30.10", mac(STA_1), "10.20.30.51")), from_ds=1)  # ARP reply
    lab.ip_from_sta(mac(STA_1), mac(AP_ESS_1), "10.20.30.51", "10.20.30.10",
                    b"\x08\x00\xf7\xfd\x00\x01\x00\x01", proto=1)
    lab.ip_from_ap(mac(STA_1), mac(AP_ESS_1), "10.20.30.10", "10.20.30.51",
                   b"\x00\x00\xff\xfd\x00\x01\x00\x01", proto=1)
    dns_query = b"\x12\x34\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00" + b"\x03lab\x07example\x00" + b"\x00\x01\x00\x01"
    lab.ip_from_sta(mac(STA_1), mac(AP_ESS_1), "10.20.30.51", "10.20.30.1",
                    udp(51423, 53, dns_query))
    http = b"GET / HTTP/1.1\r\nHost: intranet.lab.example\r\nUser-Agent: curl/8.5.0\r\n\r\n"
    lab.data(mac(AP_ESS_1), mac(STA_1), mac(AP_ESS_1),
             llc_snap(0x0800, ipv4("10.20.30.51", "10.20.30.10", tcp(49152, 80, http), 6)), to_ds=1)
    return lab


def build_wpa2_handshake() -> Lab:
    """09 — two clients: one complete M1–M4, one truncated (M1+M2 only)."""
    lab = Lab("wpa2-handshake", "wpa2")
    bss_beacon(lab, SSID_ESS, AP_ESS_1, 6, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)))
    lab.mgmt(SUBTYPE_AUTH, mac(AP_ESS_1), mac(STA_1), mac(AP_ESS_1), struct.pack("<HHH", 0, 1, 0))
    lab.mgmt(SUBTYPE_AUTH, mac(STA_1), mac(AP_ESS_1), mac(AP_ESS_1), struct.pack("<HHH", 0, 2, 0))
    lab.mgmt(SUBTYPE_ASSOC_REQ, mac(AP_ESS_1), mac(STA_1), mac(AP_ESS_1),
             struct.pack("<HH", 0x0411, 10) + __import__("wififorge_labkit").ie_ssid(SSID_ESS)
             + ie_supported_rates() + ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC))
    lab.mgmt(SUBTYPE_ASSOC_RESP, mac(STA_1), mac(AP_ESS_1), mac(AP_ESS_1),
             struct.pack("<HHH", 0x0411, 0, 1 | 0xC000) + ie_supported_rates())
    complete = _four_way(lab, mac(STA_1), mac(AP_ESS_1), SSID_ESS, LAB_PSK)
    # Second client: only M1 + M2 captured (incomplete — no MIC check of M3/M4 possible,
    # but still sufficient for an offline audit because M2 carries the MIC).
    lab.mgmt(SUBTYPE_AUTH, mac(AP_ESS_1), mac(STA_3), mac(AP_ESS_1), struct.pack("<HHH", 0, 1, 0))
    lab.mgmt(SUBTYPE_AUTH, mac(STA_3), mac(AP_ESS_1), mac(AP_ESS_1), struct.pack("<HHH", 0, 2, 0))
    truncated = _four_way(lab, mac(STA_3), mac(AP_ESS_1), SSID_ESS, LAB_PSK, complete=False)
    lab.meta = {"ssid": SSID_ESS, "psk": LAB_PSK, "bssid": AP_ESS_1,  # type: ignore[attr-defined]
                "complete_pair": complete, "truncated_pair": truncated}
    return lab


def build_pmkid() -> Lab:
    """09 — PMKID captured in M1 without any client handshake completion."""
    lab = Lab("pmkid", "wpa2")
    bss_beacon(lab, SSID_ESS, AP_ESS_1, 6, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)))
    lab.mgmt(SUBTYPE_AUTH, mac(AP_ESS_1), mac(STA_4), mac(AP_ESS_1), struct.pack("<HHH", 0, 1, 0))
    lab.mgmt(SUBTYPE_AUTH, mac(STA_4), mac(AP_ESS_1), mac(AP_ESS_1), struct.pack("<HHH", 0, 2, 0))
    lab.mgmt(SUBTYPE_ASSOC_REQ, mac(AP_ESS_1), mac(STA_4), mac(AP_ESS_1),
             struct.pack("<HH", 0x0411, 10) + __import__("wififorge_labkit").ie_ssid(SSID_ESS)
             + ie_supported_rates() + ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC))
    lab.mgmt(SUBTYPE_ASSOC_RESP, mac(STA_4), mac(AP_ESS_1), mac(AP_ESS_1),
             struct.pack("<HHH", 0x0411, 0, 1 | 0xC000) + ie_supported_rates())
    pmk = pmk_from_psk(LAB_PSK, SSID_ESS)
    value = compute_pmkid(mac(AP_ESS_1), mac(STA_4), pmk)
    anonce = hashlib.sha256(b"anonce-pmkid:" + mac(STA_4)).digest()
    lab.eapol_from_ap(mac(STA_4), mac(AP_ESS_1),
                      eapol_key(1, anonce, KEYINFO_KEY_TYPE | KEYINFO_ACK,
                                key_data=key_data_pmkid(value)))
    lab.meta = {"pmkid": value.hex(), "psk": LAB_PSK, "pmk": pmk.hex()}  # type: ignore[attr-defined]
    return lab


def build_wps_beacon() -> Lab:
    """10 — WPS enabled + unlocked vs. WPS locked; EAP-WSC M1/M2 exchange."""
    lab = Lab("wps-beacon", "wps")
    wps_open = ie_wps(setup_locked=False, selected_registrar=True, wps_state=2,
                      config_methods=WPS_CONFIG_LABEL | WPS_CONFIG_DISPLAY | WPS_CONFIG_PUSHBUTTON)
    wps_locked = ie_wps(setup_locked=True, selected_registrar=False, wps_state=2,
                        config_methods=WPS_CONFIG_LABEL | WPS_CONFIG_PUSHBUTTON)
    bss_beacon(lab, SSID_WPS, AP_WPS, 6, beacon_ies(
        rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC), wps=wps_open), signal=-44)
    bss_beacon(lab, SSID_WPS, AP_WPS_LOCKED, 11, beacon_ies(
        rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC), wps=wps_locked), signal=-61)
    # WPS enrollee exchange (EAP-WSC) — the PIN is never sent in the clear; M1/M2 show
    # the device password id and the fact that a registrar session is possible.
    sta = mac(STA_5)
    ap = mac(AP_WPS)
    lab.mgmt(SUBTYPE_AUTH, ap, sta, ap, struct.pack("<HHH", 0, 1, 0))
    lab.mgmt(SUBTYPE_AUTH, sta, ap, ap, struct.pack("<HHH", 0, 2, 0))
    lab.mgmt(SUBTYPE_ASSOC_REQ, ap, sta, ap,
             struct.pack("<HH", 0x0411, 10) + __import__("wififorge_labkit").ie_ssid(SSID_WPS)
             + ie_supported_rates())
    lab.mgmt(SUBTYPE_ASSOC_RESP, sta, ap, ap,
             struct.pack("<HHH", 0x0411, 0, 1 | 0xC000) + ie_supported_rates())
    lab.eapol_over_wifi(sta, ap, eapol_eap(eap(EAP_RESPONSE, 1, EAP_TYPE_IDENTITY, b"WFA-SimpleConfig-Enrollee-1-0")))
    wsc_ext = b"\x00\x37\x2a\x00\x00\x00\x01"
    lab.eapol_from_ap(sta, ap, eapol_eap(eap(EAP_REQUEST, 2, EAP_TYPE_WSC, wsc_ext + b"\x01\x00")))
    lab.eapol_over_wifi(sta, ap, eapol_eap(eap(EAP_RESPONSE, 2, EAP_TYPE_WSC,
        wsc_ext + b"\x04\x00" + struct.pack("!HH", 0x104A, 1) + b"\x10" + struct.pack("!HH", 0x1022, 1) + b"\x01" + struct.pack("!HH", 0x1012, 2) + struct.pack("!H", 0x0004))))
    return lab


def build_wpa3_transition() -> Lab:
    """11 — transition-mode RSNE and a PSK handshake example; no induced downgrade is demonstrated."""
    lab = Lab("wpa3-transition", "wpa3")
    rsn = ie_rsn(akm=[AKM_PSK, AKM_SAE], caps=RSNCAP_MFPC)
    bss_beacon(lab, SSID_WPA3, AP_WPA3, 36, beacon_ies(rsn=rsn, band_5=True, he=True))
    # Synthetic SAE-labeled authentication frames (commit/confirm-shaped, not a valid DH exchange).
    sta, ap = mac(STA_2), mac(AP_WPA3)
    sae_commit = struct.pack("<H", 19) + b"\x01" * 32 + b"\x02" * 64   # synthetic scalar/element (documented)
    sae_confirm = struct.pack("<H", 1) + b"\x03" * 32
    lab.mgmt(SUBTYPE_AUTH, ap, sta, ap, struct.pack("<HHH", 3, 1, 0) + sae_commit, channel=36)
    lab.mgmt(SUBTYPE_AUTH, sta, ap, ap, struct.pack("<HHH", 3, 1, 0) + sae_commit, channel=36)
    lab.mgmt(SUBTYPE_AUTH, ap, sta, ap, struct.pack("<HHH", 3, 2, 0) + sae_confirm, channel=36)
    lab.mgmt(SUBTYPE_AUTH, sta, ap, ap, struct.pack("<HHH", 3, 2, 0) + sae_confirm, channel=36)
    # The fixture's second station follows a PSK authentication/handshake path against the
    # same BSS; this records a PSK association, not an attacker-induced downgrade.
    sta2 = mac(STA_1)
    lab.mgmt(SUBTYPE_AUTH, ap, sta2, ap, struct.pack("<HHH", 0, 1, 0), channel=36)
    lab.mgmt(SUBTYPE_AUTH, sta2, ap, ap, struct.pack("<HHH", 0, 2, 0), channel=36)
    _four_way(lab, sta2, ap, SSID_WPA3, LAB_PSK, channel=36)
    lab.meta = {"psk": LAB_PSK, "ssid": SSID_WPA3}  # type: ignore[attr-defined]
    return lab


def build_wpa3_only() -> Lab:
    """11 — beacon advertises SAE only/MFPR; capture includes synthetic SAE-shaped frames, no PSK handshake."""
    lab = Lab("wpa3-only", "wpa3")
    rsn = ie_rsn(akm=[AKM_SAE], caps=RSNCAP_MFPC | RSNCAP_MFPR)
    bss_beacon(lab, SSID_WPA3_ONLY, AP_WPA3_ONLY, 36, beacon_ies(rsn=rsn, band_5=True, he=True))
    sta, ap = mac(STA_2), mac(AP_WPA3_ONLY)
    sae_commit = struct.pack("<H", 19) + b"\x01" * 32 + b"\x02" * 64
    sae_confirm = struct.pack("<H", 1) + b"\x03" * 32
    lab.mgmt(SUBTYPE_AUTH, ap, sta, ap, struct.pack("<HHH", 3, 1, 0) + sae_commit, channel=36)
    lab.mgmt(SUBTYPE_AUTH, sta, ap, ap, struct.pack("<HHH", 3, 1, 0) + sae_commit, channel=36)
    lab.mgmt(SUBTYPE_AUTH, ap, sta, ap, struct.pack("<HHH", 3, 2, 0) + sae_confirm, channel=36)
    lab.mgmt(SUBTYPE_AUTH, sta, ap, ap, struct.pack("<HHH", 3, 2, 0) + sae_confirm, channel=36)
    # A protected-bit/BIP-shaped deauthentication example. The MIC is synthetic (IGTK is unknown
    # to a passive listener), so it does not prove cryptographic validity or receiver acceptance.
    lab.mgmt(SUBTYPE_DEAUTH, sta, ap, ap, struct.pack("<H", REASON_GROUP_KEY_UPDATE) + b"\x00" * 16,
             flags=0x40, channel=36)
    return lab


def build_deauth() -> Lab:
    """12 — deauth/disassoc and SA Query-shaped frame examples; no receiver outcome is tested."""
    lab = Lab("deauth", "deauth")
    bss_beacon(lab, SSID_DEAUTH, AP_DEAUTH, 6, beacon_ies(
        rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)))              # capable, not required
    bss_beacon(lab, SSID_DEAUTH_PMF, AP_DEAUTH_PMF, 1, beacon_ies(
        rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC | RSNCAP_MFPR)))  # PMF required
    # 1) Broadcast deauth examples (reason 1, unspecified), with a spoofed source address.
    for _ in range(12):
        lab.mgmt(SUBTYPE_DEAUTH, b"\xff" * 6, mac(AP_DEAUTH), mac(AP_DEAUTH),
                 struct.pack("<H", REASON_UNSPECIFIED), channel=6, dt_us=1500)
    # 2) Directed deauth examples (reason 7). Their presence does not establish delivery,
    #    client acceptance, or a successful handshake-capture attack.
    lab.mgmt(SUBTYPE_DEAUTH, mac(STA_1), mac(AP_DEAUTH), mac(AP_DEAUTH),
             struct.pack("<H", REASON_CLASS3_FRAME), channel=6)
    lab.mgmt(SUBTYPE_DEAUTH, mac(STA_1), mac(AP_DEAUTH), mac(AP_DEAUTH),
             struct.pack("<H", REASON_CLASS3_FRAME), channel=6)
    # 3) Disassociation (reason 8: STA leaving BSS).
    lab.mgmt(SUBTYPE_DISASSOC, mac(STA_1), mac(AP_DEAUTH), mac(AP_DEAUTH),
             struct.pack("<H", 8), channel=6)
    # 4) A reason-15 example (4-way handshake timeout); no client log is represented.
    lab.mgmt(SUBTYPE_DEAUTH, mac(AP_DEAUTH), mac(STA_1), mac(AP_DEAUTH),
             struct.pack("<H", REASON_4WAY_TIMEOUT), channel=6)
    # 5) Include unprotected deauth examples for a BSS advertising PMF-required and two
    #    SA Query-shaped action frames. These bytes do not demonstrate receiver behavior.
    lab.mgmt(SUBTYPE_DEAUTH, mac(STA_1), mac(AP_DEAUTH_PMF), mac(AP_DEAUTH_PMF),
             struct.pack("<H", REASON_CLASS3_FRAME), channel=1)
    lab.mgmt(SUBTYPE_DEAUTH, mac(STA_1), mac(AP_DEAUTH_PMF), mac(AP_DEAUTH_PMF),
             struct.pack("<H", REASON_CLASS3_FRAME), channel=1)
    # Category-8 SA Query-shaped action request/response examples; they are synthetic and
    # do not prove a valid protected exchange or continued association.
    lab.mgmt(13, mac(STA_1), mac(AP_DEAUTH_PMF), mac(AP_DEAUTH_PMF),
             bytes([8, 0]) + b"\x01\x02", channel=1)
    lab.mgmt(13, mac(AP_DEAUTH_PMF), mac(STA_1), mac(AP_DEAUTH_PMF),
             bytes([8, 1]) + b"\x01\x02", channel=1)
    return lab


def build_rogue_ap() -> Lab:
    """13 — same-SSID look-alike and scripted client association sequence; ownership/causality are not established."""
    lab = Lab("rogue-ap", "rogue")
    legit_rsn = ie_rsn(akm=[AKM_8021X], caps=RSNCAP_MFPC | RSNCAP_MFPR)
    rogue_rsn = ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)
    bss_beacon(lab, SSID_CORP, AP_CORP_1, 36, beacon_ies(rsn=legit_rsn, band_5=True, he=True), signal=-52)
    # Same-SSID look-alike: locally administered BSSID, PSK instead of 802.1X, PMF optional,
    # 2.4 GHz, different vendor IE set and stronger simulated signal. These clues do not prove
    # unauthorized ownership or malicious intent.
    bss_beacon(lab, SSID_ROGUE_CLONE, AP_ROGUE, 6, beacon_ies(rsn=rogue_rsn), signal=-31,
               capability=0x0431, interval=50)
    # Place deauthentication and later association frames in a scripted sequence; do not
    # infer that the deauth caused the association or that an RF client received either.
    lab.mgmt(SUBTYPE_DEAUTH, mac(STA_1), mac(AP_CORP_1), mac(AP_CORP_1),
             struct.pack("<H", REASON_CLASS3_FRAME), channel=36)
    lab.mgmt(SUBTYPE_DEAUTH, mac(STA_1), mac(AP_CORP_1), mac(AP_CORP_1),
             struct.pack("<H", REASON_CLASS3_FRAME), channel=36)
    lab.mgmt(SUBTYPE_PROBE_REQ, b"\xff" * 6, mac(STA_1), b"\xff" * 6,
             ie_supported_rates() + __import__("wififorge_labkit").ie_ssid(SSID_CORP), channel=6)
    lab.mgmt(SUBTYPE_PROBE_RESP, mac(STA_1), mac(AP_ROGUE), mac(AP_ROGUE),
             beacon_body(SSID_ROGUE_CLONE, 6, ies=beacon_ies(rsn=rogue_rsn)), channel=6)
    lab.mgmt(SUBTYPE_AUTH, mac(AP_ROGUE), mac(STA_1), mac(AP_ROGUE), struct.pack("<HHH", 0, 1, 0))
    lab.mgmt(SUBTYPE_AUTH, mac(STA_1), mac(AP_ROGUE), mac(AP_ROGUE), struct.pack("<HHH", 0, 2, 0))
    lab.mgmt(SUBTYPE_ASSOC_REQ, mac(AP_ROGUE), mac(STA_1), mac(AP_ROGUE),
             struct.pack("<HH", 0x0411, 10) + __import__("wififorge_labkit").ie_ssid(SSID_ROGUE_CLONE)
             + ie_supported_rates() + rogue_rsn)
    lab.mgmt(SUBTYPE_ASSOC_RESP, mac(STA_1), mac(AP_ROGUE), mac(AP_ROGUE),
             struct.pack("<HHH", 0x0411, 0, 1 | 0xC000) + ie_supported_rates())
    if LAB_PSK_WEAK:
        _four_way(lab, mac(STA_1), mac(AP_ROGUE), SSID_ROGUE_CLONE, LAB_PSK_WEAK)
    # DHCP handed out by the rogue AP (192.168.66.0/24) and a captive portal page.
    xid = 0x22222222
    lab.ip_from_sta(mac(STA_1), mac(AP_ROGUE), "0.0.0.0", "255.255.255.255",
                    udp(68, 67, dhcp_payload(1, xid, mac(STA_1), 1)))
    lab.ip_from_ap(mac(STA_1), mac(AP_ROGUE), "192.168.66.1", "255.255.255.255",
                   udp(67, 68, dhcp_payload(2, xid, mac(STA_1), 2, "192.168.66.50", "192.168.66.1")))
    lab.ip_from_sta(mac(STA_1), mac(AP_ROGUE), "0.0.0.0", "255.255.255.255",
                    udp(68, 67, dhcp_payload(1, xid, mac(STA_1), 3, "0.0.0.0", "192.168.66.1")))
    lab.ip_from_ap(mac(STA_1), mac(AP_ROGUE), "192.168.66.1", "255.255.255.255",
                   udp(67, 68, dhcp_payload(2, xid, mac(STA_1), 5, "192.168.66.50", "192.168.66.1")))
    http_get = b"GET /portal HTTP/1.1\r\nHost: 192.168.66.1\r\n\r\n"
    lab.data(mac(AP_ROGUE), mac(STA_1), mac(AP_ROGUE),
             llc_snap(0x0800, ipv4("192.168.66.50", "192.168.66.1", tcp(49152, 80, http_get), 6)), to_ds=1)
    portal = (b"HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: 91\r\n\r\n"
              b"<form action='/login' method='POST'><input name='u'><input name='p' type='password'></form>")
    lab.data(mac(STA_1), mac(AP_ROGUE), mac(AP_ROGUE),
             llc_snap(0x0800, ipv4("192.168.66.1", "192.168.66.50", tcp(80, 49152, portal, seq=1), 6)), from_ds=1)
    return lab


def build_captive_portal() -> Lab:
    """14 — open guest network, portal redirect, cleartext credentials, no isolation."""
    lab = Lab("captive-portal", "captive")
    bss_beacon(lab, SSID_GUEST, AP_CORP_2, 6, beacon_ies(rsn=None), signal=-48)
    sta, ap = mac(STA_1), mac(AP_CORP_2)
    lab.mgmt(SUBTYPE_AUTH, ap, sta, ap, struct.pack("<HHH", 0, 1, 0))
    lab.mgmt(SUBTYPE_AUTH, sta, ap, ap, struct.pack("<HHH", 0, 2, 0))
    lab.mgmt(SUBTYPE_ASSOC_REQ, ap, sta, ap,
             struct.pack("<HH", 0x0411, 10) + __import__("wififorge_labkit").ie_ssid(SSID_GUEST)
             + ie_supported_rates())
    lab.mgmt(SUBTYPE_ASSOC_RESP, sta, ap, ap,
             struct.pack("<HHH", 0x0411, 0, 1 | 0xC000) + ie_supported_rates())
    xid = 0x33333333
    lab.ip_from_sta(sta, ap, "0.0.0.0", "255.255.255.255",
                    udp(68, 67, dhcp_payload(1, xid, sta, 1)))
    lab.ip_from_ap(sta, ap, "10.0.0.1", "255.255.255.255",
                   udp(67, 68, dhcp_payload(2, xid, sta, 2, "10.0.0.87", "10.0.0.1")))
    lab.ip_from_sta(sta, ap, "0.0.0.0", "255.255.255.255",
                    udp(68, 67, dhcp_payload(1, xid, sta, 3, "0.0.0.0", "10.0.0.1")))
    lab.ip_from_ap(sta, ap, "10.0.0.1", "255.255.255.255",
                   udp(67, 68, dhcp_payload(2, xid, sta, 5, "10.0.0.87", "10.0.0.1")))
    # Portal flow: HTTP GET → 302 redirect to the portal host → POST with cleartext creds.
    lab.data(ap, sta, ap, llc_snap(0x0800, ipv4("10.0.0.87", "1.1.1.1",
             tcp(49152, 80, b"GET / HTTP/1.1\r\nHost: connectivity-check.example\r\n\r\n"), 6)), to_ds=1)
    redirect = (b"HTTP/1.1 302 Found\r\nLocation: http://portal.guest.example/login?mac=12:34:56:78:9a:bc\r\n"
                b"Content-Length: 0\r\n\r\n")
    lab.data(sta, ap, ap, llc_snap(0x0800, ipv4("1.1.1.1", "10.0.0.87", tcp(80, 49152, redirect), 6)), from_ds=1)
    post = (b"POST /login HTTP/1.1\r\nHost: portal.guest.example\r\n"
            b"Content-Type: application/x-www-form-urlencoded\r\nContent-Length: 68\r\n\r\n"
            b"username=guest1&password=Welcome2025&mac=12%3A34%3A56%3A78%3A9a%3Abc")
    lab.data(ap, sta, ap, llc_snap(0x0800, ipv4("10.0.0.87", "10.0.0.10", tcp(49152, 80, post, seq=100), 6)), to_ds=1)
    ok = b"HTTP/1.1 200 OK\r\nSet-Cookie: session=8f14e45fceea167a5a36dedd4bea2543; Path=/\r\nContent-Length: 7\r\n\r\nWelcome"
    lab.data(sta, ap, ap, llc_snap(0x0800, ipv4("10.0.0.10", "10.0.0.87", tcp(80, 49152, ok, seq=100), 6)), from_ds=1)
    # A complete ARP request/reply is forwarded between two guest stations by the simulated AP.
    sta2 = mac("02:66:77:88:99:aa")  # unicast, locally administered test station
    arp_req = llc_snap(0x0806, arp_ipv4(1, sta, "10.0.0.87", bytes(6), "10.0.0.88"))
    arp_reply = llc_snap(0x0806, arp_ipv4(2, sta2, "10.0.0.88", sta, "10.0.0.87"))
    lab.data(ap, sta, b"\xff" * 6, arp_req, to_ds=1)
    lab.data(sta2, ap, sta, arp_req, from_ds=1)
    lab.data(ap, sta2, sta, arp_reply, to_ds=1)
    lab.data(sta, ap, sta2, arp_reply, from_ds=1)
    return lab


def radius_request(identifier: int, attrs: bytes, secret: bytes) -> bytes:
    """Deterministic teaching Access-Request; a production nonce must be unpredictable."""
    nonce = hashlib.sha256(b"fixture-radius:" + bytes([identifier]) + attrs).digest()[:16]
    placeholder = radius_attr(ATTR_MESSAGE_AUTHENTICATOR, bytes(16))
    packet = radius_packet(RADIUS_ACCESS_REQUEST, identifier, attrs + placeholder, nonce)
    ma = radius_message_authenticator(packet, secret)
    return radius_packet(RADIUS_ACCESS_REQUEST, identifier,
                         attrs + radius_attr(ATTR_MESSAGE_AUTHENTICATOR, ma), nonce)


def radius_response(identifier: int, code: int, attrs: bytes, secret: bytes,
                    request_authenticator: bytes) -> bytes:
    # EAP-bearing responses include a Message-Authenticator. For its HMAC the
    # header contains the REQUEST authenticator; compute Response Authenticator last.
    offset = 0
    has_eap = False
    while offset < len(attrs):
        has_eap |= attrs[offset] == ATTR_EAP_MESSAGE
        offset += attrs[offset + 1]
    if has_eap:
        zeroed = attrs + radius_attr(ATTR_MESSAGE_AUTHENTICATOR, bytes(16))
        ma = radius_message_authenticator(radius_packet(code, identifier, zeroed, request_authenticator), secret)
        attrs += radius_attr(ATTR_MESSAGE_AUTHENTICATOR, ma)
    authenticator = radius_response_authenticator(code, identifier, 20 + len(attrs),
                                                  request_authenticator, attrs, secret)
    return radius_packet(code, identifier, attrs, authenticator)


def _eap_expanded(eap_type: int, data: bytes = b"", code: int = EAP_REQUEST, identifier: int = 1) -> bytes:
    return eap(code, identifier, eap_type, data)


def build_radius() -> Lab:
    """17 — synthetic IPv4/UDP RADIUS examples with reproducible authenticator fields; not a deployed server or policy test."""
    lab = Lab("radius", "radius")
    bss_beacon(lab, SSID_CORP, AP_CORP_1, 6, beacon_ies(
        rsn=ie_rsn(akm=[AKM_8021X], caps=RSNCAP_MFPC | RSNCAP_MFPR)))
    sta, ap = mac(STA_1), mac(AP_CORP_1)
    nas_ip, radius_ip = "10.20.30.1", "10.20.30.10"
    identity = b"a.patel@corp.example"
    eap_identity = _eap_expanded(EAP_TYPE_IDENTITY, identity, code=EAP_RESPONSE, identifier=1)

    def to_radius(radius_src: str, radius_dst: str, packet: bytes, sport: int, dport: int, **kw) -> int:
        return lab.data(ap, sta, ap, llc_snap(0x0800, ipv4(radius_src, radius_dst,
                          udp(sport, dport, packet), 17)), to_ds=1, **kw)

    def from_radius(radius_src: str, radius_dst: str, packet: bytes, sport: int, dport: int, **kw) -> int:
        return lab.data(sta, ap, ap, llc_snap(0x0800, ipv4(radius_src, radius_dst,
                          udp(sport, dport, packet), 17)), from_ds=1, **kw)

    # Access-Request #1 — identity only, Message-Authenticator present.
    attrs = (radius_attr(ATTR_USER_NAME, identity)
             + radius_attr(ATTR_NAS_IP, bytes([10, 20, 30, 1]))
             + radius_attr(ATTR_NAS_IDENTIFIER, b"wififorge-lab-ap1")
             + radius_attr(ATTR_CALLING_STATION_ID, STA_1.encode())
             + radius_attr(ATTR_CALLED_STATION_ID, f"{AP_CORP_1}:{SSID_CORP}".encode())
             + radius_attr(ATTR_EAP_MESSAGE, eap_identity))
    req1 = radius_request(1, attrs, LAB_RADIUS_SECRET_WEAK)
    to_radius(nas_ip, radius_ip, req1, 49152, 1812)
    # Direct EAP-MSCHAPv2 attributes are included as an intentionally visible teaching fixture.
    # They are not an inner exchange carried inside a complete PEAP/TLS tunnel.
    peer_challenge = hashlib.sha256(b"peer:" + sta).digest()[:16]
    auth_challenge = hashlib.sha256(b"auth:" + sta).digest()[:16]
    nt_response, nt_hash, chap_hash = mschapv2_credentials(
        LAB_EAP_PASSWORD, auth_challenge, peer_challenge, LAB_EAP_USER)
    chap_challenge = mschapv2_challenge(auth_challenge, "corp-lab", identifier=3)
    chap_response = mschapv2_response(peer_challenge, nt_response,
                                      LAB_EAP_USER.encode("utf-16-le"), identifier=3)
    # These embedded method bytes remain illustrative direct MS-CHAPv2 values,
    # not a PEAP tunnel or a validated EAP client/server implementation.
    state = radius_attr(ATTR_STATE, b"lab-state-01")
    challenge = radius_response(1, RADIUS_ACCESS_CHALLENGE,
        state + radius_attr(ATTR_EAP_MESSAGE, eap(EAP_REQUEST, 3, EAP_TYPE_MSCHAPV2, chap_challenge)),
        LAB_RADIUS_SECRET_WEAK, req1[4:20])
    from_radius(radius_ip, nas_ip, challenge, 1812, 49152)
    req2 = radius_request(2, radius_attr(ATTR_USER_NAME, identity) + state
        + radius_attr(ATTR_EAP_MESSAGE, eap(EAP_RESPONSE, 3, EAP_TYPE_MSCHAPV2, chap_response)), LAB_RADIUS_SECRET_WEAK)
    to_radius(nas_ip, radius_ip, req2, 49152, 1812)
    from wififorge_labkit import _md4
    digest = hashlib.sha1(_md4(nt_hash) + nt_response + b"Magic server to client signing constant").digest()
    proof = hashlib.sha1(digest + chap_hash + b"Pad to make it do more than one iteration").hexdigest().upper()
    result = mschapv2_result(3, "S=" + proof, identifier=3)
    from_radius(radius_ip, nas_ip, radius_response(2, RADIUS_ACCESS_CHALLENGE,
        state + radius_attr(ATTR_EAP_MESSAGE, eap(EAP_REQUEST, 4, EAP_TYPE_MSCHAPV2, result)),
        LAB_RADIUS_SECRET_WEAK, req2[4:20]), 1812, 49152)
    req3 = radius_request(3, radius_attr(ATTR_USER_NAME, identity) + state
        + radius_attr(ATTR_EAP_MESSAGE, eap(EAP_RESPONSE, 4, EAP_TYPE_MSCHAPV2, b"\x03")), LAB_RADIUS_SECRET_WEAK)
    to_radius(nas_ip, radius_ip, req3, 49152, 1812)
    # EAP Success has only Code, Identifier and Length. No Type or method payload.
    # No real MSK/key transport or AP policy enforcement is represented here.
    accept_attrs = (radius_attr(ATTR_USER_NAME, identity)
        + radius_attr(ATTR_TUNNEL_TYPE, struct.pack("!I", 13))
        + radius_attr(ATTR_TUNNEL_MEDIUM_TYPE, struct.pack("!I", 6))
        + radius_attr(ATTR_TUNNEL_PRIVATE_GROUP_ID, b"100")
        + radius_attr(ATTR_EAP_MESSAGE, struct.pack("!BBH", EAP_SUCCESS, 4, 4)))
    from_radius(radius_ip, nas_ip, radius_response(3, RADIUS_ACCESS_ACCEPT, accept_attrs,
        LAB_RADIUS_SECRET_WEAK, req3[4:20]), 1812, 49152)
    acct_attrs = (radius_attr(ATTR_USER_NAME, identity)
        + radius_attr(ATTR_NAS_IP, bytes([10, 20, 30, 1]))
        + radius_attr(40, struct.pack("!I", 1)) + radius_attr(44, b"session-0001"))
    acct_zero = radius_packet(RADIUS_ACCOUNTING_REQUEST, 5, acct_attrs, bytes(16))
    acct = radius_packet(RADIUS_ACCOUNTING_REQUEST, 5, acct_attrs,
        hashlib.md5(acct_zero + LAB_RADIUS_SECRET_WEAK).digest())
    to_radius(nas_ip, radius_ip, acct, 49153, 1813)
    from_radius(radius_ip, nas_ip, radius_response(5, RADIUS_ACCOUNTING_RESPONSE, b"",
        LAB_RADIUS_SECRET_WEAK, acct[4:20]), 1813, 49153)
    # A *rogue* NAS that guessed the shared secret: Message-Authenticator is wrong.
    bad = radius_request(3, attrs, LAB_RADIUS_SECRET_STRONG)
    to_radius("10.20.30.99", radius_ip, bad, 49154, 1812)
    lab.meta = {  # type: ignore[attr-defined]
        "secret_used": LAB_RADIUS_SECRET_WEAK.decode(),
        "mschapv2": {"user": LAB_EAP_USER, "password": LAB_EAP_PASSWORD,
                     "challenge": auth_challenge.hex(), "nt_response": nt_response.hex(),
                     "nt_hash": nt_hash.hex(), "peer_challenge": peer_challenge.hex()},
    }
    return lab


def build_enterprise() -> Lab:
    """15/16 — synthetic EAPOL/EAP framing, abbreviated TLS bytes, inserted lab MSK and a handshake."""
    lab = Lab("enterprise", "enterprise")
    bss_beacon(lab, SSID_CORP, AP_CORP_1, 6, beacon_ies(
        rsn=ie_rsn(akm=[AKM_8021X, AKM_8021X_SHA256], caps=RSNCAP_MFPC | RSNCAP_MFPR)))
    sta, ap = mac(STA_2), mac(AP_CORP_1)
    lab.eapol_over_wifi(sta, ap, bytes([2, 1, 0x00, 0x00]))                    # EAPOL-Start
    lab.eapol_from_ap(sta, ap, eapol_eap(eap(EAP_REQUEST, 1, EAP_TYPE_IDENTITY, b"corp.example")))
    lab.eapol_over_wifi(sta, ap, eapol_eap(eap(EAP_RESPONSE, 1, EAP_TYPE_IDENTITY, b"anonymous@corp.example")))
    # Illustrative PEAP identifiers and abbreviated TLS-like bytes; no full TLS negotiation or inner identity is present.
    tls_client_hello = b"\x16\x03\x01\x00\x2d\x01\x00\x00\x29\x03\x03" + b"\x11" * 32 + b"\x00\x00\x02\x00\x2f\x01\x00"
    tls_server_hello = b"\x16\x03\x01\x00\x2a\x02\x00\x00\x26\x03\x03" + b"\x22" * 32 + b"\x00\x00\x2f\x00"
    lab.eapol_over_wifi(sta, ap, eapol_eap(eap(EAP_RESPONSE, 2, EAP_TYPE_PEAP, b"\x00" + tls_client_hello)))
    lab.eapol_from_ap(sta, ap, eapol_eap(eap(EAP_REQUEST, 3, EAP_TYPE_PEAP, b"\x00" + tls_server_hello)))
    lab.eapol_over_wifi(sta, ap, eapol_eap(eap(EAP_RESPONSE, 3, EAP_TYPE_PEAP, b"\x00")))
    # MSK → PMK: the 802.1X authentication produces the MSK; PMK = first 256 bits of MSK.
    msk = hashlib.sha256(b"wififorge-lab-msk:" + sta + ap).digest() + b"\x00" * 32
    pmk = msk[:32]
    anonce = hashlib.sha256(b"ent-anonce:" + sta).digest()
    snonce = hashlib.sha256(b"ent-snonce:" + sta).digest()
    ptk = ptk_from_pmk(pmk, ap, sta, anonce, snonce)
    kck = ptk[:16]
    m1 = eapol_key(1, anonce, KEYINFO_KEY_TYPE | KEYINFO_ACK)
    lab.eapol_from_ap(sta, ap, m1)
    m2 = eapol_key(1, snonce, KEYINFO_KEY_TYPE | KEYINFO_MIC)
    m2 = m2[:81] + __import__("wififorge_labkit").eapol_key_mic(kck, m2) + m2[97:]
    lab.eapol_over_wifi(sta, ap, m2)
    gtk = hashlib.sha256(b"ent-gtk:" + ap).digest()[:16]
    m3 = eapol_key(2, anonce, KEYINFO_KEY_TYPE | KEYINFO_ACK | KEYINFO_MIC | KEYINFO_INSTALL
                   | KEYINFO_SECURE | KEYINFO_ENCRYPTED_KEY_DATA, key_data=key_data_gtk(gtk))
    m3 = m3[:81] + __import__("wififorge_labkit").eapol_key_mic(kck, m3) + m3[97:]
    lab.eapol_from_ap(sta, ap, m3)
    m4 = eapol_key(2, b"\x00" * 32, KEYINFO_KEY_TYPE | KEYINFO_MIC | KEYINFO_SECURE)
    m4 = m4[:81] + __import__("wififorge_labkit").eapol_key_mic(kck, m4) + m4[97:]
    lab.eapol_over_wifi(sta, ap, m4)
    lab.meta = {"msk": msk.hex(), "pmk": pmk.hex(), "note": "MSK is a documented lab value"}  # type: ignore[attr-defined]
    return lab


def build_eap_methods() -> Lab:
    """16 — EAP outer-method identifiers plus a separate direct MS-CHAPv2 teaching fixture; not a complete PEAP/TLS session."""
    lab = Lab("eap", "eap")
    bss_beacon(lab, SSID_CORP, AP_CORP_1, 6, beacon_ies(
        rsn=ie_rsn(akm=[AKM_8021X], caps=RSNCAP_MFPC | RSNCAP_MFPR)))
    sta, ap = mac(STA_1), mac(AP_CORP_1)
    # PEAP flow.
    lab.eapol_over_wifi(sta, ap, eapol_eap(eap(EAP_RESPONSE, 1, EAP_TYPE_IDENTITY, b"anonymous@corp.example")))
    lab.eapol_from_ap(sta, ap, eapol_eap(eap(EAP_REQUEST, 1, EAP_TYPE_PEAP, b"\x01")))
    lab.eapol_over_wifi(sta, ap, eapol_eap(eap(EAP_RESPONSE, 2, EAP_TYPE_PEAP, b"\x00\x16\x03\x01\x00\x28")))
    lab.eapol_from_ap(sta, ap, eapol_eap(eap(EAP_REQUEST, 2, EAP_TYPE_PEAP, b"\x02\x16\x03\x01\x00\x28")))
    # EAP-TLS: server asks for the client certificate (CertificateRequest) — mutual auth.
    lab.eapol_over_wifi(sta, ap, eapol_eap(eap(EAP_RESPONSE, 3, EAP_TYPE_IDENTITY, b"tls-client@corp.example")))
    lab.eapol_from_ap(sta, ap, eapol_eap(eap(EAP_REQUEST, 3, EAP_TYPE_TLS, b"\x0d\x00\x00\x08" + b"\x00" * 8)))
    # EAP-TTLS: outer TLS, inner method negotiated afterwards.
    sta2 = mac(STA_3)
    lab.eapol_over_wifi(sta2, ap, eapol_eap(eap(EAP_RESPONSE, 4, EAP_TYPE_IDENTITY, b"anonymous@corp.example")))
    lab.eapol_from_ap(sta2, ap, eapol_eap(eap(EAP_REQUEST, 4, EAP_TYPE_TTLS, b"\x01\x16\x03\x01\x00\x2c")))
    # Rogue AP that terminated PEAP: the inner MS-CHAPv2 exchange is now visible and the
    # NT-Response is crackable material (hashcat -m 5500).
    challenge = hashlib.sha256(b"rogue-auth-challenge").digest()[:16]
    peer = hashlib.sha256(b"rogue-peer-challenge").digest()[:16]
    nt_response, nt_hash, chap_hash = mschapv2_credentials(
        LAB_EAP_PASSWORD, challenge, peer, LAB_EAP_USER)
    lab.eapol_from_ap(sta, ap, eapol_eap(eap(EAP_REQUEST, 9, EAP_TYPE_MSCHAPV2,
                                             mschapv2_challenge(challenge, "corp-lab", 9))))
    lab.eapol_over_wifi(sta, ap, eapol_eap(eap(EAP_RESPONSE, 9, EAP_TYPE_MSCHAPV2,
                                               mschapv2_response(peer, nt_response,
                                                                 LAB_EAP_USER.encode("utf-16-le"), 9))))
    lab.eapol_from_ap(sta, ap, eapol_eap(eap(EAP_SUCCESS, 9, EAP_TYPE_MSCHAPV2,
                                             mschapv2_result(3, "S=1E7A2C9F4B6D0E83A1C5F7B9D2E4A6C8B0D3F5A7",
                                                             identifier=9, utf16_message=True))))
    lab.meta = {  # type: ignore[attr-defined]
        "mschapv2": {"user": LAB_EAP_USER, "password": LAB_EAP_PASSWORD,
                     "challenge": challenge.hex(), "peer_challenge": peer.hex(),
                     "nt_response": nt_response.hex(), "nt_hash": nt_hash.hex()},
    }
    return lab


def build_corporate_attacks() -> Lab:
    """18 — synthetic wireless frames, look-alike/handshake, direct EAP method packets and ICMP examples; not a demonstrated production attack chain."""
    lab = Lab("corporate-attacks", "corporate")
    iot_wps = ie_wps(setup_locked=False, selected_registrar=True, wps_state=2,
                     device_password_id=0x0004, config_methods=WPS_CONFIG_LABEL | WPS_CONFIG_DISPLAY)
    bss_beacon(lab, SSID_CORP, AP_CORP_1, 36, beacon_ies(
        rsn=ie_rsn(akm=[AKM_8021X], caps=RSNCAP_MFPC | RSNCAP_MFPR), band_5=True, he=True), signal=-57)
    bss_beacon(lab, SSID_GUEST, AP_CORP_2, 6, beacon_ies(rsn=None), signal=-63)
    bss_beacon(lab, SSID_IOT, AP_IOT, 1, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC),
                                                    wps=iot_wps), signal=-71)
    sta, ap, rogue = mac(STA_1), mac(AP_CORP_1), mac(AP_ROGUE)
    # 1) Include a deauthentication frame as a storyboard element. No receiver/client
    #    outcome is represented, and this fixture does not establish causality.
    lab.mgmt(SUBTYPE_DEAUTH, sta, ap, ap, struct.pack("<H", REASON_CLASS3_FRAME), channel=36)
    # 2) Evil twin beacon: same SSID on 2.4 GHz with a much stronger signal.
    bss_beacon(lab, SSID_CORP, AP_ROGUE, 6, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)),
               signal=-28, interval=50)
    lab.mgmt(SUBTYPE_PROBE_REQ, b"\xff" * 6, sta, b"\xff" * 6,
             ie_supported_rates() + __import__("wififorge_labkit").ie_ssid(SSID_CORP), channel=6)
    lab.mgmt(SUBTYPE_AUTH, rogue, sta, rogue, struct.pack("<HHH", 0, 1, 0))
    lab.mgmt(SUBTYPE_AUTH, sta, rogue, rogue, struct.pack("<HHH", 0, 2, 0))
    lab.mgmt(SUBTYPE_ASSOC_REQ, rogue, sta, rogue,
             struct.pack("<HH", 0x0411, 10) + __import__("wififorge_labkit").ie_ssid(SSID_CORP)
             + ie_supported_rates() + ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC))
    lab.mgmt(SUBTYPE_ASSOC_RESP, sta, rogue, rogue,
             struct.pack("<HHH", 0x0411, 0, 1 | 0xC000) + ie_supported_rates())
    _four_way(lab, sta, rogue, SSID_CORP, LAB_PSK)
    # 3) Add direct EAP-MSCHAPv2 sample packets. They are not a PEAP inner method or
    #    evidence of a rogue RADIUS/TLS termination.
    challenge = hashlib.sha256(b"corp-rogue-challenge").digest()[:16]
    peer = hashlib.sha256(b"corp-rogue-peer").digest()[:16]
    nt_response, nt_hash, chap_hash = mschapv2_credentials(
        LAB_EAP_PASSWORD, challenge, peer, LAB_EAP_USER)
    lab.eapol_from_ap(sta, rogue, eapol_eap(eap(EAP_REQUEST, 7, EAP_TYPE_MSCHAPV2,
                                                mschapv2_challenge(challenge, "corp-lab", 7))))
    lab.eapol_over_wifi(sta, rogue, eapol_eap(eap(EAP_RESPONSE, 7, EAP_TYPE_MSCHAPV2,
                                                  mschapv2_response(peer, nt_response,
                                                                    LAB_EAP_USER.encode("utf-16-le"), 7))))
    lab.eapol_from_ap(sta, rogue, eapol_eap(eap(EAP_SUCCESS, 7, EAP_TYPE_MSCHAPV2,
                                                mschapv2_result(3, "S=1E7A2C9F4B6D0E83A1C5F7B9D2E4A6C8B0D3F5A7",
                                                                identifier=7, utf16_message=True))))
    # 4) Add an ICMP request/reply pair as synthetic packet examples. These do not test
    #    real VLAN routing, ACLs, guest access, or client isolation.
    guest, guest_ap = mac(STA_5), mac(AP_CORP_2)
    lab.data(guest_ap, guest, mac(AP_CORP_1), llc_snap(0x0800, ipv4("10.0.0.87", "10.20.30.10", b"\x08\x00\xf7\xfd\x00\x01\x00\x01", 1)),
             to_ds=1, channel=6)
    lab.data(guest, guest_ap, mac(AP_CORP_1), llc_snap(0x0800, ipv4("10.20.30.10", "10.0.0.87", b"\x00\x00\xff\xfd\x00\x01\x00\x01", 1)),
             from_ds=1, channel=6)
    lab.meta = {  # type: ignore[attr-defined]
        "lab_psk": LAB_PSK,
        "mschapv2": {"user": LAB_EAP_USER, "password": LAB_EAP_PASSWORD,
                     "challenge": challenge.hex(), "peer_challenge": peer.hex(),
                     "nt_response": nt_response.hex(), "nt_hash": nt_hash.hex()},
    }
    return lab


def build_methodology() -> Lab:
    """19/20 — synthetic multi-BSS teaching artifact; it is not a complete client engagement or retest."""
    lab = Lab("methodology", "methodology")
    iot_wps = ie_wps(setup_locked=False, selected_registrar=True, wps_state=2, device_password_id=0x0004)
    bss_beacon(lab, SSID_CORP, AP_CORP_1, 36, beacon_ies(
        rsn=ie_rsn(akm=[AKM_8021X], caps=RSNCAP_MFPC | RSNCAP_MFPR), band_5=True, he=True), signal=-54)
    bss_beacon(lab, SSID_CORP, AP_CORP_1, 6, beacon_ies(
        rsn=ie_rsn(akm=[AKM_8021X], caps=RSNCAP_MFPC | RSNCAP_MFPR)), signal=-61)
    bss_beacon(lab, SSID_GUEST, AP_CORP_2, 11, beacon_ies(rsn=None), signal=-64)
    bss_beacon(lab, SSID_IOT, AP_IOT, 1, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC),
                                                    wps=iot_wps), signal=-72)
    bss_beacon(lab, SSID_HIDDEN, AP_HIDDEN, 6, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)),
               hidden=True, signal=-58)
    bss_beacon(lab, SSID_WPA3, AP_WPA3, 36, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK, AKM_SAE],
                                                                  caps=RSNCAP_MFPC), band_5=True), signal=-66)
    bss_beacon(lab, SSID_WPS, AP_WPS, 6, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC),
                                                    wps=iot_wps), signal=-69)
    # Hidden SSID revealed by a probe response.
    lab.mgmt(SUBTYPE_PROBE_REQ, b"\xff" * 6, mac(STA_2), b"\xff" * 6,
             ie_supported_rates() + __import__("wififorge_labkit").ie_ssid(SSID_HIDDEN), channel=6)
    lab.mgmt(SUBTYPE_PROBE_RESP, mac(STA_2), mac(AP_HIDDEN), mac(AP_HIDDEN),
             beacon_body(SSID_HIDDEN, 6, ies=beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC))))
    # Weak-PSK BSS with a real 4-way handshake (offline audit finding).
    bss_beacon(lab, "LAB-WEAK-PSK", "aa:bb:cc:dd:ee:01", 6, beacon_ies(
        rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)))
    sta = mac(STA_1)
    weak_ap = "aa:bb:cc:dd:ee:01"
    lab.mgmt(SUBTYPE_AUTH, mac(weak_ap), sta, mac(weak_ap), struct.pack("<HHH", 0, 1, 0))
    lab.mgmt(SUBTYPE_AUTH, sta, mac(weak_ap), mac(weak_ap), struct.pack("<HHH", 0, 2, 0))
    lab.mgmt(SUBTYPE_ASSOC_REQ, mac(weak_ap), sta, mac(weak_ap),
             struct.pack("<HH", 0x0411, 10) + __import__("wififorge_labkit").ie_ssid("LAB-WEAK-PSK")
             + ie_supported_rates() + ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC))
    lab.mgmt(SUBTYPE_ASSOC_RESP, sta, mac(weak_ap), mac(weak_ap),
             struct.pack("<HHH", 0x0411, 0, 1 | 0xC000) + ie_supported_rates())
    _four_way(lab, sta, mac(weak_ap), "LAB-WEAK-PSK", LAB_PSK_WEAK)
    # Deauthentication frame example; this capture does not include an observed client effect.
    lab.mgmt(SUBTYPE_DEAUTH, b"\xff" * 6, mac(AP_ESS_1), mac(AP_ESS_1),
             struct.pack("<H", REASON_UNSPECIFIED), channel=6)
    # Rogue twin of the corporate SSID.
    bss_beacon(lab, SSID_CORP, AP_ROGUE, 6, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)),
               signal=-30, interval=50)
    # Abbreviated synthetic EAPOL/EAP method identifiers; no complete PEAP/TLS flow.
    corp_sta, corp_ap = mac(STA_4), mac(AP_CORP_1)
    lab.eapol_over_wifi(corp_sta, corp_ap, bytes([2, 1, 0x00, 0x00]))
    lab.eapol_from_ap(corp_sta, corp_ap, eapol_eap(eap(EAP_REQUEST, 1, EAP_TYPE_IDENTITY, b"corp.example")))
    lab.eapol_over_wifi(corp_sta, corp_ap, eapol_eap(eap(EAP_RESPONSE, 1, EAP_TYPE_IDENTITY, b"anonymous@corp.example")))
    lab.eapol_from_ap(corp_sta, corp_ap, eapol_eap(eap(EAP_REQUEST, 2, EAP_TYPE_PEAP, b"\x01")))
    lab.eapol_over_wifi(corp_sta, corp_ap, eapol_eap(eap(EAP_RESPONSE, 2, EAP_TYPE_PEAP, b"\x00\x16\x03\x01\x00\x28")))
    challenge = hashlib.sha256(b"methodology-challenge").digest()[:16]
    peer = hashlib.sha256(b"methodology-peer").digest()[:16]
    nt_response, nt_hash, chap_hash = mschapv2_credentials(
        LAB_EAP_PASSWORD, challenge, peer, LAB_EAP_USER)
    lab.eapol_from_ap(corp_sta, corp_ap, eapol_eap(eap(EAP_REQUEST, 5, EAP_TYPE_MSCHAPV2,
                                                       mschapv2_challenge(challenge, "corp-lab", 5))))
    lab.eapol_over_wifi(corp_sta, corp_ap, eapol_eap(eap(EAP_RESPONSE, 5, EAP_TYPE_MSCHAPV2,
                                                         mschapv2_response(peer, nt_response,
                                                                           LAB_EAP_USER.encode("utf-16-le"), 5))))
    # Guest isolation missing + segmentation bypass.
    guest, guest_ap = mac(STA_5), mac(AP_CORP_2)
    lab.data(guest_ap, guest, corp_ap, llc_snap(0x0800, ipv4("10.0.0.87", "10.20.30.10",
             b"\x08\x00\xf7\xfd\x00\x01\x00\x01", 1)), to_ds=1, channel=6)
    lab.data(guest, guest_ap, corp_ap, llc_snap(0x0800, ipv4("10.20.30.10", "10.0.0.87",
             b"\x00\x00\xff\xfd\x00\x01\x00\x01", 1)), from_ds=1, channel=6)
    lab.meta = {  # type: ignore[attr-defined]
        "weak_psk": LAB_PSK_WEAK,
        "mschapv2": {"user": LAB_EAP_USER, "password": LAB_EAP_PASSWORD,
                     "challenge": challenge.hex(), "peer_challenge": peer.hex(),
                     "nt_response": nt_response.hex(), "nt_hash": nt_hash.hex()},
    }
    return lab



def build_capstone_baseline() -> Lab:
    """Independent fictional case: baseline bytes, NOT Northwind or an RF observation."""
    lab = Lab("capstone-baseline", "capstone")
    ops, corp, twin = "02:aa:10:00:00:01", "02:aa:10:00:00:02", "02:aa:10:00:00:09"
    bss_beacon(lab, "CASE-OPS", ops, 6, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)))
    bss_beacon(lab, "CASE-CORP", corp, 36, beacon_ies(
        rsn=ie_rsn(akm=[AKM_8021X], caps=RSNCAP_MFPC | RSNCAP_MFPR), band_5=True))
    bss_beacon(lab, "CASE-OPS", twin, 11, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)), interval=50)
    sta, ap = mac(STA_3), mac(ops)
    lab.mgmt(SUBTYPE_AUTH, ap, sta, ap, struct.pack("<HHH", 0, 1, 0))
    lab.mgmt(SUBTYPE_AUTH, sta, ap, ap, struct.pack("<HHH", 0, 2, 0))
    lab.mgmt(SUBTYPE_ASSOC_REQ, ap, sta, ap, struct.pack("<HH", 0x0411, 10)
             + __import__("wififorge_labkit").ie_ssid("CASE-OPS") + ie_supported_rates()
             + ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC))
    lab.mgmt(SUBTYPE_ASSOC_RESP, sta, ap, ap,
             struct.pack("<HHH", 0x0411, 0, 1 | 0xC000) + ie_supported_rates())
    _four_way(lab, sta, ap, "CASE-OPS", LAB_PSK_WEAK)
    return lab


def build_capstone_retest() -> Lab:
    """Staged policy comparison, NOT proof of a client's negotiated protection."""
    lab = Lab("capstone-retest", "capstone")
    ops, corp, twin = "02:aa:10:00:00:01", "02:aa:10:00:00:02", "02:aa:10:00:00:09"
    bss_beacon(lab, "CASE-OPS", ops, 6, beacon_ies(
        rsn=ie_rsn(akm=[AKM_SAE], caps=RSNCAP_MFPC | RSNCAP_MFPR)))
    bss_beacon(lab, "CASE-CORP", corp, 36, beacon_ies(
        rsn=ie_rsn(akm=[AKM_8021X], caps=RSNCAP_MFPC | RSNCAP_MFPR), band_5=True))
    # A same-name BSS persists: the owned AP's advertisement changed, but the wider
    # site's inventory and client selection have NOT been proved remediated.
    bss_beacon(lab, "CASE-OPS", twin, 11, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)), interval=50)
    return lab


BUILDERS = [
    build_beacon_only,
    build_recon_lab,
    build_traffic_analysis,
    build_wpa2_handshake,
    build_pmkid,
    build_wps_beacon,
    build_wpa3_transition,
    build_wpa3_only,
    build_deauth,
    build_rogue_ap,
    build_captive_portal,
    build_radius,
    build_enterprise,
    build_eap_methods,
    build_corporate_attacks,
    build_methodology,
    build_capstone_baseline,
    build_capstone_retest,
]

# Per-artifact documentation of what is cryptographically real (goes into MANIFEST.md)
ARTIFACT_NOTES: Dict[str, Dict[str, str]] = {
    "beacon-only": {"real": "Beacon/probe fixed fields, IEs, RSNE (AKM, ciphers, MFPC/MFPR bits), country/VHT/HE/capability IEs",
                    "synthetic": "all frames and radio metadata are generated teaching evidence, not a live passive capture"},
    "recon-lab": {"real": "Encoded six-BSS teaching inventory, hidden-name response and directed probes; locally administered address does not prove device identity or randomization",
                  "synthetic": "all frames and radio metadata are generated teaching evidence, not a live passive capture"},
    "traffic-analysis": {"real": "Full association state machine, EAPOL-Key M1–M4 with MICs computed from the lab PSK, DHCP/ARP/ICMP/DNS/HTTP payloads",
                         "synthetic": "DHCP option bytes are minimal (fixed-size); HTTP/DNS bodies are lab strings"},
    "wpa2-handshake": {"real": "M1–M4 for one client and M1–M2 for a second; MICs, nonces and replay counters consistent with the lab PSK",
                       "synthetic": "key rsc/key id reserved bytes are zero (normal for a sniffer capture)"},
    "pmkid": {"real": "PMKID = HMAC-SHA1-128(PMK, \"PMK Name\" | AA | SPA) inside a real EAPOL-Key M1 header",
              "synthetic": "the association exchange around it is minimal"},
    "wps-beacon": {"real": "WPS IE attributes (version, config methods, AP setup locked, selected registrar, device password id) for an unlocked and a locked AP; EAP-WSC identity/M1 framing",
                   "synthetic": "no full M1–M8 WSC exchange (would require a real registrar)"},
    "wpa3-transition": {"real": "RSNE with AKM PSK+SAE and MFPC-only; a PSK 4-way handshake is present against that BSS, but the capture does not show an attacker-induced downgrade",
                        "synthetic": "SAE commit/confirm payloads — real SAE scalars need a live DH exchange; the point of the lab is that they are not crackable offline"},
    "wpa3-only": {"real": "RSNE with AKM SAE and MFPR set; no PSK handshake exists in the capture",
                  "synthetic": "SAE payload and the BIP MIC of the protected deauth (IGTK is not knowable to a passive listener)"},
    "deauth": {"real": "Deauthentication/disassociation frames with reason codes 1/7/8/15, broadcast and directed floods, SA Query action frames",
               "synthetic": "frames are synthetic teaching examples; no receiver acceptance or availability impact is established"},
    "rogue-ap": {"real": "Same-SSID look-alike fixture with a locally administered BSSID, different AKM/IE profile and 50 TU beacon interval; scripted client association, lab PSK handshake and synthetic DHCP/HTTP sequence. Capture alone does not establish unauthorized ownership or deauthentication causality.",
                 "synthetic": "captive portal HTML payload is a lab string"},
    "captive-portal": {"real": "Open BSS, DHCP, HTTP 302 redirect to the portal, cleartext POST credentials, session cookie, client-to-client ARP (no isolation)",
                       "synthetic": "portal HTML/HTTP bodies are lab strings"},
    "radius": {"real": "Paired RADIUS requests/replies with verifiable Message-Authenticators and Response/Accounting authenticators, VLAN attribute 100, direct MS-CHAPv2 teaching values and a deliberately invalid request",
               "synthetic": "No PEAP/TLS session, real EAP peer, key transport or enforced VLAN; nonces are deterministic teaching values"},
    "enterprise": {"real": "Synthetic EAPOL/EAP method identifiers and an illustrative handshake with MICs consistent with a documented lab MSK; not evidence of a complete PEAP/TLS negotiation or deployed 802.1X policy",
                   "synthetic": "TLS records are abbreviated structural bytes; the MSK is an inserted lab value, not derived from a TLS master secret or PEAP exchange"},
    "eap": {"real": "EAP method identifiers and direct MS-CHAPv2 challenge/response/success fixture values; this is not a complete PEAP inner exchange or EAP-TLS/TTLS session",
            "synthetic": "TLS payloads are abbreviated structural bytes; the direct MS-CHAPv2 exchange is intentionally visible and must not be described as a passive PEAP capture"},
    "corporate-attacks": {"real": "Synthetic 19-frame collection with management frames, a look-alike/weak-PSK practice exchange, direct EAP-MSCHAPv2 packets and an ICMP pair; does not demonstrate successful deauth, PEAP, RADIUS or production segmentation",
                          "synthetic": "EAP/TLS payloads are abbreviated structural fixtures; no complete PEAP tunnel, RADIUS exchange, production configuration or live network path is represented"},
    "capstone-baseline": {"real": "Fictional case beacons and a PSK 4-way handshake with reproducible lab MICs; not Northwind or an RF observation",
                          "synthetic": "No real ownership, client impact or applied segmentation is represented"},
    "capstone-retest": {"real": "Fictional same-BSSID before/after comparison: owned BSS advertises SAE-only and MFPR; same-name PSK BSS remains",
                        "synthetic": "No SAE client association, enforced PMF, asset ownership or executed on-site retest is demonstrated"},
    "methodology": {"real": "Multi-BSS teaching capture: beacons/probes, weak-PSK exercise handshake, deauthentication frame, look-alike, abbreviated EAP and synthetic ICMP examples; not a real engagement or validated segmentation/isolation test",
                    "synthetic": "EAP/TLS and SAE payloads are abbreviated structural examples; no complete PEAP negotiation, RADIUS policy, client certificate-validation result, or real segmentation/isolation test"},
}


def main() -> int:
    os.makedirs(DATA_ROOT, exist_ok=True)
    os.makedirs(os.path.dirname(WORDLIST), exist_ok=True)
    manifest: List[str] = [
        "# Lab artifact manifest",
        "",
        "Generated by `scripts/generate-lab-artifacts.py` — **do not hand-edit the captures**.",
        "Re-run the generator (and `scripts/verify-lab-artifacts.py`) after any change.",
        "",
        "Each file is a structurally valid PCAPNG (radiotap + 802.11) that decodes in Wireshark/tshark. These are teaching fixtures, not live network captures.",
        "Some frame fields and cryptographic derivations are reproducible; other exchanges are intentionally abbreviated or synthetic. The per-capture notes below define what the artifact does and does not establish.",
        "Published credentials are lab-only values for reproducing the explicitly documented examples, not evidence of any deployed system:",
        "",
        f"* `LAB_PSK = {LAB_PSK}` (SSID `{SSID_ESS}`, `{SSID_WPA3}`, rogue twin)",
        f"* `LAB_PSK_WEAK = {LAB_PSK_WEAK}` (SSID `LAB-WEAK-PSK`, rogue twin in `rogue-ap.pcapng`)",
        f"* Example identity `{LAB_EAP_USER}` / password `{LAB_EAP_PASSWORD}` (used only in synthetic direct MS-CHAPv2 teaching fields; not evidence of a complete PEAP session)",
        f"* RADIUS shared secret (weak) `{LAB_RADIUS_SECRET_WEAK.decode()}`, strong example "
        f"`{LAB_RADIUS_SECRET_STRONG.decode()}`",
        "",
        "## Captures",
        "",
        "| capture | frames | what is cryptographically real |",
        "| --- | --- | --- |",
    ]
    inventory: Dict[str, Dict[str, object]] = {}
    for builder in BUILDERS:
        lab = builder()
        rel = os.path.join(lab.group, f"{lab.pcap_id}.pcapng")
        path = os.path.join(PCAP_ROOT, rel)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        count = write_pcapng(path, lab.frames)
        # Offline data for the web app (no backend required, works on GitHub Pages).
        data = analyze([f.data for f in lab.frames], lab.pcap_id)
        data["module"] = lab.group
        data["provenance"] = "Generated offline teaching capture; not a hosted environment or live RF observation"
        for record, frame in zip(data["frames"], lab.frames):
            record["capture_timestamp_us"] = frame.timestamp_us
            record["relative_time_ms"] = (frame.timestamp_us - lab.frames[0].timestamp_us) / 1000
        with open(os.path.join(DATA_ROOT, f"{lab.pcap_id}.json"), "w") as fh:
            json.dump(data, fh, indent=1, default=lambda o: o.hex() if isinstance(o, (bytes, bytearray)) else str(o))
        digest = hashlib.sha256(open(path, "rb").read()).hexdigest()
        notes = ARTIFACT_NOTES.get(lab.pcap_id, {})
        inventory[lab.pcap_id] = {
            "group": lab.group, "frames": count, "sha256": digest, "path": rel,
            "bytes": os.path.getsize(path), "real": notes.get("real", ""),
            "synthetic": notes.get("synthetic", ""),
        }
        manifest.append(f"| `{rel}` | {count} | {notes.get('real', '')} |")
        print(f"  {rel:48s} {count:3d} frames  {os.path.getsize(path):6d} B  sha256={digest[:12]}…")

    # Wordlist used by the offline-audit labs (fast, deterministic, verifiable).
    with open(WORDLIST, "w") as fh:
        fh.write("\n".join([
            "# WiFiForge lab candidate list — generated, do not hand-edit.",
            "# The lab PSK is intentionally included so `hashcat -m 22000` can be verified.",
            "password123", "ForgeLab2026!", "Summer2026!", "wififorge", "letmein2026",
            "CorrectHorseBatteryStaple!WPA3_2024_Secure", "Tr0ub4dor&3_S3cur3_16+_R4nd0m!",
        ]) + "\n")

    with open(os.path.join(PCAP_ROOT, "MANIFEST.md"), "w") as fh:
        fh.write("\n".join(manifest))
        fh.write("\n\n## Synthetic elements per capture\n\n")
        fh.write("| capture | synthetic / not cryptographically valid |\n| --- | --- |\n")
        for pcap_id, meta in inventory.items():
            fh.write(f"| `{pcap_id}` | {meta['synthetic']} |\n")
        fh.write("\nMachine-readable inventory: `frontend/src/content/lab-artifacts.json`.\n")

    with open(os.path.join(REPO, "frontend", "src", "content", "lab-artifacts.json"), "w") as fh:
        json.dump({"generated_by": "scripts/generate-lab-artifacts.py",
                   "credentials": {"lab_psk": LAB_PSK, "lab_psk_weak": LAB_PSK_WEAK,
                                   "eap_user": LAB_EAP_USER, "eap_password": LAB_EAP_PASSWORD,
                                   "radius_weak_secret": LAB_RADIUS_SECRET_WEAK.decode()},
                   "artifacts": inventory}, fh, indent=1)
    print(f"\nwrote {len(inventory)} captures, {len(inventory)} offline lab-data files, MANIFEST.md and lab-artifacts.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

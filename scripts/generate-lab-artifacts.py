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
    dhcp = b"\x01\x01\x06\x00" + b"\x11" * 4 + b"\x00" * 28 + b"\x00" * 16 + b"\x00" * 64
    lab.ip_from_sta(mac(STA_1), mac(AP_ESS_1), "0.0.0.0", "255.255.255.255",
                    udp(68, 67, dhcp))
    lab.ip_from_ap(mac(STA_1), mac(AP_ESS_1), "10.20.30.1", "10.20.30.51",
                   udp(67, 68, dhcp))
    lab.data(mac(AP_ESS_1), mac(STA_1), mac(AP_ESS_1),
             llc_snap(0x0806, b"\x00\x01\x08\x00\x06\x04\x00\x01"), from_ds=1)  # ARP request
    lab.data(mac(STA_1), mac(AP_ESS_1), mac(AP_ESS_1),
             llc_snap(0x0806, b"\x00\x01\x08\x00\x06\x04\x00\x02"), to_ds=1)   # ARP reply
    lab.ip_from_sta(mac(STA_1), mac(AP_ESS_1), "10.20.30.51", "10.20.30.10",
                    b"\x08\x00\x00\x00", proto=1)
    lab.ip_from_ap(mac(STA_1), mac(AP_ESS_1), "10.20.30.10", "10.20.30.51",
                   b"\x00\x00\x00\x00", proto=1)
    dns_query = b"\x12\x34\x01\x00\x00\x01\x00\x00\x00\x00\x00\x00" + b"\x03lab\x07example\x00" + b"\x00\x01\x00\x01"
    lab.ip_from_sta(mac(STA_1), mac(AP_ESS_1), "10.20.30.51", "10.20.30.1",
                    udp(51423, 53, dns_query))
    http = b"GET / HTTP/1.1\r\nHost: intranet.lab.example\r\nUser-Agent: curl/8.5.0\r\n\r\n"
    lab.data(mac(AP_ESS_1), mac(STA_1), mac(AP_ESS_1),
             llc_snap(0x0800, ipv4("10.20.30.51", "10.20.30.10", http, 6)), from_ds=1)
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
    lab.eapol_from_ap(sta, ap, eapol_eap(eap(EAP_REQUEST, 1, EAP_TYPE_WSC, b"\x01")))
    lab.eapol_over_wifi(sta, ap, eapol_eap(eap(EAP_RESPONSE, 1, EAP_TYPE_WSC,
        struct.pack("!HH", 0x104A, 2) + b"\x10\x4a" + struct.pack("!HH", 0x1022, 2) + struct.pack("!H", 0x0004))))
    return lab


def build_wpa3_transition() -> Lab:
    """11 — transition mode (PSK+SAE, MFPC only): a PSK client is still accepted."""
    lab = Lab("wpa3-transition", "wpa3")
    rsn = ie_rsn(akm=[AKM_PSK, AKM_SAE], caps=RSNCAP_MFPC)
    bss_beacon(lab, SSID_WPA3, AP_WPA3, 36, beacon_ies(rsn=rsn, band_5=True, he=True))
    # SAE authentication: auth algorithm 3, transaction 1 (commit) / 2 (confirm).
    sta, ap = mac(STA_2), mac(AP_WPA3)
    sae_commit = bytes([19]) + b"\x01" + b"\x00" * 96   # synthetic scalar/element (documented)
    sae_confirm = bytes([19]) + b"\x02" + b"\x00" * 32
    lab.mgmt(SUBTYPE_AUTH, ap, sta, ap, struct.pack("<HHH", 3, 1, 0) + sae_commit, channel=36)
    lab.mgmt(SUBTYPE_AUTH, sta, ap, ap, struct.pack("<HHH", 3, 1, 0) + sae_commit, channel=36)
    lab.mgmt(SUBTYPE_AUTH, ap, sta, ap, struct.pack("<HHH", 3, 2, 0) + sae_confirm, channel=36)
    lab.mgmt(SUBTYPE_AUTH, sta, ap, ap, struct.pack("<HHH", 3, 2, 0) + sae_confirm, channel=36)
    # A WPA2-era client does not offer SAE: it runs the PSK 4-way handshake against the
    # same BSS, which is exactly the downgrade path in transition mode.
    sta2 = mac(STA_1)
    lab.mgmt(SUBTYPE_AUTH, ap, sta2, ap, struct.pack("<HHH", 0, 1, 0), channel=36)
    lab.mgmt(SUBTYPE_AUTH, sta2, ap, ap, struct.pack("<HHH", 0, 2, 0), channel=36)
    _four_way(lab, sta2, ap, SSID_WPA3, LAB_PSK, channel=36)
    lab.meta = {"psk": LAB_PSK, "ssid": SSID_WPA3}  # type: ignore[attr-defined]
    return lab


def build_wpa3_only() -> Lab:
    """11 — WPA3-only: SAE + MFPR, no PSK handshake possible."""
    lab = Lab("wpa3-only", "wpa3")
    rsn = ie_rsn(akm=[AKM_SAE], caps=RSNCAP_MFPC | RSNCAP_MFPR)
    bss_beacon(lab, SSID_WPA3_ONLY, AP_WPA3_ONLY, 36, beacon_ies(rsn=rsn, band_5=True, he=True))
    sta, ap = mac(STA_2), mac(AP_WPA3_ONLY)
    sae_commit = bytes([19]) + b"\x01" + b"\x00" * 96
    sae_confirm = bytes([19]) + b"\x02" + b"\x00" * 32
    lab.mgmt(SUBTYPE_AUTH, ap, sta, ap, struct.pack("<HHH", 3, 1, 0) + sae_commit, channel=36)
    lab.mgmt(SUBTYPE_AUTH, sta, ap, ap, struct.pack("<HHH", 3, 1, 0) + sae_commit, channel=36)
    lab.mgmt(SUBTYPE_AUTH, ap, sta, ap, struct.pack("<HHH", 3, 2, 0) + sae_confirm, channel=36)
    lab.mgmt(SUBTYPE_AUTH, sta, ap, ap, struct.pack("<HHH", 3, 2, 0) + sae_confirm, channel=36)
    # A protected deauthentication from the AP (Robust Management Frame). The BIP MIC is
    # synthetic (IGTK is unknown to a passive listener) — see MANIFEST.md.
    lab.mgmt(SUBTYPE_DEAUTH, sta, ap, ap, struct.pack("<HH", REASON_GROUP_KEY_UPDATE, 0) + b"\x00" * 16,
             flags=0x40, channel=36)
    return lab


def build_deauth() -> Lab:
    """12 — spoofed deauth against a PMF-capable BSS vs. a PMF-required BSS."""
    lab = Lab("deauth", "deauth")
    bss_beacon(lab, SSID_DEAUTH, AP_DEAUTH, 6, beacon_ies(
        rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)))              # capable, not required
    bss_beacon(lab, SSID_DEAUTH_PMF, AP_DEAUTH_PMF, 1, beacon_ies(
        rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC | RSNCAP_MFPR)))  # PMF required
    # 1) Broadcast deauth flood (reason 1, unspecified) — spoofed SA.
    for _ in range(12):
        lab.mgmt(SUBTYPE_DEAUTH, b"\xff" * 6, mac(AP_DEAUTH), mac(AP_DEAUTH),
                 struct.pack("<HH", REASON_UNSPECIFIED, 0), channel=6, dt_us=1500)
    # 2) Directed deauth (reason 7: class 3 frame from non-associated STA) — the classic
    #    "kick a client to capture its handshake" pattern.
    lab.mgmt(SUBTYPE_DEAUTH, mac(STA_1), mac(AP_DEAUTH), mac(AP_DEAUTH),
             struct.pack("<HH", REASON_CLASS3_FRAME, 0), channel=6)
    lab.mgmt(SUBTYPE_DEAUTH, mac(STA_1), mac(AP_DEAUTH), mac(AP_DEAUTH),
             struct.pack("<HH", REASON_CLASS3_FRAME, 0), channel=6)
    # 3) Disassociation (reason 8: STA leaving BSS).
    lab.mgmt(SUBTYPE_DISASSOC, mac(STA_1), mac(AP_DEAUTH), mac(AP_DEAUTH),
             struct.pack("<HH", 8, 0), channel=6)
    # 4) Reason 15 (4-way handshake timeout) is what a client that never sees M3 reports.
    lab.mgmt(SUBTYPE_DEAUTH, mac(AP_DEAUTH), mac(STA_1), mac(AP_DEAUTH),
             struct.pack("<HH", REASON_4WAY_TIMEOUT, 0), channel=6)
    # 5) Against the PMF-required BSS the same spoof fails: the deauth is either ignored
    #    (no PMF-association) or must carry a valid BIP MIC, and the AP probes with SA Query.
    lab.mgmt(SUBTYPE_DEAUTH, mac(STA_1), mac(AP_DEAUTH_PMF), mac(AP_DEAUTH_PMF),
             struct.pack("<HH", REASON_CLASS3_FRAME, 0), channel=1)
    lab.mgmt(SUBTYPE_DEAUTH, mac(STA_1), mac(AP_DEAUTH_PMF), mac(AP_DEAUTH_PMF),
             struct.pack("<HH", REASON_CLASS3_FRAME, 0), channel=1)
    # SA Query: action category 8, SA Query Request/Response (802.11w keeps the
    # association alive while it verifies the peer still holds the PTK).
    lab.mgmt(13, mac(STA_1), mac(AP_DEAUTH_PMF), mac(AP_DEAUTH_PMF),
             bytes([8, 0]) + b"\x01\x02", channel=1)
    lab.mgmt(13, mac(AP_DEAUTH_PMF), mac(STA_1), mac(AP_DEAUTH_PMF),
             bytes([8, 1]) + b"\x01\x02", channel=1)
    return lab


def build_rogue_ap() -> Lab:
    """13 — evil twin: cloned SSID, different BSSID/IE fingerprint, client joins it."""
    lab = Lab("rogue-ap", "rogue")
    legit_rsn = ie_rsn(akm=[AKM_8021X], caps=RSNCAP_MFPC | RSNCAP_MFPR)
    rogue_rsn = ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)
    bss_beacon(lab, SSID_CORP, AP_CORP_1, 36, beacon_ies(rsn=legit_rsn, band_5=True, he=True), signal=-52)
    # Rogue: same SSID, locally-administered BSSID, PSK instead of 802.1X, no PMF required,
    # 2.4 GHz only, different vendor IE set and a much louder signal next to the client.
    bss_beacon(lab, SSID_ROGUE_CLONE, AP_ROGUE, 6, beacon_ies(rsn=rogue_rsn), signal=-31,
               capability=0x0431, interval=50)
    # Deauth the client off the legitimate BSS, then let it roam to the clone.
    lab.mgmt(SUBTYPE_DEAUTH, mac(STA_1), mac(AP_CORP_1), mac(AP_CORP_1),
             struct.pack("<HH", REASON_CLASS3_FRAME, 0), channel=36)
    lab.mgmt(SUBTYPE_DEAUTH, mac(STA_1), mac(AP_CORP_1), mac(AP_CORP_1),
             struct.pack("<HH", REASON_CLASS3_FRAME, 0), channel=36)
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
    dhcp_offer = b"\x02\x01\x06\x00" + b"\x22" * 4 + b"\x00" * 28 + b"\xc0\xa8\x42\x01" + b"\x00" * 16 + b"\x00" * 64
    lab.ip_from_ap(mac(STA_1), mac(AP_ROGUE), "192.168.66.1", "192.168.66.50", udp(67, 68, dhcp_offer))
    http_get = b"GET /portal HTTP/1.1\r\nHost: 192.168.66.1\r\n\r\n"
    lab.data(mac(AP_ROGUE), mac(STA_1), mac(AP_ROGUE),
             llc_snap(0x0800, ipv4("192.168.66.50", "192.168.66.1", http_get, 6)), from_ds=1)
    portal = (b"HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n"
              b"<form action='/login' method='POST'><input name='u'><input name='p' type='password'></form>")
    lab.data(mac(STA_1), mac(AP_ROGUE), mac(AP_ROGUE),
             llc_snap(0x0800, ipv4("192.168.66.1", "192.168.66.50", portal, 6)), to_ds=1)
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
    dhcp = b"\x01\x01\x06\x00" + b"\x33" * 4 + b"\x00" * 28
    lab.ip_from_sta(sta, ap, "0.0.0.0", "255.255.255.255", udp(68, 67, dhcp))
    offer = b"\x02\x01\x06\x00" + b"\x33" * 4 + b"\x00" * 28 + b"\x0a\x00\x00\x01" + b"\x00" * 16 + b"\x00" * 64
    lab.ip_from_ap(sta, ap, "10.0.0.1", "10.0.0.87", udp(67, 68, offer))
    # Portal flow: HTTP GET → 302 redirect to the portal host → POST with cleartext creds.
    lab.data(ap, sta, ap, llc_snap(0x0800, ipv4("10.0.0.87", "1.1.1.1",
             b"GET / HTTP/1.1\r\nHost: connectivity-check.example\r\n\r\n", 6)), to_ds=1)
    redirect = (b"HTTP/1.1 302 Found\r\nLocation: http://portal.guest.example/login?mac=12:34:56:78:9a:bc\r\n"
                b"Content-Length: 0\r\n\r\n")
    lab.data(sta, ap, ap, llc_snap(0x0800, ipv4("1.1.1.1", "10.0.0.87", redirect, 6)), from_ds=1)
    post = (b"POST /login HTTP/1.1\r\nHost: portal.guest.example\r\n"
            b"Content-Type: application/x-www-form-urlencoded\r\n\r\n"
            b"username=guest1&password=Welcome2025&mac=12%3A34%3A56%3A78%3A9a%3Abc")
    lab.data(ap, sta, ap, llc_snap(0x0800, ipv4("10.0.0.87", "10.0.0.10", post, 6)), to_ds=1)
    ok = b"HTTP/1.1 200 OK\r\nSet-Cookie: session=8f14e45fceea167a5a36dedd4bea2543; Path=/\r\n\r\nWelcome"
    lab.data(sta, ap, ap, llc_snap(0x0800, ipv4("10.0.0.10", "10.0.0.87", ok, 6)), from_ds=1)
    # Client isolation is *not* enforced: a second guest client is reachable directly.
    sta2 = mac(STA_5)
    lab.data(sta2, ap, ap, llc_snap(0x0806, b"\x00\x01\x08\x00\x06\x04\x00\x01"), to_ds=1)
    lab.data(ap, sta2, ap, llc_snap(0x0806, b"\x00\x01\x08\x00\x06\x04\x00\x02"), to_ds=1)
    return lab


def radius_request(identifier: int, attrs: bytes, secret: bytes) -> bytes:
    """Access-Request / Accounting-Request with a correct Message-Authenticator (RFC 3579).

    The Request Authenticator is zero on the wire, so the attribute is computed over
    the packet exactly as a NAS would compute it.
    """
    placeholder = radius_attr(ATTR_MESSAGE_AUTHENTICATOR, b"\x00" * 16)
    packet = radius_packet(RADIUS_ACCESS_REQUEST, identifier, attrs + placeholder, bytes(16))
    ma = radius_message_authenticator(packet, secret)
    return radius_packet(RADIUS_ACCESS_REQUEST, identifier,
                         attrs + radius_attr(ATTR_MESSAGE_AUTHENTICATOR, ma), bytes(16))


def radius_response(identifier: int, code: int, attrs: bytes, secret: bytes,
                    request_authenticator: bytes) -> bytes:
    """Server reply with the Response Authenticator of RFC 2865 §3."""
    length = 20 + len(attrs)
    authenticator = radius_response_authenticator(code, identifier, length,
                                                  request_authenticator, attrs, secret)
    return radius_packet(code, identifier, attrs, authenticator)


def _eap_expanded(eap_type: int, data: bytes = b"", code: int = EAP_REQUEST, identifier: int = 1) -> bytes:
    return eap(code, identifier, eap_type, data)


def build_radius() -> Lab:
    """17 — RADIUS exchange over real IP/UDP with verifiable authenticators."""
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
    # Access-Challenge — server starts PEAP.
    challenge_attrs = (radius_attr(ATTR_STATE, b"\x8f\x1c\x22\x0a")
                       + radius_attr(ATTR_EAP_MESSAGE, _eap_expanded(EAP_TYPE_PEAP, b"\x01", EAP_REQUEST, 2)))
    resp1 = radius_response(2, RADIUS_ACCESS_CHALLENGE, challenge_attrs,
                            LAB_RADIUS_SECRET_WEAK, req1[4:20])
    from_radius(radius_ip, nas_ip, resp1, 1812, 49152)
    # Inner exchange (captured by a rogue AP that terminated TLS — see MANIFEST.md):
    # MS-CHAPv2 challenge/response is what hashcat -m 5500 attacks.
    peer_challenge = hashlib.sha256(b"peer:" + sta).digest()[:16]
    auth_challenge = hashlib.sha256(b"auth:" + sta).digest()[:16]
    nt_response, nt_hash, chap_hash = mschapv2_credentials(
        LAB_EAP_PASSWORD, auth_challenge, peer_challenge, LAB_EAP_USER)
    chap_challenge = mschapv2_challenge(auth_challenge, "corp-lab", identifier=3)
    chap_response = mschapv2_response(peer_challenge, nt_response,
                                      LAB_EAP_USER.encode("utf-16-le"), identifier=3)
    inner_request = eap(EAP_REQUEST, 3, EAP_TYPE_MSCHAPV2, chap_challenge)
    inner_response = eap(EAP_RESPONSE, 3, EAP_TYPE_MSCHAPV2, chap_response)
    to_radius(nas_ip, radius_ip,
              radius_request(2, radius_attr(ATTR_USER_NAME, identity)
                             + radius_attr(ATTR_EAP_MESSAGE, inner_request), LAB_RADIUS_SECRET_WEAK),
              49152, 1812)
    from_radius(radius_ip, nas_ip,
                radius_response(3, RADIUS_ACCESS_CHALLENGE,
                                radius_attr(ATTR_STATE, b"\x8f\x1c\x22\x0a")
                                + radius_attr(ATTR_EAP_MESSAGE, inner_response),
                                LAB_RADIUS_SECRET_WEAK, req1[4:20]),
                1812, 49152)
    # Access-Accept — VLAN assignment + MS-MPPE keys, Response Authenticator verifiable.
    accept_attrs = (radius_attr(ATTR_USER_NAME, identity)
                    + radius_attr(ATTR_TUNNEL_TYPE, struct.pack("!I", 13))
                    + radius_attr(ATTR_TUNNEL_MEDIUM_TYPE, struct.pack("!I", 6))
                    + radius_attr(ATTR_TUNNEL_PRIVATE_GROUP_ID, b"100")
                    + radius_attr(ATTR_EAP_MESSAGE, eap(EAP_SUCCESS, 4, EAP_TYPE_MSCHAPV2,
                                                        mschapv2_result(3, "S=1E7A2C9F4B6D0E83A1C5F7B9D2E4A6C8B0D3F5A7", utf16_message=True)))
                    + radius_vsa(MS_VENDOR_ID, MS_ATTR_MPPE_SEND_KEY, b"\x1c\x2a\xf3\x91" + b"\x00" * 30)
                    + radius_vsa(MS_VENDOR_ID, MS_ATTR_MPPE_RECV_KEY, b"\x5b\x77\x02\xe4" + b"\x00" * 30))
    accept = radius_response(4, RADIUS_ACCESS_ACCEPT, accept_attrs,
                             LAB_RADIUS_SECRET_WEAK, req1[4:20])
    from_radius(radius_ip, nas_ip, accept, 1812, 49152)
    # Accounting-Request Start / Response.
    acct_attrs = (radius_attr(ATTR_USER_NAME, identity)
                  + radius_attr(ATTR_NAS_IP, bytes([10, 20, 30, 1]))
                  + radius_attr(40, struct.pack("!I", 1))
                  + radius_attr(44, b"session-0001"))
    to_radius(nas_ip, radius_ip, radius_request(5, acct_attrs, LAB_RADIUS_SECRET_WEAK),
              49153, 1813)
    from_radius(radius_ip, nas_ip, radius_response(5, RADIUS_ACCOUNTING_RESPONSE, b"",
                                                   LAB_RADIUS_SECRET_WEAK, req1[4:20]), 1813, 49153)
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
    """15/16 — 802.1X: identity, PEAP tunnel, MSK → PMK → 4-way handshake."""
    lab = Lab("enterprise", "enterprise")
    bss_beacon(lab, SSID_CORP, AP_CORP_1, 6, beacon_ies(
        rsn=ie_rsn(akm=[AKM_8021X, AKM_8021X_SHA256], caps=RSNCAP_MFPC | RSNCAP_MFPR)))
    sta, ap = mac(STA_2), mac(AP_CORP_1)
    lab.eapol_over_wifi(sta, ap, bytes([2, 1, 0x00, 0x00]))                    # EAPOL-Start
    lab.eapol_from_ap(sta, ap, eapol_eap(eap(EAP_REQUEST, 1, EAP_TYPE_IDENTITY, b"corp.example")))
    lab.eapol_over_wifi(sta, ap, eapol_eap(eap(EAP_RESPONSE, 1, EAP_TYPE_IDENTITY, b"anonymous@corp.example")))
    # PEAP: outer identity is anonymous, the real identity travels inside the TLS tunnel.
    tls_record = b"\x16\x03\x01\x00\x2e" + b"\x01" + b"\x00" * 45      # synthetic TLS ClientHello
    lab.eapol_over_wifi(sta, ap, eapol_eap(eap(EAP_RESPONSE, 2, EAP_TYPE_PEAP, b"\x00" + tls_record)))
    lab.eapol_from_ap(sta, ap, eapol_eap(eap(EAP_REQUEST, 3, EAP_TYPE_PEAP, b"\x02" + tls_record)))
    lab.eapol_over_wifi(sta, ap, eapol_eap(eap(EAP_RESPONSE, 3, EAP_TYPE_PEAP, b"\x00" + tls_record)))
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
    """16 — PEAP vs TTLS vs TLS, plus rogue-AP MS-CHAPv2 capture (real crackable values)."""
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
    """18 — the full chain: recon → evil twin → MS-CHAPv2 capture → segmentation test."""
    lab = Lab("corporate-attacks", "corporate")
    iot_wps = ie_wps(setup_locked=False, selected_registrar=True, wps_state=2,
                     device_password_id=0x0004, config_methods=WPS_CONFIG_LABEL | WPS_CONFIG_DISPLAY)
    bss_beacon(lab, SSID_CORP, AP_CORP_1, 36, beacon_ies(
        rsn=ie_rsn(akm=[AKM_8021X], caps=RSNCAP_MFPC | RSNCAP_MFPR), band_5=True, he=True), signal=-57)
    bss_beacon(lab, SSID_GUEST, AP_CORP_2, 6, beacon_ies(rsn=None), signal=-63)
    bss_beacon(lab, SSID_IOT, AP_IOT, 1, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC),
                                                    wps=iot_wps), signal=-71)
    sta, ap, rogue = mac(STA_1), mac(AP_CORP_1), mac(AP_ROGUE)
    # 1) Deauth the corporate client (PMF is required on the legitimate BSS, so the
    #    attacker has to *move* the client by drowning it with a louder twin instead).
    lab.mgmt(SUBTYPE_DEAUTH, sta, ap, ap, struct.pack("<HH", REASON_CLASS3_FRAME, 0), channel=36)
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
    # 3) Rogue RADIUS terminations never appear on the air — what appears is the inner
    #    MS-CHAPv2 exchange, captured because the twin terminated PEAP.
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
    # 4) Segmentation test: the guest client (STA_5) reaches a corporate host because the
    #    ACL between guest and corp VLANs was never applied.
    guest = mac(STA_5)
    lab.data(guest, ap, ap, llc_snap(0x0800, ipv4("10.0.0.87", "10.20.30.10", b"\x08\x00\x00\x00", 1)),
             to_ds=1, channel=6)
    lab.data(ap, guest, ap, llc_snap(0x0800, ipv4("10.20.30.10", "10.0.0.87", b"\x00\x00\x00\x00", 1)),
             to_ds=1, channel=6)
    lab.meta = {  # type: ignore[attr-defined]
        "lab_psk": LAB_PSK,
        "mschapv2": {"user": LAB_EAP_USER, "password": LAB_EAP_PASSWORD,
                     "challenge": challenge.hex(), "peer_challenge": peer.hex(),
                     "nt_response": nt_response.hex(), "nt_hash": nt_hash.hex()},
    }
    return lab


def build_methodology() -> Lab:
    """19/20 — final engagement artifact: everything an assessment must evidence."""
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
    # PMF-disabled BSS with an injected deauth (availability finding).
    lab.mgmt(SUBTYPE_DEAUTH, b"\xff" * 6, mac(AP_ESS_1), mac(AP_ESS_1),
             struct.pack("<HH", REASON_UNSPECIFIED, 0), channel=6)
    # Rogue twin of the corporate SSID.
    bss_beacon(lab, SSID_CORP, AP_ROGUE, 6, beacon_ies(rsn=ie_rsn(akm=[AKM_PSK], caps=RSNCAP_MFPC)),
               signal=-30, interval=50)
    # Corporate 802.1X + PEAP flow.
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
    guest = mac(STA_5)
    lab.data(corp_ap, corp_ap, guest, llc_snap(0x0800, ipv4("10.0.0.87", "10.20.30.10",
             b"\x08\x00\x00\x00", 1)), to_ds=1, channel=6)
    lab.data(guest, guest, corp_ap, llc_snap(0x0800, ipv4("10.20.30.10", "10.0.0.87",
             b"\x00\x00\x00\x00", 1)), to_ds=1, channel=6)
    lab.meta = {  # type: ignore[attr-defined]
        "weak_psk": LAB_PSK_WEAK,
        "mschapv2": {"user": LAB_EAP_USER, "password": LAB_EAP_PASSWORD,
                     "challenge": challenge.hex(), "peer_challenge": peer.hex(),
                     "nt_response": nt_response.hex(), "nt_hash": nt_hash.hex()},
    }
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
]

# Per-artifact documentation of what is cryptographically real (goes into MANIFEST.md)
ARTIFACT_NOTES: Dict[str, Dict[str, str]] = {
    "beacon-only": {"real": "Beacon/probe fixed fields, IEs, RSNE (AKM, ciphers, MFPC/MFPR bits), country/VHT/HE/capability IEs",
                    "synthetic": "nothing cryptographic — passive capture"},
    "recon-lab": {"real": "6 BSSs incl. an ESS, a hidden BSS revealed in the probe response, directed probes leaking a PNL, randomised client MAC",
                  "synthetic": "nothing cryptographic — passive capture"},
    "traffic-analysis": {"real": "Full association state machine, EAPOL-Key M1–M4 with MICs computed from the lab PSK, DHCP/ARP/ICMP/DNS/HTTP payloads",
                         "synthetic": "DHCP option bytes are minimal (fixed-size); HTTP/DNS bodies are lab strings"},
    "wpa2-handshake": {"real": "M1–M4 for one client and M1–M2 for a second; MICs, nonces and replay counters consistent with the lab PSK",
                       "synthetic": "key rsc/key id reserved bytes are zero (normal for a sniffer capture)"},
    "pmkid": {"real": "PMKID = HMAC-SHA1-128(PMK, \"PMK Name\" | AA | SPA) inside a real EAPOL-Key M1 header",
              "synthetic": "the association exchange around it is minimal"},
    "wps-beacon": {"real": "WPS IE attributes (version, config methods, AP setup locked, selected registrar, device password id) for an unlocked and a locked AP; EAP-WSC identity/M1 framing",
                   "synthetic": "no full M1–M8 WSC exchange (would require a real registrar)"},
    "wpa3-transition": {"real": "RSNE with AKM PSK+SAE and MFPC-only; a WPA2 PSK 4-way handshake captured against the transition BSS (the downgrade path)",
                        "synthetic": "SAE commit/confirm payloads — real SAE scalars need a live DH exchange; the point of the lab is that they are not crackable offline"},
    "wpa3-only": {"real": "RSNE with AKM SAE and MFPR set; no PSK handshake exists in the capture",
                  "synthetic": "SAE payload and the BIP MIC of the protected deauth (IGTK is not knowable to a passive listener)"},
    "deauth": {"real": "Deauthentication/disassociation frames with reason codes 1/7/8/15, broadcast and directed floods, SA Query action frames",
               "synthetic": "nothing cryptographic — the deauth flood is unauthenticated by design (that is the finding)"},
    "rogue-ap": {"real": "Rogue twin with locally-administered BSSID, different AKM, IE fingerprint and a 50 TU beacon interval; client 4-way handshake against the twin with the weak lab PSK",
                 "synthetic": "captive portal HTML payload is a lab string"},
    "captive-portal": {"real": "Open BSS, DHCP, HTTP 302 redirect to the portal, cleartext POST credentials, session cookie, client-to-client ARP (no isolation)",
                       "synthetic": "portal HTML/HTTP bodies are lab strings"},
    "radius": {"real": "RADIUS over IPv4/UDP 1812-1813 with verifiable Message-Authenticator (Access-Request) and Response Authenticator (Accept/Challenge/Accounting), Tunnel-Private-Group-Id VLAN 100, MS-MPPE keys, a rogue NAS with a wrong Message-Authenticator, and real MS-CHAPv2 challenge/response material",
               "synthetic": "MS-MPPE key material is a lab value (the real keys are encrypted with the shared secret)"},
    "enterprise": {"real": "802.1X/EAPOL-Start → EAP-Identity → PEAP → MSK → PMK → 4-way handshake, anonymous outer identity, MICs consistent with the documented lab MSK",
                   "synthetic": "TLS records are structural only; the MSK is a documented lab value instead of one derived from a TLS master secret"},
    "eap": {"real": "PEAP / EAP-TLS / EAP-TTLS outer exchanges, and MS-CHAPv2 Challenge/Response/Success with values derived from the documented lab password (crackable material)",
            "synthetic": "TLS record payloads are structural only"},
    "corporate-attacks": {"real": "Full chain: deauth, evil twin with weak PSK handshake, MS-CHAPv2 capture, guest→corp segmentation success",
                          "synthetic": "TLS/MSK details as in `enterprise`"},
    "methodology": {"real": "Multi-BSS engagement capture: ESS, hidden BSS reveal, weak-PSK handshake, PMF-disabled deauth, rogue twin, 802.1X/PEAP, MS-CHAPv2, segmentation and isolation evidence",
                    "synthetic": "TLS records and SAE payloads (as above)"},
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
        "Every capture is a real PCAPNG (radiotap + 802.11) that decodes in Wireshark/tshark.",
        "Lab credentials are published on purpose so results can be verified end to end:",
        "",
        f"* `LAB_PSK = {LAB_PSK}` (SSID `{SSID_ESS}`, `{SSID_WPA3}`, rogue twin)",
        f"* `LAB_PSK_WEAK = {LAB_PSK_WEAK}` (SSID `LAB-WEAK-PSK`, rogue twin in `rogue-ap.pcapng`)",
        f"* 802.1X user `{LAB_EAP_USER}` / password `{LAB_EAP_PASSWORD}` (PEAP/MS-CHAPv2 labs)",
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

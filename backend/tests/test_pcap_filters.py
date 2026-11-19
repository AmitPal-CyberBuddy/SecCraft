from pathlib import Path
import sys

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
from app.services import pcap_parser


pytestmark = pytest.mark.skipif(not pcap_parser.SCAPY_AVAILABLE, reason="Scapy is not installed")


def _mixed_capture(path: Path) -> None:
    from scapy.all import (
        Dot11,
        Dot11Auth,
        Dot11Beacon,
        Dot11Deauth,
        Dot11Elt,
        EAPOL,
        IP,
        LLC,
        RadioTap,
        SNAP,
        UDP,
        wrpcap,
    )
    from scapy.layers.eap import EAP
    from scapy.layers.radius import Radius

    bssid = "00:11:22:33:44:55"
    packets = [
        RadioTap()
        / Dot11(type=0, subtype=8, addr1="ff:ff:ff:ff:ff:ff", addr2=bssid, addr3=bssid)
        / Dot11Beacon()
        / Dot11Elt(ID=0, info=b"LAB-WIFI"),
        RadioTap()
        / Dot11(type=0, subtype=11, addr1="ff:ff:ff:ff:ff:ff", addr2=bssid, addr3=bssid)
        / Dot11Auth(),
        RadioTap()
        / Dot11(type=0, subtype=12, addr1="ff:ff:ff:ff:ff:ff", addr2=bssid, addr3=bssid)
        / Dot11Deauth(reason=7),
        RadioTap()
        / Dot11(type=2, subtype=0, addr1=bssid, addr2="00:11:22:33:44:66", addr3=bssid)
        / LLC(dsap=0xAA, ssap=0xAA, ctrl=3)
        / SNAP(code=0x888E)
        / EAPOL(version=1, type=0)
        / EAP(code=1, id=1, type=1),
        RadioTap()
        / Dot11(type=2, subtype=0, addr1=bssid, addr2="00:11:22:33:44:66", addr3=bssid)
        / LLC(dsap=0xAA, ssap=0xAA, ctrl=3)
        / SNAP(code=0x0800)
        / IP(src="192.0.2.10", dst="192.0.2.20")
        / UDP(sport=1812, dport=1812)
        / Radius(code=1, id=1, authenticator=b"x" * 16),
    ]
    wrpcap(str(path), packets)


def test_scapy_filters_are_exact_for_control_ssid_and_eap_protocols(tmp_path: Path) -> None:
    capture = tmp_path / "mixed.pcap"
    _mixed_capture(capture)

    auth = pcap_parser.parse_with_scapy(capture, "wlan.fc.type_subtype==11")
    assert [(frame["number"], frame["subtype_name"]) for frame in auth] == [(2, "Authentication")]

    deauth = pcap_parser.parse_with_scapy(capture, "wlan.fc.type_subtype==12")
    assert [(frame["number"], frame["subtype_name"]) for frame in deauth] == [(3, "Deauthentication")]

    beacon = pcap_parser.parse_with_scapy(capture, 'wlan.ssid=="LAB-WIFI"')
    assert [(frame["number"], frame["ssid"]) for frame in beacon] == [(1, "LAB-WIFI")]
    assert pcap_parser.parse_with_scapy(capture, "wlan.ssid==LAB-WIFI") == beacon

    eap = pcap_parser.parse_with_scapy(capture, "eap")
    assert [frame["number"] for frame in eap] == [4]
    assert eap[0]["eap"] is True
    eapol = pcap_parser.parse_with_scapy(capture, "eapol")
    assert [frame["number"] for frame in eapol] == [4]
    radius = pcap_parser.parse_with_scapy(capture, "radius")
    assert [frame["number"] for frame in radius] == [5]
    assert radius[0]["radius"] is True


def test_scapy_rejects_unhandled_filter_instead_of_returning_every_frame(tmp_path: Path) -> None:
    capture = tmp_path / "mixed.pcap"
    _mixed_capture(capture)

    with pytest.raises(pcap_parser.UnsupportedDisplayFilter):
        pcap_parser.parse_with_scapy(capture, "wlan.fc.type == 0")


def test_unknown_filter_fallback_is_reported_as_unfiltered(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    capture = tmp_path / "mixed.pcap"
    _mixed_capture(capture)
    offline = [
        {"number": 1, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "LAB-WIFI"},
        {"number": 2, "type": 0, "subtype": 11, "subtype_name": "Authentication"},
    ]
    monkeypatch.setattr(pcap_parser, "tshark_available", lambda: False)
    monkeypatch.setattr(pcap_parser, "offline_frames", lambda _pcap_id: offline)

    result = pcap_parser.parse_pcap(capture, "wlan.fc.type == 0", "mixed")

    assert result["filter"] == ""
    assert [frame["number"] for frame in result["frames"]] == [1, 2]
    assert "shown unfiltered" in result["note"]


def test_radius_filter_distinguishes_a_real_empty_match_from_radius_frames() -> None:
    public_pcaps = BACKEND_DIR.parent / "frontend" / "public" / "pcaps"
    eap = pcap_parser.parse_pcap(public_pcaps / "eap" / "eap.pcapng", "radius", "eap")
    assert eap["filter"] == "radius"
    assert eap["frames"] == []
    assert "No frames matched the requested filter" in eap["note"]

    radius = pcap_parser.parse_pcap(public_pcaps / "radius" / "radius.pcapng", "radius", "radius")
    assert radius["filter"] == "radius"
    assert len(radius["frames"]) == 9

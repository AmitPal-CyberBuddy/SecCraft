"""Parser fallbacks distinguish unsupported filters, true empty matches, and unavailable parsers."""
from pathlib import Path
import sys

import pytest

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
from app.services import pcap_parser


def test_available_parser_with_no_offline_fallback_is_not_reported_as_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(pcap_parser, "SCAPY_AVAILABLE", True)
    monkeypatch.setattr(pcap_parser, "tshark_available", lambda: False)
    monkeypatch.setattr(pcap_parser, "parse_with_scapy", lambda *_args, **_kwargs: [])
    monkeypatch.setattr(pcap_parser, "offline_frames", lambda _pcap_id: [])

    result = pcap_parser.parse_pcap(Path("missing.pcapng"), pcap_id="missing")

    assert result["method"] == "scapy"
    assert "available scapy parser produced no frames" in result["note"]
    assert "No TShark or Scapy parser is available" not in result["note"]

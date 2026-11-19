"""Unauthenticated PCAP discovery is restricted to the explicitly public sample tree."""
from pathlib import Path
import asyncio
import json
import sys

import pytest
from fastapi import HTTPException

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
from app.core import config
from app.routers import pcaps


def test_public_pcap_routes_ignore_private_repository_captures(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    public_root = tmp_path / "frontend" / "public" / "pcaps"
    private_root = tmp_path / "content" / "pcaps"
    offline_root = tmp_path / "frontend" / "public" / "lab-data"
    public_root.mkdir(parents=True)
    private_root.mkdir(parents=True)
    offline_root.mkdir(parents=True)
    (public_root / "approved-sample.pcapng").write_bytes(b"public synthetic sample")
    (private_root / "private-customer-capture.pcapng").write_bytes(b"must never be parsed through the public PCAP API")
    (offline_root / "offline-fixture.json").write_text(json.dumps({"frames": [
        {"number": 1, "type": 0, "subtype": 8, "subtype_name": "Beacon", "ssid": "LAB"},
        {"number": 2, "type": 0, "subtype": 11, "subtype_name": "Authentication", "ssid": "LAB"},
    ]}))

    monkeypatch.setattr(pcaps, "PCAP_DIR", public_root)
    monkeypatch.setattr(pcaps, "OFFLINE_DATA_DIR", offline_root)
    monkeypatch.setattr(config, "PCAP_DIR", public_root)
    monkeypatch.setattr(config, "REPO_CONTENT_DIR", tmp_path / "content")
    monkeypatch.setattr(config, "OFFLINE_DATA_DIR", offline_root)

    assert pcaps.find_pcap("approved-sample") == public_root / "approved-sample.pcapng"
    assert pcaps.find_pcap("private-customer-capture") is None
    catalogue = asyncio.run(pcaps.list_pcaps())
    listed_ids = {entry["id"] for entry in catalogue["pcaps"]}
    assert listed_ids == {"approved-sample"}
    with pytest.raises(HTTPException) as error:
        asyncio.run(pcaps.analyze_pcap("private-customer-capture"))
    assert error.value.status_code == 404

    unfiltered = asyncio.run(pcaps.analyze_pcap("offline-fixture", "wlan.fc.type == 0"))
    assert unfiltered["filter"] == ""
    assert len(unfiltered["frames"]) == 2
    assert "shown unfiltered" in unfiltered["note"]
    paged = asyncio.run(pcaps.get_frames("offline-fixture", "wlan.fc.type == 0", limit=1, offset=0))
    assert paged["filter"] == ""
    assert paged["total"] == 2
    assert len(paged["frames"]) == 1
    assert "shown unfiltered" in paged["note"]

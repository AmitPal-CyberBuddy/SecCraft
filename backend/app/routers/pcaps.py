import json
import re
from fastapi import APIRouter, Query, HTTPException
from pathlib import Path
from typing import Optional
from app.core.config import OFFLINE_DATA_DIR, PCAP_DIR
from app.services.pcap_parser import parse_pcap, tshark_available, SCAPY_AVAILABLE

router = APIRouter()

def find_pcap(pcap_id: str) -> Optional[Path]:
    """Locate a capture in the explicitly public, bundled PCAP directory only."""
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,127}", pcap_id) or not PCAP_DIR.exists() or PCAP_DIR.is_symlink():
        return None
    public_root = PCAP_DIR.resolve()

    def curated(candidate: Path) -> bool:
        try:
            return (
                candidate.is_file()
                and not candidate.is_symlink()
                and candidate.stat().st_size <= 5 * 1024 * 1024
                and candidate.resolve().is_relative_to(public_root)
            )
        except OSError:
            return False

    for suffix in (".pcapng", ".pcap"):
        candidate = PCAP_DIR / f"{pcap_id}{suffix}"
        if curated(candidate):
            return candidate

    for candidate in sorted(PCAP_DIR.rglob("*")):
        if candidate.stem == pcap_id and candidate.suffix.lower() in {".pcap", ".pcapng"} and curated(candidate):
            return candidate
    return None


@router.get("/pcaps")
async def list_pcaps():
    """List only the small, intentionally public captures bundled with the frontend."""
    pcaps = []
    seen = set()
    if PCAP_DIR.exists() and not PCAP_DIR.is_symlink():
        public_root = PCAP_DIR.resolve()
        for capture in sorted(PCAP_DIR.rglob("*")):
            if capture.suffix.lower() not in {".pcap", ".pcapng"} or capture.is_symlink():
                continue
            try:
                if not capture.is_file() or not capture.resolve().is_relative_to(public_root) or capture.stat().st_size > 5 * 1024 * 1024:
                    continue
            except OSError:
                continue
            if capture.name in seen:
                continue
            seen.add(capture.name)
            path_hint = str(capture.relative_to(PCAP_DIR)).lower()
            module = "unknown"
            if "wifi-fundamentals" in path_hint or "beacon" in path_hint:
                module = "02-wifi-fundamentals"
            elif "recon" in path_hint:
                module = "05-wireless-recon"
            elif "traffic" in path_hint:
                module = "06-traffic-analysis"
            elif "wpa2" in path_hint or "handshake" in path_hint or "pmkid" in path_hint:
                module = "08-wpa-wpa2"
            elif "wps" in path_hint:
                module = "10-wps"
            elif "wpa3" in path_hint:
                module = "11-wpa3"
            elif "deauth" in path_hint:
                module = "12-deauth-disassoc"
            elif "rogue" in path_hint:
                module = "13-rogue-ap"
            elif "captive" in path_hint:
                module = "14-captive-portals"
            elif "enterprise" in path_hint or "eap" in path_hint or "radius" in path_hint:
                module = "15-enterprise-fundamentals"
            elif "corporate" in path_hint:
                module = "18-corporate-attacks"
            elif "methodology" in path_hint or "final" in path_hint or "capstone" in path_hint:
                module = "20-final-assessment"
            elif "wep" in path_hint:
                module = "07-wep-legacy"

            pcaps.append({
                "id": capture.stem,
                "filename": capture.name,
                "module": module,
                "size": capture.stat().st_size,
            })

    # A bare API checkout can still describe the verified public offline datasets; never scan the
    # private content repository from an unauthenticated discovery endpoint.
    if not pcaps:
        for meta_file in sorted(OFFLINE_DATA_DIR.glob("*.json")):
            try:
                meta = json.loads(meta_file.read_text())
            except (json.JSONDecodeError, OSError):
                continue
            frames = meta.get("frames", [])
            pcaps.append({
                "id": meta_file.stem,
                "filename": f"{meta_file.stem}.pcapng",
                "module": meta.get("module", ""),
                "type": meta.get("module", ""),
                "frames": len(frames) if isinstance(frames, list) else 0,
                "size": None,
                "path": None,
                "source": "offline dataset (frontend/public/lab-data)",
            })

    return {
        "pcaps": pcaps,
        "parser": {
            "tshark": tshark_available(),
            "scapy": SCAPY_AVAILABLE,
            "method": "tshark" if tshark_available() else ("scapy" if SCAPY_AVAILABLE else "offline-dataset")
        }
    }


@router.get("/pcaps/{pcap_id}/analyze")
async def analyze_pcap(pcap_id: str, filter: Optional[str] = Query(None, max_length=512, description="Wireshark display filter, e.g., wlan.fc.type_subtype==8")):
    """Decode a capture with tshark/scapy, falling back to the offline dataset.

    If the capture file is not present in this checkout, the offline dataset for that id (generated
    from the real file and verified by scripts/verify-lab-artifacts.py) is used, and the response says
    so via ``method``/``note``. A capture that is unknown in both places returns 404 — no placeholder
    frames are produced.
    """
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,127}", pcap_id):
        raise HTTPException(status_code=404, detail="PCAP not found")
    pcap_path = find_pcap(pcap_id)
    if pcap_path:
        return parse_pcap(pcap_path, display_filter=filter, pcap_id=pcap_id)

    from app.services.pcap_parser import offline_frames, _apply_display_filter, _parse_display_filter
    frames = offline_frames(pcap_id)
    if not frames:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No capture file and no offline dataset for '{pcap_id}'. Expected "
                f"frontend/public/pcaps/**.pcapng or frontend/public/lab-data/{pcap_id}.json "
                "(regenerate both with scripts/generate-lab-artifacts.py)."
            ),
        )

    parsed_filter = _parse_display_filter(filter)
    note = "Frames come from the offline dataset shipped with the frontend (no capture file in this checkout)."
    applied_filter = filter
    if filter and parsed_filter is None:
        applied_filter = None
        note += f' The requested filter “{filter}” was not evaluated; all frames are shown unfiltered.'
    else:
        frames = _apply_display_filter(frames, filter)
    return {
        "pcap_id": pcap_id,
        "pcap_path": None,
        "method": "offline-dataset",
        "note": note,
        "filter": applied_filter or "",
        "frames": frames,
        "summary": _summarise_frames(frames),
    }


def _summarise_frames(frames):
    ssids = [f.get("ssid") for f in frames if f.get("ssid")]
    bssids = [f.get("bssid") for f in frames if f.get("bssid")]
    clients = [f.get("sa") for f in frames if f.get("sa") and f.get("sa") not in bssids]
    channels = [f.get("channel") for f in frames if f.get("channel")]
    return {
        "total_frames": len(frames),
        "ssids": sorted(set(ssids)),
        "bssids": sorted(set(bssids)),
        "clients": sorted(set(clients)),
        "channels": sorted(set(channels)),
        "beacons": len([f for f in frames if "Beacon" in (f.get("subtype_name") or "")]),
        "probes": len([f for f in frames if "Probe" in (f.get("subtype_name") or "")]),
        "eapol": len([f for f in frames if f.get("eapol")]),
        "deauth": len([f for f in frames if "Deauth" in (f.get("subtype_name") or "")]),
        "disassoc": len([f for f in frames if "Disassoc" in (f.get("subtype_name") or "")]),
        "assoc": len([f for f in frames if "Assoc" in (f.get("subtype_name") or "")]),
        "wps": len([f for f in frames if f.get("wps")]),
    }


@router.get("/pcaps/{pcap_id}/frames")
async def get_frames(pcap_id: str, filter: Optional[str] = Query(None, max_length=512), limit: int = Query(100, ge=1, le=1000), offset: int = Query(0, ge=0, le=1000000)):
    # Use the same public-capture/offline fallback and effective-filter semantics as /analyze.
    result = await analyze_pcap(pcap_id, filter)
    frames = result["frames"]
    total = len(frames)
    paginated = frames[offset:offset+limit]

    return {
        "pcap_id": pcap_id,
        "filter": result.get("filter", ""),
        "note": result.get("note"),
        "total": total,
        "offset": offset,
        "limit": limit,
        "frames": paginated,
        "summary": result["summary"],
        "method": result["method"]
    }

import json
import re
from fastapi import APIRouter, Query, HTTPException
from pathlib import Path
from typing import Optional
from app.core.config import CONTENT_DIR, REPO_CONTENT_DIR, BASE_DIR, PCAP_DIR
from app.services.pcap_parser import parse_pcap, tshark_available, SCAPY_AVAILABLE

router = APIRouter()

def find_pcap(pcap_id: str) -> Optional[Path]:
    """Locate a capture by safe repository id in locations this repository actually uses."""
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,127}", pcap_id):
        return None
    candidates = [
        PCAP_DIR / f"{pcap_id}.pcapng",
        PCAP_DIR / f"{pcap_id}.pcap",
        REPO_CONTENT_DIR / "pcaps" / f"{pcap_id}.pcapng",
        REPO_CONTENT_DIR / "pcaps" / f"{pcap_id}.pcap",
        BASE_DIR.parent / "content" / "pcaps" / f"{pcap_id}.pcapng",
    ]
    # Never parse a prefix match, a symlink outside the shipped capture tree, or an
    # unexpectedly large file. The API accepts identifiers, not arbitrary file paths.
    roots = (PCAP_DIR, REPO_CONTENT_DIR / "pcaps")
    def curated(candidate: Path) -> bool:
        return (candidate.is_file() and not candidate.is_symlink()
                and candidate.stat().st_size <= 5 * 1024 * 1024
                and any(candidate.resolve().is_relative_to(root.resolve()) for root in roots))

    for candidate in candidates:
        if curated(candidate):
            return candidate

    for root in roots:
        if root.exists():
            for candidate in sorted(root.rglob("*.pcap*")):
                if candidate.stem == pcap_id and candidate.suffix in {".pcap", ".pcapng"} and curated(candidate):
                    return candidate
    return None


@router.get("/pcaps")
async def list_pcaps():
    pcaps = []
    # List from content/pcaps
    roots = [
        PCAP_DIR,
        REPO_CONTENT_DIR,
        BASE_DIR.parent / "content" / "pcaps",
    ]
    seen = set()
    for root in roots:
        if not root or not root.exists():
            continue
        for p in root.rglob("*.pcapng"):
            if p.name in seen:
                continue
            seen.add(p.name)
            # Determine module from path including Phase D/E/F
            module = "unknown"
            sp = str(p).lower()
            if "wifi-fundamentals" in sp or "beacon" in sp:
                module = "02-wifi-fundamentals"
            elif "recon" in sp:
                module = "05-wireless-recon"
            elif "traffic" in sp:
                module = "06-traffic-analysis"
            elif "wpa2" in sp or "handshake" in sp:
                module = "09-wpa2-practical"
            elif "pmkid" in sp:
                module = "09-wpa2-practical"
            elif "wps" in sp:
                module = "10-wps"
            elif "wpa3" in sp:
                module = "11-wpa3"
            elif "deauth" in sp:
                module = "12-deauth-disassoc"
            elif "rogue" in sp:
                module = "13-rogue-ap"
            elif "captive" in sp:
                module = "14-captive-portals"
            elif "enterprise" in sp:
                module = "15-enterprise-fundamentals"
            elif "eap" in sp and "wpa" not in sp:
                module = "16-eap"
            elif "radius" in sp:
                module = "17-radius"
            elif "corporate" in sp:
                module = "18-corporate-attacks"
            elif "methodology" in sp or "final" in sp:
                module = "19-methodology"
            elif "wep" in sp:
                module = "07-wep-legacy"

            pcaps.append({
                "id": p.stem,
                "filename": p.name,
                "module": module,
                "size": p.stat().st_size,
            })
    
    # No capture directory in this checkout (e.g. API run against a bare clone): describe what the
    # frontend ships by reading its artefact metadata instead of a hand-maintained table.
    if not pcaps:
        from app.core.config import OFFLINE_DATA_DIR
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

    from app.services.pcap_parser import offline_frames, _apply_display_filter
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

    frames = _apply_display_filter(frames, filter)
    return {
        "pcap_id": pcap_id,
        "pcap_path": None,
        "method": "offline-dataset",
        "note": "Frames come from the offline dataset shipped with the frontend (no capture file in this checkout).",
        "filter": filter,
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
    pcap_path = find_pcap(pcap_id)
    if not pcap_path:
        raise HTTPException(status_code=404, detail="PCAP not found")
    
    result = parse_pcap(pcap_path, display_filter=filter, pcap_id=pcap_id)
    frames = result["frames"]
    total = len(frames)
    paginated = frames[offset:offset+limit]
    
    return {
        "pcap_id": pcap_id,
        "filter": filter,
        "total": total,
        "offset": offset,
        "limit": limit,
        "frames": paginated,
        "summary": result["summary"],
        "method": result["method"]
    }

from fastapi import APIRouter, Query, HTTPException
from pathlib import Path
from typing import Optional
from app.core.config import CONTENT_DIR, REPO_CONTENT_DIR, BASE_DIR
from app.services.pcap_parser import parse_pcap, tshark_available, SCAPY_AVAILABLE

router = APIRouter()

def find_pcap(pcap_id: str) -> Optional[Path]:
    """Find pcap file by id in multiple locations"""
    candidates = [
        CONTENT_DIR / "pcaps" / f"{pcap_id}.pcapng",
        CONTENT_DIR / "pcaps" / f"{pcap_id}.pcap",
        REPO_CONTENT_DIR / "wifi-fundamentals" / f"{pcap_id}.pcapng",
        REPO_CONTENT_DIR / "recon" / f"{pcap_id}.pcapng",
        REPO_CONTENT_DIR / "traffic" / f"{pcap_id}.pcapng",
        REPO_CONTENT_DIR / "wifi-fundamentals" / "beacon-only.pcapng" if "beacon" in pcap_id else None,
        REPO_CONTENT_DIR / "recon" / "recon-lab.pcapng" if "recon" in pcap_id else None,
        REPO_CONTENT_DIR / "traffic" / "traffic-analysis.pcapng" if "traffic" in pcap_id else None,
        BASE_DIR.parent / "content" / "pcaps" / "wifi-fundamentals" / "beacon-only.pcapng",
        BASE_DIR.parent / "content" / "pcaps" / "recon" / "recon-lab.pcapng",
        BASE_DIR.parent / "content" / "pcaps" / "traffic" / "traffic-analysis.pcapng",
        BASE_DIR.parent / "frontend" / "public" / "pcaps" / "wifi-fundamentals" / "beacon-only.pcapng",
        BASE_DIR.parent / "frontend" / "public" / "pcaps" / "recon" / "recon-lab.pcapng",
        BASE_DIR.parent / "frontend" / "public" / "pcaps" / "traffic" / "traffic-analysis.pcapng",
    ]
    # Also search recursively
    search_roots = [
        REPO_CONTENT_DIR,
        BASE_DIR.parent / "content" / "pcaps",
        BASE_DIR.parent / "frontend" / "public" / "pcaps",
    ]
    for root in search_roots:
        if root and root.exists():
            for p in root.rglob(f"{pcap_id}*"):
                if p.is_file() and p.suffix in [".pcap", ".pcapng"]:
                    return p
            # Also try exact name without id
            for p in root.rglob("*.pcapng"):
                if pcap_id in p.stem:
                    return p

    for c in candidates:
        if c and c.exists():
            return c
    return None

@router.get("/pcaps")
async def list_pcaps():
    pcaps = []
    # List from content/pcaps
    roots = [
        REPO_CONTENT_DIR,
        BASE_DIR.parent / "content" / "pcaps",
        BASE_DIR.parent / "frontend" / "public" / "pcaps",
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
                "path": str(p),
                "module": module,
                "size": p.stat().st_size,
            })
    
    # Fallback mock if none found — include Phase D/E/F
    if not pcaps:
        pcaps = [
            {"id": "beacon-only", "filename": "beacon-only.pcapng", "module": "02-wifi-fundamentals", "type": "beacon", "frames": 5},
            {"id": "recon-lab", "filename": "recon-lab.pcapng", "module": "05-wireless-recon", "type": "recon", "frames": 13},
            {"id": "traffic-analysis", "filename": "traffic-analysis.pcapng", "module": "06-traffic-analysis", "type": "traffic", "frames": 12},
            {"id": "wpa2-handshake", "filename": "wpa2-handshake.pcapng", "module": "09-wpa2-practical", "type": "handshake", "frames": 11},
            {"id": "pmkid", "filename": "pmkid.pcapng", "module": "09-wpa2-practical", "type": "pmkid", "frames": 1},
            {"id": "wps-beacon", "filename": "wps-beacon.pcapng", "module": "10-wps", "type": "wps", "frames": 2},
            {"id": "wpa3-transition", "filename": "wpa3-transition.pcapng", "module": "11-wpa3", "type": "wpa3", "frames": 2},
            {"id": "wpa3-only", "filename": "wpa3-only.pcapng", "module": "11-wpa3", "type": "wpa3", "frames": 1},
            {"id": "deauth", "filename": "deauth.pcapng", "module": "12-deauth-disassoc", "type": "deauth", "frames": 14},
            {"id": "rogue-ap", "filename": "rogue-ap.pcapng", "module": "13-rogue-ap", "type": "rogue", "frames": 7},
            {"id": "captive-portal", "filename": "captive-portal.pcapng", "module": "14-captive-portals", "type": "captive", "frames": 6},
            {"id": "enterprise", "filename": "enterprise.pcapng", "module": "15-enterprise-fundamentals", "type": "enterprise", "frames": 13},
            {"id": "eap", "filename": "eap.pcapng", "module": "16-eap", "type": "eap", "frames": 13},
            {"id": "radius", "filename": "radius.pcapng", "module": "17-radius", "type": "radius", "frames": 13},
            {"id": "corporate-attacks", "filename": "corporate-attacks.pcapng", "module": "18-corporate-attacks", "type": "corporate", "frames": 14},
            {"id": "methodology", "filename": "methodology.pcapng", "module": "19-methodology", "type": "methodology", "frames": 24},
        ]
    
    return {
        "pcaps": pcaps,
        "parser": {
            "tshark": tshark_available(),
            "scapy": SCAPY_AVAILABLE,
            "method": "tshark" if tshark_available() else ("scapy" if SCAPY_AVAILABLE else "mock")
        }
    }

@router.get("/pcaps/{pcap_id}/analyze")
async def analyze_pcap(pcap_id: str, filter: Optional[str] = Query(None, description="Wireshark display filter, e.g., wlan.fc.type_subtype==8")):
    pcap_path = find_pcap(pcap_id)
    if not pcap_path:
        # Return mock if not found but id known — include Phase D/E/F
        known = ["beacon-only", "recon-lab", "traffic-analysis", "wpa2-handshake", "pmkid", "wps-beacon", "wpa3-transition", "wpa3-only", "deauth", "rogue-ap", "captive-portal", "enterprise", "eap", "radius", "corporate-attacks", "methodology", "wep-legacy"]
        if pcap_id in known or any(k in pcap_id for k in known):
            from app.services.pcap_parser import mock_frames, parse_pcap
            # Try mock frames
            frames = mock_frames(pcap_id)
            if frames:
                return {
                    "pcap_id": pcap_id,
                    "pcap_path": "mock",
                    "method": "mock",
                    "filter": filter,
                    "frames": frames,
                    "summary": {
                        "total_frames": len(frames),
                        "ssids": list(set([f.get("ssid") for f in frames if f.get("ssid")])),
                        "bssids": list(set([f.get("bssid") for f in frames if f.get("bssid")])),
                        "deauth": len([f for f in frames if "Deauth" in f.get("subtype_name","")]),
                        "disassoc": len([f for f in frames if "Disassoc" in f.get("subtype_name","")]),
                    }
                }
        raise HTTPException(status_code=404, detail=f"PCAP {pcap_id} not found")

    result = parse_pcap(pcap_path, display_filter=filter, pcap_id=pcap_id)
    return result

@router.get("/pcaps/{pcap_id}/frames")
async def get_frames(pcap_id: str, filter: Optional[str] = Query(None), limit: int = Query(100, le=1000), offset: int = Query(0, ge=0)):
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

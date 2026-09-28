"""Lab catalogue + answer validation, driven by the same artifacts the frontend ships.

Nothing here is hard-coded: the catalogue is built from the decoded datasets in
``frontend/public/lab-data/`` (generated from the real captures and asserted by
``scripts/verify-lab-artifacts.py``), and answer checking compares what the learner submitted against
the values decoded from the capture on this machine. A lab whose dataset is missing is reported as
unavailable rather than validated against remembered sample answers.
"""

import json
from pathlib import Path
from typing import Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import OFFLINE_DATA_DIR, REPO_ROOT

router = APIRouter()

CONFIG_DIR = REPO_ROOT / "frontend" / "public" / "configs"


class LabValidationRequest(BaseModel):
    lab_id: str
    answers: Dict[str, str]


class LabValidationResponse(BaseModel):
    correct: bool
    score: int
    feedback: str
    details: Optional[Dict] = None


def _load_dataset(lab_id: str) -> Optional[dict]:
    path = OFFLINE_DATA_DIR / f"{lab_id}.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def _catalogue() -> list[dict]:
    labs = []
    if not OFFLINE_DATA_DIR.exists():
        return labs
    for dataset_path in sorted(OFFLINE_DATA_DIR.glob("*.json")):
        lab_id = dataset_path.stem
        data = _load_dataset(lab_id)
        if not data:
            continue
        frames = data.get("frames", []) or []
        config = next((CONFIG_DIR / name for name in
                       ("hostapd-wpa2-psk.conf", "hostapd-wpa3-sae.conf", "hostapd-wpa3-transition.conf",
                        "hostapd-open.conf", "hostapd-wpa3-transition-bad.conf")
                       if (CONFIG_DIR / name).exists()), None)
        labs.append({
            "id": lab_id,
            "module_id": data.get("module", ""),
            "frames": len(frames),
            "capture": f"{lab_id}.pcapng",
            "method": data.get("method", "wififorge-labkit"),
            "config_available": config is not None,
        })
    return labs


def _real_values(lab_id: str) -> Optional[dict]:
    """Decode the reference values for a beacon-style lab straight from its dataset."""
    data = _load_dataset(lab_id)
    if not data:
        return None
    frames = data.get("frames", []) or []
    beacon = next((f for f in frames if f.get("subtype") == 8 and f.get("bssid")), None)
    if not beacon:
        beacon = next((f for f in frames if f.get("bssid")), None)
    if not beacon:
        return None

    akm = beacon.get("akm_names") or []
    cipher = beacon.get("cipher_names") or []
    security = "Open" if not akm else f"WPA2/WPA3 ({' + '.join(akm)}{' / ' + ' + '.join(cipher) if cipher else ''})"
    return {
        "ssid": beacon.get("ssid") or "",
        "bssid": (beacon.get("bssid") or "").upper(),
        "channel": str(beacon.get("channel") or ""),
        "security": security,
        "frames": len(frames),
    }


@router.get("/labs")
async def list_labs():
    labs = _catalogue()
    if not labs:
        raise HTTPException(
            status_code=503,
            detail=(
                "No decoded datasets found. Generate them with scripts/generate-lab-artifacts.py "
                "(frontend/public/lab-data/*.json)."
            ),
        )
    return labs


@router.post("/labs/validate", response_model=LabValidationResponse)
async def validate_lab(req: LabValidationRequest):
    expected = _real_values(req.lab_id)
    if not expected:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No dataset for '{req.lab_id}', so there are no real answers to check against. "
                "Regenerate the offline datasets, or use the in-app lab scoring which records your own "
                "answers."
            ),
        )

    checks = [
        ("bssid", lambda v: v.strip().upper() == expected["bssid"], f"bssid should be {expected['bssid']}"),
        ("channel", lambda v: v.strip() == expected["channel"], f"channel should be {expected['channel']}"),
        ("ssid", lambda v: v.strip() == expected["ssid"], f"ssid should be {expected['ssid']}"),
        ("security", lambda v: expected["security"].lower().split('(')[0].strip() in v.strip().lower(), f"security should be {expected['security']}"),
    ]

    score = 0
    feedback = []
    for key, ok, hint in checks:
        if key not in req.answers:
            continue
        if ok(req.answers[key]):
            score += 25
            feedback.append(f"Correct: {key}")
        else:
            feedback.append(f"Not yet: {hint}")

    answered = sum(1 for key, *_ in checks if key in req.answers)
    if answered == 0:
        return LabValidationResponse(correct=False, score=0, feedback="No answers submitted.", details={"expected_fields": [c[0] for c in checks]})

    normalised = round(score / (25 * answered) * 100)
    return LabValidationResponse(
        correct=normalised >= 75,
        score=normalised,
        feedback="\n".join(feedback),
        details={
            "source": f"frontend/public/lab-data/{req.lab_id}.json",
            "expected": expected,
            "note": "Values decoded from the capture that ships with this build.",
        },
    )

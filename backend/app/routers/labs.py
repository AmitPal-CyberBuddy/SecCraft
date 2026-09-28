from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Optional

router = APIRouter()

class LabValidationRequest(BaseModel):
    lab_id: str
    answers: Dict[str, str]

class LabValidationResponse(BaseModel):
    correct: bool
    score: int
    feedback: str
    details: Optional[Dict] = None

@router.get("/labs")
async def list_labs():
    return [
        {
            "id": "lab-02-beacon",
            "module_id": "02-wifi-fundamentals",
            "title": "Beacon Frame Analysis",
            "type": "pcap_analysis",
            "status": "simulated",
            "difficulty": "Beginner",
            "artifacts": ["beacon-only.pcapng"],
            "tasks": 4
        },
        {
            "id": "lab-02-config",
            "module_id": "02-wifi-fundamentals",
            "title": "Config Audit",
            "type": "config_analysis",
            "status": "simulated",
            "difficulty": "Beginner",
            "artifacts": ["hostapd.conf"],
            "tasks": 3
        }
    ]

@router.post("/labs/validate", response_model=LabValidationResponse)
async def validate_lab(req: LabValidationRequest):
    # Simple validation for Phase A
    if req.lab_id == "lab-02-beacon":
        bssid = req.answers.get("bssid", "").upper()
        channel = req.answers.get("channel", "")
        security = req.answers.get("security", "").lower()
        
        correct = True
        feedback = []
        score = 0

        if "AA:BB:CC" in bssid or len(bssid) >= 14:
            score += 25
            feedback.append("✓ BSSID correct")
        else:
            correct = False
            feedback.append("✗ BSSID should be MAC format like AA:BB:CC:DD:EE:FF")

        if "6" in channel:
            score += 25
            feedback.append("✓ Channel correct")
        else:
            correct = False
            feedback.append("✗ Channel is 6 in sample")

        if "open" in security:
            score += 25
            feedback.append("✓ Security correct")
        else:
            feedback.append("✗ Security is Open in sample")

        leak = req.answers.get("leak", "").lower()
        if "probe" in leak or "preferred" in leak or "pnl" in leak:
            score += 25
            feedback.append("✓ Leak correct — PNL")
        else:
            feedback.append("Hint: Probe request leaks preferred networks")

        return LabValidationResponse(
            correct=score >= 75,
            score=score,
            feedback="\n".join(feedback),
            details={"expected": {"bssid": "AA:BB:CC:DD:EE:FF", "channel": "6", "security": "Open"}}
        )

    return LabValidationResponse(correct=False, score=0, feedback="Lab validator not implemented yet for this lab")

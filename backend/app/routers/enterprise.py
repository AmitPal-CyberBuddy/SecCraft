"""Optional backend helpers — every response here is derived, stored or explicitly unavailable.

This router previously returned a "verified" certificate for any id, an invented PDF report and a
fabricated analysis for uploaded captures. Those responses were indistinguishable from real data once
they left the API, so they are gone:

* certificate verification: the static academy issues no accredited certificate and keeps no
  registry, so there is nothing to verify — 404 with that explanation.
* PDF generation: reports are produced in the browser (jsPDF) from the learner's own evidence vault.
* capture upload: the file is hashed (SHA-256) and, if a parser is available locally, decoded; if not,
  the response says analysis was not performed instead of guessing frame counts.
"""

import hashlib
import time
from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.core.config import MAX_UPLOAD_BYTES
from app.services.pcap_parser import parse_pcap, tshark_available, SCAPY_AVAILABLE

router = APIRouter()

# Magic numbers that a real capture file starts with.
CAPTURE_MAGIC = {
    b"\xd4\xc3\xb2\xa1": "pcap (little-endian, microsecond)",
    b"\xa1\xb2\xc3\xd4": "pcap (big-endian, microsecond)",
    b"\x4d\x3c\xb2\xa1": "pcap (little-endian, nanosecond)",
    b"\x0a\x0d\x0d\x0a": "pcapng",
}


@router.get("/cert/verify/{cert_id}")
async def verify_certificate(cert_id: str):
    raise HTTPException(
        status_code=404,
        detail=(
            "This API keeps no certificate registry. The academy's completion record is generated "
            "locally in the browser (see Reports → completion record) and is explicitly not an "
            "accredited certification, so there is nothing to verify server-side."
        ),
    )


@router.get("/reports/pdf/{report_id}")
async def generate_pdf_report(report_id: str):
    raise HTTPException(
        status_code=501,
        detail=(
            "Server-side PDF generation is not implemented. Export the report from the browser "
            "(Reports → 'Export your records as PDF'); it is built from your own evidence vault records."
        ),
    )


@router.post("/pcaps/upload")
async def upload_pcap(file: UploadFile = File(...)):
    """Hash an uploaded capture and decode it *only* if a parser is actually available.

    Nothing about the capture is inferred from its name or size.
    """
    if not file.filename or not file.filename.lower().endswith((".pcap", ".pcapng", ".cap")):
        raise HTTPException(status_code=400, detail="Only .pcap/.pcapng/.cap uploads are accepted")

    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Upload exceeds {MAX_UPLOAD_BYTES} bytes")
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    magic = next((label for sig, label in CAPTURE_MAGIC.items() if content.startswith(sig)), None)
    sha256 = hashlib.sha256(content).hexdigest()

    parser_available = tshark_available() or SCAPY_AVAILABLE
    analysis = None
    note = None

    if magic is None:
        note = "File does not start with a recognised capture header (pcap/pcapng). It was not parsed."
    elif not parser_available:
        note = (
            "No local parser installed (tshark/scapy), so no frames were decoded. Install one of them "
            "and re-upload, or decode the file on your own machine and record the reproducible parts in "
            "the evidence vault."
        )
    else:
        # Write to a temporary file only for the duration of the parse; nothing is persisted.
        with NamedTemporaryFile(suffix=Path(file.filename).suffix, delete=False) as tmp:
            tmp.write(content)
            tmp_path = Path(tmp.name)
        try:
            result = parse_pcap(tmp_path, pcap_id=Path(file.filename).stem)
            analysis = {
                "method": result.get("method"),
                "note": result.get("note"),
                "summary": result.get("summary"),
            }
            if result.get("method") == "offline-dataset":
                # An uploaded file must be decoded from its own bytes; the shipped dataset for a
                # same-named lab capture is not evidence about this file.
                analysis = None
                note = (
                    "Only the offline dataset for that capture id was available, which does not describe "
                    "the uploaded bytes. Install tshark or scapy to decode this file."
                )
        finally:
            tmp_path.unlink(missing_ok=True)

    return {
        "filename": file.filename,
        "size": len(content),
        "sha256": sha256,
        "header": magic,
        "parsed": analysis is not None,
        "analysis": analysis,
        "note": note,
        "received_at": time.time(),
    }


@router.get("/analytics/overview")
async def analytics_overview():
    """Counts from the local SQLite progress store — empty database means empty numbers."""
    from app.core.database import SessionLocal
    from app.models.progress import LessonProgress, LabProgress, QuizProgress

    db = SessionLocal()
    try:
        lessons = db.query(LessonProgress).count()
        labs = db.query(LabProgress).count()
        quizzes = db.query(QuizProgress).count()
        users = len({
            row.user_id
            for row in (
                db.query(LessonProgress).all()
                + db.query(LabProgress).all()
                + db.query(QuizProgress).all()
            )
        })
    finally:
        db.close()

    return {
        "source": "local SQLite progress store",
        "learners_with_records": users,
        "lessons_completed": lessons,
        "labs_completed": labs,
        "quizzes_completed": quizzes,
        "note": (
            "Zero values mean no progress has been recorded in this database — the hosted build stores "
            "progress in the browser instead."
        ) if not (lessons or labs or quizzes) else None,
    }

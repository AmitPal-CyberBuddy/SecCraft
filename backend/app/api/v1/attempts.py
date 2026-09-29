import hashlib
import hmac
import json
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.v1.dependencies import Identity, active_profile, current_identity
from app.core.database import get_db
from app.models.platform import AssessmentAttempt

router = APIRouter()


class AttemptSubmission(BaseModel):
    model_config = ConfigDict(extra="forbid")

    path_id: str = Field(min_length=1, max_length=128)
    assessment_id: str = Field(min_length=1, max_length=160)
    idempotency_key: str = Field(min_length=8, max_length=128)
    # Only a digest is retained; submitted responses are never stored or returned by this endpoint.
    responses: dict[str, str] = Field(min_length=1, max_length=100)

    @field_validator("responses")
    @classmethod
    def bound_responses(cls, value: dict[str, str]) -> dict[str, str]:
        if len(value) > 100:
            raise ValueError("At most 100 answers are accepted")
        if any(not key or len(key) > 160 or len(answer) > 4096 for key, answer in value.items()):
            raise ValueError("Assessment answer fields exceed allowed limits")
        return value


def _response(attempt: AssessmentAttempt, recorded: bool) -> dict:
    return {
        "attempt_id": attempt.id,
        "path_id": attempt.path_id,
        "assessment_id": attempt.assessment_id,
        "grading_status": attempt.grading_status,
        "verified": attempt.grading_status == "verified",
        "recorded": recorded,
        "xp_awarded": 0,
        "created_at": attempt.created_at,
    }


def _matches_request(attempt: AssessmentAttempt, payload: AttemptSubmission, digest: str) -> bool:
    return (
        attempt.path_id == payload.path_id
        and attempt.assessment_id == payload.assessment_id
        and hmac.compare_digest(attempt.answer_digest, digest)
    )


@router.post("/attempts")
def record_attempt(
    payload: AttemptSubmission,
    identity: Identity = Depends(current_identity),
    _profile=Depends(active_profile),
    db: Session = Depends(get_db),
) -> dict:
    canonical = json.dumps(payload.responses, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    existing = db.query(AssessmentAttempt).filter_by(user_id=identity.user_id, idempotency_key=payload.idempotency_key).one_or_none()
    if existing is not None:
        if not _matches_request(existing, payload, digest):
            raise HTTPException(status_code=409, detail="This idempotency key is already bound to a different submission.")
        return _response(existing, recorded=False)
    attempt = AssessmentAttempt(
        user_id=identity.user_id,
        path_id=payload.path_id,
        assessment_id=payload.assessment_id,
        idempotency_key=payload.idempotency_key,
        answer_digest=digest,
        grading_status="unverified",
        score=None,
        max_score=None,
        passed=None,
    )
    db.add(attempt)
    try:
        db.commit()
        db.refresh(attempt)
    except IntegrityError:
        db.rollback()
        # Concurrent duplicate submissions are idempotent through the unique (user, key) constraint.
        existing = db.query(AssessmentAttempt).filter_by(user_id=identity.user_id, idempotency_key=payload.idempotency_key).one_or_none()
        if existing is None:
            raise HTTPException(status_code=409, detail="Attempt could not be recorded; retry with the same idempotency key.")
        if not _matches_request(existing, payload, digest):
            raise HTTPException(status_code=409, detail="This idempotency key is already bound to a different submission.")
        return _response(existing, recorded=False)
    return _response(attempt, recorded=True)


@router.get("/attempts")
def list_attempts(
    limit: int = Query(default=100, ge=1, le=500),
    identity: Identity = Depends(current_identity),
    _profile=Depends(active_profile),
    db: Session = Depends(get_db),
) -> dict:
    rows = (
        db.query(AssessmentAttempt)
        .filter(AssessmentAttempt.user_id == identity.user_id)
        .order_by(AssessmentAttempt.created_at.desc())
        .limit(limit)
        .all()
    )
    return {"attempts": [_response(row, recorded=True) for row in rows], "count": len(rows)}

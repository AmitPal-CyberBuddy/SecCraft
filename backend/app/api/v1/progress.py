from collections import OrderedDict
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.v1.dependencies import Identity, active_profile, current_identity
from app.core.database import get_db
from app.models.platform import AchievementAward, ProgressRecord, XpEvent

router = APIRouter()


class ProgressItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    path_id: str = Field(min_length=1, max_length=128)
    module_id: str = Field(min_length=1, max_length=128)
    activity_type: Literal["lesson", "lab", "quiz", "challenge", "assessment", "other"]
    activity_id: str = Field(min_length=1, max_length=160)
    content_version: str = Field(default="current", min_length=1, max_length=64)
    state: Literal["started", "completed"]


class ProgressBatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    records: list[ProgressItem] = Field(min_length=1, max_length=500)


def _key(record: ProgressItem) -> tuple[str, str, str, str, str]:
    return (record.path_id, record.module_id, record.activity_type, record.activity_id, record.content_version)


def _deduplicate(records: list[ProgressItem]) -> list[ProgressItem]:
    unique: OrderedDict[tuple[str, str, str, str, str], ProgressItem] = OrderedDict()
    for record in records:
        key = _key(record)
        previous = unique.get(key)
        # Completed state wins over started state within the same import. No client timestamps or
        # reward values are accepted, so local data cannot replace a stronger server record.
        if previous is None or record.state == "completed":
            unique[key] = record
    return list(unique.values())


def _preview(records: list[ProgressItem], user_id: str, db: Session) -> dict:
    items = _deduplicate(records)
    inserted = updates = verified_retained = unchanged = 0
    for item in items:
        existing = (
            db.query(ProgressRecord)
            .filter_by(
                user_id=user_id,
                path_id=item.path_id,
                module_id=item.module_id,
                activity_type=item.activity_type,
                activity_id=item.activity_id,
                content_version=item.content_version,
            )
            .one_or_none()
        )
        if existing is None:
            inserted += 1
        elif existing.verified:
            verified_retained += 1
        elif existing.state == "started" and item.state == "completed":
            updates += 1
        else:
            unchanged += 1
    return {
        "incoming_records": len(records),
        "unique_records": len(items),
        "would_insert": inserted,
        "would_upgrade_unverified_progress": updates,
        "verified_server_records_preserved": verified_retained,
        "unchanged": unchanged,
        "imported_records_are_verified": False,
    }


@router.get("/progress")
def get_progress(
    identity: Identity = Depends(current_identity),
    _profile=Depends(active_profile),
    db: Session = Depends(get_db),
) -> dict:
    records = (
        db.query(ProgressRecord)
        .filter(ProgressRecord.user_id == identity.user_id)
        .order_by(ProgressRecord.updated_at.desc())
        .limit(2000)
        .all()
    )
    xp_total = int(
        db.query(func.coalesce(func.sum(XpEvent.points), 0))
        .filter(XpEvent.user_id == identity.user_id, XpEvent.verified.is_(True))
        .scalar()
        or 0
    )
    achievements = (
        db.query(AchievementAward.achievement_id, AchievementAward.verified, AchievementAward.awarded_at)
        .filter(AchievementAward.user_id == identity.user_id)
        .order_by(AchievementAward.awarded_at.asc())
        .all()
    )
    return {
        "records": [
            {
                "path_id": row.path_id,
                "module_id": row.module_id,
                "activity_type": row.activity_type,
                "activity_id": row.activity_id,
                "content_version": row.content_version,
                "state": row.state,
                "source": row.source,
                "verified": row.verified,
                "started_at": row.started_at,
                "completed_at": row.completed_at,
                "updated_at": row.updated_at,
            }
            for row in records
        ],
        "xp": {"total": xp_total, "verified": True, "source": "server ledger"},
        "achievements": [
            {"id": row.achievement_id, "verified": row.verified, "awarded_at": row.awarded_at}
            for row in achievements
        ],
    }


@router.post("/progress/import/preview")
def preview_import(
    payload: ProgressBatch,
    identity: Identity = Depends(current_identity),
    _profile=Depends(active_profile),
    db: Session = Depends(get_db),
) -> dict:
    return _preview(payload.records, identity.user_id, db)


@router.post("/progress/import")
def merge_import(
    payload: ProgressBatch,
    identity: Identity = Depends(current_identity),
    _profile=Depends(active_profile),
    db: Session = Depends(get_db),
) -> dict:
    items = _deduplicate(payload.records)
    inserted = upgraded = preserved = unchanged = 0
    now = datetime.now(timezone.utc)

    for item in items:
        existing = (
            db.query(ProgressRecord)
            .filter_by(
                user_id=identity.user_id,
                path_id=item.path_id,
                module_id=item.module_id,
                activity_type=item.activity_type,
                activity_id=item.activity_id,
                content_version=item.content_version,
            )
            .with_for_update()
            .one_or_none()
        )
        if existing is None:
            db.add(
                ProgressRecord(
                    user_id=identity.user_id,
                    path_id=item.path_id,
                    module_id=item.module_id,
                    activity_type=item.activity_type,
                    activity_id=item.activity_id,
                    content_version=item.content_version,
                    state=item.state,
                    source="local_import",
                    verified=False,
                    started_at=now,
                    completed_at=now if item.state == "completed" else None,
                )
            )
            inserted += 1
        elif existing.verified:
            preserved += 1
        elif existing.state == "started" and item.state == "completed":
            existing.state = "completed"
            existing.source = "local_import"
            existing.completed_at = now
            existing.updated_at = now
            upgraded += 1
        else:
            unchanged += 1

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Progress merge could not be committed; retry the preview.")

    return {
        "inserted": inserted,
        "upgraded_unverified_progress": upgraded,
        "verified_server_records_preserved": preserved,
        "unchanged": unchanged,
        "imported_records_are_verified": False,
        "xp_awarded": 0,
    }

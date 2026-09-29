from datetime import datetime, timezone
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.v1.dependencies import admin_identity, get_or_create_settings, is_platform_admin
from app.core.database import get_db
from app.models.platform import AdminAuditEvent, PlatformAdmin, PlatformSettings, UserProfile

router = APIRouter()


class UserStatusPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    account_status: Literal["active", "rejected", "suspended"]
    reason: Optional[str] = Field(default=None, max_length=300)


class SettingsPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    signup_enabled: Optional[bool] = None
    approved_user_limit: Optional[int] = Field(default=None, ge=0)


def locked_settings_row(db: Session) -> Optional[PlatformSettings]:
    """Acquire the singleton policy lock, including the first-request creation race."""
    settings = db.query(PlatformSettings).filter(PlatformSettings.id == 1).with_for_update().one_or_none()
    if settings is not None:
        return settings
    settings = get_or_create_settings(db)
    if settings is None:
        return None
    # Creation commits to resolve the unique-row race; re-read under FOR UPDATE before policy work.
    return db.query(PlatformSettings).filter(PlatformSettings.id == 1).with_for_update().one_or_none()


def active_approved_count(db: Session) -> int:
    admin_ids = select(PlatformAdmin.user_id)
    return int(
        db.query(func.count(UserProfile.user_id))
        .filter(UserProfile.account_status == "active", ~UserProfile.user_id.in_(admin_ids))
        .scalar()
        or 0
    )


def _audit(db: Session, actor: str, action: str, target: Optional[str], details: dict[str, Any]) -> None:
    db.add(AdminAuditEvent(actor_user_id=actor, action=action, target_user_id=target, details=details))


@router.get("/admin/settings")
def read_settings(
    identity=Depends(admin_identity),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    settings = get_or_create_settings(db)
    if settings is None:
        raise HTTPException(status_code=503, detail="Platform settings are unavailable.")
    return {
        "signup_enabled": settings.signup_enabled,
        "approved_user_limit": settings.approved_user_limit,
        "active_approved_users": active_approved_count(db),
        "admins_excluded_from_limit": True,
    }


@router.patch("/admin/settings")
def update_settings(
    payload: SettingsPatch,
    identity=Depends(admin_identity),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if not payload.model_fields_set:
        raise HTTPException(status_code=422, detail="At least one setting is required.")
    if "signup_enabled" in payload.model_fields_set and payload.signup_enabled is None:
        raise HTTPException(status_code=422, detail="signup_enabled must be true or false.")

    settings = locked_settings_row(db)
    if settings is None:
        raise HTTPException(status_code=503, detail="Platform settings are unavailable.")

    changes: dict[str, Any] = {}
    if "signup_enabled" in payload.model_fields_set:
        settings.signup_enabled = bool(payload.signup_enabled)
        changes["signup_enabled"] = settings.signup_enabled
    if "approved_user_limit" in payload.model_fields_set:
        settings.approved_user_limit = payload.approved_user_limit
        changes["approved_user_limit"] = payload.approved_user_limit
    settings.updated_by_user_id = identity.user_id
    _audit(db, identity.user_id, "settings.updated", None, changes)
    db.commit()
    db.refresh(settings)
    return {
        "signup_enabled": settings.signup_enabled,
        "approved_user_limit": settings.approved_user_limit,
        "active_approved_users": active_approved_count(db),
        "admins_excluded_from_limit": True,
    }


@router.get("/admin/users")
def list_users(
    status: Optional[Literal["pending", "active", "rejected", "suspended"]] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
    identity=Depends(admin_identity),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    # The owner allowlist is an authorization source, not a user account pending review.
    query = db.query(UserProfile).filter(~UserProfile.user_id.in_(select(PlatformAdmin.user_id)))
    if status:
        query = query.filter(UserProfile.account_status == status)
    rows = query.order_by(UserProfile.created_at.asc()).limit(limit).all()
    return {
        "users": [
            {
                "user_id": row.user_id,
                "email": row.email,
                "display_name": row.display_name,
                "account_status": row.account_status,
                "created_at": row.created_at,
                "reviewed_at": row.reviewed_at,
            }
            for row in rows
        ],
        "count": len(rows),
    }


@router.patch("/admin/users/{user_id}/status")
def set_user_status(
    user_id: str,
    payload: UserStatusPatch,
    identity=Depends(admin_identity),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if len(user_id) > 64:
        raise HTTPException(status_code=404, detail="Account not found.")

    # Serialize approvals on the singleton settings row. PostgreSQL holds this row lock until commit,
    # so concurrent approvals cannot both observe spare capacity and exceed the configured limit.
    settings = locked_settings_row(db)
    if settings is None:
        raise HTTPException(status_code=503, detail="Platform settings are unavailable.")

    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).with_for_update().one_or_none()
    if profile is None:
        raise HTTPException(status_code=404, detail="Account not found.")

    if is_platform_admin(db, user_id):
        raise HTTPException(status_code=409, detail="Owner allowlist accounts are not managed through learner approval.")

    previous = profile.account_status
    next_status = payload.account_status
    if next_status == "active" and previous != "active":
        if settings.approved_user_limit is None:
            raise HTTPException(status_code=409, detail="Set an approved-user limit before activating accounts.")
        if active_approved_count(db) >= settings.approved_user_limit:
            raise HTTPException(status_code=409, detail="Approved-user capacity has been reached.")

    profile.account_status = next_status
    profile.reviewed_at = datetime.now(timezone.utc)
    profile.reviewed_by_user_id = identity.user_id
    profile.status_reason = payload.reason.strip() if payload.reason and payload.reason.strip() else None
    _audit(
        db,
        identity.user_id,
        "account.status_changed",
        user_id,
        {"from": previous, "to": next_status, "reason": profile.status_reason},
    )
    db.commit()
    db.refresh(profile)
    return {
        "user_id": profile.user_id,
        "account_status": profile.account_status,
        "reviewed_at": profile.reviewed_at,
    }


@router.get("/admin/audit")
def list_audit_events(
    limit: int = Query(default=100, ge=1, le=500),
    identity=Depends(admin_identity),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    rows = db.query(AdminAuditEvent).order_by(AdminAuditEvent.created_at.desc()).limit(limit).all()
    return {
        "events": [
            {
                "id": row.id,
                "actor_user_id": row.actor_user_id,
                "action": row.action,
                "target_user_id": row.target_user_id,
                "details": row.details,
                "created_at": row.created_at,
            }
            for row in rows
        ],
        "count": len(rows),
    }

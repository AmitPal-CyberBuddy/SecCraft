"""Server-only idempotent reward primitives.

No public endpoint accepts arbitrary points or verified flags. A trusted grader/service may use these
helpers only after validating server-controlled criteria. Local imports never call this module.
"""

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.platform import AchievementAward, XpEvent


def award_verified_xp(
    db: Session,
    *,
    user_id: str,
    idempotency_key: str,
    source_type: str,
    source_id: str,
    points: int,
) -> tuple[XpEvent, bool]:
    if points < 0:
        raise ValueError("XP points cannot be negative")
    existing = db.query(XpEvent).filter_by(user_id=user_id, idempotency_key=idempotency_key).one_or_none()
    if existing is not None:
        return existing, False
    event = XpEvent(
        user_id=user_id,
        idempotency_key=idempotency_key,
        source_type=source_type,
        source_id=source_id,
        points=points,
        verified=True,
    )
    db.add(event)
    try:
        db.flush()
        return event, True
    except IntegrityError:
        db.rollback()
        existing = db.query(XpEvent).filter_by(user_id=user_id, idempotency_key=idempotency_key).one_or_none()
        if existing is None:
            raise
        return existing, False


def award_achievement(db: Session, *, user_id: str, achievement_id: str) -> tuple[AchievementAward, bool]:
    existing = db.query(AchievementAward).filter_by(user_id=user_id, achievement_id=achievement_id).one_or_none()
    if existing is not None:
        return existing, False
    award = AchievementAward(user_id=user_id, achievement_id=achievement_id, verified=True)
    db.add(award)
    try:
        db.flush()
        return award, True
    except IntegrityError:
        db.rollback()
        existing = db.query(AchievementAward).filter_by(user_id=user_id, achievement_id=achievement_id).one_or_none()
        if existing is None:
            raise
        return existing, False

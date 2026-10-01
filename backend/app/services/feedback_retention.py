"""Schedule daily: cd backend && python -m app.services.feedback_retention.

Removes expired abuse counters and feedback (including email/body/internal notes) after the
configured retention period. Audit events retain only IDs/status transitions, not message text/IPs.
"""
import time
from datetime import datetime, timedelta, timezone
from sqlalchemy import delete
from app.core import config
from app.core.database import SessionLocal
from app.models.feedback import Feedback, FeedbackQuota


def purge():
    cutoff = datetime.now(timezone.utc) - timedelta(days=config.FEEDBACK_RETENTION_DAYS)
    with SessionLocal.begin() as db:
        db.execute(delete(FeedbackQuota).where(FeedbackQuota.expires_at <= int(time.time())))
        db.execute(delete(Feedback).where(Feedback.created_at < cutoff))


if __name__ == '__main__':
    purge()

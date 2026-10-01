"""Private feedback and short-lived, shared abuse counters; never exposed via PostgREST."""
from sqlalchemy import Column, Integer, String, Text, DateTime, CheckConstraint
from sqlalchemy.sql import func
from app.core.database import Base


class Feedback(Base):
    __tablename__ = "feedback"
    __table_args__ = (
        CheckConstraint("status IN ('new','in_progress','resolved','spam')", name="ck_feedback_status"),
        CheckConstraint("category IN ('bug','content','suggestion','general')", name="ck_feedback_category"),
    )
    id = Column(Integer, primary_key=True, autoincrement=True)
    request_key = Column(String(64), nullable=False, unique=True)
    payload_hash = Column(String(64), nullable=False)
    user_id = Column(String(64), nullable=True)
    reply_email = Column(String(320), nullable=True)
    category = Column(String(16), nullable=False, index=True)
    subject = Column(String(160), nullable=False)
    message = Column(Text, nullable=False)
    page_reference = Column(String(300), nullable=False, default="")
    status = Column(String(16), nullable=False, default="new", index=True)
    internal_note = Column(Text, nullable=False, default="")
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class FeedbackQuota(Base):
    __tablename__ = "feedback_quotas"
    key = Column(String(64), primary_key=True)
    count = Column(Integer, nullable=False)
    expires_at = Column(Integer, nullable=False, index=True)

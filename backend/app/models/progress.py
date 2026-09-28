from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float
from sqlalchemy.sql import func
from app.core.database import Base

class LessonProgress(Base):
    __tablename__ = "lesson_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, default="local", index=True)
    module_id = Column(String, index=True)
    lesson_id = Column(String, index=True)
    completed = Column(Boolean, default=True)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

class LabProgress(Base):
    __tablename__ = "lab_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, default="local", index=True)
    module_id = Column(String, index=True)
    lab_id = Column(String, index=True)
    completed = Column(Boolean, default=True)
    score = Column(Float, nullable=True)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

class QuizProgress(Base):
    __tablename__ = "quiz_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, default="local", index=True)
    module_id = Column(String, index=True)
    quiz_id = Column(String, index=True)
    score = Column(Integer)
    total = Column(Integer)
    completed = Column(Boolean, default=True)
    completed_at = Column(DateTime(timezone=True), server_default=func.now())

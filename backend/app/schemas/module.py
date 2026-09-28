from pydantic import BaseModel
from typing import List, Optional

class Module(BaseModel):
    id: str
    title: str
    phase: int
    difficulty: str
    estimated_hours: float
    prerequisites: List[str]
    status: str
    skills: List[str]
    description: Optional[str] = None

class LessonComplete(BaseModel):
    module_id: str
    lesson_id: str

class LabComplete(BaseModel):
    module_id: str
    lab_id: str
    score: Optional[float] = None

class QuizComplete(BaseModel):
    module_id: str
    quiz_id: str
    score: int
    total: int

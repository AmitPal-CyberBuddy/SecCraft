from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.progress import LessonProgress, LabProgress, QuizProgress
from app.schemas.module import LessonComplete, LabComplete, QuizComplete
from typing import List

router = APIRouter()

@router.get("/progress")
async def get_progress(db: Session = Depends(get_db)):
    lessons = db.query(LessonProgress).filter(LessonProgress.user_id == "local").all()
    labs = db.query(LabProgress).filter(LabProgress.user_id == "local").all()
    quizzes = db.query(QuizProgress).filter(QuizProgress.user_id == "local").all()
    return {
        "lessons": [{"module_id": l.module_id, "lesson_id": l.lesson_id, "completed": l.completed} for l in lessons],
        "labs": [{"module_id": l.module_id, "lab_id": l.lab_id, "completed": l.completed, "score": l.score} for l in labs],
        "quizzes": [{"module_id": q.module_id, "quiz_id": q.quiz_id, "score": q.score, "total": q.total} for q in quizzes],
        "overall": min(len(lessons) + len(labs) + len(quizzes), 100)
    }

@router.post("/progress/lesson")
async def complete_lesson(data: LessonComplete, db: Session = Depends(get_db)):
    existing = db.query(LessonProgress).filter(
        LessonProgress.user_id == "local",
        LessonProgress.module_id == data.module_id,
        LessonProgress.lesson_id == data.lesson_id
    ).first()
    if existing:
        return {"status": "already_completed"}
    prog = LessonProgress(user_id="local", module_id=data.module_id, lesson_id=data.lesson_id, completed=True)
    db.add(prog)
    db.commit()
    return {"status": "completed"}

@router.post("/progress/lab")
async def complete_lab(data: LabComplete, db: Session = Depends(get_db)):
    existing = db.query(LabProgress).filter(
        LabProgress.user_id == "local",
        LabProgress.module_id == data.module_id,
        LabProgress.lab_id == data.lab_id
    ).first()
    if existing:
        return {"status": "already_completed"}
    prog = LabProgress(user_id="local", module_id=data.module_id, lab_id=data.lab_id, completed=True, score=data.score)
    db.add(prog)
    db.commit()
    return {"status": "completed"}

@router.post("/progress/quiz")
async def complete_quiz(data: QuizComplete, db: Session = Depends(get_db)):
    # Upsert
    existing = db.query(QuizProgress).filter(
        QuizProgress.user_id == "local",
        QuizProgress.module_id == data.module_id,
        QuizProgress.quiz_id == data.quiz_id
    ).first()
    if existing:
        existing.score = data.score
        existing.total = data.total
        db.commit()
        return {"status": "updated", "score": data.score}
    prog = QuizProgress(user_id="local", module_id=data.module_id, quiz_id=data.quiz_id, score=data.score, total=data.total, completed=True)
    db.add(prog)
    db.commit()
    return {"status": "completed", "score": data.score}

@router.delete("/progress")
async def reset_progress(db: Session = Depends(get_db)):
    db.query(LessonProgress).filter(LessonProgress.user_id == "local").delete()
    db.query(LabProgress).filter(LabProgress.user_id == "local").delete()
    db.query(QuizProgress).filter(QuizProgress.user_id == "local").delete()
    db.commit()
    return {"status": "reset"}

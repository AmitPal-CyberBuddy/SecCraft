"""Legacy lab-answer validation router intentionally has no routes.

Authored labs/quizzes remain version-controlled frontend content. This API no longer returns answer
keys or treats client-reported scores as verified assessments.
"""
from fastapi import APIRouter

router = APIRouter()

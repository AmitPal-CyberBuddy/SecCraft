from fastapi import APIRouter

from app.api.v1 import accounts, admin, attempts, progress, feedback, content

router = APIRouter()
router.include_router(accounts.router, tags=["accounts"])
router.include_router(progress.router, tags=["progress"])
router.include_router(attempts.router, tags=["assessment attempts"])
router.include_router(admin.router, tags=["owner-only administration"])
router.include_router(feedback.router, tags=["feedback"])
router.include_router(content.router, prefix="/content", tags=["learning content"])

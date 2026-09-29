from fastapi import APIRouter

from app.api.v1 import accounts, admin, attempts, progress

router = APIRouter()
router.include_router(accounts.router, tags=["accounts"])
router.include_router(progress.router, tags=["progress"])
router.include_router(attempts.router, tags=["assessment attempts"])
router.include_router(admin.router, tags=["owner-only administration"])

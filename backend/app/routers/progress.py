"""Legacy shared-local progress API intentionally has no routes.

Account-owned synchronization is implemented in ``app.api.v1.progress`` and derives user identity
from verified Supabase tokens. The previous shared ``user_id='local'`` endpoints are removed.
"""
from fastapi import APIRouter

router = APIRouter()

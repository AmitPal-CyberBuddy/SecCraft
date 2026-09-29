"""Legacy auth router intentionally has no routes.

Authentication is provided by Supabase Auth and the versioned ``/api/v1`` account API. The former
local demo accounts and self-asserted JWT roles have been removed; they must not be re-enabled.
"""
from fastapi import APIRouter

router = APIRouter()

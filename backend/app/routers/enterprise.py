"""Deferred enterprise endpoints intentionally have no routes.

Server uploads, certificate verification, report storage, cross-user analytics, classrooms, and related
features are outside the current platform scope. No upload body is read or persisted by this API.
"""
from fastapi import APIRouter

router = APIRouter()

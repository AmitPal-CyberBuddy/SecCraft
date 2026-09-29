"""Compatibility import for the generic account-owned progress schema.

The former lesson/lab/quiz tables used a shared ``user_id='local'`` identity and are intentionally
not part of the deployed schema or mounted API. New records use ``ProgressRecord`` with a
server-derived Supabase user ID.
"""

from app.models.platform import AssessmentAttempt, ProgressRecord, XpEvent

__all__ = ["AssessmentAttempt", "ProgressRecord", "XpEvent"]

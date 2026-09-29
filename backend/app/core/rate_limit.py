"""Small per-process sliding-window guard for unauthenticated enrollment endpoints.

This is defense in depth only; production deployments should also apply edge/ingress rate limits,
and Supabase Auth retains its own throttles. The in-memory counter is intentionally not represented
as a distributed/global quota.
"""

from collections import defaultdict, deque
from threading import Lock
from time import monotonic


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()
        self._last_cleanup = monotonic()

    def allow(self, key: str, limit: int, window_seconds: int = 60) -> bool:
        now = monotonic()
        with self._lock:
            cleanup_interval = max(1, min(window_seconds, 60))
            if now - self._last_cleanup >= cleanup_interval:
                cutoff = now - window_seconds
                for old_key, old_events in tuple(self._events.items()):
                    while old_events and old_events[0] <= cutoff:
                        old_events.popleft()
                    if not old_events:
                        self._events.pop(old_key, None)
                self._last_cleanup = now
            events = self._events[key]
            while events and now - events[0] >= window_seconds:
                events.popleft()
            if len(events) >= max(1, limit):
                return False
            events.append(now)
            return True


signup_limiter = SlidingWindowLimiter()

import time
from cachetools import TTLCache
from core.config import settings

# A thread-safe TTL cache. Max size ensures we don't blow up memory.
sessions = TTLCache(maxsize=1000, ttl=settings.SESSION_TTL)

def touch_session(session_id: str):
    """
    Extends the TTL of a session by re-inserting it into the TTLCache,
    as cachetools TTL starts from the time of insertion.
    """
    if session_id in sessions:
        # Re-assigning resets the TTL in cachetools
        val = sessions[session_id]
        val["last_active"] = time.time()
        sessions[session_id] = val

import orjson
import re
from core.config import log


def extract_json(raw: str) -> dict | None:
    """Strip markdown fences from LLM output and parse JSON."""
    try:
        cleaned = raw.strip()
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        return orjson.loads(cleaned)
    except Exception as e:
        log.warning("JSON parse failed (%.200s): %s", raw, e)
        return None


def safe_json(raw: str, fallback: dict) -> dict:
    """Parse JSON with a fallback dict on failure."""
    result = extract_json(raw)
    return result if result is not None else fallback

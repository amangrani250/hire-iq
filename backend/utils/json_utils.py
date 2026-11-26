import orjson
import re
from core.config import log


def _strip_fences(raw: str) -> str:
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def extract_json(raw: str) -> dict | None:
    """Strip markdown fences from LLM output and parse JSON."""
    cleaned = _strip_fences(raw)
    try:
        return orjson.loads(cleaned)
    except Exception:
        pass

    # Some models wrap the object in a sentence. Fall back to the outermost
    # brace pair before giving up.
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end > start:
        try:
            return orjson.loads(cleaned[start : end + 1])
        except Exception as exc:  # noqa: BLE001
            log.warning("JSON parse failed (%.200s): %s", raw, exc)
            return None

    log.warning("JSON parse failed: no JSON object found in response (%.200s)", raw)
    return None


def safe_json(raw: str, fallback: dict) -> dict:
    """Parse JSON with a fallback dict on failure."""
    result = extract_json(raw)
    return result if result is not None else fallback

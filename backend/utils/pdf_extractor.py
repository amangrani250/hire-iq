import io
import PyPDF2
from core.config import log, settings

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF bytes. Returns empty string on failure."""
    try:
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as e:
        log.warning("PDF extraction failed: %s", e)
        return ""

def sanitize_text(text: str, max_len: int = settings.MAX_MESSAGE_LEN) -> str:
    """Strip and truncate user text to prevent abuse."""
    return text.strip()[:max_len]

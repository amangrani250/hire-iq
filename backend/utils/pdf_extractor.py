import io
from pypdf import PdfReader
from docx import Document
from core.config import log, settings

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF bytes. Returns empty string on failure."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception as e:
        log.warning("PDF extraction failed: %s", e)
        return ""

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract paragraphs and table text from a Word .docx file."""
    try:
        document = Document(io.BytesIO(file_bytes))
        parts = [p.text.strip() for p in document.paragraphs if p.text.strip()]

        for table in document.tables:
            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                if cells:
                    parts.append(" | ".join(cells))

        return "\n".join(parts)
    except Exception as e:
        log.warning("DOCX extraction failed: %s", e)
        return ""

def extract_resume_text(filename: str, file_bytes: bytes) -> str:
    """Extract text from a supported resume file (PDF or .docx)."""
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    if name.endswith(".docx"):
        return extract_text_from_docx(file_bytes)
    return ""

def sanitize_text(text: str, max_len: int = settings.MAX_MESSAGE_LEN) -> str:
    """Strip and truncate user text to prevent abuse."""
    return text.strip()[:max_len]

# API Security Skill

## Authentication (Production)
- No auth currently (MVP). Production must add:
  - JWT-based auth using `python-jose` (already in root `requirements.txt`)
  - Password hashing with `passlib[bcrypt]` (already in root `requirements.txt`)
  - Rate limiting with `slowapi`
  - API key validation middleware

## Input Validation
- All endpoints validate input via Pydantic models (already done)
- File uploads: whitelist extensions, check MIME, enforce size limits
- Text inputs: sanitize length to prevent abuse (use `sanitize_text()`)
- WebSocket messages: validate JSON structure before processing

## Current Protection
| Threat | Mitigation | Status |
|--------|-----------|--------|
| File upload abuse | Extension + size check (5MB limit) | ✅ Done |
| Prompt injection | System prompt separation; no raw user input as system prompt | ✅ Done |
| Session hijacking | UUID4 session IDs; TTL-based expiry | ✅ Done |
| DoS via LLM | Max tokens per call; retry limits | ✅ Done |
| XSS (transcript) | React auto-escapes; WebSocket text is JSX-rendered | ✅ Done |
| CORS abuse | Wildcard origin — restrict in production | ⚠️ TODO |
| Auth bypass | No auth layer — add JWT | ⚠️ TODO |
| Rate limiting | None — add `slowapi` | ⚠️ TODO |

## Security Headers (Production)
```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware
# Add to main.py:
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["your-domain.com"],
)
# Consider: CSP, X-Content-Type-Options, X-Frame-Options, HSTS
```

## Dependency Auditing
```bash
pip install pip-audit
pip-audit -r requirements.txt
```
Run this before production deployment.

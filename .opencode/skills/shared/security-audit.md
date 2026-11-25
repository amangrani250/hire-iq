# Security Audit Skill

## Critical Rules (Never Violate)

### 1. API Key & Secret Management
- NO hardcoded API keys in source code
- All keys in `.env` files (already in `.gitignore`)
- Never commit `.env` to version control
- Use environment variables via `core.config.Settings` (backend) or `process.env` (frontend)

### 2. Input Validation (Backend)
- All file uploads: validate extension + size + MIME type (already done in `rest.py`)
- Truncate text inputs: use `sanitize_text()` from `utils.pdf_extractor`
- Never trust user input — validate at API boundary
- WebSocket messages: parse with `orjson.loads`, catch `JSONDecodeError`

### 3. Frontend Security
- Never render raw HTML: use React JSX (auto-escapes)
- No `dangerouslySetInnerHTML` — if absolutely needed, sanitize with DOMPurify
- CSP headers recommended for production
- No sensitive data in URL params or localStorage

### 4. CORS Configuration
- Current: `allow_origins=["*"]` — OK for development
- Production: restrict to specific origins (the deployed frontend URL)
- Never use credentials with wildcard origin

### 5. API Protection (Backend)
- Rate limiting: consider `slowapi` middleware for production
- Request size limits: 5MB max for file uploads (already enforced)
- Session ID is UUID4 — no sequential IDs
- No authentication currently (MVP) — add JWT/auth for production

### 6. Dependency Vulnerability Scanner
```bash
# Run periodically:
npm audit --prefix frontend    # Frontend vulnerabilities
pip-audit -r requirements.txt  # Backend vulnerabilities (install: pip install pip-audit)
```

### 7. WebSocket Security
- Validate session_id before accepting connection
- Message size limits (reject oversized messages)
- Connection timeout handling (already done with TTL)
- Disconnect cleanup (already done in `finally` block)

### 8. XSS Prevention Checklist
- [ ] All user text rendered through React JSX (auto-escaped)
- [ ] No `dangerouslySetInnerHTML` usage
- [ ] URL validation before navigation
- [ ] No `eval()` or `new Function()` usage
- [ ] No dynamic `innerHTML` assignments

### 9. Production Security Checklist
- [ ] Restrict CORS to specific origin
- [ ] Add rate limiting (`slowapi`)
- [ ] Add request validation middleware
- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Run `pip-audit` on requirements.txt
- [ ] Enable HTTPS (terminate at reverse proxy)
- [ ] Add security headers (CSP, X-Frame-Options, HSTS)
- [ ] Remove debug/info endpoints in production

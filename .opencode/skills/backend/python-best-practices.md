# Python Best Practices Skill

## Code Quality Rules
1. **Type hints**: all functions must have typed parameters and return types
2. **Docstrings**: all public functions have docstrings explaining params/returns
3. **FastAPI patterns**: use `APIRouter` for route organization; use `Depends()` for DI where beneficial
4. **Error handling**: raise `HTTPException` for known errors; let global handler catch unexpected ones
5. **Async everywhere**: use `async def` for I/O-bound operations; `run_in_executor` for CPU-bound (like gTTS)

## FastAPI Specific
- Use `ORJSONResponse` as default response class (already configured)
- Pydantic models for request validation; `| None` union syntax for optional fields
- `@router` decorators with typed response models
- Lifespan handler for startup/shutdown (shared httpx client already managed there)

## Project Structure (current)
- `api/` — route definitions only (thin)
- `services/` — business logic (thick)
- `core/` — cross-cutting concerns (config, session)
- `utils/` — pure helper functions
- `models/` — Pydantic data models

## Async Patterns
```python
# GOOD: concurrent LLM calls
profile_raw, ats_raw = await asyncio.gather(
    call_llm(profile_prompt, max_tokens=2000),
    call_llm(ats_prompt, max_tokens=1500),
)

# For CPU-bound work (gTTS):
loop = asyncio.get_running_loop()
data = await loop.run_in_executor(None, _gtts_sync, text)
```

## Configuration
- All env vars go through `core.config.Settings` (pydantic-settings)
- Never use `os.getenv()` directly in services (already fixed — `ai_service.py` was doing this)
- `.env` in root of backend, not committed to git

## Logging
- Use `from core.config import log` everywhere
- Structured log messages: `log.info("Session created: %s", session_id[:8])`
- Include context in error logs: `log.error("LLM call failed for session %s: %s", sid, e)`

## Testing
- Unit tests for `utils/` and `services/` (pure logic)
- Integration tests for `api/` (HTTP endpoints)
- Use `pytest` with `httpx.AsyncClient` for endpoint testing

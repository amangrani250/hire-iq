# Backend Performance Skill

## Async Optimization
- All I/O operations are async (httpx, file reads, LLM calls)
- Parallel LLM calls use `asyncio.gather()` — already used in `analyze_resume()`
- Shared httpx client with connection pooling (`http_client.py`)
- gTTS runs in executor thread to avoid blocking event loop

## Connection Pooling
- httpx: `max_connections=20, max_keepalive_connections=5` (adjust based on load)
- Each LLM call reuses same pool — no connection overhead
- TTS/STT calls also reuse same pool

## JSON Serialization
- `orjson` is ~4x faster than standard `json` module
- All responses use `ORJSONResponse` (set as default in router + app)
- WebSocket messages serialized with `orjson.dumps()` before sending

## Caching Strategy
- Sessions: TTLCache with 30min TTL (eliminates cleanup loops)
- No fine-tuning cache needed at current scale
- For production: add Redis caching for LLM responses (same prompt → cached)

## LLM Call Optimization
- `max_tokens`: interview responses = 800, roadmap = 4000, analysis = 2000
- Retry: 2 retries with exponential backoff (0.5s, 1s)
- Temperature: 0.8 for creative, 0.3 for structured output (resume generation)
- Select model based on task complexity (Groq is faster, OpenAI fallback)

## Startup Optimization
- httpx client initialized during lifespan (no first-request latency)
- Session cache is empty at startup (automatic)
- Use `--workers N` with uvicorn for multi-core (N = CPU count)

## Monitoring
- Log LLM response times per session
- Log TTS generation times
- Track session count via health endpoint
- For production: add Prometheus metrics via `starlette-exporter`

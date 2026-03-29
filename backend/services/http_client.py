import httpx
from typing import Optional

_http_client: Optional[httpx.AsyncClient] = None

async def get_http_client() -> httpx.AsyncClient:
    """Return a shared persistent HTTP client with connection pooling."""
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=5),
        )
    return _http_client

async def close_http_client():
    global _http_client
    if _http_client and not _http_client.is_closed:
        await _http_client.aclose()

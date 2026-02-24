import time
from typing import Optional, Set

from fastapi import HTTPException, Request, WebSocket, status

from backend.config import get_settings
from backend.redis_client import redis_client

settings = get_settings()

# In-memory rate state removed in favor of Redis

PUBLIC_READ_PATHS = {
    "/api/v1/latest", "/api/v1/latest/",
    "/api/v1/history", "/api/v1/history/",
    "/api/v1/metrics", "/api/v1/metrics/",
    "/api/v1/spread-logs", "/api/v1/spread-logs/",
    "/ws/stream", "/ws/stream/"
}


def _parse_allowed_keys() -> Set[str]:
    raw = (settings.API_KEYS or "").strip()
    if not raw:
        return set()
    return {k.strip() for k in raw.split(",") if k.strip()}


def _parse_admin_keys() -> Set[str]:
    raw = (settings.ADMIN_API_KEYS or "").strip()
    if not raw:
        return set()
    return {k.strip() for k in raw.split(",") if k.strip()}


def _extract_api_key_from_headers(headers) -> Optional[str]:
    api_key = headers.get("x-api-key") or headers.get("X-API-Key")
    if api_key:
        return api_key.strip()

    auth = headers.get("authorization") or headers.get("Authorization")
    if not auth:
        return None

    parts = auth.split()
    if len(parts) == 2 and parts[0].lower() in {"bearer", "apikey"}:
        return parts[1].strip()
    return None


async def _get_dynamic_keys() -> Set[str]:
    keys = await redis_client.smembers("auth:dynamic_keys")
    return {k for k in keys} if keys else set()


async def _is_allowed(api_key: Optional[str]) -> bool:
    allowed = _parse_allowed_keys()
    dynamic = await _get_dynamic_keys()
    if not allowed and not dynamic:
        return True
    return api_key in allowed or api_key in dynamic


def _is_admin_allowed(api_key: Optional[str]) -> bool:
    allowed = _parse_admin_keys()
    if not allowed:
        return False
    return api_key in allowed


def _rate_limit_key(client_id: str, api_key: Optional[str], scope: str) -> str:
    key_part = api_key or "anonymous"
    return f"{client_id}:{key_part}:{scope}"


async def _check_rate_limit(client_id: str, api_key: Optional[str], scope: str) -> bool:
    limit = max(1, int(settings.RATE_LIMIT_PER_MINUTE))
    burst = max(0, int(settings.RATE_LIMIT_BURST))
    max_allowed = limit + burst

    # Use Redis for rate limiting (Fixed Window Counter per minute)
    epoch_minute = int(time.time() // 60)
    key = f"rate_limit:{client_id}:{api_key or 'anon'}:{scope}:{epoch_minute}"
    
    current = await redis_client.incr(key)
    if current == 1:
        await redis_client.expire(key, 90) # Expire after 90s to be safe
        
    if current > max_allowed:
        return False
        
    return True


async def verify_api_key(request: Request) -> str:
    api_key = _extract_api_key_from_headers(request.headers)
    # Allow anonymous access for public read paths (dashboard)
    is_public_read = request.url.path in PUBLIC_READ_PATHS
    if not await _is_allowed(api_key) and not is_public_read:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")

    if api_key and await _is_disabled(api_key):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="API key disabled")

    client = request.client.host if request.client else "unknown"
    if not await _check_rate_limit(client, api_key, request.url.path):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")

    return api_key or ""


async def verify_ws_api_key(websocket: WebSocket) -> Optional[str]:
    api_key = _extract_api_key_from_headers(websocket.headers)
    if not api_key:
        api_key = websocket.query_params.get("api_key")
    # Allow anonymous access for public WebSocket stream (dashboard)
    is_public_read = websocket.url.path in PUBLIC_READ_PATHS
    if not await _is_allowed(api_key) and not is_public_read:
        await websocket.close(code=1008)
        return None

    if api_key and await _is_disabled(api_key):
        await websocket.close(code=1008)
        return None

    client = websocket.client.host if websocket.client else "unknown"
    if not await _check_rate_limit(client, api_key, websocket.url.path):
        await websocket.close(code=1008)
        return None

    return api_key or ""


async def verify_admin_api_key(request: Request) -> str:
    api_key = _extract_api_key_from_headers(request.headers)
    if not _is_admin_allowed(api_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin API key")

    client = request.client.host if request.client else "unknown"
    if not await _check_rate_limit(client, api_key, request.url.path):
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Rate limit exceeded")

    return api_key or ""


async def _is_disabled(api_key: str) -> bool:
    if not api_key:
        return False
    return bool(await redis_client.sismember("auth:disabled_keys", api_key))

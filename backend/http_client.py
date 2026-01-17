import asyncio
import logging
from typing import Optional, Tuple, Any, Dict

import aiohttp

logger = logging.getLogger(__name__)

_session: Optional[aiohttp.ClientSession] = None
_lock = asyncio.Lock()


async def get_session() -> aiohttp.ClientSession:
    global _session
    if _session and not _session.closed:
        return _session
    async with _lock:
        if _session and not _session.closed:
            return _session
        _session = aiohttp.ClientSession()
        logger.info("Shared HTTP session initialized")
    return _session


async def close_session():
    global _session
    if _session and not _session.closed:
        await _session.close()
        logger.info("Shared HTTP session closed")
        _session = None


async def _request_with_retries(
    method: str,
    url: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: Optional[aiohttp.ClientTimeout] = None,
    retries: int = 2,
    backoff: float = 0.5,
    text_encoding: Optional[str] = None,
    parse_json: bool = True,
) -> Tuple[int, Any]:
    last_error = None
    for attempt in range(retries + 1):
        try:
            session = await get_session()
            async with session.request(
                method,
                url,
                params=params,
                headers=headers,
                timeout=timeout,
            ) as response:
                status = response.status
                if status in {429, 500, 502, 503, 504} and attempt < retries:
                    await asyncio.sleep(backoff * (2 ** attempt))
                    continue
                if parse_json:
                    data = await response.json()
                else:
                    data = await response.text(encoding=text_encoding)
                return status, data
        except (aiohttp.ClientError, asyncio.TimeoutError) as e:
            last_error = e
            if attempt < retries:
                await asyncio.sleep(backoff * (2 ** attempt))
                continue
            break
    if last_error:
        raise last_error
    return 0, None


async def get_json(
    url: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: Optional[aiohttp.ClientTimeout] = None,
    retries: int = 2,
    backoff: float = 0.5,
) -> Tuple[int, Any]:
    return await _request_with_retries(
        "GET",
        url,
        params=params,
        headers=headers,
        timeout=timeout,
        retries=retries,
        backoff=backoff,
        parse_json=True,
    )


async def get_text(
    url: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    headers: Optional[Dict[str, str]] = None,
    timeout: Optional[aiohttp.ClientTimeout] = None,
    retries: int = 2,
    backoff: float = 0.5,
    encoding: Optional[str] = None,
) -> Tuple[int, str]:
    return await _request_with_retries(
        "GET",
        url,
        params=params,
        headers=headers,
        timeout=timeout,
        retries=retries,
        backoff=backoff,
        text_encoding=encoding,
        parse_json=False,
    )

import aiohttp
import logging
from typing import Optional

from backend.sources.base import BaseSource
from backend.http_client import get_json

logger = logging.getLogger(__name__)


class OpenErApiSource(BaseSource):
    """
    open.er-api.com - 免費匯率 API
    更新頻率：每 60 秒
    """

    URL = "https://open.er-api.com/v6/latest/USD"

    def __init__(self):
        super().__init__("open.er-api.com", priority=3, supported_symbols={"USD-TWD"})
        self.weight = 0.5

    async def fetch_price(self, symbol: str) -> Optional[float]:
        if symbol != "USD-TWD":
            return None

        try:
            status, data = await get_json(
                self.URL,
                timeout=aiohttp.ClientTimeout(total=6),
                retries=2,
                backoff=1.0,
            )
            if status != 200:
                return None

            if data.get("result") != "success":
                return None

            rates = data.get("rates", {})
            if "TWD" in rates:
                return float(rates["TWD"])
            return None
        except Exception as e:
            logger.warning(f"open.er-api.com fetch error: {e}")
            return None

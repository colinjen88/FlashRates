import aiohttp
import logging
from typing import Optional

from backend.sources.base import BaseSource
from backend.http_client import get_json

logger = logging.getLogger(__name__)


class ExchangerateHostSource(BaseSource):
    """
    exchangerate.host - 免費匯率 API
    更新頻率：每 30 秒
    """

    URL = "https://api.exchangerate.host/latest"

    def __init__(self):
        super().__init__("exchangerate.host", priority=3, supported_symbols={"USD-TWD"})
        self.weight = 0.5

    async def fetch_price(self, symbol: str) -> Optional[float]:
        if symbol != "USD-TWD":
            return None

        params = {"base": "USD", "symbols": "TWD"}
        try:
            status, data = await get_json(
                self.URL,
                params=params,
                timeout=aiohttp.ClientTimeout(total=6),
                retries=2,
                backoff=0.8,
            )
            if status != 200:
                return None

            rates = data.get("rates", {})
            if "TWD" in rates:
                return float(rates["TWD"])
            return None
        except Exception as e:
            logger.warning(f"exchangerate.host fetch error: {e}")
            return None

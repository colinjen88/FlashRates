import aiohttp
import logging
from backend.sources.base import BaseSource
from backend.http_client import get_json
from typing import Optional

logger = logging.getLogger(__name__)

class FloatRatesSource(BaseSource):
    """
    FloatRates - 免費 JSON Feed
    更新頻率：每日更新
    """
    URL = "http://www.floatrates.com/daily/usd.json"
    
    def __init__(self):
        super().__init__("FloatRates", priority=5, supported_symbols={"USD-TWD"})
        self.weight = 0.4  # 權重較低，因為是 HTTP 且主要為每日更新

    async def fetch_price(self, symbol: str) -> Optional[float]:
        if "USD" not in symbol or "TWD" not in symbol:
            return None
            
        try:
            status, data = await get_json(
                self.URL,
                timeout=aiohttp.ClientTimeout(total=10),
                retries=2,
                backoff=0.5,
            )
            
            if status != 200:
                logger.warning(f"FloatRates status {status}")
                return None
            
            # 結構: {"twd": {"code": "TWD", "rate": 31.5, ...}, ...}
            # key 是小寫貨幣代碼
            twd_data = data.get("twd", {})
            price = twd_data.get("rate")
            
            if price:
                return float(price)
            return None
            
        except Exception as e:
            logger.warning(f"Error fetching FloatRates: {e}")
            return None

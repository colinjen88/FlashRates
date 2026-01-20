import aiohttp
import logging
from backend.sources.base import BaseSource
from backend.http_client import get_json
from typing import Optional

logger = logging.getLogger(__name__)

class GoldApiSource(BaseSource):
    """
    Gold-API.com - 提供免費的黃金、白銀即時報價
    更新頻率：每 10-60 秒 (免費版)
    """
    BASE_URL = "https://api.gold-api.com/price"
    
    def __init__(self):
        super().__init__("Gold-API", priority=2)
        self.weight = 0.6

    async def fetch_price(self, symbol: str) -> Optional[float]:
        # 代碼映射
        target = None
        if symbol == "XAU-USD":
            target = "XAU"
        elif symbol == "XAG-USD":
            target = "XAG"
            
        if not target:
            return None
            
        try:
            # Endpoint: https://api.gold-api.com/price/XAU
            url = f"{self.BASE_URL}/{target}"
            
            status, data = await get_json(
                url,
                timeout=aiohttp.ClientTimeout(total=10),
                retries=2,
                backoff=0.5,
            )
            
            if status != 200:
                return None
            
            # Response: {"name":"Gold","price":4742.4,"symbol":"XAU",...}
            price = data.get("price")
            if price:
                return float(price)
            
            return None
        except Exception as e:
            logger.warning(f"Error fetching Gold-API: {e}")
            return None

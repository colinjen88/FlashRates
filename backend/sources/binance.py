import aiohttp
import logging
from backend.sources.base import BaseSource
from backend.http_client import get_json
from typing import Optional

logger = logging.getLogger(__name__)

class BinanceSource(BaseSource):
    """
    Binance PAXG/USDT - 錨定黃金的加密貨幣
    更新頻率：每 0.5 秒
    """
    URL = "https://api.binance.com/api/v3/ticker/price"
    
    def __init__(self):
        super().__init__("Binance", priority=1)
        self.weight = 0.8  # 高權重

    async def fetch_price(self, symbol: str) -> Optional[float]:
        # Binance 只支援 XAU (透過 PAXG)
        if "XAU" not in symbol:
            return None
            
        try:
            status, data = await get_json(
                self.URL,
                params={"symbol": "PAXGUSDT"},
                timeout=aiohttp.ClientTimeout(total=5),
                retries=2,
                backoff=0.4,
            )
            if status != 200:
                return None
            # PAXG 價格約等於黃金盎司價格
            return float(data.get("price", 0))
        except Exception as e:
            logger.warning(f"Error fetching Binance: {e}")
            return None

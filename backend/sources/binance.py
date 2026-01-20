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
    FUTURES_URL = "https://fapi.binance.com/fapi/v1/ticker/price"
    
    def __init__(self):
        super().__init__("Binance", priority=1)
        self.weight = 0.8  # 高權重

    async def fetch_price(self, symbol: str) -> Optional[float]:
        # Binance 處理 PAXG (黃金代幣 - 現貨) 與 XAG (白銀 - 合約)
        target_symbol = None
        url = self.URL

        if symbol == "PAXG-USD":
            target_symbol = "PAXGUSDT"
            url = self.URL
        elif symbol == "XAG-USDT":  # Binance Silver Futures
            target_symbol = "XAGUSDT"
            url = self.FUTURES_URL
        elif symbol == "XAU-USDT":  # Binance Gold Futures
            target_symbol = "XAUUSDT"
            url = self.FUTURES_URL
            
        if not target_symbol:
            return None
            
        try:
            status, data = await get_json(
                url,
                params={"symbol": target_symbol},
                timeout=aiohttp.ClientTimeout(total=5),
                retries=2,
                backoff=0.4,
            )
            if status != 200:
                return None
            
            return float(data.get("price", 0))
        except Exception as e:
            logger.warning(f"Error fetching Binance: {e}")
            return None

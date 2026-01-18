import aiohttp
import logging
from backend.sources.base import BaseSource
from backend.http_client import get_json
from typing import Optional

logger = logging.getLogger(__name__)

class YahooFinanceSource(BaseSource):
    """
    Yahoo Finance - 延遲稍高但極不易封鎖
    更新頻率：每 60 秒
    """
    URL = "https://query1.finance.yahoo.com/v8/finance/chart/"
    
    def __init__(self):
        super().__init__("Yahoo Finance", priority=3)
        self.weight = 0.5

    async def fetch_price(self, symbol: str) -> Optional[float]:
        # Yahoo 代碼映射
        yahoo_symbol = None
        if "XAU" in symbol and "USD" in symbol:
            yahoo_symbol = "XAUUSD=X"  # 黃金現貨 (Spot)
        elif symbol == "GC-F":
            yahoo_symbol = "GC=F"      # 黃金期貨 (Futures)
        elif symbol == "SI-F":
            yahoo_symbol = "SI=F"      # 白銀期貨 (Futures)
        elif "XAG" in symbol:
            yahoo_symbol = "XAGUSD=X"  # 白銀現貨 (Spot)
        elif "USD" in symbol and "TWD" in symbol:
            yahoo_symbol = "TWD=X"  # 美元/台幣
            
        if not yahoo_symbol:
            return None
            
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            status, data = await get_json(
                f"{self.URL}{yahoo_symbol}",
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10),
                retries=2,
                backoff=0.7,
            )
            if status != 200:
                return None
            
            result = data.get("chart", {}).get("result", [])
            if result:
                meta = result[0].get("meta", {})
                price = meta.get("regularMarketPrice")
                return float(price) if price else None
            return None
        except Exception as e:
            logger.warning(f"Error fetching Yahoo Finance: {e}")
            return None

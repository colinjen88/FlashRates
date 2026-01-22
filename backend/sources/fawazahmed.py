import aiohttp
import logging
from backend.sources.base import BaseSource
from backend.http_client import get_json
from typing import Optional

logger = logging.getLogger(__name__)

class FawazahmedSource(BaseSource):
    """
    Fawazahmed0 Currency API - GitHub 託管的 CDN API
    更新頻率：每日/每小時 (視 CDN 快取而定)
    優點：極度穩定，免費，無 Rate Limit (CDN)
    """
    URL = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json"
    
    def __init__(self):
        super().__init__("Fawaz API", priority=5, supported_symbols={"USD-TWD"})
        self.weight = 0.5  # 基礎權重，因更新頻率較慢

    async def fetch_price(self, symbol: str) -> Optional[float]:
        # 只支援匯率，不支援貴金屬
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
                logger.warning(f"Fawaz API status {status}")
                return None
            
            # 結構: {"date": "...", "usd": {"twd": 31.5, ...}}
            usd_rates = data.get("usd", {})
            price = usd_rates.get("twd")
            
            if price:
                return float(price)
            return None
            
        except Exception as e:
            logger.warning(f"Error fetching Fawaz API: {e}")
            return None

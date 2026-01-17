import aiohttp
import time
import re
from backend.sources.base import BaseSource
from typing import Optional

class GoldPriceOrgSource(BaseSource):
    """
    GoldPrice.org - 老牌網站，結構簡單解析快
    更新頻率：每 10 秒
    """
    URL = "https://data-asg.goldprice.org/dbXRates/USD"
    
    def __init__(self):
        super().__init__("GoldPrice.org", priority=2)
        self.weight = 0.6

    async def fetch_price(self, symbol: str) -> Optional[float]:
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json"
            }
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.URL,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status != 200:
                        return None
                    
                    data = await response.json()
                    items = data.get("items", [])
                    
                    if not items:
                        return None
                    
                    item = items[0]
                    
                    if "XAU" in symbol:
                        # xauPrice 是每盎司黃金價格
                        return float(item.get("xauPrice", 0))
                    elif "XAG" in symbol:
                        # xagPrice 是每盎司白銀價格
                        return float(item.get("xagPrice", 0))
                    
                    return None
        except Exception as e:
            print(f"Error fetching GoldPrice.org: {e}")
            return None

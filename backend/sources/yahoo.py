import aiohttp
import time
from backend.sources.base import BaseSource
from typing import Optional

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
        if "XAU" in symbol:
            yahoo_symbol = "GC=F"  # 黃金期貨
        elif "XAG" in symbol:
            yahoo_symbol = "SI=F"  # 白銀期貨
        elif "USD" in symbol and "TWD" in symbol:
            yahoo_symbol = "TWD=X"  # 美元/台幣
            
        if not yahoo_symbol:
            return None
            
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.URL}{yahoo_symbol}",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status != 200:
                        return None
                    
                    data = await response.json()
                    result = data.get("chart", {}).get("result", [])
                    if result:
                        meta = result[0].get("meta", {})
                        price = meta.get("regularMarketPrice")
                        return float(price) if price else None
                    return None
        except Exception as e:
            print(f"Error fetching Yahoo Finance: {e}")
            return None

import aiohttp
import time
from backend.sources.base import BaseSource
from typing import Optional

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
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    self.URL,
                    params={"symbol": "PAXGUSDT"},
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status != 200:
                        return None
                    data = await response.json()
                    # PAXG 價格約等於黃金盎司價格
                    return float(data.get("price", 0))
        except Exception as e:
            print(f"Error fetching Binance: {e}")
            return None

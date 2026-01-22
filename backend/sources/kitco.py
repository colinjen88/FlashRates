import aiohttp
import re
import logging
from backend.sources.base import BaseSource
from backend.http_client import get_text
from typing import Optional

logger = logging.getLogger(__name__)

class KitcoSource(BaseSource):
    """
    Kitco - 傳統 HTML 解析，備援用
    更新頻率：每 30 秒
    """
    URL = "https://www.kitco.com/gold-price-today-usa/"
    
    def __init__(self):
        super().__init__("Kitco", priority=4, supported_symbols={
            "XAU-USD", "XAG-USD",
        })
        self.weight = 0.4

    async def fetch_price(self, symbol: str) -> Optional[float]:
        # Kitco 主要只支援 XAU
        if "XAU" not in symbol and "XAG" not in symbol:
            return None
            
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            url = self.URL if "XAU" in symbol else "https://www.kitco.com/silver-price-today-usa/"
            status, html = await get_text(
                url,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10),
                retries=2,
                backoff=0.8,
            )
            if status != 200:
                return None
            
            # 簡單的正則匹配價格 (實際需要根據頁面結構調整)
            pattern = r'data-price="([\d,\.]+)"'
            match = re.search(pattern, html)
            if match:
                price_str = match.group(1).replace(',', '')
                return float(price_str)
            
            # 嘗試其他模式
            pattern2 = r'\$\s*([\d,]+\.\d{2})'
            matches = re.findall(pattern2, html)
            if matches:
                # 返回第一個合理的價格 (黃金通常 > 1000)
                for m in matches:
                    price = float(m.replace(',', ''))
                    if "XAU" in symbol and price > 1000:
                        return price
                    elif "XAG" in symbol and price < 100:
                        return price
            return None
        except Exception as e:
            logger.warning(f"Error fetching Kitco: {e}")
            return None

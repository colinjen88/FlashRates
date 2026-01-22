import aiohttp
import re
import logging
from backend.sources.base import BaseSource
from backend.http_client import get_text
from typing import Optional

logger = logging.getLogger(__name__)

class ApmexSource(BaseSource):
    """
    APMEX - 全球領先的貴金屬零售商
    從官網抓取即時零售報價，反映真實市場零售價
    更新頻率：每 60 秒 (避免被封)
    """
    URLS = {
        "XAU-USD": "https://www.apmex.com/gold-price",
        "XAG-USD": "https://www.apmex.com/silver-price",
    }
    
    def __init__(self):
        super().__init__("APMEX", priority=3, supported_symbols={
            "XAU-USD", "XAG-USD",
        })
        self.weight = 0.5

    async def fetch_price(self, symbol: str) -> Optional[float]:
        url = self.URLS.get(symbol)
        if not url:
            return None
            
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            }
            
            # 使用 get_text 獲取 HTML
            status, html = await get_text(
                url,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10),
                retries=2,
                backoff=1.0,
            )
            
            if status != 200:
                return None
            
            # 解析價格
            # APMEX 通常在 JSON-LD 或 <span> 中包含價格
            # 尋找 "price": "4732.55" 或內容中的數值
            # 也可以找 <span class="current-price">...</span>
            
            # 嘗試搜尋 JSON-LD 中的價格
            match = re.search(r'"price":\s*"([0-9,.]+)"', html)
            if not match:
                # 備選：搜尋常見的價格格式
                match = re.search(r'\$([0-9,.]+)\s*</span>', html)
            
            if match:
                price_str = match.group(1).replace(',', '')
                return float(price_str)
            
            return None
        except Exception as e:
            logger.warning(f"Error fetching APMEX: {e}")
            return None

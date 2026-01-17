import aiohttp
import time
import re
from backend.sources.base import BaseSource
from backend.http_client import get_text
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class TaiwanBankSource(BaseSource):
    """
    台灣銀行匯率牌告 - USD/TWD 備援來源
    更新頻率：每 60 秒
    """
    URL = "https://rate.bot.com.tw/xrt/flcsv/0/day"
    
    def __init__(self):
        super().__init__("Taiwan Bank", priority=2)
        self.weight = 0.7  # 官方來源，權重較高

    async def fetch_price(self, symbol: str) -> Optional[float]:
        # 只支援 USD-TWD
        if "USD" not in symbol or "TWD" not in symbol:
            return None
            
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/csv,application/csv,text/plain",
            }
            
            status, text = await get_text(
                self.URL,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10),
                retries=2,
                backoff=0.8,
                encoding="utf-8",
            )
            if status != 200:
                logger.warning(f"Taiwan Bank returned status {status}")
                return None
            
            # CSV 格式：幣別,現金買入,現金賣出,即期買入,即期賣出
            # 找到 USD 那一行
            for line in text.split('\n'):
                if 'USD' in line or '美金' in line:
                    parts = line.split(',')
                    if len(parts) >= 5:
                        # 使用即期買入價 (index 3) 或即期賣出價 (index 4)
                        # 取中間價
                        try:
                            buy = float(parts[3].strip())
                            sell = float(parts[4].strip())
                            mid_price = (buy + sell) / 2
                            logger.debug(f"Taiwan Bank USD-TWD: {mid_price}")
                            return mid_price
                        except (ValueError, IndexError):
                            continue
            
            logger.warning("Taiwan Bank: USD not found in response")
            return None
                    
        except Exception as e:
            logger.error(f"Taiwan Bank fetch error: {e}")
            return None

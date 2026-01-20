import aiohttp
import re
import logging
from backend.sources.base import BaseSource
from backend.http_client import get_text
from typing import Optional

logger = logging.getLogger(__name__)

class SinaFinanceSource(BaseSource):
    """
    新浪財經 - 亞洲伺服器響應快
    更新頻率：每 3 秒
    """
    # 新浪財經 API 格式
    URL = "https://hq.sinajs.cn/list="
    
    def __init__(self):
        super().__init__("Sina Finance", priority=2)
        self.weight = 0.6

    async def fetch_price(self, symbol: str) -> Optional[float]:
        # 新浪財經代碼映射
        sina_symbol = None
        if "USD" in symbol and "TWD" in symbol:
            sina_symbol = "fx_susdtwd"  # 美元/台幣
        elif symbol == "XAU-USD":
            sina_symbol = "fx_sxauusd"  # 黃金現貨 (新浪計算)
        elif symbol == "XAG-USD":
            sina_symbol = "fx_sxagusd"  # 白銀現貨 (新浪計算)
        elif symbol == "GC-F":
            sina_symbol = "hf_GC"       # 黃金期貨
        elif symbol == "SI-F":
            sina_symbol = "hf_SI"       # 白銀期貨
            
        if not sina_symbol:
            return None
            
        try:
            headers = {
                "Referer": "https://finance.sina.com.cn",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            status, text = await get_text(
                f"{self.URL}{sina_symbol}",
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=5),
                retries=2,
                backoff=0.5,
                encoding="gbk",
            )
            if status != 200:
                return None
            
            # 解析格式: var hq_str_hf_GC="...價格數據..."
            match = re.search(r'"([^"]+)"', text)
            if match:
                data = match.group(1).split(',')
                if len(data) > 3:
                    # 對於 fx_susdtwd，index 0 是時間 (e.g., 05:59:36)，index 1/2/3 是價格
                    # 對於 hf_GC，index 0 是價格
                    try:
                        if ':' in data[0]:
                            # 格式: Time, Bid, Ask, Last, ...
                            price = float(data[3]) if data[3] else float(data[1])
                        else:
                            # 格式: Last, ...
                            price = float(data[0])
                        return price
                    except (ValueError, IndexError):
                        pass
            return None
        except Exception as e:
            logger.warning(f"Error fetching Sina Finance: {e}")
            return None

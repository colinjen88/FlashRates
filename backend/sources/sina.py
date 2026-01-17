import aiohttp
import time
import re
from backend.sources.base import BaseSource
from typing import Optional

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
        if "XAU" in symbol:
            sina_symbol = "hf_GC"  # 黃金期貨
        elif "XAG" in symbol:
            sina_symbol = "hf_SI"  # 白銀期貨
        elif "USD" in symbol and "TWD" in symbol:
            sina_symbol = "fx_susdtwd"  # 美元/台幣
            
        if not sina_symbol:
            return None
            
        try:
            headers = {
                "Referer": "https://finance.sina.com.cn",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.URL}{sina_symbol}",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status != 200:
                        return None
                    
                    text = await response.text(encoding='gbk')
                    # 解析格式: var hq_str_hf_GC="...價格數據..."
                    match = re.search(r'"([^"]+)"', text)
                    if match:
                        data = match.group(1).split(',')
                        if len(data) > 0:
                            # 通常第一個或第三個字段是價格
                            price = float(data[0]) if data[0] else float(data[2]) if len(data) > 2 else None
                            return price
                    return None
        except Exception as e:
            print(f"Error fetching Sina Finance: {e}")
            return None

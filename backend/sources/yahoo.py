from typing import Dict, Optional
import aiohttp
import time
import logging
from backend.sources.base import BaseSource
from backend.http_client import get_json

logger = logging.getLogger(__name__)

class YahooFinanceSource(BaseSource):
    """
    Yahoo Finance Source
    使用非官方 API 端點 (query1.finance.yahoo.com)
    支援 DXY, US10Y, Copper, Crude, VIX, GDX, SIL 等
    """
    BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d"
    
    SYMBOL_MAP = {
        "DXY": "DX-Y.NYB",
        "US10Y": "^TNX",
        "HG-F": "HG=F",
        "CL-F": "CL=F",
        "VIX": "^VIX",
        "GDX": "GDX",
        "SIL": "SIL",
        "XAU-USD": "GC=F", # Backup
        "XAG-USD": "SI=F"  # Backup
    }
    
    def __init__(self):
        super().__init__("Yahoo Finance", priority=2)
        self.weight = 0.5

    async def fetch_price(self, symbol: str) -> Optional[float]:
        yahoo_symbol = self.SYMBOL_MAP.get(symbol)
        if not yahoo_symbol:
            return None
            
        url = self.BASE_URL.format(symbol=yahoo_symbol)
        
        try:
            # Yahoo 需要 User-Agent
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            
            status, data = await get_json(
                url,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10),
                retries=2,
                backoff=1.0
            )

            if status != 200 or not data:
                return None
                
            # 解析回應結構: chart.result[0].meta.regularMarketPrice 
            # 或 chart.result[0].indicators.quote[0].close[-1] (如果 meta 不準)
            # 通常 meta.regularMarketPrice 是最新的
            
            result = data.get("chart", {}).get("result", [{}])[0]
            meta = result.get("meta", {})
            price = meta.get("regularMarketPrice")
            
            # 如果沒有 regularMarketPrice，嘗試拿最新的 close
            if price is None:
                quotes = result.get("indicators", {}).get("quote", [{}])[0]
                closes = quotes.get("close", [])
                # 過濾掉 None
                valid_closes = [c for c in closes if c is not None]
                if valid_closes:
                    price = valid_closes[-1]
            
            return float(price) if price is not None else None

        except Exception as e:
            logger.warning(f"Error fetching Yahoo Finance for {symbol}: {e}")
            return None

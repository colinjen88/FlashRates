import asyncio
import aiohttp
import json
import time
from backend.sources.base import BaseSource
from backend.config import get_settings
from backend.http_client import get_json
from typing import Optional
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

class OandaSource(BaseSource):
    """
    OANDA Demo API - 提供即時外匯報價
    使用 Practice/Demo 環境
    更新頻率：每 5 秒 (WebSocket 模擬)
    
    注意：需要 OANDA Demo 帳號的 API Token
    可在 https://www.oanda.com/demo-account/ 免費註冊
    """
    
    # OANDA REST API (使用 Practice 環境)
    BASE_URL = "https://api-fxpractice.oanda.com"
    
    # OANDA 代碼對照
    INSTRUMENTS = {
        "XAU-USD": "XAU_USD",
        "XAG-USD": "XAG_USD",
        "USD-TWD": "USD_TWD",
    }
    
    def __init__(self, api_token: str = None, account_id: str = None):
        super().__init__("OANDA", priority=1)
        self.weight = 0.8  # 高權重 (專業外匯平台)
        self.api_token = api_token or settings.OANDA_API_KEY or ""
        self.account_id = account_id or settings.OANDA_ACCOUNT_ID or ""
        self._initialized = False

    async def fetch_price(self, symbol: str) -> Optional[float]:
        instrument = self.INSTRUMENTS.get(symbol)
        if not instrument:
            return None
        
        # 如果沒有 API Token 或 Account ID，使用備選方案
        if not self.api_token or not self.account_id:
            return await self._fetch_fallback(symbol)
        
        try:
            headers = {
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json",
            }
            
            url = f"{self.BASE_URL}/v3/accounts/{self.account_id}/pricing"
            params = {"instruments": instrument}
            
            status, data = await get_json(
                url,
                headers=headers,
                params=params,
                timeout=aiohttp.ClientTimeout(total=10),
                retries=2,
                backoff=0.7,
            )
            if status != 200:
                logger.warning(f"OANDA returned status {status}")
                return await self._fetch_fallback(symbol)
            
            prices = data.get("prices", [])
            
            if prices:
                price_data = prices[0]
                # 取 bid 和 ask 的中間價
                bids = price_data.get("bids", [])
                asks = price_data.get("asks", [])
                
                if bids and asks:
                    bid = float(bids[0].get("price", 0))
                    ask = float(asks[0].get("price", 0))
                    mid_price = (bid + ask) / 2
                    logger.debug(f"OANDA {symbol}: {mid_price}")
                    return mid_price
            
            return await self._fetch_fallback(symbol)
                    
        except Exception as e:
            logger.error(f"OANDA fetch error: {e}")
            return await self._fetch_fallback(symbol)

    async def _fetch_fallback(self, symbol: str) -> Optional[float]:
        """
        備選方案：使用免費的公開 API (exchangerate.host)
        當沒有 OANDA Token 或請求失敗時使用
        """
        try:
            # 使用免費的 exchangerate API 作為備選
            base_url = "https://api.exchangerate.host/latest"
            
            if symbol == "USD-TWD":
                params = {"base": "USD", "symbols": "TWD"}
            elif "XAU" in symbol:
                # exchangerate.host 不支援貴金屬，返回 None
                return None
            elif "XAG" in symbol:
                return None
            else:
                return None
            
            status, data = await get_json(
                base_url,
                params=params,
                timeout=aiohttp.ClientTimeout(total=5),
                retries=2,
                backoff=0.6,
            )
            if status != 200:
                return None
            
            rates = data.get("rates", {})
            
            if "TWD" in rates:
                rate = float(rates["TWD"])
                logger.debug(f"OANDA fallback {symbol}: {rate}")
                return rate
            
            return None
                    
        except Exception as e:
            logger.debug(f"OANDA fallback error: {e}")
            return None

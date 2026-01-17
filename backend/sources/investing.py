import asyncio
import time
import random
from playwright.async_api import async_playwright
from backend.sources.base import BaseSource
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class InvestingSource(BaseSource):
    """
    Investing.com - 使用 Playwright 無頭瀏覽器
    需要繞過 Cloudflare 防護
    更新頻率：每 120 秒 (保守設定)
    """
    
    URLS = {
        "XAU-USD": "https://www.investing.com/currencies/xau-usd",
        "XAG-USD": "https://www.investing.com/currencies/xag-usd",
        "USD-TWD": "https://www.investing.com/currencies/usd-twd",
    }
    
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    ]
    
    def __init__(self):
        super().__init__("Investing.com", priority=3)
        self.weight = 0.5
        self.browser = None
        self.context = None
        self.page = None
        self._lock = asyncio.Lock()

    async def _init_browser(self):
        """初始化瀏覽器並注入 stealth 腳本"""
        try:
            from playwright_stealth import stealth_async
            
            playwright = await async_playwright().start()
            self.browser = await playwright.chromium.launch(
                headless=True,
                args=[
                    '--disable-blink-features=AutomationControlled',
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                ]
            )
            
            # 隨機選擇 User-Agent
            user_agent = random.choice(self.USER_AGENTS)
            
            self.context = await self.browser.new_context(
                user_agent=user_agent,
                viewport={'width': 1920, 'height': 1080},
                locale='en-US',
            )
            
            self.page = await self.context.new_page()
            
            # 注入 stealth 腳本
            await stealth_async(self.page)
            
            logger.info("Investing.com browser initialized with stealth")
            
        except Exception as e:
            logger.error(f"Failed to initialize Investing.com browser: {e}")
            self.browser = None

    async def _ensure_browser(self):
        """確保瀏覽器已初始化"""
        if not self.browser or not self.page:
            await self._init_browser()

    async def fetch_price(self, symbol: str) -> Optional[float]:
        target_url = self.URLS.get(symbol)
        if not target_url:
            return None
            
        async with self._lock:
            try:
                await self._ensure_browser()
                
                if not self.page:
                    return None
                
                # 添加隨機延遲模擬人類行為
                await asyncio.sleep(random.uniform(1, 3))
                
                await self.page.goto(target_url, timeout=30000, wait_until="domcontentloaded")
                
                # 等待價格元素出現
                await self.page.wait_for_selector('[data-test="instrument-price-last"]', timeout=10000)
                
                # 提取價格
                price_element = self.page.locator('[data-test="instrument-price-last"]')
                price_text = await price_element.inner_text(timeout=5000)
                
                # 清理價格文字
                price_text = price_text.replace(',', '').strip()
                price = float(price_text)
                
                logger.debug(f"Investing.com {symbol}: {price}")
                return price
                
            except Exception as e:
                logger.warning(f"Investing.com fetch error for {symbol}: {e}")
                # 嘗試重新初始化瀏覽器
                if self.browser:
                    try:
                        await self.browser.close()
                    except:
                        pass
                    self.browser = None
                    self.page = None
                return None

    async def cleanup(self):
        """清理資源"""
        if self.browser:
            await self.browser.close()
            self.browser = None
            self.page = None

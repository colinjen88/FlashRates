from backend.sources.base import BaseSource
from playwright.async_api import async_playwright
import asyncio
from typing import Optional
import random

class InvestingSource(BaseSource):
    URL = "https://www.investing.com/currencies/xau-usd"
    
    def __init__(self):
        super().__init__("Investing.com", priority=2)
        self.browser = None
        self.context = None
        self.page = None

    async def _init_browser(self):
        playwright = await async_playwright().start()
        # Add stealth args here if needed in production
        self.browser = await playwright.chromium.launch(headless=True)
        self.context = await self.browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        )
        self.page = await self.context.new_page()

    async def fetch_price(self, symbol: str) -> Optional[float]:
        # Note: In a real persistent app, we might keep the browser open.
        # For this v1, we'll launch/close or rely on a separate worker process.
        # Ideally, we should keep 'self.page' alive.
        
        if not self.page:
            try:
                await self._init_browser()
            except Exception as e:
                print(f"Failed to init browser: {e}")
                return None

        # Map symbol to URL
        target_url = self.URL # Default XAU
        if "XAG" in symbol:
             target_url = "https://www.investing.com/currencies/xag-usd"
        
        try:
            # Check if we are already on the page?
            if self.page.url != target_url:
                await self.page.goto(target_url, timeout=30000, wait_until="domcontentloaded")
            
            # Selectors can change; use the data-test attribute as recommended
            # Try multiple selectors
            price_text = None
            try:
                price_text = await self.page.locator('[data-test="instrument-price-last"]').inner_text(timeout=2000)
            except:
                pass
                
            if not price_text:
                # Fallback selector
                # This is fragile and needs constant updates
                # For this implementation plan, we assume data-test works or we catch error
                return None

            price = float(price_text.replace(',', ''))
            return price

        except Exception as e:
            print(f"Error fetching Investing.com: {e}")
            # If error is critical (browser crash), reset
            if "Target closed" in str(e):
                self.page = None
            return None

    async def close(self):
        if self.browser:
            await self.browser.close()

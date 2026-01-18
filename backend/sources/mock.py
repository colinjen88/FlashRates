import random
import asyncio
from backend.sources.base import BaseSource
from typing import Optional

class MockSource(BaseSource):
    def __init__(self, name: str = "Mock"):
        super().__init__(name, priority=1)
        self.weight = 0.3  # 測試用，低權重避免影響聚合結果

    async def fetch_price(self, symbol: str) -> Optional[float]:
        await asyncio.sleep(random.uniform(0.1, 0.5)) # Simulate network latency
        
        base_price = 2650.0 if "XAU" in symbol else 31.0 if "XAG" in symbol else 31.8
        
        # Add random fluctuation
        fluctuation = random.uniform(-0.5, 0.5)
        return round(base_price + fluctuation, 2)

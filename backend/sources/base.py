from abc import ABC, abstractmethod
from typing import Optional, Dict
import time

class BaseSource(ABC):
    def __init__(self, source_name: str, priority: int = 1):
        self.source_name = source_name
        self.priority = priority
        self.is_active = True
        self.error_count = 0
        self.last_run = 0

    @abstractmethod
    async def fetch_price(self, symbol: str) -> Optional[float]:
        """
        Fetch price for a given symbol.
        Returns price as float or None if failed.
        """
        pass

    async def get_data(self, symbol: str) -> Dict:
        """
        Wrapper to fetch data and return standardized dictionary.
        """
        if not self.is_active:
            return None

        start_time = time.time()
        price = await self.fetch_price(symbol)
        latency = (time.time() - start_time) * 1000 # ms

        if price is None:
            self.error_count += 1
            return None
        
        # Reset error count on success
        self.error_count = 0 

        return {
            "source": self.source_name,
            "symbol": symbol,
            "price": price,
            "latency": latency,
            "timestamp": time.time()
        }

from abc import ABC, abstractmethod
from typing import Optional, Dict
import asyncio
import time
import logging

logger = logging.getLogger(__name__)

class BaseSource(ABC):
    def __init__(self, source_name: str, priority: int = 1, supported_symbols=None):
        self.source_name = source_name
        self.priority = priority
        self.is_active = True
        self.error_count = 0
        self.last_run = 0
        self.supported_symbols = {s.upper() for s in supported_symbols} if supported_symbols else None

    def supports(self, symbol: str) -> bool:
        if self.supported_symbols is None:
            return True
        return symbol.upper() in self.supported_symbols

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

        if not self.supports(symbol):
            return None

        start_time = time.time()
        try:
            price = await asyncio.wait_for(self.fetch_price(symbol), timeout=15.0)
        except asyncio.TimeoutError:
            logger.warning(f"{self.source_name} timed out fetching {symbol} (>15s)")
            self.error_count += 1
            return None
        except Exception as e:
            logger.warning(f"{self.source_name} unexpected error fetching {symbol}: {e}")
            self.error_count += 1
            return None
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

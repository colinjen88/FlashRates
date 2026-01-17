import asyncio
from typing import List, Dict
import logging
from backend.sources.base import BaseSource
from backend.aggregator import Aggregator

logger = logging.getLogger(__name__)

# 數據源配置：(source_name, interval_seconds, offset_seconds)
SOURCE_CONFIG = {
    "Binance": {"interval": 1, "offset": 0},      # 每 1 秒，無偏移
    "GoldPrice.org": {"interval": 10, "offset": 1},  # 每 10 秒，偏移 1 秒
    "Sina Finance": {"interval": 3, "offset": 0.5},  # 每 3 秒，偏移 0.5 秒
    "BullionVault": {"interval": 10, "offset": 2},   # 每 10 秒，偏移 2 秒
    "Yahoo Finance": {"interval": 60, "offset": 5},  # 每 60 秒，偏移 5 秒
    "Kitco": {"interval": 30, "offset": 3},          # 每 30 秒，偏移 3 秒
    "Investing.com": {"interval": 20, "offset": 4},  # 每 20 秒，偏移 4 秒
    "Mock A": {"interval": 2, "offset": 0},
    "Mock B": {"interval": 2, "offset": 0.5},
}

class Scheduler:
    def __init__(self, sources: List[BaseSource], aggregator: Aggregator):
        self.sources = sources
        self.aggregator = aggregator
        self.running = False
        self.latest_results: Dict[str, Dict[str, Dict]] = {}  # symbol -> {source -> result}

    async def _poll_source(self, source: BaseSource, symbol: str):
        """輪詢單一數據源"""
        config = SOURCE_CONFIG.get(source.source_name, {"interval": 10, "offset": 0})
        
        # 初始偏移
        await asyncio.sleep(config["offset"])
        
        while self.running:
            try:
                if self.aggregator.circuit_breaker.is_available(source.source_name):
                    result = await source.get_data(symbol)
                    if result:
                        if symbol not in self.latest_results:
                            self.latest_results[symbol] = {}
                        self.latest_results[symbol][source.source_name] = result
                else:
                    logger.debug(f"Skipping {source.source_name} due to circuit breaker")
            except Exception as e:
                logger.error(f"Error polling {source.source_name} for {symbol}: {e}")
                self.aggregator.circuit_breaker.record_failure(source.source_name)
            
            await asyncio.sleep(config["interval"])

    async def _aggregate_loop(self, symbols: List[str]):
        """定期聚合所有來源的數據"""
        while self.running:
            for symbol in symbols:
                if symbol in self.latest_results:
                    results = list(self.latest_results[symbol].values())
                    if results:
                        await self.aggregator.aggregate(symbol, results)
            
            await asyncio.sleep(1)  # 每秒聚合一次

    async def run(self, symbols: List[str]):
        self.running = True
        logger.info("Scheduler started.")
        
        tasks = []
        
        # 為每個 symbol 和每個 source 創建輪詢任務
        for symbol in symbols:
            for source in self.sources:
                tasks.append(asyncio.create_task(self._poll_source(source, symbol)))
        
        # 創建聚合任務
        tasks.append(asyncio.create_task(self._aggregate_loop(symbols)))
        
        # 等待所有任務
        try:
            await asyncio.gather(*tasks)
        except asyncio.CancelledError:
            logger.info("Scheduler tasks cancelled")

    def stop(self):
        self.running = False
        logger.info("Scheduler stopping...")

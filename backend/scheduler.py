import asyncio
from typing import List, Dict
import logging
from backend.sources.base import BaseSource
from backend.aggregator import Aggregator

logger = logging.getLogger(__name__)

# 數據源配置 - 頻率設定依據各來源的 Rate Limit 政策
# 
# ┌────────────────┬──────────┬──────────┬─────────────────────────────────────────┐
# │ 來源           │ 間隔     │ 偏移     │ 說明                                    │
# ├────────────────┼──────────┼──────────┼─────────────────────────────────────────┤
# │ Binance        │ 2s       │ 0s       │ API 限制 1200 req/min，每 2 秒安全     │
# │ GoldPrice.org  │ 15s      │ 1s       │ 無官方 API，保守抓取避免封鎖           │
# │ Sina Finance   │ 5s       │ 0.5s     │ 公開接口，5 秒合理                      │
# │ BullionVault   │ 10s      │ 2s       │ 官方 XML API，10 秒合適                │
# │ Yahoo Finance  │ 60s      │ 5s       │ 非官方使用，60 秒避免封鎖              │
# │ Kitco          │ 60s      │ 10s      │ HTML 爬蟲，需保守 (60 秒以上)          │
# │ Investing.com  │ 120s     │ 15s      │ Cloudflare 保護，建議 2 分鐘以上       │
# │ Mock           │ 2s       │ 0s       │ 測試用                                  │
# └────────────────┴──────────┴──────────┴─────────────────────────────────────────┘

SOURCE_CONFIG = {
    "Binance": {"interval": 2, "offset": 0},       # Binance API 限制寬鬆，2 秒安全
    "GoldPrice.org": {"interval": 15, "offset": 1},  # 保守避免封鎖
    "Sina Finance": {"interval": 5, "offset": 0.5},  # 公開接口
    "BullionVault": {"interval": 10, "offset": 2},   # 官方 XML API
    "Yahoo Finance": {"interval": 60, "offset": 5},  # 非官方，保守
    "Kitco": {"interval": 60, "offset": 10},         # HTML 爬蟲，保守
    "Investing.com": {"interval": 120, "offset": 15}, # Cloudflare，非常保守
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

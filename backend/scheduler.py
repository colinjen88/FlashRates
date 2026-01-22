import asyncio
from typing import List, Dict
import logging
from backend.sources.base import BaseSource
from backend.aggregator import Aggregator
from backend.metrics import record_source_failure, record_source_success
from backend.market_hours import is_market_open
from backend.redis_client import redis_client
import os
import json

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
# │ OANDA          │ 5s       │ 3s       │ Demo API，5 秒合適                      │
# │ Taiwan Bank    │ 60s      │ 20s      │ 官方牌告，60 秒足夠                     │
# │ Mock           │ 2s       │ 0s       │ 測試用                                  │
# └────────────────┴──────────┴──────────┴─────────────────────────────────────────┘

SOURCE_CONFIG = {
    "Binance": {"interval": 2, "offset": 0, "max_age": 6},       # Binance API 限制寬鬆，2 秒安全
    "GoldPrice.org": {"interval": 15, "offset": 1, "max_age": 45},  # 保守避免封鎖
    "Sina Finance": {"interval": 5, "offset": 0.5, "max_age": 15},  # 公開接口
    "BullionVault": {"interval": 10, "offset": 2, "max_age": 30},   # 官方 XML API
    "Yahoo Finance": {"interval": 60, "offset": 5, "max_age": 180},  # 非官方，保守
    "Kitco": {"interval": 60, "offset": 10, "max_age": 180},         # HTML 爬蟲，保守
    "Investing.com": {"interval": 120, "offset": 15, "max_age": 360}, # Cloudflare，非常保守
    "OANDA": {"interval": 5, "offset": 3, "max_age": 15},           # Demo API
    "Taiwan Bank": {"interval": 60, "offset": 20, "max_age": 180},   # 官方牌告
    "Mock": {"interval": 2, "offset": 0, "max_age": 6},            # 測試用
    "exchangerate.host": {"interval": 30, "offset": 12, "max_age": 90},
    "open.er-api.com": {"interval": 60, "offset": 25, "max_age": 180},
    "Fawaz API": {"interval": 3600, "offset": 30, "max_age": 10800},   # CDN 更新較慢 (每小時)
    "FloatRates": {"interval": 3600, "offset": 45, "max_age": 10800},  # 每日更新 (每小時候polling即可)
    "Gold-API": {"interval": 30, "offset": 40, "max_age": 90},
    "APMEX": {"interval": 60, "offset": 50, "max_age": 180},
}

class Scheduler:
    def __init__(self, sources: List[BaseSource], aggregator: Aggregator):
        self.sources = sources
        self.aggregator = aggregator
        self.running = False
        self.latest_results: Dict[str, Dict[str, Dict]] = {}  # symbol -> {source -> result}
        self._tasks: List[asyncio.Task] = []
        self._interval_scale: Dict[str, float] = {s.source_name: 1.0 for s in sources}

    async def _poll_source(self, source: BaseSource, symbol: str):
        """輪詢單一數據源"""
        if not source.supports(symbol):
            return
        config = SOURCE_CONFIG.get(source.source_name, {"interval": 10, "offset": 0})
        base_interval = config["interval"]
        max_age = config.get("max_age", base_interval * 3)
        
        # 初始偏移
        await asyncio.sleep(config["offset"])
        
        while self.running:
            try:
                if self.aggregator.circuit_breaker.is_available(source.source_name):
                    result = await source.get_data(symbol)
                    if result:
                        # 如果市場關閉，放寬 max_age 以配合 30s 的輪詢間隔
                        # 避免因為輪詢變慢導致數據被判定為過期
                        current_max_age = max_age
                        if not is_market_open(symbol) and "Binance" not in source.source_name:
                            current_max_age = max(max_age, 60) # 至少 60 秒有效期
                            
                        result["max_age"] = current_max_age
                        if symbol not in self.latest_results:
                            self.latest_results[symbol] = {}
                        self.latest_results[symbol][source.source_name] = result
                        self._interval_scale[source.source_name] = max(
                            1.0, self._interval_scale[source.source_name] * 0.9
                        )
                        await record_source_success(source.source_name, result.get("latency", 0))
                    else:
                        self.aggregator.circuit_breaker.record_failure(source.source_name)
                        self._interval_scale[source.source_name] = min(
                            4.0, self._interval_scale[source.source_name] * 1.5
                        )
                        await record_source_failure(source.source_name)
                else:
                    logger.debug(f"Skipping {source.source_name} due to circuit breaker")
            except Exception as e:
                logger.error(f"Error polling {source.source_name} for {symbol}: {e}")
                self.aggregator.circuit_breaker.record_failure(source.source_name)
                self._interval_scale[source.source_name] = min(
                    4.0, self._interval_scale[source.source_name] * 1.5
                )
                await record_source_failure(source.source_name)
            
            # 動態調整輪詢間隔
            # 如果市場關閉 (且非 24/7 的 Binance/Crypto 來源)，固定每 30 秒更新一次
            if not is_market_open(symbol) and "Binance" not in source.source_name:
                await asyncio.sleep(30)
            else:
                await asyncio.sleep(base_interval * self._interval_scale[source.source_name])

    async def _aggregate_loop(self, symbols: List[str]):
        """定期聚合所有來源的數據"""
        while self.running:
            for symbol in symbols:
                if symbol in self.latest_results:
                    results = list(self.latest_results[symbol].values())
                    if results:
                        await self.aggregator.aggregate(symbol, results)
            
            await asyncio.sleep(1)  # 每秒聚合一次

    async def _log_spread_loop(self):
        """每分鐘記錄現貨與合約價差"""
        # Ensure logs directory exists
        os.makedirs("logs", exist_ok=True)
        
        # Setup specific logger
        spread_logger = logging.getLogger("spread_logger")
        spread_logger.setLevel(logging.INFO)
        if not spread_logger.handlers:
            handler = logging.FileHandler("logs/spreads.log")
            formatter = logging.Formatter('%(asctime)s - %(message)s')
            handler.setFormatter(formatter)
            spread_logger.addHandler(handler)

        while self.running:
            try:
                # Pairs to check: (Spot, Future, Name)
                pairs = [
                    ("XAU-USD", "XAU-USDT", "Gold"),
                    ("XAG-USD", "XAG-USDT", "Silver")
                ]
                
                log_entries = []
                
                for spot_sym, fut_sym, name in pairs:
                    spot_raw = await redis_client.get(f"market:latest:{spot_sym}")
                    fut_raw = await redis_client.get(f"market:latest:{fut_sym}")
                    
                    if spot_raw and fut_raw:
                        spot_data = json.loads(spot_raw)
                        fut_data = json.loads(fut_raw)
                        
                        spot_price = spot_data.get("price")
                        fut_price = fut_data.get("price")
                        
                        if spot_price and fut_price:
                            diff = spot_price - fut_price
                            pct = (diff / spot_price) * 100
                            
                            log_entries.append(f"{name}: Spot={spot_price} Fut={fut_price} Diff={diff:.2f} ({pct:.2f}%)")
                
                if log_entries:
                    spread_logger.info(" | ".join(log_entries))
                    
            except Exception as e:
                logger.error(f"Error logging spreads: {e}")
            
            await asyncio.sleep(60)

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
        
        # 創建價差記錄任務
        tasks.append(asyncio.create_task(self._log_spread_loop()))
        
        # 等待所有任務
        self._tasks = tasks
        try:
            await asyncio.gather(*tasks)
        except asyncio.CancelledError:
            logger.info("Scheduler tasks cancelled")

    async def stop(self):
        self.running = False
        for task in list(self._tasks):
            task.cancel()
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks = []
        logger.info("Scheduler stopping...")

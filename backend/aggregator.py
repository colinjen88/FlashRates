import statistics
import json
import math
import time
from typing import List, Dict, Optional
from backend.sources.base import BaseSource
from backend.circuit_breaker import CircuitBreaker
from backend.redis_client import redis_client
from backend.metrics import record_aggregate
from backend.market_hours import is_market_open
import logging

logger = logging.getLogger(__name__)

class Aggregator:
    def __init__(self, sources: List[BaseSource]):
        self.sources = sources
        self.circuit_breaker = CircuitBreaker()
        # 建立 source_name -> weight 的映射
        self.weights = {src.source_name: getattr(src, 'weight', 0.5) for src in sources}

    def _calculate_freshness(self, age: float, max_age: float) -> float:
        """
        計算新鮮度權重。
        小於 2 秒的資料視為新鮮 (1.0)，之後呈指數衰減。
        """
        if age < 2.0:
            return 1.0
        # 衰減常數調整，讓衰減更平滑但有效
        return math.exp(-(age - 2.0) / max(1.0, max_age / 2))

    def _filter_outliers_mad(self, entries: List[Dict]) -> List[Dict]:
        """
        使用 MAD (Median Absolute Deviation) 演算法過濾異常值。
        比固定的百分比過濾更具自適應性。
        """
        prices = [e['price'] for e in entries]
        if len(prices) < 3:
            return entries
            
        median = statistics.median(prices)
        # 計算絕對偏差
        deviations = [abs(x - median) for x in prices]
        mad = statistics.median(deviations)
        
        # 設定動態閾值：
        # 1. 基礎容忍度：3倍 MAD (標準統計學常規)
        # 2. 最小容忍度：價格的 0.05% (避免市場平靜時過濾正常的微小波動)
        # 3. 最大容忍度：價格的 1.0% (防止極端波動時接受錯誤報價)
        
        threshold = max(3 * mad, median * 0.0005)
        threshold = min(threshold, median * 0.01)
        
        filtered = []
        for e in entries:
            diff = abs(e['price'] - median)
            if diff <= threshold:
                filtered.append(e)
            else:
                logger.debug(f"Outlier detected: {e['source']} price={e['price']} (median={median}, threshold={threshold:.4f})")
                
        if not filtered:
             # 如果全都被過濾 (極端情況)，回退到全部使用
             return entries
             
        return filtered

    async def aggregate(self, symbol: str, results: List[Dict]) -> Optional[Dict]:
        """
        處理來自不同數據源的結果並計算最終價格。
        使用加權平均並配合 MAD 異常值過濾。
        """
        valid_entries = []
        
        for res in results:
            if not res:
                continue
            
            src_name = res['source']
            price = res.get('price')
            if price is None or price <= 0:
                continue
            
            # Circuit Breaker 記錄成功
            self.circuit_breaker.record_success(src_name)
            
            weight = self.weights.get(src_name, 0.5)
            valid_entries.append({
                "source": src_name,
                "price": price,
                "weight": weight,
                "latency": res.get('latency', 0),
                "timestamp": res.get('timestamp'),
                "max_age": res.get('max_age')
            })

        if not valid_entries:
            logger.warning(f"No valid data for {symbol}")
            return None

        now = time.time()
        fresh_entries = []
        for e in valid_entries:
            ts = e.get("timestamp")
            max_age = e.get("max_age")
            if ts and max_age is not None:
                age = max(0, now - ts)
                if age > max_age:
                    continue
                # 使用新的新鮮度計算
                freshness = self._calculate_freshness(age, max_age)
            else:
                freshness = 1.0

            eff_weight = e["weight"] * freshness
            if eff_weight <= 0:
                continue
            e["eff_weight"] = eff_weight
            fresh_entries.append(e)

        if not fresh_entries:
            logger.warning(f"No fresh data for {symbol}")
            return None

        # 使用 MAD 過濾異常值
        filtered_entries = self._filter_outliers_mad(fresh_entries)
        entries_for_output = filtered_entries
        
        # 加權平均計算
        total_weight = sum(e['eff_weight'] for e in entries_for_output)
        if total_weight > 0:
            final_price = sum(e['price'] * e['eff_weight'] for e in entries_for_output) / total_weight
        else:
            # 備援：簡單算術平均
            final_price = statistics.mean([e['price'] for e in entries_for_output])

        sources_used = [e['source'] for e in entries_for_output]

        # 找出最快響應的來源
        fastest_entry = min(fresh_entries, key=lambda x: x['latency']) if fresh_entries else None
        fastest_source = fastest_entry['source'] if fastest_entry else "Unknown"
        fastest_latency = fastest_entry['latency'] if fastest_entry else 0
        
        # 計算加權延遲 (權重高的來源影響力大，避免慢速來源拉高整體指標)
        # 同時只計算前 N 個最快來源的延遲，排除極端慢速來源
        sorted_entries = sorted(fresh_entries, key=lambda x: x['latency'])
        top_entries = sorted_entries[:min(5, len(sorted_entries))]  # 只取前 5 快的來源
        
        if top_entries:
            total_weight = sum(e['eff_weight'] for e in top_entries)
            weighted_latency = sum(e['latency'] * e['eff_weight'] for e in top_entries) / total_weight
        else:
            weighted_latency = 0

        # 使用最新來源時間作為聚合時間 (確保「上次更新」準確)
        source_timestamps = [e.get('timestamp') for e in entries_for_output if e.get('timestamp')]
        latest_source_ts = max(source_timestamps) if source_timestamps else None

        output = {
            "symbol": symbol,
            "price": round(final_price, 2),
            "timestamp": latest_source_ts or time.time(),
            "sources": len(fresh_entries),
            "details": sources_used,
            "fastest": fastest_source,
            "fastestLatency": round(fastest_latency, 1),  # 最快來源的延遲 (真實即時性指標)
            "avgLatency": round(weighted_latency, 1),      # 加權延遲 (排除慢速來源)
            "is_market_open": is_market_open(symbol)       # 市場狀態
        }
        
        # 發布到 Redis PubSub 和儲存最新值
        output_json = json.dumps(output)
        await redis_client.publish(f"market:stream:{symbol}", output_json)
        await redis_client.set(f"market:latest:{symbol}", output_json)

        await record_aggregate(symbol, len(fresh_entries), weighted_latency)
        
        logger.info(f"{symbol}: {final_price:.2f} from {len(fresh_entries)} sources (fastest: {fastest_source})")
        
        return output

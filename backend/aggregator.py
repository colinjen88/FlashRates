import statistics
import json
from typing import List, Dict, Optional
from backend.sources.base import BaseSource
from backend.circuit_breaker import CircuitBreaker
from backend.redis_client import redis_client
import logging

logger = logging.getLogger(__name__)

class Aggregator:
    def __init__(self, sources: List[BaseSource]):
        self.sources = sources
        self.circuit_breaker = CircuitBreaker()
        # 建立 source_name -> weight 的映射
        self.weights = {src.source_name: getattr(src, 'weight', 0.5) for src in sources}

    async def aggregate(self, symbol: str, results: List[Dict]) -> Optional[Dict]:
        """
        處理來自不同數據源的結果並計算最終價格。
        使用加權平均並過濾異常值。
        """
        valid_entries = []
        
        for res in results:
            if not res:
                continue
            
            src_name = res['source']
            price = res['price']
            
            # Circuit Breaker 記錄成功
            self.circuit_breaker.record_success(src_name)
            
            weight = self.weights.get(src_name, 0.5)
            valid_entries.append({
                "source": src_name,
                "price": price,
                "weight": weight,
                "latency": res.get('latency', 0)
            })

        if not valid_entries:
            logger.warning(f"No valid data for {symbol}")
            return None

        prices = [e['price'] for e in valid_entries]
        sources_used = [e['source'] for e in valid_entries]
        
        # 計算中位數用於異常值檢測
        if len(prices) >= 3:
            median = statistics.median(prices)
            # 過濾偏離中位數 > 0.3% 的異常值
            filtered_entries = [
                e for e in valid_entries 
                if abs(e['price'] - median) / median < 0.003
            ]
            
            if not filtered_entries:
                # 如果全都被過濾，使用中位數
                final_price = median
                logger.warning(f"{symbol}: All prices filtered as outliers, using median")
            else:
                # 加權平均計算
                total_weight = sum(e['weight'] for e in filtered_entries)
                final_price = sum(e['price'] * e['weight'] for e in filtered_entries) / total_weight
        else:
            # 數據點太少，直接取加權平均
            total_weight = sum(e['weight'] for e in valid_entries)
            final_price = sum(e['price'] * e['weight'] for e in valid_entries) / total_weight

        # 找出最快響應的來源
        fastest_source = min(valid_entries, key=lambda x: x['latency'])['source'] if valid_entries else "Unknown"
        
        # 計算平均延遲
        avg_latency = statistics.mean([e['latency'] for e in valid_entries]) if valid_entries else 0

        import time
        output = {
            "symbol": symbol,
            "price": round(final_price, 2),
            "timestamp": time.time(),
            "sources": len(valid_entries),
            "details": sources_used,
            "fastest": fastest_source,
            "avgLatency": round(avg_latency, 1)
        }
        
        # 發布到 Redis PubSub 和儲存最新值
        output_json = json.dumps(output)
        await redis_client.publish(f"market:stream:{symbol}", output_json)
        await redis_client.set(f"market:latest:{symbol}", output_json)
        
        logger.info(f"{symbol}: {final_price:.2f} from {len(valid_entries)} sources (fastest: {fastest_source})")
        
        return output

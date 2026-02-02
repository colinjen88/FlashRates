import asyncio
import time
from typing import Dict, Any

from backend.redis_client import redis_client

# Redis Keys Prefix: metrics:
# metrics:totals -> HASH {sourceSuccess, sourceFailure, aggregateSuccess}
# metrics:sources:{name} -> HASH {success, failure, totalLatencyMs}
# metrics:aggregates:{symbol} -> HASH {count, totalLatencyMs, lastSources}
# metrics:startup -> STRING timestamp










async def record_source_success(source_name: str, latency_ms: float):
    # Update Totals
    await redis_client.hincrby("metrics:totals", "sourceSuccess", 1)
    
    # Update Source Stats
    key = f"metrics:sources:{source_name}"
    await redis_client.hincrby(key, "success", 1)
    # Note: redis-py hincrbyfloat is supported directly if calling .redis object, 
    # but our wrapper doesn't expose it. We can cast latency to int for simplicity (microseconds?) 
    # or just accept integer ms precision.
    await redis_client.hincrby(key, "totalLatencyMs", int(latency_ms))


async def record_source_failure(source_name: str):
    await redis_client.hincrby("metrics:totals", "sourceFailure", 1)
    await redis_client.hincrby(f"metrics:sources:{source_name}", "failure", 1)


async def record_aggregate(symbol: str, sources_count: int, avg_latency_ms: float):
    await redis_client.hincrby("metrics:totals", "aggregateSuccess", 1)

    key = f"metrics:aggregates:{symbol}"
    await redis_client.hincrby(key, "count", 1)
    await redis_client.hincrby(key, "totalLatencyMs", int(avg_latency_ms))
    await redis_client.hset(key, {"lastSources": sources_count})


async def get_metrics_snapshot() -> Dict[str, Any]:
    # 1. Totals
    totals = await redis_client.hgetall("metrics:totals")
    total_stats = {
        "sourceSuccess": int(totals.get("sourceSuccess", 0)),
        "sourceFailure": int(totals.get("sourceFailure", 0)),
        "aggregateSuccess": int(totals.get("aggregateSuccess", 0)),
    }
    
    # 2. Sources
    sources_stats = {}
    # We need to scan/keys or maintain a set of known sources. 
    # For efficiency, we assume a fixed set of sources or discover them.
    # A cleaner way is "keys metrics:sources:*" but scan is better.
    # Alternatively, maintain a set "metrics:known_sources"
    
    # Let's try to infer from keys or (better) Use a helper to track names?
    # For now, let's use keys pattern matching which is okay for <100 sources.
    if redis_client.redis:
        keys = await redis_client.redis.keys("metrics:sources:*")
        for k in keys:
            name = k.split(":")[-1]
            data = await redis_client.hgetall(k)
            success = int(data.get("success", 0))
            failure = int(data.get("failure", 0))
            total_lat = int(data.get("totalLatencyMs", 0))
            avg_lat = round(total_lat / success, 2) if success > 0 else 0.0
            sources_stats[name] = {
                "success": success,
                "failure": failure,
                "avgLatencyMs": avg_lat
            }
            
    # 3. Aggregates
    aggs_stats = {}
    if redis_client.redis:
        keys = await redis_client.redis.keys("metrics:aggregates:*")
        for k in keys:
            symbol = k.split(":")[-1]
            data = await redis_client.hgetall(k)
            count = int(data.get("count", 0))
            total_lat = int(data.get("totalLatencyMs", 0))
            last_src = int(data.get("lastSources", 0))
            avg_lat = round(total_lat / count, 2) if count > 0 else 0.0
            aggs_stats[symbol] = {
                "count": count,
                "avgLatencyMs": avg_lat,
                "lastSources": last_src
            }
            
    # 4. Uptime
    start_time = await redis_client.get("metrics:startup")
    if not start_time:
        start_time = time.time()
        await redis_client.set("metrics:startup", str(start_time))
    
    return {
        "startTime": float(start_time),
        "uptimeSeconds": round(time.time() - float(start_time), 2),
        "totals": total_stats,
        "sources": sources_stats,
        "aggregates": aggs_stats
    }

import asyncio
import time
from typing import Dict, Any

_metrics_lock = asyncio.Lock()

_metrics: Dict[str, Any] = {
    "startTime": time.time(),
    "sources": {},
    "aggregates": {},
    "totals": {
        "sourceSuccess": 0,
        "sourceFailure": 0,
        "aggregateSuccess": 0,
    },
}


def _get_source_bucket(source_name: str) -> Dict[str, Any]:
    sources = _metrics["sources"]
    if source_name not in sources:
        sources[source_name] = {
            "success": 0,
            "failure": 0,
            "avgLatencyMs": 0.0,
        }
    return sources[source_name]


def _get_aggregate_bucket(symbol: str) -> Dict[str, Any]:
    aggregates = _metrics["aggregates"]
    if symbol not in aggregates:
        aggregates[symbol] = {
            "count": 0,
            "avgLatencyMs": 0.0,
            "lastSources": 0,
        }
    return aggregates[symbol]


async def record_source_success(source_name: str, latency_ms: float):
    async with _metrics_lock:
        bucket = _get_source_bucket(source_name)
        bucket["success"] += 1
        _metrics["totals"]["sourceSuccess"] += 1

        count = bucket["success"]
        prev_avg = bucket["avgLatencyMs"]
        bucket["avgLatencyMs"] = round(((prev_avg * (count - 1)) + latency_ms) / count, 2)


async def record_source_failure(source_name: str):
    async with _metrics_lock:
        bucket = _get_source_bucket(source_name)
        bucket["failure"] += 1
        _metrics["totals"]["sourceFailure"] += 1


async def record_aggregate(symbol: str, sources_count: int, avg_latency_ms: float):
    async with _metrics_lock:
        bucket = _get_aggregate_bucket(symbol)
        bucket["count"] += 1
        _metrics["totals"]["aggregateSuccess"] += 1

        count = bucket["count"]
        prev_avg = bucket["avgLatencyMs"]
        bucket["avgLatencyMs"] = round(((prev_avg * (count - 1)) + avg_latency_ms) / count, 2)
        bucket["lastSources"] = sources_count


async def get_metrics_snapshot() -> Dict[str, Any]:
    async with _metrics_lock:
        return {
            **_metrics,
            "uptimeSeconds": round(time.time() - _metrics["startTime"], 2),
        }

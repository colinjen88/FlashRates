import pytest
import asyncio
from backend.circuit_breaker import CircuitBreaker
from backend.aggregator import Aggregator
from backend.sources.mock import MockSource

@pytest.mark.asyncio
async def test_circuit_breaker():
    cb = CircuitBreaker(failure_threshold=3, recovery_timeout=1)
    source = "TestSrc"
    
    # Fail 3 times
    cb.record_failure(source)
    cb.record_failure(source)
    cb.record_failure(source)
    
    assert not cb.is_available(source) # Should be open

    # Wait for recovery
    await asyncio.sleep(1.1)
    
    # Should be available (Half-open)
    assert cb.is_available(source)

@pytest.mark.asyncio
async def test_aggregator_logic():
    # Mock data
    results = [
        {"source": "S1", "price": 100.0, "timestamp": 123},
        {"source": "S2", "price": 100.5, "timestamp": 123},
        {"source": "S3", "price": 101.0, "timestamp": 123},
        {"source": "S4", "price": 1000.0, "timestamp": 123}, # Outlier
    ]
    
    agg = Aggregator([])
    # We strip redis calls for unit test or mock redis
    # Here we mock redis_client
    from unittest.mock import AsyncMock, patch
    with patch("backend.aggregator.redis_client") as mock_redis:
        mock_redis.publish = AsyncMock()
        mock_redis.set = AsyncMock()
        mock_redis.zadd = AsyncMock()
        mock_redis.zremrangebyscore = AsyncMock()
        mock_redis.zcard = AsyncMock(return_value=1)
        mock_redis.zremrangebyrank = AsyncMock()

        output = await agg.aggregate("TEST", results)

        # MAD filter: sorted prices = [100, 100.5, 101, 1000]
        # median = 100.75, deviations = [0.75, 0.25, 0.25, 899.25]
        # MAD = 0.5, threshold = min(max(1.5, 0.05), 1.0075) = 1.0075
        # 1000.0 filtered (899.25 > 1.0075), rest pass
        # Filtered: [100.0, 100.5, 101.0] -> equal weight average = 100.5

        assert output is not None
        assert output["price"] == 100.5

        # "sources" = len(fresh_entries) = 4 (all 4 pass freshness, no max_age set)
        assert output["sources"] == 4

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
        
        output = await agg.aggregate("TEST", results)
        
        # Median is 100.75? No, sorted: 100, 100.5, 101, 1000.
        # Median of [100, 100.5, 101, 1000] is 100.75
        # 100 is > 0.3% away from 100.75 (0.75/100.75 = 0.7%), so filtered out.
        # Filtered: [100.5, 101.0] -> Mean is 100.75
        
        assert output is not None
        assert output["price"] == 100.75

        # Logic says: "sources": len(valid_prices) which is BEFORE filtering?
        # looking at aggregator.py:
        # valid_prices.append(price)
        # sources_used.append(src_name)
        # ...
        # "sources": len(valid_prices)
        # Yes, it reports total valid responses, not filtered ones.
        # So sources should be 4.
        assert output["sources"] == 4

import asyncio
import sys
import os
# Ensure we can import from the root
sys.path.append(os.getcwd())

from backend.sources.gold_api import GoldApiSource
from backend.sources.apmex import ApmexSource
from backend.sources.sina import SinaFinanceSource

async def test_sources():
    sources = [
        GoldApiSource(),
        ApmexSource(),
        SinaFinanceSource()
    ]
    
    symbols = ["XAU-USD", "XAG-USD"]
    
    for source in sources:
        print(f"\n--- Testing Source: {source.source_name} ---")
        for symbol in symbols:
            try:
                price = await source.fetch_price(symbol)
                print(f"{symbol}: {price}")
            except Exception as e:
                print(f"{symbol}: ERROR - {e}")

if __name__ == "__main__":
    asyncio.run(test_sources())

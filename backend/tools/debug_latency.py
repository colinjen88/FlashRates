
import asyncio
import time
import logging
from backend.sources.sina import SinaFinanceSource
from backend.sources.yahoo import YahooFinanceSource
from backend.sources.taiwanbank import TaiwanBankSource
from backend.sources.oanda import OandaSource
from backend.sources.exchangerate_host import ExchangerateHostSource
from backend.sources.open_er_api import OpenErApiSource
from backend.sources.floatrates import FloatRatesSource
from backend.http_client import close_session

logging.basicConfig(level=logging.INFO)

async def test_sources():
    sources = [
        SinaFinanceSource(),
        YahooFinanceSource(),
        TaiwanBankSource(),
        OandaSource(), # Will use fallback if no key
        ExchangerateHostSource(),
        OpenErApiSource(),
        FloatRatesSource(),
    ]
    
    print(f"{'Source':<20} | {'Latency (ms)':<15} | {'Price':<10}")
    print("-" * 50)
    
    for src in sources:
        start = time.time()
        try:
            price = await src.fetch_price("USD-TWD")
        except Exception as e:
            price = None
        duration = (time.time() - start) * 1000
        print(f"{src.source_name:<20} | {duration:>13.2f} ms | {price}")

    await close_session()

if __name__ == "__main__":
    asyncio.run(test_sources())

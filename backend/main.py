from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from backend.config import get_settings
from backend.redis_client import redis_client
import logging
import asyncio

settings = get_settings()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生產環境應限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 導入所有數據源
from backend.sources.binance import BinanceSource
from backend.sources.goldprice import GoldPriceOrgSource
from backend.sources.sina import SinaFinanceSource
from backend.sources.bullionvault import BullionVaultSource
from backend.sources.yahoo import YahooFinanceSource
from backend.sources.kitco import KitcoSource
# from backend.sources.investing import InvestingSource  # Playwright 需要特殊處理
from backend.sources.mock import MockSource
from backend.aggregator import Aggregator
from backend.scheduler import Scheduler

scheduler = None

@app.on_event("startup")
async def startup_event():
    await redis_client.connect()
    
    # 初始化所有 8 個數據源
    sources = [
        BinanceSource(),           # 1. Binance PAXG (高頻)
        GoldPriceOrgSource(),      # 2. GoldPrice.org
        SinaFinanceSource(),       # 3. 新浪財經
        BullionVaultSource(),      # 4. BullionVault
        YahooFinanceSource(),      # 5. Yahoo Finance
        KitcoSource(),             # 6. Kitco
        # InvestingSource(),       # 7. Investing.com (需要 Playwright)
        MockSource(name="Mock A"), # 7. Mock 替代
        MockSource(name="Mock B"), # 8. Mock 替代
    ]
    
    aggregator = Aggregator(sources)
    
    global scheduler
    scheduler = Scheduler(sources, aggregator)
    
    # 在後台運行 scheduler
    asyncio.create_task(scheduler.run(symbols=["XAU-USD", "XAG-USD", "USD-TWD"]))
    
    logger.info(f"Application started with {len(sources)} data sources")

@app.on_event("shutdown")
async def shutdown_event():
    if scheduler:
        scheduler.stop()
    await redis_client.close()
    logger.info("Application shutdown")

@app.get("/")
async def root():
    return {"status": "ok", "app": settings.APP_NAME, "sources": 8}

@app.get("/api/v1/latest")
async def get_latest(symbols: str = "xau-usd,xag-usd,usd-twd"):
    """獲取最新匯率數據"""
    import json
    result = {}
    for symbol in symbols.upper().split(","):
        symbol = symbol.strip()
        data = await redis_client.get(f"market:latest:{symbol}")
        if data:
            result[symbol] = json.loads(data)
    return {"timestamp": __import__('time').time(), "data": result}

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    pubsub = redis_client.redis.pubsub()
    await pubsub.subscribe("market:stream:XAU-USD", "market:stream:XAG-USD", "market:stream:USD-TWD")
    
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message:
                await websocket.send_text(message['data'])
            await asyncio.sleep(0.01)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await pubsub.unsubscribe()
        await websocket.close()

from fastapi import FastAPI, WebSocket, Depends, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from backend.config import get_settings
from backend.redis_client import redis_client
from backend.http_client import close_session
from backend.metrics import get_metrics_snapshot
from backend.auth import verify_api_key, verify_ws_api_key, verify_admin_api_key
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
from backend.sources.investing import InvestingSource
from backend.sources.oanda import OandaSource
from backend.sources.taiwanbank import TaiwanBankSource
from backend.sources.exchangerate_host import ExchangerateHostSource
from backend.sources.open_er_api import OpenErApiSource
from backend.sources.fawazahmed import FawazahmedSource
from backend.sources.floatrates import FloatRatesSource
from backend.sources.mock import MockSource
from backend.aggregator import Aggregator
from backend.scheduler import Scheduler

scheduler = None
scheduler_task = None
investing_source = None  # 需要在 shutdown 時清理

@app.on_event("startup")
async def startup_event():
    await redis_client.connect()
    
    global investing_source
    investing_source = InvestingSource()
    
    # 初始化所有 12 個數據源 (超規格配置)
    sources = [
        BinanceSource(),           # 1. Binance PAXG (高頻，黃金)
        GoldPriceOrgSource(),      # 2. GoldPrice.org (黃金、白銀)
        SinaFinanceSource(),       # 3. 新浪財經 (全部)
        BullionVaultSource(),      # 4. BullionVault (黃金)
        YahooFinanceSource(),      # 5. Yahoo Finance (全部)
        KitcoSource(),             # 6. Kitco (黃金、白銀)
        investing_source,          # 7. Investing.com (全部，Playwright)
        OandaSource(),             # 8. OANDA (外匯)
        TaiwanBankSource(),        # 9. 台灣銀行 (USD-TWD 官方備援)
        ExchangerateHostSource(),  # 10. exchangerate.host (USD-TWD)
        OpenErApiSource(),         # 11. open.er-api.com (USD-TWD)
        FawazahmedSource(),        # 12. Fawaz API (USD-TWD CDN)
        FloatRatesSource(),        # 13. FloatRates (USD-TWD)
        MockSource(name="Mock"),   # 14. Mock (測試用)
    ]
    
    aggregator = Aggregator(sources)
    
    global scheduler, scheduler_task
    scheduler = Scheduler(sources, aggregator)
    
    # 在後台運行 scheduler
    scheduler_task = asyncio.create_task(scheduler.run(symbols=["XAU-USD", "XAG-USD", "USD-TWD"]))
    
    logger.info(f"Application started with {len(sources)} data sources")

@app.on_event("shutdown")
async def shutdown_event():
    if scheduler:
        await scheduler.stop()
    if scheduler_task:
        scheduler_task.cancel()
        try:
            await scheduler_task
        except asyncio.CancelledError:
            pass
    # 清理 Investing.com 瀏覽器
    if investing_source:
        await investing_source.cleanup()
    await redis_client.close()
    await close_session()
    logger.info("Application shutdown")

@app.get("/")
async def root():
    return {"status": "ok", "app": settings.APP_NAME, "sources": 14}

@app.get("/api/v1/latest")
async def get_latest(symbols: str = "xau-usd,xag-usd,usd-twd", api_key: str = Depends(verify_api_key)):
    """獲取最新匯率數據"""
    import json
    result = {}
    for symbol in symbols.upper().split(","):
        symbol = symbol.strip()
        data = await redis_client.get(f"market:latest:{symbol}")
        if data:
            result[symbol] = json.loads(data)
    return {"timestamp": __import__('time').time(), "data": result}


@app.get("/api/v1/metrics")
async def get_metrics(api_key: str = Depends(verify_api_key)):
    return await get_metrics_snapshot()


class AdminKeyPayload(BaseModel):
    key: str


@app.get("/api/v1/admin/keys")
async def list_keys(admin_key: str = Depends(verify_admin_api_key)):
    disabled = await redis_client.smembers("auth:disabled_keys")
    allowed = [k.strip() for k in settings.API_KEYS.split(",") if k.strip()]
    dynamic = list(await redis_client.smembers("auth:dynamic_keys"))
    return {
        "keys": [
            {"key": k, "disabled": k in disabled, "source": "env"}
            for k in allowed
        ] + [
            {"key": k, "disabled": k in disabled, "source": "redis"}
            for k in dynamic if k not in allowed
        ],
        "note": "Redis 新增/移除的 key 需同步到 .env 並重啟才會持久化。"
    }


@app.post("/api/v1/admin/keys/disable")
async def disable_key(payload: AdminKeyPayload, admin_key: str = Depends(verify_admin_api_key)):
    await redis_client.sadd("auth:disabled_keys", payload.key)
    return {"key": payload.key, "disabled": True}


@app.post("/api/v1/admin/keys/enable")
async def enable_key(payload: AdminKeyPayload, admin_key: str = Depends(verify_admin_api_key)):
    await redis_client.srem("auth:disabled_keys", payload.key)
    return {"key": payload.key, "disabled": False}


@app.post("/api/v1/admin/keys/add")
async def add_key(payload: AdminKeyPayload, admin_key: str = Depends(verify_admin_api_key)):
    key = payload.key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="Key required")
    allowed = {k.strip() for k in settings.API_KEYS.split(",") if k.strip()}
    if key in allowed:
        return {"key": key, "source": "env", "note": "Key already exists in .env"}
    await redis_client.sadd("auth:dynamic_keys", key)
    return {
        "key": key,
        "source": "redis",
        "note": "請同步到 .env 並重啟以持久化"
    }


@app.post("/api/v1/admin/keys/remove")
async def remove_key(payload: AdminKeyPayload, admin_key: str = Depends(verify_admin_api_key)):
    key = payload.key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="Key required")
    allowed = {k.strip() for k in settings.API_KEYS.split(",") if k.strip()}
    if key in allowed:
        raise HTTPException(status_code=400, detail="Key is from .env; remove it there and restart")
    await redis_client.srem("auth:dynamic_keys", key)
    await redis_client.srem("auth:disabled_keys", key)
    return {
        "key": key,
        "source": "redis",
        "note": "已從 Redis 移除；如需永久移除請同步 .env 並重啟"
    }

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    api_key = await verify_ws_api_key(websocket)
    if api_key is None:
        return
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

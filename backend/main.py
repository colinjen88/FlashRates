from fastapi import FastAPI, WebSocket, Depends, HTTPException, File, UploadFile, Request
from fastapi.staticfiles import StaticFiles
from typing import Optional
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from backend.config import get_settings
from backend.redis_client import redis_client
from backend.http_client import close_session
from backend.metrics import get_metrics_snapshot
from backend.auth import verify_api_key, verify_ws_api_key, verify_admin_api_key
import logging
import asyncio
import os
from logging.handlers import RotatingFileHandler

settings = get_settings()

# Setup Logging with Rotation
if not os.path.exists("logs"):
    os.makedirs("logs")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        RotatingFileHandler("logs/backend.log", maxBytes=10*1024*1024, backupCount=5),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.APP_NAME)

# Middleware: Request ID
@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    import uuid
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory
import os
os.makedirs("backend/static/uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="backend/static/uploads"), name="uploads")

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
from backend.sources.gold_api import GoldApiSource
from backend.sources.apmex import ApmexSource
# from backend.sources.mock import MockSource
from backend.aggregator import Aggregator
from backend.scheduler import Scheduler

scheduler = None
scheduler_task = None
investing_source = None  # 需要在 shutdown 時清理

@app.on_event("startup")
async def startup_event():
    if not settings.ADMIN_API_KEYS:
        logger.error("ADMIN_API_KEYS not set. Refusing to start.")
        raise RuntimeError("ADMIN_API_KEYS environment variable is mandatory.")
        
    await redis_client.connect()
    
    global investing_source
    investing_source = InvestingSource()
    
    # 初始化所有 15 個數據源 (超規格配置)
    sources = [
        BinanceSource(),           # 1. Binance PAXG (高頻，黃金)
        GoldPriceOrgSource(),      # 2. GoldPrice.org (黃金、白銀)
        SinaFinanceSource(),       # 3. 新浪財經 (全部)
        GoldApiSource(),           # 4. Gold-API (新增)
        ApmexSource(),             # 5. APMEX (新增)
        BullionVaultSource(),      # 6. BullionVault (黃金)
        YahooFinanceSource(),      # 7. Yahoo Finance (全部)
        KitcoSource(),             # 8. Kitco (黃金、白銀)
        investing_source,          # 7. Investing.com (全部，Playwright)
        OandaSource(),             # 8. OANDA (外匯)
        TaiwanBankSource(),        # 9. 台灣銀行 (USD-TWD 官方備援)
        ExchangerateHostSource(),  # 10. exchangerate.host (USD-TWD)
        OpenErApiSource(),         # 11. open.er-api.com (USD-TWD)
        FawazahmedSource(),        # 12. Fawaz API (USD-TWD CDN)
        FloatRatesSource(),        # 13. FloatRates (USD-TWD)
        # MockSource(name="Mock"),   # 14. Mock (已移除，確保全真實數據)
    ]
    
    aggregator = Aggregator(sources)
    
    global scheduler, scheduler_task
    scheduler = Scheduler(sources, aggregator)
    
    # 在後台運行 scheduler
    scheduler_task = asyncio.create_task(scheduler.run(symbols=[
        "XAU-USD", "XAG-USD", "USD-TWD", "PAXG-USD", "GC-F", "SI-F", "XAG-USDT", "XAU-USDT",
        "DXY", "US10Y", "HG-F", "CL-F", "VIX", "GDX", "SIL"
    ]))
    
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
@app.get("/api")
@app.get("/api/")
async def root():
    return {"status": "ok", "version": "3.2.1", "app": settings.APP_NAME, "sources": 15}

@app.get("/api/v1/latest")
async def get_latest(request: Request, symbols: str = "xau-usd,xag-usd,usd-twd,paxg-usd,gc-f,si-f,xag-usdt", api_key: str = Depends(verify_api_key)):
    """獲取最新匯率數據"""
    import json
    result = {}
    for symbol in symbols.upper().split(","):
        symbol = symbol.strip()
        if symbol not in settings.SUPPORTED_SYMBOLS:
            continue
        data = await redis_client.get(f"market:latest:{symbol}")
        if data:
            result[symbol] = json.loads(data)
    return {"version": "3.2.1", "timestamp": __import__('time').time(), "data": result, "request_id": request.state.request_id}


@app.get("/api/v1/history")
async def get_history(
    symbols: str = "xau-usd,xag-usd,usd-twd",
    start: Optional[float] = None,
    end: Optional[float] = None,
    limit: int = 300,
    api_key: str = Depends(verify_api_key),
    request: Request = None, # Injected by FastAPI despite default
):
    """獲取歷史資料（Redis sorted set）"""
    import json
    limit = max(1, min(5000, int(limit)))
    now_ts = __import__('time').time()
    result = {}

    for symbol in symbols.upper().split(","):
        symbol = symbol.strip()
        if symbol not in settings.SUPPORTED_SYMBOLS:
            continue
        history_key = f"market:history:{symbol}"

        if start is not None or end is not None:
            min_score = start if start is not None else 0
            max_score = end if end is not None else now_ts
            rows = await redis_client.zrangebyscore(history_key, min_score, max_score)
            if rows:
                rows = rows[-limit:]
        else:
            rows = await redis_client.zrevrange(history_key, 0, limit - 1)
            if rows:
                rows = list(reversed(rows))

        result[symbol] = []
        if rows:
            for r in rows:
                try:
                    # Try splitting UUID prefix: "uuid:json"
                    if ":" in r:
                        _, json_str = r.split(":", 1)
                        result[symbol].append(json.loads(json_str))
                    else:
                        result[symbol].append(json.loads(r))
                except (ValueError, json.JSONDecodeError):
                    # Fallback or skip
                     try:
                        result[symbol].append(json.loads(r))
                     except:
                        pass

    return {"timestamp": now_ts, "data": result, "request_id": request.state.request_id}


@app.get("/api/v1/metrics")
async def get_metrics(api_key: str = Depends(verify_api_key)):
    return await get_metrics_snapshot()


@app.get("/api/v1/spread-logs")
async def get_spread_logs(limit: int = 100, api_key: str = Depends(verify_api_key)):
    """獲取價差記錄"""
    import os
    log_file = "logs/spreads.log"
    if not os.path.exists(log_file):
        return {"logs": []}
    
    try:
        with open(log_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
            # Return last N lines reversed
            return {"logs": [line.strip() for line in reversed(lines[-limit:])]}
    except Exception as e:
        logger.error(f"Error reading logs: {e}")
        return {"logs": [], "error": str(e)}


@app.get("/api/v1/error-logs")
async def get_error_logs(limit: int = 200, api_key: str = Depends(verify_api_key)):
    """獲取爬蟲錯誤記錄"""
    import os
    log_file = "logs/fetch_errors.log"
    if not os.path.exists(log_file):
        return {"logs": []}
    
    try:
        with open(log_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
            # 錯誤日誌可能會有多行 traceback，回傳最後 N 行
            return {"logs": [line.rstrip('\n') for line in reversed(lines[-limit:])]}
    except Exception as e:
        logger.error(f"Error reading error logs: {e}")
        return {"logs": [], "error": str(e)}


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

@app.post("/api/v1/upload")
async def upload_image(file: UploadFile = File(...), admin_key: str = Depends(verify_admin_api_key)):
    """上傳圖片 (僅限管理員)"""
    import shutil
    import uuid
    import aiofiles
    
    # 1. Validate extension
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file type extension")
    
    # 2. Validate Magic Bytes (Sync read from SpooledTemporaryFile)
    # UploadFile behaves like a file, so we can read/seek.
    header = await file.read(1024)
    await file.seek(0)
    
    is_valid_header = False
    if header.startswith(b'\xff\xd8\xff'): is_valid_header = True # JPEG
    elif header.startswith(b'\x89PNG\r\n\x1a\n'): is_valid_header = True # PNG
    elif header.startswith(b'GIF8'): is_valid_header = True # GIF
    elif header.startswith(b'RIFF') and header[8:12] == b'WEBP': is_valid_header = True # WEBP
    
    if not is_valid_header:
         raise HTTPException(status_code=400, detail="Invalid file content (Magic bytes mismatch)")

    # 3. Generate safe filename
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = f"backend/static/uploads/{filename}"
    
    # 4. Write with size limit
    total_size = 0
    try:
        async with aiofiles.open(file_path, 'wb') as out_file:
            while True:
                chunk = await file.read(1024 * 1024) # 1MB chunks
                if not chunk:
                    break
                total_size += len(chunk)
                if total_size > settings.MAX_UPLOAD_SIZE:
                    raise HTTPException(status_code=400, detail=f"File too large (Max {settings.MAX_UPLOAD_SIZE/1024/1024}MB)")
                await out_file.write(chunk)
    except HTTPException:
        if os.path.exists(file_path):
             os.remove(file_path)
        raise
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        if os.path.exists(file_path):
             os.remove(file_path)
        raise HTTPException(status_code=500, detail="File upload failed")
            
    # Return public URL
    # Use relative URL or construct based on request host if needed.
    # For now, keeping the structure but returning relative path is safer if domain changes.
    return {"url": f"/uploads/{filename}", "full_url": f"https://goldlab.cloud/uploads/{filename}"}

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    api_key = await verify_ws_api_key(websocket)
    if api_key is None:
        return
    await websocket.accept()
    pubsub = redis_client.redis.pubsub()
    await pubsub.subscribe(
        "market:stream:XAU-USD", 
        "market:stream:XAG-USD", 
        "market:stream:USD-TWD", 
        "market:stream:PAXG-USD", 
        "market:stream:GC-F", 
        "market:stream:SI-F",
        "market:stream:XAG-USDT",
        "market:stream:XAU-USDT",
        "market:stream:DXY",
        "market:stream:US10Y",
        "market:stream:HG-F",
        "market:stream:CL-F",
        "market:stream:VIX",
        "market:stream:GDX",
        "market:stream:SIL"
    )
    
    last_ping = asyncio.get_event_loop().time()
    try:
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message:
                try:
                    await websocket.send_text(message['data'])
                except Exception:
                    break
            
            # Send WebSocket ping every 30 seconds to keep connection alive
            now = asyncio.get_event_loop().time()
            if now - last_ping > 30:
                try:
                    await websocket.send_text('{"type":"ping"}')
                    last_ping = now
                except Exception:
                    break
            
            await asyncio.sleep(0.01)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        try:
            await pubsub.unsubscribe()
        except Exception:
            pass
        try:
            await websocket.close()
        except Exception:
            pass

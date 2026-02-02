import os
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "Goldlab.cloud Aggregator"
    DEBUG: bool = False
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""

    # API Keys
    BINANCE_API_KEY: str = ""
    BINANCE_SECRET_KEY: str = ""
    OANDA_API_KEY: str = ""
    OANDA_ACCOUNT_ID: str = ""

    # API Auth
    API_KEYS: str = ""  # Comma separated API keys
    ADMIN_API_KEYS: str = ""  # Comma separated admin keys

    # Rate Limit
    RATE_LIMIT_PER_MINUTE: int = 120
    RATE_LIMIT_BURST: int = 30
    
    # Circuit Breaker Defaults
    FAILURE_THRESHOLD: int = 5
    RECOVERY_TIMEOUT: int = 300  # seconds

    # Proxy
    PROXY_LIST: str = "" # Comma separated list of proxies

    # History retention
    HISTORY_RETENTION_HOURS: int = 24
    HISTORY_MAX_POINTS: int = 10000

    # Security
    CORS_ORIGINS: str = "*"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB
    ALLOW_ANON_READ: bool = False
    
    # Supported Symbols
    SUPPORTED_SYMBOLS: set = {
        "XAU-USD", "XAG-USD", "USD-TWD", "PAXG-USD", "GC-F", "SI-F", 
        "XAG-USDT", "XAU-USDT", "DXY", "US10Y", "HG-F", "CL-F", "VIX", "GDX", "SIL"
    }

    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

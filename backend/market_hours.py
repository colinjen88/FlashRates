from datetime import datetime
try:
    from zoneinfo import ZoneInfo
except ImportError:
    # Fallback for older python if needed, but 3.11 is assumed
    from backports.zoneinfo import ZoneInfo

# 美東時間 (ET) - 控制夏/冬令時間
MARKET_TIMEZONE = ZoneInfo("America/New_York")

def is_market_open(symbol: str = "XAU-USD") -> bool:
    """
    判斷市場是否開盤 (針對黃金/白銀/外匯)
    規則：美東時間 (ET) 週日 17:00 開盤 至 週五 17:00 收盤。
    週六：全天休市。
    
    Binance 等 Crypto 數據源其實是 7x24，但為了符合使用者定義的
    「停盤時間 (場外交易)」顯示邏輯，我們統一依據傳統市場時間判斷。
    """
    # 簡單過濾 Crypto (如果之後有)
    if "BTC" in symbol or "ETH" in symbol:
        return True

    now_et = datetime.now(MARKET_TIMEZONE)
    weekday = now_et.weekday()  # Monday=0, ..., Sunday=6, Saturday=5
    
    # 1. 週六 (Saturday): 全天休市
    if weekday == 5:
        return False
    
    # 2. 週五 (Friday): 17:00 ET 收盤
    if weekday == 4:
        # 17:00:00 後為休市
        if now_et.hour >= 17:
            return False
            
    # 3. 週日 (Sunday): 17:00 ET 開盤
    if weekday == 6:
        # 17:00:00 前為休市
        if now_et.hour < 17:
            return False
            
    # 其他時間 (週一至週四) 全天開盤
    return True

from datetime import datetime, date
try:
    from zoneinfo import ZoneInfo
except ImportError:
    # Fallback for older python if needed, but 3.11 is assumed
    from backports.zoneinfo import ZoneInfo

# 美東時間 (ET) - 控制夏/冬令時間
MARKET_TIMEZONE = ZoneInfo("America/New_York")


def get_nth_weekday_of_month(year: int, month: int, weekday: int, n: int) -> date:
    """
    取得指定月份的第 n 個特定星期幾
    weekday: 0=Mon, 1=Tue, ..., 6=Sun
    n: 1=第一個, 2=第二個, ...
    """
    first_day = date(year, month, 1)
    # 計算第一個該星期幾是幾號
    first_weekday = first_day.weekday()
    days_until = (weekday - first_weekday + 7) % 7
    first_occurrence = first_day.day + days_until
    return date(year, month, first_occurrence + (n - 1) * 7)


def get_last_weekday_of_month(year: int, month: int, weekday: int) -> date:
    """
    取得指定月份的最後一個特定星期幾
    """
    # 從下個月第一天往回推
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)
    
    # 往回找最後一個該星期幾
    days_back = (next_month.weekday() - weekday + 7) % 7
    if days_back == 0:
        days_back = 7
    from datetime import timedelta
    return next_month - timedelta(days=days_back)


def get_us_holidays(year: int) -> set:
    """
    取得美國主要金融市場假日（貴金屬市場 COMEX 休市日）
    
    固定假日：
    - 元旦 (1/1, 若週末則調整)
    - 獨立日 (7/4, 若週末則調整)
    - 聖誕節 (12/25, 若週末則調整)
    
    浮動假日：
    - 馬丁·路德·金紀念日 (1月第3個週一)
    - 總統日 (2月第3個週一)
    - 耶穌受難日 (復活節前的週五, 需特別計算)
    - 陣亡將士紀念日 (5月最後一個週一)
    - 勞動節 (9月第1個週一)
    - 感恩節 (11月第4個週四)
    """
    holidays = set()
    
    def adjust_for_weekend(d: date) -> date:
        """若假日落在週末，調整到週五或週一"""
        from datetime import timedelta
        if d.weekday() == 5:  # Saturday -> Friday
            return d - timedelta(days=1)
        elif d.weekday() == 6:  # Sunday -> Monday
            return d + timedelta(days=1)
        return d
    
    # 固定假日
    holidays.add(adjust_for_weekend(date(year, 1, 1)))   # 元旦
    holidays.add(adjust_for_weekend(date(year, 7, 4)))   # 獨立日
    holidays.add(adjust_for_weekend(date(year, 12, 25))) # 聖誕節
    
    # 浮動假日
    holidays.add(get_nth_weekday_of_month(year, 1, 0, 3))  # MLK Day: 1月第3個週一
    holidays.add(get_nth_weekday_of_month(year, 2, 0, 3))  # 總統日: 2月第3個週一
    holidays.add(get_last_weekday_of_month(year, 5, 0))    # 陣亡將士紀念日: 5月最後週一
    holidays.add(get_nth_weekday_of_month(year, 9, 0, 1))  # 勞動節: 9月第1個週一
    holidays.add(get_nth_weekday_of_month(year, 11, 3, 4)) # 感恩節: 11月第4個週四
    
    # 耶穌受難日 (復活節前的週五) - 使用匿名格里曆算法
    holidays.add(get_good_friday(year))
    
    return holidays


def get_good_friday(year: int) -> date:
    """
    計算耶穌受難日 (Good Friday) - 復活節前的週五
    使用匿名格里曆算法計算復活節
    """
    from datetime import timedelta
    
    # Anonymous Gregorian algorithm for Easter
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    
    easter = date(year, month, day)
    return easter - timedelta(days=2)  # Good Friday = Easter - 2 days


def is_market_open(symbol: str = "XAU-USD") -> bool:
    """
    判斷市場是否開盤 (針對黃金/白銀/外匯)
    
    規則：
    1. 美東時間 (ET) 週日 18:00 開盤 至 週五 17:00 收盤
    2. 每日 17:00-18:00 ET 休市 (Daily Break / 每日維護時段)
    3. 週六：全天休市
    4. 美國主要假日：全天休市
    
    注意：使用 America/New_York 時區，自動處理夏令/冬令時間切換
    
    Binance 等 Crypto 數據源是 7x24，PAXG 等加密貨幣始終開市。
    """
    # Crypto 資產永遠開市
    crypto_keywords = ["BTC", "ETH", "PAXG", "USDT"]
    if any(kw in symbol.upper() for kw in crypto_keywords):
        return True

    now_et = datetime.now(MARKET_TIMEZONE)
    today = now_et.date()
    weekday = now_et.weekday()  # Monday=0, ..., Sunday=6, Saturday=5
    hour = now_et.hour
    
    # 1. 檢查美國假日
    holidays = get_us_holidays(now_et.year)
    if today in holidays:
        return False
    
    # 2. 週六 (Saturday): 全天休市
    if weekday == 5:
        return False
    
    # 3. 週五 (Friday): 17:00 ET 收盤，週末開始
    if weekday == 4 and hour >= 17:
        return False
            
    # 4. 週日 (Sunday): 18:00 ET 開盤 (17:00-18:00 也是休市)
    if weekday == 6 and hour < 18:
        return False
    
    # 5. 每日休市時段 (Daily Break): 17:00-18:00 ET
    #    適用於週一至週四
    if weekday in [0, 1, 2, 3] and 17 <= hour < 18:
        return False
            
    # 其他時間開市
    return True


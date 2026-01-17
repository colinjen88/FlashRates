# 數據源抓取規則說明

## 概述

為避免 IP 封鎖和違反服務條款，本系統對各數據源設定保守的抓取頻率。

---

## 各來源詳細規則

### 1. Binance (PAXG/USDT)

| 項目 | 設定 |
|------|------|
| **URL** | `https://api.binance.com/api/v3/ticker/price` |
| **類型** | 官方 REST API |
| **Rate Limit** | 1200 requests/min (官方) |
| **配置間隔** | 2 秒 |
| **風險等級** | 🟢 低 |
| **說明** | Binance 提供免費公開 API，限制寬鬆。PAXG 價格約等於黃金盎司價格。 |

---

### 2. GoldPrice.org

| 項目 | 設定 |
|------|------|
| **URL** | `https://data-asg.goldprice.org/dbXRates/USD` |
| **類型** | 非官方 JSON API |
| **Rate Limit** | 無官方說明 |
| **配置間隔** | 15 秒 |
| **風險等級** | 🟡 中 |
| **說明** | 此 API 為網站內部使用，未公開文檔。保守抓取以避免封鎖。 |

---

### 3. 新浪財經 (Sina Finance)

| 項目 | 設定 |
|------|------|
| **URL** | `https://hq.sinajs.cn/list={symbol}` |
| **類型** | 公開 HTTP 接口 |
| **Rate Limit** | 無官方說明 |
| **配置間隔** | 5 秒 |
| **風險等級** | 🟢 低 |
| **說明** | 中國新浪財經的公開報價接口，廣泛被第三方使用。需設定 Referer header。 |

**Symbol 對照：**
- `hf_GC` - 黃金期貨
- `hf_SI` - 白銀期貨
- `fx_susdtwd` - 美元/台幣

---

### 4. BullionVault

| 項目 | 設定 |
|------|------|
| **URL** | `https://live.bullionvault.com/secure/api/v2/view_market_xml.do` |
| **類型** | 官方 XML API |
| **Rate Limit** | 無官方說明 |
| **配置間隔** | 10 秒 |
| **風險等級** | 🟢 低 |
| **說明** | BullionVault 提供的合作夥伴 API，穩定可靠。解析 XML 中的 `<pitch>` 節點。 |

---

### 5. Yahoo Finance

| 項目 | 設定 |
|------|------|
| **URL** | `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}` |
| **類型** | 非官方 REST API |
| **Rate Limit** | 約 2000 requests/hr (非官方估計) |
| **配置間隔** | 60 秒 |
| **風險等級** | 🟡 中 |
| **說明** | Yahoo Finance 未提供官方 API，此為網站內部接口。高頻抓取可能被封鎖。 |

**Symbol 對照：**
- `GC=F` - 黃金期貨
- `SI=F` - 白銀期貨
- `TWD=X` - 美元/台幣

---

### 6. Kitco

| 項目 | 設定 |
|------|------|
| **URL** | `https://www.kitco.com/gold-price-today-usa/` |
| **類型** | HTML 爬蟲 |
| **Rate Limit** | 無，但有反爬蟲機制 |
| **配置間隔** | 60 秒 |
| **風險等級** | 🔴 高 |
| **說明** | 傳統 HTML 解析，需偽裝 User-Agent。頻繁抓取可能觸發封鎖。 |

**注意事項：**
- 必須設定 User-Agent header
- 建議使用代理池輪替 IP
- 頁面結構可能隨時變更

---

### 7. Investing.com

| 項目 | 設定 |
|------|------|
| **URL** | `https://www.investing.com/currencies/xau-usd` |
| **類型** | Playwright 無頭瀏覽器 |
| **Rate Limit** | 嚴格 (Cloudflare WAF) |
| **配置間隔** | 120 秒 |
| **風險等級** | 🔴 高 |
| **說明** | 有嚴格的 Cloudflare 防護，必須使用 `playwright-stealth` 隱藏自動化特徵。 |

**必要配置：**
```python
# 需安裝 playwright-stealth
from playwright_stealth import stealth_sync

# 隨機 User-Agent
# 隨機 Viewport
# 避免過快操作 (增加 random delay)
```

---

### 8. Mock (測試用)

| 項目 | 設定 |
|------|------|
| **類型** | 模擬數據 |
| **配置間隔** | 2 秒 |
| **風險等級** | 🟢 無 |
| **說明** | 產生隨機波動價格供測試使用，不對外請求。 |

---

## 熔斷機制 (Circuit Breaker)

當來源連續失敗時，系統自動觸發熔斷：

| 參數 | 設定 |
|------|------|
| **失敗閾值** | 5 次 |
| **冷卻時間** | 300 秒 (5 分鐘) |
| **行為** | 暫停請求該來源，避免「重試死亡螺旋」 |

---

## 建議的生產環境配置

### 1. 代理池 (Proxy Pool)

針對 Kitco 和 Investing.com，強烈建議使用代理：

```python
PROXY_LIST = [
    "http://proxy1.example.com:8080",
    "http://proxy2.example.com:8080",
    # ...
]
```

### 2. 住宅代理 (Residential Proxy)

對於 Cloudflare 保護的網站，數據中心 IP 容易被識別，建議使用住宅代理服務：
- Luminati
- Smartproxy
- Oxylabs

### 3. User-Agent 輪替

```python
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15...",
    # ...
]
```

---

## 監控與告警

建議監控以下指標：

1. **各來源成功率** - 低於 80% 時告警
2. **平均延遲** - 超過 1000ms 時告警
3. **熔斷狀態** - 任何來源熔斷時告警
4. **403/429 錯誤率** - 出現時立即告警 (可能被封鎖)

---

## 法律聲明

本系統僅供學習和個人使用。使用者應：

1. 遵守各數據源的服務條款
2. 不將數據用於商業目的 (除非獲得授權)
3. 合理控制抓取頻率
4. 尊重 robots.txt 規則

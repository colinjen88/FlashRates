# Goldlab.cloud - 高頻匯率數據聚合系統 v3.2

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)]()
[![React](https://img.shields.io/badge/react-18+-61DAFB.svg)]()

**即時監控黃金 (XAU, GC-F, PAXG)、白銀 (XAG, SI-F) 與美元匯率 (USD/TWD) 的高頻數據聚合平台。**

採用「分散式採集、中心化聚合」模式，從 15 個異構數據源同步抓取報價，實現亞秒級更新。

---

## 📋 目錄

- [系統架構](#系統架構)
- [快速開始](#快速開始)
- [專案結構](#專案結構)
- [後端 API](#後端-api)
- [數據源配置](#數據源配置)
- [前端功能](#前端功能)
- [配置說明](#配置說明)
- [開發指南](#開發指南)

---

## 🏗️ 系統架構

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Goldlab.cloud 系統架構                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  Binance    │  │ GoldPrice   │  │    Sina     │  │   Yahoo    │  │
│  │  (PAXG)     │  │   .org      │  │  Finance    │  │  Finance   │  │
│  │  0.5s/次    │  │  10s/次     │  │   3s/次     │  │  60s/次    │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │
│         │                │                │               │         │
│         └────────────────┴────────┬───────┴───────────────┘         │
│                                   ▼                                 │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Scheduler (排程器)                         │   │
│  │   • 時間分片輪詢 (Staggered Polling)                          │   │
│  │   • 各來源獨立間隔與偏移量                                     │   │
│  │   • Circuit Breaker 熔斷機制                                  │   │
│  └────────────────────────────┬─────────────────────────────────┘   │
│                               ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Aggregator (聚合引擎)                       │   │
│  │   • 加權平均計算 (Binance: 0.8, 爬蟲: 0.4-0.6)                 │   │
│  │   • 異常值過濾 (偏離中位數 > 0.3% 自動剔除)                    │   │
│  │   • 來源歸因追蹤                                              │   │
│  └────────────────────────────┬─────────────────────────────────┘   │
│                               ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                Redis (FakeRedis 備選)                         │   │
│  │   • PubSub: market:stream:{symbol}                           │   │
│  │   • Cache: market:latest:{symbol}                            │   │
│  └───────────────────┬──────────────────┬───────────────────────┘   │
│                      │                  │                           │
│           WebSocket ▼         REST API ▼                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    FastAPI (:8000)                            │   │
│  │   • GET /api/v1/latest?symbols=xau-usd,xag-usd               │   │
│  │   • WS  /ws/stream                                           │   │
│  └────────────────────────────┬─────────────────────────────────┘   │
│                               ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                React Frontend (:7000)                         │   │
│  │   • 即時看板 (Dashboard)                                      │   │
│  │   • API 文檔 (Docs)                                          │   │
│  │   • 價格卡片 + 來源歸因                                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 快速開始

### 環境需求

- Python 3.11+
- Node.js 18+
- Redis (可選，系統自動使用 FakeRedis 作為備選)

### 安裝與啟動

```bash
# 1. 安裝後端依賴
cd backend
pip install fastapi uvicorn redis pydantic-settings aiohttp fakeredis

# 2. 啟動後端 (Port 8000)
python -m uvicorn backend.main:app --reload --port 8000

# 3. 安裝前端依賴
cd frontend
npm install

# 4. 啟動前端 (Port 7000)
npm run dev
```

### 訪問地址

| 前端儀表板 | https://goldlab.cloud                 | 生產環境介面 |
| 後端 API   | https://goldlab.cloud/api/v1/latest     | REST API     |
| WebSocket  | wss://goldlab.cloud/ws/stream           | 實時數據推送 |
| Metrics    | https://goldlab.cloud/api/v1/metrics    | 服務監控指標 |
| API 文檔   | https://goldlab.cloud/docs              | Swagger UI   |

---

## 📁 專案結構

```
Goldlab.cloud/
├── 📂 backend/                    # 後端 Python 服務
│   ├── 📂 sources/                # 數據源連接器
│   │   ├── base.py               # 抽象基類
│   │   ├── binance.py            # Binance PAXG (高頻)
│   │   ├── goldprice.py          # GoldPrice.org JSON API
│   │   ├── sina.py               # 新浪財經
│   │   ├── bullionvault.py       # BullionVault XML API
│   │   ├── yahoo.py              # Yahoo Finance
│   │   ├── kitco.py              # Kitco HTML 爬蟲
│   │   ├── investing.py          # Investing.com (Playwright)
│   │   └── mock.py               # Mock 測試數據源
│   ├── aggregator.py             # 聚合引擎 (加權平均 + 異常值過濾)
│   ├── scheduler.py              # 調度器 (時間分片)
│   ├── circuit_breaker.py        # 熔斷器
│   ├── redis_client.py           # Redis 客戶端 (含 FakeRedis 備選)
│   ├── config.py                 # 配置載入器
│   └── main.py                   # FastAPI 入口點
│
├── 📂 frontend/                   # 前端 React 應用
│   ├── 📂 src/
│   │   ├── App.jsx               # 主應用組件
│   │   ├── index.css             # Tailwind CSS
│   │   └── main.jsx              # React 入口點
│   ├── vite.config.js            # Vite 配置 (Port 7000)
│   └── package.json
│
├── 📂 tests/                      # 測試
│   └── test_system.py            # 單元測試 (Circuit Breaker, Aggregator)
│
├── index.jsx                      # 原始前端原型 (備份)
├── 高頻匯率數據聚合系統_v2.md      # 原始規格文件
└── README.md                      # 本文件
```

---

## 🔌 後端 API

### REST API

#### `GET /api/v1/latest`

獲取最新匯率數據。

**認證方式：**

- Header: `X-API-Key: <dev_key>`
- 或 `Authorization: Bearer <dev_key>`
  > 若未設定 `API_KEYS`，則不強制驗證（開發環境預設），可使用任意 Key (如 `dev_key`)。

**頻率限制：**

- 預設每分鐘 120 次 + 30 次突發額度（可在環境變數調整）

### API Key 管理

提供本機產生工具，快速建立多組 API Key：

```
python backend/tools/api_key_tool.py --count 3 --length 32 --prefix fr_
```

輸出結果會包含建議的 `.env` 設定行：

```
API_KEYS=fr_xxx,fr_yyy,fr_zzz
```

**請求參數：**
| 參數 | 類型 | 說明 |
|------|------|------|
| symbols | string | 逗號分隔的代碼 (例: `xau-usd,xag-usd,usd-twd`) |

**回應範例：**

```json
{
  "timestamp": 1705500000.123,
  "data": {
    "XAU-USD": {
      "symbol": "XAU-USD",
      "price": 2650.45,
      "timestamp": 1705500000.1,
      "sources": 6,
      "details": ["Binance", "GoldPrice.org", "Yahoo Finance"],
      "fastest": "Binance",
      "avgLatency": 150.5,
      "is_market_open": true
    }
  }
}
```

### WebSocket

#### `WS /ws/stream`

訂閱實時價格更新。連線後自動推送所有資產的更新。

**認證方式：**

- Query: `ws://localhost:8000/ws/stream?api_key=dev_key`
- 或在 Header 帶 `X-API-Key`

**推送訊息格式：**

```json
{
  "symbol": "XAU-USD",
  "price": 2650.45,
  "timestamp": 1705500000.1,
  "sources": 6,
  "details": ["Binance", "GoldPrice.org"],
  "fastest": "Binance",
  "avgLatency": 150.5
}
```

### Metrics

#### `GET /api/v1/metrics`

回傳服務運行指標（來源成功/失敗、平均延遲、聚合次數等）。

**回應範例：**

```json
{
  "startTime": 1705500000.0,
  "uptimeSeconds": 120.5,
  "totals": {
    "sourceSuccess": 1200,
    "sourceFailure": 12,
    "aggregateSuccess": 360
  },
  "sources": {
    "Binance": { "success": 300, "failure": 2, "avgLatencyMs": 42.1 }
  },
  "aggregates": {
    "XAU-USD": { "count": 120, "avgLatencyMs": 160.3, "lastSources": 6 }
  }
}
```

### 管理端 (Admin)

**認證方式：**

- Header: `X-API-Key: <ADMIN_API_KEY>`

#### `GET /api/v1/admin/keys`

列出所有 API Key 及其停用狀態。

> Redis 新增/移除的 key 只在本次服務期間生效；請同步到 `.env` 並重啟以持久化。

#### `POST /api/v1/admin/keys/disable`

停用指定 API Key。

```json
{ "key": "gl_xxx" }
```

#### `POST /api/v1/admin/keys/enable`

啟用指定 API Key。

```json
{ "key": "gl_xxx" }
```

#### `POST /api/v1/admin/keys/add`

新增 API Key（寫入 Redis）。

```json
{ "key": "gl_xxx" }
```

#### `POST /api/v1/admin/keys/remove`

移除 Redis 內的 API Key（`.env` 內的 key 需手動移除並重啟）。

```json
{ "key": "gl_xxx" }
```

---

## 📊 數據源配置

| 來源                  | 類型       | 輪詢間隔 | 偏移量 | 權重 | 支援資產          |
| --------------------- | ---------- | -------- | ------ | ---- | ----------------- |
| **Binance**           | Crypto/Future| 2s       | 0s     | 0.8  | PAXG, XAU-F, XAG-F|
| **GoldPrice.org**     | JSON API   | 15s      | 1s     | 0.6  | XAU, XAG          |
| **新浪財經**          | HTTP       | 5s       | 0.5s   | 0.6  | XAU, XAG, USD-TWD |
| **Gold-API**          | REST API   | 30s      | 40s    | 0.6  | XAU, XAG          |
| **APMEX**             | Scrape     | 60s      | 50s    | 0.5  | XAU, XAG          |
| **BullionVault**      | XML API    | 10s      | 2s     | 0.7  | XAU               |
| **Yahoo Finance**     | REST API   | 60s      | 5s     | 0.5  | XAU, XAG, FX, DXY, US10Y, Copper, Oil, VIX, GDX, SIL |
| **Kitco**             | HTML 爬蟲  | 60s      | 10s    | 0.4  | XAU, XAG          |
| **Investing.com**     | Playwright | 120s     | 15s    | 0.5  | XAU, XAG, USD-TWD |
| **OANDA**             | REST API   | 5s       | 3s     | 0.8  | XAU, XAG, USD-TWD |
| **Taiwan Bank**       | CSV        | 60s      | 20s    | 0.7  | USD-TWD           |
| **exchangerate.host** | REST API   | 30s      | 12s    | 0.5  | USD-TWD           |
| **open.er-api.com**   | REST API   | 60s      | 25s    | 0.5  | USD-TWD           |
| **Fawaz API**         | CDN        | 1h       | 30s    | 0.3  | USD-TWD           |
| **FloatRates**        | Feed       | 1h       | 45s    | 0.3  | USD-TWD           |
| **Mock**              | 測試       | 2s       | 0s     | 0.3  | 全部              |

### 可加入的免費即時匯率來源（候選）

以下為可評估加入的免費來源（多數有頻率限制或需申請免費金鑰）：

- exchangerate.host（已加入）
- open.er-api.com（已加入）
- frankfurter.app（ECB 來源，適合非高頻用途）
- tw.rter.info（匯率聚合站點，需注意使用條款）
- 各銀行公開牌告 CSV/HTML（多為分鐘級更新）

### 時間分片說明

為避免同時請求造成 IP 封鎖，各來源按偏移量 (Offset) 錯開：

```
T=0.0s: Binance 請求
T=0.5s: 新浪財經 請求
T=1.0s: GoldPrice.org 請求
T=2.0s: BullionVault 請求
T=3.0s: Kitco 請求
T=4.0s: Investing.com 請求
T=5.0s: Yahoo Finance 請求
...
```

---

## ⏰ 市場時間

系統會自動判斷市場開收盤狀態，並透過 `is_market_open` 欄位回傳。

### 貴金屬現貨市場 (XAU/XAG)

| 狀態 | 時間 (美東 ET) | 說明 |
|------|---------------|------|
| **每日休市** | 17:00 - 18:00 | Daily Break，每日維護時段 |
| **週末休市** | 週五 17:00 - 週日 18:00 | 週末休市 |
| **假日休市** | 美國主要假日 | 見下表 |

### 美國假日 (COMEX 休市日)

| 假日 | 日期規則 |
|------|----------|
| 元旦 | 1月1日 (週末順延) |
| 馬丁·路德·金紀念日 | 1月第3個週一 |
| 總統日 | 2月第3個週一 |
| 耶穌受難日 | 復活節前週五 |
| 陣亡將士紀念日 | 5月最後一個週一 |
| 獨立日 | 7月4日 (週末順延) |
| 勞動節 | 9月第1個週一 |
| 感恩節 | 11月第4個週四 |
| 聖誕節 | 12月25日 (週末順延) |

### 24/7 資產

以下資產不受市場時間限制，全天候開放：
- **XAU-USDT / XAG-USDT** (幣安合約)

### 夏令/冬令時間

系統使用 `America/New_York` 時區，自動處理夏令/冬令時間切換：
- **冬令時間 (EST)**: UTC-5 (約 11月第一個週日 - 3月第二個週日)
- **夏令時間 (EDT)**: UTC-4 (約 3月第二個週日 - 11月第一個週日)

---

## 🖥️ 前端功能

### 儀表板 (Dashboard)

1. **多資產即時看板**
   - 寬屏佈局 (1440px) 與 Flex 響應式設計
   - 市場概覽包含：TradingView 美元匯率圖表、美元匯率、美元指數、美債殖利率
   - 黃金區塊包含：TradingView 走勢圖、黃金現貨、幣安合約 (黃金)、黃金期貨
   - 白銀區塊包含：TradingView 走勢圖、白銀現貨、幣安合約 (白銀)、白銀期貨
   - 新增「Log 記錄」功能：監控現貨 vs 幣安合約價差 > 1% 的異常紀錄
   - 價格變動時背景閃爍動畫 (綠漲/紅跌)
   - 顯示漲跌幅百分比

2. **來源歸因顯示**
   - 顯示當前價格由哪個來源貢獻
   - 顯示平均延遲 (ms)

- 10 格進度條顯示活躍來源數量

3. **連線狀態指示**
   - 綠燈：WebSocket 已連接
   - 紅燈：連線中...

### API 文檔 (Docs)

- 內嵌於儀表板的 API 說明頁面
- 提供 cURL, Python, JavaScript 代碼範例
- 一鍵複製功能

---

## ⚙️ 配置說明

### 環境變數 (`.env`)

```env
# Redis 配置 (可選，未配置時使用 FakeRedis)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=

# 應用配置
APP_NAME=Goldlab.cloud Aggregator
DEBUG=false

# API 認證
API_KEYS=gl_demo,gl_user1
ADMIN_API_KEYS=admin-key-1

# Rate Limit (每分鐘 + 突發)
RATE_LIMIT_PER_MINUTE=120
RATE_LIMIT_BURST=30
```

### Vite 配置 (`frontend/vite.config.js`)

```javascript
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 7000, // 前端固定使用 Port 7000
  },
});
```

---

## 🧪 開發指南

### 運行測試

```bash
cd Goldlab.cloud
python -m pytest tests/test_system.py -v
```

### 新增數據源

1. 在 `backend/sources/` 建立新檔案，繼承 `BaseSource`
2. 實作 `fetch_price(symbol)` 方法
3. 在 `backend/main.py` 中加入到 `sources` 列表
4. 在 `backend/scheduler.py` 的 `SOURCE_CONFIG` 加入輪詢配置

### 核心類別

| 類別             | 檔案                 | 職責                  |
| ---------------- | -------------------- | --------------------- |
| `BaseSource`     | `sources/base.py`    | 數據源抽象基類        |
| `Aggregator`     | `aggregator.py`      | 加權平均 + 異常值過濾 |
| `Scheduler`      | `scheduler.py`       | 時間分片調度          |
| `CircuitBreaker` | `circuit_breaker.py` | 熔斷機制              |
| `RedisClient`    | `redis_client.py`    | Redis 操作封裝        |

---

## 📜 版本歷史

| 版本 | 日期       | 說明                  |
| ---- | ---------- | --------------------- |
| v3.2 | 2026-02-24 | 修復 RedisClient 語法錯誤與 zcard 缺失；增強聚合引擎魯棒性 (try-except)；補齊 playwright-stealth 依賴；修正 Docker 健康檢查。 |
| v3.1 | 2026-02-24 | 修復 API 無限重定向迴圈 (ERR_TOO_MANY_REDIRECTS)；優化 WebSocket 的 HTTPS 代理配置；擴充公有路徑支援 (Slashed URL support)。 |
| v3.0 | 2026-01-24 | 介面重新設計 (Flex Layout)；移除 PAXG 卡片；新增 TradingView USD-TWD 走勢圖；新增「現貨vs幣安合約」價差監控 Log 系統；優化部署腳本。 |
| v2.9 | 2026-01-21 | 新增市場時間判斷 (`is_market_open`)：每日休市 (17:00-18:00 ET)、週末休市、美國假日休市 (MLK Day, 感恩節等)；支援夏/冬令時間自動切換 |
| v2.8 | 2026-01-20 | 新增相關指標 (DXY, US10Y, 銅, 原油, VIX, GDX, SIL)；新增 Yahoo Finance 來源；新增「相關指標」區塊與連動關係表；Footer 版權與寬度調整 |
| v2.7 | 2026-01-20 | 介面寬度擴增至 1440px；優化四欄式佈局；黃金/白銀區塊新增獨立 TradingView 走勢圖；調整卡片順序與標籤 |
| v2.6 | 2026-01-20 | 新增幣安合約 (Futures) 支援 (XAU-USDT, XAG-USDT)；修正新浪財經解析；優化儀表板佈局 (Overview 整合 PAXG) |
| v2.5 | 2026-01-20 | 擴展數據源至 15 個：新增 Gold-API, APMEX 來源；新浪財經補齊現貨報價 |
| v2.4 | 2026-01-20 | 新增 TradingView 黃金/白銀走勢圖 (Iframe)；新增幣安白銀 (XAG-USDT)；即時性顏色指標 (綠/橘/紅/紫)；介面優化 |
| v2.3 | 2026-01-20 | 新增期貨(GC-F, SI-F)、PAXG 報價；Docker 部署至 goldlab.cloud |
| v2.0 | 2026-01-17 | 完整實作 8 源聚合系統 |
| v1.0 | -          | 原始規格設計          |

---

## 📝 待辦事項

- [ ] 實作 Investing.com Playwright 爬蟲 (需要 playwright-stealth)
- [ ] 新增 OANDA WebSocket 實時推送
- [ ] 實作台灣銀行匯率牌告備援
- [ ] 新增 IP 代理池 (Proxy Pool)
- [ ] 部署至生產環境 (Nginx + Supervisord)

---

## 📄 授權

MIT License

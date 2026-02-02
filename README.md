# Goldlab.cloud - 即時資產聚合平台 v4.0

即時黃金、白銀與匯率監控平台。專為高頻交易與市場研究設計，整合超過 15 個全球數據源。

## 🌟 核心特性 (v4.0 更新)

本專案於 2026-02-02 完成重大架構重組與安全性強化：

1. **安全性全面升級**
   - **移除硬編碼金鑰**：前端不再留存任何敏感資訊，管理操作均受後端 `ADMIN_API_KEYS` 保護。
   - **API Key 動態驗證**：支援 URL 參數、LocalStorage 與 Header 多重 API Key 驗證機制。
   - **上傳保護**：圖片上傳整合 UUID 檔名淨化、MIME 驗證與 10MB 限制。

2. **高性能調度模型**
   - **來源中心化排程**：由「每資產一任務」重構為「每來源一輪詢」，大幅降低系統開銷。
   - **Redis 狀態同步**：Rate Limiting 與 Metrics 完全 Redis 持久化，支援多節點擴展。
   - **不覆寫歷史模型**：歷史資料採用 UUID Member 設計，確保同一秒內的多筆數據不會被覆寫。

3. **現代化前端與視覺化**
   - **即時趨勢圖 (Sparklines)**：資產卡片整合即時小圖表，視覺化呈現價格波動。
   - **模組化架構**：前端程式碼完全拆分為單獨的 Section 與 Component，提升維護性。

## 🏗️ 系統架構

```
[數據源層] -> [中心化排程 (By Source)] -> [加權聚合引擎] -> [Redis (持久化 & PubSub)] 
                                                                    |
                                                                    v
[REST API / WebSocket] <-------------------------------------- [FastAPI 後端]
          |
          v
[React 前端儀表板] (即時趨勢線 + 來源追蹤)
```

## 🚀 部署指南

本專案已完全 Docker 化，支援一鍵部署：

```powershell
# 1. 配置環境變數
cp .env.example .env

# 2. 本地開發
cd frontend && npm install && npm run dev
cd backend && pip install -r requirements.txt && python -m uvicorn backend.main:app

# 3. 生產部署 (Docker)
.\scripts\deploy_docker.ps1
```

## 🔌 技術棧

- **後端**: Python 3.11+, FastAPI, Redis, Playwright, Aiohttp
- **前端**: React 18, Vite, Tailwind CSS, Lucide Icons, TradingView API
- **運維**: Docker, Nginx, GitHub Actions (預備)

---
© 2026 Goldlab.cloud. MIT License.

# FlashRates 改善建議與規劃（2026-02-02）

## 0. 全局評估結論
- 架構與功能完整度高（多源輪詢、MAD 異常過濾、熔斷、自適應降頻、Redis/FakeRedis 備援、前端儀表板）。
- 主要風險集中在安全性（硬編碼憑證、寬鬆 CORS、上傳缺防護）、可擴展性（排程任務爆炸、Rate/Metrics 僅記憶體）、可觀測性不足與歷史資料模型可被覆寫。
- 建議按「安全 → 可用性/效能 → 擴展」三階段落地。

## 0.1 目標與範圍（交付邊界）
- 目標：提升安全性、穩定性、可擴展性與可觀測性，並提供可執行的工程落地計畫。
- 範圍：後端（FastAPI + Scheduler + Aggregator + Redis）、前端（Dashboard/管理端）、部署與監控。
- 非目標：新增新資產類別或重做 UI 視覺設計（除非另行排期）。

## 0.2 假設前提
- 生產環境使用 Redis（非 FakeRedis）。
- 後端走 HTTPS，前面有 Nginx/反向代理。
- 具備最少一組 API key 與 admin key（透過 .env 或 Secret 管理）。

## 1. 必修（安全/合規，1 週內）
1) 移除前端硬編碼管理憑證
   - 位置：frontend/src/App.jsx。
   - 改為：後端管理 API key + 短期 token 或 OTP；前端不存密碼。
2) CORS 收斂
   - 位置：backend/main.py CORSMiddleware。
   - 生產環境限制 allow_origins 為受信網域，允許列表化。
3) 上傳端點防護
   - 位置：backend/main.py /api/v1/upload。
   - 加入：檔案大小上限、MIME/副檔名雙重驗證、檔名淨化（移除原檔名，使用 uuid+ext）。
4) Admin/API Key 管控
   - Admin key 強制存在且必填；若缺少直接拒絕啟動。
   - API symbols 白名單驗證，拒絕不支援資產；避免濫用查詢。
5) 伺服器面安全
   - 預設 HTTPS、可選 IP 白名單（Nginx 層）、Rate limit 失效時的降級策略。

## 2. 應做（穩定/效能，1–4 週）
1) 排程模型重構
   - 現況：每 symbol × 每 source 一任務，來源/資產增加即爆炸。
   - 建議：
     - 以來源為中心：每來源有一輪詢 loop，內部決定支援的資產集合，批次抓取並分派結果。
     - 或使用任務池：固定併發度，來源/資產入佇列，避免 N×M 任務。
2) Rate limit 與 Metrics 外部化
   - 位置：backend/auth.py、backend/metrics.py。
   - 將計數移至 Redis（或限流中介如 nginx/traefik + redis token bucket）。
   - Metrics 用 Prometheus exporter 或 OpenTelemetry（counter/gauge/histogram）。
3) 歷史資料模型
   - 現況：zset member = JSON，timestamp 為 score；同一時間戳會覆寫。
   - 建議：member 改 UUID；或導入 RedisTimeSeries/TSDB（Timescale/Influx）。
4) WebSocket 效能
   - 位置：backend/main.py ws/stream。
   - 減少 busy loop：改 await pubsub.get_message(timeout) + backpressure；或使用 aioredis v2 subscriber with callbacks。
5) HTTP 客戶端強化
   - 增加 proxy pool 支援（配置化）、連線數限制、User-Agent/headers 隨機化（避免被封）。

## 2.1 應做：明確工程落地清單（建議直接拆工單）
### 安全類
- 移除前端硬編碼帳密（改為後端管理 token）。
- 建立 API key 管理規範（新增/停用/輪替/稽核）。
- 上傳端點加檔案大小限制與 MIME 驗證。

### 穩定性/效能類
- Scheduler 重構（以來源為中心 + 固定併發度）。
- WS loop 降 busy-wait + backpressure。
- 历史資料改 UUID member 或 RedisTimeSeries。

### 可觀測性
- Prometheus 指標輸出與 Dashboards。
- 加入 request-id（API/WS），串接 log correlation。

### 運維與部署
- CI/CD 與 Git Hooks：引入 pre-commit hooks (detect-secrets/gitleaks) 防止金鑰提交。
- Docker Healthcheck：在 docker-compose.yml 加入 healthcheck，偵測服務假死。
- Log Rotation：配置 RotatingFileHandler 或 Docker logging driver (max-size) 防止磁碟塞滿。

## 2.2 補充建議詳解 (運維與防呆)
1) CI/CD 與 Git Hooks (防呆機制)
   - 問題：僅靠人工移除硬編碼憑證不夠，未來可能會不小心再次 commit。
   - 建議：引入 pre-commit hooks (如 detect-secrets 或 gitleaks)，在 commit 前自動掃描是否包含金鑰或密碼。
2) Docker 容器健康檢查 (Healthcheck)
   - 問題：目前依賴 restart: always，但若服務假死 (Process 活著但無法回應)，Docker 不會知道。
   - 建議：在 docker-compose.yml 加入 healthcheck (curl localhost/health)，配合 Docker 的 autoheal。
3) 日誌輪替 (Log Rotation)
   - 問題：目前 logging.basicConfig 輸出到 console，若長期運行且導向檔案，可能塞滿磁碟。
   - 建議：配置 RotatingFileHandler 或依賴 Docker 的 logging driver (max-size, max-file)。

## 3. 進階（擴展/韌性，1–3 月）
1) 可觀測性
   - OpenTelemetry Trace/Metric/Log，匯出到 Prometheus + Loki + Tempo。
   - 關鍵指標：來源成功率、延遲分位數、聚合耗時、PubSub lag、WebSocket 連線數。
2) 資料品質治理
   - 動態權重：依近期延遲/成功率調整；對偏移大的來源降低權重。
   - Kalman/分位數回歸平滑，對高波動時段提高容忍度。
3) 多區域與多節點
   - 資料採集分區（Asia/US/EU），跨區聚合；Redis 轉為叢集或使用消息匯流排（Kafka/Redpanda）以支援水平擴展。
   - WebSocket 層加 sticky session 或使用推播中心（e.g., Centrifugo/Soketi）。
4) 前端重構
   - App.jsx 拆分模組（Dashboard/Admin/API Docs/Charts/Hooks），引入型別（TS）與測試。
   - 加入錯誤態/重試提示、WS 斷線重連、延遲與來源健康度視覺化。

## 4. 優先落地任務清單（可直接排 Sprint）
- W1：移除硬編碼憑證，CORS 收斂，上傳安全防護，symbols 白名單。
- W2：Rate/Metrics 移至 Redis；API/WS 回傳加入 request-id；WS loop 減少 busy wait。
- W3–W4：排程重構為「以來源為中心」；歷史資料改 UUID member 或 TSDB；前端模組化拆分。
- M2：Prometheus/OpenTelemetry 串接；動態權重；Proxy pool + 指紋隱匿策略；多區域採集 PoC。

## 4.1 交付驗收清單（工程師可直接打勾）
- [ ] 前端無硬編碼帳密，管理端登入依賴後端 token。
- [ ] CORS 僅允許白名單來源。
- [ ] 上傳端點具大小限制與 MIME/副檔名雙重驗證。
- [ ] API/WS 附帶 request-id 可追蹤。
- [ ] Scheduler 任務數量不再與 N×M 線性成長。
- [ ] Metrics 與 Rate limit 可跨節點持久化（Redis）。
- [ ] 歷史資料不覆寫（UUID 或 TSDB）。
- [ ] 監控 Dashboard 可觀測來源成功率與延遲分位數。

## 5. 驗收與風險
- 驗收指標：
  - 安全：無硬編碼密碼；CORS 白名單；上傳安全測試通過；API key 缺失時服務拒啟動。
  - 效能：任務數不隨資產線性爆炸；WS CPU 佔用下降；Rate/Metrics 重啟不丟失。
  - 可靠：多來源失效時，聚合仍持續（熔斷生效）；歷史記錄不覆寫；監控可見。
- 風險：
  - 排程重構可能影響資料新鮮度，需壓測與 A/B 比較。
  - 來源被封需 Proxy/指紋方案預備；Prometheus/Otel 引入需調整資源配額。

## 6. 測試與回滾建議
- 測試：
   - 安全性測試：無 key、錯誤 key、禁用 key、超額 rate limit。
   - 壓測：以 3 倍來源數/資產數，確認 CPU/記憶體上限。
   - 穩定性：來源失效、超時、回傳錯誤格式。
- 回滾：
   - 先保留舊排程版本（feature flag/環境變數切換）。
   - WS/歷史資料模型變更需雙寫過渡一段時間。

## 7. 依賴與資源
- 基礎設施：Redis（主/副或 Cluster）、Nginx/反向代理、監控堆疊（Prometheus/Grafana）。
- 工程時間：
   - W1：1–2 人天
   - W2：3–5 人天
   - W3–W4：7–10 人天
   - M2：10+ 人天

---
如需我直接實作，請指定優先級（安全/排程/觀測）與目標環境，我會分支提交變更。

#!/bin/bash
# deploy.sh - Goldlab.cloud VPS 部署腳本
# 用途：拉取最新代碼、建置前端、重啟 Docker 服務，並向 Gateway 回報
set -e

PROJECT_DIR="/opt/goldlab-cloud"
REGISTRY_URL="https://my8020.cloud/jen/api/register-project"

echo "=========================================="
echo "Goldlab.cloud 部署開始: $(date)"
echo "=========================================="

# 1. 拉取最新代碼
echo "--- Step 1: 拉取最新代碼 ---"
cd "$PROJECT_DIR"
git pull origin main

# 2. 建置前端
echo "--- Step 2: 建置前端 ---"
cd "$PROJECT_DIR/frontend"
npm ci --prefer-offline
npm run build
echo "前端建置完成 -> frontend/dist/"

# 3. 重新建置並啟動 Docker 服務
echo "--- Step 3: Docker 建置與啟動 ---"
cd "$PROJECT_DIR"
docker compose build --no-cache backend
docker compose up -d

# 4. 等待服務健康檢查通過
echo "--- Step 4: 等待服務啟動 ---"
RETRY=0
MAX_RETRY=12
until curl -sf http://localhost:8000/api/v1/latest > /dev/null 2>&1; do
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRY ]; then
        echo "❌ 服務啟動超時，請檢查 docker compose logs"
        exit 1
    fi
    echo "等待後端就緒... ($RETRY/$MAX_RETRY)"
    sleep 5
done
echo "✅ 後端服務已就緒"

# 5. 向 Gateway 回報此專案的最新動態
echo "--- Step 5: 向 Gateway 回報 ---"
curl -s -X POST "$REGISTRY_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "goldlab-cloud",
    "domain": "goldlab.cloud",
    "container": "goldlab-cloud-frontend",
    "description": "高頻匯率數據聚合系統 (黃金、白銀、USD/TWD)"
  }' && echo "" || echo "⚠️ Gateway 回報失敗（不影響服務運行）"

echo "=========================================="
echo "✅ 部署完成: $(date)"
echo "=========================================="

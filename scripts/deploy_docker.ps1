$VPS_HOST = "72.62.66.151"
$VPS_USER = "root"
$PROJECT_DIR = "/home/docker-server/projects/goldlab-cloud"

Write-Host "🚀 Starting Docker Deployment to $VPS_HOST..." -ForegroundColor Cyan

# 0. Initialize Remote Directories
Write-Host "📂 Ensuring remote directories exist..."
ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p ${PROJECT_DIR}/backend ${PROJECT_DIR}/frontend/dist ${PROJECT_DIR}/docker"

# 1. Upload Backend
Write-Host "📦 Uploading Backend..."
scp -r backend/* "${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/backend/"
scp backend/requirements.txt "${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/backend/"

# 2. Upload Frontend Dist
Write-Host "📦 Uploading Frontend..."
scp -r frontend/dist/* "${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/frontend/dist/"

# 3. Upload Docker Configs
Write-Host "📦 Uploading Configuration..."
scp .env "${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/"
scp docker-compose.yml "${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/"
scp -r docker "${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/"

# 4. Restart Services
Write-Host "🔄 Restarting Services..."
ssh "${VPS_USER}@${VPS_HOST}" "cd ${PROJECT_DIR} && docker-compose down --remove-orphans && docker rm -f goldlab-cloud-redis goldlab-cloud-backend goldlab-cloud-frontend 2>/dev/null || true && docker-compose up -d --build"

Write-Host "✅ Deployment Complete! Check logs with: ssh ${VPS_USER}@${VPS_HOST} 'cd ${PROJECT_DIR} && docker-compose logs -f'" -ForegroundColor Green

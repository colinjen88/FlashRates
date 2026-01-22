$VPS_HOST = "goldlab.cloud"
$VPS_USER = "root"
$PROJECT_DIR = "/home/docker-server/projects/flashrates"

Write-Host "🚀 Starting Docker Deployment to $VPS_HOST..." -ForegroundColor Cyan

# 1. Upload Backend
Write-Host "📦 Uploading Backend..."
scp -r backend/* "${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/backend/"
scp requirements.txt "${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/backend/"

# 2. Upload Frontend Dist
Write-Host "📦 Uploading Frontend..."
scp -r frontend/dist/* "${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/frontend/dist/"

# 3. Upload Docker Configs
Write-Host "📦 Uploading Configuration..."
scp docker-compose.yml "${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/"
scp -r docker "${VPS_USER}@${VPS_HOST}:${PROJECT_DIR}/"

# 4. Restart Services
Write-Host "🔄 Restarting Services..."
ssh "${VPS_USER}@${VPS_HOST}" "cd ${PROJECT_DIR} && docker-compose down && docker-compose up -d --build"

Write-Host "✅ Deployment Complete! Check logs with: ssh ${VPS_USER}@${VPS_HOST} 'cd ${PROJECT_DIR} && docker-compose logs -f'" -ForegroundColor Green

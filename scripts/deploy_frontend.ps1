$VPS = "root@liro.world"
$DIR = "/home/docker-server/projects/flashrates"

Write-Host "🚧 Building Frontend..."
cd frontend
npm run build
cd ..

Write-Host "📦 Uploading Frontend code..."
scp -r frontend/dist/* "${VPS}:${DIR}/frontend/dist/"

Write-Host "✅ Uploaded. Nginx should serve the new files immediately."

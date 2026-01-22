$VPS = "root@goldlab.cloud"
$DIR = "/home/docker-server/projects/flashrates"

Write-Host "📂 Uploading Configs..."
scp docker-compose.yml "${VPS}:${DIR}/docker-compose.yml"
scp backend/Dockerfile "${VPS}:${DIR}/backend/Dockerfile"

Write-Host "🔄 Restarting..."
ssh $VPS "cd $DIR; docker-compose down; docker-compose up -d --build"

$VPS_IP = "72.62.66.151"
$USER = "root"
$SSH_DEST = "${USER}@${VPS_IP}"

Write-Host "1/3 🔧 Uploading Clean Nginx Config (Port 80)..." -ForegroundColor Cyan
scp flashrates.nginx "${SSH_DEST}:/etc/nginx/sites-available/flashrates"

Write-Host "2/3 🔧 Uploading Repair Script v2..." -ForegroundColor Cyan
scp remote_repair_v2.sh "${SSH_DEST}:/tmp/remote_repair_v2.sh"

Write-Host "3/3 🔄 Connecting to VPS to Execute Repair..." -ForegroundColor Cyan
Write-Host "⚠️  Please enter your VPS password when prompted!" -ForegroundColor Yellow

$CMD = "apt-get update >/dev/null && apt-get install -y dos2unix >/dev/null && dos2unix /tmp/remote_repair_v2.sh && chmod +x /tmp/remote_repair_v2.sh && bash /tmp/remote_repair_v2.sh"

ssh $SSH_DEST $CMD

Write-Host "🎉 Process Complete! Try putting https://liro.world in your browser." -ForegroundColor Green

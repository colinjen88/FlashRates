$VPS_IP = "72.62.66.151"
$USER = "root"
$SSH_DEST = "${USER}@${VPS_IP}"

Write-Host "🔧 Uploading Check..." -ForegroundColor Cyan
# Upload local config
scp goldlab.nginx "${SSH_DEST}:/etc/nginx/sites-available/goldlab"

Write-Host "🔧 Uploading Repair Script..." -ForegroundColor Cyan
scp remote_repair.sh "${SSH_DEST}:/tmp/remote_repair.sh"

Write-Host "🔄 Connecting to VPS to Execute Repair..." -ForegroundColor Cyan

# We force installation of dos2unix and fix the script line endings before running it
# This handles the Windows -> Linux whitespace creation issue
$CMD = "apt-get update && apt-get install -y dos2unix && dos2unix /tmp/remote_repair.sh && chmod +x /tmp/remote_repair.sh && bash /tmp/remote_repair.sh"

ssh $SSH_DEST $CMD

Write-Host "🎉 Fix Deployed! Please wait 10 seconds and try refreshing https://goldlab.cloud" -ForegroundColor Green

$VPS_IP = "72.62.66.151"
$USER = "root"
$SSH_DEST = "${USER}@${VPS_IP}"

Write-Host "Checking PM2 Logs for goldlab-cloud-backend..." -ForegroundColor Cyan
ssh $SSH_DEST "pm2 logs goldlab-cloud-backend --lines 100 --nostream"

Write-Host "Done." -ForegroundColor Green

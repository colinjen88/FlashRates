$VPS_IP = "72.62.66.151"
$USER = "root"
$SSH_DEST = "${USER}@${VPS_IP}"

Write-Host "Checking Backend Status..." -ForegroundColor Cyan
ssh $SSH_DEST "echo '=== PM2 Status ===' && pm2 list && echo '' && echo '=== PM2 Logs (last 50 lines) ===' && pm2 logs goldlab-cloud-backend --lines 50 --nostream"

Write-Host "Done." -ForegroundColor Green

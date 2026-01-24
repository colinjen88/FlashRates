$VPS_IP = "72.62.66.151"
$USER = "root"
$SSH_DEST = "${USER}@${VPS_IP}"

Write-Host "Starting Goldlab.cloud Backend..." -ForegroundColor Cyan
ssh $SSH_DEST "cd /var/www/goldlab-cloud && source venv/bin/activate && pm2 start ecosystem.config.js && pm2 save && pm2 list"

Write-Host "Done." -ForegroundColor Green

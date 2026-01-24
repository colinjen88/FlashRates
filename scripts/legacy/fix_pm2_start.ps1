$VPS_IP = "72.62.66.151"
$USER = "root"
$SSH_DEST = "${USER}@${VPS_IP}"

Write-Host "1/3 Uploading start script & config..." -ForegroundColor Cyan
scp start.sh "${SSH_DEST}:/var/www/goldlab-cloud/start.sh"
scp ecosystem.config.js "${SSH_DEST}:/var/www/goldlab-cloud/ecosystem.config.js"

Write-Host "2/3 Fixing permissions on VPS..." -ForegroundColor Cyan
ssh $SSH_DEST "dos2unix /var/www/goldlab-cloud/start.sh && chmod +x /var/www/goldlab-cloud/start.sh"

Write-Host "3/3 Restarting PM2..." -ForegroundColor Cyan
ssh $SSH_DEST "cd /var/www/goldlab-cloud && pm2 delete goldlab-cloud-backend 2>/dev/null; pm2 start ecosystem.config.js && pm2 save && sleep 2 && pm2 list && curl -s http://localhost:8001/api/health"

Write-Host "Done!" -ForegroundColor Green

$VPS_IP = "72.62.66.151"
$USER = "root"
$SSH_DEST = "${USER}@${VPS_IP}"

Write-Host "1/2 Uploading fixed ecosystem.config.js..." -ForegroundColor Cyan
scp ecosystem.config.js "${SSH_DEST}:/var/www/flashrates/ecosystem.config.js"

Write-Host "2/2 Restarting Backend..." -ForegroundColor Cyan
ssh $SSH_DEST "cd /var/www/flashrates && pm2 delete flashrates-backend 2>/dev/null; pm2 start ecosystem.config.js && pm2 save && sleep 3 && pm2 list && curl -s http://localhost:8001/api/health"

Write-Host "Done!" -ForegroundColor Green

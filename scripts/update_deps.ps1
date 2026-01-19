$VPS_IP = "72.62.66.151"
$USER = "root"
$SSH_DEST = "${USER}@${VPS_IP}"

Write-Host "1/2 Uploading updated requirements.txt..." -ForegroundColor Cyan
scp requirements.txt "${SSH_DEST}:/var/www/flashrates/requirements.txt"

Write-Host "2/2 Installing Dependencies & Restarting..." -ForegroundColor Cyan
ssh $SSH_DEST "cd /var/www/flashrates && source venv/bin/activate && pip install -r requirements.txt && pm2 restart flashrates-backend && sleep 2 && pm2 list && curl -s http://localhost:8001/api/health"

Write-Host "Done!" -ForegroundColor Green

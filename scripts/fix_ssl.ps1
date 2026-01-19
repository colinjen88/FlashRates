$VPS_IP = "72.62.66.151"
$USER = "root"
$SSH_DEST = "${USER}@${VPS_IP}"

Write-Host "1/2 Uploading Nginx Config with SSL..." -ForegroundColor Cyan
scp flashrates.nginx "${SSH_DEST}:/etc/nginx/sites-available/flashrates"

Write-Host "2/2 Applying Config on VPS..." -ForegroundColor Cyan
ssh $SSH_DEST "dos2unix /etc/nginx/sites-available/flashrates && ln -sf /etc/nginx/sites-available/flashrates /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx && echo Done"

Write-Host "SSL Fix Complete! Try https://liro.world now." -ForegroundColor Green

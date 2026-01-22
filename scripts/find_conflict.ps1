$VPS_IP = "72.62.66.151"
$USER = "root"
$SSH_DEST = "${USER}@${VPS_IP}"

Write-Host "Finding and fixing conflicting configs..." -ForegroundColor Cyan
ssh $SSH_DEST "echo '=== All sites-enabled ===' && ls -la /etc/nginx/sites-enabled/ && echo '' && echo '=== Grep goldlab.cloud in all configs ===' && grep -r 'goldlab.cloud' /etc/nginx/sites-enabled/ /etc/nginx/sites-available/ 2>/dev/null"

Write-Host "Done." -ForegroundColor Green

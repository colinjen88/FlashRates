$VPS_IP = "72.62.66.151"
$USER = "root"
$SSH_DEST = "${USER}@${VPS_IP}"

Write-Host "1/2 Uploading setup script..." -ForegroundColor Cyan
scp remote_setup.sh "${SSH_DEST}:/tmp/remote_setup.sh"

Write-Host "2/2 Running setup on VPS..." -ForegroundColor Cyan
ssh $SSH_DEST "dos2unix /tmp/remote_setup.sh && chmod +x /tmp/remote_setup.sh && bash /tmp/remote_setup.sh"

Write-Host "Setup Complete!" -ForegroundColor Green

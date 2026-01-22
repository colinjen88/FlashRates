# Fix Nginx Configuration Script

$VPS_IP = "72.62.66.151"
$USER = "root"

# Construct connection strings using ${} to avoid PowerShell parsing errors with colons
$SCP_DEST = "${USER}@${VPS_IP}:/etc/nginx/sites-available/goldlab"
$SSH_DEST = "${USER}@${VPS_IP}"

$NGINX_CONF_LOCAL = Join-Path $PSScriptRoot "..\goldlab.nginx"

Write-Host "🔧 Uploading Correct Nginx Config..." -ForegroundColor Cyan
scp "$NGINX_CONF_LOCAL" "$SCP_DEST"

Write-Host "🔄 Applying Configuration..." -ForegroundColor Cyan
$CMD = @'
# Link config
ln -sf /etc/nginx/sites-available/goldlab /etc/nginx/sites-enabled/

# Remove default if it conflicts (optional, relying on server_name)
# rm /etc/nginx/sites-enabled/default

# Test and Reload
nginx -t && systemctl reload nginx
echo "✅ Nginx Reloaded Successfully"
'@

ssh "$SSH_DEST" $CMD

Write-Host "🎉 Fix Complete! Please refresh https://goldlab.cloud" -ForegroundColor Green

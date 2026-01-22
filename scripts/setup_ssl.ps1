# SSL Setup Script for Goldlab.cloud

$VPS_IP = "72.62.66.151"
$USER = "root"
$SSH_DEST = "${USER}@${VPS_IP}"

Write-Host "🔧 Installing Certbot and Setting up SSL..." -ForegroundColor Cyan

$SCRIPT = @"
# Update package list properly
apt-get update

# Install Certbot and Nginx plugin
apt-get install -y certbot python3-certbot-nginx dos2unix

# Ensure Nginx config is clean first (fix line endings just in case)
dos2unix /etc/nginx/sites-available/goldlab
dos2unix /etc/nginx/nginx.conf

# Reload Nginx to make sure it picks up the goldlab site
systemctl reload nginx

# Obtain SSL Certificate (Non-interactive mode)
# Using --nginx plugin which automatically edits the Nginx config
certbot --nginx -d goldlab.cloud -d www.goldlab.cloud --non-interactive --agree-tos -m admin@goldlab.cloud --redirect

# Reload Nginx again to apply SSL settings
systemctl reload nginx

echo "✅ SSL Setup Complete!"
"@

ssh $SSH_DEST $SCRIPT

Write-Host "🎉 HTTPS Enabled! Visit https://goldlab.cloud" -ForegroundColor Green

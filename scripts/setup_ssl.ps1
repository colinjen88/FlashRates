# SSL Setup Script for FlashRates

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
dos2unix /etc/nginx/sites-available/flashrates
dos2unix /etc/nginx/nginx.conf

# Reload Nginx to make sure it picks up the flashrates site
systemctl reload nginx

# Obtain SSL Certificate (Non-interactive mode)
# Using --nginx plugin which automatically edits the Nginx config
certbot --nginx -d liro.world -d www.liro.world --non-interactive --agree-tos -m admin@liro.world --redirect

# Reload Nginx again to apply SSL settings
systemctl reload nginx

echo "✅ SSL Setup Complete!"
"@

ssh $SSH_DEST $SCRIPT

Write-Host "🎉 HTTPS Enabled! Visit https://liro.world" -ForegroundColor Green

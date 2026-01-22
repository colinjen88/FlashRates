#!/bin/bash
set -e

echo '--- Step 1: Fix Backend ---'
mkdir -p /var/www/flashrates
cd /var/www/flashrates

# Ensure permissions
if [ -f "backend/main.py" ]; then
    chmod +x backend/main.py
fi

# Fix potential Nginx config line endings first (in case it was uploaded with CRLF)
if [ -f "/etc/nginx/sites-available/goldlab" ]; then
    dos2unix /etc/nginx/sites-available/goldlab
fi

# Install/Update PM2 global if needed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Clean potentially bad PM2 state
pm2 delete flashrates-backend || true

# Start with explicit python interpreter from venv
# Ensure venv exists
if [ -d "venv" ]; then
    echo "Starting backend with venv python..."
    pm2 start ecosystem.config.js --interpreter ./venv/bin/python3
else
    echo "Warning: venv not found, trying default python3..."
    pm2 start ecosystem.config.js --interpreter python3
fi
pm2 save

echo '--- Step 2: Fix Nginx & SSL ---'
# Link config
ln -sf /etc/nginx/sites-available/goldlab /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Check config syntax
echo "Checking Nginx config..."
nginx -t

# Reload first to serve HTTP
systemctl reload nginx

# Re-run Certbot
echo "Running Certbot..."
# Ensure certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing Certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-nginx
fi

# Using --reinstall to force a clean slate if needed
certbot --nginx -d goldlab.cloud -d www.goldlab.cloud --non-interactive --agree-tos -m admin@goldlab.cloud --redirect

echo '--- Step 3: Final Restart ---'
systemctl restart nginx

echo "✅ Repair Complete!"

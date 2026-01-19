#!/bin/bash
set -e

# Define logging
LOG_FILE="/tmp/repair_log.txt"
exec > >(tee -a $LOG_FILE) 2>&1

echo "=========================================="
echo "Starting Repair Script: $(date)"
echo "=========================================="

# 1. Cleaning up Nginx Configuration
echo "--- Step 1: Clean Nginx Configs ---"

# Remove default site if it exists
if [ -L "/etc/nginx/sites-enabled/default" ] || [ -f "/etc/nginx/sites-enabled/default" ]; then
    echo "removing default site..."
    rm -f /etc/nginx/sites-enabled/default
else
    echo "default site not found."
fi

# Ensure flashrates config is fresh
# (Assuming flashrates.nginx was uploaded to /etc/nginx/sites-available/flashrates by the PS1 script)
# We make sure it is linked
ln -sf /etc/nginx/sites-available/flashrates /etc/nginx/sites-enabled/

# Test Nginx Config
echo "Testing Nginx config..."
nginx -t

# Reload Nginx to ensure we are only serving on Port 80 for now
echo "Reloading Nginx..."
systemctl reload nginx

# 2. SSL Certificate Setup
echo "--- Step 2: Setup SSL with Certbot ---"

# Check if certs already exist
if [ -d "/etc/letsencrypt/live/liro.world" ]; then
    echo "Existing certificates found. Checking validity..."
    certbot certificates
else
    echo "No certificates found for liro.world."
fi

# Run Certbot to install/reinstall
# We use --nginx plugin. --force-renewal can be used if we suspect broken certs, but let's stick to --reinstall
echo "Requesting Certificate..."
certbot --nginx -d liro.world -d www.liro.world --non-interactive --agree-tos -m admin@liro.world --redirect

# 3. Final Verification
echo "--- Step 3: Final Verification ---"
echo "Checking active nginx sites:"
ls -l /etc/nginx/sites-enabled/

echo "Testing Nginx config again..."
nginx -t

echo "Reloading Nginx one last time..."
systemctl restart nginx

echo "✅ Repair Script Finished Successfully!"

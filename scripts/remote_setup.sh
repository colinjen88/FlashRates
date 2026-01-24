#!/bin/bash
set -e

DEPLOY_DIR="/var/www/goldlab-cloud"

echo "=== Installing python3-venv ==="
apt-get update
apt-get install -y python3.12-venv

echo ""
echo "=== Creating Python venv ==="
cd $DEPLOY_DIR
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

echo ""
echo "=== Starting Backend with PM2 ==="
pm2 delete goldlab-cloud-backend 2>/dev/null || true
pm2 start ecosystem.config.js --interpreter ./venv/bin/python3
pm2 save
pm2 list

echo ""
echo "=== Testing API ==="
sleep 3
curl -s http://localhost:8001/api/health || echo "API not responding yet"

echo ""
echo "Done!"

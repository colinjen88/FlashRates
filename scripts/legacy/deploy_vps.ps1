# Deploy Script for FlashRates to VPS

$VPS_IP = "72.62.66.151"
$USER = "root"
$REMOTE_DIR = "/var/www/flashrates"

# Fix variables for SSH commands
$SSH_DEST = "${USER}@${VPS_IP}"
$MKDIR_CMD = "mkdir -p ${REMOTE_DIR}"

Write-Host "🚧 Building Frontend..." -ForegroundColor Cyan
cd frontend
npm run build
cd ..

Write-Host "📦 Preparing Deployment..." -ForegroundColor Cyan
# Create remote directory first
Write-Host "Creating remote directory..."
ssh $SSH_DEST $MKDIR_CMD

Write-Host "🚀 Uploading Files..." -ForegroundColor Cyan
# Upload Backend code
Write-Host "Uploading backend..."
scp -r backend "${SSH_DEST}:${REMOTE_DIR}/"

# Upload Frontend build
Write-Host "Uploading frontend build..."
scp -r frontend/dist "${SSH_DEST}:${REMOTE_DIR}/frontend_dist"

# Upload Configs
Write-Host "Uploading configs..."
scp requirements.txt "${SSH_DEST}:${REMOTE_DIR}/"
scp ecosystem.config.js "${SSH_DEST}:${REMOTE_DIR}/"

# Upload Nginx site config (Goldlab)
$NGINX_CONF_LOCAL = Join-Path $PSScriptRoot "..\goldlab.nginx"
Write-Host "Uploading nginx site config (goldlab)..."
scp "$NGINX_CONF_LOCAL" "${SSH_DEST}:/etc/nginx/sites-available/goldlab"

Write-Host "🔧 Configuring Remote Server..." -ForegroundColor Cyan
$SCRIPT = @"
# Update System & Install Dependencies
apt-get update
# Suppress interactive prompts
DEBIAN_FRONTEND=noninteractive apt-get install -y python3-pip python3-venv nginx dos2unix

# Setup Python Environment
cd $REMOTE_DIR
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt

# Install PM2 if not exists
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Start/Restart Backend with PM2
pm2 start ecosystem.config.js --interpreter ./venv/bin/python3
pm2 save

# Fix Nginx Config formatting
dos2unix /etc/nginx/sites-available/goldlab

# Enable Site & Restart Nginx
ln -sf /etc/nginx/sites-available/goldlab /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo "✅ Deployment Complete!"
"@

# Execute remote setup script
ssh $SSH_DEST $SCRIPT

Write-Host "🎉 Done! Visit https://goldlab.cloud" -ForegroundColor Green

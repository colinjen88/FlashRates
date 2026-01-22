$VPS_IP = "72.62.66.151"
$USER = "root"
$SSH_DEST = "${USER}@${VPS_IP}"

Write-Host "🔍 Diagnosing SSL Issue on VPS..." -ForegroundColor Cyan

$CMD = @"
echo '=== 1. Current Nginx Sites Enabled ==='
ls -la /etc/nginx/sites-enabled/

echo ''
echo '=== 2. Nginx Config for goldlab ==='
cat /etc/nginx/sites-available/goldlab

echo ''
echo '=== 3. SSL Certificates for goldlab.cloud ==='
ls -la /etc/letsencrypt/live/ 2>/dev/null || echo 'No certificates directory found'

echo ''
echo '=== 4. Certbot Certificates Status ==='
certbot certificates 2>/dev/null || echo 'Certbot not available or no certs'

echo ''
echo '=== 5. Last 30 lines of Certbot Log ==='
tail -30 /var/log/letsencrypt/letsencrypt.log 2>/dev/null || echo 'No certbot log found'

echo ''
echo '=== 6. What certificate is Nginx actually using? ==='
grep -r ssl_certificate /etc/nginx/sites-enabled/ 2>/dev/null || echo 'No SSL config found in sites-enabled'
grep -r ssl_certificate /etc/nginx/conf.d/ 2>/dev/null || echo 'No SSL config found in conf.d'

echo ''
echo '=== 7. Test HTTPS connection locally ==='
curl -vI --insecure https://localhost 2>&1 | head -30
"@

ssh $SSH_DEST $CMD

Write-Host "🔍 Diagnosis Complete." -ForegroundColor Green

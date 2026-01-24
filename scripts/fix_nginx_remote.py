
import paramiko
import sys
import time

HOST = "72.62.66.151"
USER = "root"
PASS = "@Qqww12121212"

NGINX_CONF = """server {
    listen 80;
    server_name goldlab.cloud www.goldlab.cloud;

    access_log /var/log/nginx/goldlab.access.log;
    error_log /var/log/nginx/goldlab.error.log;

    location / {
        proxy_pass http://127.0.0.1:7000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
"""

def main():
    print(f"Connecting to {HOST}...")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOST, username=USER, password=PASS)
        
        # 1. Overwrite Nginx Config
        print("Writing Nginx Config...")
        cmd = f"echo '{NGINX_CONF}' > /etc/nginx/sites-available/goldlab.cloud.conf"
        stdin, stdout, stderr = ssh.exec_command(cmd)
        if stderr.read():
            print("Error writing config")

        # 2. Link if not exists
        print("Linking Config...")
        ssh.exec_command("ln -sf /etc/nginx/sites-available/goldlab.cloud.conf /etc/nginx/sites-enabled/goldlab.cloud.conf")

        # 3. Test and Reload
        print("Testing Nginx Config...")
        _, stdout, stderr = ssh.exec_command("nginx -t")
        err = stderr.read().decode()
        print(err)
        
        if "successful" in err or "syntax is ok" in err:
            print("Reloading Nginx...")
            ssh.exec_command("systemctl reload nginx")
            print("Done!")
        else:
            print("Config test failed, not reloading.")

        ssh.close()
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

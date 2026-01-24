
import paramiko
import sys

HOST = "72.62.66.151"
USER = "root"
PASS = "@Qqww12121212"

def main():
    print(f"Connecting to {HOST}...")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOST, username=USER, password=PASS)
        
        print("--- Checking System Nginx Error Logs ---")
        # Check last 30 lines of error log to see why upstream (7000) might be failing
        _, stdout, _ = ssh.exec_command("tail -n 30 /var/log/nginx/error.log")
        print(stdout.read().decode())
        
        print("--- Checking Access Logs for goldlab.cloud ---")
        # Check access logs to see the HTTP status code Nginx thinks it's sending
        _, stdout, _ = ssh.exec_command("tail -n 20 /var/log/nginx/access.log")
        print(stdout.read().decode())
        
        print("--- Verifying goldlab.cloud.conf ---")
        _, stdout, _ = ssh.exec_command("cat /etc/nginx/sites-enabled/goldlab.cloud.conf")
        print(stdout.read().decode())

        ssh.close()
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

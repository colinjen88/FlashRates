
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
        
        # 1. Check if port 7000 is listening
        print("--- Checking Port 7000 ---")
        _, stdout, _ = ssh.exec_command("netstat -tulpn | grep 7000")
        print(stdout.read().decode())

        # 2. Check if container is running
        print("--- Checking Container Status ---")
        _, stdout, _ = ssh.exec_command("docker ps | grep frontend")
        print(stdout.read().decode())
        
        # 3. Test Curl locally
        print("--- Testing Curl Localhost:7000 ---")
        _, stdout, stderr = ssh.exec_command("curl -v http://localhost:7000")
        print(stdout.read().decode())
        print(stderr.read().decode())

        # 4. Check Docker Logs
        print("--- Frontend Logs ---")
        _, stdout, _ = ssh.exec_command("docker logs goldlab-cloud-frontend --tail 20")
        print(stdout.read().decode())
        
        ssh.close()
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

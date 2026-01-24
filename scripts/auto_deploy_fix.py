
import paramiko
import os
import sys

# Configuration
HOST = "72.62.66.151"
USER = "root"
PASS = "@Qqww12121212"
REMOTE_DIR = "/home/docker-server/projects/flash-rates"

def create_remote_dir(sftp, remote_path):
    """Recursively create remote directory."""
    dirs = remote_path.split('/')
    path = ""
    for directory in dirs:
        if not directory: continue
        path += "/" + directory
        try:
            sftp.stat(path)
        except IOError:
            sftp.mkdir(path)

def upload_dir(sftp, local_dir, remote_dir):
    """Upload directory recursively."""
    if not os.path.exists(local_dir):
        print(f"Skipping {local_dir} (not found)")
        return

    create_remote_dir(sftp, remote_dir)
    
    for root, dirs, files in os.walk(local_dir):
        # Filter out __pycache__
        if '__pycache__' in dirs:
            dirs.remove('__pycache__')
            
        rel_path = os.path.relpath(root, local_dir)
        remote_path = os.path.join(remote_dir, rel_path).replace("\\", "/")
        
        try:
            sftp.stat(remote_path)
        except IOError:
            create_remote_dir(sftp, remote_path)
            
        for file in files:
            local_file = os.path.join(root, file)
            remote_file = os.path.join(remote_path, file).replace("\\", "/")
            print(f"Uploading {local_file} -> {remote_file}")
            sftp.put(local_file, remote_file)

def main():
    print(f"Connecting to {HOST}...")
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOST, username=USER, password=PASS)
        sftp = ssh.open_sftp()
        
        print("Creating remote directories...")
        create_remote_dir(sftp, REMOTE_DIR)
        
        # 1. Upload Backend
        print("Uploading Backend...")
        upload_dir(sftp, "backend", f"{REMOTE_DIR}/backend")
        
        # 2. Upload Frontend Dist
        print("Uploading Frontend/dist...")
        upload_dir(sftp, "frontend/dist", f"{REMOTE_DIR}/frontend/dist")
        
        # 3. Upload Docker
        print("Uploading Docker Configs...")
        upload_dir(sftp, "docker", f"{REMOTE_DIR}/docker")
        
        # 4. Upload docker-compose.yml
        print("Uploading docker-compose.yml...")
        sftp.put("docker-compose.yml", f"{REMOTE_DIR}/docker-compose.yml")

        # 5. Check and create .env if missing
        try:
            sftp.stat(f"{REMOTE_DIR}/.env")
            print(".env exists, skipping.")
        except IOError:
            print("Creating default .env...")
            with sftp.file(f"{REMOTE_DIR}/.env", "w") as f:
                f.write("REDIS_HOST=redis\n")
                f.write("API_KEYS=gl_demo\n")
                f.write("APP_NAME=Goldlab.cloud Aggregator\n")

        sftp.close()
        
        # 6. Execute Docker Commands
        print("Restarting Services on VPS...")
        commands = [
            f"cd {REMOTE_DIR}",
            "docker-compose down",
            "docker-compose up -d --build",
            "docker-compose ps"
        ]
        
        command_str = " && ".join(commands)
        stdin, stdout, stderr = ssh.exec_command(command_str)
        
        print("--- Output ---")
        print(stdout.read().decode())
        print("--- Errors ---")
        print(stderr.read().decode())
        
        ssh.close()
        print("Deployment Complete!")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

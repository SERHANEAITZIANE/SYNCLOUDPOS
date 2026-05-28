import subprocess
import time
import urllib.request
import paramiko
import os
import sys

build_id = "6233a8fb-5b02-4c74-80b5-40abec1788e7"
vps_host = '155.133.26.217'
vps_port = 22
vps_user = 'root'
vps_pass = 'pkn567ftXW3L'
local_apk_path = 'syncloudpos-gerant-v1.1.0.apk'
remote_apk_path = '/var/www/syncloudpos/public/downloads/syncloudpos-gerant-v1.1.0.apk'

print(f"Monitoring EAS build {build_id}...")

status = "new"
apk_url = None

for attempt in range(120): # Up to 60 minutes (30s * 120)
    try:
        # Run eas-cli build:view
        res = subprocess.run(
            ["npx", "eas-cli", "build:view", build_id],
            capture_output=True,
            text=True,
            shell=True,
            cwd="syncloud-gerant"
        )
        output = res.stdout
        
        # Parse status and APK URL
        lines = output.split('\n')
        current_status = None
        current_apk = None
        for line in lines:
            if "Status" in line:
                parts = line.split()
                if len(parts) >= 2:
                    current_status = parts[-1].strip()
            if "Application Archive URL" in line:
                parts = line.split()
                for part in parts:
                    if part.startswith("https://"):
                        current_apk = part.strip()
        
        if current_status:
            status = current_status
            
        print(f"[Attempt {attempt+1}] Status: {status}")
        
        if status == "finished" and current_apk:
            apk_url = current_apk
            print(f"EAS build finished! APK URL: {apk_url}")
            break
        elif status == "failed":
            print("EAS build failed!")
            sys.exit(1)
            
    except Exception as e:
        print(f"Error checking build status: {e}")
        
    time.sleep(30)

if not apk_url:
    print("Build did not complete in time or APK URL was not found.")
    sys.exit(1)

# Step 2: Download the APK
print(f"Downloading APK from {apk_url}...")
try:
    req = urllib.request.Request(
        apk_url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    )
    with urllib.request.urlopen(req) as response, open(local_apk_path, 'wb') as out_file:
        out_file.write(response.read())
    file_size = os.path.getsize(local_apk_path)
    print(f"Downloaded successfully! Size: {file_size / (1024*1024):.2f} MB")
except Exception as e:
    print(f"Download failed: {e}")
    sys.exit(1)

# Step 3: SFTP Upload to VPS
print(f"Connecting to VPS {vps_host} to upload APK...")
try:
    transport = paramiko.Transport((vps_host, vps_port))
    transport.connect(username=vps_user, password=vps_pass)
    sftp = paramiko.SFTPClient.from_transport(transport)
    
    # Ensure the downloads directory exists
    downloads_dir = os.path.dirname(remote_apk_path)
    try:
        sftp.mkdir(downloads_dir)
        print(f"Created remote folder {downloads_dir}")
    except IOError:
        # Directory already exists
        pass
        
    print(f"Uploading {local_apk_path} to {remote_apk_path}...")
    sftp.put(local_apk_path, remote_apk_path)
    print("Upload completed successfully!")
    
    # Check permissions and set readable
    sftp.chmod(remote_apk_path, 0o644)
    
    sftp.close()
    transport.close()
except Exception as e:
    print(f"SFTP Upload failed: {e}")
    sys.exit(1)

print("Process completed successfully! The updated APK v1.1.0 is now hosted and serving on the VPS!")

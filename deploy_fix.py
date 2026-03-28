import paramiko
import sys
import os

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

# Files to upload
local_base = r'c:\Users\tre\Documents\SYNCLOUDPOS'
remote_base = '/var/www/syncloudpos'

files_to_upload = [
    ('src/components/products/client.tsx', 'src/components/products/client.tsx'),
    ('src/actions/products.ts', 'src/actions/products.ts'),
]

commands = [
    f"cd {remote_base} && npx next build",
    f"cd {remote_base} && pm2 restart syncloudpos",
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)
    
    sftp = client.open_sftp()
    
    for local_rel, remote_rel in files_to_upload:
        local_path = os.path.join(local_base, local_rel)
        remote_path = f"{remote_base}/{remote_rel}"
        print(f"Uploading {local_rel}...")
        sftp.put(local_path, remote_path)
        print(f"  -> {remote_path}")
    
    sftp.close()
    print("All files uploaded.")
    
    for cmd in commands:
        print(f"\n--- Running: {cmd.split('&&')[-1].strip()} ---")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
        exit_status = stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if out: print("OUT:", out[-500:])
        if err: print("ERR:", err[-500:])
        if exit_status != 0:
            print(f"WARNING: Command exited with status {exit_status}")
    
    client.close()
    print("\nDeploy complete.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

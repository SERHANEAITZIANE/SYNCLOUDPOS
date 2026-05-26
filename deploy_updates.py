import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

print("Connecting to VPS...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port, username, password)

print("Uploading modified files...")
sftp = client.open_sftp()
files_to_upload = [
    ('src/app/globals.css', '/var/www/syncloudpos/src/app/globals.css'),
    ('src/app/api/mobile/admin/drivers/route.ts', '/var/www/syncloudpos/src/app/api/mobile/admin/drivers/route.ts'),
    ('src/app/api/mobile/admin/drivers/[driverId]/route.ts', '/var/www/syncloudpos/src/app/api/mobile/admin/drivers/[driverId]/route.ts'),
    ('messages/fr.json', '/var/www/syncloudpos/messages/fr.json'),
    ('messages/en.json', '/var/www/syncloudpos/messages/en.json'),
    ('messages/ar.json', '/var/www/syncloudpos/messages/ar.json'),
]

for local_path, remote_path in files_to_upload:
    try:
        sftp.put(local_path, remote_path)
        print(f"Uploaded {local_path} successfully.")
    except Exception as e:
        print(f"SFTP Error on {local_path}: {e}")
sftp.close()

def run_cmd(cmd):
    print(f"\n--- Running: {cmd} ---\n")
    stdin, stdout, stderr = client.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(f"STDOUT:\n{out}")
    if err: print(f"STDERR:\n{err}")
    print(f"Exit code: {exit_status}\n")
    if exit_status != 0:
        print("COMMAND FAILED!")
        sys.exit(1)

print("\n--- Building Next.js App ---")
run_cmd("cd /var/www/syncloudpos && npm run build")

print("\n--- Restarting PM2 ---")
run_cmd("pm2 restart syncloudpos")

print("Deployment complete!")
client.close()

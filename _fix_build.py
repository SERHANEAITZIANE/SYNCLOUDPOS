import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port, username, password)

def run(cmd):
    print(f"\n--- {cmd} ---")
    stdin, stdout, stderr = client.exec_command(cmd)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(out[-4000:])
    if err: print("ERR:", err[-3000:])
    return exit_status

print("\n=== STEP 0: Upload missing files ===")
sftp = client.open_sftp()
local_path = 'src/app/[locale]/(dashboard)/treasury/components/reconciliation-modal.tsx'
remote_path = '/var/www/syncloudpos/' + local_path
try:
    sftp.put(local_path, remote_path)
    print("Uploaded reconciliation-modal.tsx")
except Exception as e:
    print(e)
sftp.close()

print("\n=== STEP 1: Stop PM2 and Kill any next build ===")
run("pm2 stop syncloudpos")
run("pkill -f 'next build' || true")
run("rm -f /var/www/syncloudpos/.next/lock")

print("\n=== STEP 2: Rebuild ===")
run("cd /var/www/syncloudpos && NODE_OPTIONS='--max-old-space-size=1024' npx next build 2>&1 | tail -40")

print("\n=== STEP 3: Restart ===")
run("pm2 restart syncloudpos")

client.close()
print("Done!")

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

def run(cmd, timeout=600):
    print(f"\n--- {cmd} ---")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(out[-4000:])
    if err: print("ERR:", err[-3000:])
    print(f"Exit: {exit_status}")
    return out, err, exit_status

print("\n=== STEP 1: Upload files ===")
sftp = client.open_sftp()

files = [
    ('src/app/[locale]/(dashboard)/hub/components/hub-client.tsx', '/var/www/syncloudpos/src/app/[locale]/(dashboard)/hub/components/hub-client.tsx'),
    ('src/app/[locale]/(dashboard)/hub/page.tsx', '/var/www/syncloudpos/src/app/[locale]/(dashboard)/hub/page.tsx'),
    ('src/components/dashboard/header.tsx', '/var/www/syncloudpos/src/components/dashboard/header.tsx'),
]

for local, remote in files:
    try:
        sftp.put(local, remote)
        print(f"  Uploaded {local}")
    except Exception as e:
        print(f"  Failed to upload {local}: {e}")

sftp.close()
print("All files uploaded!")

print("\n=== STEP 2: Stop & clean ===")
run("pm2 stop syncloudpos")
run("rm -rf /var/www/syncloudpos/.next")

print("\n=== STEP 3: Rebuild ===")
out, err, status = run("cd /var/www/syncloudpos && NODE_OPTIONS='--max-old-space-size=1024' npx next build 2>&1 | tail -40", timeout=600)

if "Build error" in out or status != 0:
    print("\n!!! BUILD FAILED !!!")
    run("cd /var/www/syncloudpos && NODE_OPTIONS='--max-old-space-size=1024' npx next build 2>&1 | grep -A5 'Error'")
else:
    print("\n=== BUILD OK ===")

print("\n=== STEP 4: Restart ===")
run("pm2 restart syncloudpos")
run("sleep 5 && pm2 status")

client.close()
print("\nDone! Hub redesign deployed.")

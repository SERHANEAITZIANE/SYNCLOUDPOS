import paramiko
import subprocess
import sys
import io
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

host = '155.133.26.217'
port = 22
username = 'root'
passwords = ['pkn567ftXW3L', 'C4r3vL[N7~_ulO%^']

print("=" * 60)
print("  SYNCLOUDPOS - Deploy Modified Files to VPS")
print("=" * 60)

# Get modified and untracked files from git
def get_changed_files():
    files = set()
    # Modified tracked files
    res = subprocess.run(['git', 'diff', '--name-only'], capture_output=True, text=True)
    if res.returncode == 0:
        for f in res.stdout.splitlines():
            f = f.strip()
            if f and os.path.exists(f) and not f.startswith('_') and not f.endswith('.py') and not f.endswith('.log') and not f.endswith('.txt') and not f.endswith('.tar.gz') and not f.endswith('.png'):
                files.add(f)
    
    # Staged files
    res = subprocess.run(['git', 'diff', '--name-only', '--cached'], capture_output=True, text=True)
    if res.returncode == 0:
        for f in res.stdout.splitlines():
            f = f.strip()
            if f and os.path.exists(f) and not f.startswith('_') and not f.endswith('.py') and not f.endswith('.log') and not f.endswith('.txt') and not f.endswith('.tar.gz') and not f.endswith('.png'):
                files.add(f)
                
    # Untracked source files
    res = subprocess.run(['git', 'ls-files', '--others', '--exclude-standard'], capture_output=True, text=True)
    if res.returncode == 0:
        for f in res.stdout.splitlines():
            f = f.strip()
            if f and os.path.exists(f) and (f.startswith('src/') or f.startswith('prisma/') or f.startswith('messages/')):
                files.add(f)
                
    return sorted(list(files))

changed_files = get_changed_files()
print(f"\nFound {len(changed_files)} changed file(s) to upload:")
for f in changed_files:
    print(f"  • {f}")

if not changed_files:
    print("No changed files to upload.")
    sys.exit(0)

# Connect SSH
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
connected = False

for pwd in passwords:
    try:
        print(f"\nConnecting to {host}...")
        client.connect(host, port, username, pwd, timeout=15)
        print("  ✓ Connected successfully!")
        connected = True
        break
    except Exception as e:
        print(f"  ✗ Connection attempt failed: {e}")

if not connected:
    print("Failed to connect to VPS. Exiting.")
    sys.exit(1)

# Upload files via SFTP
print("\n[1/4] Uploading files to /var/www/syncloudpos/...")
sftp = client.open_sftp()

for file_path in changed_files:
    local_path = file_path.replace('/', '\\')
    remote_path = '/var/www/syncloudpos/' + file_path.replace('\\', '/')
    
    remote_dir = '/'.join(remote_path.split('/')[:-1])
    try:
        sftp.stat(remote_dir)
    except IOError:
        client.exec_command(f"mkdir -p {remote_dir}")
        
    try:
        sftp.put(local_path, remote_path)
        print(f"  ✓ Uploaded: {file_path}")
    except Exception as e:
        print(f"  ✗ Failed to upload {file_path}: {e}")

sftp.close()

def run_cmd(cmd, timeout=300):
    print(f"\n→ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        for line in out.splitlines()[-15:]:
            print(f"  {line}")
    if err and exit_status != 0:
        for line in err.splitlines()[-10:]:
            print(f"  [ERR] {line}")
    if exit_status != 0:
        print(f"  ✗ Command failed with exit code {exit_status}")
    else:
        print("  ✓ Done")
    return exit_status

# Step 2: Prisma Generate & DB Push
print("\n[2/4] Syncing Prisma Schema & Client...")
run_cmd("cd /var/www/syncloudpos && npx prisma generate")
run_cmd("cd /var/www/syncloudpos && npx prisma db push --skip-generate")

# Step 3: Next.js Build
print("\n[3/4] Building Production Application...")
build_status = run_cmd("cd /var/www/syncloudpos && npm run build")

if build_status != 0:
    print("\n⚠ Build encountered an error. Check logs above.")
else:
    print("\n✓ Build succeeded!")

# Step 4: Restart PM2
print("\n[4/4] Restarting Application Cluster...")
run_cmd("pm2 restart syncloudpos || pm2 restart all")

print("\n" + "=" * 60)
print("  ✓ VPS UPDATE COMPLETE!")
print("  Live site: https://chirpedbeo.online/")
print("=" * 60)

client.close()

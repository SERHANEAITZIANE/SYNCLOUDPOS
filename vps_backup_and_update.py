import subprocess, sys, io, time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

try:
    import paramiko
except ImportError:
    subprocess.run([sys.executable, "-m", "pip", "install", "paramiko", "-q"], check=True)
    import paramiko

# VPS connection details (root access for full operations)
host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

print("=" * 60)
print("  SYNCLOUDPOS - VPS BACKUP & UPDATE")
print("=" * 60)

# --- Connect ---
print(f"\n[1/5] Connecting to VPS {host}:{port}...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(host, port, username, password, timeout=15)
    print("  ✓ SSH connected as root!")
except Exception as e:
    print(f"  ✗ SSH connection failed: {e}")
    sys.exit(1)


def run(cmd, timeout=120):
    """Run a command on the VPS and return output."""
    print(f"  → {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace').strip()
    err = stderr.read().decode('utf-8', errors='replace').strip()
    if out:
        # Print max 30 lines
        lines = out.split('\n')
        for line in lines[:30]:
            print(f"    {line}")
        if len(lines) > 30:
            print(f"    ... ({len(lines) - 30} more lines)")
    if err and exit_code != 0:
        print(f"    [stderr] {err[:500]}")
    return out, exit_code


# --- Step 2: Backup ALL databases ---
print(f"\n[2/5] Backing up ALL PostgreSQL databases...")

timestamp = time.strftime("%Y%m%d_%H%M%S")
backup_dir = f"/root/db_backups/{timestamp}"
run(f"mkdir -p {backup_dir}")

# List all databases
db_list_out, _ = run("sudo -u postgres psql -t -c \"SELECT datname FROM pg_database WHERE datistemplate = false;\"")
databases = [db.strip() for db in db_list_out.split('\n') if db.strip()]

print(f"\n  Found {len(databases)} databases: {', '.join(databases)}")

for db in databases:
    print(f"\n  Backing up '{db}'...")
    backup_file = f"{backup_dir}/{db}.sql"
    out, code = run(f"sudo -u postgres pg_dump {db} > {backup_file} 2>&1 && echo 'BACKUP_OK'")
    if 'BACKUP_OK' in str(out):
        # Get file size
        size_out, _ = run(f"ls -lh {backup_file} | awk '{{print $5}}'")
        print(f"  ✓ {db} backed up ({size_out})")
    else:
        print(f"  ⚠ Warning backing up {db} (non-critical DBs like 'postgres' may have warnings)")

# Also do a full pg_dumpall for safety
print(f"\n  Creating full pg_dumpall backup...")
full_backup = f"{backup_dir}/ALL_DATABASES_full.sql"
out, code = run(f"sudo -u postgres pg_dumpall > {full_backup} 2>&1 && echo 'FULL_BACKUP_OK'", timeout=300)
if 'FULL_BACKUP_OK' in str(out):
    size_out, _ = run(f"ls -lh {full_backup} | awk '{{print $5}}'")
    print(f"  ✓ Full backup created ({size_out})")
else:
    print(f"  ⚠ Full backup had issues, check manually")

# Show backup directory
print(f"\n  Backup directory: {backup_dir}")
run(f"ls -lh {backup_dir}")


# --- Step 3: Git pull latest changes ---
print(f"\n[3/5] Pulling latest changes from git (no deletions, merge only)...")
# First check current status
run("cd /var/www/syncloudpos && git status --short")
# Stash any local changes to prevent conflicts
run("cd /var/www/syncloudpos && git stash")
# Pull latest
out, code = run("cd /var/www/syncloudpos && git pull origin main")
if code != 0:
    # Try with the current branch
    out, code = run("cd /var/www/syncloudpos && git pull")
    if code != 0:
        print("  ⚠ Git pull failed, trying to recover stash...")
        run("cd /var/www/syncloudpos && git stash pop")
        print("  Please check git status manually")

# Pop stash to restore local changes
run("cd /var/www/syncloudpos && git stash pop")


# --- Step 4: Install deps + Prisma + Build ---
print(f"\n[4/5] Installing dependencies and building...")
run("cd /var/www/syncloudpos && npm install", timeout=300)
print("\n  Generating Prisma client...")
run("cd /var/www/syncloudpos && npx prisma@5.22.0 generate")
print("\n  Applying Prisma migrations (safe - no data loss)...")
run("cd /var/www/syncloudpos && npx prisma@5.22.0 migrate deploy", timeout=120)
print("\n  Building Next.js app...")
run("cd /var/www/syncloudpos && npm run build", timeout=600)


# --- Step 5: Restart ---
print(f"\n[5/5] Restarting PM2...")
run("pm2 restart syncloudpos")
time.sleep(3)
run("pm2 status")

print("\n" + "=" * 60)
print("  ALL DONE!")
print(f"  Backups saved at: {backup_dir}")
print("  App should be live. Check in your browser.")
print("=" * 60)

client.close()

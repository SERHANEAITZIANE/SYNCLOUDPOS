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

# Step 1: Upload modified files
print("\n=== STEP 1: Upload files ===")
sftp = client.open_sftp()

files = [
    ('src/actions/payments.ts', '/var/www/syncloudpos/src/actions/payments.ts'),
    ('src/components/payments/columns.tsx', '/var/www/syncloudpos/src/components/payments/columns.tsx'),
    ('src/components/payments/client.tsx', '/var/www/syncloudpos/src/components/payments/client.tsx'),
    ('src/components/payments/cell-action.tsx', '/var/www/syncloudpos/src/components/payments/cell-action.tsx'),
    ('src/components/payments/supplier-columns.tsx', '/var/www/syncloudpos/src/components/payments/supplier-columns.tsx'),
    ('src/components/payments/supplier-client.tsx', '/var/www/syncloudpos/src/components/payments/supplier-client.tsx'),
]

for local, remote in files:
    sftp.put(local, remote)
    print(f"  Uploaded {local}")

# Create directories for new pages
run("mkdir -p /var/www/syncloudpos/src/app/\\[locale\\]/\\(dashboard\\)/payments/suppliers")

sftp.put(
    'src/app/[locale]/(dashboard)/payments/page.tsx',
    '/var/www/syncloudpos/src/app/[locale]/(dashboard)/payments/page.tsx'
)
print("  Uploaded payments/page.tsx")

sftp.put(
    'src/app/[locale]/(dashboard)/payments/suppliers/page.tsx',
    '/var/www/syncloudpos/src/app/[locale]/(dashboard)/payments/suppliers/page.tsx'
)
print("  Uploaded payments/suppliers/page.tsx")

sftp.put(
    'src/app/[locale]/(dashboard)/payments/layout.tsx',
    '/var/www/syncloudpos/src/app/[locale]/(dashboard)/payments/layout.tsx'
)
print("  Uploaded payments/layout.tsx")

sftp.close()
print("All files uploaded!")

# Step 2: Stop PM2
print("\n=== STEP 2: Stop PM2 ===")
run("pm2 stop syncloudpos")

# Step 3: Rebuild
print("\n=== STEP 3: Rebuild ===")
out, err, status = run("cd /var/www/syncloudpos && NODE_OPTIONS='--max-old-space-size=1024' npx next build 2>&1 | tail -40", timeout=600)

if "Build error" in out or status != 0:
    print("\n!!! BUILD FAILED !!!")
    # Show more context
    run("cd /var/www/syncloudpos && NODE_OPTIONS='--max-old-space-size=1024' npx next build 2>&1 | grep -A5 'Error'")
else:
    print("\n=== BUILD OK ===")

# Step 4: Restart
print("\n=== STEP 4: Restart ===")
run("pm2 restart syncloudpos")
run("sleep 5 && pm2 status")

# Step 5: Health check
print("\n=== STEP 5: Health check ===")
run("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/login")

client.close()
print("\nAll done!")

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

# Create remote directories
run("mkdir -p /var/www/syncloudpos/src/components/settings")
run("mkdir -p /var/www/syncloudpos/src/app/\\[locale\\]/\\(dashboard\\)/settings/roles")

# Step 1: Upload modified files
print("\n=== STEP 1: Upload files ===")
sftp = client.open_sftp()

files = [
    ('prisma/schema.prisma', '/var/www/syncloudpos/prisma/schema.prisma'),
    ('src/actions/payments.ts', '/var/www/syncloudpos/src/actions/payments.ts'),
    ('src/actions/products.ts', '/var/www/syncloudpos/src/actions/products.ts'),
    ('src/actions/register.ts', '/var/www/syncloudpos/src/actions/register.ts'),
    ('src/actions/roles.ts', '/var/www/syncloudpos/src/actions/roles.ts'),
    ('src/actions/treasury.ts', '/var/www/syncloudpos/src/actions/treasury.ts'),
    ('src/lib/validation.ts', '/var/www/syncloudpos/src/lib/validation.ts'),
    ('src/lib/rbac.ts', '/var/www/syncloudpos/src/lib/rbac.ts'),
    ('src/lib/whatsapp.ts', '/var/www/syncloudpos/src/lib/whatsapp.ts'),
    ('src/schemas/index.ts', '/var/www/syncloudpos/src/schemas/index.ts'),
    ('src/components/dashboard/header.tsx', '/var/www/syncloudpos/src/components/dashboard/header.tsx'),
    ('src/components/dashboard/sidebar.tsx', '/var/www/syncloudpos/src/components/dashboard/sidebar.tsx'),
    ('src/components/pos/product-card.tsx', '/var/www/syncloudpos/src/components/pos/product-card.tsx'),
    ('src/components/pos/pos-client.tsx', '/var/www/syncloudpos/src/components/pos/pos-client.tsx'),
    ('src/components/products/product-form.tsx', '/var/www/syncloudpos/src/components/products/product-form.tsx'),
    ('src/components/products/price-list-modal.tsx', '/var/www/syncloudpos/src/components/products/price-list-modal.tsx'),
    ('src/components/settings/roles-matrix-client.tsx', '/var/www/syncloudpos/src/components/settings/roles-matrix-client.tsx'),
    ('src/components/users/users-client.tsx', '/var/www/syncloudpos/src/components/users/users-client.tsx'),
    ('src/app/[locale]/(dashboard)/users/page.tsx', '/var/www/syncloudpos/src/app/[locale]/(dashboard)/users/page.tsx'),
    ('src/app/[locale]/(dashboard)/settings/roles/page.tsx', '/var/www/syncloudpos/src/app/[locale]/(dashboard)/settings/roles/page.tsx'),
    ('src/app/[locale]/(dashboard)/settings/whatsapp/components/whatsapp-settings-client.tsx', '/var/www/syncloudpos/src/app/[locale]/(dashboard)/settings/whatsapp/components/whatsapp-settings-client.tsx'),
]

for local, remote in files:
    sftp.put(local, remote)
    print(f"  Uploaded {local}")

sftp.close()
print("All files uploaded!")

# Step 2: Stop PM2 & Sync DB Schema
print("\n=== STEP 2: Stop PM2 & Sync DB ===")
run("pm2 stop syncloudpos")
run("cd /var/www/syncloudpos && npx prisma db push --skip-generate")
run("cd /var/www/syncloudpos && npx prisma generate")

# Step 3: Rebuild
print("\n=== STEP 3: Rebuild ===")
out, err, status = run("cd /var/www/syncloudpos && NODE_OPTIONS='--max-old-space-size=1024' npx next build 2>&1 | tail -40", timeout=600)

if "Build error" in out or status != 0:
    print("\n!!! BUILD FAILED !!!")
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

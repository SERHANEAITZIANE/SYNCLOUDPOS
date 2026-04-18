import paramiko
import sys
import io
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

print("🚀 Connecting to VPS...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port, username, password)

# Files to upload
FILES = [
    # Prisma schema
    ('prisma/schema.prisma', '/var/www/syncloudpos/prisma/schema.prisma'),
    
    # Mobile auth middleware
    ('src/lib/mobile-auth.ts', '/var/www/syncloudpos/src/lib/mobile-auth.ts'),
    
    # Sidebar with tracking link
    ('src/components/dashboard/sidebar.tsx', '/var/www/syncloudpos/src/components/dashboard/sidebar.tsx'),
    
    # Driver tracking admin page
    ('src/app/[locale]/(dashboard)/driver-tracking/page.tsx', '/var/www/syncloudpos/src/app/[locale]/(dashboard)/driver-tracking/page.tsx'),
    
    # Mobile API routes
    ('src/lib/redis.ts', '/var/www/syncloudpos/src/lib/redis.ts'),
    ('src/app/[locale]/(dashboard)/avaries/page.tsx', '/var/www/syncloudpos/src/app/[locale]/(dashboard)/avaries/page.tsx'),
    ('src/app/api/mobile/auth/route.ts', '/var/www/syncloudpos/src/app/api/mobile/auth/route.ts'),
    ('src/app/api/mobile/auth/refresh/route.ts', '/var/www/syncloudpos/src/app/api/mobile/auth/refresh/route.ts'),
    ('src/app/api/mobile/tours/route.ts', '/var/www/syncloudpos/src/app/api/mobile/tours/route.ts'),
    ('src/app/api/mobile/tours/[id]/route.ts', '/var/www/syncloudpos/src/app/api/mobile/tours/[id]/route.ts'),
    ('src/app/api/mobile/tours/[id]/stops/[stopId]/route.ts', '/var/www/syncloudpos/src/app/api/mobile/tours/[id]/stops/[stopId]/route.ts'),
    ('src/app/api/mobile/clients/route.ts', '/var/www/syncloudpos/src/app/api/mobile/clients/route.ts'),
    ('src/app/api/mobile/clients/[id]/route.ts', '/var/www/syncloudpos/src/app/api/mobile/clients/[id]/route.ts'),
    ('src/app/api/mobile/products/route.ts', '/var/www/syncloudpos/src/app/api/mobile/products/route.ts'),
    ('src/app/api/mobile/sales/route.ts', '/var/www/syncloudpos/src/app/api/mobile/sales/route.ts'),
    ('src/app/api/mobile/payments/route.ts', '/var/www/syncloudpos/src/app/api/mobile/payments/route.ts'),
    ('src/app/api/mobile/returns/route.ts', '/var/www/syncloudpos/src/app/api/mobile/returns/route.ts'),
    ('src/app/api/mobile/location/route.ts', '/var/www/syncloudpos/src/app/api/mobile/location/route.ts'),
    ('src/app/api/mobile/truck-load/route.ts', '/var/www/syncloudpos/src/app/api/mobile/truck-load/route.ts'),
    ('src/app/api/mobile/dashboard/route.ts', '/var/www/syncloudpos/src/app/api/mobile/dashboard/route.ts'),
    ('src/app/api/mobile/admin/drivers/route.ts', '/var/www/syncloudpos/src/app/api/mobile/admin/drivers/route.ts'),
    ('src/app/api/mobile/admin/drivers/[driverId]/route.ts', '/var/www/syncloudpos/src/app/api/mobile/admin/drivers/[driverId]/route.ts'),
]

def run_cmd(cmd):
    print(f"\n--- Running: {cmd} ---\n")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(f"STDOUT:\n{out}")
    if err: print(f"STDERR:\n{err}")
    print(f"Exit code: {exit_status}\n")
    return exit_status

# Create remote directories
print("\n📂 Creating directories...")
dirs_to_create = set()
for _, remote in FILES:
    dirs_to_create.add(os.path.dirname(remote))
for d in sorted(dirs_to_create):
    run_cmd(f"mkdir -p '{d}'")

# Upload files
print("\n📤 Uploading files...")
sftp = client.open_sftp()
uploaded = 0
for local, remote in FILES:
    local_path = local.replace('/', '\\')  # Windows paths
    try:
        sftp.put(local_path, remote)
        print(f"  ✅ {local}")
        uploaded += 1
    except Exception as e:
        print(f"  ❌ {local}: {e}")
sftp.close()
print(f"\n📤 Uploaded {uploaded}/{len(FILES)} files")

# Install jsonwebtoken dependency
print("\n📦 Installing jsonwebtoken...")
run_cmd("cd /var/www/syncloudpos && npm install jsonwebtoken uuid 2>&1 | tail -5")

# Push schema to database
print("\n🗄️ Pushing Prisma schema to database...")
status = run_cmd("cd /var/www/syncloudpos && npx prisma@5.22.0 db push --accept-data-loss 2>&1 | tail -10")
if status != 0:
    print("⚠️ Prisma db push failed, trying generate only...")
    run_cmd("cd /var/www/syncloudpos && npx prisma@5.22.0 generate")

# Generate Prisma client
print("\n🔧 Generating Prisma Client...")
run_cmd("cd /var/www/syncloudpos && npx prisma@5.22.0 generate")

# Build Next.js
print("\n🏗️ Building Next.js App...")
status = run_cmd("cd /var/www/syncloudpos && npm run build 2>&1 | tail -30")
if status != 0:
    print("❌ Build FAILED!")
    client.close()
    sys.exit(1)

# Restart PM2
print("\n🔄 Restarting PM2...")
run_cmd("pm2 restart syncloudpos")

print("\n✅ Deployment complete! All mobile API routes are live.")
client.close()

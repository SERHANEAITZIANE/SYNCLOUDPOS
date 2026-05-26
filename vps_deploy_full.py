import paramiko
import sys
import io
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

host = '155.133.26.217'
port = 22
username = 'root'
password = 'C4r3vL[N7~_ulO%^'

files_to_upload = [
    'prisma/schema.prisma',
    'src/actions/ai-context.ts',
    'src/actions/settings.ts',
    'src/app/[locale]/(dashboard)/ai/components/ai-client.tsx',
    'src/app/[locale]/(dashboard)/ai/page.tsx',
    'src/app/[locale]/(dashboard)/settings/components/ai-settings-form.tsx',
    'src/app/[locale]/(dashboard)/settings/components/unified-settings-client.tsx',
    'src/app/[locale]/(dashboard)/settings/page.tsx',
    'src/components/expenses/expense-form.tsx',
    'src/components/payments/client.tsx',
    'src/components/payments/supplier-client.tsx',
    'src/components/purchases/purchase-form.tsx',
    'src/components/ui/product-search-combobox.tsx',
    'src/actions/ai-logs.ts',
    'src/actions/test-ai-key.ts'
]

print("Connecting to VPS...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port, username, password)

print("Uploading modified files...")
sftp = client.open_sftp()
for file_path in files_to_upload:
    local_path = file_path.replace('/', '\\')
    remote_path = '/var/www/syncloudpos/' + file_path
    
    # ensure remote directory exists
    remote_dir = '/'.join(remote_path.split('/')[:-1])
    try:
        sftp.stat(remote_dir)
    except IOError:
        client.exec_command(f"mkdir -p {remote_dir}")
        
    try:
        sftp.put(local_path, remote_path)
        print(f"  ✓ {file_path}")
    except Exception as e:
        print(f"  ✗ Failed to upload {file_path}: {e}")

sftp.close()

def run_cmd(cmd):
    print(f"\n--- Running: {cmd} ---\n")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(f"{out}")
    if err: print(f"ERR: {err}")
    if exit_status != 0:
        print(f"COMMAND FAILED with exit code {exit_status}!")
        sys.exit(1)

print("\n--- Generating Prisma Client ---")
run_cmd("cd /var/www/syncloudpos && npx prisma generate")

print("\n--- Building Next.js App ---")
run_cmd("cd /var/www/syncloudpos && npm run build")

print("\n--- Restarting PM2 ---")
run_cmd("pm2 restart syncloudpos")

print("\n✅ Update deployed successfully!")
client.close()

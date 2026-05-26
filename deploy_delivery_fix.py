import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

host = '155.133.26.217'
port = 22
username = 'root'
password = 'C4r3vL[N7~_ulO%^'

print("Connecting to VPS...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port, username, password)

print("Uploading Delivery System fix files...")
sftp = client.open_sftp()
try:
    files_to_upload = [
        'prisma/schema.prisma',
        'src/actions/delivery.ts',
        'src/app/[locale]/(dashboard)/delivery/page.tsx',
        'src/app/[locale]/(dashboard)/formation/components/formation-client.tsx',
        'src/app/api/webhooks/delivery/route.ts',
        'src/app/api/mobile/truck-load/route.ts',
        'src/app/api/mobile/tours/[id]/stops/[stopId]/route.ts',
        'src/app/api/mobile/admin/drivers/route.ts',
        'src/app/api/mobile/dashboard/route.ts',
        'src/app/api/mobile/sales/route.ts',
    ]

    for file_path in files_to_upload:
        remote_path = f'/var/www/syncloudpos/{file_path}'
        dir_path = remote_path.rsplit('/', 1)[0]
        client.exec_command(f'mkdir -p {dir_path}')
        print(f"Uploading {file_path} -> {remote_path}")
        sftp.put(file_path, remote_path)
    
    print("Files uploaded successfully!")

except Exception as e:
    print(f"SFTP Error: {e}")
    sys.exit(1)
sftp.close()

def run_cmd(cmd):
    print(f"\n--- Running: {cmd} ---\n")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(f"STDOUT:\n{out}")
    if err: print(f"STDERR:\n{err}")
    print(f"Exit code: {exit_status}\n")
    if exit_status != 0:
        print("COMMAND FAILED!")
        sys.exit(1)

print("\n--- Pushing Prisma Schema ---")
run_cmd("cd /var/www/syncloudpos && npx prisma db push --accept-data-loss")

print("\n--- Generating Prisma Client ---")
run_cmd("cd /var/www/syncloudpos && npx prisma generate")

print("\n--- Building Next.js App ---")
run_cmd("cd /var/www/syncloudpos && npm run build")

print("\n--- Restarting PM2 ---")
run_cmd("pm2 restart syncloudpos")

print("\n✅ Delivery updates deployed successfully to chirpedbeo.online!")
client.close()

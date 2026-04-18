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

print("Uploading files bypassing git...")
sftp = client.open_sftp()
try:
    sftp.put('src/proxy.ts', '/var/www/syncloudpos/src/proxy.ts')
    sftp.put('src/i18n/routing.ts', '/var/www/syncloudpos/src/i18n/routing.ts')
    sftp.put('src/auth.ts', '/var/www/syncloudpos/src/auth.ts')
    print("Uploaded proxy.ts, routing.ts and auth.ts successfully.")
except Exception as e:
    print(f"SFTP Error: {e}")
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

# Remove the old middleware.ts if it exists on VPS
try:
    client.exec_command("rm -f /var/www/syncloudpos/src/middleware.ts")
except:
    pass

print("\n--- Generating Prisma Client ---")
run_cmd("cd /var/www/syncloudpos && npx prisma@5.22.0 generate")

print("\n--- Building Next.js App ---")
run_cmd("cd /var/www/syncloudpos && npm run build")

print("\n--- Restarting PM2 ---")
run_cmd("pm2 restart syncloudpos")

print("All done!")
client.close()

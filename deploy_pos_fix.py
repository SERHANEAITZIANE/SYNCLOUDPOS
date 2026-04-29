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

print("Uploading POS fix files...")
sftp = client.open_sftp()
try:
    sftp.put('src/actions/orders.ts', '/var/www/syncloudpos/src/actions/orders.ts')
    print("  ✓ orders.ts (subscription check + storeId guard)")
    sftp.put('src/components/pos/payment-modal.tsx', '/var/www/syncloudpos/src/components/pos/payment-modal.tsx')
    print("  ✓ payment-modal.tsx (button disabled fix)")
    sftp.put('src/components/pos/cart-sidebar.tsx', '/var/www/syncloudpos/src/components/pos/cart-sidebar.tsx')
    print("  ✓ cart-sidebar.tsx (error handling improvements)")
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

print("\n--- Building Next.js App ---")
run_cmd("cd /var/www/syncloudpos && npm run build")

print("\n--- Restarting PM2 ---")
run_cmd("pm2 restart syncloudpos")

print("\n✅ POS fix deployed successfully!")
client.close()

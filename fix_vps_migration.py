import paramiko
import sys
import io
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

host = '155.133.26.217'
port = 22
username = 'root'
password = 'C4r3vL[N7~_ulO%^'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port, username, password)

def run_cmd(cmd, can_fail=False):
    print(f"\n=== {cmd[:80]} ===")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=300)
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out: print(out[-2000:])
    if err and not can_fail: print("ERR:", err[-500:])
    if exit_status != 0 and not can_fail:
        print(f"FAILED exit {exit_status}")
        sys.exit(1)
    return exit_status

# The DB already has the columns — we just need to regenerate prisma client
# and rebuild the app so the compiled code knows about the new columns

print("=== Step 1: Regenerate Prisma Client ===")
run_cmd("cd /var/www/syncloudpos && npx prisma generate 2>&1 | tail -5")

print("=== Step 2: Rebuild Next.js ===")
run_cmd("cd /var/www/syncloudpos && npm run build 2>&1 | tail -30")

print("=== Step 3: Restart PM2 ===")
run_cmd("pm2 restart syncloudpos")

print("\nWaiting 10 seconds...")
time.sleep(10)

print("=== Step 4: Check FRESH errors only ===")
run_cmd("pm2 logs syncloudpos --lines 5 --nostream --err 2>&1", can_fail=True)

print("\n✅ Done!")
client.close()

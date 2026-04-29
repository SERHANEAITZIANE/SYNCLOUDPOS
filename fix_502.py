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

# Step 1: Upload the fixed auth.config.ts
print("\n=== STEP 1: Upload fixed auth.config.ts ===")
sftp = client.open_sftp()
sftp.put('src/auth.config.ts', '/var/www/syncloudpos/src/auth.config.ts')
sftp.put('src/auth.ts', '/var/www/syncloudpos/src/auth.ts')
sftp.put('src/proxy.ts', '/var/www/syncloudpos/src/proxy.ts')
print("Uploaded auth.config.ts, auth.ts, proxy.ts")
sftp.close()

# Step 2: Stop PM2
print("\n=== STEP 2: Stop PM2 ===")
run("pm2 stop syncloudpos")

# Step 3: Rebuild
print("\n=== STEP 3: Rebuild ===")
out, err, status = run("cd /var/www/syncloudpos && NODE_OPTIONS='--max-old-space-size=1024' npx next build 2>&1 | tail -30", timeout=600)

if "Build error" in out:
    print("\n!!! BUILD FAILED !!!")
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

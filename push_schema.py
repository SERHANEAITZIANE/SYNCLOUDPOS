import paramiko

host = "155.133.26.217"
user = "root"
pw = r"C4r3vL[N7~_ulO%^"
remote_dir = "/var/www/syncloudpos"
local_schema = r"c:\Users\tre\Documents\SYNCLOUDPOS\prisma\schema.prisma"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

results = []

try:
    client.connect(host, username=user, password=pw, timeout=15)
    results.append("Connected!")
    
    # 1. Backup existing schema
    cmd = f"cp {remote_dir}/prisma/schema.prisma {remote_dir}/prisma/schema.prisma.backup2"
    stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
    stdout.read()
    results.append("Backed up existing schema")
    
    # 2. Upload new schema
    sftp = client.open_sftp()
    sftp.put(local_schema, f"{remote_dir}/prisma/schema.prisma")
    sftp.close()
    results.append("Uploaded new schema!")
    
    # 3. Run prisma db push (using the VPS .env DATABASE_URL)
    cmd = f"cd {remote_dir} && npx prisma db push --accept-data-loss 2>&1"
    results.append(f"Running: prisma db push...")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
    out = stdout.read().decode()
    err = stderr.read().decode()
    results.append(f"STDOUT: {out}")
    if err:
        results.append(f"STDERR: {err}")
    
    # 4. Generate prisma client
    cmd = f"cd {remote_dir} && npx prisma generate 2>&1"
    results.append(f"\nRunning: prisma generate...")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode()
    err = stderr.read().decode()
    results.append(f"STDOUT: {out}")
    if err:
        results.append(f"STDERR: {err}")
    
    # 5. Restart PM2
    cmd = f"cd {remote_dir} && pm2 restart all 2>&1"
    results.append(f"\nRunning: pm2 restart all...")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    out = stdout.read().decode()
    err = stderr.read().decode()
    results.append(f"STDOUT: {out}")
    if err:
        results.append(f"STDERR: {err}")

    results.append("\n=== ALL DONE ===")

except Exception as e:
    results.append(f"Error: {e}")
finally:
    client.close()

with open("push_result.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(results))

print("Results written to push_result.txt")

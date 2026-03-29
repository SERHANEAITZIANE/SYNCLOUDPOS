import paramiko

host = "155.133.26.217"
user = "root"
pw = r"C4r3vL[N7~_ulO%^"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

results = []

try:
    client.connect(host, username=user, password=pw, timeout=15)
    results.append("Connected!")
    
    # Upload the new schema
    sftp = client.open_sftp()
    sftp.put(
        r"c:\Users\tre\Documents\SYNCLOUDPOS\prisma\schema.prisma",
        "/var/www/syncloudpos/prisma/schema.prisma"
    )
    sftp.close()
    results.append("Schema uploaded!")
    
    # Run prisma db push
    cmd = "cd /var/www/syncloudpos && npx prisma db push --accept-data-loss 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    results.append(f"prisma db push: {out[-200:] if len(out) > 200 else out}")
    if err:
        results.append(f"stderr: {err[-200:] if len(err) > 200 else err}")
    
    # Run prisma generate
    cmd = "cd /var/www/syncloudpos && npx prisma generate 2>&1"
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode().strip()
    results.append(f"prisma generate: done")
    
    results.append("Schema pushed! SequenceCounter table now exists.")
    
except Exception as e:
    results.append(f"Error: {e}")
finally:
    client.close()

with open("schema_push.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(results))
print("\n".join(results))

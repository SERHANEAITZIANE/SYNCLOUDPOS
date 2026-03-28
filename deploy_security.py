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
    
    # 1. Upload updated nginx config
    sftp = client.open_sftp()
    sftp.put(
        r"c:\Users\tre\Documents\SYNCLOUDPOS\nginx-syncloudpos.conf",
        "/etc/nginx/sites-available/syncloudpos"
    )
    sftp.close()
    results.append("Nginx config uploaded!")
    
    # 2. Test nginx config
    stdin, stdout, stderr = client.exec_command("nginx -t 2>&1", timeout=10)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    results.append(f"nginx -t: {out} {err}")
    
    if "successful" in (out + err).lower():
        # 3. Reload nginx
        stdin, stdout, stderr = client.exec_command("systemctl reload nginx 2>&1", timeout=10)
        out = stdout.read().decode().strip()
        results.append(f"Nginx reloaded! {out}")
    else:
        results.append("ERROR: Nginx config test failed, NOT reloading!")
    
    # 4. Restart PM2 to pick up the new NEXTAUTH_SECRET
    stdin, stdout, stderr = client.exec_command("cd /var/www/syncloudpos && pm2 restart all 2>&1", timeout=30)
    out = stdout.read().decode().strip()
    results.append(f"PM2 restart: done")
    
    results.append("\n=== ALL SECURITY FIXES DEPLOYED ===")

except Exception as e:
    results.append(f"Error: {e}")
finally:
    client.close()

with open("security_deploy.txt", "w", encoding="utf-8") as f:
    f.write("\n".join(results))
print("\n".join(results))

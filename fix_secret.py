import paramiko
import secrets

host = "155.133.26.217"
user = "root"
pw = r"C4r3vL[N7~_ulO%^"

# Generate a cryptographically secure 64-char secret
new_secret = secrets.token_hex(32)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

results = []

try:
    client.connect(host, username=user, password=pw, timeout=15)
    results.append("Connected!")
    
    # 1. Replace the weak NEXTAUTH_SECRET in the VPS .env
    cmd = f'''sed -i 's/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET="{new_secret}"/' /var/www/syncloudpos/.env'''
    stdin, stdout, stderr = client.exec_command(cmd, timeout=10)
    stdout.read()
    err = stderr.read().decode().strip()
    if err:
        results.append(f"sed error: {err}")
    else:
        results.append(f"NEXTAUTH_SECRET updated to: {new_secret[:8]}...{new_secret[-8:]}")
    
    # 2. Verify the update
    stdin, stdout, stderr = client.exec_command("grep NEXTAUTH_SECRET /var/www/syncloudpos/.env", timeout=5)
    out = stdout.read().decode().strip()
    results.append(f"Verification: {out[:40]}...")
    
    results.append("Done! Users will need to re-login after PM2 restart.")
    
except Exception as e:
    results.append(f"Error: {e}")
finally:
    client.close()

with open("secret_update.txt", "w") as f:
    f.write("\n".join(results))
print("\n".join(results))

import paramiko
import time

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect('155.133.26.217', 22, 'root', 'pkn567ftXW3L')

def run(cmd, timeout=15):
    try:
        stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
        stdout.channel.settimeout(timeout)
        stderr.channel.settimeout(timeout)
        return stdout.read().decode('utf-8', errors='replace') + stderr.read().decode('utf-8', errors='replace')
    except Exception as e:
        return f"[TIMEOUT/ERROR: {e}]"

results = []

# Fix 1: Update routing.ts localePrefix from 'never' to 'always'
results.append("=== FIX: Update localePrefix to 'always' ===")
results.append(run("sed -i \"s/localePrefix: 'never'/localePrefix: 'always'/\" /var/www/syncloudpos/src/i18n/routing.ts"))
results.append(run("cat /var/www/syncloudpos/src/i18n/routing.ts"))

# Fix 2: Also sync the proxy.ts (middleware) from local to match
# The VPS version is different from local - update key parts
# Actually we need a rebuild for these changes to take effect
# Let's do a rebuild
results.append("\n=== Rebuilding Next.js on VPS ===")
results.append("Starting build (this may take a few minutes)...")

# Truncate error logs
run("> /var/log/pm2/syncloudpos-error.log")

# Run the build
build_result = run("cd /var/www/syncloudpos && npx next build 2>&1 | tail -30", timeout=300)
results.append(build_result)

# Restart PM2
results.append("\n=== Restarting PM2 ===")
results.append(run("cd /var/www/syncloudpos && pm2 restart syncloudpos --update-env", timeout=20))

time.sleep(15)

# Test
results.append("\n=== VERIFICATION ===")
results.append(run("pm2 list --no-color"))

results.append("\n=== Login page test ===")
results.append(run("curl -s -o /dev/null -w 'HTTP: %{http_code}\\nSize: %{size_download}\\n' http://localhost:3000/fr/login"))

results.append("\n=== Redirect test ===")
results.append(run("curl -s -o /dev/null -w 'HTTP: %{http_code}\\nRedirect: %{redirect_url}\\n' http://localhost:3000/login"))

results.append("\n=== PM2 errors ===")
results.append(run("cat /var/log/pm2/syncloudpos-error.log | head -20"))

output = "\n".join(results)
with open('vps_rebuild.txt', 'w', encoding='utf-8') as f:
    f.write(output)
print("Done")
client.close()

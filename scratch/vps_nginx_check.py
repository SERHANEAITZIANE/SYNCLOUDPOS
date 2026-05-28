import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print(f"Connecting to {host}...")
    client.connect(host, port, username, password, timeout=15)
    print("Connected successfully!")
    
    def run(cmd):
        print(f"\n--- Running: {cmd} ---")
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        if out:
            print("[STDOUT]")
            print(out)
        if err:
            print("[STDERR]")
            print(err)

    # 1. Nginx active config
    run("nginx -T | grep -A 20 -i 'server_name chirpedbeo'")

    # 2. Check site configurations in Nginx
    run("ls -la /etc/nginx/sites-enabled/")
    run("ls -la /etc/nginx/sites-available/")

    # 3. Check for any static files at /var/www/syncloudpos or subdirectories that might bypass Next.js
    run("find /var/www -maxdepth 3 -name 'index.html' -o -name 'index.php'")
    run("ls -la /var/www/syncloudpos/public/")

    # 4. Check if Next.js port 3000 actually responds with the new page or not
    run("curl -I http://localhost:3000/")
    run("curl -s http://localhost:3000/ | head -n 30")

    # 5. Check direct server response on port 3000 with fr/en locales
    run("curl -I http://localhost:3000/fr")
    run("curl -s http://localhost:3000/fr | head -n 30")

    # 6. PM2 status
    run("pm2 status")

    client.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

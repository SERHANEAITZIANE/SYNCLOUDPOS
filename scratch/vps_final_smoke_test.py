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

    # 1. Check curl response at root (it should 307 redirect to /fr or /en, etc.)
    run("curl -I http://localhost:3000/")

    # 2. Check curl response at /fr (it should return the Next.js HTML page now, NOT a redirect to login!)
    run("curl -I http://localhost:3000/fr")

    # 3. Print the first 40 lines of the HTML output of http://localhost:3000/fr to verify it is the new landing page
    run("curl -s http://localhost:3000/fr | head -n 50")

    # 4. Check external public response via direct HTTPS to chirpedbeo.online
    run("curl -I -k https://chirpedbeo.online/fr")

    client.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

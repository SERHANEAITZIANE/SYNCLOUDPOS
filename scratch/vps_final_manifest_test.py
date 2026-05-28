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

    # 1. Check response at /manifest.webmanifest (it should return 200 OK now!)
    run("curl -I http://localhost:3000/manifest.webmanifest")
    run("curl -I -k https://chirpedbeo.online/manifest.webmanifest")

    # 2. Check response at /manifest.json (it should return 200 OK now!)
    run("curl -I http://localhost:3000/manifest.json")
    run("curl -I -k https://chirpedbeo.online/manifest.json")

    # 3. Check response at /sw.js (it should return 200 OK now!)
    run("curl -I http://localhost:3000/sw.js")
    run("curl -I -k https://chirpedbeo.online/sw.js")

    client.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

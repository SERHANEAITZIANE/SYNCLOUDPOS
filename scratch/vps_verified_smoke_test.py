import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(host, port, username, password, timeout=15)
    
    def run(cmd):
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace').strip()
        err = stderr.read().decode('utf-8', errors='replace').strip()
        print(f"=== {cmd} ===")
        if out:
            print(out[:500] + "\n... (truncated)")
        if err:
            print(f"[ERR] {err}")

    # Verify that Next.js landing page has elements like 'SyncloudPOS' or our rebranding
    run("curl -s http://localhost:3000/fr | grep -i '<title>'")
    run("curl -s http://localhost:3000/fr | grep -o 'VoiceAssistantWidget' || echo 'No direct text widget found (it is imported/dynamic)'")
    
    # Check the public SSL response
    run("curl -I -k https://chirpedbeo.online/fr")
    run("curl -I -k https://chirpedbeo.online/en")
    run("curl -I -k https://chirpedbeo.online/ar")

    client.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

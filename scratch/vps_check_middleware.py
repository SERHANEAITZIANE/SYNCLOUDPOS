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
            print(out)
        if err:
            print(f"[ERR] {err}")

    run("ls -la /var/www/syncloudpos/src/")
    run("ls -la /var/www/syncloudpos/")
    
    client.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

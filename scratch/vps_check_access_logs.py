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
            print(out[-1000:])  # Print last 1000 characters
        if err:
            print(f"[ERR] {err}")

    # Search for 'update' in access logs
    run("grep -i 'update' /var/log/nginx/syncloudpos-access.log | tail -n 50")
    
    # Search for any 404 or 500 errors in access logs
    run("grep ' 404 ' /var/log/nginx/syncloudpos-access.log | tail -n 50")
    run("grep ' 500 ' /var/log/nginx/syncloudpos-access.log | tail -n 50")
    
    # Search for any redirects of files
    run("grep ' 307 ' /var/log/nginx/syncloudpos-access.log | grep -v '_rsc' | tail -n 50")
    
    client.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

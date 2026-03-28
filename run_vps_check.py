import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

commands = [
    "cd /var/www/syncloudpos && node vps_check_db.js"
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    for cmd in commands:
        print(f"Executing: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        print(out)
        if err:
            print(f"STDERR:\n{err}")

    client.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

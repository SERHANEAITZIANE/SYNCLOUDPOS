import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

commands = [
    "pm2 status",
    "pm2 logs syncloudpos --lines 100 --nostream",
    "journalctl -u nginx --no-pager -n 50"
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    with open('pm2_logs.txt', 'w', encoding='utf-8') as f:
        for cmd in commands:
            f.write(f"\n--- Executing: {cmd} ---\n")
            stdin, stdout, stderr = client.exec_command(cmd)
            out = stdout.read().decode('utf-8', errors='replace')
            err = stderr.read().decode('utf-8', errors='replace')
            f.write(out)
            if err:
                f.write(f"STDERR:\n{err}\n")

    client.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

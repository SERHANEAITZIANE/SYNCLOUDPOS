import paramiko
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

host = '155.133.26.217'
port = 22
username = 'root'
password = 'C4r3vL[N7~_ulO%^'

commands = [
    "pm2 status",
    "pm2 logs syncloudpos --nostream --lines 30",
    "curl -s -o /dev/null -w 'https://chirpedbeo.online/api/ping: HTTP %{http_code}\\n' https://chirpedbeo.online/api/ping",
    "curl -s -o /dev/null -w 'https://chirpedbeo.online/fr/login: HTTP %{http_code}\\n' https://chirpedbeo.online/fr/login"
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

import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

commands = [
    "cd /var/www/syncloudpos && npx prisma db pull"
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    for cmd in commands:
        stdin, stdout, stderr = client.exec_command(cmd)
        err = stderr.read().decode('utf-8')
        if err:
             print("ERR:", err)
        else:
             print("OUT:", stdout.read().decode('utf-8'))

    client.close()
except Exception as e:
    sys.exit(1)

import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

commands = [
    "cd /var/www/syncloudpos && npx prisma db push --accept-data-loss > /tmp/prisma.log 2>&1",
    "cd /var/www/syncloudpos && node seed_chirpedbeo.js >> /tmp/prisma.log 2>&1"
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    for cmd in commands:
        client.exec_command(cmd)

    sftp = client.open_sftp()
    sftp.get('/tmp/prisma.log', 'local_prisma.log')
    sftp.close()

    client.close()
except Exception as e:
    sys.exit(1)

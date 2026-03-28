import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

commands = [
    "sed -i 's/md5/scram-sha-256/g' /etc/postgresql/*/main/pg_hba.conf",
    "systemctl restart postgresql",
    "sed -i 's/^DATABASE_URL=.*/DATABASE_URL=\"postgresql:\\/\\/syncloudpos:SyncloudDB_2026_Pos@127.0.0.1:5432\\/syncloudpos_db?schema=public\"/g' /var/www/syncloudpos/.env",
    "cd /var/www/syncloudpos && npx prisma db push --accept-data-loss > /tmp/prisma2.log 2>&1",
    "cd /var/www/syncloudpos && npx prisma generate >> /tmp/prisma2.log 2>&1",
    "cd /var/www/syncloudpos && node seed_chirpedbeo.js >> /tmp/prisma2.log 2>&1",
    "cd /var/www/syncloudpos && pm2 restart syncloudpos"
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    for cmd in commands:
        print(f"--- {cmd.split()[0]} ---")
        client.exec_command(cmd)

    sftp = client.open_sftp()
    # Wait by executing a simple check
    stdin, stdout, stderr = client.exec_command("cat /tmp/prisma2.log")
    stdout.channel.recv_exit_status()
    sftp.get('/tmp/prisma2.log', 'local_prisma2.log')
    sftp.close()

    client.close()
except Exception as e:
    sys.exit(1)

import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

commands = [
    "sed -i 's/^DATABASE_URL=.*/DATABASE_URL=\"postgresql:\\/\\/syncloudpos:SyncloudDB_2026_Pos@localhost:5433\\/syncloudpos?pgbouncer=true\"/g' /var/www/syncloudpos/.env",
    "cd /var/www/syncloudpos && npx prisma db push --accept-data-loss",
    "cd /var/www/syncloudpos && npx prisma generate",
    "cd /var/www/syncloudpos && node seed_chirpedbeo.js",
    "cd /var/www/syncloudpos && pm2 restart syncloudpos"
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    for cmd in commands:
        print(f"--- Executing: {cmd.split()[0]} ... ---")
        stdin, stdout, stderr = client.exec_command(cmd)
        stdout.channel.recv_exit_status()
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if out: print("OUT:", out)
        if err: print("ERR:", err)

    client.close()
    print("All commands completed.")
except Exception as e:
    sys.exit(1)

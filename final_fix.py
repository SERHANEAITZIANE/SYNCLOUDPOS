import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

commands = [
    # Force trust for local connections
    "sed -i 's/local   all             all                                     peer/local   all             all                                     trust/g' /etc/postgresql/*/main/pg_hba.conf",
    "sed -i 's/host    all             all             127.0.0.1\\/32            scram-sha-256/host    all             all             127.0.0.1\\/32            trust/g' /etc/postgresql/*/main/pg_hba.conf",
    "sed -i 's/host    all             all             127.0.0.1\\/32            md5/host    all             all             127.0.0.1\\/32            trust/g' /etc/postgresql/*/main/pg_hba.conf",
    # Reload config without full restart to avoid recovery mode loop
    "su - postgres -c \"psql -c 'SELECT pg_reload_conf();'\"",
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
    print("All final fix commands completed.")
except Exception as e:
    sys.exit(1)

import paramiko
import sys

host = '155.133.26.217'
port = 22
username = 'root'
password = 'pkn567ftXW3L'

commands = [
    "unzip -o /root/update_v3.zip -d /var/www/syncloudpos",
    "cd /var/www/syncloudpos && npx prisma generate",
    "cd /var/www/syncloudpos && npx prisma db push --accept-data-loss",
    "cd /var/www/syncloudpos && npm run build",
    "pm2 restart syncloudpos"
]

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(host, port, username, password)

    with open('remote_out.txt', 'w', encoding='utf-8') as f:
        for cmd in commands:
            f.write(f"\n--- Executing: {cmd} ---\n")
            print(f"Executing: {cmd}")
            stdin, stdout, stderr = client.exec_command(cmd)
            # Wait for command to finish and get exit status
            exit_status = stdout.channel.recv_exit_status()
            out = stdout.read().decode('utf-8', errors='replace')
            err = stderr.read().decode('utf-8', errors='replace')
            f.write(out)
            if err:
                f.write(f"STDERR:\n{err}\n")
            f.write(f"Exit status: {exit_status}\n")

    client.close()
    print("All commands executed.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
